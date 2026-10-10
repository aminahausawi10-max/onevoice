-- ==========================================================
-- ONE VOICE: Comprehensive Database Schema for Neon PostgreSQL
-- Covers Authentication, Member IDs, OTPs, Contacts, Wallets,
-- Calling CDRs, Audit Logs, and Multilingual Settings (EN/HA)
-- ==========================================================

-- 1. Users Table
CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    member_id VARCHAR(20) UNIQUE NOT NULL, -- e.g. OV-784920
    name VARCHAR(120) NOT NULL,
    phone VARCHAR(30) UNIQUE NOT NULL,
    email VARCHAR(150) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    country_code VARCHAR(10) DEFAULT '+1',
    language VARCHAR(5) DEFAULT 'en', -- 'en' for English, 'ha' for Hausa
    is_verified BOOLEAN DEFAULT FALSE,
    two_factor_enabled BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 2. OTP Verification Table
CREATE TABLE IF NOT EXISTS otps (
    id SERIAL PRIMARY KEY,
    user_id INT REFERENCES users(id) ON DELETE CASCADE,
    identifier VARCHAR(150) NOT NULL, -- email or phone
    code VARCHAR(6) NOT NULL,
    purpose VARCHAR(30) NOT NULL, -- 'login', 'registration', 'password_reset', 'change_contact'
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    attempts INT DEFAULT 0,
    used BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 3. Wallets Table
CREATE TABLE IF NOT EXISTS wallets (
    id SERIAL PRIMARY KEY,
    user_id INT REFERENCES users(id) ON DELETE CASCADE UNIQUE,
    balance NUMERIC(10, 2) DEFAULT 15.00,
    currency VARCHAR(5) DEFAULT 'USD',
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 4. Transactions / Wallet Top-ups Table
CREATE TABLE IF NOT EXISTS transactions (
    id SERIAL PRIMARY KEY,
    user_id INT REFERENCES users(id) ON DELETE CASCADE,
    type VARCHAR(30) NOT NULL, -- 'topup', 'call_deduction', 'refund'
    amount NUMERIC(10, 2) NOT NULL,
    balance_after NUMERIC(10, 2) NOT NULL,
    description TEXT,
    reference VARCHAR(100) UNIQUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 5. Saved Contacts Table
CREATE TABLE IF NOT EXISTS contacts (
    id SERIAL PRIMARY KEY,
    user_id INT REFERENCES users(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    phone VARCHAR(30) NOT NULL,
    country VARCHAR(100) DEFAULT 'International',
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 6. International Calling Rates Table
CREATE TABLE IF NOT EXISTS calling_rates (
    id SERIAL PRIMARY KEY,
    country_name VARCHAR(100) NOT NULL,
    country_code VARCHAR(5) NOT NULL,
    dial_code VARCHAR(10) NOT NULL,
    flag_emoji VARCHAR(10) NOT NULL,
    rate_per_minute NUMERIC(6, 4) NOT NULL,
    roaming_rate NUMERIC(6, 2) DEFAULT 1.50,
    is_popular BOOLEAN DEFAULT FALSE
);

-- 7. Call Detail Records (CDR) Table
CREATE TABLE IF NOT EXISTS call_logs (
    id SERIAL PRIMARY KEY,
    user_id INT REFERENCES users(id) ON DELETE CASCADE,
    destination_number VARCHAR(30) NOT NULL,
    destination_country VARCHAR(100) NOT NULL,
    duration_seconds INT DEFAULT 0,
    cost NUMERIC(8, 4) DEFAULT 0.0000,
    status VARCHAR(20) DEFAULT 'completed',
    started_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    ended_at TIMESTAMP WITH TIME ZONE
);

-- 8. Security & Account Audit Logs Table
CREATE TABLE IF NOT EXISTS audit_logs (
    id SERIAL PRIMARY KEY,
    user_id INT REFERENCES users(id) ON DELETE SET NULL,
    action VARCHAR(50) NOT NULL, -- 'login', 'logout', 'register', 'password_change', 'otp_requested'
    ip_address VARCHAR(50),
    user_agent TEXT,
    details TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Seed Calling Rates
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

-- Seed Default Demo Account
-- Password for demo account is: Password123!
INSERT INTO users (id, member_id, name, phone, email, password_hash, language, is_verified) 
VALUES (1, 'OV-784920', 'Alex Morgan', '+14155552671', 'demo@onevoice.app', '$2y$10$eA3pU2s7J6zZ1x.mE1Vz0Ou8mP7mN4dK2j9wE0l5e0/2y.Hk5w6Ce', 'en', TRUE)
ON CONFLICT (id) DO NOTHING;

INSERT INTO wallets (user_id, balance, currency)
VALUES (1, 15.00, 'USD')
ON CONFLICT (user_id) DO NOTHING;

-- Seed Sample Contacts
INSERT INTO contacts (user_id, name, phone, country)
VALUES 
(1, 'Aminu Kano', '+234 803 123 4567', 'Nigeria'),
(1, 'Sarah Jenkins', '+44 20 7946 0991', 'United Kingdom'),
(1, 'Michael Chen', '+1 415 555 8920', 'United States')
ON CONFLICT DO NOTHING;
