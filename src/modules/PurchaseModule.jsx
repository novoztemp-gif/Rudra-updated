// ═══════════════════════════════════════════════════════════════════════════════
// MODULE 4: PURCHASE MANAGEMENT
// ═══════════════════════════════════════════════════════════════════════════════
import { useMemo, useState } from "react";
import { generateId, today } from "../utils/helpers";
import { formatCurrency, formatDate } from "../utils/formatters";
import { escapeHtml, printHtmlInIframe } from "../utils/printBill";
import { Badge } from "../components/ui/Badge";
import { Button } from "../components/ui/Button";
import { Card } from "../components/ui/Card";
import { Input } from "../components/ui/Input";
import { Modal } from "../components/ui/Modal";
import { Select } from "../components/ui/Select";
import { Icons } from "../components/ui/Icons";
import { PartyForm } from "./CustomerModule";

const buildPurchaseBillHTML = (purchase, supplier) => {
  const rows = purchase.items
    .map((item) => {
      const qtyText = `${item.qty} ${item.unit || ""}`.trim();
      const rateText = formatCurrency(item.purchaseRate);
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

  return `
    <div class="bill-wrap">
      <div class="bill-info">
        <div class="bill-info-row">
          <div class="bill-info-label">Purchase No</div>
          <div class="bill-info-value">${escapeHtml(purchase.purchaseNo)}</div>
        </div>
        <div class="bill-info-row">
          <div class="bill-info-label">Date</div>
          <div class="bill-info-value">${formatDate(purchase.date)}</div>
        </div>
        <div class="bill-info-row">
          <div class="bill-info-label">Supplier Invoice No</div>
          <div class="bill-info-value">${escapeHtml(purchase.invoiceNo || "—")}</div>
        </div>

        <div class="customer-box">
          <div class="bill-info-row">
            <div class="bill-info-label">Supplier</div>
            <div class="bill-info-value">${escapeHtml(supplier?.name || purchase.supplierName || "—")}</div>
          </div>
          <div class="bill-info-row">
            <div class="bill-info-label">GSTIN</div>
            <div class="bill-info-value">${escapeHtml(supplier?.gstin || "—")}</div>
          </div>
        </div>
      </div>

      <div class="bill-line"></div>

      ${rows}

      <div class="total-box">
        <div>Total</div>
        <div>${formatCurrency(purchase.total)}</div>
      </div>
    </div>
  `;
};

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
                key={
                  row.id ||
                  row.purchaseNo ||
                  row.productId ||
                  row.name ||
                  rowIndex
                }
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

export const PurchaseModule = ({
  products,
  setProducts,
  suppliers,
  setSuppliers,
  purchases,
  setPurchases,
  showToast,
}) => {
  const [showForm, setShowForm] = useState(false);
  const [showView, setShowView] = useState(null);

  const sortedPurchases = useMemo(() => {
    return [...purchases].sort((a, b) => {
      const bNo = Number(String(b.purchaseNo || "").replace("PO-", "")) || 0;
      const aNo = Number(String(a.purchaseNo || "").replace("PO-", "")) || 0;
      return bNo - aNo;
    });
  }, [purchases]);

  const savePurchase = (purchase) => {
    const updatedProducts = [...products];

    purchase.items.forEach((item) => {
      const pi = updatedProducts.findIndex((p) => p.id === item.productId);
      if (pi >= 0) {
        updatedProducts[pi] = {
          ...updatedProducts[pi],
          stock: updatedProducts[pi].stock + item.qty,
        };
      }
    });

    setProducts(updatedProducts);
    setPurchases((prev) => [
      {
        ...purchase,
        id: generateId(),
        date: today(),
        status: "received",
      },
      ...prev,
    ]);

    setShowForm(false);
    showToast?.("Purchase saved successfully", "success");
  };

  return (
    <div>
      <div className="mt-4">
        <Card
          title="Purchase Orders"
          actions={
            <Button size="sm" onClick={() => setShowForm(true)}>
              <Icons.plus size={14} /> New Purchase
            </Button>
          }
        >
          <StyledTable
            columns={[
              {
                key: "purchaseNo",
                label: "Purchase #",
                render: (r) => <span className="font-mono">{r.purchaseNo}</span>,
              },
              {
                key: "date",
                label: "Date",
                render: (r) => formatDate(r.date),
              },
              {
                key: "supplier",
                label: "Supplier",
                render: (r) => r.supplierName,
              },
              {
                key: "items",
                label: "Items",
                render: (r) => `${r.items.length} item(s)`,
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
                key: "status",
                label: "Status",
                render: (r) => <Badge variant="success">{r.status}</Badge>,
              },
              {
                key: "actions",
                label: "",
                render: (r) => (
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => setShowView(r)}
                    title="View Purchase"
                  >
                    <Icons.file size={14} /> View
                  </Button>
                ),
              },
            ]}
            data={sortedPurchases}
            emptyMsg="No purchases yet"
          />
        </Card>
      </div>

      <Modal
        open={showForm}
        onClose={() => setShowForm(false)}
        title="New Purchase Entry"
        size="lg"
      >
        <PurchaseForm
          products={products}
          suppliers={suppliers}
          setSuppliers={setSuppliers}
          onSave={savePurchase}
          onCancel={() => setShowForm(false)}
          purchaseNo={`PO-${(purchases.length + 1).toString().padStart(4, "0")}`}
          showToast={showToast}
        />
      </Modal>

      <Modal
        open={!!showView}
        onClose={() => setShowView(null)}
        title={`Purchase ${showView?.purchaseNo}`}
        size="lg"
      >
        {showView && (
          <div className="space-y-4">
            <div className="flex justify-end">
              <Button
                onClick={() =>
                  printHtmlInIframe(
                    buildPurchaseBillHTML(
                      showView,
                      suppliers.find((s) => s.id === showView.supplierId)
                    )
                  )
                }
              >
                <Icons.printer size={14} /> Print / Save PDF
              </Button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-sm">
              <div className="p-3 bg-gray-50 rounded">
                <div className="text-xs text-gray-500">Supplier</div>
                <div className="font-medium">{showView.supplierName}</div>
              </div>
              <div className="p-3 bg-gray-50 rounded">
                <div className="text-xs text-gray-500">Date</div>
                <div className="font-medium">{formatDate(showView.date)}</div>
              </div>
              <div className="p-3 bg-gray-50 rounded">
                <div className="text-xs text-gray-500">Total</div>
                <div className="font-medium">{formatCurrency(showView.total)}</div>
              </div>
            </div>

            <StyledTable
              columns={[
                { key: "name", label: "Product" },
                {
                  key: "qty",
                  label: "Purchased Qty",
                  align: "right",
                  render: (r) => `${r.qty} ${r.unit}`,
                },
                {
                  key: "purchaseRate",
                  label: "Rate",
                  align: "right",
                  render: (r) => formatCurrency(r.purchaseRate),
                },
                {
                  key: "stockBefore",
                  label: "Stock Before",
                  align: "right",
                  render: (r) => `${r.stockBefore} ${r.unit}`,
                },
                {
                  key: "stockAfter",
                  label: "Stock After",
                  align: "right",
                  render: (r) => `${r.stockAfter} ${r.unit}`,
                },
                {
                  key: "amount",
                  label: "Amount",
                  align: "right",
                  render: (r) => formatCurrency(r.amount),
                },
              ]}
              data={showView.items}
              emptyMsg="No items"
            />
          </div>
        )}
      </Modal>
    </div>
  );
};

export const PurchaseForm = ({
  products,
  suppliers,
  setSuppliers,
  onSave,
  onCancel,
  purchaseNo,
  showToast,
}) => {
  const [form, setForm] = useState({
    supplierId: "",
    invoiceNo: "",
    items: [],
  });

  const [itemForm, setItemForm] = useState({
    productId: "",
    qty: "",
    purchaseRate: "",
  });

  const [showAddSupplier, setShowAddSupplier] = useState(false);
  const supplier = suppliers.find((s) => s.id === form.supplierId);

  const handleSaveSupplier = (entity) => {
    const newSupplier = { ...entity, id: generateId() };
    setSuppliers((prev) => [...prev, newSupplier]);
    setForm((prev) => ({ ...prev, supplierId: newSupplier.id }));
    setShowAddSupplier(false);
    showToast?.("Supplier added successfully", "success");
  };

  const addItem = () => {
    const product = products.find((p) => p.id === itemForm.productId);
    const qty = Number(itemForm.qty);
    const purchaseRate = Number(itemForm.purchaseRate || product?.rate || 0);

    if (!product) {
      showToast?.("Select a product", "warning");
      return;
    }

    if (!itemForm.qty || Number.isNaN(qty) || qty <= 0) {
      showToast?.("Enter a valid positive quantity", "warning");
      return;
    }

    if (Number.isNaN(purchaseRate) || purchaseRate < 0) {
      showToast?.("Enter a valid purchase rate", "warning");
      return;
    }

    const stockBefore = Number(product.stock || 0);
    const stockAfter = stockBefore + qty;

    setForm((prev) => ({
      ...prev,
      items: [
        ...prev.items,
        {
          productId: product.id,
          name: product.name,
          qty,
          purchaseRate,
          unit: product.unit,
          hsn: product.hsn,
          stockBefore,
          stockAfter,
          amount: qty * purchaseRate,
        },
      ],
    }));

    setItemForm({ productId: "", qty: "", purchaseRate: "" });
  };

  const removeItem = (index) => {
    setForm((prev) => ({
      ...prev,
      items: prev.items.filter((_, i) => i !== index),
    }));
  };

  const total = form.items.reduce((s, i) => s + i.amount, 0);

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <Input label="Purchase No." value={purchaseNo} readOnly />

        <div>
          <Select
            label="Supplier *"
            options={suppliers.map((s) => ({
              value: s.id,
              label: `${s.name} (${s.gstin || "No GST"})`,
            }))}
            value={form.supplierId}
            onChange={(e) =>
              setForm((prev) => ({ ...prev, supplierId: e.target.value }))
            }
          />
          <Button
            size="sm"
            className="mt-2 w-full"
            onClick={() => setShowAddSupplier(true)}
          >
            <Icons.plus size={14} /> Add Supplier
          </Button>
        </div>

        <Input
          label="Supplier Invoice No."
          value={form.invoiceNo}
          onChange={(e) =>
            setForm((prev) => ({ ...prev, invoiceNo: e.target.value }))
          }
        />
      </div>

      {supplier && (
        <div className="p-2 bg-gray-50 rounded text-xs">
          GSTIN: {supplier.gstin || "—"} | {supplier.address}
        </div>
      )}

      <div className="flex flex-col sm:flex-row gap-3 items-end">
        <Select
          label="Product"
          className="flex-1"
          options={products.map((p) => ({ value: p.id, label: p.name }))}
          value={itemForm.productId}
          onChange={(e) =>
            setItemForm((prev) => ({ ...prev, productId: e.target.value }))
          }
        />

        <Input
          label="Qty"
          type="number"
          min="0"
          className="w-24"
          value={itemForm.qty}
          onChange={(e) => {
            const value = e.target.value;
            setItemForm((prev) => ({
              ...prev,
              qty: value === "" ? "" : String(Math.max(0, Number(value))),
            }));
          }}
        />

        <Input
          label="Rate"
          type="number"
          min="0"
          className="w-28"
          value={itemForm.purchaseRate}
          onChange={(e) => {
            const value = e.target.value;
            setItemForm((prev) => ({
              ...prev,
              purchaseRate:
                value === "" ? "" : String(Math.max(0, Number(value))),
            }));
          }}
          placeholder="Purchase rate"
        />

        <Button onClick={addItem}>
          <Icons.plus size={14} /> Add
        </Button>
      </div>

      {form.items.length > 0 && (
        <>
          <StyledTable
            columns={[
              { key: "name", label: "Product" },
              {
                key: "qty",
                label: "Qty",
                align: "right",
                render: (r) => `${r.qty} ${r.unit}`,
              },
              {
                key: "purchaseRate",
                label: "Rate",
                align: "right",
                render: (r) => formatCurrency(r.purchaseRate),
              },
              {
                key: "stockBefore",
                label: "Before",
                align: "right",
                render: (r) => `${r.stockBefore} ${r.unit}`,
              },
              {
                key: "stockAfter",
                label: "After",
                align: "right",
                render: (r) => `${r.stockAfter} ${r.unit}`,
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
            emptyMsg="No items added"
          />
          <div className="text-right font-bold text-lg">
            Total: {formatCurrency(total)}
          </div>
        </>
      )}

      <div className="flex justify-end gap-2">
        <Button variant="secondary" onClick={onCancel}>
          Cancel
        </Button>
        <Button
          onClick={() =>
            onSave({
              ...form,
              purchaseNo,
              supplierName: supplier?.name,
              total,
            })
          }
          disabled={!form.supplierId || form.items.length === 0}
        >
          <Icons.check size={14} /> Save
        </Button>
      </div>

      <Modal
        open={showAddSupplier}
        onClose={() => setShowAddSupplier(false)}
        title="Add New Supplier"
      >
        <PartyForm
          isCustomer={false}
          onSave={handleSaveSupplier}
          onCancel={() => setShowAddSupplier(false)}
        />
      </Modal>
    </div>
  );
};