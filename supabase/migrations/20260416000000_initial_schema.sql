-- ============================================================
-- Rudra Granites POS — Initial Schema
-- Supabase Migration: 20260416000000_initial_schema.sql
-- Flat tables, no FK constraints, no RLS
-- ============================================================


-- ============================================================
-- 1. companies
-- ============================================================
CREATE TABLE IF NOT EXISTS companies (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name          TEXT,
  address       TEXT,
  city          TEXT,
  pin           INTEGER,
  gstin         TEXT,
  state_code    TEXT,
  state_name    TEXT,
  email         TEXT,
  phone         TEXT,
  invoice_seq   INTEGER DEFAULT 4960,
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  updated_at    TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- 2. users
-- ============================================================
CREATE TABLE IF NOT EXISTS users (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name          TEXT,
  email         TEXT,
  password_hash TEXT,
  role          TEXT DEFAULT 'billing',   -- 'admin' | 'billing' | 'inventory'
  branch        TEXT,
  status        TEXT DEFAULT 'active',    -- 'active' | 'inactive'
  last_login    TIMESTAMPTZ,
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  updated_at    TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- 3. states
-- ============================================================
CREATE TABLE IF NOT EXISTS states (
  code          TEXT PRIMARY KEY,   -- "33", "32", etc.
  name          TEXT
);

INSERT INTO states (code, name) VALUES
  ('33', 'Tamil Nadu'),
  ('32', 'Kerala'),
  ('29', 'Karnataka'),
  ('36', 'Telangana'),
  ('37', 'Andhra Pradesh'),
  ('27', 'Maharashtra'),
  ('07', 'Delhi'),
  ('09', 'Uttar Pradesh'),
  ('20', 'Jharkhand'),
  ('24', 'Gujarat'),
  ('08', 'Rajasthan'),
  ('06', 'Haryana'),
  ('03', 'Punjab'),
  ('02', 'Himachal Pradesh'),
  ('01', 'Jammu And Kashmir'),
  ('10', 'Bihar'),
  ('11', 'Sikkim'),
  ('12', 'Arunachal Pradesh'),
  ('13', 'Nagaland'),
  ('14', 'Manipur'),
  ('15', 'Mizoram'),
  ('16', 'Tripura'),
  ('17', 'Meghalaya'),
  ('18', 'Assam'),
  ('19', 'West Bengal'),
  ('21', 'Odisha'),
  ('22', 'Chhattisgarh'),
  ('23', 'Madhya Pradesh'),
  ('25', 'Daman And Diu'),
  ('26', 'Dadra And Nagar Haveli'),
  ('28', 'Andhra Pradesh (Old)'),
  ('30', 'Goa'),
  ('31', 'Lakshadweep'),
  ('34', 'Pondicherry'),
  ('35', 'Andaman And Nicobar Islands')
ON CONFLICT (code) DO NOTHING;

-- ============================================================
-- 4. products
-- ============================================================
CREATE TABLE IF NOT EXISTS products (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name          TEXT,
  category      TEXT,        -- 'Granite' | 'Marble' | 'Tiles' | 'Stone'
  hsn           TEXT,
  unit          TEXT,        -- 'sqf' | 'piece' | 'slab'
  size          TEXT,
  thickness     TEXT,
  rate          NUMERIC(12,2),
  tax_rate      NUMERIC(5,2),
  stock         NUMERIC(12,3) DEFAULT 0,
  min_stock     NUMERIC(12,3) DEFAULT 0,
  warehouse     TEXT,
  is_active     BOOLEAN DEFAULT TRUE,
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  updated_at    TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- 5. stock_adjustments
-- ============================================================
CREATE TABLE IF NOT EXISTS stock_adjustments (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id      UUID,
  type            TEXT,          -- 'sale' | 'purchase' | 'adjustment' | 'return'
  qty_change      NUMERIC(12,3), -- negative = deduction, positive = addition
  reason          TEXT,
  reference_id    UUID,          -- invoice or purchase id
  reference_type  TEXT,          -- 'invoice' | 'purchase' | 'manual'
  performed_by    UUID,          -- user id
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- 6. customers
-- ============================================================
CREATE TABLE IF NOT EXISTS customers (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name          TEXT,
  mobile        TEXT,
  gstin         TEXT,
  address       TEXT,
  city          TEXT,
  state_code    TEXT,
  pin           TEXT,
  credit_limit  NUMERIC(12,2) DEFAULT 0,
  outstanding   NUMERIC(12,2) DEFAULT 0,
  is_active     BOOLEAN DEFAULT TRUE,
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  updated_at    TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- 7. customer_addresses
-- ============================================================
CREATE TABLE IF NOT EXISTS customer_addresses (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id   UUID,
  label         TEXT,
  address       TEXT,
  is_default    BOOLEAN DEFAULT FALSE,
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- 8. suppliers
-- ============================================================
CREATE TABLE IF NOT EXISTS suppliers (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name          TEXT,
  mobile        TEXT,
  gstin         TEXT,
  address       TEXT,
  state_code    TEXT,
  outstanding   NUMERIC(12,2) DEFAULT 0,
  is_active     BOOLEAN DEFAULT TRUE,
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  updated_at    TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- 9. transporters
-- ============================================================
CREATE TABLE IF NOT EXISTS transporters (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trans_id      TEXT,       -- GSTIN of transporter
  trans_name    TEXT,
  contact       TEXT,
  email         TEXT,
  address       TEXT,
  state_code    TEXT,
  is_active     BOOLEAN DEFAULT TRUE,
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  updated_at    TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- 10. invoices
-- ============================================================
CREATE TABLE IF NOT EXISTS invoices (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_no          TEXT UNIQUE,
  customer_id         UUID,
  invoice_type        TEXT DEFAULT 'tax',     -- 'tax' | 'retail'
  date                DATE,
  delivery_note       TEXT,
  payment_terms       TEXT,
  subtotal            NUMERIC(12,2) DEFAULT 0,
  cgst                NUMERIC(12,2) DEFAULT 0,
  sgst                NUMERIC(12,2) DEFAULT 0,
  igst                NUMERIC(12,2) DEFAULT 0,
  total_tax           NUMERIC(12,2) DEFAULT 0,
  total               NUMERIC(12,2) DEFAULT 0,
  status              TEXT DEFAULT 'active',  -- 'active' | 'cancelled'
  created_by          UUID,

  -- E-Invoice lifecycle
  json_converted      BOOLEAN DEFAULT FALSE,
  json_signed         BOOLEAN DEFAULT FALSE,
  irn                 TEXT,
  ack_no              BIGINT,
  ack_date            TIMESTAMPTZ,
  signed_invoice      TEXT,
  signed_qr_code      TEXT,

  -- E-Way Bill reference (1:1 with eway_bill_details)
  eway_bill_id        UUID,

  created_at          TIMESTAMPTZ DEFAULT NOW(),
  updated_at          TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- 11. invoice_items
-- ============================================================
CREATE TABLE IF NOT EXISTS invoice_items (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id    UUID,
  product_id    UUID,
  name          TEXT,        -- snapshot of product name at billing time
  hsn           TEXT,
  unit          TEXT,
  qty           NUMERIC(12,3),
  rate          NUMERIC(12,2),
  tax_rate      NUMERIC(5,2),
  amount        NUMERIC(12,2),
  sort_order    INTEGER DEFAULT 0,
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- 12. purchases
-- ============================================================
CREATE TABLE IF NOT EXISTS purchases (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  purchase_no           TEXT UNIQUE,     -- "PO-0001"
  supplier_id           UUID,
  supplier_name         TEXT,            -- snapshot
  supplier_invoice_no   TEXT,
  date                  DATE,
  total                 NUMERIC(12,2) DEFAULT 0,
  status                TEXT DEFAULT 'received',   -- 'received' | 'pending' | 'cancelled'
  created_by            UUID,
  created_at            TIMESTAMPTZ DEFAULT NOW(),
  updated_at            TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- 13. purchase_items
-- ============================================================
CREATE TABLE IF NOT EXISTS purchase_items (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  purchase_id     UUID,
  product_id      UUID,
  name            TEXT,        -- snapshot
  hsn             TEXT,
  unit            TEXT,
  qty             NUMERIC(12,3),
  purchase_rate   NUMERIC(12,2),
  amount          NUMERIC(12,2),
  sort_order      INTEGER DEFAULT 0,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- 14. dispatches
-- ============================================================
CREATE TABLE IF NOT EXISTS dispatches (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  dispatch_no       TEXT UNIQUE,     -- "DSP-0001"
  invoice_id        UUID,
  invoice_no        TEXT,            -- snapshot
  vehicle_no        TEXT,
  destination       TEXT,
  delivery_terms    TEXT,
  transport_details TEXT,
  status            TEXT DEFAULT 'dispatched',   -- 'dispatched' | 'delivered'
  created_by        UUID,
  created_at        TIMESTAMPTZ DEFAULT NOW(),
  updated_at        TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- 15. eway_bill_details
-- ============================================================
CREATE TABLE IF NOT EXISTS eway_bill_details (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id            UUID UNIQUE,    -- reference back to invoices (1:1)
  transporter_id        UUID,
  trans_mode            TEXT,           -- 'Road' | 'Rail' | 'Air' | 'Ship'
  distance_km           INTEGER,
  vehicle_no            TEXT,
  vehicle_type          TEXT,           -- 'R' (Regular) | 'O' (Over-Dimensional)
  trans_doc_no          TEXT,
  trans_doc_dt          DATE,
  ewb_json              JSONB,          -- generated JSON (pre-signing)
  ewb_signed_response   JSONB,          -- full signed response from portal
  ewb_generated         BOOLEAN DEFAULT FALSE,
  ewb_signed            BOOLEAN DEFAULT FALSE,
  ewb_no                BIGINT,         -- E-Way Bill number (from portal)
  ewb_dt                TIMESTAMPTZ,    -- date of generation
  ewb_valid_till        TIMESTAMPTZ,    -- validity end date
  ewb_status            TEXT,           -- 'ACT' | 'CNL'
  created_at            TIMESTAMPTZ DEFAULT NOW(),
  updated_at            TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- 16. gsp_config
-- ============================================================
CREATE TABLE IF NOT EXISTS gsp_config (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id    UUID,
  api_key       TEXT,
  api_secret    TEXT,
  gstin         TEXT,
  ewb_username  TEXT,
  ewb_password  TEXT,
  environment   TEXT DEFAULT 'sandbox',  -- 'sandbox' | 'production'
  backend_url   TEXT,
  updated_by    UUID,
  updated_at    TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- 17. audit_logs
-- ============================================================
CREATE TABLE IF NOT EXISTS audit_logs (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID,
  user_name       TEXT,
  module          TEXT,          -- 'Billing' | 'Inventory' | 'E-Way' | etc.
  action          TEXT,          -- 'Invoice Created' | 'Stock Adjusted' | etc.
  details         TEXT,
  reference_id    UUID,
  reference_type  TEXT,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);
