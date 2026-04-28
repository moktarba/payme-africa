-- ============================================================
-- Sprint 3 — Employés, rôles, notifications
-- ============================================================

-- ── EMPLOYÉS ─────────────────────────────────────────────────
CREATE TABLE employees (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    merchant_id UUID NOT NULL REFERENCES merchants(id) ON DELETE CASCADE,
    name VARCHAR(200) NOT NULL,
    phone VARCHAR(20),
    role VARCHAR(30) NOT NULL DEFAULT 'cashier',
    -- owner | manager | cashier
    pin_hash VARCHAR(255),          -- PIN 4 chiffres pour accès rapide
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    permissions JSONB NOT NULL DEFAULT '{
        "can_view_reports": false,
        "can_cancel_transactions": false,
        "can_manage_catalog": false,
        "can_manage_employees": false
    }',
    last_login_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_employees_merchant ON employees(merchant_id, is_active);

-- Ajouter colonne employee_id dans transactions
ALTER TABLE transactions
    ADD COLUMN IF NOT EXISTS employee_id UUID REFERENCES employees(id);

-- ── SESSIONS EMPLOYÉS ─────────────────────────────────────────
CREATE TABLE employee_sessions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    employee_id UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
    merchant_id UUID NOT NULL REFERENCES merchants(id) ON DELETE CASCADE,
    token_hash VARCHAR(255) NOT NULL,
    expires_at TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_emp_sessions_token ON employee_sessions(token_hash);

-- ── NOTIFICATIONS ─────────────────────────────────────────────
CREATE TABLE notifications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    merchant_id UUID NOT NULL REFERENCES merchants(id) ON DELETE CASCADE,
    type VARCHAR(50) NOT NULL,
    -- 'transaction_confirmed' | 'transaction_pending' | 'daily_summary' |
    -- 'low_stock_alert' | 'employee_login' | 'system'
    title VARCHAR(200) NOT NULL,
    body TEXT NOT NULL,
    data JSONB DEFAULT '{}',
    is_read BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_notif_merchant ON notifications(merchant_id, is_read, created_at DESC);

-- Trigger updated_at employés
CREATE TRIGGER update_employees_updated_at BEFORE UPDATE ON employees
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ── SEED EMPLOYÉS ─────────────────────────────────────────────
INSERT INTO employees (id, merchant_id, name, phone, role, is_active, permissions)
VALUES (
    'e0000000-0000-0000-0000-000000000001',
    'a0000000-0000-0000-0000-000000000001',
    'Fatou Diop',
    '+221770000001',
    'cashier',
    TRUE,
    '{"can_view_reports": false, "can_cancel_transactions": false, "can_manage_catalog": false, "can_manage_employees": false}'
),
(
    'e0000000-0000-0000-0000-000000000002',
    'a0000000-0000-0000-0000-000000000001',
    'Ibrahima Sarr',
    '+221770000002',
    'manager',
    TRUE,
    '{"can_view_reports": true, "can_cancel_transactions": true, "can_manage_catalog": true, "can_manage_employees": false}'
);

-- Notifications de seed
INSERT INTO notifications (merchant_id, type, title, body, data)
VALUES
    ('a0000000-0000-0000-0000-000000000001', 'transaction_confirmed', 'Paiement reçu', 'Wave · 2 500 FCFA confirmé', '{"amount": 2500, "provider": "wave"}'),
    ('a0000000-0000-0000-0000-000000000001', 'daily_summary', 'Bilan de la journée', 'Vous avez encaissé 7 500 FCFA en 3 transactions aujourd''hui.', '{"total": 7500, "count": 3}'),
    ('a0000000-0000-0000-0000-000000000001', 'employee_login', 'Connexion employé', 'Fatou Diop s''est connectée à 09:14', '{"employee_name": "Fatou Diop"}');
