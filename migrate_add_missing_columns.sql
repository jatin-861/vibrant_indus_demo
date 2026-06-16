-- ============================================
-- MIGRATION: Add missing columns to fix 400 errors
-- Run this in Supabase Dashboard > SQL Editor
-- ============================================

-- 1. Add penalty_disabled column to shades table
ALTER TABLE shades ADD COLUMN IF NOT EXISTS penalty_disabled BOOLEAN NOT NULL DEFAULT FALSE;

-- 2. Add reminder_days column to system_settings table
ALTER TABLE system_settings ADD COLUMN IF NOT EXISTS reminder_days INTEGER[] NOT NULL DEFAULT '{3,1}';

-- 3. Also ensure RLS is disabled (so anon key can read/write)
ALTER TABLE system_settings DISABLE ROW LEVEL SECURITY;
ALTER TABLE owners DISABLE ROW LEVEL SECURITY;
ALTER TABLE shades DISABLE ROW LEVEL SECURITY;
ALTER TABLE invoices DISABLE ROW LEVEL SECURITY;
ALTER TABLE payments DISABLE ROW LEVEL SECURITY;
ALTER TABLE fines DISABLE ROW LEVEL SECURITY;
ALTER TABLE whatsapp_messages DISABLE ROW LEVEL SECURITY;
ALTER TABLE change_requests DISABLE ROW LEVEL SECURITY;
