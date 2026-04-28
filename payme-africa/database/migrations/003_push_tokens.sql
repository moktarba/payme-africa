-- Migration 003 — Push tokens pour notifications mobiles
ALTER TABLE merchants
  ADD COLUMN IF NOT EXISTS push_token TEXT;

-- Index pour envoi de masse (résumés)
CREATE INDEX IF NOT EXISTS idx_merchants_push_token
  ON merchants(push_token)
  WHERE push_token IS NOT NULL;
