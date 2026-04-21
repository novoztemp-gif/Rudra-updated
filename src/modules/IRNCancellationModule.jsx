import { useEffect, useMemo, useState } from "react";
import { formatCurrency, formatDate } from "../utils/formatters";
import { Badge } from "../components/ui/Badge";
import { Button } from "../components/ui/Button";
import { Card } from "../components/ui/Card";
import { EmptyState } from "../components/ui/EmptyState";
import { Input } from "../components/ui/Input";
import { Modal } from "../components/ui/Modal";
import { Icons } from "../components/ui/Icons";
import * as irnCancellationsService from "../services/irnCancellations";

const CANCEL_REASONS = [
  { value: "1", label: "Duplicate" },
  { value: "2", label: "Data Entry Mistake" },
];

const isWithin24Hours = (ackDate) => {
  if (!ackDate) return false;
  const diffMs = new Date() - new Date(ackDate);
  return diffMs <= 24 * 60 * 60 * 1000;
};

const hasActiveEWB = (invoice) => {
  return invoice.ewbSigned && invoice.ewbNo && invoice.ewbStatus !== "CNL";
};

const buildCancellationJSON = (invoice, reasonCode, remarks) => ({
  Version: "1.01",
  Irn: invoice.irn,
  CnlRsn: reasonCode,
  CnlRem: remarks || "",
});

const downloadJSON = (invoices, reasonCode, remarks) => {
  const payload = invoices.map((inv) =>
    buildCancellationJSON(inv, reasonCode, remarks)
  );

  const finalPayload = payload.length === 1 ? payload[0] : payload;

  const blob = new Blob([JSON.stringify(finalPayload, null, 2)], {
    type: "application/json",
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;

  if (invoices.length === 1) {
    a.download = `IRN-Cancel_${invoices[0].invoiceNo}.json`;
  } else {
    a.download = `IRN-Cancel_Bulk_${invoices.length}.json`;
  }

  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
};

export const IRNCancellationModule = ({ invoices }) => {
  const [selected, setSelected] = useState(new Set());
  const [requests, setRequests] = useState([]);
  const [modalInvoices, setModalInvoices] = useState([]);
  const [reasonCode, setReasonCode] = useState("1");
  const [remarks, setRemarks] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const loadRequests = async () => {
      try {
        const data = await irnCancellationsService.getAll();
        setRequests(data);
      } catch (err) {
        console.error("Failed to load cancellation requests:", err);
      }
    };
    loadRequests();
  }, []);

  const latestRequestByInvoice = useMemo(() => {
    const map = {};
    for (const req of requests) {
      if (!map[req.invoiceId]) {
        map[req.invoiceId] = req;
      }
    }
    return map;
  }, [requests]);

  const eligibleInvoices = useMemo(() => {
    return invoices.filter((inv) => {
      if (!inv.irn) return false;
      if (!isWithin24Hours(inv.ackDate)) return false;
      if (hasActiveEWB(inv)) return false;
      return true;
    });
  }, [invoices]);

  const allSelected =
    eligibleInvoices.length > 0 && selected.size === eligibleInvoices.length;

  const toggleOne = (id) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (allSelected) {
      setSelected(new Set());
    } else {
      setSelected(new Set(eligibleInvoices.map((inv) => inv.id)));
    }
  };

  const openSingleModal = (invoice) => {
    setModalInvoices([invoice]);
    setReasonCode("1");
    setRemarks("");
  };

  const openBulkModal = () => {
    const selectedInvoices = eligibleInvoices.filter((inv) => selected.has(inv.id));
    if (selectedInvoices.length === 0) return;
    setModalInvoices(selectedInvoices);
    setReasonCode("1");
    setRemarks("");
  };

  const handleGenerate = async () => {
    if (modalInvoices.length === 0) return;
    if (!reasonCode) {
      alert("Please select a cancellation reason");
      return;
    }

    try {
      setSaving(true);

      const createdRows = [];

      for (const inv of modalInvoices) {
        const requestJson = buildCancellationJSON(inv, reasonCode, remarks);

        const created = await irnCancellationsService.create({
          invoiceId: inv.id,
          invoiceNo: inv.invoiceNo,
          irn: inv.irn,
          version: "1.01",
          cancelReasonCode: reasonCode,
          cancelReasonText: remarks,
          requestJson,
          requestGenerated: true,
          requestGeneratedAt: new Date().toISOString(),
          status: "json_generated",
        });

        createdRows.push(created);
      }

      setRequests((prev) => [...createdRows, ...prev]);
      downloadJSON(modalInvoices, reasonCode, remarks);

      alert(
        modalInvoices.length === 1
          ? `Cancellation JSON generated for Invoice #${modalInvoices[0].invoiceNo}`
          : `Bulk cancellation JSON generated for ${modalInvoices.length} invoices`
      );

      setSelected(new Set());
      setModalInvoices([]);
      setReasonCode("1");
      setRemarks("");
    } catch (err) {
      alert(`Error: ${err.message}`);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-4">
      {eligibleInvoices.length === 0 ? (
        <Card>
          <EmptyState
            icon={<Icons.file size={40} />}
            title="No Eligible Invoices"
            description="Only invoices with IRN, within 24 hours, and without active E-Way Bill can be cancelled."
          />
        </Card>
      ) : (
        <Card
          title="IRN Cancellation"
          actions={
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <input
                  type="checkbox"
                  checked={allSelected}
                  onChange={toggleSelectAll}
                  className="w-4 h-4 rounded border-gray-300 text-gray-900 focus:ring-gray-500 cursor-pointer"
                />
                <span>
                  {selected.size > 0
                    ? `${selected.size} selected`
                    : `Select all (${eligibleInvoices.length})`}
                </span>
              </div>
              <Button
                onClick={openBulkModal}
                disabled={selected.size === 0}
              >
                <Icons.download size={14} /> Generate Cancellation JSON ({selected.size})
              </Button>
            </div>
          }
        >
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50">
                  <th className="w-10 px-4 py-3"></th>
                  <th className="px-4 py-3 text-left font-medium text-gray-700">
                    Invoice #
                  </th>
                  <th className="px-4 py-3 text-left font-medium text-gray-700">
                    Date
                  </th>
                  <th className="px-4 py-3 text-left font-medium text-gray-700">
                    IRN
                  </th>
                  <th className="px-4 py-3 text-right font-medium text-gray-700">
                    Total
                  </th>
                  <th className="px-4 py-3 text-left font-medium text-gray-700">
                    EWB
                  </th>
                  <th className="px-4 py-3 text-left font-medium text-gray-700">
                    Status
                  </th>
                  <th className="px-4 py-3 text-left font-medium text-gray-700">
                    Action
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {eligibleInvoices.map((inv) => {
                  const existingReq = latestRequestByInvoice[inv.id];

                  return (
                    <tr key={inv.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-4 py-3">
                        <input
                          type="checkbox"
                          checked={selected.has(inv.id)}
                          onChange={() => toggleOne(inv.id)}
                          className="w-4 h-4 rounded border-gray-300 text-gray-900 focus:ring-gray-500 cursor-pointer"
                        />
                      </td>
                      <td className="px-4 py-3 font-mono font-medium">
                        {inv.invoiceNo}
                      </td>
                      <td className="px-4 py-3 text-gray-600">
                        {formatDate(inv.date)}
                      </td>
                      <td className="px-4 py-3">
                        <span className="font-mono text-xs text-gray-700">
                          {inv.irn?.substring(0, 18)}...
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right font-semibold">
                        {formatCurrency(inv.total)}
                      </td>
                      <td className="px-4 py-3">
                        {hasActiveEWB(inv) ? (
                          <Badge variant="danger">Active EWB</Badge>
                        ) : (
                          <Badge variant="success">No Active EWB</Badge>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        {existingReq ? (
                          <Badge variant="success">Cancel JSON Ready</Badge>
                        ) : (
                          <Badge variant="warning">Pending</Badge>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <Button
                          size="sm"
                          variant="primary"
                          onClick={() => openSingleModal(inv)}
                        >
                          <Icons.download size={14} />{" "}
                          {existingReq ? "Generate Again" : "Generate JSON"}
                        </Button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      <Modal
        open={modalInvoices.length > 0}
        onClose={() => setModalInvoices([])}
        title={
          modalInvoices.length === 1
            ? `IRN Cancellation - Invoice #${modalInvoices[0]?.invoiceNo}`
            : `IRN Cancellation - ${modalInvoices.length} Invoices`
        }
        size="lg"
      >
        {modalInvoices.length > 0 && (
          <div className="space-y-4">
            <div className="p-3 bg-gray-50 rounded text-sm">
              {modalInvoices.length === 1 ? (
                <>
                  <div>
                    Invoice:{" "}
                    <span className="font-mono font-medium">
                      {modalInvoices[0].invoiceNo}
                    </span>
                  </div>
                  <div>
                    IRN:{" "}
                    <span className="font-mono text-xs text-gray-700">
                      {modalInvoices[0].irn}
                    </span>
                  </div>
                  <div>
                    Ack Date:{" "}
                    {modalInvoices[0].ackDate
                      ? formatDate(modalInvoices[0].ackDate)
                      : "—"}
                  </div>
                </>
              ) : (
                <div>
                  <div className="font-medium mb-1">
                    {modalInvoices.length} invoices selected for bulk cancellation request JSON
                  </div>
                  <div className="text-xs text-gray-600">
                    Same reason and remarks will be applied to all selected invoices.
                  </div>
                </div>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Cancellation Reason *
              </label>
              <select
                value={reasonCode}
                onChange={(e) => setReasonCode(e.target.value)}
                className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
              >
                {CANCEL_REASONS.map((r) => (
                  <option key={r.value} value={r.value}>
                    {r.label}
                  </option>
                ))}
              </select>
            </div>

            <Input
              label="Remarks"
              value={remarks}
              onChange={(e) => setRemarks(e.target.value)}
              placeholder="Enter remarks"
            />

            <div className="flex justify-end gap-2 pt-2">
              <Button
                variant="secondary"
                onClick={() => setModalInvoices([])}
              >
                Cancel
              </Button>
              <Button onClick={handleGenerate} disabled={saving}>
                <Icons.download size={14} />{" "}
                {saving
                  ? "Generating..."
                  : modalInvoices.length === 1
                  ? "Generate Cancellation JSON"
                  : `Generate Bulk JSON (${modalInvoices.length})`}
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};