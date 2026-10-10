-- ==========================================================
-- ONE VOICE: Database Schema for Neon PostgreSQL
-- Run this in your Neon Console (SQL Editor)
-- ==========================================================

-- 1. Users Table
CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    phone VARCHAR(20) UNIQUE NOT NULL,
    email VARCHAR(120) UNIQUE,
    country_code VARCHAR(10) DEFAULT '+1',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 2. Wallets Table
CREATE TABLE IF NOT EXISTS wallets (
    id SERIAL PRIMARY KEY,
    user_id INT REFERENCES users(id) ON DELETE CASCADE,
    balance NUMERIC(10, 2) DEFAULT 15.00,
    currency VARCHAR(5) DEFAULT 'USD',
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 3. Transactions / Wallet Top-ups Table
CREATE TABLE IF NOT EXISTS transactions (
    id SERIAL PRIMARY KEY,
    user_id INT REFERENCES users(id) ON DELETE CASCADE,
    type VARCHAR(20) NOT NULL, -- 'topup', 'call_deduction', 'refund'
    amount NUMERIC(10, 2) NOT NULL,
    balance_after NUMERIC(10, 2) NOT NULL,
    description TEXT,
    reference VARCHAR(100),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 4. International Calling Rates Table
CREATE TABLE IF NOT EXISTS calling_rates (
    id SERIAL PRIMARY KEY,
    country_name VARCHAR(100) NOT NULL,
    country_code VARCHAR(5) NOT NULL, -- e.g. 'US', 'GB', 'NG'
    dial_code VARCHAR(10) NOT NULL,    -- e.g. '+1', '+44', '+234'
    flag_emoji VARCHAR(10) NOT NULL,
    rate_per_minute NUMERIC(6, 4) NOT NULL, -- e.g. 0.0150 ($/min)
    roaming_rate NUMERIC(6, 2) DEFAULT 1.50,
    is_popular BOOLEAN DEFAULT FALSE
);

-- 5. Call Detail Records (CDR) Table
CREATE TABLE IF NOT EXISTS call_logs (
    id SERIAL PRIMARY KEY,
    user_id INT REFERENCES users(id) ON DELETE CASCADE,
    destination_number VARCHAR(30) NOT NULL,
    destination_country VARCHAR(100) NOT NULL,
    duration_seconds INT DEFAULT 0,
    cost NUMERIC(8, 4) DEFAULT 0.0000,
    status VARCHAR(20) DEFAULT 'completed', -- 'completed', 'missed', 'busy', 'failed'
    started_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    ended_at TIMESTAMP WITH TIME ZONE
);

-- Seed Popular International Rates
INSERT INTO calling_rates (country_name, country_code, dial_code, flag_emoji, rate_per_minute, roaming_rate, is_popular)
VALUES 
('United States', 'US', '+1', '🇺🇸', 0.0120, 1.25, TRUE),
('United Kingdom', 'GB', '+44', '🇬🇧', 0.0180, 1.80, TRUE),
('Nigeria', 'NG', '+234', '🇳🇬', 0.0750, 2.50, TRUE),
('India', 'IN', '+91', '🇮🇳', 0.0190, 1.50, TRUE),
('Canada', 'CA', '+1', '🇨🇦', 0.0120, 1.25, TRUE),
('Ghana', 'GH', '+233', '🇬🇭', 0.1200, 2.80, TRUE),
('Kenya', 'KE', '+254', '🇰🇪', 0.0950, 2.40, TRUE),
('South Africa', 'ZA', '+27', '🇿🇦', 0.0550, 2.00, TRUE),
('Germany', 'DE', '+49', '🇩🇪', 0.0220, 1.90, FALSE),
('France', 'FR', '+33', '🇫🇷', 0.0220, 1.90, FALSE),
('United Arab Emirates', 'AE', '+971', '🇦🇪', 0.1400, 3.00, TRUE),
('Saudi Arabia', 'SA', '+966', '🇸🇦', 0.1100, 2.80, FALSE),
('Australia', 'AU', '+61', '🇦🇺', 0.0250, 2.20, FALSE),
('Philippines', 'PH', '+63', '🇵🇭', 0.0890, 2.60, TRUE),
('China', 'CN', '+86', '🇨🇳', 0.0190, 1.70, FALSE),
('Brazil', 'BR', '+55', '🇧🇷', 0.0350, 2.10, FALSE),
('Mexico', 'MX', '+52', '🇲🇽', 0.0200, 1.50, FALSE),
('Pakistan', 'PK', '+92', '🇵🇰', 0.0480, 2.20, FALSE)
ON CONFLICT DO NOTHING;

-- Seed Default Demo User & Wallet
INSERT INTO users (id, name, phone, email) 
VALUES (1, 'Alex Morgan', '+14155552671', 'demo@onevoice.app')
ON CONFLICT (id) DO NOTHING;

INSERT INTO wallets (user_id, balance, currency)
VALUES (1, 15.00, 'USD')
ON CONFLICT DO NOTHING;
