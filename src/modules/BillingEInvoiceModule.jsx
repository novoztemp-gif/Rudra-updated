// ═══════════════════════════════════════════════════════════════════════════════
// TAX BILLING & E-INVOICE MODULE
// ═══════════════════════════════════════════════════════════════════════════════

import { useState } from "react";
import { formatDate, formatCurrency } from "../utils/formatters";
import { Button } from "../components/ui/Button";
import { Card } from "../components/ui/Card";
import { Modal } from "../components/ui/Modal";
import { Tabs } from "../components/ui/Tabs";
import { Icons } from "../components/ui/Icons";
import { InvoiceCreator, InvoicePrintView } from "./BillingModule";
import * as invoicesService from "../services/invoices";

// ─── E-INVOICE JSON BUILDERS ────────────────────────────────────────────────

const formatToSchemaDate = (dateString) => {
  if (!dateString) return null;
  const d = new Date(dateString);
  return `${String(d.getDate()).padStart(2, "0")}/${String(
    d.getMonth() + 1
  ).padStart(2, "0")}/${d.getFullYear()}`;
};

const buildEInvoiceJSON = (invoice, company, customer) => {
  const isInterState = customer?.state !== company.stateCode;

  return {
    Version: "1.1",
    TranDtls: {
      TaxSch: "GST",
      SupTyp: "B2B",
      IgstOnIntra: "N",
      RegRev: null,
      EcmGstin: null,
    },
    DocDtls: {
      Typ: "INV",
      No: invoice.invoiceNo,
      Dt: formatToSchemaDate(invoice.date),
    },
    SellerDtls: {
      Gstin: company.gstin,
      LglNm: company.name,
      TrdNm: null,
      Addr1: company.address,
      Addr2: null,
      Loc: company.city || "THUCKALAY",
      Pin: parseInt(company.pin) || 629175,
      Stcd: company.stateCode,
      Ph: null,
      Em: null,
    },
    BuyerDtls: {
      Gstin: customer?.gstin || "URP",
      LglNm: customer?.name || "",
      TrdNm: null,
      Pos: customer?.state || company.stateCode,
      Addr1: customer?.address || "",
      Addr2: null,
      Loc: customer?.city || "",
      Pin: parseInt(customer?.pin) || 0,
      Stcd: customer?.state || "",
      Ph: null,
      Em: null,
    },
    DispDtls: null,
    ShipDtls: null,
    ValDtls: {
      AssVal: parseFloat(invoice.subtotal?.toFixed(2) || 0),
      IgstVal: parseFloat(invoice.igst?.toFixed(2) || 0),
      CgstVal: parseFloat(invoice.cgst?.toFixed(2) || 0),
      SgstVal: parseFloat(invoice.sgst?.toFixed(2) || 0),
      CesVal: 0,
      StCesVal: 0,
      Discount: 0,
      OthChrg: 0,
      RndOffAmt: 0,
      TotInvVal: parseFloat(invoice.total?.toFixed(2) || 0),
      TotInvValFc: 0,
    },
    ExpDtls: null,
    EwbDtls: null,
    PayDtls: null,
    RefDtls: null,
    AddlDocDtls: null,
    ItemList: invoice.items.map((item, idx) => ({
      SlNo: String(idx + 1),
      PrdDesc: item.name || null,
      IsServc: "N",
      HsnCd: item.hsn,
      Barcde: null,
      Qty: parseFloat(item.qty),
      FreeQty: 0,
      Unit: item.unit === "sqf" ? "SQF" : item.unit === "piece" ? "PCS" : "NOS",
      UnitPrice: parseFloat(item.rate),
      TotAmt: parseFloat(item.amount?.toFixed(2) || 0),
      Discount: 0,
      PreTaxVal: 0,
      AssAmt: parseFloat(item.amount?.toFixed(2) || 0),
      GstRt: parseFloat(item.taxRate),
      IgstAmt: isInterState
        ? parseFloat(((item.amount * item.taxRate) / 100).toFixed(2))
        : 0,
      CgstAmt: !isInterState
        ? parseFloat(((item.amount * item.taxRate) / 200).toFixed(2))
        : 0,
      SgstAmt: !isInterState
        ? parseFloat(((item.amount * item.taxRate) / 200).toFixed(2))
        : 0,
      CesRt: 0,
      CesAmt: 0,
      CesNonAdvlAmt: 0,
      StateCesRt: 0,
      StateCesAmt: 0,
      StateCesNonAdvlAmt: 0,
      OthChrg: 0,
      TotItemVal: parseFloat(
        (item.amount + (item.amount * item.taxRate) / 100).toFixed(2)
      ),
      OrdLineRef: null,
      OrgCntry: null,
      PrdSlNo: null,
      BchDtls: null,
      AttribDtls: [{ Nm: null, Val: null }],
    })),
  };
};

const downloadJSON = (invoice, company, customer) => {
  const json = buildEInvoiceJSON(invoice, company, customer);
  const blob = new Blob([JSON.stringify(json, null, 2)], {
    type: "application/json",
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `E-Invoice_${invoice.invoiceNo}.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
};

export const BillingEInvoiceModule = ({
  products,
  setProducts,
  customers,
  setCustomers,
  invoices,
  setInvoices,
  company,
}) => {
  const taxInvoices = invoices.filter(
    (inv) => (inv.invoiceType || "tax") === "tax"
  );

  const [tab, setTab] = useState("create");
  const [showInvoiceDetail, setShowInvoiceDetail] = useState(null);
  const [filterStage, setFilterStage] = useState("all");
  const [selectedInvoices, setSelectedInvoices] = useState(new Set());

  const getStage = (inv) => {
    if (inv.irn) return "active";
    if (inv.jsonConverted) return "json_ready";
    return "pending";
  };

  const handlePrint = (invoice) => {
    setShowInvoiceDetail(invoice);
    setTimeout(() => {
      window.print();
    }, 150);
  };

  const filteredInvoices = taxInvoices.filter((inv) => {
    if (filterStage === "all") return true;
    return getStage(inv) === filterStage;
  });

  const handleGenerateJSON = async (inv) => {
    try {
      await invoicesService.update(inv.id, { jsonConverted: true });

      setInvoices((prev) =>
        prev.map((i) => (i.id === inv.id ? { ...i, jsonConverted: true } : i))
      );

      downloadJSON(inv, company, customers.find((c) => c.id === inv.customerId));

      alert(`E-Invoice JSON generated and downloaded for Invoice #${inv.invoiceNo}`);
    } catch (err) {
      alert(`Error: ${err.message}`);
    }
  };

  const handleUploadSigned = (inv) => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = ".json";
    input.onchange = (e) => {
      const file = e.target.files?.[0];
      if (!file) return;

      const reader = new FileReader();
      reader.onload = async (evt) => {
        try {
          const data = JSON.parse(evt.target?.result || "");
          const response = Array.isArray(data) ? data[0] : data;

          if (!response.Irn) {
            alert("Invalid response: Missing IRN field");
            return;
          }

          await invoicesService.updateIRN(inv.id, {
            irn: response.Irn,
            ackNo: response.AckNo,
            ackDate: response.AckDt,
            signedInvoice: response.SignedInvoice,
            signedQRCode: response.SignedQRCode,
            jsonSigned: true,
          });

          setInvoices((prev) =>
            prev.map((i) =>
              i.id === inv.id
                ? {
                    ...i,
                    irn: response.Irn,
                    ackNo: response.AckNo,
                    ackDate: response.AckDt,
                    signedInvoice: response.SignedInvoice,
                    signedQRCode: response.SignedQRCode,
                    jsonSigned: true,
                  }
                : i
            )
          );

          alert(
            `Invoice #${inv.invoiceNo} updated with IRN: ${response.Irn.substring(
              0,
              16
            )}...`
          );
        } catch (err) {
          alert(`Invalid JSON: ${err.message}`);
        }
      };
      reader.readAsText(file);
    };
    input.click();
  };

  const handleBulkGenerateJSON = async () => {
    if (selectedInvoices.size === 0) {
      alert("Please select at least one invoice");
      return;
    }

    try {
      const selected = taxInvoices.filter((inv) => selectedInvoices.has(inv.id));
      const bulkJson = selected.map((inv) =>
        buildEInvoiceJSON(inv, company, customers.find((c) => c.id === inv.customerId))
      );

      for (const inv of selected) {
        await invoicesService.update(inv.id, { jsonConverted: true });
      }

      setInvoices((prev) =>
        prev.map((i) =>
          selectedInvoices.has(i.id) ? { ...i, jsonConverted: true } : i
        )
      );

      const blob = new Blob([JSON.stringify(bulkJson, null, 2)], {
        type: "application/json",
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `bulk_tax_invoices_${new Date().toISOString().split("T")[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      setSelectedInvoices(new Set());
      alert(`Generated and downloaded bulk JSON for ${selected.length} tax invoice(s)`);
    } catch (err) {
      alert(`Error: ${err.message}`);
    }
  };

  const handleBulkImport = () => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = ".json";
    input.onchange = (e) => {
      const file = e.target.files?.[0];
      if (!file) return;

      const reader = new FileReader();
      reader.onload = async (evt) => {
        try {
          const signedData = JSON.parse(evt.target?.result || "");
          const signedArray = Array.isArray(signedData) ? signedData : [signedData];

          const results = await invoicesService.bulkImportSignedInvoices(signedArray);

          if (results.successful.length > 0) {
            setInvoices((prev) =>
              prev.map((inv) => {
                const matched = results.successful.find(
                  (s) => s.invoiceNo === inv.invoiceNo
                );
                if (matched) {
                  return {
                    ...inv,
                    irn: matched.irn,
                    ackNo: matched.ackNo,
                    ackDate: matched.ackDate,
                    signedInvoice: matched.signedInvoice,
                    signedQRCode: matched.signedQRCode,
                    jsonSigned: true,
                  };
                }
                return inv;
              })
            );
          }

          const summary = `✓ ${results.successful.length} imported\n${
            results.failed.length > 0 ? `✗ ${results.failed.length} failed` : ""
          }`;
          const details =
            results.errors.length > 0
              ? `\n\nErrors:\n${results.errors.join("\n")}`
              : "";
          alert(`Bulk import complete:\n${summary}${details}`);
        } catch (err) {
          alert(`Error: ${err.message}`);
        }
      };
      reader.readAsText(file);
    };
    input.click();
  };

  const StageIndicator = ({ stage }) => {
    const steps = [
      { key: "pending", label: "Bill" },
      { key: "json_ready", label: "JSON" },
      { key: "active", label: "Signed" },
    ];

    const stageOrder = { pending: 0, json_ready: 1, active: 2 };
    const currentIdx = stageOrder[stage] || 0;

    return (
      <div className="flex items-center gap-1 text-xs">
        {steps.map((s, i) => (
          <div key={s.key} className="flex items-center gap-1">
            <div
              className={`w-5 h-5 rounded-full border-2 flex items-center justify-center text-[10px] font-bold ${
                i <= currentIdx
                  ? "bg-green-500 border-green-500 text-white"
                  : "bg-white border-gray-300 text-gray-400"
              }`}
            >
              {i <= currentIdx ? "✓" : i + 1}
            </div>
            {i < steps.length - 1 && (
              <div
                className={`w-6 h-0.5 ${
                  i < currentIdx ? "bg-green-500" : "bg-gray-300"
                }`}
              />
            )}
          </div>
        ))}
      </div>
    );
  };

  return (
    <div>
      <Tabs
        tabs={[
          { key: "create", label: "Create Tax Invoice" },
          { key: "pipeline", label: "Tax E-Invoice Pipeline" },
        ]}
        active={tab}
        onChange={setTab}
      />

      <div className="mt-4">
        {tab === "create" && (
          <InvoiceCreator
            products={products}
            setProducts={setProducts}
            customers={customers}
            setCustomers={setCustomers}
            invoices={taxInvoices}
            allInvoices={invoices}
            setInvoices={setInvoices}
            company={company}
            fixedInvoiceType="tax"
            showInvoiceTypeField={false}
            allowRateEdit={true}
            allowTaxEdit={true}
            onInvoiceCreated={() => setTab("pipeline")}
          />
        )}

        {tab === "pipeline" && (
          <div className="space-y-4">
            {taxInvoices.length === 0 ? (
              <Card>
                <div className="text-center py-8 text-gray-500">
                  No tax invoices. Create one in the "Create Tax Invoice" tab first.
                </div>
              </Card>
            ) : (
              <>
                <div className="flex gap-2 flex-wrap">
                  <button
                    onClick={() => setFilterStage("all")}
                    className={`px-3 py-1 rounded-full text-sm font-medium transition ${
                      filterStage === "all"
                        ? "bg-gray-900 text-white"
                        : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                    }`}
                  >
                    All
                  </button>
                  <button
                    onClick={() => setFilterStage("pending")}
                    className={`px-3 py-1 rounded-full text-sm font-medium transition ${
                      filterStage === "pending"
                        ? "bg-gray-900 text-white"
                        : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                    }`}
                  >
                    Bill Created
                  </button>
                  <button
                    onClick={() => setFilterStage("json_ready")}
                    className={`px-3 py-1 rounded-full text-sm font-medium transition ${
                      filterStage === "json_ready"
                        ? "bg-gray-900 text-white"
                        : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                    }`}
                  >
                    JSON Ready
                  </button>
                  <button
                    onClick={() => setFilterStage("active")}
                    className={`px-3 py-1 rounded-full text-sm font-medium transition ${
                      filterStage === "active"
                        ? "bg-gray-900 text-white"
                        : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                    }`}
                  >
                    E-Invoice Active
                  </button>
                </div>

                <div className="flex justify-end gap-2">
                  {selectedInvoices.size > 0 && (
                    <>
                      <Button size="sm" variant="primary" onClick={handleBulkGenerateJSON}>
                        <Icons.download size={14} /> Bulk Generate JSON
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => setSelectedInvoices(new Set())}
                      >
                        Clear
                      </Button>
                    </>
                  )}
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={handleBulkImport}
                    className="border border-gray-300"
                  >
                    <Icons.upload size={14} /> Bulk Import Signed
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => window.open("https://einvoice1.gst.gov.in", "_blank")}
                    className="border border-gray-300"
                  >
                    <Icons.external size={14} /> GST Portal
                  </Button>
                </div>

                <Card>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-gray-100 bg-gray-50">
                          <th className="px-4 py-3 text-left">
                            {(() => {
                              const selectableInvoices = filteredInvoices.filter((i) => !i.irn);
                              const isDisabled = selectableInvoices.length === 0;
                              return (
                                <input
                                  type="checkbox"
                                  checked={
                                    selectedInvoices.size === selectableInvoices.length &&
                                    selectableInvoices.length > 0
                                  }
                                  onChange={(e) => {
                                    if (e.target.checked) {
                                      setSelectedInvoices(
                                        new Set(selectableInvoices.map((i) => i.id))
                                      );
                                    } else {
                                      setSelectedInvoices(new Set());
                                    }
                                  }}
                                  disabled={isDisabled}
                                  className={isDisabled ? "cursor-not-allowed opacity-50" : ""}
                                />
                              );
                            })()}
                          </th>
                          <th className="px-4 py-3 text-left font-medium text-gray-700">
                            Invoice #
                          </th>
                          <th className="px-4 py-3 text-left font-medium text-gray-700">
                            Date
                          </th>
                          <th className="px-4 py-3 text-left font-medium text-gray-700">
                            Customer
                          </th>
                          <th className="px-4 py-3 text-right font-medium text-gray-700">
                            Total
                          </th>
                          <th className="px-4 py-3 text-left font-medium text-gray-700">
                            Stage
                          </th>
                          <th className="px-4 py-3 text-left font-medium text-gray-700">
                            Actions
                          </th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-50">
                        {filteredInvoices.map((inv) => {
                          const customer = customers.find((c) => c.id === inv.customerId);
                          const stage = getStage(inv);
                          const isSelected = selectedInvoices.has(inv.id);
                          const isSelectable = !inv.irn;

                          return (
                            <tr
                              key={inv.id}
                              className={`hover:bg-gray-50 transition-colors ${
                                isSelected ? "bg-blue-50" : ""
                              }`}
                            >
                              <td className="px-4 py-3">
                                <input
                                  type="checkbox"
                                  checked={isSelected}
                                  disabled={!isSelectable}
                                  onChange={(e) => {
                                    if (!isSelectable) return;
                                    const newSet = new Set(selectedInvoices);
                                    if (e.target.checked) {
                                      newSet.add(inv.id);
                                    } else {
                                      newSet.delete(inv.id);
                                    }
                                    setSelectedInvoices(newSet);
                                  }}
                                  className={!isSelectable ? "cursor-not-allowed opacity-50" : ""}
                                />
                              </td>
                              <td className="px-4 py-3">
                                <span className="font-mono font-medium">{inv.invoiceNo}</span>
                              </td>
                              <td className="px-4 py-3 text-gray-600">
                                {formatDate(inv.date)}
                              </td>
                              <td className="px-4 py-3">{customer?.name || "—"}</td>
                              <td className="px-4 py-3 text-right font-semibold">
                                {formatCurrency(inv.total)}
                              </td>
                              <td className="px-4 py-3">
                                <StageIndicator stage={stage} />
                              </td>
                              <td className="px-4 py-3">
                                <div className="flex items-center gap-2">
                                  {stage === "pending" && (
                                    <Button
                                      size="sm"
                                      variant="primary"
                                      onClick={() => handleGenerateJSON(inv)}
                                    >
                                      <Icons.download size={14} /> Generate JSON
                                    </Button>
                                  )}
                                  {stage === "json_ready" && (
                                    <>
                                      <Button
                                        size="sm"
                                        variant="ghost"
                                        onClick={() => downloadJSON(inv, company, customer)}
                                        className="border border-gray-300"
                                      >
                                        <Icons.download size={14} /> Download
                                      </Button>
                                      <Button
                                        size="sm"
                                        variant="primary"
                                        onClick={() => handleUploadSigned(inv)}
                                      >
                                        <Icons.check size={14} /> Upload Signed
                                      </Button>
                                    </>
                                  )}
                                  {stage === "active" && (
                                    <>
                                      <span className="text-xs font-mono text-green-700">
                                        IRN: {inv.irn?.substring(0, 12)}...
                                      </span>
                                      <Button
                                        size="sm"
                                        variant="ghost"
                                        onClick={() => setShowInvoiceDetail(inv)}
                                      >
                                        <Icons.file size={14} /> View
                                      </Button>
                                      <Button
                                        size="sm"
                                        variant="ghost"
                                        onClick={() => handlePrint(inv)}
                                        title="Print as PDF"
                                      >
                                        <Icons.printer size={14} /> Print
                                      </Button>
                                    </>
                                  )}
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </Card>
              </>
            )}
          </div>
        )}
      </div>

      <Modal
        open={!!showInvoiceDetail}
        onClose={() => setShowInvoiceDetail(null)}
        title={`Invoice #${showInvoiceDetail?.invoiceNo}`}
        size="lg"
      >
        {showInvoiceDetail && (
          <InvoicePrintView
            invoice={showInvoiceDetail}
            company={company}
            customer={customers.find((c) => c.id === showInvoiceDetail.customerId)}
          />
        )}
      </Modal>
    </div>
  );
};