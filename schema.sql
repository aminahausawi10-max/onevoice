-- ==========================================================
-- Three Stars: Database Schema for Neon PostgreSQL
-- Phone Account Identification, Dedicated Virtual NUBAN Accounts,
-- Automatic Revenue Sharing, and Append-Only Financial Ledger
-- ==========================================================

-- 1. System Financial & Revenue Settings
CREATE TABLE IF NOT EXISTS system_settings (
    key VARCHAR(50) PRIMARY KEY,
    value VARCHAR(255) NOT NULL,
    description TEXT,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

INSERT INTO system_settings (key, value, description)
VALUES 
('platform_revenue_share_pct', '10.0', 'Platform revenue percentage deducted from incoming bank deposits'),
('platform_fixed_fee', '0.00', 'Fixed platform fee in NGN per bank deposit'),
('nigeria_call_rate_per_min', '12.00', 'Customer retail call rate per minute in NGN for Nigerian networks'),
('carrier_wholesale_cost_per_min', '8.50', 'Carrier wholesale cost per minute in NGN for Nigerian networks'),
('primary_currency', 'NGN', 'Primary operating currency (NGN - Nigerian Naira)'),
('virtual_bank_provider', 'Wema Bank (Three Stars NUBAN)', 'Assigned banking institution for dedicated virtual accounts')
ON CONFLICT (key) DO NOTHING;

-- 2. Users Table
CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    member_id VARCHAR(20) UNIQUE NOT NULL,
    name VARCHAR(120) NOT NULL,
    phone VARCHAR(30) UNIQUE NOT NULL, -- Serves as the Three Stars Account Number
    email VARCHAR(150) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    virtual_bank_name VARCHAR(100) DEFAULT 'Wema Bank',
    virtual_account_number VARCHAR(30) UNIQUE, -- Allocated 10-digit NUBAN
    virtual_account_name VARCHAR(150),
    language VARCHAR(5) DEFAULT 'en',
    role VARCHAR(20) DEFAULT 'user', -- 'user' or 'admin'
    status VARCHAR(20) DEFAULT 'active', -- 'active', 'suspended', 'frozen'
    is_verified BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 3. Customer Wallets Table
CREATE TABLE IF NOT EXISTS wallets (
    id SERIAL PRIMARY KEY,
    user_id INT REFERENCES users(id) ON DELETE CASCADE UNIQUE,
    balance NUMERIC(14, 2) DEFAULT 0.00,
    currency VARCHAR(5) DEFAULT 'NGN',
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 4. Append-Only Financial Ledger (Auditable Double-Entry Records)
CREATE TABLE IF NOT EXISTS wallet_ledger (
    id SERIAL PRIMARY KEY,
    user_id INT REFERENCES users(id) ON DELETE CASCADE,
    transaction_type VARCHAR(40) NOT NULL, -- 'bank_deposit', 'platform_share_deduction', 'call_charge', 'refund', 'reversal'
    gross_amount NUMERIC(12, 2) NOT NULL,
    platform_fee NUMERIC(12, 2) DEFAULT 0.00,
    net_credited NUMERIC(12, 2) NOT NULL,
    balance_before NUMERIC(14, 2) NOT NULL,
    balance_after NUMERIC(14, 2) NOT NULL,
    channel VARCHAR(50) DEFAULT 'bank_transfer',
    provider_reference VARCHAR(150) UNIQUE, -- Idempotency token from payment provider
    internal_reference VARCHAR(100) UNIQUE NOT NULL,
    narration TEXT NOT NULL,
    status VARCHAR(20) DEFAULT 'successful', -- 'successful', 'pending', 'failed', 'reversed'
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 5. Platform Revenue Ledger (Admin Revenue Pool)
CREATE TABLE IF NOT EXISTS platform_revenue_ledger (
    id SERIAL PRIMARY KEY,
    source_type VARCHAR(40) NOT NULL, -- 'deposit_share', 'telephony_margin', 'fixed_fee'
    source_reference VARCHAR(150) NOT NULL,
    user_id INT REFERENCES users(id) ON DELETE SET NULL,
    amount NUMERIC(12, 2) NOT NULL,
    cumulative_platform_revenue NUMERIC(14, 2) NOT NULL,
    settlement_status VARCHAR(20) DEFAULT 'unsettled', -- 'unsettled', 'settled'
    settled_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 6. Call Detail Records (CDR) Table
CREATE TABLE IF NOT EXISTS call_logs (
    id SERIAL PRIMARY KEY,
    user_id INT REFERENCES users(id) ON DELETE CASCADE,
    destination_number VARCHAR(30) NOT NULL,
    destination_country VARCHAR(100) NOT NULL,
    duration_seconds INT DEFAULT 0,
    retail_rate_per_min NUMERIC(8, 2) DEFAULT 12.00,
    cost NUMERIC(10, 2) DEFAULT 0.00, -- Retail cost deducted from user
    carrier_cost NUMERIC(10, 2) DEFAULT 0.00, -- Wholesale carrier cost
    platform_margin NUMERIC(10, 2) DEFAULT 0.00, -- Three Stars profit margin
    status VARCHAR(20) DEFAULT 'completed',
    started_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    ended_at TIMESTAMP WITH TIME ZONE
);

-- 7. Saved Contacts Table
CREATE TABLE IF NOT EXISTS contacts (
    id SERIAL PRIMARY KEY,
    user_id INT REFERENCES users(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    phone VARCHAR(30) NOT NULL,
    country VARCHAR(100) DEFAULT 'Nigeria',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 8. Calling Rates Table
CREATE TABLE IF NOT EXISTS calling_rates (
    id SERIAL PRIMARY KEY,
    country_name VARCHAR(100) NOT NULL,
    country_code VARCHAR(5) NOT NULL,
    dial_code VARCHAR(10) NOT NULL,
    flag_emoji VARCHAR(10) NOT NULL,
    rate_per_minute NUMERIC(8, 2) NOT NULL, -- In NGN
    roaming_rate NUMERIC(8, 2) DEFAULT 150.00,
    is_popular BOOLEAN DEFAULT FALSE
);

-- Seed Calling Rates (In NGN - Nigerian Naira)
INSERT INTO calling_rates (country_name, country_code, dial_code, flag_emoji, rate_per_minute, roaming_rate, is_popular)
VALUES 
('Nigeria (All Networks)', 'NG', '+234', 'ðŸ‡³ðŸ‡¬', 12.00, 45.00, TRUE),
('United States', 'US', '+1', 'ðŸ‡ºðŸ‡¸', 18.00, 180.00, TRUE),
('United Kingdom', 'GB', '+44', 'ðŸ‡¬ðŸ‡§', 25.00, 250.00, TRUE),
('Ghana', 'GH', '+233', 'ðŸ‡¬ðŸ‡­', 65.00, 350.00, TRUE),
('Kenya', 'KE', '+254', 'ðŸ‡°ðŸ‡ª', 75.00, 320.00, TRUE),
('South Africa', 'ZA', '+27', 'ðŸ‡¿ðŸ‡¦', 55.00, 280.00, TRUE),
('Canada', 'CA', '+1', 'ðŸ‡¨ðŸ‡¦', 18.00, 180.00, TRUE),
('India', 'IN', '+91', 'ðŸ‡®ðŸ‡³', 22.00, 220.00, TRUE),
('United Arab Emirates', 'AE', '+971', 'ðŸ‡¦ðŸ‡ª', 95.00, 400.00, TRUE),
('Saudi Arabia', 'SA', '+966', 'ðŸ‡¸ðŸ‡¦', 85.00, 380.00, FALSE),
('China', 'CN', '+86', 'ðŸ‡¨ðŸ‡³', 25.00, 200.00, FALSE),
('Germany', 'DE', '+49', 'ðŸ‡©ðŸ‡ª', 30.00, 260.00, FALSE)
ON CONFLICT DO NOTHING;

-- Seed Default Demo Account
-- Password: Password123!
INSERT INTO users (id, member_id, name, phone, email, password_hash, virtual_bank_name, virtual_account_number, virtual_account_name, language, role, status) 
VALUES (
    1, 
    'OV-784920', 
    'Alex Morgan', 
    '+2348031234567', 
    'demo@threestars.app', 
    '$2y$10$eA3pU2s7J6zZ1x.mE1Vz0Ou8mP7mN4dK2j9wE0l5e0/2y.Hk5w6Ce', 
    'Wema Bank (Three Stars)', 
    '9803123456', 
    'Three Stars / Alex Morgan', 
    'en', 
    'admin', 
    'active'
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO wallets (user_id, balance, currency)
VALUES (1, 25000.00, 'NGN')
ON CONFLICT (user_id) DO NOTHING;

-- Seed Sample Contacts
INSERT INTO contacts (user_id, name, phone, country)
VALUES 
(1, 'Aminu Kano', '+2348023456789', 'Nigeria'),
(1, 'Chinedu Okeke', '+2348109876543', 'Nigeria'),
(1, 'Folake Adeleke', '+2349012345678', 'Nigeria')
ON CONFLICT DO NOTHING;
