import { supabase } from '../lib/supabase';

const mapTransporter = (row) => ({
  id: row.id,
  transId: row.trans_id,
  transName: row.trans_name,
  contact: row.contact,
  email: row.email,
  address: row.address,
  state: row.state_code,
  isActive: row.is_active,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
});

const unmapTransporter = (obj) => ({
  trans_id: obj.transId,
  trans_name: obj.transName,
  contact: obj.contact,
  email: obj.email,
  address: obj.address,
  state_code: obj.state,
  is_active: obj.isActive ?? true,
});

export async function getAll() {
  const { data, error } = await supabase
    .from('transporters')
    .select('*')
    .eq('is_active', true)
    .order('trans_name');

  if (error) throw error;
  return data.map(mapTransporter);
}

export async function create(transporter) {
  const { data, error } = await supabase
    .from('transporters')
    .insert([unmapTransporter(transporter)])
    .select()
    .single();

  if (error) throw error;
  return mapTransporter(data);
}

export async function update(id, transporter) {
  if (!isValidUUID(id)) {
    console.warn(`Skipping invalid UUID: ${id}`);
    return transporter;
  }

  const { data, error } = await supabase
    .from('transporters')
    .update(unmapTransporter(transporter))
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return mapTransporter(data);
}

export async function delete_(id) {
  if (!isValidUUID(id)) {
    console.warn(`Skipping invalid UUID: ${id}`);
    return;
  }

  const { error } = await supabase
    .from('transporters')
    .update({ is_active: false })
    .eq('id', id);

  if (error) throw error;
}

function isValidUUID(id) {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  return uuidRegex.test(id);
}
