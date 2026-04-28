-- ============================================================
-- PayMe Africa - Migration 001 - Schéma initial
-- ============================================================

-- Extension UUID
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================
-- MERCHANTS (commerçants)
-- ============================================================
CREATE TABLE merchants (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    phone VARCHAR(20) UNIQUE NOT NULL,
    phone_country_code VARCHAR(5) NOT NULL DEFAULT '+221',
    business_name VARCHAR(200) NOT NULL,
    owner_name VARCHAR(200),
    city VARCHAR(100),
    zone VARCHAR(200),
    activity_type VARCHAR(100), -- 'vendeur_ambulant', 'boutique', 'restaurant', 'coiffeur', etc.
    status VARCHAR(20) NOT NULL DEFAULT 'active', -- active, suspended, banned
    onboarding_level INTEGER NOT NULL DEFAULT 1, -- 1=démarrage, 2=vérifié, 3=business
    is_phone_verified BOOLEAN NOT NULL DEFAULT FALSE,
    pin_hash VARCHAR(255), -- PIN 4 chiffres pour accès rapide
    currency VARCHAR(5) NOT NULL DEFAULT 'XOF', -- Franc CFA
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- OTP (codes de vérification SMS)
-- ============================================================
CREATE TABLE otps (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    phone VARCHAR(20) NOT NULL,
    code VARCHAR(10) NOT NULL,
    purpose VARCHAR(50) NOT NULL DEFAULT 'login', -- login, register, reset
    attempts INTEGER NOT NULL DEFAULT 0,
    max_attempts INTEGER NOT NULL DEFAULT 3,
    is_used BOOLEAN NOT NULL DEFAULT FALSE,
    expires_at TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_otps_phone ON otps(phone);
CREATE INDEX idx_otps_expires ON otps(expires_at);

-- ============================================================
-- REFRESH TOKENS
-- ============================================================
CREATE TABLE refresh_tokens (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    merchant_id UUID NOT NULL REFERENCES merchants(id) ON DELETE CASCADE,
    token_hash VARCHAR(255) NOT NULL,
    device_info TEXT,
    is_revoked BOOLEAN NOT NULL DEFAULT FALSE,
    expires_at TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_refresh_tokens_merchant ON refresh_tokens(merchant_id);

-- ============================================================
-- PAYMENT METHODS (moyens de paiement configurés par le marchand)
-- ============================================================
CREATE TABLE merchant_payment_methods (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    merchant_id UUID NOT NULL REFERENCES merchants(id) ON DELETE CASCADE,
    provider VARCHAR(50) NOT NULL, -- 'wave', 'orange_money', 'free_money', 'cash'
    is_enabled BOOLEAN NOT NULL DEFAULT TRUE,
    config JSONB DEFAULT '{}', -- numéro Wave, etc.
    display_name VARCHAR(100),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE UNIQUE INDEX idx_payment_methods_uniq ON merchant_payment_methods(merchant_id, provider);

-- ============================================================
-- CATALOG ITEMS (articles du catalogue - optionnel)
-- ============================================================
CREATE TABLE catalog_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    merchant_id UUID NOT NULL REFERENCES merchants(id) ON DELETE CASCADE,
    name VARCHAR(200) NOT NULL,
    price INTEGER NOT NULL DEFAULT 0, -- en centimes (XOF pas de centimes, stocker en unité)
    category VARCHAR(100),
    description TEXT,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    sort_order INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_catalog_merchant ON catalog_items(merchant_id, is_active);

-- ============================================================
-- TRANSACTIONS (ventes / encaissements)
-- ============================================================
CREATE TABLE transactions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    merchant_id UUID NOT NULL REFERENCES merchants(id),
    
    -- Identifiant idempotent généré côté mobile
    client_reference VARCHAR(100) UNIQUE,
    
    -- Montant
    amount INTEGER NOT NULL, -- en unité locale (XOF)
    currency VARCHAR(5) NOT NULL DEFAULT 'XOF',
    
    -- Paiement
    payment_provider VARCHAR(50) NOT NULL, -- 'wave', 'orange_money', 'cash', etc.
    payment_status VARCHAR(30) NOT NULL DEFAULT 'pending',
    -- pending, awaiting_confirmation, completed, failed, cancelled, refunded
    
    -- Référence paiement externe (si API)
    provider_reference VARCHAR(200),
    provider_status VARCHAR(100),
    provider_response JSONB DEFAULT '{}',
    
    -- Note / description libre
    note TEXT,
    
    -- Client (optionnel - juste un nom/téléphone)
    customer_name VARCHAR(200),
    customer_phone VARCHAR(20),
    
    -- Articles liés (snapshot JSON au moment de la vente)
    items_snapshot JSONB DEFAULT '[]',
    
    -- Métadonnées
    completed_at TIMESTAMPTZ,
    cancelled_at TIMESTAMPTZ,
    cancel_reason TEXT,
    created_by UUID REFERENCES merchants(id), -- si multi-employés plus tard
    
    -- Sync offline
    created_offline BOOLEAN DEFAULT FALSE,
    synced_at TIMESTAMPTZ,
    
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_transactions_merchant ON transactions(merchant_id, created_at DESC);
CREATE INDEX idx_transactions_status ON transactions(payment_status);
CREATE INDEX idx_transactions_date ON transactions(merchant_id, created_at);

-- ============================================================
-- AUDIT LOG
-- ============================================================
CREATE TABLE audit_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    merchant_id UUID REFERENCES merchants(id),
    action VARCHAR(100) NOT NULL,
    entity_type VARCHAR(50),
    entity_id UUID,
    payload JSONB DEFAULT '{}',
    ip_address VARCHAR(50),
    user_agent TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_audit_merchant ON audit_logs(merchant_id, created_at DESC);

-- ============================================================
-- TRIGGERS : updated_at automatique
-- ============================================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_merchants_updated_at BEFORE UPDATE ON merchants
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_transactions_updated_at BEFORE UPDATE ON transactions
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_catalog_updated_at BEFORE UPDATE ON catalog_items
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================
-- SEED : données de test
-- ============================================================
-- Marchand de test (mot de passe: 1234 PIN)
INSERT INTO merchants (id, phone, phone_country_code, business_name, owner_name, city, activity_type, is_phone_verified, onboarding_level)
VALUES (
    'a0000000-0000-0000-0000-000000000001',
    '+221771234567',
    '+221',
    'Boutique Aminata',
    'Aminata Diallo',
    'Dakar',
    'boutique',
    TRUE,
    2
);

-- Moyens de paiement activés pour le marchand de test
INSERT INTO merchant_payment_methods (merchant_id, provider, is_enabled, display_name) VALUES
    ('a0000000-0000-0000-0000-000000000001', 'cash', TRUE, 'Espèces'),
    ('a0000000-0000-0000-0000-000000000001', 'wave', TRUE, 'Wave'),
    ('a0000000-0000-0000-0000-000000000001', 'orange_money', FALSE, 'Orange Money');

-- Quelques articles de test
INSERT INTO catalog_items (merchant_id, name, price, category) VALUES
    ('a0000000-0000-0000-0000-000000000001', 'Eau minérale 1,5L', 500, 'Boissons'),
    ('a0000000-0000-0000-0000-000000000001', 'Jus de bissap', 300, 'Boissons'),
    ('a0000000-0000-0000-0000-000000000001', 'Riz au poisson', 1500, 'Plats'),
    ('a0000000-0000-0000-0000-000000000001', 'Thiéboudienne', 2000, 'Plats'),
    ('a0000000-0000-0000-0000-000000000001', 'Pain beurre', 200, 'Petit-déjeuner');

-- Quelques transactions de test
INSERT INTO transactions (merchant_id, amount, payment_provider, payment_status, note, client_reference, completed_at)
VALUES
    ('a0000000-0000-0000-0000-000000000001', 2500, 'wave', 'completed', 'Commande test', 'test-ref-001', NOW() - INTERVAL '2 hours'),
    ('a0000000-0000-0000-0000-000000000001', 1000, 'cash', 'completed', NULL, 'test-ref-002', NOW() - INTERVAL '1 hour'),
    ('a0000000-0000-0000-0000-000000000001', 3500, 'wave', 'completed', 'Plats + boisson', 'test-ref-003', NOW() - INTERVAL '30 minutes');
