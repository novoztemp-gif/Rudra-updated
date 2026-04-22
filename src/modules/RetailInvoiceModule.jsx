import { useMemo, useState } from "react";
import { formatCurrency, formatDate } from "../utils/formatters";
import { Button } from "../components/ui/Button";
import { Card } from "../components/ui/Card";
import { Modal } from "../components/ui/Modal";
import { Tabs } from "../components/ui/Tabs";
import { Icons } from "../components/ui/Icons";
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
          body {
            margin: 0;
            padding: 20px;
            background: #ffffff;
            font-family: Arial, sans-serif;
            color: #111827;
          }
          .bill-wrap {
            max-width: 900px;
            margin: 0 auto;
            border: 1px solid #d1d5db;
            border-radius: 8px;
            overflow: hidden;
            background: #fff;
          }
          .bill-header {
            padding: 16px;
            border-bottom: 1px solid #d1d5db;
            text-align: center;
          }
          .bill-title {
            font-size: 20px;
            font-weight: 700;
            margin-bottom: 4px;
          }
          .muted {
            font-size: 12px;
            color: #6b7280;
          }
          .info-grid {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 16px;
            padding: 16px;
            border-bottom: 1px solid #d1d5db;
            font-size: 12px;
          }
          .info-grid div div {
            margin-bottom: 4px;
          }
          table {
            width: 100%;
            border-collapse: collapse;
            font-size: 12px;
          }
          thead {
            background: #f9fafb;
          }
          th, td {
            padding: 10px 12px;
            border-bottom: 1px solid #e5e7eb;
          }
          th {
            text-align: left;
            font-weight: 600;
          }
          .text-right {
            text-align: right;
          }
          .total-box {
            padding: 16px;
            text-align: right;
            font-size: 14px;
            border-top: 1px solid #d1d5db;
          }
          @page {
            size: auto;
            margin: 12mm;
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
          <td>${item.name}</td>
          <td class="text-right">${item.qty}</td>
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

  const extraRows = `
    ${
      overallTaxPercent > 0
        ? !isInterState
          ? `
            <div><strong>CGST (${overallTaxPercent / 2}%):</strong> ${formatCurrency(cgst)}</div>
            <div><strong>SGST (${overallTaxPercent / 2}%):</strong> ${formatCurrency(sgst)}</div>
          `
          : `<div><strong>IGST (${overallTaxPercent}%):</strong> ${formatCurrency(igst)}</div>`
        : ""
    }
    ${invoice.loadingCharge > 0 ? `<div><strong>Loading Charge:</strong> ${formatCurrency(invoice.loadingCharge)}</div>` : ""}
    ${invoice.transportCharge > 0 ? `<div><strong>Transport Charge:</strong> ${formatCurrency(invoice.transportCharge)}</div>` : ""}
    ${invoice.freightCharge > 0 ? `<div><strong>Freight Charge:</strong> ${formatCurrency(invoice.freightCharge)}</div>` : ""}
    ${invoice.transportNotes ? `<div style="margin-top:8px;"><strong>Notes:</strong> ${invoice.transportNotes}</div>` : ""}
  `;

  return `
    <div class="bill-wrap">
      <div class="bill-header">
        <div class="bill-title">${company.name}</div>
        <div class="muted">${company.address || ""}</div>
        <div class="muted">Phone: ${company.phone || "—"}</div>
      </div>

      <div class="info-grid">
        <div>
          <div><strong>Invoice No:</strong> ${invoice.invoiceNo}</div>
          <div><strong>Date:</strong> ${formatDate(invoice.date)}</div>
        </div>
        <div>
          <div><strong>Customer:</strong> ${customer?.name || "—"}</div>
          <div><strong>Phone:</strong> ${customer?.mobile || "—"}</div>
        </div>
      </div>

      <table>
        <thead>
          <tr>
            <th>Product</th>
            <th class="text-right">Qty</th>
            <th class="text-right">Rate</th>
            <th class="text-right">Amount</th>
          </tr>
        </thead>
        <tbody>
          ${rows}
        </tbody>
      </table>

      ${
        overallTaxPercent > 0 ||
        invoice.loadingCharge > 0 ||
        invoice.transportCharge > 0 ||
        invoice.freightCharge > 0 ||
        invoice.transportNotes
          ? `<div style="padding:16px; border-top:1px solid #d1d5db; font-size:12px;">${extraRows}</div>`
          : ""
      }

      <div class="total-box">
        <strong>Total:</strong> ${formatCurrency(invoice.total)}
      </div>
    </div>
  `;
};

const buildCompanyBillHTML = (invoice, company, customer) => {
  const rows = invoice.items
    .map(
      (item) => `
        <tr>
          <td>${item.name}</td>
          <td class="text-right">${item.qty} ${item.unit}</td>
        </tr>
      `
    )
    .join("");

  return `
    <div class="bill-wrap">
      <div class="bill-header">
        <div class="bill-title">${company.name}</div>
        <div class="muted">${company.address || ""}</div>
      </div>

      <div class="info-grid">
        <div>
          <div><strong>Invoice No:</strong> ${invoice.invoiceNo}</div>
          <div><strong>Date:</strong> ${formatDate(invoice.date)}</div>
        </div>
        <div>
          <div><strong>Customer:</strong> ${customer?.name || "—"}</div>
          <div><strong>Phone:</strong> ${customer?.mobile || "—"}</div>
        </div>
      </div>

      <table>
        <thead>
          <tr>
            <th>Product Name</th>
            <th class="text-right">Quantity</th>
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

  const retailInvoices = useMemo(() => {
    return invoices
      .filter((inv) => inv.invoiceType === "retail")
      .sort((a, b) => {
        const bNo = Number(b.invoiceNo || 0);
        const aNo = Number(a.invoiceNo || 0);
        return bNo - aNo;
      });
  }, [invoices]);

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
    </div>
  );
};