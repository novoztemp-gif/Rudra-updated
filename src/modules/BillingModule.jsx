// ═══════════════════════════════════════════════════════════════════════════════
// BILLING SYSTEM + SHARED INVOICE CREATOR / PRINT VIEWS
// ═══════════════════════════════════════════════════════════════════════════════

import { useState } from "react";
import { generateId, today } from "../utils/helpers";
import {
  formatCurrency,
  formatDate,
  numberToWords,
} from "../utils/formatters";
import { STATES } from "../constants";
import QRCode from "qrcode.react";
import { Badge } from "../components/ui/Badge";
import { Button } from "../components/ui/Button";
import { Card } from "../components/ui/Card";
import { Input } from "../components/ui/Input";
import { Modal } from "../components/ui/Modal";
import { SearchBar } from "../components/ui/SearchBar";
import { Select } from "../components/ui/Select";
import { Table } from "../components/ui/Table";
import { Tabs } from "../components/ui/Tabs";
import { Icons } from "../components/ui/Icons";
import { PartyForm } from "./CustomerModule";
import { ProductForm } from "./InventoryModule";
import * as invoicesService from "../services/invoices";


const RETAIL_TRANSPORT_KEY = "retail_transport_demo_v1";

const loadRetailTransportMap = () => {
  try {
    return JSON.parse(localStorage.getItem(RETAIL_TRANSPORT_KEY) || "{}");
  } catch {
    return {};
  }
};

const saveRetailTransportMap = (map) => {
  localStorage.setItem(RETAIL_TRANSPORT_KEY, JSON.stringify(map));
};

const saveRetailTransportForInvoice = (invoiceId, details) => {
  const map = loadRetailTransportMap();

  if (details?.hasTransportDetails) {
    map[invoiceId] = {
      hasTransportDetails: true,
      loadingCharge: Number(details.loadingCharge || 0),
      transportCharge: Number(details.transportCharge || 0),
      freightCharge: Number(details.freightCharge || 0),
      transportNotes: details.transportNotes || "",
    };
  } else {
    delete map[invoiceId];
  }

  saveRetailTransportMap(map);
};

export const mergeRetailTransportDetails = (invoice) => {
  const map = loadRetailTransportMap();
  const details = map[invoice.id] || {};

  return {
    ...invoice,
    hasTransportDetails: details.hasTransportDetails ?? false,
    loadingCharge: Number(details.loadingCharge || 0),
    transportCharge: Number(details.transportCharge || 0),
    freightCharge: Number(details.freightCharge || 0),
    transportNotes: details.transportNotes || "",
  };
};


export const BillingModule = ({
  products,
  setProducts,
  customers,
  setCustomers,
  invoices,
  setInvoices,
  company,
}) => {
  const [tab, setTab] = useState("create");
  const [showInvoice, setShowInvoice] = useState(null);

  return (
    <div>
      <Tabs
        tabs={[
          { key: "create", label: "Create Invoice" },
          { key: "list", label: "Invoice List" },
        ]}
        active={tab}
        onChange={setTab}
      />
      <div className="mt-4">
        {tab === "create" ? (
          <InvoiceCreator
            products={products}
            setProducts={setProducts}
            customers={customers}
            setCustomers={setCustomers}
            invoices={invoices}
            allInvoices={invoices}
            setInvoices={setInvoices}
            company={company}
          />
        ) : (
          <InvoiceList
            invoices={invoices}
            customers={customers}
            onView={setShowInvoice}
            setInvoices={setInvoices}
          />
        )}
      </div>
      <Modal
        open={!!showInvoice}
        onClose={() => setShowInvoice(null)}
        title={`Invoice #${showInvoice?.invoiceNo}`}
        size="lg"
      >
        <InvoicePrintView
          invoice={showInvoice}
          company={company}
          customer={customers.find((c) => c.id === showInvoice?.customerId)}
        />
      </Modal>
    </div>
  );
};

export const InvoiceCreator = ({
  products,
  setProducts,
  customers,
  setCustomers,
  invoices,
  allInvoices = invoices,
  setInvoices,
  company,
  onInvoiceCreated,
  fixedInvoiceType = "tax",
  showInvoiceTypeField = false,
  allowRateEdit = true,
  allowTaxEdit = true,
}) => {
  const nextInvoiceNo =
    allInvoices.length > 0
      ? Math.max(...allInvoices.map((i) => parseInt(i.invoiceNo))) + 1
      : 4960;

  const [form, setForm] = useState({
  customerId: "",
  invoiceType: fixedInvoiceType,
  date: today(),
  deliveryNote: "",
  paymentTerms: "",
  items: [],
  hasTransportDetails: false,
  loadingCharge: "",
  transportCharge: "",
  freightCharge: "",
  transportNotes: "",
});

  const [itemForm, setItemForm] = useState({
    productId: "",
    qty: "",
    rate: "",
    taxRate: "",
  });

  const [showPreview, setShowPreview] = useState(false);
  const [showAddCustomer, setShowAddCustomer] = useState(false);
  const [showAddProduct, setShowAddProduct] = useState(false);

  const handleSaveCustomer = (entity) => {
    const newCustomer = { ...entity, id: generateId() };
    setCustomers((prev) => [...prev, newCustomer]);
    setForm((prev) => ({ ...prev, customerId: newCustomer.id }));
    setShowAddCustomer(false);
  };

  const handleSaveProduct = (entity) => {
    const newProduct = { ...entity, id: generateId() };
    setProducts((prev) => [...prev, newProduct]);
    setItemForm((prev) => ({
      ...prev,
      productId: newProduct.id,
      rate: String(newProduct.rate),
      taxRate: String(newProduct.taxRate),
    }));
    setShowAddProduct(false);
  };

  const selectedProduct = products.find((p) => p.id === itemForm.productId);
  const selectedCustomer = customers.find((c) => c.id === form.customerId);
  const isInterState =
    selectedCustomer && selectedCustomer.state !== company.stateCode;

  const handleProductChange = (productId) => {
    const product = products.find((p) => p.id === productId);
    setItemForm({
      productId,
      qty: "",
      rate: product ? String(product.rate) : "",
      taxRate: product ? String(product.taxRate) : "",
    });
  };

  const addItem = () => {
    if (
      !itemForm.productId ||
      !itemForm.qty ||
      parseFloat(itemForm.qty) <= 0 ||
      itemForm.rate === "" ||
      itemForm.taxRate === ""
    )
      return;

    const product = products.find((p) => p.id === itemForm.productId);
    if (!product) return;

    const qty = parseFloat(itemForm.qty);
    const rate = parseFloat(itemForm.rate);
    const taxRate = parseFloat(itemForm.taxRate);

    if (qty > product.stock) {
      alert(`Insufficient stock. Available: ${product.stock} ${product.unit}`);
      return;
    }

    const amount = qty * rate;

    setForm((prev) => ({
      ...prev,
      items: [
        ...prev.items,
        {
          productId: product.id,
          name: product.name,
          hsn: product.hsn,
          qty,
          rate,
          unit: product.unit,
          taxRate,
          amount,
        },
      ],
    }));

    setItemForm({ productId: "", qty: "", rate: "", taxRate: "" });
  };

  const removeItem = (idx) =>
    setForm((prev) => ({
      ...prev,
      items: prev.items.filter((_, i) => i !== idx),
    }));

  const subtotal = form.items.reduce((s, i) => s + i.amount, 0);
  const totalTax = form.items.reduce((s, i) => s + (i.amount * i.taxRate) / 100, 0);
  const cgst = !isInterState ? totalTax / 2 : 0;
  const sgst = !isInterState ? totalTax / 2 : 0;
  const igst = isInterState ? totalTax : 0;

  const loadingCharge = Number(form.loadingCharge || 0);
  const transportCharge = Number(form.transportCharge || 0);
  const freightCharge = Number(form.freightCharge || 0);

  const extraCharges = form.hasTransportDetails
    ? loadingCharge + transportCharge + freightCharge
    : 0;

const total = subtotal + totalTax + extraCharges;

  const saveInvoice = async () => {
  if (!form.customerId || form.items.length === 0) {
    alert("Select customer and add items");
    return;
  }

  try {
    const invData = {
      customerId: form.customerId,
      invoiceType: fixedInvoiceType,
      date: form.date,
      deliveryNote: form.deliveryNote,
      paymentTerms: form.paymentTerms,
      items: form.items,
      subtotal,
      cgst,
      sgst,
      igst,
      totalTax,
      total,
      status: "active",
      jsonConverted: false,
    };

    const createdInvoice = await invoicesService.create(invData);

    const transportDetails = {
      hasTransportDetails: form.hasTransportDetails,
      loadingCharge,
      transportCharge,
      freightCharge,
      transportNotes: form.transportNotes,
    };

    saveRetailTransportForInvoice(createdInvoice.id, transportDetails);

    const qtyByProduct = {};
    form.items.forEach((item) => {
      qtyByProduct[item.productId] = (qtyByProduct[item.productId] || 0) + item.qty;
    });

    const updatedProducts = products.map((p) => {
      if (!qtyByProduct[p.id]) return p;
      return {
        ...p,
        stock: p.stock - qtyByProduct[p.id],
        __skipSync: true,
      };
    });

    setProducts(updatedProducts);

    setInvoices((prev) => [
      ...prev,
      {
        ...createdInvoice,
        ...transportDetails,
        __skipSync: true,
      },
    ]);

    setForm({
      customerId: "",
      invoiceType: fixedInvoiceType,
      date: today(),
      deliveryNote: "",
      paymentTerms: "",
      items: [],
      hasTransportDetails: false,
      loadingCharge: "",
      transportCharge: "",
      freightCharge: "",
      transportNotes: "",
    });

    alert(
      `${fixedInvoiceType === "retail" ? "Retail Bill" : "Invoice"} #${createdInvoice.invoiceNo} created successfully!`
    );

    if (onInvoiceCreated) {
      setTimeout(() => onInvoiceCreated(), 100);
    }
  } catch (err) {
    alert(`Error creating invoice: ${err.message}`);
  }
};

  const previewInvoice = {
  invoiceNo: nextInvoiceNo,
  ...form,
  invoiceType: fixedInvoiceType,
  subtotal,
  cgst,
  sgst,
  igst,
  totalTax,
  total,
  loadingCharge,
  transportCharge,
  freightCharge,
  status: "preview",
  jsonConverted: false,
};

  return (
    <div className="space-y-4">
      <Card
        title={`New ${
          fixedInvoiceType === "retail" ? "Retail Bill" : "Tax Invoice"
        } #${nextInvoiceNo}`}
      >
        <div className="p-4 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 items-start">
            <div>
              <Select
                label="Customer *"
                options={customers.map((c) => ({
                  value: c.id,
                  label: `${c.name} (${c.gstin || "No GST"})`,
                }))}
                value={form.customerId}
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, customerId: e.target.value }))
                }
              />
              <Button
                onClick={() => setShowAddCustomer(true)}
                title="Add New Customer"
                size="sm"
                className="mt-2 w-full"
              >
                <Icons.plus size={14} /> Add Customer
              </Button>
            </div>

            {showInvoiceTypeField && (
              <Select
                label="Invoice Type"
                options={[
                  { value: "tax", label: "Tax Invoice" },
                  { value: "retail", label: "Retail Invoice" },
                ]}
                value={form.invoiceType}
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, invoiceType: e.target.value }))
                }
              />
            )}

            <Input
              label="Date"
              type="date"
              value={form.date}
              onChange={(e) => setForm((prev) => ({ ...prev, date: e.target.value }))}
            />
            <Input
              label="Payment Terms"
              value={form.paymentTerms}
              onChange={(e) =>
                setForm((prev) => ({ ...prev, paymentTerms: e.target.value }))
              }
              placeholder="e.g., Net 30"
            />
          </div>

          {selectedCustomer && (
            <div className="p-3 bg-gray-50 rounded-md text-xs">
              <span className="font-medium">{selectedCustomer.name}</span> —{" "}
              {selectedCustomer.address}
              {selectedCustomer.gstin ? ` — GSTIN: ${selectedCustomer.gstin}` : ""}
              {fixedInvoiceType === "tax" && (
                <>
                  {isInterState ? (
                    <Badge variant="info" className="ml-2">
                      Inter-State (IGST)
                    </Badge>
                  ) : (
                    <Badge variant="success" className="ml-2">
                      Intra-State (CGST+SGST)
                    </Badge>
                  )}
                </>
              )}
            </div>
          )}
        </div>

        {fixedInvoiceType === "retail" && (
  <div className="p-3 border rounded-md bg-gray-50">
    <div className="flex items-center justify-between">
      <div className="text-sm font-medium text-gray-800">
        Optional Transport Details
      </div>
      <Button
        size="sm"
        variant="ghost"
        onClick={() =>
          setForm((prev) => ({
            ...prev,
            hasTransportDetails: !prev.hasTransportDetails,
          }))
        }
      >
        <Icons.truck size={14} />{" "}
        {form.hasTransportDetails ? "Hide Transport Details" : "Add Transport Details"}
      </Button>
    </div>

    {form.hasTransportDetails && (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 mt-3">
        <Input
          label="Loading Charge"
          type="number"
          value={form.loadingCharge}
          onChange={(e) =>
            setForm((prev) => ({ ...prev, loadingCharge: e.target.value }))
          }
          placeholder="0"
        />

        <Input
          label="Transport Charge"
          type="number"
          value={form.transportCharge}
          onChange={(e) =>
            setForm((prev) => ({ ...prev, transportCharge: e.target.value }))
          }
          placeholder="0"
        />

        <Input
          label="Freight Charge"
          type="number"
          value={form.freightCharge}
          onChange={(e) =>
            setForm((prev) => ({ ...prev, freightCharge: e.target.value }))
          }
          placeholder="0"
        />

        <Input
          label="Transport Notes"
          value={form.transportNotes}
          onChange={(e) =>
            setForm((prev) => ({ ...prev, transportNotes: e.target.value }))
          }
          placeholder="Optional notes"
        />
      </div>
    )}
  </div>
)}
      </Card>

      <Card title="Add Items">
        <div className="p-4 space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-12 gap-3 items-start">
            <div className="sm:col-span-2 lg:col-span-4">
              <Select
                label="Product"
                options={products.map((p) => ({
                  value: p.id,
                  label: `${p.name} — ₹${p.rate}/${p.unit} (Stock: ${p.stock})`,
                }))}
                value={itemForm.productId}
                onChange={(e) => handleProductChange(e.target.value)}
              />
              <Button onClick={() => setShowAddProduct(true)} size="sm" className="mt-2 w-full">
                <Icons.plus size={14} /> Add Product
              </Button>
            </div>

            <div className="sm:col-span-1 lg:col-span-2">
              <Input
                label={`Quantity ${selectedProduct ? `(${selectedProduct.unit})` : ""}`}
                type="number"
                value={itemForm.qty}
                onChange={(e) =>
                  setItemForm((prev) => ({ ...prev, qty: e.target.value }))
                }
                placeholder="0"
              />
            </div>

            <div className="sm:col-span-1 lg:col-span-2">
              <Input
                label="Rate"
                type="number"
                value={itemForm.rate}
                onChange={(e) =>
                  setItemForm((prev) => ({ ...prev, rate: e.target.value }))
                }
                placeholder="0"
                disabled={!allowRateEdit}
              />
            </div>

            <div className="sm:col-span-1 lg:col-span-2">
              <Input
                label="Tax %"
                type="number"
                value={itemForm.taxRate}
                onChange={(e) =>
                  setItemForm((prev) => ({ ...prev, taxRate: e.target.value }))
                }
                placeholder="0"
                disabled={!allowTaxEdit}
              />
            </div>

            <div className="sm:col-span-1 lg:col-span-2">
              <Button
                onClick={addItem}
                disabled={
                  !itemForm.productId ||
                  !itemForm.qty ||
                  itemForm.rate === "" ||
                  itemForm.taxRate === ""
                }
                className="h-10 w-full mt-5"
              >
                <Icons.plus size={14} /> Add
              </Button>
            </div>
          </div>

          {selectedProduct && (
            <div className="mt-2 text-xs text-gray-500">
              HSN: {selectedProduct.hsn} | Default Rate: ₹{selectedProduct.rate}/
              {selectedProduct.unit} | Default Tax: {selectedProduct.taxRate}% |
              Available: {selectedProduct.stock} {selectedProduct.unit}
            </div>
          )}
        </div>

        {form.items.length > 0 && (
          <Table
            columns={[
              { key: "name", label: "Item" },
              { key: "hsn", label: "HSN" },
              {
                key: "qty",
                label: "Qty",
                align: "right",
                render: (r) => `${r.qty} ${r.unit}`,
              },
              {
                key: "rate",
                label: "Rate",
                align: "right",
                render: (r) => formatCurrency(r.rate),
              },
              {
                key: "taxRate",
                label: "Tax %",
                align: "right",
                render: (r) => `${r.taxRate}%`,
              },
              {
                key: "amount",
                label: "Amount",
                align: "right",
                render: (r) => formatCurrency(r.amount),
              },
              {
                key: "action",
                label: "",
                render: (_, i) => (
                  <button
                    onClick={() => removeItem(i)}
                    className="p-1 text-red-500 hover:text-red-700 hover:bg-red-50 rounded cursor-pointer"
                  >
                    <Icons.trash size={16} />
                  </button>
                ),
              },
            ]}
            data={form.items}
          />
        )}
      </Card>

      {form.items.length > 0 && (
        <Card>
          <div className="p-4">
            <div className="flex flex-col items-end space-y-1 text-sm">
              <div className="flex justify-between w-full max-w-xs">
                <span className="text-gray-500">Subtotal:</span>
                <span className="tabular-nums">{formatCurrency(subtotal)}</span>
              </div>

              {!isInterState ? (
                <>
                  <div className="flex justify-between w-full max-w-xs">
                    <span className="text-gray-500">
                      CGST ({form.items[0]?.taxRate / 2}%):
                    </span>
                    <span className="tabular-nums">{formatCurrency(cgst)}</span>
                  </div>
                  <div className="flex justify-between w-full max-w-xs">
                    <span className="text-gray-500">
                      SGST ({form.items[0]?.taxRate / 2}%):
                    </span>
                    <span className="tabular-nums">{formatCurrency(sgst)}</span>
                  </div>
                </>
              ) : (
                <div className="flex justify-between w-full max-w-xs">
                  <span className="text-gray-500">IGST ({form.items[0]?.taxRate}%):</span>
                  <span className="tabular-nums">{formatCurrency(igst)}</span>
                </div>
              )}

              <div className="flex justify-between w-full max-w-xs border-t pt-2 mt-2 font-bold text-base">
                <span>Total:</span>
                <span className="tabular-nums">{formatCurrency(total)}</span>
              </div>
            </div>

            <div className="flex justify-end gap-3 mt-4">
              <Button variant="secondary" onClick={() => setShowPreview(true)}>
                <Icons.printer size={14} /> Preview
              </Button>
              <Button onClick={saveInvoice}>
                <Icons.check size={14} /> Save{" "}
                {fixedInvoiceType === "retail" ? "Retail Bill" : "Invoice"}
              </Button>
            </div>
          </div>
        </Card>
      )}

      <Modal
        open={showPreview}
        onClose={() => setShowPreview(false)}
        title={`Preview #${nextInvoiceNo}`}
        size="lg"
      >
        {fixedInvoiceType === "retail" ? (
          <RetailCustomerBillView
            invoice={previewInvoice}
            company={company}
            customer={selectedCustomer}
          />
        ) : (
          <InvoicePrintView
            invoice={previewInvoice}
            company={company}
            customer={selectedCustomer}
          />
        )}
      </Modal>

      <Modal
        open={showAddCustomer}
        onClose={() => setShowAddCustomer(false)}
        title="Add New Customer"
      >
        <PartyForm
          isCustomer={true}
          onSave={handleSaveCustomer}
          onCancel={() => setShowAddCustomer(false)}
        />
      </Modal>

      <Modal
        open={showAddProduct}
        onClose={() => setShowAddProduct(false)}
        title="Add New Product"
      >
        <ProductForm
          onSave={handleSaveProduct}
          onCancel={() => setShowAddProduct(false)}
        />
      </Modal>
    </div>
  );
};

const InvoiceList = ({ invoices, customers, onView, setInvoices }) => {
  const [search, setSearch] = useState("");
  const filtered = invoices.filter((inv) => {
    const cust = customers.find((c) => c.id === inv.customerId);
    return (
      inv.invoiceNo.includes(search) ||
      cust?.name?.toLowerCase().includes(search.toLowerCase())
    );
  });

  const handleUploadSigned = (invoiceId) => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = ".json";
    input.onchange = (e) => {
      const file = e.target.files?.[0];
      if (!file) return;

      const reader = new FileReader();
      reader.onload = (evt) => {
        try {
          const data = JSON.parse(evt.target?.result || "");
          const response = Array.isArray(data) ? data[0] : data;

          if (!response.Irn) {
            alert("Invalid response: Missing IRN field");
            return;
          }

          setInvoices((prev) =>
            prev.map((inv) =>
              inv.id === invoiceId
                ? {
                    ...inv,
                    irn: response.Irn,
                    ackNo: response.AckNo,
                    ackDate: response.AckDt,
                    status: response.Status || "ACT",
                    signedInvoice: response.SignedInvoice,
                    signedQRCode: response.SignedQRCode,
                    ewbNo: response.EwbNo,
                    ewbDt: response.EwbDt,
                    jsonSigned: true,
                  }
                : inv
            )
          );

          alert(
            `Invoice #${invoices.find((i) => i.id === invoiceId)?.invoiceNo} updated with IRN`
          );
        } catch (err) {
          alert(`Invalid JSON: ${err.message}`);
        }
      };
      reader.readAsText(file);
    };
    input.click();
  };

  return (
    <Card
      title="Invoices"
      actions={<SearchBar value={search} onChange={setSearch} placeholder="Search invoice..." />}
    >
      <Table
        columns={[
          {
            key: "invoiceNo",
            label: "Invoice #",
            render: (r) => <span className="font-mono font-medium">{r.invoiceNo}</span>,
          },
          { key: "date", label: "Date", render: (r) => formatDate(r.date) },
          {
            key: "customer",
            label: "Customer",
            render: (r) => customers.find((c) => c.id === r.customerId)?.name || "—",
          },
          {
            key: "total",
            label: "Total",
            align: "right",
            render: (r) => <span className="font-semibold">{formatCurrency(r.total)}</span>,
          },
          {
            key: "irn",
            label: "IRN",
            render: (r) =>
              r.irn ? (
                <span
                  className="font-mono text-xs text-green-700 font-medium truncate"
                  title={r.irn}
                >
                  {r.irn.substring(0, 16)}...
                </span>
              ) : (
                <span className="text-gray-400 text-sm">—</span>
              ),
          },
          {
            key: "status",
            label: "Status",
            render: (r) =>
              r.irn ? (
                <Badge variant="success">✓ Signed</Badge>
              ) : (
                <Badge variant="warning">⧗ Pending</Badge>
              ),
          },
          {
            key: "actions",
            label: "",
            render: (r) => (
              <div className="flex items-center gap-1">
                {!r.irn && (
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => handleUploadSigned(r.id)}
                    title="Upload signed JSON from portal"
                  >
                    <Icons.download size={14} /> Sign
                  </Button>
                )}
                <Button size="sm" variant="ghost" onClick={() => onView(r)}>
                  <Icons.file size={14} /> View
                </Button>
              </div>
            ),
          },
        ]}
        data={filtered}
        emptyMsg="No invoices yet"
      />
    </Card>
  );
};

// ─── TAX INVOICE PRINT VIEW ─────────────────────────────────────────────────
export const InvoicePrintView = ({ invoice, company, customer }) => {
  if (!invoice) return null;
  const consignee = customer;
  const buyer = customer;
  const taxableValue = invoice.items.reduce((s, i) => s + i.amount, 0);
  const isInterState = customer?.state !== company.stateCode;

  return (
    <div className="bg-white p-6 text-xs" id="invoice-print">
      <div className="border border-gray-800">
        <div className="text-center py-2 border-b border-gray-800 font-bold text-sm">
          Tax Invoice
        </div>
        <div className="grid grid-cols-3 border-b border-gray-800">
          <div className="px-3 py-2 border-r border-gray-800 text-[10px]">
            <div>
              <strong>IRN</strong>
            </div>
            <div className="font-mono text-[9px] break-all">
              {invoice.irn ? invoice.irn : "Pending"}
            </div>
            <div className="mt-1 text-[9px]">
              <strong>Ack No.</strong> {invoice.ackNo || "—"}
            </div>
            <div className="text-[9px]">
              <strong>Ack Date</strong>{" "}
              {invoice.ackDate ? formatDate(invoice.ackDate) : "—"}
            </div>
          </div>
          <div className="px-3 py-2 border-r border-gray-800 text-[10px]">
            <div>
              <strong>Status</strong>
            </div>
            <div className="mt-1">
              {invoice.irn ? (
                <span className="text-green-700 font-bold">✓ SIGNED</span>
              ) : (
                <span className="text-yellow-700">⧗ Pending IRN</span>
              )}
            </div>
          </div>
          {invoice.signedQRCode && (
            <div className="px-3 py-2 flex items-center justify-center bg-gray-50">
              <QRCode value={invoice.signedQRCode} size={80} level="M" />
            </div>
          )}
        </div>

        <div className="grid grid-cols-2 border-b border-gray-800">
          <div className="p-3 border-r border-gray-800">
            <div className="font-bold">{company.name}</div>
            <div>{company.address}</div>
            <div>GSTIN/UIN: {company.gstin}</div>
            <div>
              State Name : {company.stateName}, Code : {company.stateCode}
            </div>
            <div>E-Mail : {company.email}</div>
          </div>
          <div className="grid grid-cols-2">
            <div className="p-2 border-r border-b border-gray-800">
              <span className="text-gray-500">Invoice No.</span>
              <br />
              <strong>{invoice.invoiceNo}</strong>
            </div>
            <div className="p-2 border-b border-gray-800">
              <span className="text-gray-500">Dated</span>
              <br />
              <strong>{formatDate(invoice.date)}</strong>
            </div>
            <div className="p-2 border-r border-b border-gray-800">
              <span className="text-gray-500">Delivery Note</span>
              <br />
              {invoice.deliveryNote || "—"}
            </div>
            <div className="p-2 border-b border-gray-800">
              <span className="text-gray-500">Mode/Terms of Payment</span>
              <br />
              {invoice.paymentTerms || "—"}
            </div>
            <div className="p-2 border-r border-b border-gray-800">
              <span className="text-gray-500">Reference No. & Date</span>
            </div>
            <div className="p-2 border-b border-gray-800">
              <span className="text-gray-500">Other References</span>
            </div>
            <div className="p-2 border-r border-gray-800">
              <span className="text-gray-500">Buyer's Order No.</span>
            </div>
            <div className="p-2">
              <span className="text-gray-500">Dated</span>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 border-b border-gray-800">
          <div className="p-3 border-r border-gray-800">
            <div className="text-gray-500 text-[10px]">Consignee (Ship to)</div>
            <div className="font-bold">{consignee?.name}</div>
            <div>{consignee?.address}</div>
            <div>GSTIN/UIN : {consignee?.gstin}</div>
            <div>
              State Name : {STATES.find((s) => s.code === consignee?.state)?.name},
              Code : {consignee?.state}
            </div>
          </div>
          <div className="grid grid-cols-2">
            <div className="p-2 border-r border-b border-gray-800">
              <span className="text-gray-500">Dispatch Doc No.</span>
            </div>
            <div className="p-2 border-b border-gray-800">
              <span className="text-gray-500">Delivery Note Date</span>
            </div>
            <div className="p-2 border-r border-gray-800">
              <span className="text-gray-500">Dispatched through</span>
            </div>
            <div className="p-2">
              <span className="text-gray-500">Destination</span>
            </div>
          </div>
        </div>

        <div className="p-3 border-b border-gray-800">
          <div className="text-gray-500 text-[10px]">Buyer (Bill to)</div>
          <div className="font-bold">{buyer?.name}</div>
          <div>{buyer?.address}</div>
          <div>GSTIN/UIN : {buyer?.gstin}</div>
          <div>
            State Name : {STATES.find((s) => s.code === buyer?.state)?.name}, Code :{" "}
            {buyer?.state}
          </div>
        </div>

        <table className="w-full border-collapse">
          <thead>
            <tr className="border-b border-gray-800 bg-gray-50">
              <th className="border-r border-gray-800 p-1.5 text-left w-8">SI No.</th>
              <th className="border-r border-gray-800 p-1.5 text-left">
                Description of Goods
              </th>
              <th className="border-r border-gray-800 p-1.5 text-center">HSN/SAC</th>
              <th className="border-r border-gray-800 p-1.5 text-right">Quantity</th>
              <th className="border-r border-gray-800 p-1.5 text-right">
                Rate (Incl. Tax)
              </th>
              <th className="border-r border-gray-800 p-1.5 text-right">Rate</th>
              <th className="border-r border-gray-800 p-1.5 text-center">per</th>
              <th className="p-1.5 text-right">Amount</th>
            </tr>
          </thead>
          <tbody>
            {invoice.items.map((item, idx) => (
              <tr key={idx} className="border-b border-gray-800">
                <td className="border-r border-gray-800 p-1.5">{idx + 1}</td>
                <td className="border-r border-gray-800 p-1.5 font-bold">{item.name}</td>
                <td className="border-r border-gray-800 p-1.5 text-center">{item.hsn}</td>
                <td className="border-r border-gray-800 p-1.5 text-right">
                  {item.qty.toFixed(2)} {item.unit}
                </td>
                <td className="border-r border-gray-800 p-1.5 text-right">
                  {(item.rate * (1 + item.taxRate / 100)).toFixed(2)}
                </td>
                <td className="border-r border-gray-800 p-1.5 text-right">
                  {item.rate.toFixed(2)}
                </td>
                <td className="border-r border-gray-800 p-1.5 text-center">
                  {item.unit}
                </td>
                <td className="p-1.5 text-right font-bold">
                  {formatCurrency(item.amount)}
                </td>
              </tr>
            ))}

            {!isInterState ? (
              <>
                <tr className="border-b border-gray-800">
                  <td className="border-r border-gray-800 p-1.5" />
                  <td className="border-r border-gray-800 p-1.5 text-right font-bold" colSpan={5}>
                    CGST
                  </td>
                  <td className="border-r border-gray-800 p-1.5 text-right">
                    {invoice.items[0]?.taxRate / 2} %
                  </td>
                  <td className="p-1.5 text-right font-bold">
                    {formatCurrency(invoice.cgst)}
                  </td>
                </tr>
                <tr className="border-b border-gray-800">
                  <td className="border-r border-gray-800 p-1.5" />
                  <td className="border-r border-gray-800 p-1.5 text-right font-bold" colSpan={5}>
                    SGST
                  </td>
                  <td className="border-r border-gray-800 p-1.5 text-right">
                    {invoice.items[0]?.taxRate / 2} %
                  </td>
                  <td className="p-1.5 text-right font-bold">
                    {formatCurrency(invoice.sgst)}
                  </td>
                </tr>
              </>
            ) : (
              <tr className="border-b border-gray-800">
                <td className="border-r border-gray-800 p-1.5" />
                <td className="border-r border-gray-800 p-1.5 text-right font-bold" colSpan={5}>
                  IGST
                </td>
                <td className="border-r border-gray-800 p-1.5 text-right">
                  {invoice.items[0]?.taxRate} %
                </td>
                <td className="p-1.5 text-right font-bold">
                  {formatCurrency(invoice.igst)}
                </td>
              </tr>
            )}
          </tbody>
          <tfoot>
            <tr className="border-t-2 border-gray-800">
              <td className="border-r border-gray-800 p-2" />
              <td className="border-r border-gray-800 p-2 text-right font-bold" colSpan={2}>
                Total
              </td>
              <td className="border-r border-gray-800 p-2 text-right font-bold">
                {invoice.items.reduce((s, i) => s + i.qty, 0).toFixed(2)}{" "}
                {invoice.items[0]?.unit}
              </td>
              <td className="border-r border-gray-800 p-2" colSpan={3} />
              <td className="p-2 text-right font-bold text-base">
                ₹ {invoice.total.toFixed(2)}
              </td>
            </tr>
          </tfoot>
        </table>

        <div className="px-3 py-2 border-t border-gray-800 text-[10px]">
          <span className="text-gray-500">Amount Chargeable (in words)</span>
          <br />
          <strong>INR {numberToWords(invoice.total)} Only</strong>
        </div>

        <div className="border-t border-gray-800">
          <table className="w-full text-[10px] border-collapse">
            <thead>
              <tr className="border-b border-gray-800 bg-gray-50">
                <th className="border-r border-gray-800 p-1.5">HSN/SAC</th>
                <th className="border-r border-gray-800 p-1.5 text-right">
                  Taxable Value
                </th>
                {!isInterState ? (
                  <>
                    <th className="border-r border-gray-800 p-1.5 text-center" colSpan={2}>
                      Central Tax
                    </th>
                    <th className="border-r border-gray-800 p-1.5 text-center" colSpan={2}>
                      State Tax
                    </th>
                  </>
                ) : (
                  <th className="border-r border-gray-800 p-1.5 text-center" colSpan={2}>
                    Integrated Tax
                  </th>
                )}
                <th className="p-1.5 text-right">Total Tax Amount</th>
              </tr>
            </thead>
            <tbody>
              <tr className="border-b border-gray-800">
                <td className="border-r border-gray-800 p-1.5">{invoice.items[0]?.hsn}</td>
                <td className="border-r border-gray-800 p-1.5 text-right">
                  {formatCurrency(taxableValue)}
                </td>
                {!isInterState ? (
                  <>
                    <td className="border-r border-gray-800 p-1.5 text-right">
                      {invoice.items[0]?.taxRate / 2}%
                    </td>
                    <td className="border-r border-gray-800 p-1.5 text-right">
                      {formatCurrency(invoice.cgst)}
                    </td>
                    <td className="border-r border-gray-800 p-1.5 text-right">
                      {invoice.items[0]?.taxRate / 2}%
                    </td>
                    <td className="border-r border-gray-800 p-1.5 text-right">
                      {formatCurrency(invoice.sgst)}
                    </td>
                  </>
                ) : (
                  <>
                    <td className="border-r border-gray-800 p-1.5 text-right">
                      {invoice.items[0]?.taxRate}%
                    </td>
                    <td className="border-r border-gray-800 p-1.5 text-right">
                      {formatCurrency(invoice.igst)}
                    </td>
                  </>
                )}
                <td className="p-1.5 text-right font-bold">
                  {formatCurrency(invoice.totalTax)}
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <div className="grid grid-cols-2 border-t border-gray-800">
          <div className="p-3 border-r border-gray-800 text-[10px]">
            <div className="font-bold mb-1">Declaration</div>
            <div>
              We declare that this invoice shows the actual price of the goods
              described and that all particulars are true and correct.
            </div>
          </div>
          <div className="p-3 text-right text-[10px]">
            <div className="font-bold">for {company.name}</div>
            <div className="mt-8">Authorised Signatory</div>
          </div>
        </div>

        <div className="text-center py-1 border-t border-gray-800 text-[10px] text-gray-500">
          This is a Computer Generated Invoice
        </div>
      </div>
    </div>
  );
};

// ─── RETAIL CUSTOMER BILL ───────────────────────────────────────────────────
export const RetailCustomerBillView = ({ invoice, company, customer }) => {
  if (!invoice) return null;

  const loadingCharge = Number(invoice.loadingCharge || 0);
  const transportCharge = Number(invoice.transportCharge || 0);
  const freightCharge = Number(invoice.freightCharge || 0);

  return (
    <div className="bg-white p-6 text-sm" id="invoice-print">
      <div className="max-w-2xl mx-auto border border-gray-300 rounded-lg overflow-hidden">
        <div className="p-4 border-b text-center">
          <div className="text-lg font-bold">{company.name}</div>
          <div className="text-xs text-gray-600">{company.address}</div>
          <div className="text-xs text-gray-600">Phone: {company.phone}</div>
        </div>

        <div className="p-4 grid grid-cols-2 gap-4 text-xs border-b">
          <div>
            <div><strong>Invoice No:</strong> {invoice.invoiceNo}</div>
            <div><strong>Date:</strong> {formatDate(invoice.date)}</div>
          </div>
          <div>
            <div><strong>Customer:</strong> {customer?.name || "—"}</div>
            <div><strong>Phone:</strong> {customer?.mobile || "—"}</div>
          </div>
        </div>

        <table className="w-full text-xs">
          <thead className="bg-gray-50 border-b">
            <tr>
              <th className="px-3 py-2 text-left">Product</th>
              <th className="px-3 py-2 text-right">Qty</th>
              <th className="px-3 py-2 text-right">Rate</th>
              <th className="px-3 py-2 text-right">Tax %</th>
              <th className="px-3 py-2 text-right">Amount</th>
            </tr>
          </thead>
          <tbody>
            {invoice.items.map((item, idx) => (
              <tr key={idx} className="border-b">
                <td className="px-3 py-2">{item.name}</td>
                <td className="px-3 py-2 text-right">{item.qty}</td>
                <td className="px-3 py-2 text-right">{formatCurrency(item.rate)}</td>
                <td className="px-3 py-2 text-right">{item.taxRate}%</td>
                <td className="px-3 py-2 text-right">{formatCurrency(item.amount)}</td>
              </tr>
            ))}
          </tbody>
        </table>

        {(loadingCharge > 0 || transportCharge > 0 || freightCharge > 0) && (
          <div className="p-4 border-t text-xs space-y-1">
            {loadingCharge > 0 && (
              <div className="flex justify-between">
                <span>Loading Charge</span>
                <span>{formatCurrency(loadingCharge)}</span>
              </div>
            )}
            {transportCharge > 0 && (
              <div className="flex justify-between">
                <span>Transport Charge</span>
                <span>{formatCurrency(transportCharge)}</span>
              </div>
            )}
            {freightCharge > 0 && (
              <div className="flex justify-between">
                <span>Freight Charge</span>
                <span>{formatCurrency(freightCharge)}</span>
              </div>
            )}
            {invoice.transportNotes && (
              <div className="pt-2 text-gray-600">
                <strong>Notes:</strong> {invoice.transportNotes}
              </div>
            )}
          </div>
        )}

        <div className="p-4 border-t text-right text-sm">
          <div>
            <strong>Total:</strong> {formatCurrency(invoice.total)}
          </div>
        </div>
      </div>
    </div>
  );
};

// ─── RETAIL COMPANY BILL ────────────────────────────────────────────────────
export const RetailCompanyBillView = ({ invoice, company, customer }) => {
  if (!invoice) return null;

  return (
    <div className="bg-white p-6 text-sm" id="retail-company-bill">
      <div className="max-w-2xl mx-auto border border-gray-300 rounded-lg overflow-hidden">
        <div className="p-4 border-b text-center">
          <div className="text-lg font-bold">{company.name}</div>
          <div className="text-xs text-gray-600">{company.address}</div>
        </div>

        <div className="p-4 grid grid-cols-2 gap-4 text-xs border-b">
          <div>
            <div>
              <strong>Invoice No:</strong> {invoice.invoiceNo}
            </div>
            <div>
              <strong>Date:</strong> {formatDate(invoice.date)}
            </div>
          </div>
          <div>
            <div>
              <strong>Customer:</strong> {customer?.name || "—"}
            </div>
            <div>
              <strong>Phone:</strong> {customer?.mobile || "—"}
            </div>
          </div>
        </div>

        <table className="w-full text-xs">
          <thead className="bg-gray-50 border-b">
            <tr>
              <th className="px-3 py-2 text-left">Product Name</th>
              <th className="px-3 py-2 text-right">Quantity</th>
            </tr>
          </thead>
          <tbody>
            {invoice.items.map((item, idx) => (
              <tr key={idx} className="border-b">
                <td className="px-3 py-2">{item.name}</td>
                <td className="px-3 py-2 text-right">
                  {item.qty} {item.unit}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};