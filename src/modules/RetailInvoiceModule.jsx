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
            size: 80mm auto;
            margin: 3mm;
          }

          * {
            box-sizing: border-box;
          }

          html,
          body {
            margin: 0;
            padding: 0;
            background: #ffffff;
            font-family: Arial, sans-serif;
            color: #111827;
            font-size: 10px;
            line-height: 1.35;
          }

          .bill-wrap {
            width: 74mm;
            max-width: 74mm;
            margin: 0 auto;
            background: #ffffff;
          }

          .bill-line {
            border-top: 1px dashed #111827;
            margin: 6px 0;
          }

          .bill-info {
            padding-bottom: 4px;
          }

          .bill-info-row {
            display: flex;
            justify-content: space-between;
            gap: 6px;
            margin-bottom: 2px;
          }

          .bill-info-label {
            font-weight: 700;
            white-space: nowrap;
          }

          .bill-info-value {
            text-align: right;
            word-break: break-word;
            overflow-wrap: anywhere;
          }

          .customer-box {
            margin-top: 4px;
          }

          .item {
            padding: 5px 0;
            border-bottom: 1px dashed #cbd5e1;
          }

          .item-name {
            font-weight: 700;
            word-break: break-word;
            overflow-wrap: anywhere;
            margin-bottom: 2px;
          }

          .item-meta {
            display: flex;
            justify-content: space-between;
            gap: 6px;
            font-size: 9.5px;
          }

          .item-left {
            word-break: break-word;
            overflow-wrap: anywhere;
          }

          .item-right {
            text-align: right;
            white-space: nowrap;
            font-weight: 700;
          }

          .company-meta {
            margin-top: 2px;
            color: #374151;
            font-size: 9.5px;
            word-break: break-word;
            overflow-wrap: anywhere;
          }

          .summary {
            padding-top: 5px;
          }

          .summary-row {
            display: flex;
            justify-content: space-between;
            gap: 8px;
            margin-bottom: 3px;
          }

          .summary-label {
            font-weight: 700;
          }

          .summary-value {
            text-align: right;
            white-space: nowrap;
          }

          .notes {
            margin-top: 5px;
            word-break: break-word;
            overflow-wrap: anywhere;
          }

          .total-box {
            border-top: 1px dashed #111827;
            border-bottom: 1px dashed #111827;
            padding: 6px 0;
            margin-top: 6px;
            display: flex;
            justify-content: space-between;
            gap: 8px;
            font-size: 12px;
            font-weight: 700;
          }

          .footer-space {
            height: 8px;
          }

          @media print {
            html,
            body {
              width: 80mm;
            }

            .bill-wrap {
              width: 74mm;
              max-width: 74mm;
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
  const isInterState = customer?.state !== company.stateCode;
  const totalTax = Number(invoice.totalTax || 0);
  const overallTaxPercent = Number(invoice.overallTaxPercent || 0);
  const cgst = !isInterState ? totalTax / 2 : 0;
  const sgst = !isInterState ? totalTax / 2 : 0;
  const igst = isInterState ? totalTax : 0;

  const loadingCharge = Number(invoice.loadingCharge || 0);
  const transportCharge = Number(invoice.transportCharge || 0);
  const freightCharge = Number(invoice.freightCharge || 0);

  const rows = invoice.items
    .map((item) => {
      const qtyText = `${item.qty} ${item.unit || ""}`.trim();
      const rateText = formatCurrency(item.rate);
      const amountText = formatCurrency(item.amount);

      return `
        <div class="item">
          <div class="item-name">${escapeHtml(item.name)}</div>
          <div class="item-meta">
            <div class="item-left">
              Qty: ${escapeHtml(qtyText)} × ${rateText}
            </div>
            <div class="item-right">${amountText}</div>
          </div>
        </div>
      `;
    })
    .join("");

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
            <div class="summary-label">Loading</div>
            <div class="summary-value">${formatCurrency(loadingCharge)}</div>
          </div>
        `
        : ""
    }
    ${
      transportCharge > 0
        ? `
          <div class="summary-row">
            <div class="summary-label">Transport</div>
            <div class="summary-value">${formatCurrency(transportCharge)}</div>
          </div>
        `
        : ""
    }
    ${
      freightCharge > 0
        ? `
          <div class="summary-row">
            <div class="summary-label">Freight</div>
            <div class="summary-value">${formatCurrency(freightCharge)}</div>
          </div>
        `
        : ""
    }
  `;

  const hasSummary =
    overallTaxPercent > 0 ||
    loadingCharge > 0 ||
    transportCharge > 0 ||
    freightCharge > 0 ||
    !!invoice.transportNotes;

  return `
    <div class="bill-wrap">
      <div class="bill-info">
        <div class="bill-info-row">
          <div class="bill-info-label">Invoice No</div>
          <div class="bill-info-value">${escapeHtml(invoice.invoiceNo)}</div>
        </div>
        <div class="bill-info-row">
          <div class="bill-info-label">Date</div>
          <div class="bill-info-value">${formatDate(invoice.date)}</div>
        </div>

        <div class="customer-box">
          <div class="bill-info-row">
            <div class="bill-info-label">Customer</div>
            <div class="bill-info-value">${escapeHtml(customer?.name || "—")}</div>
          </div>
          <div class="bill-info-row">
            <div class="bill-info-label">Phone</div>
            <div class="bill-info-value">${escapeHtml(customer?.mobile || "—")}</div>
          </div>
        </div>
      </div>

      <div class="bill-line"></div>

      ${rows}

      ${
        hasSummary
          ? `
            <div class="summary">
              ${taxRows}
              ${chargeRows}
              ${
                invoice.transportNotes
                  ? `<div class="notes"><strong>Notes:</strong> ${escapeHtml(
                      invoice.transportNotes
                    )}</div>`
                  : ""
              }
            </div>
          `
          : ""
      }

      <div class="total-box">
        <div>Total</div>
        <div>${formatCurrency(invoice.total)}</div>
      </div>

      <div class="footer-space"></div>
    </div>
  `;
};

const buildCompanyBillHTML = (invoice, company, customer) => {
  const rows = invoice.items
    .map((item) => {
      const qtyText = `${item.qty} ${item.unit || ""}`.trim();
      const sizeText = item.size ? `Size: ${item.size}` : "";
      const thicknessText = item.thickness ? `Thickness: ${item.thickness}` : "";
      const detailText = [sizeText, thicknessText].filter(Boolean).join(" | ");

      return `
        <div class="item">
          <div class="item-name">${escapeHtml(item.name)}</div>
          ${
            detailText
              ? `<div class="company-meta">${escapeHtml(detailText)}</div>`
              : `<div class="company-meta">Size: — | Thickness: —</div>`
          }
          <div class="item-meta">
            <div class="item-left">Quantity</div>
            <div class="item-right">${escapeHtml(qtyText)}</div>
          </div>
        </div>
      `;
    })
    .join("");

  return `
    <div class="bill-wrap">
      <div class="bill-info">
        <div class="bill-info-row">
          <div class="bill-info-label">Invoice No</div>
          <div class="bill-info-value">${escapeHtml(invoice.invoiceNo)}</div>
        </div>
        <div class="bill-info-row">
          <div class="bill-info-label">Date</div>
          <div class="bill-info-value">${formatDate(invoice.date)}</div>
        </div>

        <div class="customer-box">
          <div class="bill-info-row">
            <div class="bill-info-label">Customer</div>
            <div class="bill-info-value">${escapeHtml(customer?.name || "—")}</div>
          </div>
          <div class="bill-info-row">
            <div class="bill-info-label">Phone</div>
            <div class="bill-info-value">${escapeHtml(customer?.mobile || "—")}</div>
          </div>
        </div>
      </div>

      <div class="bill-line"></div>

      ${rows}

      <div class="footer-space"></div>
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