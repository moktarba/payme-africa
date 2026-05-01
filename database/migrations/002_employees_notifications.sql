-- ============================================================
-- Migration 002 — Employés, rôles, notifications
-- ============================================================

-- ── EMPLOYEES ───────────────────────────────────────────────
CREATE TABLE employees (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    merchant_id UUID NOT NULL REFERENCES merchants(id) ON DELETE CASCADE,
    name VARCHAR(200) NOT NULL,
    phone VARCHAR(20),
    role VARCHAR(30) NOT NULL DEFAULT 'cashier',
    -- roles : owner | manager | cashier
    pin_hash VARCHAR(255),          -- PIN 4 chiffres pour connexion rapide
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    daily_limit INTEGER,            -- limite de vente journalière (XOF), NULL = illimité
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_employees_merchant ON employees(merchant_id, is_active);

-- ── EMPLOYEE SESSIONS ───────────────────────────────────────
CREATE TABLE employee_sessions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    employee_id UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
    merchant_id UUID NOT NULL REFERENCES merchants(id) ON DELETE CASCADE,
    access_token VARCHAR(255) NOT NULL,
    expires_at TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_emp_sessions_token ON employee_sessions(access_token);

-- ── Ajouter colonnes à transactions pour traçabilité employé ─
ALTER TABLE transactions
  ADD COLUMN IF NOT EXISTS employee_id UUID REFERENCES employees(id),
  ADD COLUMN IF NOT EXISTS employee_name VARCHAR(200);

-- ── NOTIFICATIONS ────────────────────────────────────────────
CREATE TABLE notifications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    merchant_id UUID NOT NULL REFERENCES merchants(id) ON DELETE CASCADE,
    type VARCHAR(50) NOT NULL,
    -- types : transaction_confirmed | transaction_pending | daily_summary
    --         low_stock | employee_login | employee_limit_exceeded
    title VARCHAR(200) NOT NULL,
    body TEXT NOT NULL,
    data JSONB DEFAULT '{}',
    is_read BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_notif_merchant ON notifications(merchant_id, is_read, created_at DESC);

-- ── NOTIFICATION PREFERENCES ────────────────────────────────
CREATE TABLE notification_preferences (
    merchant_id UUID PRIMARY KEY REFERENCES merchants(id) ON DELETE CASCADE,
    tx_confirmed  BOOLEAN NOT NULL DEFAULT TRUE,
    tx_pending    BOOLEAN NOT NULL DEFAULT TRUE,
    daily_summary BOOLEAN NOT NULL DEFAULT TRUE,
    employee_login BOOLEAN NOT NULL DEFAULT FALSE,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── TRIGGER updated_at employees ────────────────────────────
CREATE TRIGGER update_employees_updated_at BEFORE UPDATE ON employees
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ── SEED employés de test ────────────────────────────────────
INSERT INTO employees (id, merchant_id, name, phone, role, is_active)
VALUES
  ('e0000001-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000001',
   'Fatou Sow', '+221770000001', 'cashier', TRUE),
  ('e0000002-0000-0000-0000-000000000002', 'a0000000-0000-0000-0000-000000000001',
   'Ibrahima Diallo', '+221770000002', 'manager', TRUE);

-- ── SEED notifications de test ───────────────────────────────
INSERT INTO notifications (merchant_id, type, title, body, data, is_read)
VALUES
  ('a0000000-0000-0000-0000-000000000001', 'transaction_confirmed',
   'Paiement reçu', 'Wave · 2 500 FCFA confirmé par Fatou',
   '{"amount":2500,"provider":"wave"}', FALSE),
  ('a0000000-0000-0000-0000-000000000001', 'daily_summary',
   'Résumé du jour', '7 500 FCFA encaissés · 3 transactions',
   '{"total":7500,"count":3}', FALSE),
  ('a0000000-0000-0000-0000-000000000001', 'employee_login',
   'Connexion employé', 'Fatou Sow a commencé sa session',
   '{"employee":"Fatou Sow"}', TRUE);

-- ── SEED préférences notifications ──────────────────────────
INSERT INTO notification_preferences (merchant_id)
VALUES ('a0000000-0000-0000-0000-000000000001');
