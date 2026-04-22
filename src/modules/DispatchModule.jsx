// ═══════════════════════════════════════════════════════════════════════════════
// MODULE 8: DISPATCH & DELIVERY
// ═══════════════════════════════════════════════════════════════════════════════
import { useState } from "react";
import { Badge } from "../components/ui/Badge";
import { Button } from "../components/ui/Button";
import { Card } from "../components/ui/Card";
import { Input } from "../components/ui/Input";
import { Modal } from "../components/ui/Modal";
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
                key={row.id || row.dispatchNo || rowIndex}
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

export const DispatchModule = ({
  invoices,
  dispatches,
  setDispatches,
  showToast,
}) => {
  const [showForm, setShowForm] = useState(false);

  const saveDispatch = (data) => {
    setDispatches((prev) => [
      {
        ...data,
        status: "dispatched",
      },
      ...prev,
    ]);
    setShowForm(false);
    showToast?.("Dispatch created successfully", "success");
  };

  const markDelivered = (dispatchId) => {
    setDispatches((prev) =>
      prev.map((d) =>
        d.id === dispatchId ? { ...d, status: "delivered" } : d
      )
    );
    showToast?.("Dispatch marked as delivered", "success");
  };

  return (
    <div>
      <Card
        title="Dispatch & Delivery"
        actions={
          <Button size="sm" onClick={() => setShowForm(true)}>
            <Icons.plus size={14} /> New Dispatch
          </Button>
        }
      >
        <StyledTable
          columns={[
            {
              key: "dispatchNo",
              label: "Dispatch #",
              render: (r) => <span className="font-mono">{r.dispatchNo}</span>,
            },
            { key: "invoiceNo", label: "Invoice #" },
            { key: "vehicleNo", label: "Vehicle" },
            { key: "destination", label: "Destination" },
            { key: "deliveryTerms", label: "Terms" },
            {
              key: "status",
              label: "Status",
              render: (r) => (
                <Badge variant={r.status === "delivered" ? "success" : "info"}>
                  {r.status}
                </Badge>
              ),
            },
            {
              key: "actions",
              label: "",
              render: (r) =>
                r.status !== "delivered" ? (
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => markDelivered(r.id)}
                  >
                    <Icons.check size={14} /> Delivered
                  </Button>
                ) : null,
            },
          ]}
          data={[...dispatches].sort((a, b) => {
            const bNo =
              Number(String(b.dispatchNo || "").replace("DSP-", "")) || 0;
            const aNo =
              Number(String(a.dispatchNo || "").replace("DSP-", "")) || 0;
            return bNo - aNo;
          })}
          emptyMsg="No dispatches"
        />
      </Card>

      <Modal
        open={showForm}
        onClose={() => setShowForm(false)}
        title="New Dispatch"
        size="md"
      >
        <DispatchForm
          invoices={invoices}
          dispatches={dispatches}
          onSave={saveDispatch}
          onCancel={() => setShowForm(false)}
          showToast={showToast}
        />
      </Modal>
    </div>
  );
};

export const DispatchForm = ({
  invoices,
  dispatches,
  onSave,
  onCancel,
  showToast,
}) => {
  const [f, setF] = useState({
    invoiceId: "",
    vehicleNo: "",
    destination: "",
    deliveryTerms: "",
    transportDetails: "",
  });

  const inv = invoices.find((i) => i.id === f.invoiceId);
  const set = (k, v) => setF((p) => ({ ...p, [k]: v }));

  const nextDispatchNo = (() => {
    const maxNo = dispatches.reduce((max, d) => {
      const num = parseInt(String(d.dispatchNo || "").replace("DSP-", ""), 10);
      return Number.isNaN(num) ? max : Math.max(max, num);
    }, 0);

    return `DSP-${String(maxNo + 1).padStart(4, "0")}`;
  })();

  const invoiceOptions = invoices.map((i) => {
    const alreadyDispatched = dispatches.some((d) => d.invoiceId === i.id);

    return {
      value: i.id,
      label: alreadyDispatched
        ? `#${i.invoiceNo} — Already Dispatched`
        : `#${i.invoiceNo}`,
      disabled: alreadyDispatched,
    };
  });

  const handleSave = () => {
    if (!f.invoiceId) {
      showToast?.("Select an invoice", "warning");
      return;
    }

    const alreadyDispatched = dispatches.some(
      (d) => d.invoiceId === f.invoiceId
    );

    if (alreadyDispatched) {
      showToast?.("This invoice is already dispatched", "warning");
      return;
    }

    onSave({
      dispatchNo: nextDispatchNo,
      invoiceId: f.invoiceId,
      invoiceNo: inv?.invoiceNo || "",
      vehicleNo: f.vehicleNo,
      destination: f.destination,
      deliveryTerms: f.deliveryTerms,
      transportDetails: f.transportDetails,
    });
  };

  return (
    <div className="space-y-3">
      <Select
        label="Invoice"
        options={invoiceOptions}
        value={f.invoiceId}
        onChange={(e) => set("invoiceId", e.target.value)}
      />

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <Input
          label="Vehicle No."
          value={f.vehicleNo}
          onChange={(e) => set("vehicleNo", e.target.value.toUpperCase())}
        />
        <Input
          label="Destination"
          value={f.destination}
          onChange={(e) => set("destination", e.target.value)}
        />
        <Input
          label="Delivery Terms"
          value={f.deliveryTerms}
          onChange={(e) => set("deliveryTerms", e.target.value)}
        />
        <Input
          label="Transport Details"
          value={f.transportDetails}
          onChange={(e) => set("transportDetails", e.target.value)}
        />
      </div>

      <div className="flex justify-end gap-2">
        <Button variant="secondary" onClick={onCancel}>
          Cancel
        </Button>
        <Button onClick={handleSave} disabled={!f.invoiceId}>
          <Icons.check size={14} /> Save
        </Button>
      </div>
    </div>
  );
};