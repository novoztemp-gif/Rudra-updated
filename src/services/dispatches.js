import { supabase } from "../lib/supabase";

const mapDispatch = (row) => ({
  id: row.id,
  dispatchNo: row.dispatch_no,
  invoiceId: row.invoice_id,
  invoiceNo: row.invoice_no,
  transporterId: row.transporter_id,
  transporterName: row.transporter_name,
  vehicleNo: row.vehicle_no,
  destination: row.destination,
  deliveryTerms: row.delivery_terms,
  transportDetails: row.transport_details,
  status: row.status,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
});

const unmapDispatch = (obj) => ({
  dispatch_no: obj.dispatchNo,
  invoice_id: obj.invoiceId,
  invoice_no: obj.invoiceNo,
  transporter_id: obj.transporterId || null,
  transporter_name: obj.transporterName || null,
  vehicle_no: obj.vehicleNo,
  destination: obj.destination,
  delivery_terms: obj.deliveryTerms,
  transport_details: obj.transportDetails,
  status: obj.status ?? "dispatched",
});

export async function getAll() {
  const { data, error } = await supabase
    .from("dispatches")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) throw error;
  return (data || []).map(mapDispatch);
}

export async function create(dispatch) {
  const { data, error } = await supabase
    .from("dispatches")
    .insert([unmapDispatch(dispatch)])
    .select()
    .single();

  if (error) throw error;
  return mapDispatch(data);
}

export async function update(id, changes) {
  const updateData = {};

  if ("dispatchNo" in changes) updateData.dispatch_no = changes.dispatchNo;
  if ("invoiceId" in changes) updateData.invoice_id = changes.invoiceId;
  if ("invoiceNo" in changes) updateData.invoice_no = changes.invoiceNo;
  if ("transporterId" in changes) updateData.transporter_id = changes.transporterId || null;
  if ("transporterName" in changes) updateData.transporter_name = changes.transporterName || null;
  if ("vehicleNo" in changes) updateData.vehicle_no = changes.vehicleNo;
  if ("destination" in changes) updateData.destination = changes.destination;
  if ("deliveryTerms" in changes) updateData.delivery_terms = changes.deliveryTerms;
  if ("transportDetails" in changes) updateData.transport_details = changes.transportDetails;
  if ("status" in changes) updateData.status = changes.status;

  const { data, error } = await supabase
    .from("dispatches")
    .update(updateData)
    .eq("id", id)
    .select()
    .single();

  if (error) throw error;
  return mapDispatch(data);
}

export async function delete_(id) {
  const { error } = await supabase
    .from("dispatches")
    .delete()
    .eq("id", id);

  if (error) throw error;
}