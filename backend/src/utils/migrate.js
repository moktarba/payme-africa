'use strict';

// Migrations embarquées — idempotentes (IF NOT EXISTS partout)
// Évite toute dépendance au filesystem ou à la config Docker
const MIGRATIONS = [
  {
    name: '001_initial_schema',
    sql: `
      CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

      CREATE TABLE IF NOT EXISTS merchants (
        id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        phone             VARCHAR(20) UNIQUE NOT NULL,
        phone_country_code VARCHAR(5) NOT NULL DEFAULT '+221',
        business_name     VARCHAR(200) NOT NULL,
        owner_name        VARCHAR(200),
        city              VARCHAR(100),
        zone              VARCHAR(200),
        activity_type     VARCHAR(100),
        status            VARCHAR(20) NOT NULL DEFAULT 'active',
        onboarding_level  INTEGER NOT NULL DEFAULT 1,
        is_phone_verified BOOLEAN NOT NULL DEFAULT FALSE,
        pin_hash          VARCHAR(255),
        currency          VARCHAR(5) NOT NULL DEFAULT 'XOF',
        created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS otps (
        id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        phone       VARCHAR(20) NOT NULL,
        code        VARCHAR(10) NOT NULL,
        purpose     VARCHAR(50) NOT NULL DEFAULT 'login',
        attempts    INTEGER NOT NULL DEFAULT 0,
        max_attempts INTEGER NOT NULL DEFAULT 3,
        is_used     BOOLEAN NOT NULL DEFAULT FALSE,
        expires_at  TIMESTAMPTZ NOT NULL,
        created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
      CREATE INDEX IF NOT EXISTS idx_otps_phone    ON otps(phone);
      CREATE INDEX IF NOT EXISTS idx_otps_expires  ON otps(expires_at);

      CREATE TABLE IF NOT EXISTS refresh_tokens (
        id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        merchant_id UUID NOT NULL REFERENCES merchants(id) ON DELETE CASCADE,
        token_hash  VARCHAR(255) NOT NULL,
        device_info TEXT,
        is_revoked  BOOLEAN NOT NULL DEFAULT FALSE,
        expires_at  TIMESTAMPTZ NOT NULL,
        created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
      CREATE INDEX IF NOT EXISTS idx_refresh_tokens_merchant ON refresh_tokens(merchant_id);

      CREATE TABLE IF NOT EXISTS merchant_payment_methods (
        id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        merchant_id UUID NOT NULL REFERENCES merchants(id) ON DELETE CASCADE,
        provider    VARCHAR(50) NOT NULL,
        is_enabled  BOOLEAN NOT NULL DEFAULT TRUE,
        config      JSONB DEFAULT '{}',
        display_name VARCHAR(100),
        created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
      CREATE UNIQUE INDEX IF NOT EXISTS idx_payment_methods_uniq
        ON merchant_payment_methods(merchant_id, provider);

      CREATE TABLE IF NOT EXISTS catalog_items (
        id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        merchant_id UUID NOT NULL REFERENCES merchants(id) ON DELETE CASCADE,
        name        VARCHAR(200) NOT NULL,
        price       INTEGER NOT NULL DEFAULT 0,
        category    VARCHAR(100),
        description TEXT,
        is_active   BOOLEAN NOT NULL DEFAULT TRUE,
        sort_order  INTEGER DEFAULT 0,
        created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
      CREATE INDEX IF NOT EXISTS idx_catalog_merchant ON catalog_items(merchant_id, is_active);

      CREATE TABLE IF NOT EXISTS transactions (
        id                 UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        merchant_id        UUID NOT NULL REFERENCES merchants(id),
        client_reference   VARCHAR(100) UNIQUE,
        amount             INTEGER NOT NULL,
        currency           VARCHAR(5) NOT NULL DEFAULT 'XOF',
        payment_provider   VARCHAR(50) NOT NULL,
        payment_status     VARCHAR(30) NOT NULL DEFAULT 'pending',
        provider_reference VARCHAR(200),
        provider_status    VARCHAR(100),
        provider_response  JSONB DEFAULT '{}',
        note               TEXT,
        customer_name      VARCHAR(200),
        customer_phone     VARCHAR(20),
        items_snapshot     JSONB DEFAULT '[]',
        completed_at       TIMESTAMPTZ,
        cancelled_at       TIMESTAMPTZ,
        cancel_reason      TEXT,
        created_by         UUID REFERENCES merchants(id),
        created_offline    BOOLEAN DEFAULT FALSE,
        synced_at          TIMESTAMPTZ,
        created_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at         TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
      CREATE INDEX IF NOT EXISTS idx_transactions_merchant ON transactions(merchant_id, created_at DESC);
      CREATE INDEX IF NOT EXISTS idx_transactions_status   ON transactions(payment_status);
      CREATE INDEX IF NOT EXISTS idx_transactions_date     ON transactions(merchant_id, created_at);

      CREATE TABLE IF NOT EXISTS audit_logs (
        id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        merchant_id UUID REFERENCES merchants(id),
        action      VARCHAR(100) NOT NULL,
        entity_type VARCHAR(50),
        entity_id   UUID,
        payload     JSONB DEFAULT '{}',
        ip_address  VARCHAR(50),
        user_agent  TEXT,
        created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
      CREATE INDEX IF NOT EXISTS idx_audit_merchant ON audit_logs(merchant_id, created_at DESC);

      CREATE OR REPLACE FUNCTION update_updated_at_column()
      RETURNS TRIGGER AS $$
      BEGIN NEW.updated_at = NOW(); RETURN NEW; END;
      $$ LANGUAGE plpgsql;

      DROP TRIGGER IF EXISTS update_merchants_updated_at    ON merchants;
      DROP TRIGGER IF EXISTS update_transactions_updated_at ON transactions;
      DROP TRIGGER IF EXISTS update_catalog_updated_at      ON catalog_items;

      CREATE TRIGGER update_merchants_updated_at
        BEFORE UPDATE ON merchants
        FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
      CREATE TRIGGER update_transactions_updated_at
        BEFORE UPDATE ON transactions
        FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
      CREATE TRIGGER update_catalog_updated_at
        BEFORE UPDATE ON catalog_items
        FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

      INSERT INTO merchants
        (id, phone, phone_country_code, business_name, owner_name, city, activity_type, is_phone_verified, onboarding_level)
      VALUES
        ('a0000000-0000-0000-0000-000000000001','+221771234567','+221',
         'Boutique Aminata','Aminata Diallo','Dakar','boutique',TRUE,2)
      ON CONFLICT (id) DO NOTHING;

      INSERT INTO merchant_payment_methods (merchant_id, provider, is_enabled, display_name) VALUES
        ('a0000000-0000-0000-0000-000000000001','cash',TRUE,'Espèces'),
        ('a0000000-0000-0000-0000-000000000001','wave',TRUE,'Wave'),
        ('a0000000-0000-0000-0000-000000000001','orange_money',FALSE,'Orange Money')
      ON CONFLICT DO NOTHING;

      INSERT INTO catalog_items (merchant_id, name, price, category) VALUES
        ('a0000000-0000-0000-0000-000000000001','Eau minérale 1,5L',500,'Boissons'),
        ('a0000000-0000-0000-0000-000000000001','Jus de bissap',300,'Boissons'),
        ('a0000000-0000-0000-0000-000000000001','Riz au poisson',1500,'Plats'),
        ('a0000000-0000-0000-0000-000000000001','Thiéboudienne',2000,'Plats'),
        ('a0000000-0000-0000-0000-000000000001','Pain beurre',200,'Petit-déjeuner')
      ON CONFLICT DO NOTHING;

      INSERT INTO transactions
        (merchant_id, amount, payment_provider, payment_status, note, client_reference, completed_at)
      VALUES
        ('a0000000-0000-0000-0000-000000000001',2500,'wave','completed','Commande test','test-ref-001',NOW() - INTERVAL '2 hours'),
        ('a0000000-0000-0000-0000-000000000001',1000,'cash','completed',NULL,'test-ref-002',NOW() - INTERVAL '1 hour'),
        ('a0000000-0000-0000-0000-000000000001',3500,'wave','completed','Plats + boisson','test-ref-003',NOW() - INTERVAL '30 minutes')
      ON CONFLICT DO NOTHING;
    `,
  },
  {
    name: '002_employees_notifications',
    sql: `
      CREATE TABLE IF NOT EXISTS employees (
        id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        merchant_id UUID NOT NULL REFERENCES merchants(id) ON DELETE CASCADE,
        name        VARCHAR(200) NOT NULL,
        phone       VARCHAR(20),
        role        VARCHAR(30) NOT NULL DEFAULT 'cashier',
        pin_hash    VARCHAR(255),
        is_active   BOOLEAN NOT NULL DEFAULT TRUE,
        daily_limit INTEGER,
        created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
      CREATE INDEX IF NOT EXISTS idx_employees_merchant ON employees(merchant_id, is_active);

      CREATE TABLE IF NOT EXISTS employee_sessions (
        id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        employee_id  UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
        merchant_id  UUID NOT NULL REFERENCES merchants(id) ON DELETE CASCADE,
        access_token VARCHAR(255) NOT NULL,
        expires_at   TIMESTAMPTZ NOT NULL,
        created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
      CREATE INDEX IF NOT EXISTS idx_emp_sessions_token ON employee_sessions(access_token);

      ALTER TABLE transactions
        ADD COLUMN IF NOT EXISTS employee_id   UUID REFERENCES employees(id),
        ADD COLUMN IF NOT EXISTS employee_name VARCHAR(200);

      CREATE TABLE IF NOT EXISTS notifications (
        id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        merchant_id UUID NOT NULL REFERENCES merchants(id) ON DELETE CASCADE,
        type        VARCHAR(50) NOT NULL,
        title       VARCHAR(200) NOT NULL,
        body        TEXT NOT NULL,
        data        JSONB DEFAULT '{}',
        is_read     BOOLEAN NOT NULL DEFAULT FALSE,
        created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
      CREATE INDEX IF NOT EXISTS idx_notif_merchant
        ON notifications(merchant_id, is_read, created_at DESC);

      CREATE TABLE IF NOT EXISTS notification_preferences (
        merchant_id    UUID PRIMARY KEY REFERENCES merchants(id) ON DELETE CASCADE,
        tx_confirmed   BOOLEAN NOT NULL DEFAULT TRUE,
        tx_pending     BOOLEAN NOT NULL DEFAULT TRUE,
        daily_summary  BOOLEAN NOT NULL DEFAULT TRUE,
        employee_login BOOLEAN NOT NULL DEFAULT FALSE,
        updated_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );

      DROP TRIGGER IF EXISTS update_employees_updated_at ON employees;
      CREATE TRIGGER update_employees_updated_at
        BEFORE UPDATE ON employees
        FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

      INSERT INTO employees (id, merchant_id, name, phone, role, is_active) VALUES
        ('e0000001-0000-0000-0000-000000000001','a0000000-0000-0000-0000-000000000001','Fatou Sow','+221770000001','cashier',TRUE),
        ('e0000002-0000-0000-0000-000000000002','a0000000-0000-0000-0000-000000000001','Ibrahima Diallo','+221770000002','manager',TRUE)
      ON CONFLICT (id) DO NOTHING;

      INSERT INTO notification_preferences (merchant_id) VALUES
        ('a0000000-0000-0000-0000-000000000001')
      ON CONFLICT DO NOTHING;
    `,
  },
  {
    name: '003_push_tokens',
    sql: `
      ALTER TABLE merchants ADD COLUMN IF NOT EXISTS push_token TEXT;
      CREATE INDEX IF NOT EXISTS idx_merchants_push_token
        ON merchants(push_token) WHERE push_token IS NOT NULL;
    `,
  },
];

async function runMigrations(db) {
  await db.query(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      name       VARCHAR(255) PRIMARY KEY,
      applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);

  for (const migration of MIGRATIONS) {
    const { rows } = await db.query(
      'SELECT 1 FROM schema_migrations WHERE name = $1',
      [migration.name]
    );
    if (rows.length > 0) {
      console.log(`  ⏭️  ${migration.name} déjà appliquée`);
      continue;
    }
    console.log(`  ⚙️  Application de ${migration.name}...`);
    await db.query(migration.sql);
    await db.query('INSERT INTO schema_migrations (name) VALUES ($1)', [migration.name]);
    console.log(`  ✅ ${migration.name} appliquée`);
  }
}

module.exports = { runMigrations };
