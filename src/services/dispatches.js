import { supabase } from '../lib/supabase';

const mapDispatch = (row) => ({
  id: row.id,
  dispatchNo: row.dispatch_no,
  invoiceId: row.invoice_id,
  invoiceNo: row.invoice_no,
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
  vehicle_no: obj.vehicleNo,
  destination: obj.destination,
  delivery_terms: obj.deliveryTerms,
  transport_details: obj.transportDetails,
  status: obj.status,
});

export async function getAll() {
  const { data, error } = await supabase
    .from('dispatches')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data.map(mapDispatch);
}

export async function create(dispatch) {
  const { data, error } = await supabase
    .from('dispatches')
    .insert([{
      ...unmapDispatch(dispatch),
      created_by: null, // Set if you have user context
    }])
    .select()
    .single();

  if (error) throw error;
  return mapDispatch(data);
}

export async function updateStatus(id, status) {
  const { data, error } = await supabase
    .from('dispatches')
    .update({ status })
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return mapDispatch(data);
}

export async function delete_(id) {
  const { error } = await supabase
    .from('dispatches')
    .delete()
    .eq('id', id);

  if (error) throw error;
}
