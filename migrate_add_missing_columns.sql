-- ============================================
-- MIGRATION: Add missing columns to fix 400 errors
-- Run this in Supabase Dashboard > SQL Editor
-- ============================================

-- 1. Add penalty_disabled column to shades table
ALTER TABLE shades ADD COLUMN IF NOT EXISTS penalty_disabled BOOLEAN NOT NULL DEFAULT FALSE;

-- 1a. Add penalty_disabled_reason column to shades table (why fines were paused, e.g. financial hardship)
ALTER TABLE shades ADD COLUMN IF NOT EXISTS penalty_disabled_reason TEXT;

-- 1b. Add documents column to shades table (JSON array of attached PDFs/images)
ALTER TABLE shades ADD COLUMN IF NOT EXISTS documents TEXT NOT NULL DEFAULT '[]';

-- 2. Add reminder_days column to system_settings table
ALTER TABLE system_settings ADD COLUMN IF NOT EXISTS reminder_days INTEGER[] NOT NULL DEFAULT '{3,1}';

-- 2a. Create audit_logs table (it was previously never persisted — admin actions only
-- lived in React state and vanished on every page refresh / for other sessions)
CREATE TABLE IF NOT EXISTS audit_logs (
    id TEXT PRIMARY KEY,
    action TEXT NOT NULL,
    entity TEXT NOT NULL,
    performed_by TEXT NOT NULL,
    role TEXT NOT NULL,
    timestamp TEXT NOT NULL,
    details TEXT
);

-- 3. Also ensure RLS is disabled (so anon key can read/write)
ALTER TABLE system_settings DISABLE ROW LEVEL SECURITY;
ALTER TABLE owners DISABLE ROW LEVEL SECURITY;
ALTER TABLE shades DISABLE ROW LEVEL SECURITY;
ALTER TABLE invoices DISABLE ROW LEVEL SECURITY;
ALTER TABLE payments DISABLE ROW LEVEL SECURITY;
ALTER TABLE fines DISABLE ROW LEVEL SECURITY;
ALTER TABLE whatsapp_messages DISABLE ROW LEVEL SECURITY;
ALTER TABLE change_requests DISABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs DISABLE ROW LEVEL SECURITY;
