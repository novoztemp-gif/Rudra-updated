import { supabase } from '../lib/supabase';
import * as productsService from './products';

const mapPurchase = (row) => ({
  id: row.id,
  purchaseNo: row.purchase_no,
  supplierId: row.supplier_id,
  supplierName: row.supplier_name,
  supplierInvoiceNo: row.supplier_invoice_no,
  date: row.date,
  status: row.status,
  total: row.total,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
  items: (row.purchase_items || []).map(item => ({
    id: item.id,
    productId: item.product_id,
    name: item.name,
    hsn: item.hsn,
    unit: item.unit,
    qty: item.qty,
    purchaseRate: item.purchase_rate,
    amount: item.amount,
  })),
});

const unmapPurchase = (obj) => ({
  purchase_no: obj.purchaseNo,
  supplier_id: obj.supplierId,
  supplier_name: obj.supplierName,
  supplier_invoice_no: obj.supplierInvoiceNo,
  date: obj.date,
  status: obj.status,
  total: obj.total,
});

export async function getAll() {
  // Get purchases
  const { data: purchases, error: purError } = await supabase
    .from('purchases')
    .select('*')
    .order('created_at', { ascending: false });

  if (purError) throw purError;

  // Get all purchase items
  const { data: items, error: itemsError } = await supabase
    .from('purchase_items')
    .select('*');

  if (itemsError) throw itemsError;

  // Manual join
  const itemsMap = {};
  items.forEach(item => {
    if (!itemsMap[item.purchase_id]) itemsMap[item.purchase_id] = [];
    itemsMap[item.purchase_id].push(item);
  });

  return purchases.map(pur => mapPurchase({
    ...pur,
    purchase_items: itemsMap[pur.id] || []
  }));
}

export async function create(purchase) {
  // Step 1: Insert purchase (without items)
  const purchaseToInsert = {
    ...unmapPurchase(purchase),
    created_by: null, // Set if you have user context
  };

  const { error: purError } = await supabase
    .from('purchases')
    .insert([purchaseToInsert]);

  if (purError) throw purError;

  // Fetch the inserted purchase by purchase_no
  const { data: fetchedPurchases, error: fetchError } = await supabase
    .from('purchases')
    .select('*')
    .eq('purchase_no', purchase.purchaseNo);

  if (fetchError) throw fetchError;
  if (!fetchedPurchases || fetchedPurchases.length === 0) throw new Error('Failed to fetch inserted purchase');

  const newPurchase = fetchedPurchases[0];

  // Step 2: Insert purchase items
  if (purchase.items && purchase.items.length > 0) {
    const itemsToInsert = purchase.items.map((item, idx) => ({
      purchase_id: newPurchase.id,
      product_id: item.productId,
      name: item.name,
      hsn: item.hsn,
      unit: item.unit,
      qty: item.qty,
      purchase_rate: item.purchaseRate,
      amount: item.amount,
      sort_order: idx,
    }));

    const { error: itemsError } = await supabase
      .from('purchase_items')
      .insert(itemsToInsert);

    if (itemsError) throw itemsError;

    // Step 3: Increment stock for each product
    for (const item of purchase.items) {
      const products = await productsService.getAll();
      const prod = products.find(p => p.id === item.productId);
      if (prod) {
        await productsService.updateStock(item.productId, prod.stock + item.qty);
      }
    }
  }

  // Fetch purchase items
  const { data: purchaseItems } = await supabase
    .from('purchase_items')
    .select('*')
    .eq('purchase_id', newPurchase.id);

  return mapPurchase({
    ...newPurchase,
    purchase_items: purchaseItems || []
  });
}

export async function update(id, purchase) {
  const { data, error } = await supabase
    .from('purchases')
    .update(unmapPurchase(purchase))
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;

  const { data: purchaseItems } = await supabase
    .from('purchase_items')
    .select('*')
    .eq('purchase_id', id);

  return mapPurchase({
    ...data,
    purchase_items: purchaseItems || []
  });
}

export async function delete_(id) {
  const { error } = await supabase
    .from('purchases')
    .delete()
    .eq('id', id);

  if (error) throw error;
}
