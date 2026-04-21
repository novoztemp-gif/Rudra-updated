import { supabase } from "../lib/supabase";

const mapCancellation = (row) => ({
  id: row.id,
  invoiceId: row.invoice_id,
  invoiceNo: row.invoice_no,
  irn: row.irn,
  version: row.version,
  cancelReasonCode: row.cancel_reason_code,
  cancelReasonText: row.cancel_reason_text,
  requestJson: row.request_json,
  requestGenerated: row.request_generated,
  requestGeneratedAt: row.request_generated_at,
  status: row.status,
  createdBy: row.created_by,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
});

export async function getAll() {
  const { data, error } = await supabase
    .from("irn_cancellations")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) throw error;
  return (data || []).map(mapCancellation);
}

export async function create(payload) {
  const { data, error } = await supabase
    .from("irn_cancellations")
    .insert([
      {
        invoice_id: payload.invoiceId,
        invoice_no: payload.invoiceNo,
        irn: payload.irn,
        version: payload.version || "1.01",
        cancel_reason_code: payload.cancelReasonCode,
        cancel_reason_text: payload.cancelReasonText || "",
        request_json: payload.requestJson,
        request_generated: payload.requestGenerated ?? true,
        request_generated_at: payload.requestGeneratedAt || new Date().toISOString(),
        status: payload.status || "json_generated",
        created_by: null,
      },
    ])
    .select()
    .single();

  if (error) throw error;
  return mapCancellation(data);
}

export async function getByInvoiceId(invoiceId) {
  const { data, error } = await supabase
    .from("irn_cancellations")
    .select("*")
    .eq("invoice_id", invoiceId)
    .order("created_at", { ascending: false });

  if (error) throw error;
  return (data || []).map(mapCancellation);
}