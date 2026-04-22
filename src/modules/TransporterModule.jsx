// ═══════════════════════════════════════════════════════════════════════════════
// MODULE: TRANSPORTER MANAGEMENT
// ═══════════════════════════════════════════════════════════════════════════════

import { useMemo, useState } from "react";
import { generateId } from "../utils/helpers";
import { validateGSTIN } from "../utils/validators";
import { STATES } from "../constants";
import { Button } from "../components/ui/Button";
import { Card } from "../components/ui/Card";
import { Input } from "../components/ui/Input";
import { Modal } from "../components/ui/Modal";
import { SearchBar } from "../components/ui/SearchBar";
import { Select } from "../components/ui/Select";
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
                key={row.id || row.transId || row.transName || rowIndex}
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

export const TransporterModule = ({
  transporters,
  setTransporters,
  showToast,
}) => {
  const [showForm, setShowForm] = useState(false);
  const [editEntity, setEditEntity] = useState(null);
  const [search, setSearch] = useState("");
  const [deleteTransporterModal, setDeleteTransporterModal] = useState(null);

  const filtered = useMemo(() => {
    return transporters.filter(
      (t) =>
        String(t.transName || "")
          .toLowerCase()
          .includes(search.toLowerCase()) ||
        String(t.transId || "").includes(search) ||
        String(t.contact || "").includes(search)
    );
  }, [transporters, search]);

  const saveTransporter = (entity) => {
    if (editEntity) {
      setTransporters((prev) =>
        prev.map((t) => (t.id === editEntity.id ? { ...t, ...entity } : t))
      );
      showToast?.("Transporter updated successfully", "success");
    } else {
      setTransporters((prev) => [...prev, { ...entity, id: generateId() }]);
      showToast?.("Transporter added successfully", "success");
    }
    setShowForm(false);
    setEditEntity(null);
  };

  const confirmDeleteTransporter = () => {
    if (!deleteTransporterModal) return;
    setTransporters((prev) =>
      prev.filter((t) => t.id !== deleteTransporterModal.id)
    );
    showToast?.("Transporter deleted successfully", "success");
    setDeleteTransporterModal(null);
  };

  return (
    <div>
      <Card
        title="Transporter Master"
        actions={
          <div className="flex gap-2">
            <SearchBar
              value={search}
              onChange={setSearch}
              placeholder="Search transporter..."
            />
            <Button
              size="sm"
              onClick={() => {
                setEditEntity(null);
                setShowForm(true);
              }}
            >
              <Icons.plus size={14} /> Add Transporter
            </Button>
          </div>
        }
      >
        <StyledTable
          columns={[
            {
              key: "transName",
              label: "Name",
              render: (r) => (
                <span className="font-medium">{r.transName}</span>
              ),
            },
            {
              key: "transId",
              label: "GSTIN",
              render: (r) => (
                <span className="font-mono text-xs">{r.transId || "—"}</span>
              ),
            },
            { key: "contact", label: "Contact" },
            {
              key: "email",
              label: "Email",
              render: (r) => (
                <span className="text-sm text-gray-600">{r.email || "—"}</span>
              ),
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
            {
              key: "actions",
              label: "",
              render: (r) => (
                <div className="flex items-center gap-1">
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
                    onClick={() => setDeleteTransporterModal(r)}
                  >
                    <Icons.trash size={14} />
                  </Button>
                </div>
              ),
            },
          ]}
          data={filtered}
          emptyMsg="No transporters yet"
        />
      </Card>

      <Modal
        open={showForm}
        onClose={() => {
          setShowForm(false);
          setEditEntity(null);
        }}
        title={`${editEntity ? "Edit" : "Add"} Transporter`}
      >
        <TransporterForm
          entity={editEntity}
          onSave={saveTransporter}
          onCancel={() => {
            setShowForm(false);
            setEditEntity(null);
          }}
        />
      </Modal>

      <Modal
        open={!!deleteTransporterModal}
        onClose={() => setDeleteTransporterModal(null)}
        title="Delete Transporter"
        size="sm"
      >
        <div className="space-y-4">
          <div className="text-sm text-gray-700">
            Are you sure you want to delete{" "}
            <span className="font-semibold">
              {deleteTransporterModal?.transName}
            </span>
            ?
          </div>

          <div className="flex justify-end gap-2">
            <Button
              variant="secondary"
              onClick={() => setDeleteTransporterModal(null)}
            >
              Cancel
            </Button>
            <Button variant="danger" onClick={confirmDeleteTransporter}>
              Delete
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

const TransporterForm = ({ entity, onSave, onCancel }) => {
  const [f, setF] = useState(
    entity || {
      transName: "",
      transId: "",
      contact: "",
      email: "",
      address: "",
      state: "33",
    }
  );

  const [errors, setErrors] = useState({});
  const [gstinValid, setGstinValid] = useState(null);

  const set = (k, v) => setF((p) => ({ ...p, [k]: v }));
  const isDigitsOnly = (value) => /^\d*$/.test(value);

  const checkGstin = () => {
    if (f.transId) setGstinValid(validateGSTIN(f.transId));
  };

  const validate = () => {
    const nextErrors = {};

    if (!String(f.transName || "").trim()) {
      nextErrors.transName = "Transporter name is required";
    }

    if (!String(f.transId || "").trim()) {
      nextErrors.transId = "GSTIN is required";
    }

    if (!String(f.contact || "").trim()) {
      nextErrors.contact = "Contact number is required";
    } else if (!/^\d{10}$/.test(String(f.contact))) {
      nextErrors.contact = "Contact number must be 10 digits";
    }

    if (!String(f.address || "").trim()) {
      nextErrors.address = "Address is required";
    }

    if (String(f.email || "").trim()) {
      const emailOk = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(f.email).trim());
      if (!emailOk) {
        nextErrors.email = "Enter a valid email address";
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
      transName: String(f.transName || "").trim(),
      transId: String(f.transId || "").trim().toUpperCase(),
      contact: String(f.contact || "").trim(),
      email: String(f.email || "").trim(),
      address: String(f.address || "").trim(),
    });
  };

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">
            Transporter Name *
          </label>
          <input
            className={inputClass("transName")}
            value={f.transName}
            placeholder="e.g., ABC Transport Ltd"
            onChange={(e) => {
              set("transName", e.target.value);
              if (errors.transName) {
                setErrors((prev) => ({ ...prev, transName: "" }));
              }
            }}
          />
          {errors.transName && (
            <p className="mt-1 text-xs text-red-600">{errors.transName}</p>
          )}
        </div>

        <div>
          <Input
            label="GSTIN (Transporter ID) *"
            value={f.transId}
            onChange={(e) => {
              set("transId", e.target.value.toUpperCase());
              setGstinValid(null);
              if (errors.transId) {
                setErrors((prev) => ({ ...prev, transId: "" }));
              }
            }}
            onBlur={checkGstin}
            maxLength={15}
            placeholder="15-digit GSTIN"
          />
          {errors.transId && (
            <p className="mt-1 text-xs text-red-600">{errors.transId}</p>
          )}
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

        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">
            Contact No *
          </label>
          <input
            className={inputClass("contact")}
            value={f.contact}
            placeholder="10-digit mobile"
            maxLength={10}
            onChange={(e) => {
              const value = e.target.value;
              if (isDigitsOnly(value)) {
                set("contact", value);
                if (errors.contact) {
                  setErrors((prev) => ({ ...prev, contact: "" }));
                }
              }
            }}
          />
          {errors.contact && (
            <p className="mt-1 text-xs text-red-600">{errors.contact}</p>
          )}
        </div>

        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">
            Email
          </label>
          <input
            type="email"
            className={inputClass("email")}
            value={f.email}
            placeholder="contact@transport.in"
            onChange={(e) => {
              set("email", e.target.value);
              if (errors.email) {
                setErrors((prev) => ({ ...prev, email: "" }));
              }
            }}
          />
          {errors.email && (
            <p className="mt-1 text-xs text-red-600">{errors.email}</p>
          )}
        </div>

        <div className="sm:col-span-2">
          <label className="block text-xs font-medium text-gray-600 mb-1">
            Address *
          </label>
          <input
            className={inputClass("address")}
            value={f.address}
            placeholder="Full address"
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

        <Select
          label="State *"
          options={STATES.map((s) => ({
            value: s.code,
            label: `${s.name} (${s.code})`,
          }))}
          value={f.state}
          onChange={(e) => set("state", e.target.value)}
        />
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