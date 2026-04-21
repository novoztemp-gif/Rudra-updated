import { supabase } from '../lib/supabase';

const mapCustomer = (row) => ({
  id: row.id,
  name: row.name,
  mobile: row.mobile,
  gstin: row.gstin,
  address: row.address,
  city: row.city,
  state: row.state_code,
  pin: row.pin,
  creditLimit: row.credit_limit,
  outstanding: row.outstanding,
  isActive: row.is_active,
  addresses: (row.customer_addresses || []).map(addr => ({
    id: addr.id,
    label: addr.label,
    address: addr.address,
    isDefault: addr.is_default,
  })),
  createdAt: row.created_at,
  updatedAt: row.updated_at,
});

const unmapCustomer = (obj) => ({
  name: obj.name,
  mobile: obj.mobile,
  gstin: obj.gstin,
  address: obj.address,
  city: obj.city,
  state_code: obj.state,
  pin: obj.pin,
  credit_limit: obj.creditLimit ?? 0,
  outstanding: obj.outstanding ?? 0,
  is_active: obj.isActive ?? true,
});

export async function getAll() {
  // Get customers
  const { data: customers, error: custError } = await supabase
    .from('customers')
    .select('*')
    .eq('is_active', true)
    .order('name');

  if (custError) throw custError;

  // Get all addresses
  const { data: addresses, error: addrError } = await supabase
    .from('customer_addresses')
    .select('*');

  if (addrError) throw addrError;

  // Manual join: map addresses to customers
  const addressMap = {};
  addresses.forEach(addr => {
    if (!addressMap[addr.customer_id]) addressMap[addr.customer_id] = [];
    addressMap[addr.customer_id].push(addr);
  });

  return customers.map(cust => mapCustomer({
    ...cust,
    customer_addresses: addressMap[cust.id] || []
  }));
}

export async function create(customer) {
  const { data: custData, error: custError } = await supabase
    .from('customers')
    .insert([unmapCustomer(customer)])
    .select()
    .single();

  if (custError) throw custError;

  // Insert addresses if provided
  if (customer.addresses && customer.addresses.length > 0) {
    const addrRecords = customer.addresses.map(addr => ({
      customer_id: custData.id,
      label: addr.label,
      address: addr.address,
      is_default: addr.isDefault ?? false,
    }));

    const { error: addrError } = await supabase
      .from('customer_addresses')
      .insert(addrRecords);

    if (addrError) throw addrError;
  }

  return mapCustomer({ ...custData, customer_addresses: customer.addresses || [] });
}

export async function update(id, customer) {
  // Skip update if id is not a valid UUID format
  if (!isValidUUID(id)) {
    console.warn(`Skipping invalid UUID: ${id}`);
    return customer;
  }

  const { data: custData, error: custError } = await supabase
    .from('customers')
    .update(unmapCustomer(customer))
    .eq('id', id)
    .select()
    .single();

  if (custError) throw custError;

  // Update addresses if provided
  if (customer.addresses && customer.addresses.length > 0) {
    // Delete old addresses
    await supabase.from('customer_addresses').delete().eq('customer_id', id);

    // Insert new ones
    const addrRecords = customer.addresses.map(addr => ({
      customer_id: id,
      label: addr.label,
      address: addr.address,
      is_default: addr.isDefault ?? false,
    }));

    const { error: addrError } = await supabase
      .from('customer_addresses')
      .insert(addrRecords);

    if (addrError) throw addrError;
  }

  return mapCustomer({ ...custData, customer_addresses: customer.addresses || [] });
}

export async function delete_(id) {
  if (!isValidUUID(id)) {
    console.warn(`Skipping invalid UUID: ${id}`);
    return;
  }

  const { error } = await supabase
    .from('customers')
    .update({ is_active: false })
    .eq('id', id);

  if (error) throw error;
}

function isValidUUID(id) {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  return uuidRegex.test(id);
}
