-- ============================================================
-- Fix: Change ewb_no from BIGINT to TEXT
-- ============================================================

ALTER TABLE eway_bill_details
  ALTER COLUMN ewb_no TYPE TEXT;
