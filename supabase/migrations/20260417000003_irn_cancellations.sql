CREATE TABLE IF NOT EXISTS irn_cancellations (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id          UUID NOT NULL,
  invoice_no          TEXT,
  irn                 TEXT NOT NULL,
  version             TEXT DEFAULT '1.01',
  cancel_reason_code  TEXT NOT NULL,
  cancel_reason_text  TEXT,
  request_json        JSONB,
  request_generated   BOOLEAN DEFAULT FALSE,
  request_generated_at TIMESTAMPTZ,
  status              TEXT DEFAULT 'json_generated',
  created_by          UUID,
  created_at          TIMESTAMPTZ DEFAULT NOW(),
  updated_at          TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_irn_cancellations_invoice_id
ON irn_cancellations(invoice_id);