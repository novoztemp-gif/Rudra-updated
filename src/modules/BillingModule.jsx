// ═══════════════════════════════════════════════════════════════════════════════
// BILLING SYSTEM + SHARED INVOICE CREATOR / PRINT VIEWS
// ═══════════════════════════════════════════════════════════════════════════════

import { useEffect, useMemo, useRef, useState } from "react";
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

export const BillingModule = ({
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
            showToast={showToast}
            fixedInvoiceType="retail"
          />
        ) : (
          <InvoiceList
            invoices={invoices}
            customers={customers}
            onView={setShowInvoice}
            setInvoices={setInvoices}
            showToast={showToast}
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

const ProductSearchDropdown = ({
  products,
  productSearch,
  setProductSearch,
  selectedProductId,
  onSelectProduct,
}) => {
  const [open, setOpen] = useState(false);
  const wrapRef = useRef(null);

  const filteredProducts = useMemo(() => {
    const q = productSearch.trim().toLowerCase();

    if (!q) return products.slice(0, 10);

    return products.filter((p) => {
      const name = p.name?.toLowerCase() || "";
      const hsn = p.hsn?.toLowerCase() || "";
      const category = p.category?.toLowerCase() || "";
      return name.includes(q) || hsn.includes(q) || category.includes(q);
    });
  }, [products, productSearch]);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target)) {
        setOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const selectedProduct = products.find((p) => p.id === selectedProductId);

  return (
    <div className="relative" ref={wrapRef}>
      <Input
        label="Product"
        value={productSearch}
        onChange={(e) => {
          setProductSearch(e.target.value);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        placeholder="Search by name, HSN, category..."
      />

      {selectedProduct && (
        <div className="mt-1 text-xs text-gray-500">
          Selected: {selectedProduct.name}
        </div>
      )}

      {open && (
        <div className="absolute left-0 right-0 top-full z-20 mt-1 w-full bg-white border border-gray-300 rounded-md shadow-lg max-h-36 overflow-y-auto">
          {filteredProducts.length === 0 ? (
            <div className="px-3 py-3 text-sm text-gray-500">
              No matching products
            </div>
          ) : (
            filteredProducts.slice(0, 10).map((p) => {
              const active = selectedProductId === p.id;

              return (
                <button
                  type="button"
                  key={p.id}
                  onClick={() => {
                    onSelectProduct(p.id);
                    setProductSearch(p.name || "");
                    setOpen(false);
                  }}
                  className={`w-full text-left px-3 py-2 border-b last:border-b-0 hover:bg-gray-50 ${active ? "bg-gray-100" : ""
                    }`}
                >
                  <div className="text-sm font-medium text-gray-900">
                    {p.name}
                  </div>
                  <div className="text-xs text-gray-500">
                    HSN: {p.hsn} | ₹{p.rate}/{p.unit} | Stock: {p.stock}
                  </div>
                </button>
              );
            })
          )}
        </div>
      )}
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
  fixedInvoiceType = "retail",
  showInvoiceTypeField = false,
  allowRateEdit = true,
  showToast,
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
    overallTaxPercent: fixedInvoiceType === "retail" ? "18" : "",
  });

  const [itemForm, setItemForm] = useState({
    productId: "",
    qty: "",
    rate: "",
  });

  const [productSearch, setProductSearch] = useState("");
  const [editOverallTax, setEditOverallTax] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [showAddCustomer, setShowAddCustomer] = useState(false);
  const [showAddProduct, setShowAddProduct] = useState(false);

  const taxInputRef = useRef(null);

  useEffect(() => {
    if (editOverallTax && taxInputRef.current) {
      taxInputRef.current.focus();
      taxInputRef.current.select();
    }
  }, [editOverallTax]);

  const handleSaveCustomer = (entity) => {
    const newCustomer = { ...entity, id: generateId() };
    setCustomers((prev) => [...prev, newCustomer]);
    setForm((prev) => ({ ...prev, customerId: newCustomer.id }));
    setShowAddCustomer(false);
    showToast?.("Customer added successfully", "success");
  };

  const handleSaveProduct = (entity) => {
    const newProduct = { ...entity, id: generateId() };
    setProducts((prev) => [...prev, newProduct]);
    setItemForm((prev) => ({
      ...prev,
      productId: newProduct.id,
      rate: String(newProduct.rate),
    }));
    setProductSearch(newProduct.name || "");
    setShowAddProduct(false);
    showToast?.("Product added successfully", "success");
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
    });
  };

  const handleQtyChange = (value) => {
    if (value === "") {
      setItemForm((prev) => ({ ...prev, qty: "" }));
      return;
    }

    const num = Math.max(0, Number(value));
    setItemForm((prev) => ({ ...prev, qty: String(num) }));
  };

  const handleRateChange = (value) => {
    if (value === "") {
      setItemForm((prev) => ({ ...prev, rate: "" }));
      return;
    }

    const num = Math.max(0, Number(value));
    setItemForm((prev) => ({ ...prev, rate: String(num) }));
  };

  const saveTaxEdit = () => {
    const safeTax = Math.max(0, Number(form.overallTaxPercent || 0));
    setForm((prev) => ({
      ...prev,
      overallTaxPercent: String(safeTax),
    }));
    setEditOverallTax(false);
  };

  const addItem = () => {
    if (
      !itemForm.productId ||
      !itemForm.qty ||
      parseFloat(itemForm.qty) <= 0 ||
      itemForm.rate === ""
    ) {
      showToast?.("Select product and enter valid quantity and rate", "warning");
      return;
    }

    const product = products.find((p) => p.id === itemForm.productId);
    if (!product) return;

    const qty = Math.max(0, parseFloat(itemForm.qty));
    const rate = Math.max(0, parseFloat(itemForm.rate));

    if (qty > product.stock) {
      showToast?.(
        `Insufficient stock. Available: ${product.stock} ${product.unit}`,
        "error"
      );
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
          size: product.size || "",
          thickness: product.thickness || "",
          qty,
          rate,
          unit: product.unit,
          taxRate: 0,
          amount,
        },
      ],
    }));

    setItemForm({
      productId: "",
      qty: "",
      rate: "",
    });
    setProductSearch("");
  };

  const removeItem = (idx) =>
    setForm((prev) => ({
      ...prev,
      items: prev.items.filter((_, i) => i !== idx),
    }));

  const subtotal = form.items.reduce((s, i) => s + i.amount, 0);
  const overallTaxPercent = Number(form.overallTaxPercent || 0);
  const totalTax = (subtotal * overallTaxPercent) / 100;
  const cgst = !isInterState ? totalTax / 2 : 0;
  const sgst = !isInterState ? totalTax / 2 : 0;
  const igst = isInterState ? totalTax : 0;

  const loadingCharge = Math.max(0, Number(form.loadingCharge || 0));
  const transportCharge = Math.max(0, Number(form.transportCharge || 0));
  const freightCharge = Math.max(0, Number(form.freightCharge || 0));

  const extraCharges = form.hasTransportDetails
    ? loadingCharge + transportCharge + freightCharge
    : 0;

  const total = subtotal + totalTax + extraCharges;

  const saveInvoice = async () => {
    if (!form.customerId || form.items.length === 0) {
      showToast?.("Select customer and add items", "warning");
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
        hasTransportDetails: form.hasTransportDetails,
        loadingCharge,
        transportCharge,
        freightCharge,
        transportNotes: form.transportNotes,
        overallTaxPercent,
        status: "active",
        jsonConverted: false,
      };

      const createdInvoice = await invoicesService.create(invData);

      const qtyByProduct = {};
      form.items.forEach((item) => {
        qtyByProduct[item.productId] =
          (qtyByProduct[item.productId] || 0) + item.qty;
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

      const newInvoiceForState = {
        ...createdInvoice,
        __skipSync: true,
      };

      setInvoices((prev) => [newInvoiceForState, ...prev]);

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
        overallTaxPercent: fixedInvoiceType === "retail" ? "18" : "",
      });

      setItemForm({
        productId: "",
        qty: "",
        rate: "",
      });

      setProductSearch("");
      setEditOverallTax(false);

      showToast?.(
        `${fixedInvoiceType === "retail" ? "Retail Bill" : "Invoice"
        } #${createdInvoice.invoiceNo} created successfully`,
        "success"
      );

      if (onInvoiceCreated) {
        onInvoiceCreated();
      }
    } catch (err) {
      showToast?.(`Error creating invoice: ${err.message}`, "error");
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
    overallTaxPercent,
    status: "preview",
    jsonConverted: false,
  };

  return (
    <div className="space-y-4">
      <Card
        title={`New ${fixedInvoiceType === "retail" ? "Retail Bill" : "Tax Invoice"
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
              onChange={(e) =>
                setForm((prev) => ({ ...prev, date: e.target.value }))
              }
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
              {selectedCustomer.gstin
                ? ` — GSTIN: ${selectedCustomer.gstin}`
                : ""}
            </div>
          )}
        </div>

        {fixedInvoiceType === "retail" && (
          <div className="p-3 border rounded-md bg-gray-50">
            <div className="flex items-center gap-3 flex-wrap">
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
                {form.hasTransportDetails
                  ? "Hide Transport Details"
                  : "Add Transport Details"}
              </Button>
            </div>

            {form.hasTransportDetails && (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 mt-3">
                <Input
                  label="Loading Charge"
                  type="number"
                  min="0"
                  value={form.loadingCharge}
                  onChange={(e) =>
                    setForm((prev) => ({
                      ...prev,
                      loadingCharge:
                        e.target.value === ""
                          ? ""
                          : String(Math.max(0, Number(e.target.value))),
                    }))
                  }
                  placeholder="0"
                />

                <Input
                  label="Transport Charge"
                  type="number"
                  min="0"
                  value={form.transportCharge}
                  onChange={(e) =>
                    setForm((prev) => ({
                      ...prev,
                      transportCharge:
                        e.target.value === ""
                          ? ""
                          : String(Math.max(0, Number(e.target.value))),
                    }))
                  }
                  placeholder="0"
                />

                <Input
                  label="Freight Charge"
                  type="number"
                  min="0"
                  value={form.freightCharge}
                  onChange={(e) =>
                    setForm((prev) => ({
                      ...prev,
                      freightCharge:
                        e.target.value === ""
                          ? ""
                          : String(Math.max(0, Number(e.target.value))),
                    }))
                  }
                  placeholder="0"
                />

                <Input
                  label="Transport Notes"
                  value={form.transportNotes}
                  onChange={(e) =>
                    setForm((prev) => ({
                      ...prev,
                      transportNotes: e.target.value,
                    }))
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
            <div className="sm:col-span-2 lg:col-span-5">
              <ProductSearchDropdown
                products={products}
                productSearch={productSearch}
                setProductSearch={setProductSearch}
                selectedProductId={itemForm.productId}
                onSelectProduct={handleProductChange}
              />
              <Button
                onClick={() => setShowAddProduct(true)}
                size="sm"
                className="mt-2 w-full"
              >
                <Icons.plus size={14} /> Add Product
              </Button>
            </div>

            <div className="sm:col-span-1 lg:col-span-2">
              <Input
                label={`Quantity ${selectedProduct ? `(${selectedProduct.unit})` : ""
                  }`}
                type="number"
                min="0"
                value={itemForm.qty}
                onChange={(e) => handleQtyChange(e.target.value)}
                placeholder="0"
              />
            </div>

            <div className="sm:col-span-1 lg:col-span-2">
              <Input
                label="Rate"
                type="number"
                min="0"
                value={itemForm.rate}
                onChange={(e) => handleRateChange(e.target.value)}
                placeholder="0"
                disabled={!allowRateEdit}
              />
            </div>

            <div className="sm:col-span-1 lg:col-span-3">
              <Button
                onClick={addItem}
                disabled={
                  !itemForm.productId || !itemForm.qty || itemForm.rate === ""
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
              {selectedProduct.unit} | Available: {selectedProduct.stock}{" "}
              {selectedProduct.unit}
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

              {!editOverallTax ? (
                !isInterState ? (
                  <>
                    <div className="flex justify-between w-full max-w-xs">
                      <span className="text-gray-500">
                        CGST ({overallTaxPercent / 2}%):
                      </span>
                      <span className="tabular-nums">
                        {formatCurrency(cgst)}
                      </span>
                    </div>
                    <div className="flex justify-between w-full max-w-xs items-center">
                      <span className="text-gray-500">
                        SGST ({overallTaxPercent / 2}%):
                      </span>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => setEditOverallTax(true)}
                          className="text-xs text-blue-600 hover:text-blue-800"
                        >
                          Edit
                        </button>
                        <span className="tabular-nums">
                          {formatCurrency(sgst)}
                        </span>
                      </div>
                    </div>
                  </>
                ) : (
                  <div className="flex justify-between w-full max-w-xs items-center">
                    <span className="text-gray-500">
                      IGST ({overallTaxPercent}%):
                    </span>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setEditOverallTax(true)}
                        className="text-xs text-blue-600 hover:text-blue-800"
                      >
                        Edit
                      </button>
                      <span className="tabular-nums">
                        {formatCurrency(igst)}
                      </span>
                    </div>
                  </div>
                )
              ) : (
                <div className="flex justify-between w-full max-w-xs items-center">
                  <span className="text-gray-500">Tax %:</span>
                  <div className="flex items-center gap-2">
                    <input
                      ref={taxInputRef}
                      type="number"
                      min="0"
                      value={form.overallTaxPercent}
                      onChange={(e) =>
                        setForm((prev) => ({
                          ...prev,
                          overallTaxPercent:
                            e.target.value === ""
                              ? ""
                              : String(Math.max(0, Number(e.target.value))),
                        }))
                      }
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault();
                          saveTaxEdit();
                        }
                      }}
                      className="w-20 px-2 py-1 text-sm border border-gray-300 rounded-md"
                    />
                    <button
                      type="button"
                      onClick={saveTaxEdit}
                      className="text-xs text-blue-600 hover:text-blue-800"
                    >
                      Save
                    </button>
                  </div>
                </div>
              )}

              {form.hasTransportDetails && loadingCharge > 0 && (
                <div className="flex justify-between w-full max-w-xs">
                  <span className="text-gray-500">Loading Charge:</span>
                  <span className="tabular-nums">
                    {formatCurrency(loadingCharge)}
                  </span>
                </div>
              )}

              {form.hasTransportDetails && transportCharge > 0 && (
                <div className="flex justify-between w-full max-w-xs">
                  <span className="text-gray-500">Transport Charge:</span>
                  <span className="tabular-nums">
                    {formatCurrency(transportCharge)}
                  </span>
                </div>
              )}

              {form.hasTransportDetails && freightCharge > 0 && (
                <div className="flex justify-between w-full max-w-xs">
                  <span className="text-gray-500">Freight Charge:</span>
                  <span className="tabular-nums">
                    {formatCurrency(freightCharge)}
                  </span>
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

const InvoiceList = ({ invoices, customers, onView, setInvoices, showToast }) => {
  const [search, setSearch] = useState("");
  const [editTransportInvoice, setEditTransportInvoice] = useState(null);

  const filtered = invoices.filter((inv) => {
    const cust = customers.find((c) => c.id === inv.customerId);
    return (
      String(inv.invoiceNo || "").includes(search) ||
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
            showToast?.("Invalid response: Missing IRN field", "error");
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

          showToast?.(
            `Invoice #${invoices.find((i) => i.id === invoiceId)?.invoiceNo
            } updated with IRN`,
            "success"
          );
        } catch (err) {
          showToast?.(`Invalid JSON: ${err.message}`, "error");
        }
      };

      reader.readAsText(file);
    };

    input.click();
  };

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

      setInvoices((prev) =>
        prev.map((inv) =>
          inv.id === editTransportInvoice.id
            ? { ...inv, ...updatedFields }
            : inv
        )
      );

      showToast?.("Transport details updated successfully", "success");
      setEditTransportInvoice(null);
    } catch (err) {
      showToast?.(`Error updating transport: ${err.message}`, "error");
    }
  };

  return (
    <>
      <Card
        title="Invoices"
        actions={
          <SearchBar
            value={search}
            onChange={setSearch}
            placeholder="Search invoice..."
          />
        }
      >
        <Table
          columns={[
            {
              key: "invoiceNo",
              label: "Invoice #",
              render: (r) => (
                <span className="font-mono font-medium">{r.invoiceNo}</span>
              ),
            },
            { key: "date", label: "Date", render: (r) => formatDate(r.date) },
            {
              key: "customer",
              label: "Customer",
              render: (r) =>
                customers.find((c) => c.id === r.customerId)?.name || "—",
            },
            {
              key: "total",
              label: "Total",
              align: "right",
              render: (r) => (
                <span className="font-semibold">{formatCurrency(r.total)}</span>
              ),
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
                <div className="flex items-center gap-1 flex-wrap">
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

                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => setEditTransportInvoice(r)}
                    title="Edit transport details"
                  >
                    <Icons.truck size={14} /> Edit Transport
                  </Button>
                </div>
              ),
            },
          ]}
          data={filtered}
          emptyMsg="No invoices yet"
        />
      </Card>

      <Modal
        open={!!editTransportInvoice}
        onClose={() => setEditTransportInvoice(null)}
        title={`Edit Transport - Invoice #${editTransportInvoice?.invoiceNo}`}
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
                <Input
                  label="Loading Charge"
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
                  placeholder="0"
                />

                <Input
                  label="Transport Charge"
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
                  placeholder="0"
                />

                <Input
                  label="Freight Charge"
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
                  placeholder="0"
                />

                <Input
                  label="Transport Notes"
                  value={editTransportInvoice.transportNotes || ""}
                  onChange={(e) =>
                    setEditTransportInvoice((prev) => ({
                      ...prev,
                      transportNotes: e.target.value,
                    }))
                  }
                  placeholder="Optional notes"
                />
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
    </>
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
              State Name :{" "}
              {STATES.find((s) => s.code === consignee?.state)?.name}, Code :{" "}
              {consignee?.state}
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
            State Name : {STATES.find((s) => s.code === buyer?.state)?.name},
            Code : {buyer?.state}
          </div>
        </div>

        <table className="w-full border-collapse">
          <thead>
            <tr className="border-b border-gray-800 bg-gray-50">
              <th className="border-r border-gray-800 p-1.5 text-left w-8">
                SI No.
              </th>
              <th className="border-r border-gray-800 p-1.5 text-left">
                Description of Goods
              </th>
              <th className="border-r border-gray-800 p-1.5 text-center">
                HSN/SAC
              </th>
              <th className="border-r border-gray-800 p-1.5 text-right">
                Quantity
              </th>
              <th className="border-r border-gray-800 p-1.5 text-right">
                Rate (Incl. Tax)
              </th>
              <th className="border-r border-gray-800 p-1.5 text-right">
                Rate
              </th>
              <th className="border-r border-gray-800 p-1.5 text-center">
                per
              </th>
              <th className="p-1.5 text-right">Amount</th>
            </tr>
          </thead>

          <tbody>
            {invoice.items.map((item, idx) => (
              <tr key={idx} className="border-b border-gray-800">
                <td className="border-r border-gray-800 p-1.5">{idx + 1}</td>
                <td className="border-r border-gray-800 p-1.5 font-bold">
                  {item.name}
                </td>
                <td className="border-r border-gray-800 p-1.5 text-center">
                  {item.hsn}
                </td>
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
                  <td
                    className="border-r border-gray-800 p-1.5 text-right font-bold"
                    colSpan={5}
                  >
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
                  <td
                    className="border-r border-gray-800 p-1.5 text-right font-bold"
                    colSpan={5}
                  >
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
                <td
                  className="border-r border-gray-800 p-1.5 text-right font-bold"
                  colSpan={5}
                >
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
              <td
                className="border-r border-gray-800 p-2 text-right font-bold"
                colSpan={2}
              >
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
                    <th
                      className="border-r border-gray-800 p-1.5 text-center"
                      colSpan={2}
                    >
                      Central Tax
                    </th>
                    <th
                      className="border-r border-gray-800 p-1.5 text-center"
                      colSpan={2}
                    >
                      State Tax
                    </th>
                  </>
                ) : (
                  <th
                    className="border-r border-gray-800 p-1.5 text-center"
                    colSpan={2}
                  >
                    Integrated Tax
                  </th>
                )}
                <th className="p-1.5 text-right">Total Tax Amount</th>
              </tr>
            </thead>

            <tbody>
              <tr className="border-b border-gray-800">
                <td className="border-r border-gray-800 p-1.5">
                  {invoice.items[0]?.hsn}
                </td>
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

  const isInterState = customer?.state !== company.stateCode;
  const overallTaxPercent = Number(invoice.overallTaxPercent || 0);
  const totalTax = Number(invoice.totalTax || 0);
  const cgst = !isInterState ? totalTax / 2 : 0;
  const sgst = !isInterState ? totalTax / 2 : 0;
  const igst = isInterState ? totalTax : 0;
  const loadingCharge = Number(invoice.loadingCharge || 0);
  const transportCharge = Number(invoice.transportCharge || 0);
  const freightCharge = Number(invoice.freightCharge || 0);

  return (
    <div className="bg-white p-6 text-sm" id="invoice-print">
      <div className="max-w-2xl mx-auto border border-gray-300 rounded-lg overflow-hidden">
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
              <th className="px-3 py-2 text-left">Product</th>
              <th className="px-3 py-2 text-right">Qty</th>
              <th className="px-3 py-2 text-right">Rate</th>
              <th className="px-3 py-2 text-right">Amount</th>
            </tr>
          </thead>

          <tbody>
            {invoice.items.map((item, idx) => (
              <tr key={idx} className="border-b">
                <td className="px-3 py-2">{item.name}</td>
                <td className="px-3 py-2 text-right">{item.qty}</td>
                <td className="px-3 py-2 text-right">
                  {formatCurrency(item.rate)}
                </td>
                <td className="px-3 py-2 text-right">
                  {formatCurrency(item.amount)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {(overallTaxPercent > 0 ||
          loadingCharge > 0 ||
          transportCharge > 0 ||
          freightCharge > 0 ||
          invoice.transportNotes) && (
            <div className="p-4 border-t text-xs space-y-1">
              {!isInterState ? (
                <>
                  <div className="flex justify-between">
                    <span>CGST ({overallTaxPercent / 2}%)</span>
                    <span>{formatCurrency(cgst)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>SGST ({overallTaxPercent / 2}%)</span>
                    <span>{formatCurrency(sgst)}</span>
                  </div>
                </>
              ) : (
                <div className="flex justify-between">
                  <span>IGST ({overallTaxPercent}%)</span>
                  <span>{formatCurrency(igst)}</span>
                </div>
              )}

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
              <th className="px-3 py-2 text-left">Size</th>
              <th className="px-3 py-2 text-left">Thickness</th>
              <th className="px-3 py-2 text-right">Quantity</th>
            </tr>
          </thead>

          <tbody>
            {invoice.items.map((item, idx) => (
              <tr key={idx} className="border-b">
                <td className="px-3 py-2">{item.name}</td>
                <td className="px-3 py-2">{item.size || "—"}</td>
                <td className="px-3 py-2">{item.thickness || "—"}</td>
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