-- 1. OWNERS & MEMBERS TABLE
CREATE TABLE IF NOT EXISTS owners (
    id TEXT PRIMARY KEY, -- e.g., 'MEM-001'
    name TEXT NOT NULL,
    phone TEXT NOT NULL,
    email TEXT NOT NULL,
    type TEXT NOT NULL CHECK (type IN ('owner', 'renter')),
    status TEXT NOT NULL CHECK (status IN ('active', 'inactive')),
    company_name TEXT
);

-- 2. SHADES & PROPERTIES TABLE
CREATE TABLE IF NOT EXISTS shades (
    id TEXT PRIMARY KEY, -- e.g., 'SH-001'
    block TEXT NOT NULL,
    floor TEXT NOT NULL,
    sq_ft INTEGER NOT NULL,
    status TEXT NOT NULL CHECK (status IN ('vacant', 'occupied', 'maintenance')),
    owner_id TEXT REFERENCES owners(id) ON DELETE SET NULL,
    renter_id TEXT REFERENCES owners(id) ON DELETE SET NULL,
    fixed_maintenance INTEGER NOT NULL DEFAULT 700,
    last_water_reading INTEGER NOT NULL DEFAULT 0,
    current_water_reading INTEGER NOT NULL DEFAULT 0,
    transfer_fee_triggered BOOLEAN NOT NULL DEFAULT FALSE,
    has_water_supply BOOLEAN NOT NULL DEFAULT TRUE,
    penalty_disabled BOOLEAN NOT NULL DEFAULT FALSE
);

-- 3. BILLING INVOICES TABLE
CREATE TABLE IF NOT EXISTS invoices (
    id TEXT PRIMARY KEY, -- e.g., 'INV-2026-001'
    shade_id TEXT NOT NULL REFERENCES shades(id) ON DELETE CASCADE,
    owner_id TEXT NOT NULL REFERENCES owners(id) ON DELETE RESTRICT,
    owner_name TEXT NOT NULL,
    owner_phone TEXT NOT NULL,
    renter_id TEXT REFERENCES owners(id) ON DELETE SET NULL,
    renter_name TEXT,
    renter_phone TEXT,
    maintenance_fee INTEGER NOT NULL,
    billing_months INTEGER NOT NULL DEFAULT 1,
    old_water_reading INTEGER NOT NULL DEFAULT 0,
    new_water_reading INTEGER NOT NULL DEFAULT 0,
    water_usage_charge INTEGER NOT NULL DEFAULT 0,
    other_maintenance_name TEXT,
    other_maintenance_charge INTEGER NOT NULL DEFAULT 0,
    transfer_fee INTEGER NOT NULL DEFAULT 0,
    fine_amount INTEGER NOT NULL DEFAULT 0,
    total_amount INTEGER NOT NULL,
    generated_date TEXT NOT NULL,
    due_date TEXT NOT NULL,
    status TEXT NOT NULL CHECK (status IN ('draft', 'sent', 'paid', 'overdue', 'cancelled')),
    payment_method TEXT CHECK (payment_method IN ('cash', 'cheque', 'online', 'bank_transfer') OR payment_method IS NULL),
    payment_date TEXT,
    transaction_details TEXT
);

-- 4. PAYMENTS LEDGER TABLE
CREATE TABLE IF NOT EXISTS payments (
    id TEXT PRIMARY KEY,
    date TEXT NOT NULL,
    invoice_id TEXT REFERENCES invoices(id) ON DELETE SET NULL,
    tenant_name TEXT NOT NULL,
    shade_id TEXT NOT NULL REFERENCES shades(id) ON DELETE CASCADE,
    amount INTEGER NOT NULL,
    method TEXT NOT NULL CHECK (method IN ('Cash', 'Cheque', 'Bank Transfer', 'UPI')),
    reference TEXT
);

-- 5. FINES LEDGER TABLE
CREATE TABLE IF NOT EXISTS fines (
    id TEXT PRIMARY KEY,
    shade_id TEXT NOT NULL REFERENCES shades(id) ON DELETE CASCADE,
    invoice_id TEXT REFERENCES invoices(id) ON DELETE SET NULL,
    owner_name TEXT NOT NULL,
    amount INTEGER NOT NULL,
    reason TEXT NOT NULL,
    date TEXT NOT NULL,
    status TEXT NOT NULL CHECK (status IN ('unpaid', 'paid'))
);

-- 6. SIMULATED WHATSAPP MESSAGES LOG
CREATE TABLE IF NOT EXISTS whatsapp_messages (
    id TEXT PRIMARY KEY,
    phone TEXT NOT NULL,
    timestamp TEXT NOT NULL,
    message_type TEXT NOT NULL CHECK (message_type IN ('invoice_sent', 'reminder_1', 'reminder_final', 'overdue_fine')),
    content TEXT NOT NULL,
    sent BOOLEAN NOT NULL DEFAULT FALSE,
    invoice_id TEXT REFERENCES invoices(id) ON DELETE CASCADE
);

-- 7. SYSTEM PARAMETERS & SETTINGS (Exactly 1 Config row)
CREATE TABLE IF NOT EXISTS system_settings (
    id INTEGER PRIMARY KEY CHECK (id = 1) DEFAULT 1,
    default_maintenance INTEGER NOT NULL DEFAULT 700,
    water_rate INTEGER NOT NULL DEFAULT 30,
    transfer_fee INTEGER NOT NULL DEFAULT 2500,
    grace_period_days INTEGER NOT NULL DEFAULT 5,
    fine_per_day INTEGER NOT NULL DEFAULT 100,
    upi_id TEXT NOT NULL DEFAULT '',
    qr_image_url TEXT NOT NULL DEFAULT '',
    society_name TEXT NOT NULL,
    society_address TEXT NOT NULL,
    society_phone TEXT NOT NULL,
    society_bank_details TEXT NOT NULL,
    invoice_title TEXT NOT NULL DEFAULT '',
    invoice_prefix TEXT NOT NULL DEFAULT 'INV-',
    invoice_notes TEXT NOT NULL DEFAULT '',
    reminder_days INTEGER[] NOT NULL DEFAULT '{3,1}'
);

-- 8. CO-ADMIN CHANGE APPROVAL REQUESTS TABLE
CREATE TABLE IF NOT EXISTS change_requests (
    id TEXT PRIMARY KEY,
    requester_role TEXT NOT NULL,
    requester_name TEXT NOT NULL,
    type TEXT NOT NULL CHECK (type IN ('edit_shade', 'update_settings', 'reset_db')),
    target_id TEXT,
    details TEXT NOT NULL,
    data TEXT NOT NULL, -- JSON formatted configuration string
    status TEXT NOT NULL CHECK (status IN ('pending', 'approved', 'rejected')),
    date TEXT NOT NULL
);

-- 9. POPULATE DEFAULT PARAMETERS ROW (Initial config setup)
INSERT INTO system_settings (id, default_maintenance, water_rate, transfer_fee, grace_period_days, fine_per_day, upi_id, qr_image_url, society_name, society_address, society_phone, society_bank_details, invoice_title, invoice_prefix, invoice_notes)
VALUES (
    1, 
    0, 
    0, 
    0, 
    0, 
    0, 
    '', 
    '', 
    '', 
    '', 
    '', 
    '',
    '',
    '',
    ''
) ON CONFLICT (id) DO NOTHING;
