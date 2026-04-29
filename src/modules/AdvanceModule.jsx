import { useMemo, useState } from "react";
import { formatCurrency, formatDate } from "../utils/formatters";
import { Badge } from "../components/ui/Badge";
import { Button } from "../components/ui/Button";
import { Card } from "../components/ui/Card";
import { Modal } from "../components/ui/Modal";
import { Icons } from "../components/ui/Icons";
import * as invoicesService from "../services/invoices";

const StyledTable = ({ columns, data, emptyMsg = "No data available" }) => {
  return (
    <div className="overflow-x-auto rounded-xl border border-gray-200">
      <table className="w-full border-collapse text-sm">
        <thead>
          <tr className="bg-gray-50">
            {columns.map((col, idx) => (
              <th
                key={col.key}
                className={`px-4 py-3 text-left font-semibold text-gray-700 border-b border-gray-200 ${idx !== columns.length - 1 ? "border-r border-gray-200" : ""
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
                    className={`px-4 py-3 border-b border-gray-100 ${colIndex !== columns.length - 1
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

const getPaymentStatus = (paidAmount, totalAmount) => {
  const paid = Number(paidAmount || 0);
  const total = Number(totalAmount || 0);

  if (total > 0 && paid >= total) return "paid";
  if (paid > 0) return "partial";
  return "pending";
};

const getStatusBadge = (status) => {
  if (status === "paid") {
    return <Badge variant="success">Fully Paid</Badge>;
  }

  if (status === "partial") {
    return <Badge variant="warning">Advance Paid</Badge>;
  }

  return <Badge>Pending</Badge>;
};

export const AdvanceModule = ({ invoices, customers, setInvoices, showToast }) => {
  const [editInvoice, setEditInvoice] = useState(null);
  const [advanceAmount, setAdvanceAmount] = useState("");

  const retailInvoices = useMemo(() => {
    return invoices
      .filter((inv) => inv.invoiceType === "retail")
      .sort((a, b) => {
        const bNo = Number(b.invoiceNo || 0);
        const aNo = Number(a.invoiceNo || 0);
        return bNo - aNo;
      });
  }, [invoices]);

  const openAdvanceModal = (invoice) => {
    setEditInvoice(invoice);
    setAdvanceAmount(String(Number(invoice.advancePaid || 0)));
  };

  const closeAdvanceModal = () => {
    setEditInvoice(null);
    setAdvanceAmount("");
  };

  const saveAdvanceAmount = async () => {
    if (!editInvoice) return;

    const total = Number(editInvoice.total || 0);
    const paid = Math.min(Math.max(Number(advanceAmount || 0), 0), total);
    const due = Math.max(total - paid, 0);
    const paymentStatus = getPaymentStatus(paid, total);

    const updatedFields = {
      advancePaid: paid,
      amountDue: due,
      paymentStatus,
    };

    try {
      await invoicesService.update(editInvoice.id, updatedFields);

      setInvoices((prev) =>
        prev.map((inv) =>
          inv.id === editInvoice.id
            ? { ...inv, ...updatedFields, __skipSync: true }
            : inv
        )
      );

      showToast?.("Advance amount updated successfully", "success");
      closeAdvanceModal();
    } catch (err) {
      showToast?.(`Error updating advance amount: ${err.message}`, "error");
    }
  };

  const markFullyPaid = async (invoice) => {
    const total = Number(invoice.total || 0);

    const updatedFields = {
      advancePaid: total,
      amountDue: 0,
      paymentStatus: "paid",
    };

    try {
      await invoicesService.update(invoice.id, updatedFields);

      setInvoices((prev) =>
        prev.map((inv) =>
          inv.id === invoice.id
            ? { ...inv, ...updatedFields, __skipSync: true }
            : inv
        )
      );

      showToast?.(`Invoice #${invoice.invoiceNo} marked as fully paid`, "success");
    } catch (err) {
      showToast?.(`Error marking invoice as paid: ${err.message}`, "error");
    }
  };

  return (
    <div className="space-y-4">
      <Card title="Advance Payment Management">
        <div className="p-4 text-sm text-gray-600">
          Select a retail invoice, enter the advance amount paid, and track the
          remaining amount due.
        </div>

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
              render: (inv) => formatDate(inv.date),
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
              key: "total",
              label: "Total Amount",
              align: "right",
              render: (inv) => (
                <span className="font-semibold">
                  {formatCurrency(inv.total)}
                </span>
              ),
            },
            {
              key: "advancePaid",
              label: "Advance Paid",
              align: "right",
              render: (inv) => formatCurrency(Number(inv.advancePaid || 0)),
            },
            {
              key: "amountDue",
              label: "Amount Due",
              align: "right",
              render: (inv) => {
                const due =
                  inv.amountDue !== undefined && inv.amountDue !== null
                    ? Number(inv.amountDue)
                    : Math.max(Number(inv.total || 0) - Number(inv.advancePaid || 0), 0);

                return (
                  <span className={due > 0 ? "font-semibold text-red-700" : "font-semibold text-green-700"}>
                    {formatCurrency(due)}
                  </span>
                );
              },
            },
            {
              key: "paymentStatus",
              label: "Status",
              render: (inv) => {
                const status =
                  inv.paymentStatus ||
                  getPaymentStatus(inv.advancePaid, inv.total);

                return getStatusBadge(status);
              },
            },
            {
              key: "actions",
              label: "Actions",
              render: (inv) => {
                const total = Number(inv.total || 0);
                const paid = Number(inv.advancePaid || 0);
                const isFullyPaid = paid >= total && total > 0;

                return (
                  <div className="flex items-center gap-2 flex-wrap">
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => openAdvanceModal(inv)}
                    >
                      <Icons.edit size={14} /> Edit Advance
                    </Button>

                    {!isFullyPaid && (
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => markFullyPaid(inv)}
                        className="border border-gray-300"
                      >
                        <Icons.check size={14} /> Fully Paid
                      </Button>
                    )}
                  </div>
                );
              },
            },
          ]}
          data={retailInvoices}
          emptyMsg="No retail invoices available."
        />
      </Card>

      <Modal
        open={!!editInvoice}
        onClose={closeAdvanceModal}
        title={`Edit Advance - Invoice #${editInvoice?.invoiceNo}`}
        size="md"
      >
        {editInvoice && (
          <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-sm">
              <div className="p-3 bg-gray-50 rounded">
                <div className="text-xs text-gray-500">Invoice Total</div>
                <div className="font-semibold">
                  {formatCurrency(editInvoice.total)}
                </div>
              </div>

              <div className="p-3 bg-gray-50 rounded">
                <div className="text-xs text-gray-500">Current Paid</div>
                <div className="font-semibold">
                  {formatCurrency(editInvoice.advancePaid || 0)}
                </div>
              </div>

              <div className="p-3 bg-gray-50 rounded">
                <div className="text-xs text-gray-500">Current Due</div>
                <div className="font-semibold">
                  {formatCurrency(
                    editInvoice.amountDue !== undefined
                      ? editInvoice.amountDue
                      : Number(editInvoice.total || 0) -
                      Number(editInvoice.advancePaid || 0)
                  )}
                </div>
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">
                Advance Amount Paid
              </label>
              <input
                type="number"
                min="0"
                max={Number(editInvoice.total || 0)}
                value={advanceAmount}
                onChange={(e) => {
                  const value = e.target.value;
                  const total = Number(editInvoice.total || 0);

                  if (value === "") {
                    setAdvanceAmount("");
                    return;
                  }

                  setAdvanceAmount(String(Math.min(Math.max(Number(value), 0), total)));
                }}
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm outline-none focus:border-gray-400"
                placeholder="Enter amount paid"
              />
              <div className="mt-1 text-xs text-gray-500">
                Amount due after save:{" "}
                <strong>
                  {formatCurrency(
                    Math.max(
                      Number(editInvoice.total || 0) - Number(advanceAmount || 0),
                      0
                    )
                  )}
                </strong>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button variant="secondary" onClick={closeAdvanceModal}>
                Cancel
              </Button>

              <Button
                variant="ghost"
                onClick={() => {
                  setAdvanceAmount(String(Number(editInvoice.total || 0)));
                }}
                className="border border-gray-300"
              >
                Mark Full Amount
              </Button>

              <Button onClick={saveAdvanceAmount}>
                <Icons.check size={14} /> Save
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};