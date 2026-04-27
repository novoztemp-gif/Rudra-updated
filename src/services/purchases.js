import { supabase } from "../lib/supabase";
import * as productsService from "./products";

const mapPurchase = (row) => ({
  id: row.id,
  purchaseNo: row.purchase_no,
  supplierId: row.supplier_id,
  supplierName: row.supplier_name,
  supplierInvoiceNo: row.supplier_invoice_no,
  date: row.date,
  status: row.status,
  total: Number(row.total ?? 0),
  createdAt: row.created_at,
  updatedAt: row.updated_at,

  items: (row.purchase_items || []).map((item) => ({
    id: item.id,
    productId: item.product_id,
    name: item.name,
    hsn: item.hsn,
    unit: item.unit,
    qty: Number(item.qty ?? 0),
    purchaseRate: Number(item.purchase_rate ?? 0),
    stockBefore: Number(item.stock_before ?? 0),
    stockAfter: Number(item.stock_after ?? 0),
    amount: Number(item.amount ?? 0),
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
  const { data: purchases, error: purError } = await supabase
    .from("purchases")
    .select("*")
    .order("created_at", { ascending: false });

  if (purError) throw purError;

  const { data: items, error: itemsError } = await supabase
    .from("purchase_items")
    .select("*")
    .order("sort_order", { ascending: true });

  if (itemsError) throw itemsError;

  const itemsMap = {};

  items.forEach((item) => {
    if (!itemsMap[item.purchase_id]) {
      itemsMap[item.purchase_id] = [];
    }

    itemsMap[item.purchase_id].push(item);
  });

  return purchases.map((purchase) =>
    mapPurchase({
      ...purchase,
      purchase_items: itemsMap[purchase.id] || [],
    })
  );
}

export async function create(purchase) {
  const purchaseToInsert = {
    ...unmapPurchase(purchase),
    created_by: null,
  };

  const { error: purError } = await supabase
    .from("purchases")
    .insert([purchaseToInsert]);

  if (purError) throw purError;

  const { data: fetchedPurchases, error: fetchError } = await supabase
    .from("purchases")
    .select("*")
    .eq("purchase_no", purchase.purchaseNo);

  if (fetchError) throw fetchError;

  if (!fetchedPurchases || fetchedPurchases.length === 0) {
    throw new Error("Failed to fetch inserted purchase");
  }

  const newPurchase = fetchedPurchases[0];

  if (purchase.items && purchase.items.length > 0) {
    const itemsToInsert = purchase.items.map((item, idx) => ({
      purchase_id: newPurchase.id,
      product_id: item.productId,
      name: item.name,
      hsn: item.hsn,
      unit: item.unit,
      qty: Number(item.qty ?? 0),
      purchase_rate: Number(item.purchaseRate ?? 0),
      stock_before: Number(item.stockBefore ?? 0),
      stock_after: Number(item.stockAfter ?? 0),
      amount: Number(item.amount ?? 0),
      sort_order: idx,
    }));

    const { error: itemsError } = await supabase
      .from("purchase_items")
      .insert(itemsToInsert);

    if (itemsError) throw itemsError;

    for (const item of purchase.items) {
      const products = await productsService.getAll();
      const product = products.find((p) => p.id === item.productId);

      if (product) {
        await productsService.updateStock(
          item.productId,
          Number(product.stock ?? 0) + Number(item.qty ?? 0)
        );
      }
    }
  }

  const { data: purchaseItems, error: itemFetchError } = await supabase
    .from("purchase_items")
    .select("*")
    .eq("purchase_id", newPurchase.id)
    .order("sort_order", { ascending: true });

  if (itemFetchError) throw itemFetchError;

  return mapPurchase({
    ...newPurchase,
    purchase_items: purchaseItems || [],
  });
}

export async function update(id, purchase) {
  const { data, error } = await supabase
    .from("purchases")
    .update(unmapPurchase(purchase))
    .eq("id", id)
    .select()
    .single();

  if (error) throw error;

  const { data: purchaseItems, error: itemFetchError } = await supabase
    .from("purchase_items")
    .select("*")
    .eq("purchase_id", id)
    .order("sort_order", { ascending: true });

  if (itemFetchError) throw itemFetchError;

  return mapPurchase({
    ...data,
    purchase_items: purchaseItems || [],
  });
}

export async function delete_(id) {
  const { error } = await supabase.from("purchases").delete().eq("id", id);

  if (error) throw error;
}