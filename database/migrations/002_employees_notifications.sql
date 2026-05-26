-- ============================================================
-- Migration 002 bis - Compatibilite employes/notifications
-- Ce fichier reste idempotent car Docker execute tous les .sql.
-- ============================================================

CREATE TABLE IF NOT EXISTS employees (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    merchant_id UUID NOT NULL REFERENCES merchants(id) ON DELETE CASCADE,
    name VARCHAR(200) NOT NULL,
    phone VARCHAR(20),
    role VARCHAR(30) NOT NULL DEFAULT 'cashier',
    pin_hash VARCHAR(255),
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    daily_limit INTEGER,
    permissions JSONB NOT NULL DEFAULT '{
        "can_view_reports": false,
        "can_cancel_transactions": false,
        "can_manage_catalog": false,
        "can_manage_employees": false
    }',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE employees
    ADD COLUMN IF NOT EXISTS daily_limit INTEGER,
    ADD COLUMN IF NOT EXISTS permissions JSONB NOT NULL DEFAULT '{
        "can_view_reports": false,
        "can_cancel_transactions": false,
        "can_manage_catalog": false,
        "can_manage_employees": false
    }';

CREATE INDEX IF NOT EXISTS idx_employees_merchant ON employees(merchant_id, is_active);

ALTER TABLE transactions
    ADD COLUMN IF NOT EXISTS employee_id UUID REFERENCES employees(id),
    ADD COLUMN IF NOT EXISTS employee_name VARCHAR(200);

CREATE TABLE IF NOT EXISTS employee_sessions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    employee_id UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
    merchant_id UUID NOT NULL REFERENCES merchants(id) ON DELETE CASCADE,
    token_hash VARCHAR(255),
    access_token VARCHAR(255),
    expires_at TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE employee_sessions
    ADD COLUMN IF NOT EXISTS token_hash VARCHAR(255),
    ADD COLUMN IF NOT EXISTS access_token VARCHAR(255);

CREATE INDEX IF NOT EXISTS idx_emp_sessions_token_hash ON employee_sessions(token_hash);
CREATE INDEX IF NOT EXISTS idx_emp_sessions_access_token ON employee_sessions(access_token);

CREATE TABLE IF NOT EXISTS notifications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    merchant_id UUID NOT NULL REFERENCES merchants(id) ON DELETE CASCADE,
    type VARCHAR(50) NOT NULL,
    title VARCHAR(200) NOT NULL,
    body TEXT NOT NULL,
    data JSONB DEFAULT '{}',
    is_read BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_notif_merchant ON notifications(merchant_id, is_read, created_at DESC);

CREATE TABLE IF NOT EXISTS notification_preferences (
    merchant_id UUID PRIMARY KEY REFERENCES merchants(id) ON DELETE CASCADE,
    tx_confirmed BOOLEAN NOT NULL DEFAULT TRUE,
    tx_pending BOOLEAN NOT NULL DEFAULT TRUE,
    daily_summary BOOLEAN NOT NULL DEFAULT TRUE,
    employee_login BOOLEAN NOT NULL DEFAULT FALSE,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

DROP TRIGGER IF EXISTS update_employees_updated_at ON employees;
CREATE TRIGGER update_employees_updated_at BEFORE UPDATE ON employees
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

INSERT INTO employees (id, merchant_id, name, phone, role, is_active, permissions)
VALUES
    (
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
    )
ON CONFLICT (id) DO NOTHING;

INSERT INTO notification_preferences (merchant_id)
VALUES ('a0000000-0000-0000-0000-000000000001')
ON CONFLICT (merchant_id) DO NOTHING;
