import { supabase } from '../lib/supabase';

const mapSupplier = (row) => ({
  id: row.id,
  name: row.name,
  mobile: row.mobile,
  gstin: row.gstin,
  address: row.address,
  state: row.state_code,
  outstanding: row.outstanding,
  isActive: row.is_active,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
});

const unmapSupplier = (obj) => ({
  name: obj.name,
  mobile: obj.mobile,
  gstin: obj.gstin,
  address: obj.address,
  state_code: obj.state,
  outstanding: obj.outstanding ?? 0,
  is_active: obj.isActive ?? true,
});

export async function getAll() {
  const { data, error } = await supabase
    .from('suppliers')
    .select('*')
    .eq('is_active', true)
    .order('name');

  if (error) throw error;
  return data.map(mapSupplier);
}

export async function create(supplier) {
  const { data, error } = await supabase
    .from('suppliers')
    .insert([unmapSupplier(supplier)])
    .select()
    .single();

  if (error) throw error;
  return mapSupplier(data);
}

export async function update(id, supplier) {
  if (!isValidUUID(id)) {
    console.warn(`Skipping invalid UUID: ${id}`);
    return supplier;
  }

  const { data, error } = await supabase
    .from('suppliers')
    .update(unmapSupplier(supplier))
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return mapSupplier(data);
}

export async function delete_(id) {
  if (!isValidUUID(id)) {
    console.warn(`Skipping invalid UUID: ${id}`);
    return;
  }

  const { error } = await supabase
    .from('suppliers')
    .update({ is_active: false })
    .eq('id', id);

  if (error) throw error;
}

function isValidUUID(id) {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  return uuidRegex.test(id);
}
