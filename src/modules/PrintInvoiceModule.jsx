import { useState, useMemo } from "react";
import { formatCurrency, formatDate } from "../utils/formatters";
import { Badge } from "../components/ui/Badge";
import { Button } from "../components/ui/Button";
import { Card } from "../components/ui/Card";
import { EmptyState } from "../components/ui/EmptyState";
import { Modal } from "../components/ui/Modal";
import { Tabs } from "../components/ui/Tabs";
import { Table } from "../components/ui/Table";
import { Icons } from "../components/ui/Icons";
import { SearchBar } from "../components/ui/SearchBar";
import { InvoicePrintView } from "./BillingModule";

export const PrintInvoiceModule = ({ invoices, setInvoices, company, customers }) => {
  const [tab, setTab] = useState("upload");
  const [search, setSearch] = useState("");
  const [showInvoicePrint, setShowInvoicePrint] = useState(null);

  // Invoices that are JSON converted but don't have an IRN yet
  const needsSigning = invoices.filter(inv => inv.jsonConverted && !inv.irn);
  // Invoices that already successfully acquired an IRN
  const signed = invoices.filter(inv => inv.irn);

  const filteredNeedsSigning = needsSigning.filter(inv => {
    const cust = customers.find(c => c.id === inv.customerId);
    return inv.invoiceNo.includes(search) || cust?.name.toLowerCase().includes(search.toLowerCase());
  });

  const filteredSigned = signed.filter(inv => {
    const cust = customers.find(c => c.id === inv.customerId);
    return inv.invoiceNo.includes(search) || cust?.name.toLowerCase().includes(search.toLowerCase());
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
          
          // E-Invoice portal API wraps returns differently depending on single/bulk.
          // Fallback to extraction:
          const response = Array.isArray(data) ? data[0] : data;

          if (!response.Irn) {
            alert("Invalid response: Missing IRN field exactly named 'Irn'");
            return;
          }

          setInvoices(prev => prev.map(inv =>
            inv.id === invoiceId
              ? {
                  ...inv,
                  irn: response.Irn,
                  ackNo: response.AckNo,
                  ackDate: response.AckDt,
                  status: response.Status || "ACT",
                  signedInvoice: response.SignedInvoice,
                  signedQRCode: response.SignedQRCode,
                  jsonSigned: true
                }
              : inv
          ));
          alert(`Invoice #${invoices.find(i => i.id === invoiceId)?.invoiceNo} successfully bound with IRN and QR Data!`);
        } catch (err) {
          alert(`Invalid JSON format: ${err.message}`);
        }
      };
      reader.readAsText(file);
    };
    input.click();
  };

  const handlePrint = (invoice) => {
    setShowInvoicePrint(invoice);
    // Delay slightly to allow React to mount the Modal and the `#invoice-print` div
    setTimeout(() => {
      window.print();
    }, 150);
  };

  return (
    <div>
      <Tabs tabs={[
        { key: "upload", label: `Upload Signed JSON (${needsSigning.length})` },
        { key: "signed", label: `Signed Invoices (${signed.length})` },
      ]} active={tab} onChange={setTab} />

      <div className="mt-4">
        {/* ─── TAB 1: Upload Signed JSON ────────────────────────────────────────── */}
        {tab === "upload" && (
          <Card title="Awaiting Portal Signatures" actions={<SearchBar value={search} onChange={setSearch} placeholder="Search pending invoice..." />}>
             {filteredNeedsSigning.length === 0 ? (
                <EmptyState icon={<Icons.file size={40} />} title="All Clear" description="No exported invoices waiting for signatures!" />
             ) : (
                <Table columns={[
                  { key: "invoiceNo", label: "Invoice #", render: (r) => <span className="font-mono font-medium">{r.invoiceNo}</span> },
                  { key: "date", label: "Date", render: (r) => formatDate(r.date) },
                  { key: "customer", label: "Customer", render: (r) => customers.find(c => c.id === r.customerId)?.name || "—" },
                  { key: "total", label: "Total", align: "right", render: (r) => <span className="font-semibold">{formatCurrency(r.total)}</span> },
                  { key: "status", label: "Status", render: (r) => <Badge variant="warning">Exported / Pending IRN</Badge> },
                  { key: "actions", label: "", render: (r) => (
                    <div className="flex items-center gap-1">
                      <Button size="sm" variant="ghost" onClick={() => handleUploadSigned(r.id)} title="Upload Signed JSON payload here">
                        <Icons.download size={14} /> Upload Signed JSON
                      </Button>
                    </div>
                  )},
                ]} data={filteredNeedsSigning} emptyMsg="No matching pending invoices" />
             )}
          </Card>
        )}

        {/* ─── TAB 2: Signed Invoices ──────────────────────────────────────────── */}
        {tab === "signed" && (
           <Card title="Official E-Invoices" actions={<SearchBar value={search} onChange={setSearch} placeholder="Search signed invoice..." />}>
              {filteredSigned.length === 0 ? (
                 <EmptyState icon={<Icons.qr size={40} />} title="No Signed Invoices" description="Once you upload a portal JSON response, it will appear here." />
              ) : (
                 <Table columns={[
                   { key: "invoiceNo", label: "Invoice #", render: (r) => <span className="font-mono font-medium">{r.invoiceNo}</span> },
                   { key: "date", label: "Date", render: (r) => formatDate(r.date) },
                   { key: "customer", label: "Customer", render: (r) => customers.find(c => c.id === r.customerId)?.name || "—" },
                   { key: "irn", label: "IRN", render: (r) => <span className="font-mono text-xs text-green-700 font-medium truncate" title={r.irn}>{r.irn.substring(0, 16)}...</span> },
                   { key: "status", label: "Status", render: (r) => <Badge variant="success">✓ Signed</Badge> },
                   { key: "actions", label: "", render: (r) => (
                     <div className="flex items-center gap-1">
                       <Button size="sm" variant="ghost" onClick={() => handlePrint(r)} title="Print / Download PDF">
                         <Icons.printer size={14} /> Download PDF
                       </Button>
                     </div>
                   )},
                 ]} data={filteredSigned} emptyMsg="No matching signed invoices" />
              )}
           </Card>
        )}

      </div>

      {/* ─── HIDDEN PRINT WRAPPER FOR PDF GENERATION ──────────────────────────────────────────── */}
      <Modal open={!!showInvoicePrint} onClose={() => setShowInvoicePrint(null)} title={`PDF View — Invoice #${showInvoicePrint?.invoiceNo}`} size="lg">
         {showInvoicePrint && (
           <div className="space-y-4">
             <div className="flex justify-between items-center px-2 py-1 bg-blue-50 border border-blue-200 rounded text-sm text-blue-800">
               <span className="flex items-center gap-2"><Icons.alert size={16} /> <b>Tip:</b> If the print dialog didn't open, or you accidentally closed it, click Print below to re-open it.</span>
               <Button size="sm" onClick={() => window.print()}><Icons.printer size={14} /> Print Now</Button>
             </div>
             
             {/* Actual Template Payload */}
             <div className="p-4 border rounded bg-gray-100 shadow-inner">
               <InvoicePrintView 
                  invoice={showInvoicePrint} 
                  company={company} 
                  customer={customers.find((c) => c.id === showInvoicePrint?.customerId)} 
               />
             </div>
           </div>
         )}
      </Modal>
    </div>
  );
};
