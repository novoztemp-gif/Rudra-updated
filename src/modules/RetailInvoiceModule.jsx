import { useMemo, useState } from "react";
import { formatCurrency, formatDate } from "../utils/formatters";
import { Button } from "../components/ui/Button";
import { Card } from "../components/ui/Card";
import { Modal } from "../components/ui/Modal";
import { Tabs } from "../components/ui/Tabs";
import { Icons } from "../components/ui/Icons";
import * as invoicesService from "../services/invoices";
import {
  InvoiceCreator,
  RetailCustomerBillView,
  RetailCompanyBillView,
} from "./BillingModule";

const StyledTable = ({ columns, data, emptyMsg = "No data available" }) => {
  return (
    <div className="overflow-x-auto rounded-xl border border-gray-200">
      <table className="w-full border-collapse text-sm">
        <thead>
          <tr className="bg-gray-50">
            {columns.map((col, idx) => (
              <th
                key={col.key}
                className={`px-4 py-3 text-left font-semibold text-gray-700 border-b border-gray-200 ${
                  idx !== columns.length - 1 ? "border-r border-gray-200" : ""
                } ${col.align === "right" ? "text-right" : ""}`}
              >
                {col.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.length === 0 ? (
            <tr>
              <td
                colSpan={columns.length}
                className="px-4 py-8 text-center text-gray-500"
              >
                {emptyMsg}
              </td>
            </tr>
          ) : (
            data.map((row, rowIndex) => (
              <tr
                key={row.id || row.invoiceNo || rowIndex}
                className="bg-white hover:bg-gray-50"
              >
                {columns.map((col, colIndex) => (
                  <td
                    key={col.key}
                    className={`px-4 py-3 border-b border-gray-100 ${
                      colIndex !== columns.length - 1
                        ? "border-r border-gray-100"
                        : ""
                    } ${col.align === "right" ? "text-right" : ""}`}
                  >
                    {col.render ? col.render(row, rowIndex) : row[col.key]}
                  </td>
                ))}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
};

const escapeHtml = (value) => {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
};

const printHtmlInIframe = (html) => {
  const iframe = document.createElement("iframe");
  iframe.style.position = "fixed";
  iframe.style.right = "0";
  iframe.style.bottom = "0";
  iframe.style.width = "0";
  iframe.style.height = "0";
  iframe.style.border = "0";
  iframe.setAttribute("aria-hidden", "true");
  document.body.appendChild(iframe);

  const doc = iframe.contentWindow.document;
  doc.open();
  doc.write(`
    <!DOCTYPE html>
    <html>
      <head>
        <title></title>
        <style>
          @page {
            size: auto;
            margin: 10mm;
          }

          * {
            box-sizing: border-box;
          }

          body {
            margin: 0;
            padding: 0;
            background: #ffffff;
            font-family: Arial, sans-serif;
            color: #111827;
            font-size: 11px;
          }

          .bill-wrap {
            width: 100%;
            max-width: 760px;
            margin: 0 auto;
            border: 1px solid #cbd5e1;
            border-radius: 6px;
            overflow: hidden;
            background: #fff;
          }

          .info-grid {
            display: grid;
            grid-template-columns: 1fr 1fr;
            border-bottom: 1px solid #cbd5e1;
          }

          .info-box {
            padding: 10px 12px;
            line-height: 1.45;
          }

          .info-box:first-child {
            border-right: 1px solid #cbd5e1;
          }

          table {
            width: 100%;
            border-collapse: collapse;
            table-layout: fixed;
            font-size: 11px;
          }

          thead {
            background: #f8fafc;
          }

          th,
          td {
            padding: 8px 10px;
            border-bottom: 1px solid #e5e7eb;
            vertical-align: top;
            word-break: break-word;
            overflow-wrap: anywhere;
          }

          th {
            font-weight: 700;
            text-align: left;
          }

          .text-right {
            text-align: right;
          }

          .product-col {
            width: 46%;
          }

          .qty-col {
            width: 14%;
          }

          .rate-col {
            width: 20%;
          }

          .amount-col {
            width: 20%;
          }

          .company-product-col {
            width: 70%;
          }

          .company-qty-col {
            width: 30%;
          }

          .summary-section {
            display: grid;
            grid-template-columns: minmax(0, 1fr) 260px;
            gap: 12px;
            padding: 10px 12px;
            border-top: 1px solid #cbd5e1;
            font-size: 11px;
          }

          .summary-box {
            width: 100%;
          }

          .summary-row {
            display: grid;
            grid-template-columns: minmax(0, 1fr) auto;
            gap: 12px;
            margin-bottom: 4px;
            align-items: start;
          }

          .summary-label {
            font-weight: 700;
          }

          .summary-value {
            text-align: right;
            white-space: nowrap;
          }

          .notes-box {
            line-height: 1.45;
            word-break: break-word;
            overflow-wrap: anywhere;
          }

          .total-box {
            padding: 12px;
            text-align: right;
            font-size: 13px;
            font-weight: 700;
            border-top: 1px solid #cbd5e1;
          }

          @media print {
            body {
              -webkit-print-color-adjust: exact;
              print-color-adjust: exact;
            }

            .bill-wrap {
              max-width: 100%;
              page-break-inside: avoid;
            }
          }
        </style>
      </head>
      <body>
        ${html}
      </body>
    </html>
  `);
  doc.close();

  setTimeout(() => {
    iframe.contentWindow.focus();
    iframe.contentWindow.print();
    setTimeout(() => {
      document.body.removeChild(iframe);
    }, 1000);
  }, 400);
};

const buildCustomerBillHTML = (invoice, company, customer) => {
  const rows = invoice.items
    .map(
      (item) => `
        <tr>
          <td>${escapeHtml(item.name)}</td>
          <td class="text-right">${escapeHtml(item.qty)}</td>
          <td class="text-right">${formatCurrency(item.rate)}</td>
          <td class="text-right">${formatCurrency(item.amount)}</td>
        </tr>
      `
    )
    .join("");

  const isInterState = customer?.state !== company.stateCode;
  const totalTax = Number(invoice.totalTax || 0);
  const overallTaxPercent = Number(invoice.overallTaxPercent || 0);
  const cgst = !isInterState ? totalTax / 2 : 0;
  const sgst = !isInterState ? totalTax / 2 : 0;
  const igst = isInterState ? totalTax : 0;

  const loadingCharge = Number(invoice.loadingCharge || 0);
  const transportCharge = Number(invoice.transportCharge || 0);
  const freightCharge = Number(invoice.freightCharge || 0);
  const hasSummary =
    overallTaxPercent > 0 ||
    loadingCharge > 0 ||
    transportCharge > 0 ||
    freightCharge > 0 ||
    !!invoice.transportNotes;

  const taxRows =
    overallTaxPercent > 0
      ? !isInterState
        ? `
          <div class="summary-row">
            <div class="summary-label">CGST (${overallTaxPercent / 2}%)</div>
            <div class="summary-value">${formatCurrency(cgst)}</div>
          </div>
          <div class="summary-row">
            <div class="summary-label">SGST (${overallTaxPercent / 2}%)</div>
            <div class="summary-value">${formatCurrency(sgst)}</div>
          </div>
        `
        : `
          <div class="summary-row">
            <div class="summary-label">IGST (${overallTaxPercent}%)</div>
            <div class="summary-value">${formatCurrency(igst)}</div>
          </div>
        `
      : "";

  const chargeRows = `
    ${
      loadingCharge > 0
        ? `
          <div class="summary-row">
            <div class="summary-label">Loading Charge</div>
            <div class="summary-value">${formatCurrency(loadingCharge)}</div>
          </div>
        `
        : ""
    }
    ${
      transportCharge > 0
        ? `
          <div class="summary-row">
            <div class="summary-label">Transport Charge</div>
            <div class="summary-value">${formatCurrency(transportCharge)}</div>
          </div>
        `
        : ""
    }
    ${
      freightCharge > 0
        ? `
          <div class="summary-row">
            <div class="summary-label">Freight Charge</div>
            <div class="summary-value">${formatCurrency(freightCharge)}</div>
          </div>
        `
        : ""
    }
  `;

  return `
    <div class="bill-wrap">
      <div class="info-grid">
        <div class="info-box">
          <div><strong>Invoice No:</strong> ${escapeHtml(invoice.invoiceNo)}</div>
          <div><strong>Date:</strong> ${formatDate(invoice.date)}</div>
        </div>
        <div class="info-box">
          <div><strong>Customer:</strong> ${escapeHtml(customer?.name || "—")}</div>
          <div><strong>Phone:</strong> ${escapeHtml(customer?.mobile || "—")}</div>
        </div>
      </div>

      <table>
        <thead>
          <tr>
            <th class="product-col">Product</th>
            <th class="qty-col text-right">Qty</th>
            <th class="rate-col text-right">Rate</th>
            <th class="amount-col text-right">Amount</th>
          </tr>
        </thead>
        <tbody>
          ${rows}
        </tbody>
      </table>

      ${
        hasSummary
          ? `
            <div class="summary-section">
              <div class="notes-box">
                ${
                  invoice.transportNotes
                    ? `<strong>Notes:</strong> ${escapeHtml(invoice.transportNotes)}`
                    : ""
                }
              </div>
              <div class="summary-box">
                ${taxRows}
                ${chargeRows}
              </div>
            </div>
          `
          : ""
      }

      <div class="total-box">
        Total: ${formatCurrency(invoice.total)}
      </div>
    </div>
  `;
};

const buildCompanyBillHTML = (invoice, company, customer) => {
  const rows = invoice.items
    .map(
      (item) => `
        <tr>
          <td>${escapeHtml(item.name)}</td>
          <td class="text-right">${escapeHtml(item.qty)} ${escapeHtml(item.unit)}</td>
        </tr>
      `
    )
    .join("");

  return `
    <div class="bill-wrap">
      <div class="info-grid">
        <div class="info-box">
          <div><strong>Invoice No:</strong> ${escapeHtml(invoice.invoiceNo)}</div>
          <div><strong>Date:</strong> ${formatDate(invoice.date)}</div>
        </div>
        <div class="info-box">
          <div><strong>Customer:</strong> ${escapeHtml(customer?.name || "—")}</div>
          <div><strong>Phone:</strong> ${escapeHtml(customer?.mobile || "—")}</div>
        </div>
      </div>

      <table>
        <thead>
          <tr>
            <th class="company-product-col">Product Name</th>
            <th class="company-qty-col text-right">Quantity</th>
          </tr>
        </thead>
        <tbody>
          ${rows}
        </tbody>
      </table>
    </div>
  `;
};

export const RetailInvoiceModule = ({
  products,
  setProducts,
  customers,
  setCustomers,
  invoices,
  setInvoices,
  company,
  showToast,
}) => {
  const [tab, setTab] = useState("create");
  const [showCustomerBill, setShowCustomerBill] = useState(null);
  const [showCompanyBill, setShowCompanyBill] = useState(null);
  const [editTransportInvoice, setEditTransportInvoice] = useState(null);

  const retailInvoices = useMemo(() => {
    return invoices
      .filter((inv) => inv.invoiceType === "retail")
      .sort((a, b) => {
        const bNo = Number(b.invoiceNo || 0);
        const aNo = Number(a.invoiceNo || 0);
        return bNo - aNo;
      });
  }, [invoices]);

  const handleSaveTransport = async () => {
    if (!editTransportInvoice) return;

    const subtotal =
      Number(editTransportInvoice.subtotal || 0) ||
      editTransportInvoice.items?.reduce(
        (sum, item) => sum + Number(item.amount || 0),
        0
      ) ||
      0;

    const totalTax = Number(editTransportInvoice.totalTax || 0);

    const loadingCharge = editTransportInvoice.hasTransportDetails
      ? Number(editTransportInvoice.loadingCharge || 0)
      : 0;

    const transportCharge = editTransportInvoice.hasTransportDetails
      ? Number(editTransportInvoice.transportCharge || 0)
      : 0;

    const freightCharge = editTransportInvoice.hasTransportDetails
      ? Number(editTransportInvoice.freightCharge || 0)
      : 0;

    const updatedFields = {
      hasTransportDetails: !!editTransportInvoice.hasTransportDetails,
      loadingCharge,
      transportCharge,
      freightCharge,
      transportNotes: editTransportInvoice.hasTransportDetails
        ? String(editTransportInvoice.transportNotes || "").trim()
        : "",
      total: subtotal + totalTax + loadingCharge + transportCharge + freightCharge,
    };

    try {
      await invoicesService.update(editTransportInvoice.id, updatedFields);

      const applyUpdate = (inv) =>
        inv?.id === editTransportInvoice.id ? { ...inv, ...updatedFields } : inv;

      setInvoices((prev) => prev.map(applyUpdate));
      setShowCustomerBill((prev) => applyUpdate(prev));
      setShowCompanyBill((prev) => applyUpdate(prev));

      showToast?.("Transport details updated successfully", "success");
      setEditTransportInvoice(null);
    } catch (err) {
      showToast?.(`Error updating transport: ${err.message}`, "error");
    }
  };

  return (
    <div>
      <Tabs
        tabs={[
          { key: "create", label: "Create Retail Invoice" },
          { key: "list", label: "Retail Bills" },
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
            invoices={retailInvoices}
            allInvoices={invoices}
            setInvoices={setInvoices}
            company={company}
            fixedInvoiceType="retail"
            showInvoiceTypeField={false}
            allowRateEdit={true}
            onInvoiceCreated={() => setTab("list")}
            showToast={showToast}
          />
        )}

        {tab === "list" && (
          <Card title="Retail Invoices">
            <StyledTable
              columns={[
                {
                  key: "invoiceNo",
                  label: "Invoice #",
                  render: (inv) => (
                    <span className="font-mono font-medium">{inv.invoiceNo}</span>
                  ),
                },
                {
                  key: "date",
                  label: "Date",
                  render: (inv) => (
                    <span className="text-gray-600">{formatDate(inv.date)}</span>
                  ),
                },
                {
                  key: "customer",
                  label: "Customer",
                  render: (inv) => {
                    const customer = customers.find((c) => c.id === inv.customerId);
                    return customer?.name || "—";
                  },
                },
                {
                  key: "phone",
                  label: "Phone",
                  render: (inv) => {
                    const customer = customers.find((c) => c.id === inv.customerId);
                    return customer?.mobile || "—";
                  },
                },
                {
                  key: "total",
                  label: "Total",
                  align: "right",
                  render: (inv) => (
                    <span className="font-semibold">{formatCurrency(inv.total)}</span>
                  ),
                },
                {
                  key: "actions",
                  label: "Actions",
                  render: (inv) => (
                    <div className="flex items-center gap-2 flex-wrap">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => setShowCustomerBill(inv)}
                      >
                        <Icons.file size={14} /> Customer Bill
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => setShowCompanyBill(inv)}
                      >
                        <Icons.file size={14} /> Company Bill
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => setEditTransportInvoice(inv)}
                      >
                        <Icons.truck size={14} /> Edit Transport
                      </Button>
                    </div>
                  ),
                },
              ]}
              data={retailInvoices}
              emptyMsg="No retail invoices created yet."
            />
          </Card>
        )}
      </div>

      <Modal
        open={!!showCustomerBill}
        onClose={() => setShowCustomerBill(null)}
        title={`Customer Bill #${showCustomerBill?.invoiceNo}`}
        size="lg"
      >
        {showCustomerBill && (
          <div className="space-y-4">
            <div className="flex justify-end">
              <Button
                onClick={() => {
                  const customer = customers.find(
                    (c) => c.id === showCustomerBill.customerId
                  );
                  printHtmlInIframe(
                    buildCustomerBillHTML(showCustomerBill, company, customer)
                  );
                }}
              >
                <Icons.printer size={14} /> Print / Save PDF
              </Button>
            </div>

            <RetailCustomerBillView
              invoice={showCustomerBill}
              company={company}
              customer={customers.find(
                (c) => c.id === showCustomerBill.customerId
              )}
            />
          </div>
        )}
      </Modal>

      <Modal
        open={!!showCompanyBill}
        onClose={() => setShowCompanyBill(null)}
        title={`Company Bill #${showCompanyBill?.invoiceNo}`}
        size="lg"
      >
        {showCompanyBill && (
          <div className="space-y-4">
            <div className="flex justify-end">
              <Button
                onClick={() => {
                  const customer = customers.find(
                    (c) => c.id === showCompanyBill.customerId
                  );
                  printHtmlInIframe(
                    buildCompanyBillHTML(showCompanyBill, company, customer)
                  );
                }}
              >
                <Icons.printer size={14} /> Print / Save PDF
              </Button>
            </div>

            <RetailCompanyBillView
              invoice={showCompanyBill}
              company={company}
              customer={customers.find(
                (c) => c.id === showCompanyBill.customerId
              )}
            />
          </div>
        )}
      </Modal>

      <Modal
        open={!!editTransportInvoice}
        onClose={() => setEditTransportInvoice(null)}
        title={`Edit Transport #${editTransportInvoice?.invoiceNo}`}
        size="md"
      >
        {editTransportInvoice && (
          <div className="space-y-4">
            <label className="flex items-center gap-2 text-sm font-medium text-gray-700">
              <input
                type="checkbox"
                checked={!!editTransportInvoice.hasTransportDetails}
                onChange={(e) =>
                  setEditTransportInvoice((prev) => ({
                    ...prev,
                    hasTransportDetails: e.target.checked,
                  }))
                }
              />
              Enable transport details
            </label>

            {editTransportInvoice.hasTransportDetails && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">
                    Loading Charge
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={editTransportInvoice.loadingCharge || ""}
                    onChange={(e) =>
                      setEditTransportInvoice((prev) => ({
                        ...prev,
                        loadingCharge:
                          e.target.value === ""
                            ? ""
                            : String(Math.max(0, Number(e.target.value))),
                      }))
                    }
                    className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm outline-none focus:border-gray-400"
                    placeholder="0"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">
                    Transport Charge
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={editTransportInvoice.transportCharge || ""}
                    onChange={(e) =>
                      setEditTransportInvoice((prev) => ({
                        ...prev,
                        transportCharge:
                          e.target.value === ""
                            ? ""
                            : String(Math.max(0, Number(e.target.value))),
                      }))
                    }
                    className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm outline-none focus:border-gray-400"
                    placeholder="0"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">
                    Freight Charge
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={editTransportInvoice.freightCharge || ""}
                    onChange={(e) =>
                      setEditTransportInvoice((prev) => ({
                        ...prev,
                        freightCharge:
                          e.target.value === ""
                            ? ""
                            : String(Math.max(0, Number(e.target.value))),
                      }))
                    }
                    className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm outline-none focus:border-gray-400"
                    placeholder="0"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">
                    Transport Notes
                  </label>
                  <input
                    value={editTransportInvoice.transportNotes || ""}
                    onChange={(e) =>
                      setEditTransportInvoice((prev) => ({
                        ...prev,
                        transportNotes: e.target.value,
                      }))
                    }
                    className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm outline-none focus:border-gray-400"
                    placeholder="Optional notes"
                  />
                </div>
              </div>
            )}

            <div className="flex justify-end gap-2 pt-2">
              <Button
                variant="secondary"
                onClick={() => setEditTransportInvoice(null)}
              >
                Cancel
              </Button>
              <Button onClick={handleSaveTransport}>
                <Icons.check size={14} /> Save
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};