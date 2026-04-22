// ═══════════════════════════════════════════════════════════════════════════════
// MODULE 2: INVENTORY MANAGEMENT
// ═══════════════════════════════════════════════════════════════════════════════
import { useEffect, useMemo, useRef, useState } from "react";
import { generateId } from "../utils/helpers";
import { formatCurrency } from "../utils/formatters";
import { PRODUCT_CATEGORIES, UNITS } from "../constants";
import * as productCategoriesService from "../services/productCategories";
import * as unitsService from "../services/units";
import { Badge } from "../components/ui/Badge";
import { Button } from "../components/ui/Button";
import { Card } from "../components/ui/Card";
import { EmptyState } from "../components/ui/EmptyState";
import { Input } from "../components/ui/Input";
import { Modal } from "../components/ui/Modal";
import { SearchBar } from "../components/ui/SearchBar";
import { Select } from "../components/ui/Select";
import { Tabs } from "../components/ui/Tabs";
import { Icons } from "../components/ui/Icons";

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
                key={row.id || row.hsn || row.name || rowIndex}
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

const SearchableCreateSelect = ({
  label,
  value,
  options,
  placeholder,
  onChange,
  onCreate,
  createLabel,
}) => {
  const [query, setQuery] = useState(value || "");
  const [open, setOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const wrapRef = useRef(null);

  useEffect(() => {
    setQuery(value || "");
  }, [value]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (wrapRef.current && !wrapRef.current.contains(event.target)) {
        setOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const filteredOptions = useMemo(() => {
    const q = String(query || "").trim().toLowerCase();
    if (!q) return options;
    return options.filter((opt) => opt.toLowerCase().includes(q));
  }, [options, query]);

  const exactMatch = options.some(
    (opt) => opt.toLowerCase() === String(query || "").trim().toLowerCase()
  );

  const handleSelect = (option) => {
    setQuery(option);
    onChange(option);
    setOpen(false);
  };

  const handleCreate = async () => {
    const name = String(query || "").trim();
    if (!name || !onCreate) return;

    setCreating(true);
    try {
      const createdName = await onCreate(name);
      if (createdName) {
        setQuery(createdName);
        onChange(createdName);
        setOpen(false);
      }
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="relative" ref={wrapRef}>
      <label className="block text-xs font-medium text-gray-600 mb-1">
        {label}
      </label>

      <div className="relative">
        <input
          type="text"
          value={query}
          placeholder={placeholder}
          onFocus={() => setOpen(true)}
          onChange={(e) => {
            setQuery(e.target.value);
            setOpen(true);
          }}
          className="w-full rounded-md border border-gray-300 px-3 py-1.5 pr-9 text-sm outline-none focus:border-gray-400"
        />
        <div className="absolute inset-y-0 right-0 flex items-center pr-3 text-gray-400 pointer-events-none">
          <Icons.search size={14} />
        </div>
      </div>

      {open && (
        <div className="absolute z-30 mt-1 max-h-40 w-full overflow-y-auto rounded-md border border-gray-200 bg-white shadow-lg">
          {filteredOptions.length > 0 ? (
            filteredOptions.map((option) => (
              <button
                key={option}
                type="button"
                onClick={() => handleSelect(option)}
                className={`block w-full px-3 py-2 text-left text-sm hover:bg-gray-50 ${
                  option === value
                    ? "bg-gray-50 font-medium text-gray-900"
                    : "text-gray-700"
                }`}
              >
                {option}
              </button>
            ))
          ) : (
            <div className="px-3 py-2 text-sm text-gray-500">No matches found</div>
          )}

          {!exactMatch && String(query || "").trim() && onCreate && (
            <div className="border-t border-gray-100 p-2">
              <Button
                size="sm"
                onClick={handleCreate}
                disabled={creating}
                className="w-full"
              >
                <Icons.plus size={14} />{" "}
                {creating
                  ? "Adding..."
                  : `${createLabel} "${String(query).trim()}"`}
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

const MasterManager = ({
  categories,
  units,
  onCreateCategory,
  onCreateUnit,
  onUpdateCategory,
  onUpdateUnit,
  onDeleteCategory,
  onDeleteUnit,
}) => {
  const [tab, setTab] = useState("categories");
  const [newCategory, setNewCategory] = useState("");
  const [newUnit, setNewUnit] = useState("");
  const [editingCategory, setEditingCategory] = useState(null);
  const [editingUnit, setEditingUnit] = useState(null);
  const [editValue, setEditValue] = useState("");

  const startEditCategory = (row) => {
    setEditingCategory(row);
    setEditingUnit(null);
    setEditValue(row.name);
  };

  const startEditUnit = (row) => {
    setEditingUnit(row);
    setEditingCategory(null);
    setEditValue(row.name);
  };

  const submitCategory = async () => {
    await onCreateCategory(newCategory);
    setNewCategory("");
  };

  const submitUnit = async () => {
    await onCreateUnit(newUnit);
    setNewUnit("");
  };

  const saveEdit = async () => {
    if (editingCategory) {
      await onUpdateCategory(editingCategory.id, editValue);
      setEditingCategory(null);
      setEditValue("");
      return;
    }
    if (editingUnit) {
      await onUpdateUnit(editingUnit.id, editValue);
      setEditingUnit(null);
      setEditValue("");
    }
  };

  return (
    <div>
      <Tabs
        tabs={[
          { key: "categories", label: "Categories" },
          { key: "units", label: "Units" },
        ]}
        active={tab}
        onChange={setTab}
      />

      <div className="mt-4 space-y-4">
        {tab === "categories" && (
          <>
            <div className="flex gap-2">
              <Input
                placeholder="Add category"
                value={newCategory}
                onChange={(e) => setNewCategory(e.target.value)}
              />
              <Button onClick={submitCategory}>
                <Icons.plus size={14} /> Add
              </Button>
            </div>

            <StyledTable
              columns={[
                { key: "name", label: "Category Name" },
                {
                  key: "actions",
                  label: "",
                  render: (r) => (
                    <div className="flex items-center gap-1">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => startEditCategory(r)}
                      >
                        <Icons.edit size={14} />
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => onDeleteCategory(r.id)}
                      >
                        <Icons.trash size={14} />
                      </Button>
                    </div>
                  ),
                },
              ]}
              data={categories}
              emptyMsg="No categories found"
            />
          </>
        )}

        {tab === "units" && (
          <>
            <div className="flex gap-2">
              <Input
                placeholder="Add unit"
                value={newUnit}
                onChange={(e) => setNewUnit(e.target.value)}
              />
              <Button onClick={submitUnit}>
                <Icons.plus size={14} /> Add
              </Button>
            </div>

            <StyledTable
              columns={[
                { key: "name", label: "Unit Name" },
                {
                  key: "actions",
                  label: "",
                  render: (r) => (
                    <div className="flex items-center gap-1">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => startEditUnit(r)}
                      >
                        <Icons.edit size={14} />
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => onDeleteUnit(r.id)}
                      >
                        <Icons.trash size={14} />
                      </Button>
                    </div>
                  ),
                },
              ]}
              data={units}
              emptyMsg="No units found"
            />
          </>
        )}
      </div>

      <Modal
        open={!!editingCategory || !!editingUnit}
        onClose={() => {
          setEditingCategory(null);
          setEditingUnit(null);
          setEditValue("");
        }}
        title={editingCategory ? "Edit Category" : "Edit Unit"}
        size="sm"
      >
        <div className="space-y-3">
          <Input
            value={editValue}
            onChange={(e) => setEditValue(e.target.value)}
          />
          <div className="flex justify-end gap-2">
            <Button
              variant="secondary"
              onClick={() => {
                setEditingCategory(null);
                setEditingUnit(null);
                setEditValue("");
              }}
            >
              Cancel
            </Button>
            <Button onClick={saveEdit}>
              <Icons.check size={14} /> Save
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export const InventoryModule = ({ products, setProducts, showToast }) => {
  const [tab, setTab] = useState("list");
  const [showForm, setShowForm] = useState(false);
  const [editProduct, setEditProduct] = useState(null);
  const [search, setSearch] = useState("");
  const [catFilter, setCatFilter] = useState("");
  const [adjustModal, setAdjustModal] = useState(null);
  const [adjustQty, setAdjustQty] = useState("");
  const [adjustReason, setAdjustReason] = useState("damage");
  const [deleteProductModal, setDeleteProductModal] = useState(null);
  const [showMasters, setShowMasters] = useState(false);

  const [categoryRows, setCategoryRows] = useState([]);
  const [unitRows, setUnitRows] = useState([]);

  const categoryOptions = categoryRows.map((c) => c.name);
  const unitOptions = unitRows.map((u) => u.name);

  useEffect(() => {
    const loadMasterData = async () => {
      try {
        const [cats, units] = await Promise.all([
          productCategoriesService.getAll(),
          unitsService.getAll(),
        ]);

        setCategoryRows(
          cats?.length
            ? cats
            : PRODUCT_CATEGORIES.map((name) => ({ id: name, name }))
        );
        setUnitRows(
          units?.length
            ? units
            : UNITS.map((name) => ({ id: name, name }))
        );
      } catch (err) {
        console.error("Failed to load categories/units:", err);
        setCategoryRows(PRODUCT_CATEGORIES.map((name) => ({ id: name, name })));
        setUnitRows(UNITS.map((name) => ({ id: name, name })));
      }
    };

    loadMasterData();
  }, []);

  const filtered = products.filter((p) => {
    const matchSearch =
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      p.hsn.includes(search);
    const matchCat = !catFilter || p.category === catFilter;
    return matchSearch && matchCat;
  });

  const lowStockProducts = products.filter((p) => p.stock <= p.minStock);

  const saveProduct = (data) => {
    if (editProduct) {
      setProducts((prev) =>
        prev.map((p) => (p.id === editProduct.id ? { ...p, ...data } : p))
      );
      showToast?.("Product updated successfully", "success");
    } else {
      setProducts((prev) => [...prev, { ...data, id: generateId() }]);
      showToast?.("Product added successfully", "success");
    }
    setShowForm(false);
    setEditProduct(null);
  };

  const confirmDeleteProduct = () => {
    if (!deleteProductModal) return;
    setProducts((prev) => prev.filter((p) => p.id !== deleteProductModal.id));
    showToast?.("Product deleted successfully", "success");
    setDeleteProductModal(null);
  };

  const adjustStock = () => {
    if (!adjustModal) return;

    const qty = Number(adjustQty);

    if (!adjustQty || Number.isNaN(qty) || qty <= 0) {
      showToast?.("Enter a valid positive quantity to deduct", "warning");
      return;
    }

    if (qty > adjustModal.stock) {
      showToast?.(
        `Cannot deduct more than current stock (${adjustModal.stock} ${adjustModal.unit})`,
        "error"
      );
      return;
    }

    setProducts((prev) =>
      prev.map((p) =>
        p.id === adjustModal.id
          ? { ...p, stock: Math.max(0, p.stock - qty) }
          : p
      )
    );

    showToast?.(
      `Stock adjusted successfully for ${adjustModal.name}`,
      "success"
    );

    setAdjustModal(null);
    setAdjustQty("");
    setAdjustReason("damage");
  };

  const handleCreateCategory = async (name) => {
    const trimmed = String(name || "").trim();
    if (!trimmed) return null;

    const existing = categoryRows.find(
      (c) => c.name.toLowerCase() === trimmed.toLowerCase()
    );
    if (existing) return existing.name;

    try {
      const created = await productCategoriesService.create({ name: trimmed });
      const row = created?.id ? created : { id: created?.name || trimmed, name: created?.name || trimmed };
      setCategoryRows((prev) =>
        [...prev, row].sort((a, b) => a.name.localeCompare(b.name))
      );
      showToast?.("Category added successfully", "success");
      return row.name;
    } catch (err) {
      console.error("Category create error:", err);
      showToast?.(err.message || "Failed to add category", "error");
      return null;
    }
  };

  const handleCreateUnit = async (name) => {
    const trimmed = String(name || "").trim();
    if (!trimmed) return null;

    const existing = unitRows.find(
      (u) => u.name.toLowerCase() === trimmed.toLowerCase()
    );
    if (existing) return existing.name;

    try {
      const created = await unitsService.create({ name: trimmed });
      const row = created?.id ? created : { id: created?.name || trimmed, name: created?.name || trimmed };
      setUnitRows((prev) =>
        [...prev, row].sort((a, b) => a.name.localeCompare(b.name))
      );
      showToast?.("Unit added successfully", "success");
      return row.name;
    } catch (err) {
      console.error("Unit create error:", err);
      showToast?.(err.message || "Failed to add unit", "error");
      return null;
    }
  };

  const handleUpdateCategory = async (id, name) => {
    const trimmed = String(name || "").trim();
    if (!trimmed) return;

    try {
      await productCategoriesService.update(id, { name: trimmed });
      setCategoryRows((prev) =>
        prev
          .map((row) => (row.id === id ? { ...row, name: trimmed } : row))
          .sort((a, b) => a.name.localeCompare(b.name))
      );
      showToast?.("Category updated successfully", "success");
    } catch (err) {
      console.error("Category update error:", err);
      showToast?.(err.message || "Failed to update category", "error");
    }
  };

  const handleUpdateUnit = async (id, name) => {
    const trimmed = String(name || "").trim();
    if (!trimmed) return;

    try {
      await unitsService.update(id, { name: trimmed });
      setUnitRows((prev) =>
        prev
          .map((row) => (row.id === id ? { ...row, name: trimmed } : row))
          .sort((a, b) => a.name.localeCompare(b.name))
      );
      showToast?.("Unit updated successfully", "success");
    } catch (err) {
      console.error("Unit update error:", err);
      showToast?.(err.message || "Failed to update unit", "error");
    }
  };

  const handleDeleteCategory = async (id) => {
    try {
      await productCategoriesService.delete_(id);
      setCategoryRows((prev) => prev.filter((row) => row.id !== id));
      if (catFilter && !categoryRows.find((row) => row.id === id)?.name !== catFilter) {
        // no-op safe
      }
      showToast?.("Category removed successfully", "success");
    } catch (err) {
      console.error("Category delete error:", err);
      showToast?.(err.message || "Failed to remove category", "error");
    }
  };

  const handleDeleteUnit = async (id) => {
    try {
      await unitsService.delete_(id);
      setUnitRows((prev) => prev.filter((row) => row.id !== id));
      showToast?.("Unit removed successfully", "success");
    } catch (err) {
      console.error("Unit delete error:", err);
      showToast?.(err.message || "Failed to remove unit", "error");
    }
  };

  return (
    <div>
      <Tabs
        tabs={[
          { key: "list", label: "Products" },
          { key: "alerts", label: `Low Stock (${lowStockProducts.length})` },
        ]}
        active={tab}
        onChange={setTab}
      />

      <div className="mt-4">
        {tab === "list" ? (
          <Card
            title="Product Inventory"
            actions={
              <div className="flex items-center gap-2 flex-wrap">
                <Select
                  options={categoryOptions.map((c) => ({
                    value: c,
                    label: c,
                  }))}
                  value={catFilter}
                  onChange={(e) => setCatFilter(e.target.value)}
                />
                <SearchBar
                  value={search}
                  onChange={setSearch}
                  placeholder="Search products..."
                />
                <Button size="sm" variant="secondary" onClick={() => setShowMasters(true)}>
                  <Icons.box size={14} /> Manage Masters
                </Button>
                <Button
                  size="sm"
                  onClick={() => {
                    setEditProduct(null);
                    setShowForm(true);
                  }}
                >
                  <Icons.plus size={14} /> Add Product
                </Button>
              </div>
            }
          >
            <StyledTable
              columns={[
                {
                  key: "name",
                  label: "Product",
                  render: (r) => (
                    <div>
                      <div className="font-medium">{r.name}</div>
                      <div className="text-xs text-gray-400">
                        {r.category} · {r.size || "—"} · {r.thickness || "—"}
                      </div>
                    </div>
                  ),
                },
                { key: "hsn", label: "HSN" },
                {
                  key: "stock",
                  label: "Stock",
                  align: "right",
                  render: (r) => (
                    <span
                      className={
                        r.stock <= r.minStock ? "text-red-600 font-medium" : ""
                      }
                    >
                      {r.stock} {r.unit}
                    </span>
                  ),
                },
                {
                  key: "rate",
                  label: "Rate",
                  align: "right",
                  render: (r) => formatCurrency(r.rate),
                },
                {
                  key: "taxRate",
                  label: "Tax",
                  align: "right",
                  render: (r) => `${r.taxRate}%`,
                },
                { key: "warehouse", label: "Warehouse" },
                {
                  key: "actions",
                  label: "",
                  render: (r) => (
                    <div className="flex items-center gap-1">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => setAdjustModal(r)}
                        title="Adjust Stock"
                      >
                        <Icons.box size={14} />
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => {
                          setEditProduct(r);
                          setShowForm(true);
                        }}
                      >
                        <Icons.edit size={14} />
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => setDeleteProductModal(r)}
                      >
                        <Icons.trash size={14} />
                      </Button>
                    </div>
                  ),
                },
              ]}
              data={filtered}
              emptyMsg="No products found"
            />
          </Card>
        ) : (
          <Card title="Low Stock Alerts">
            {lowStockProducts.length === 0 ? (
              <EmptyState
                icon={<Icons.check size={40} />}
                title="All Good"
                description="No products are below minimum stock level"
              />
            ) : (
              <StyledTable
                columns={[
                  { key: "name", label: "Product" },
                  {
                    key: "stock",
                    label: "Current Stock",
                    align: "right",
                    render: (r) => (
                      <span className="text-red-600 font-bold">
                        {r.stock} {r.unit}
                      </span>
                    ),
                  },
                  {
                    key: "minStock",
                    label: "Min Stock",
                    align: "right",
                    render: (r) => `${r.minStock} ${r.unit}`,
                  },
                  {
                    key: "deficit",
                    label: "Deficit",
                    align: "right",
                    render: (r) => (
                      <Badge variant="danger">
                        {r.minStock - r.stock} {r.unit}
                      </Badge>
                    ),
                  },
                ]}
                data={lowStockProducts}
                emptyMsg="No low stock products"
              />
            )}
          </Card>
        )}
      </div>

      <Modal
        open={showForm}
        onClose={() => {
          setShowForm(false);
          setEditProduct(null);
        }}
        title={editProduct ? "Edit Product" : "Add Product"}
      >
        <ProductForm
          product={editProduct}
          categories={categoryOptions}
          units={unitOptions}
          onCreateCategory={handleCreateCategory}
          onCreateUnit={handleCreateUnit}
          onSave={saveProduct}
          onCancel={() => {
            setShowForm(false);
            setEditProduct(null);
          }}
        />
      </Modal>

      <Modal
        open={showMasters}
        onClose={() => setShowMasters(false)}
        title="Manage Categories & Units"
        size="lg"
      >
        <MasterManager
          categories={categoryRows}
          units={unitRows}
          onCreateCategory={handleCreateCategory}
          onCreateUnit={handleCreateUnit}
          onUpdateCategory={handleUpdateCategory}
          onUpdateUnit={handleUpdateUnit}
          onDeleteCategory={handleDeleteCategory}
          onDeleteUnit={handleDeleteUnit}
        />
      </Modal>

      <Modal
        open={!!adjustModal}
        onClose={() => setAdjustModal(null)}
        title={`Adjust Stock: ${adjustModal?.name}`}
        size="sm"
      >
        <div className="space-y-3">
          <div className="p-3 bg-gray-50 rounded text-sm">
            Current Stock:{" "}
            <strong>
              {adjustModal?.stock} {adjustModal?.unit}
            </strong>
          </div>

          <Select
            label="Reason"
            options={[
              { value: "damage", label: "Damage" },
              { value: "wastage", label: "Wastage" },
              { value: "correction", label: "Correction" },
            ]}
            value={adjustReason}
            onChange={(e) => setAdjustReason(e.target.value)}
          />

          <Input
            label="Quantity to Deduct"
            type="number"
            min="0"
            value={adjustQty}
            onChange={(e) => {
              const value = e.target.value;
              if (value === "") {
                setAdjustQty("");
              } else {
                setAdjustQty(String(Math.max(0, Number(value))));
              }
            }}
          />

          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setAdjustModal(null)}>
              Cancel
            </Button>
            <Button variant="danger" onClick={adjustStock}>
              Adjust
            </Button>
          </div>
        </div>
      </Modal>

      <Modal
        open={!!deleteProductModal}
        onClose={() => setDeleteProductModal(null)}
        title="Delete Product"
        size="sm"
      >
        <div className="space-y-4">
          <div className="text-sm text-gray-700">
            Are you sure you want to delete{" "}
            <span className="font-semibold">{deleteProductModal?.name}</span>?
          </div>

          <div className="flex justify-end gap-2">
            <Button
              variant="secondary"
              onClick={() => setDeleteProductModal(null)}
            >
              Cancel
            </Button>
            <Button variant="danger" onClick={confirmDeleteProduct}>
              Delete
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export const ProductForm = ({
  product,
  categories,
  units,
  onCreateCategory,
  onCreateUnit,
  onSave,
  onCancel,
}) => {
  const [f, setF] = useState(
    product || {
      name: "",
      category: "",
      hsn: "",
      unit: "",
      thickness: "",
      size: "",
      rate: "",
      taxRate: "18",
      stock: "",
      minStock: "",
      warehouse: "Main",
    }
  );

  const [errors, setErrors] = useState({});

  const set = (k, v) => setF((prev) => ({ ...prev, [k]: v }));

  const validate = () => {
    const nextErrors = {};

    if (!String(f.name || "").trim()) nextErrors.name = "Product name is required";
    if (!String(f.hsn || "").trim()) nextErrors.hsn = "HSN code is required";

    if (!String(f.category || "").trim()) {
      nextErrors.category = "Category is required";
    }

    if (!String(f.unit || "").trim()) {
      nextErrors.unit = "Unit is required";
    }

    if (f.rate === "" || Number.isNaN(Number(f.rate))) {
      nextErrors.rate = "Rate is required";
    } else if (Number(f.rate) < 0) {
      nextErrors.rate = "Rate cannot be negative";
    }

    if (f.taxRate === "" || Number.isNaN(Number(f.taxRate))) {
      nextErrors.taxRate = "Tax rate is required";
    } else if (Number(f.taxRate) < 0) {
      nextErrors.taxRate = "Tax rate cannot be negative";
    }

    if (f.stock === "" || Number.isNaN(Number(f.stock))) {
      nextErrors.stock = "Current stock is required";
    } else if (Number(f.stock) < 0) {
      nextErrors.stock = "Current stock cannot be negative";
    }

    if (f.minStock === "" || Number.isNaN(Number(f.minStock))) {
      nextErrors.minStock = "Minimum stock is required";
    } else if (Number(f.minStock) < 0) {
      nextErrors.minStock = "Minimum stock cannot be negative";
    }

    if (!String(f.warehouse || "").trim()) {
      nextErrors.warehouse = "Warehouse is required";
    }

    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const handleSave = () => {
    if (!validate()) return;

    onSave({
      ...f,
      rate: Number(f.rate),
      taxRate: Number(f.taxRate),
      stock: Number(f.stock),
      minStock: Number(f.minStock),
      name: String(f.name).trim(),
      hsn: String(f.hsn).trim(),
      category: String(f.category).trim(),
      unit: String(f.unit).trim(),
      thickness: String(f.thickness || "").trim(),
      size: String(f.size || "").trim(),
      warehouse: String(f.warehouse || "").trim(),
    });
  };

  const inputClass = (field) =>
    `w-full rounded-md border px-3 py-2 text-sm outline-none ${
      errors[field]
        ? "border-red-500 focus:border-red-500"
        : "border-gray-300 focus:border-gray-400"
    }`;

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">
            Product Name *
          </label>
          <input
            className={inputClass("name")}
            value={f.name}
            onChange={(e) => {
              set("name", e.target.value);
              if (errors.name) setErrors((prev) => ({ ...prev, name: "" }));
            }}
          />
          {errors.name && (
            <p className="mt-1 text-xs text-red-600">{errors.name}</p>
          )}
        </div>

        <div>
          <SearchableCreateSelect
            label="Category *"
            value={f.category}
            options={categories}
            placeholder="Search or add category"
            onChange={(value) => {
              set("category", value);
              if (errors.category) {
                setErrors((prev) => ({ ...prev, category: "" }));
              }
            }}
            onCreate={onCreateCategory}
            createLabel="Add category"
          />
          {errors.category && (
            <p className="mt-1 text-xs text-red-600">{errors.category}</p>
          )}
        </div>

        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">
            HSN Code *
          </label>
          <input
            className={inputClass("hsn")}
            value={f.hsn}
            onChange={(e) => {
              set("hsn", e.target.value);
              if (errors.hsn) setErrors((prev) => ({ ...prev, hsn: "" }));
            }}
          />
          {errors.hsn && (
            <p className="mt-1 text-xs text-red-600">{errors.hsn}</p>
          )}
        </div>

        <div>
          <SearchableCreateSelect
            label="Unit *"
            value={f.unit}
            options={units}
            placeholder="Search or add unit"
            onChange={(value) => {
              set("unit", value);
              if (errors.unit) {
                setErrors((prev) => ({ ...prev, unit: "" }));
              }
            }}
            onCreate={onCreateUnit}
            createLabel="Add unit"
          />
          {errors.unit && (
            <p className="mt-1 text-xs text-red-600">{errors.unit}</p>
          )}
        </div>

        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">
            Size
          </label>
          <input
            className={inputClass("size")}
            value={f.size}
            placeholder="e.g., 8x4"
            onChange={(e) => set("size", e.target.value)}
          />
        </div>

        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">
            Thickness
          </label>
          <input
            className={inputClass("thickness")}
            value={f.thickness}
            placeholder="e.g., 18mm"
            onChange={(e) => set("thickness", e.target.value)}
          />
        </div>

        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">
            Rate (₹) *
          </label>
          <input
            type="number"
            min="0"
            className={inputClass("rate")}
            value={f.rate}
            onChange={(e) => {
              const value = e.target.value;
              set("rate", value === "" ? "" : String(Math.max(0, Number(value))));
              if (errors.rate) setErrors((prev) => ({ ...prev, rate: "" }));
            }}
          />
          {errors.rate && (
            <p className="mt-1 text-xs text-red-600">{errors.rate}</p>
          )}
        </div>

        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">
            Tax Rate (%) *
          </label>
          <input
            type="number"
            min="0"
            className={inputClass("taxRate")}
            value={f.taxRate}
            onChange={(e) => {
              const value = e.target.value;
              set("taxRate", value === "" ? "" : String(Math.max(0, Number(value))));
              if (errors.taxRate) setErrors((prev) => ({ ...prev, taxRate: "" }));
            }}
          />
          {errors.taxRate && (
            <p className="mt-1 text-xs text-red-600">{errors.taxRate}</p>
          )}
        </div>

        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">
            Current Stock *
          </label>
          <input
            type="number"
            min="0"
            className={inputClass("stock")}
            value={f.stock}
            onChange={(e) => {
              const value = e.target.value;
              set("stock", value === "" ? "" : String(Math.max(0, Number(value))));
              if (errors.stock) setErrors((prev) => ({ ...prev, stock: "" }));
            }}
          />
          {errors.stock && (
            <p className="mt-1 text-xs text-red-600">{errors.stock}</p>
          )}
        </div>

        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">
            Minimum Stock *
          </label>
          <input
            type="number"
            min="0"
            className={inputClass("minStock")}
            value={f.minStock}
            onChange={(e) => {
              const value = e.target.value;
              set(
                "minStock",
                value === "" ? "" : String(Math.max(0, Number(value)))
              );
              if (errors.minStock) setErrors((prev) => ({ ...prev, minStock: "" }));
            }}
          />
          {errors.minStock && (
            <p className="mt-1 text-xs text-red-600">{errors.minStock}</p>
          )}
        </div>

        <div className="sm:col-span-2">
          <label className="block text-xs font-medium text-gray-600 mb-1">
            Warehouse *
          </label>
          <input
            className={inputClass("warehouse")}
            value={f.warehouse}
            onChange={(e) => {
              set("warehouse", e.target.value);
              if (errors.warehouse) {
                setErrors((prev) => ({ ...prev, warehouse: "" }));
              }
            }}
          />
          {errors.warehouse && (
            <p className="mt-1 text-xs text-red-600">{errors.warehouse}</p>
          )}
        </div>
      </div>

      <div className="flex justify-end gap-2 pt-2">
        <Button variant="secondary" onClick={onCancel}>
          Cancel
        </Button>
        <Button onClick={handleSave}>
          <Icons.check size={14} /> Save
        </Button>
      </div>
    </div>
  );
};