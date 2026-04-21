import { supabase } from '../lib/supabase';

// Map snake_case from DB to camelCase for UI
const mapProduct = (row) => ({
  id: row.id,
  name: row.name,
  category: row.category,
  hsn: row.hsn,
  unit: row.unit,
  size: row.size,
  thickness: row.thickness,
  rate: row.rate,
  taxRate: row.tax_rate,
  stock: row.stock,
  minStock: row.min_stock,
  warehouse: row.warehouse,
  isActive: row.is_active,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
});

const unmapProduct = (obj) => ({
  name: obj.name,
  category: obj.category,
  hsn: obj.hsn,
  unit: obj.unit,
  size: obj.size,
  thickness: obj.thickness,
  rate: obj.rate,
  tax_rate: obj.taxRate,
  stock: obj.stock,
  min_stock: obj.minStock,
  warehouse: obj.warehouse,
  is_active: obj.isActive ?? true,
});

export async function getAll() {
  const { data, error } = await supabase
    .from('products')
    .select('*')
    .eq('is_active', true)
    .order('name');

  if (error) throw error;
  return data.map(mapProduct);
}

export async function create(product) {
  const { data, error } = await supabase
    .from('products')
    .insert([unmapProduct(product)])
    .select()
    .single();

  if (error) throw error;
  return mapProduct(data);
}

export async function update(id, product) {
  // Skip update if id is not a valid UUID format
  if (!isValidUUID(id)) {
    console.warn(`Skipping invalid UUID: ${id}`);
    return product;
  }

  const { data, error } = await supabase
    .from('products')
    .update(unmapProduct(product))
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return mapProduct(data);
}

function isValidUUID(id) {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  return uuidRegex.test(id);
}

export async function updateStock(id, newStock) {
  const { data, error } = await supabase
    .from('products')
    .update({ stock: newStock })
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return mapProduct(data);
}

export async function delete_(id) {
  const { error } = await supabase
    .from('products')
    .update({ is_active: false })
    .eq('id', id);

  if (error) throw error;
}
