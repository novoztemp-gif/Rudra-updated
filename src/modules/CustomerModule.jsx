// ═══════════════════════════════════════════════════════════════════════════════
// MODULE 9: CUSTOMER & PARTY MANAGEMENT
// ═══════════════════════════════════════════════════════════════════════════════
import { useMemo, useState } from "react";
import { generateId } from "../utils/helpers";
import { formatCurrency, formatDate } from "../utils/formatters";
import { validateGSTIN } from "../utils/validators";
import { STATES } from "../constants";
import { Badge } from "../components/ui/Badge";
import { Button } from "../components/ui/Button";
import { Card } from "../components/ui/Card";
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
                key={row.id || row.invoiceNo || row.name || rowIndex}
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
                    {col.render ? col.render(row) : row[col.key]}
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

export const CustomerModule = ({
  customers,
  setCustomers,
  suppliers,
  setSuppliers,
  invoices,
  showToast,
}) => {
  const [tab, setTab] = useState("customers");
  const [showForm, setShowForm] = useState(false);
  const [editEntity, setEditEntity] = useState(null);
  const [search, setSearch] = useState("");
  const [viewLedger, setViewLedger] = useState(null);
  const [deleteEntityModal, setDeleteEntityModal] = useState(null);

  const isCustomer = tab === "customers";
  const data = isCustomer ? customers : suppliers;
  const setData = isCustomer ? setCustomers : setSuppliers;

  const filtered = useMemo(() => {
    return data.filter(
      (e) =>
        String(e.name || "").toLowerCase().includes(search.toLowerCase()) ||
        String(e.gstin || "").includes(search) ||
        String(e.mobile || "").includes(search) ||
        String(e.altMobile || "").includes(search)
    );
  }, [data, search]);

  const saveEntity = (entity) => {
    if (editEntity) {
      setData((prev) =>
        prev.map((e) => (e.id === editEntity.id ? { ...e, ...entity } : e))
      );
      showToast?.(
        `${isCustomer ? "Customer" : "Supplier"} updated successfully`,
        "success"
      );
    } else {
      setData((prev) => [...prev, { ...entity, id: generateId() }]);
      showToast?.(
        `${isCustomer ? "Customer" : "Supplier"} added successfully`,
        "success"
      );
    }
    setShowForm(false);
    setEditEntity(null);
  };

  const confirmDeleteEntity = () => {
    if (!deleteEntityModal) return;
    setData((prev) => prev.filter((e) => e.id !== deleteEntityModal.id));
    showToast?.(
      `${isCustomer ? "Customer" : "Supplier"} deleted successfully`,
      "success"
    );
    setDeleteEntityModal(null);
  };

  const customerInvoices = viewLedger
    ? invoices.filter((i) => i.customerId === viewLedger.id)
    : [];

  return (
    <div>
      <Tabs
        tabs={[
          { key: "customers", label: "Customers" },
          { key: "suppliers", label: "Suppliers" },
        ]}
        active={tab}
        onChange={setTab}
      />

      <div className="mt-4">
        <Card
          title={isCustomer ? "Customer Master" : "Supplier Master"}
          actions={
            <div className="flex gap-2">
              <SearchBar value={search} onChange={setSearch} />
              <Button
                size="sm"
                onClick={() => {
                  setEditEntity(null);
                  setShowForm(true);
                }}
              >
                <Icons.plus size={14} /> Add
              </Button>
            </div>
          }
        >
          <StyledTable
            columns={[
              {
                key: "name",
                label: "Name",
                render: (r) => <span className="font-medium">{r.name}</span>,
              },
              {
                key: "gstin",
                label: "GSTIN",
                render: (r) => (
                  <span className="font-mono text-xs">{r.gstin || "—"}</span>
                ),
              },
              { key: "mobile", label: "Mobile" },
              {
                key: "altMobile",
                label: "Alt Mobile",
                render: (r) => r.altMobile || "—",
              },
              {
                key: "address",
                label: "Address",
                render: (r) => r.address || "—",
              },
              {
                key: "state",
                label: "State",
                render: (r) =>
                  STATES.find((s) => s.code === r.state)?.name || r.state || "—",
              },
              ...(isCustomer
                ? [
                    {
                      key: "outstanding",
                      label: "Outstanding",
                      align: "right",
                      render: (r) =>
                        r.outstanding ? (
                          <span className="text-red-600 font-medium">
                            {formatCurrency(r.outstanding)}
                          </span>
                        ) : (
                          <span className="text-gray-400">—</span>
                        ),
                    },
                  ]
                : []),
              {
                key: "actions",
                label: "",
                render: (r) => (
                  <div className="flex items-center gap-1">
                    {isCustomer && (
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => setViewLedger(r)}
                        title="View Ledger"
                      >
                        <Icons.file size={14} />
                      </Button>
                    )}
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => {
                        setEditEntity(r);
                        setShowForm(true);
                      }}
                    >
                      <Icons.edit size={14} />
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => setDeleteEntityModal(r)}
                    >
                      <Icons.trash size={14} />
                    </Button>
                  </div>
                ),
              },
            ]}
            data={filtered}
            emptyMsg={`No ${isCustomer ? "customers" : "suppliers"} found`}
          />
        </Card>
      </div>

      <Modal
        open={showForm}
        onClose={() => {
          setShowForm(false);
          setEditEntity(null);
        }}
        title={`${editEntity ? "Edit" : "Add"} ${
          isCustomer ? "Customer" : "Supplier"
        }`}
      >
        <PartyForm
          entity={editEntity}
          isCustomer={isCustomer}
          onSave={saveEntity}
          onCancel={() => {
            setShowForm(false);
            setEditEntity(null);
          }}
        />
      </Modal>

      <Modal
        open={!!viewLedger}
        onClose={() => setViewLedger(null)}
        title={`Ledger: ${viewLedger?.name}`}
        size="lg"
      >
        <div className="space-y-3">
          <div className="p-3 bg-gray-50 rounded text-sm">
            GSTIN: {viewLedger?.gstin || "—"} | Outstanding:{" "}
            {formatCurrency(viewLedger?.outstanding || 0)}
          </div>
          <StyledTable
            columns={[
              { key: "invoiceNo", label: "Invoice #" },
              { key: "date", label: "Date", render: (r) => formatDate(r.date) },
              {
                key: "total",
                label: "Amount",
                align: "right",
                render: (r) => formatCurrency(r.total),
              },
              {
                key: "status",
                label: "Status",
                render: (r) => <Badge variant="success">{r.status}</Badge>,
              },
            ]}
            data={customerInvoices}
            emptyMsg="No transactions"
          />
        </div>
      </Modal>

      <Modal
        open={!!deleteEntityModal}
        onClose={() => setDeleteEntityModal(null)}
        title={`Delete ${isCustomer ? "Customer" : "Supplier"}`}
        size="sm"
      >
        <div className="space-y-4">
          <div className="text-sm text-gray-700">
            Are you sure you want to delete{" "}
            <span className="font-semibold">{deleteEntityModal?.name}</span>?
          </div>

          <div className="flex justify-end gap-2">
            <Button
              variant="secondary"
              onClick={() => setDeleteEntityModal(null)}
            >
              Cancel
            </Button>
            <Button variant="danger" onClick={confirmDeleteEntity}>
              Delete
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export const PartyForm = ({ entity, isCustomer, onSave, onCancel }) => {
  const [f, setF] = useState(
    entity || {
      name: "",
      mobile: "",
      altMobile: "",
      gstin: "",
      address: "",
      city: "",
      pin: "",
      state: "33",
      creditLimit: isCustomer ? "100000" : "",
      outstanding: "0",
      addresses: [{ label: "Primary", address: "" }],
    }
  );

  const [errors, setErrors] = useState({});
  const [gstinValid, setGstinValid] = useState(null);

  const set = (k, v) => setF((p) => ({ ...p, [k]: v }));

  const isDigitsOnly = (value) => /^\d*$/.test(value);

  const checkGstin = () => {
    if (f.gstin) setGstinValid(validateGSTIN(f.gstin));
  };

  const validate = () => {
    const nextErrors = {};

    if (!String(f.name || "").trim()) {
      nextErrors.name = "Name is required";
    }

    if (!String(f.mobile || "").trim()) {
      nextErrors.mobile = "Mobile number is required";
    } else if (!/^\d{10}$/.test(String(f.mobile))) {
      nextErrors.mobile = "Mobile number must be 10 digits";
    }

    if (
      String(f.altMobile || "").trim() &&
      !/^\d{10}$/.test(String(f.altMobile))
    ) {
      nextErrors.altMobile = "Alternative mobile must be 10 digits";
    }

    if (!String(f.address || "").trim()) {
      nextErrors.address = "Address is required";
    }

    if (!String(f.city || "").trim()) {
      nextErrors.city = "City is required";
    }

    if (!String(f.pin || "").trim()) {
      nextErrors.pin = "Postal code is required";
    } else if (!/^\d{6}$/.test(String(f.pin))) {
      nextErrors.pin = "Postal code must be 6 digits";
    }

    if (isCustomer) {
      if (f.creditLimit === "" || Number.isNaN(Number(f.creditLimit))) {
        nextErrors.creditLimit = "Credit limit is required";
      } else if (Number(f.creditLimit) < 0) {
        nextErrors.creditLimit = "Credit limit cannot be negative";
      }

      if (f.outstanding === "" || Number.isNaN(Number(f.outstanding))) {
        nextErrors.outstanding = "Outstanding is required";
      } else if (Number(f.outstanding) < 0) {
        nextErrors.outstanding = "Outstanding cannot be negative";
      }
    }

    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const inputClass = (field) =>
    `w-full rounded-md border px-3 py-2 text-sm outline-none ${
      errors[field]
        ? "border-red-500 focus:border-red-500"
        : "border-gray-300 focus:border-gray-400"
    }`;

  const handleSave = () => {
    if (!validate()) return;

    onSave({
      ...f,
      name: String(f.name || "").trim(),
      mobile: String(f.mobile || "").trim(),
      altMobile: String(f.altMobile || "").trim(),
      gstin: String(f.gstin || "").trim().toUpperCase(),
      address: String(f.address || "").trim(),
      city: String(f.city || "").trim(),
      pin: String(f.pin || "").trim(),
      creditLimit: isCustomer ? Number(f.creditLimit || 0) : 0,
      outstanding: isCustomer ? Number(f.outstanding || 0) : 0,
    });
  };

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">
            Name *
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
          <label className="block text-xs font-medium text-gray-600 mb-1">
            Mobile *
          </label>
          <input
            className={inputClass("mobile")}
            value={f.mobile}
            maxLength={10}
            onChange={(e) => {
              const value = e.target.value;
              if (isDigitsOnly(value)) {
                set("mobile", value);
                if (errors.mobile) {
                  setErrors((prev) => ({ ...prev, mobile: "" }));
                }
              }
            }}
          />
          {errors.mobile && (
            <p className="mt-1 text-xs text-red-600">{errors.mobile}</p>
          )}
        </div>

        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">
            Alternative Mobile
          </label>
          <input
            className={inputClass("altMobile")}
            value={f.altMobile || ""}
            maxLength={10}
            placeholder="Optional"
            onChange={(e) => {
              const value = e.target.value;
              if (isDigitsOnly(value)) {
                set("altMobile", value);
                if (errors.altMobile) {
                  setErrors((prev) => ({ ...prev, altMobile: "" }));
                }
              }
            }}
          />
          {errors.altMobile && (
            <p className="mt-1 text-xs text-red-600">{errors.altMobile}</p>
          )}
        </div>

        <div>
          <Input
            label="GSTIN"
            value={f.gstin}
            onChange={(e) => {
              set("gstin", e.target.value.toUpperCase());
              setGstinValid(null);
            }}
            onBlur={checkGstin}
            maxLength={15}
          />
          {gstinValid && (
            <p
              className={`text-xs mt-1 ${
                gstinValid.valid ? "text-emerald-600" : "text-red-500"
              }`}
            >
              {gstinValid.msg}
            </p>
          )}
        </div>

        <Select
          label="State"
          options={STATES.map((s) => ({
            value: s.code,
            label: `${s.name} (${s.code})`,
          }))}
          value={f.state}
          onChange={(e) => set("state", e.target.value)}
        />

        <div className="sm:col-span-2">
          <label className="block text-xs font-medium text-gray-600 mb-1">
            Address *
          </label>
          <input
            className={inputClass("address")}
            value={f.address}
            onChange={(e) => {
              set("address", e.target.value);
              if (errors.address) {
                setErrors((prev) => ({ ...prev, address: "" }));
              }
            }}
          />
          {errors.address && (
            <p className="mt-1 text-xs text-red-600">{errors.address}</p>
          )}
        </div>

        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">
            City *
          </label>
          <input
            className={inputClass("city")}
            value={f.city}
            placeholder="e.g., NAGERCOIL"
            onChange={(e) => {
              set("city", e.target.value);
              if (errors.city) setErrors((prev) => ({ ...prev, city: "" }));
            }}
          />
          {errors.city && (
            <p className="mt-1 text-xs text-red-600">{errors.city}</p>
          )}
        </div>

        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">
            Postal Code *
          </label>
          <input
            className={inputClass("pin")}
            value={f.pin}
            maxLength={6}
            placeholder="e.g., 629001"
            onChange={(e) => {
              const value = e.target.value;
              if (isDigitsOnly(value)) {
                set("pin", value);
                if (errors.pin) setErrors((prev) => ({ ...prev, pin: "" }));
              }
            }}
          />
          {errors.pin && (
            <p className="mt-1 text-xs text-red-600">{errors.pin}</p>
          )}
        </div>

        {isCustomer && (
          <>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">
                Credit Limit (₹)
              </label>
              <input
                type="number"
                min="0"
                className={inputClass("creditLimit")}
                value={f.creditLimit}
                onChange={(e) => {
                  const value = e.target.value;
                  set(
                    "creditLimit",
                    value === "" ? "" : String(Math.max(0, Number(value)))
                  );
                  if (errors.creditLimit) {
                    setErrors((prev) => ({ ...prev, creditLimit: "" }));
                  }
                }}
              />
              {errors.creditLimit && (
                <p className="mt-1 text-xs text-red-600">
                  {errors.creditLimit}
                </p>
              )}
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">
                Outstanding (₹)
              </label>
              <input
                type="number"
                min="0"
                className={inputClass("outstanding")}
                value={f.outstanding}
                onChange={(e) => {
                  const value = e.target.value;
                  set(
                    "outstanding",
                    value === "" ? "" : String(Math.max(0, Number(value)))
                  );
                  if (errors.outstanding) {
                    setErrors((prev) => ({ ...prev, outstanding: "" }));
                  }
                }}
              />
              {errors.outstanding && (
                <p className="mt-1 text-xs text-red-600">
                  {errors.outstanding}
                </p>
              )}
            </div>
          </>
        )}
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