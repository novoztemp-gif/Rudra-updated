// ═══════════════════════════════════════════════════════════════════════════════
// MODULE: E-WAY BILL PIPELINE
// ═══════════════════════════════════════════════════════════════════════════════

import { useState } from "react";
import { formatCurrency, formatDate } from "../utils/formatters";
import { today } from "../utils/helpers";
import { Badge } from "../components/ui/Badge";
import { Button } from "../components/ui/Button";
import { Card } from "../components/ui/Card";
import { Input } from "../components/ui/Input";
import { Modal } from "../components/ui/Modal";
import { Select } from "../components/ui/Select";
import { Icons } from "../components/ui/Icons";
import * as invoicesService from "../services/invoices";

// ─── GENERATE E-WAY BILL JSON ───────────────────────────────────────────────

const buildEWayBillJSON = (form) => {
  const distance = form.distance ? parseFloat(form.distance) : null;
  if (!distance || isNaN(distance)) {
    throw new Error("Distance must be a valid number");
  }
  return {
    Irn: form.irn,
    TransId: form.transId,
    TransName: form.transName,
    TransMode: form.transMode,
    Distance: distance,
    TransDocNo: form.transDocNo,
    TransDocDt: form.transDocDt,
    VehNo: form.vehicleNo,
    VehType: form.vehicleType
  };
};

// ─── VALIDITY CALCULATION ───────────────────────────────────────────────────

const getValidityDays = (distance) => {
  const d = parseFloat(distance);
  if (d <= 100) return 1;
  if (d <= 250) return 3;
  if (d <= 500) return 5;
  if (d <= 1000) return 10;
  return 15;
};

// ─── DOWNLOAD HELPER ────────────────────────────────────────────────────────

const downloadJSON = (inv) => {
  if (!inv.ewbJson) return;
  const blob = new Blob([JSON.stringify(inv.ewbJson, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `eway-bill-${inv.invoiceNo}-${today()}.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
};

// ═══════════════════════════════════════════════════════════════════════════════

export const EWayModule = ({ invoices, customers, transporters, setInvoices }) => {
  const [filterStage, setFilterStage] = useState("all");
  const [showGenerateModal, setShowGenerateModal] = useState(false);
  const [showUploadModal, setShowUploadModal] = useState(null);
  const [showViewModal, setShowViewModal] = useState(null);
  const [selectedInvoice, setSelectedInvoice] = useState(null);

  // Only signed invoices (with IRN)
  const signedInvoices = invoices.filter(inv => inv.irn);

  const getStage = (inv) => {
    if (inv.ewbSigned && inv.ewbNo) return "active";
    if (inv.ewbGenerated) return "json_ready";
    return "pending";
  };

  const filteredInvoices = signedInvoices.filter(inv => {
    if (filterStage === "all") return true;
    return getStage(inv) === filterStage;
  });

  const counts = {
    pending: signedInvoices.filter(inv => getStage(inv) === "pending").length,
    json_ready: signedInvoices.filter(inv => getStage(inv) === "json_ready").length,
    active: signedInvoices.filter(inv => getStage(inv) === "active").length
  };

  const handleGenerateJSON = async (inv) => {
    setSelectedInvoice(inv);
    setShowGenerateModal(true);
  };

  const handleEnterEWBNumber = (inv) => {
    setShowUploadModal(inv);
  };

  const StageIndicator = ({ stage }) => {
    const steps = [
      { key: "pending", label: "IRN" },
      { key: "json_ready", label: "JSON" },
      { key: "active", label: "EWB" }
    ];

    const stageOrder = { pending: 0, json_ready: 1, active: 2 };
    const currentIdx = stageOrder[stage] || 0;

    return (
      <div className="flex items-center gap-1 text-xs">
        {steps.map((s, i) => (
          <div key={s.key} className="flex items-center gap-1">
            <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center text-[10px] font-bold ${
              i <= currentIdx
                ? "bg-green-500 border-green-500 text-white"
                : "bg-white border-gray-300 text-gray-400"
            }`}>
              {i <= currentIdx ? "✓" : i + 1}
            </div>
            {i < steps.length - 1 && (
              <div className={`w-6 h-0.5 ${i < currentIdx ? "bg-green-500" : "bg-gray-300"}`} />
            )}
          </div>
        ))}
      </div>
    );
  };

  return (
    <div className="space-y-4">
      {signedInvoices.length === 0 ? (
        <Card>
          <div className="text-center py-8 text-gray-500">
            No signed invoices. Create and sign invoices in Billing & E-Invoice first.
          </div>
        </Card>
      ) : (
        <>
          {/* Filter Pills & Actions */}
          <div className="flex justify-between items-center gap-2">
            <div className="flex gap-2 flex-wrap">
              <button
                onClick={() => setFilterStage("all")}
                className={`px-3 py-1 rounded-full text-sm font-medium transition ${
                  filterStage === "all"
                    ? "bg-gray-900 text-white"
                    : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                }`}
              >
                All
              </button>
              <button
                onClick={() => setFilterStage("pending")}
                className={`px-3 py-1 rounded-full text-sm font-medium transition ${
                  filterStage === "pending"
                    ? "bg-gray-900 text-white"
                    : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                }`}
              >
                Invoice Signed
              </button>
              <button
                onClick={() => setFilterStage("json_ready")}
                className={`px-3 py-1 rounded-full text-sm font-medium transition ${
                  filterStage === "json_ready"
                    ? "bg-gray-900 text-white"
                    : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                }`}
              >
                JSON Ready
              </button>
              <button
                onClick={() => setFilterStage("active")}
                className={`px-3 py-1 rounded-full text-sm font-medium transition ${
                  filterStage === "active"
                    ? "bg-gray-900 text-white"
                    : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                }`}
              >
                EWB Active
              </button>
            </div>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => window.open('https://einvoice1.gst.gov.in', '_blank')}
              className="border border-gray-300"
            >
              <Icons.external size={14} /> GST Portal
            </Button>
          </div>

          {/* Pipeline Table */}
          <Card>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100 bg-gray-50">
                    <th className="px-4 py-3 text-left font-medium text-gray-700">Invoice #</th>
                    <th className="px-4 py-3 text-left font-medium text-gray-700">Date</th>
                    <th className="px-4 py-3 text-left font-medium text-gray-700">Customer</th>
                    <th className="px-4 py-3 text-right font-medium text-gray-700">Total</th>
                    <th className="px-4 py-3 text-left font-medium text-gray-700">Stage</th>
                    <th className="px-4 py-3 text-left font-medium text-gray-700">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {filteredInvoices.map((inv) => {
                    const customer = customers.find(c => c.id === inv.customerId);
                    const stage = getStage(inv);

                    return (
                      <tr key={inv.id} className="hover:bg-gray-50 transition-colors">
                        <td className="px-4 py-3">
                          <span className="font-mono font-medium">{inv.invoiceNo}</span>
                        </td>
                        <td className="px-4 py-3 text-gray-600">{formatDate(inv.date)}</td>
                        <td className="px-4 py-3">{customer?.name || "—"}</td>
                        <td className="px-4 py-3 text-right font-semibold">{formatCurrency(inv.total)}</td>
                        <td className="px-4 py-3">
                          <StageIndicator stage={stage} />
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            {stage === "pending" && (
                              <Button
                                size="sm"
                                variant="primary"
                                onClick={() => handleGenerateJSON(inv)}
                              >
                                <Icons.download size={14} /> Generate JSON
                              </Button>
                            )}
                            {stage === "json_ready" && (
                              <>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => downloadJSON(inv)}
                                  className="border border-gray-300"
                                >
                                  <Icons.download size={14} /> Download
                                </Button>
                                <Button
                                  size="sm"
                                  variant="primary"
                                  onClick={() => handleEnterEWBNumber(inv)}
                                >
                                  <Icons.check size={14} /> Enter EWB
                                </Button>
                              </>
                            )}
                            {stage === "active" && (
                              <>
                                <span className="text-xs font-mono text-green-700">
                                  EWB: {inv.ewbNo}
                                </span>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => setShowViewModal(inv)}
                                >
                                  <Icons.file size={14} /> View 
                                </Button>
                              </>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </Card>
        </>
      )}

      {/* ─── GENERATE E-WAY BILL MODAL ────────────────────────────────────── */}
      <Modal
        open={showGenerateModal && selectedInvoice}
        onClose={() => { setShowGenerateModal(false); setSelectedInvoice(null); }}
        title={`Generate E-Way Bill for Invoice #${selectedInvoice?.invoiceNo}`}
        size="lg"
      >
        {selectedInvoice && (
          <EWayBillForm
            invoice={selectedInvoice}
            customers={customers}
            transporters={transporters}
            onGenerate={async (form) => {
              try {
                const jsonData = buildEWayBillJSON({...form, irn: selectedInvoice.irn});

                // Save JSON to Supabase
                await invoicesService.saveEWBJSON(selectedInvoice.id, jsonData);

                // Update local state
                setInvoices(prev => prev.map(inv =>
                  inv.id === selectedInvoice.id
                    ? { ...inv, ewbGenerated: true, ewbGeneratedAt: new Date().toISOString(), ewbJson: jsonData }
                    : inv
                ));

                setShowGenerateModal(false);
                setSelectedInvoice(null);
                downloadJSON({...selectedInvoice, ewbJson: jsonData});
                alert(`E-Way Bill JSON generated and downloaded!`);
              } catch (err) {
                alert(`Error: ${err.message}`);
              }
            }}
            onCancel={() => { setShowGenerateModal(false); setSelectedInvoice(null); }}
          />
        )}
      </Modal>


      {/* ─── VIEW EWB MODAL ──────────────────────────────────────────────── */}
      <Modal
        open={!!showViewModal && showViewModal?.ewbSigned}
        onClose={() => setShowViewModal(null)}
        title={`E-Way Bill #${showViewModal?.ewbNo}`}
        size="lg"
      >
        {showViewModal?.ewbSigned && (
          <div className="space-y-4">
            
            
            <div className="p-4 border rounded bg-gray-100 shadow-inner">
              <EWayBillPrintView
                invoice={showViewModal}
                onClose={() => setShowViewModal(null)}
              />
            </div>
          </div>
        )}
      </Modal>

      {/* ─── ENTER EWB NUMBER MODAL ──────────────────────────────────────────── */}
      <Modal
        open={!!showUploadModal}
        onClose={() => setShowUploadModal(null)}
        title={`Enter E-Way Bill Number - Invoice #${showUploadModal?.invoiceNo}`}
        size="md"
      >
        {showUploadModal && (
          <EnterEWBNumberModal
            invoice={showUploadModal}
            onSave={async (ewbNo) => {
              try {
                // Calculate validity dates
                const today = new Date();
                const ewbDt = today.toISOString().split('T')[0];
                
                // Get validity days from the distance stored in ewbJson
                const validityDays = showUploadModal.ewbJson?.Distance 
                  ? getValidityDays(showUploadModal.ewbJson.Distance) 
                  : 1;
                
                const validTillDate = new Date(today);
                validTillDate.setDate(validTillDate.getDate() + validityDays);
                const ewbValidTill = validTillDate.toISOString().split('T')[0];

                // Update Supabase
                await invoicesService.updateEWB(showUploadModal.id, {
                  ewbNo: ewbNo,
                  ewbSigned: true,
                  ewbDt: ewbDt,
                  ewbValidTill: ewbValidTill,
                });

                // Update local state
                setInvoices(prev => prev.map(inv =>
                  inv.id === showUploadModal.id
                    ? {
                        ...inv,
                        ewbNo: ewbNo,
                        ewbSigned: true,
                        ewbDt: ewbDt,
                        ewbValidTill: ewbValidTill
                      }
                    : inv
                ));

                setShowUploadModal(null);
                alert(`E-Way Bill #${ewbNo} recorded!`);
              } catch (err) {
                alert(`Error: ${err.message}`);
              }
            }}
            onCancel={() => setShowUploadModal(null)}
          />
        )}
      </Modal>
    </div>
  );
};

// ─── ENTER EWB NUMBER MODAL COMPONENT ────────────────────────────────────

const EnterEWBNumberModal = ({ invoice, onSave, onCancel }) => {
  const [ewbNumber, setEwbNumber] = useState("");
  const isValid = ewbNumber.trim().length > 0;

  const handleSubmit = () => {
    if (isValid) {
      onSave(ewbNumber.trim());
      setEwbNumber("");
    }
  };

  return (
    <div className="space-y-4">
      <div className="p-3 bg-blue-50 rounded text-sm border border-blue-200">
        <div className="text-xs text-blue-700 mb-2">Enter the E-Way Bill number received from the GST portal after uploading the JSON.</div>
      </div>

      <div className="p-3 bg-gray-50 rounded text-sm">
        <div>Invoice: <span className="font-mono font-medium">{invoice.invoiceNo}</span></div>
        <div>IRN: <span className="font-mono text-xs text-gray-600">{invoice.irn?.substring(0, 20)}...</span></div>
      </div>

      <Input
        label="E-Way Bill Number *"
        type="text"
        value={ewbNumber}
        onChange={e => setEwbNumber(e.target.value)}
        placeholder="Enter EWB number (e.g., 401219110012345)"
      />

      <div className="flex justify-end gap-2 pt-2">
        <Button variant="secondary" onClick={onCancel}>Cancel</Button>
        <Button onClick={handleSubmit} disabled={!isValid}>
          <Icons.check size={14} /> Save
        </Button>
      </div>
    </div>
  );
};

// ─── E-WAY BILL PRINT VIEW ────────────────────────────────────────────────────

const EWayBillPrintView = ({ invoice, onClose }) => {
  if (!invoice) return null;

  const transMode = {
    "1": "Road",
    "2": "Rail",
    "3": "Air",
    "4": "Ship"
  };

  const vehicleType = {
    "R": "Regular",
    "O": "Over-Dimensional (ODC)"
  };

  return (
    <div className="bg-white print:bg-white p-6 print:p-0 text-xs" id="eway-bill-view">
      <div className="border-2 border-gray-800 print:border-2 print:border-gray-800">
        {/* Header */}
        <div className="text-center py-3 print:py-3 border-b-2 border-gray-800 font-bold text-lg print:text-lg">E-WAY BILL</div>

        {/* EWB Status Section */}
        <div className="grid grid-cols-3 border-b-2 border-gray-800">
          <div className="p-3 border-r border-gray-800">
            <div className="text-gray-600 text-[10px] font-semibold mb-1">EWB Number</div>
            <div className="font-mono font-bold text-base text-green-700">{invoice.ewbNo}</div>
          </div>
          <div className="p-3 border-r border-gray-800">
            <div className="text-gray-600 text-[10px] font-semibold mb-1">Status</div>
            <div className="font-bold text-green-700 text-sm">✓ ACTIVE</div>
          </div>
          <div className="p-3">
            <div className="text-gray-600 text-[10px] font-semibold mb-1">Date Generated</div>
            <div className="font-semibold text-[11px]">{formatDate(invoice.ewbDt)}</div>
          </div>
        </div>

        {/* Invoice Information */}
        <div className="grid grid-cols-2 border-b-2 border-gray-800">
          <div className="p-3 border-r border-gray-800">
            <div className="text-gray-600 text-[10px] font-semibold mb-1">Linked Invoice</div>
            <div className="font-bold text-sm">{invoice.invoiceNo}</div>
            <div className="text-gray-600 text-[10px] mt-2">Dated: {formatDate(invoice.date)}</div>
          </div>
          <div className="p-3">
            <div className="text-gray-600 text-[10px] font-semibold mb-1">Invoice Amount</div>
            <div className="font-bold text-sm">{formatCurrency(invoice.total)}</div>
            <div className="text-gray-600 text-[10px] mt-2">IRN: <span className="font-mono text-[9px]">{invoice.irn?.substring(0, 20) || "—"}...</span></div>
          </div>
        </div>

        {/* Transport Details Table */}
        {invoice.ewbJson && (
          <div className="border-b-2 border-gray-800">
            <div className="p-3 bg-gray-50 border-b border-gray-300 font-bold text-[11px]">TRANSPORT DETAILS</div>
            <table className="w-full border-collapse text-[10px]">
              <tbody>
                <tr className="border-b border-gray-300">
                  <td className="p-2 border-r border-gray-300 font-semibold text-gray-700 w-1/3">Transporter Name</td>
                  <td className="p-2 font-semibold">{invoice.ewbJson.TransName}</td>
                </tr>
                <tr className="border-b border-gray-300">
                  <td className="p-2 border-r border-gray-300 font-semibold text-gray-700">Transporter ID</td>
                  <td className="p-2 font-mono text-[9px]">{invoice.ewbJson.TransId}</td>
                </tr>
                <tr className="border-b border-gray-300">
                  <td className="p-2 border-r border-gray-300 font-semibold text-gray-700">Mode of Transport</td>
                  <td className="p-2 font-semibold">{transMode[invoice.ewbJson.TransMode] || invoice.ewbJson.TransMode}</td>
                </tr>
                <tr className="border-b border-gray-300">
                  <td className="p-2 border-r border-gray-300 font-semibold text-gray-700">Distance (km)</td>
                  <td className="p-2 font-semibold">{invoice.ewbJson.Distance}</td>
                </tr>
                <tr className="border-b border-gray-300">
                  <td className="p-2 border-r border-gray-300 font-semibold text-gray-700">Vehicle Number</td>
                  <td className="p-2 font-mono font-bold text-sm">{invoice.ewbJson.VehNo}</td>
                </tr>
                <tr className="border-b border-gray-300">
                  <td className="p-2 border-r border-gray-300 font-semibold text-gray-700">Vehicle Type</td>
                  <td className="p-2">{vehicleType[invoice.ewbJson.VehType] || invoice.ewbJson.VehType}</td>
                </tr>
                <tr className="border-b border-gray-300">
                  <td className="p-2 border-r border-gray-300 font-semibold text-gray-700">Transport Doc No.</td>
                  <td className="p-2 font-mono text-[9px]">{invoice.ewbJson.TransDocNo}</td>
                </tr>
                <tr>
                  <td className="p-2 border-r border-gray-300 font-semibold text-gray-700">Transport Doc Date</td>
                  <td className="p-2">{invoice.ewbJson.TransDocDt}</td>
                </tr>
              </tbody>
            </table>
          </div>
        )}

        {/* Validity Section */}
        <div className="p-3 border-b-2 border-gray-800">
          <div className="grid grid-cols-2 gap-4 text-[10px]">
            <div>
              <span className="text-gray-600 font-semibold">Validity Period</span><br />
              <span className="font-bold">Valid Until: {formatDate(invoice.ewbValidTill)}</span>
            </div>
            <div>
              <span className="text-gray-600 font-semibold">Validity Days</span><br />
              <span className="font-bold">
                {invoice.ewbJson ? Math.ceil((new Date(invoice.ewbValidTill) - new Date(invoice.ewbDt)) / (1000 * 60 * 60 * 24)) : "—"} days
              </span>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="text-center py-2 text-[9px] text-gray-600">This is a Computer Generated E-Way Bill</div>
      </div>

    </div>
  );
};

// ─── E-WAY BILL FORM ────────────────────────────────────────────────────────

const EWayBillForm = ({ invoice, customers, transporters, onGenerate, onCancel }) => {
  const customer = customers.find(c => c.id === invoice.customerId);
  const [form, setForm] = useState({
    transId: transporters[0]?.transId || "",
    transName: transporters[0]?.transName || "",
    transMode: "1",
    distance: "",
    transDocNo: "",
    transDocDt: today(),
    vehicleNo: "",
    vehicleType: "R"
  });

  const set = (k, v) => setForm(p => ({ ...p, [k]: v }));

  const handleTransporterChange = (e) => {
    const trans = transporters.find(t => t.transId === e.target.value);
    if (trans) {
      set("transId", trans.transId);
      set("transName", trans.transName);
    }
  };

  const validityDays = form.distance ? getValidityDays(form.distance) : 0;
  const isValid = form.transId && form.distance && form.vehicleNo && form.transDocNo && form.transDocDt && !isNaN(parseFloat(form.distance));

  return (
    <div className="space-y-4">
      <div className="p-3 bg-gray-50 rounded text-sm">
        <div>Invoice: <span className="font-mono font-medium">{invoice.invoiceNo}</span></div>
        <div>Customer: <span className="font-medium">{customer?.name}</span></div>
        <div>IRN: <span className="font-mono text-xs text-gray-600">{invoice.irn.substring(0, 20)}...</span></div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <Select
          label="Transporter *"
          options={transporters.map(t => ({ value: t.transId, label: `${t.transName}` }))}
          value={form.transId}
          onChange={handleTransporterChange}
        />
        <Select
          label="Transport Mode *"
          options={[
            { value: "1", label: "Road" },
            { value: "2", label: "Rail" },
            { value: "3", label: "Air" },
            { value: "4", label: "Ship" }
          ]}
          value={form.transMode}
          onChange={e => set("transMode", e.target.value)}
        />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <Input
            label="Distance (km) *"
            type="number"
            value={form.distance}
            onChange={e => set("distance", e.target.value)}
            min="1"
            max="9999"
          />
          {form.distance && !isNaN(parseFloat(form.distance)) && (
            <div className="text-xs text-gray-600 mt-1">Validity: {validityDays} day{validityDays > 1 ? "s" : ""}</div>
          )}
        </div>
        <Input
          label="Vehicle No *"
          value={form.vehicleNo}
          onChange={e => set("vehicleNo", e.target.value.toUpperCase())}
        />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <Select
          label="Vehicle Type *"
          options={[
            { value: "R", label: "Regular (R)" },
            { value: "O", label: "Over-Dimensional (O)" }
          ]}
          value={form.vehicleType}
          onChange={e => set("vehicleType", e.target.value)}
        />
        <Input
          label="Transport Doc No *"
          value={form.transDocNo}
          onChange={e => set("transDocNo", e.target.value)}
        />
      </div>

      <Input
        label="Transport Doc Date *"
        type="date"
        value={form.transDocDt}
        onChange={e => set("transDocDt", e.target.value)}
      />

      <div className="flex justify-end gap-2 pt-2">
        <Button variant="secondary" onClick={onCancel}>Cancel</Button>
        <Button onClick={() => onGenerate(form)} disabled={!isValid}>
          <Icons.check size={14} /> Generate
        </Button>
      </div>
    </div>
  );
};
