import { supabase } from '../lib/supabase';
import * as productsService from './products';

const mapInvoice = (row) => ({
  id: row.id,
  invoiceNo: row.invoice_no,
  customerId: row.customer_id,
  invoiceType: row.invoice_type,
  date: row.date,
  deliveryNote: row.delivery_note,
  paymentTerms: row.payment_terms,
  subtotal: Number(row.subtotal ?? 0),
  cgst: Number(row.cgst ?? 0),
  sgst: Number(row.sgst ?? 0),
  igst: Number(row.igst ?? 0),
  totalTax: Number(row.total_tax ?? 0),
  total: Number(row.total ?? 0),
  hasTransportDetails: row.has_transport_details ?? false,
  loadingCharge: Number(row.loading_charge ?? 0),
  transportCharge: Number(row.transport_charge ?? 0),
  freightCharge: Number(row.freight_charge ?? 0),
  transportNotes: row.transport_notes || "",
  overallTaxPercent: Number(row.overall_tax_percent ?? 0),
  status: row.status,
  jsonConverted: row.json_converted,
  jsonSigned: row.json_signed,
  irn: row.irn,
  ackNo: row.ack_no,
  ackDate: row.ack_date,
  signedInvoice: row.signed_invoice,
  signedQRCode: row.signed_qr_code,
  ewayBillId: row.eway_bill_id,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
  ...(row.eway_bill_details && {
    ewbGenerated: row.eway_bill_details.ewb_generated,
    ewbSigned: row.eway_bill_details.ewb_signed,
    ewbNo: row.eway_bill_details.ewb_no,
    ewbDt: row.eway_bill_details.ewb_dt,
    ewbValidTill: row.eway_bill_details.ewb_valid_till,
    ewbStatus: row.eway_bill_details.ewb_status,
  }),
  items: (row.invoice_items || []).map((item) => ({
    id: item.id,
    productId: item.product_id,
    name: item.name,
    hsn: item.hsn,
    unit: item.unit,
    qty: Number(item.qty ?? 0),
    rate: Number(item.rate ?? 0),
    taxRate: Number(item.tax_rate ?? 0),
    amount: Number(item.amount ?? 0),
  })),
});

const unmapInvoice = (obj) => ({
  invoice_no: obj.invoiceNo,
  customer_id: obj.customerId,
  invoice_type: obj.invoiceType,
  date: obj.date,
  delivery_note: obj.deliveryNote,
  payment_terms: obj.paymentTerms,
  subtotal: obj.subtotal,
  cgst: obj.cgst,
  sgst: obj.sgst,
  igst: obj.igst,
  total_tax: obj.totalTax,
  total: obj.total,
  has_transport_details: obj.hasTransportDetails ?? false,
  loading_charge: obj.loadingCharge ?? 0,
  transport_charge: obj.transportCharge ?? 0,
  freight_charge: obj.freightCharge ?? 0,
  transport_notes: obj.transportNotes || "",
  overall_tax_percent: obj.overallTaxPercent ?? 0,
  status: obj.status,
  json_converted: obj.jsonConverted ?? false,
  json_signed: obj.jsonSigned ?? false,
  irn: obj.irn,
  ack_no: obj.ackNo,
  ack_date: obj.ackDate,
  signed_invoice: obj.signedInvoice,
  signed_qr_code: obj.signedQRCode,
  eway_bill_id: obj.ewayBillId,
});

export async function getAll() {
  const { data: invoices, error: invError } = await supabase
    .from('invoices')
    .select('*')
    .order('created_at', { ascending: false });

  if (invError) throw invError;

  const { data: items, error: itemsError } = await supabase
    .from('invoice_items')
    .select('*');

  if (itemsError) throw itemsError;

  const { data: ewayBills, error: ewayError } = await supabase
    .from('eway_bill_details')
    .select('*');

  if (ewayError) throw ewayError;

  const itemsMap = {};
  items.forEach((item) => {
    if (!itemsMap[item.invoice_id]) itemsMap[item.invoice_id] = [];
    itemsMap[item.invoice_id].push(item);
  });

  const ewayMap = {};
  ewayBills.forEach((eway) => {
    ewayMap[eway.invoice_id] = eway;
  });

  return invoices.map((inv) =>
    mapInvoice({
      ...inv,
      invoice_items: itemsMap[inv.id] || [],
      eway_bill_details: ewayMap[inv.id] || null,
    })
  );
}

export async function create(invoice) {
  const { data: companyData, error: compError } = await supabase
    .from('companies')
    .select('id, invoice_seq')
    .limit(1);

  if (compError) throw compError;
  if (!companyData || companyData.length === 0) throw new Error('No company found');

  const company = companyData[0];
  const invoiceNo = String(company.invoice_seq);

  await supabase
    .from('companies')
    .update({ invoice_seq: company.invoice_seq + 1 })
    .eq('id', company.id);

  const invoiceToInsert = {
    ...unmapInvoice({ ...invoice, invoiceNo }),
    created_by: null,
  };

  const { error: invError } = await supabase
    .from('invoices')
    .insert([invoiceToInsert]);

  if (invError) throw invError;

  const { data: fetchedInvoices, error: fetchError } = await supabase
    .from('invoices')
    .select('*')
    .eq('invoice_no', invoiceNo);

  if (fetchError) throw fetchError;
  if (!fetchedInvoices || fetchedInvoices.length === 0) {
    throw new Error('Failed to fetch inserted invoice');
  }

  const newInvoice = fetchedInvoices[0];

  if (invoice.items && invoice.items.length > 0) {
    const itemsToInsert = invoice.items.map((item, idx) => ({
      invoice_id: newInvoice.id,
      product_id: item.productId,
      name: item.name,
      hsn: item.hsn,
      unit: item.unit,
      qty: item.qty,
      rate: item.rate,
      tax_rate: item.taxRate ?? 0,
      amount: item.amount,
      sort_order: idx,
    }));

    const { error: itemsError } = await supabase
      .from('invoice_items')
      .insert(itemsToInsert);

    if (itemsError) throw itemsError;

    for (const item of invoice.items) {
      const products = await productsService.getAll();
      const prod = products.find((p) => p.id === item.productId);
      if (prod) {
        await productsService.updateStock(item.productId, prod.stock - item.qty);
      }
    }
  }

  const { data: invoiceItems } = await supabase
    .from('invoice_items')
    .select('*')
    .eq('invoice_id', newInvoice.id);

  return mapInvoice({
    ...newInvoice,
    invoice_items: invoiceItems || [],
    eway_bill_details: null,
  });
}

export async function updateIRN(id, irnData) {
  const { data, error } = await supabase
    .from('invoices')
    .update({
      irn: irnData.irn,
      ack_no: irnData.ackNo,
      ack_date: irnData.ackDate,
      signed_invoice: irnData.signedInvoice,
      signed_qr_code: irnData.signedQRCode,
      json_signed: irnData.jsonSigned ?? true,
    })
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;

  const { data: invoiceItems } = await supabase
    .from('invoice_items')
    .select('*')
    .eq('invoice_id', id);

  const { data: ewayBills } = await supabase
    .from('eway_bill_details')
    .select('*')
    .eq('invoice_id', id);

  return mapInvoice({
    ...data,
    invoice_items: invoiceItems || [],
    eway_bill_details: (ewayBills && ewayBills.length > 0) ? ewayBills[0] : null,
  });
}

export async function saveEWBJSON(invoiceId, ewbJson) {
  const ewbRecord = {
    invoice_id: invoiceId,
    ewb_json: ewbJson,
    ewb_generated: true,
  };

  const { data: existing } = await supabase
    .from('eway_bill_details')
    .select('id')
    .eq('invoice_id', invoiceId);

  if (existing && existing.length > 0) {
    const { error } = await supabase
      .from('eway_bill_details')
      .update(ewbRecord)
      .eq('invoice_id', invoiceId);
    if (error) throw error;
  } else {
    const { error } = await supabase
      .from('eway_bill_details')
      .insert([ewbRecord]);
    if (error) throw error;
  }
}

export async function updateEWB(invoiceId, ewbData) {
  const ewbRecord = {
    invoice_id: invoiceId,
    transporter_id: ewbData.transporterId,
    trans_mode: ewbData.transMode,
    distance_km: ewbData.distanceKm,
    vehicle_no: ewbData.vehicleNo,
    vehicle_type: ewbData.vehicleType,
    trans_doc_no: ewbData.transDocNo,
    trans_doc_dt: ewbData.transDocDt,
    ewb_json: ewbData.ewbJson,
    ewb_signed_response: ewbData.ewbSignedResponse,
    ewb_generated: ewbData.ewbGenerated ?? true,
    ewb_signed: ewbData.ewbSigned ?? false,
    ewb_no: ewbData.ewbNo,
    ewb_dt: ewbData.ewbDt,
    ewb_valid_till: ewbData.ewbValidTill,
    ewb_status: ewbData.ewbStatus,
  };

  const { data: existing } = await supabase
    .from('eway_bill_details')
    .select('id')
    .eq('invoice_id', invoiceId);

  if (existing && existing.length > 0) {
    const { error } = await supabase
      .from('eway_bill_details')
      .update(ewbRecord)
      .eq('invoice_id', invoiceId);
    if (error) throw error;
  } else {
    const { error } = await supabase
      .from('eway_bill_details')
      .insert([ewbRecord]);
    if (error) throw error;
  }

  const { data: ewbData2 } = await supabase
    .from('eway_bill_details')
    .select('id')
    .eq('invoice_id', invoiceId);

  if (ewbData2 && ewbData2.length > 0) {
    await supabase
      .from('invoices')
      .update({ eway_bill_id: ewbData2[0].id })
      .eq('id', invoiceId);
  }

  const { data: updatedInv, error: fetchError } = await supabase
    .from('invoices')
    .select('*')
    .eq('id', invoiceId);

  if (fetchError) throw fetchError;
  if (!updatedInv || updatedInv.length === 0) throw new Error('Invoice not found');

  const inv = updatedInv[0];

  const { data: invoiceItems } = await supabase
    .from('invoice_items')
    .select('*')
    .eq('invoice_id', invoiceId);

  const { data: ewayBills } = await supabase
    .from('eway_bill_details')
    .select('*')
    .eq('invoice_id', invoiceId);

  return mapInvoice({
    ...inv,
    invoice_items: invoiceItems || [],
    eway_bill_details: (ewayBills && ewayBills.length > 0) ? ewayBills[0] : null,
  });
}

export async function update(id, changes) {
  const updateData = {};

  if ('invoiceNo' in changes) updateData.invoice_no = changes.invoiceNo;
  if ('customerId' in changes) updateData.customer_id = changes.customerId;
  if ('invoiceType' in changes) updateData.invoice_type = changes.invoiceType;
  if ('date' in changes) updateData.date = changes.date;
  if ('deliveryNote' in changes) updateData.delivery_note = changes.deliveryNote;
  if ('paymentTerms' in changes) updateData.payment_terms = changes.paymentTerms;
  if ('subtotal' in changes) updateData.subtotal = changes.subtotal;
  if ('cgst' in changes) updateData.cgst = changes.cgst;
  if ('sgst' in changes) updateData.sgst = changes.sgst;
  if ('igst' in changes) updateData.igst = changes.igst;
  if ('totalTax' in changes) updateData.total_tax = changes.totalTax;
  if ('total' in changes) updateData.total = changes.total;
  if ('hasTransportDetails' in changes) updateData.has_transport_details = changes.hasTransportDetails;
  if ('loadingCharge' in changes) updateData.loading_charge = changes.loadingCharge;
  if ('transportCharge' in changes) updateData.transport_charge = changes.transportCharge;
  if ('freightCharge' in changes) updateData.freight_charge = changes.freightCharge;
  if ('transportNotes' in changes) updateData.transport_notes = changes.transportNotes;
  if ('overallTaxPercent' in changes) updateData.overall_tax_percent = changes.overallTaxPercent;
  if ('status' in changes) updateData.status = changes.status;
  if ('jsonConverted' in changes) updateData.json_converted = changes.jsonConverted;

  const { data, error } = await supabase
    .from('invoices')
    .update(updateData)
    .eq('id', id)
    .select();

  if (error) throw error;
  if (!data || data.length === 0) throw new Error('Invoice not found');

  const updatedInv = data[0];

  const { data: invoiceItems } = await supabase
    .from('invoice_items')
    .select('*')
    .eq('invoice_id', id);

  const { data: ewayBills } = await supabase
    .from('eway_bill_details')
    .select('*')
    .eq('invoice_id', id);

  return mapInvoice({
    ...updatedInv,
    invoice_items: invoiceItems || [],
    eway_bill_details: (ewayBills && ewayBills.length > 0) ? ewayBills[0] : null,
  });
}

export async function bulkImportSignedInvoices(signedResponseArray) {
  const results = { successful: [], failed: [], errors: [] };

  const decodeJWT = (token) => {
    const parts = token.split('.');
    const decoded = parts[1].replace(/-/g, '+').replace(/_/g, '/');
    const jsonStr = atob(decoded);
    return JSON.parse(jsonStr);
  };

  for (const item of signedResponseArray) {
    try {
      if (!item.SignedInvoice) {
        const err = 'Missing SignedInvoice field';
        results.failed.push({ item, error: err });
        results.errors.push(err);
        continue;
      }

      const decodedPayload = decodeJWT(item.SignedInvoice);
      const invoiceNo = decodedPayload?.Data?.Doc?.Num;

      if (!invoiceNo) {
        const err = 'Could not extract invoice number from SignedInvoice';
        results.failed.push({ item, error: err });
        results.errors.push(err);
        continue;
      }

      const { data: invoices, error: findError } = await supabase
        .from('invoices')
        .select('id')
        .eq('invoice_no', invoiceNo.toString());

      if (findError) throw findError;
      if (!invoices || invoices.length === 0) {
        const err = `Invoice #${invoiceNo} not found in system`;
        results.failed.push({ invoiceNo, error: err });
        results.errors.push(err);
        continue;
      }

      const invoiceId = invoices[0].id;

      const { error: updateError } = await supabase
        .from('invoices')
        .update({
          irn: item.Irn,
          ack_no: item.AckNo,
          ack_date: item.AckDt,
          signed_invoice: item.SignedInvoice,
          signed_qr_code: item.SignedQRCode,
          json_signed: true,
        })
        .eq('id', invoiceId);

      if (updateError) throw updateError;

      results.successful.push({
        invoiceNo,
        irn: item.Irn,
        ackNo: item.AckNo,
        ackDate: item.AckDt,
        signedInvoice: item.SignedInvoice,
        signedQRCode: item.SignedQRCode,
      });
    } catch (err) {
      results.failed.push({ item, error: err.message });
      results.errors.push(err.message);
    }
  }

  return results;
}