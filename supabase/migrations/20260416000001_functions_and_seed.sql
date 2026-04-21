-- ============================================================
-- Seed Data: Company
-- ============================================================
INSERT INTO companies (id, name, address, city, pin, gstin, state_code, state_name, email, phone, invoice_seq)
VALUES (
  '550e8400-e29b-41d4-a716-446655440000',
  'RUDRA GRANITES & TILES',
  'P/ARAICODE, THUCKALAY, KANYAKUMARI DIST',
  'THUCKALAY',
  629175,
  '33AAYFR4969H1ZE',
  '33',
  'Tamil Nadu',
  'rudragranite001@gmail.com',
  '9876543210',
  4960
)
ON CONFLICT (id) DO NOTHING;

-- ============================================================
-- Seed Data: Products
-- ============================================================
INSERT INTO products (name, category, hsn, unit, size, thickness, rate, tax_rate, stock, min_stock, warehouse)
VALUES
  ('GRANITE SLAB', 'Granite', '25161100', 'sqf', '8x4', '18mm', 85.00, 18.00, 5000.000, 500.000, 'Main'),
  ('MARBLE SLAB', 'Marble', '25151100', 'sqf', '7x4', '16mm', 120.00, 18.00, 3000.000, 300.000, 'Main'),
  ('CERAMIC TILES', 'Tiles', '69072100', 'piece', '2x2', '8mm', 45.00, 18.00, 10000.000, 1000.000, 'Main'),
  ('SANDSTONE SLAB', 'Stone', '25161200', 'slab', '6x3', '20mm', 950.00, 18.00, 200.000, 20.000, 'Yard')
ON CONFLICT DO NOTHING;

-- ============================================================
-- Seed Data: Customers
-- ============================================================
INSERT INTO customers (name, mobile, gstin, address, city, state_code, pin, credit_limit, outstanding)
VALUES
  ('LOBI DHAS', '9876543210', '33AFZPL5401L1Z2', 'PULLUVILAI, VEEYANOOR', 'VEEYANOOR', '33', '629177', 500000.00, 0.00),
  ('KUMAR TRADERS', '9876543211', '33BXYPS1234A1Z5', 'NAGERCOIL', 'NAGERCOIL', '33', '629001', 300000.00, 50000.00)
ON CONFLICT DO NOTHING;

-- ============================================================
-- Seed Data: Customer Addresses
-- ============================================================
INSERT INTO customer_addresses (customer_id, label, address, is_default)
SELECT id, 'Primary', address, TRUE
FROM customers
WHERE name IN ('LOBI DHAS', 'KUMAR TRADERS')
ON CONFLICT DO NOTHING;

-- ============================================================
-- Seed Data: Suppliers
-- ============================================================
INSERT INTO suppliers (name, mobile, gstin, address, state_code, outstanding)
VALUES
  ('STONE WORLD SUPPLIERS', '9123456780', '29AABCS1234F1Z5', 'BANGALORE', '29', 0.00),
  ('MARBLE HOUSE', '9123456781', '33AABCM5678G1Z3', 'MADURAI', '33', 25000.00)
ON CONFLICT DO NOTHING;

-- ============================================================
-- Seed Data: Transporters
-- ============================================================
INSERT INTO transporters (trans_id, trans_name, contact, email, address, state_code)
VALUES
  ('29DPZPS4403C1ZF', 'ABC Transport Ltd', '9876543210', 'contact@abctransport.in', 'Transport Hub, Bangalore', '29'),
  ('33AAKPT7890M1Z5', 'Rapid Logistics Pvt Ltd', '9123456789', 'info@rapidlogistics.in', 'Logistics Park, Chennai', '33'),
  ('27AAECT1234H1Z0', 'National Transport Co', '9988776655', 'ops@nationaltransport.in', 'Transport Yard, Mumbai', '27')
ON CONFLICT DO NOTHING;

-- ============================================================
-- Seed Data: GSP Config (empty template)
-- ============================================================
INSERT INTO gsp_config (id, company_id, api_key, api_secret, gstin, ewb_username, ewb_password, environment, backend_url)
VALUES (
  '650e8400-e29b-41d4-a716-446655440000',
  '550e8400-e29b-41d4-a716-446655440000',
  '',
  '',
  '33AAYFR4969H1ZE',
  '',
  '',
  'sandbox',
  ''
)
ON CONFLICT (id) DO NOTHING;
