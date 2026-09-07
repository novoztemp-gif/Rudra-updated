-- Link dispatches to the transporters master list. Previously the Dispatch
-- form only had a free-text "Transport Details" field, so the Transporters
-- module (transporter name, GSTIN, contact, address) was never actually
-- referenced anywhere in the app.
ALTER TABLE dispatches
  ADD COLUMN IF NOT EXISTS transporter_id UUID REFERENCES transporters(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS transporter_name TEXT; -- snapshot, same pattern as invoice_no
