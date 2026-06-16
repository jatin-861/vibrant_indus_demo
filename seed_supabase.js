import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://ceolzbnjzpjigdplyhau.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNlb2x6Ym5qenBqaWdkcGx5aGF1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzk4MzY4MTUsImV4cCI6MjA5NTQxMjgxNX0.0nzrkGR_6WwLzxkqyL2k1-Uhlnf1b6wOy-lShr4eI2Y';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

const INITIAL_SETTINGS = {
  id: 1,
  default_maintenance: 0,
  water_rate: 0,
  transfer_fee: 0,
  grace_period_days: 0,
  fine_per_day: 0,
  upi_id: '',
  qr_image_url: '',
  society_name: '',
  society_address: '',
  society_phone: '',
  society_bank_details: '',
  invoice_title: '',
  invoice_prefix: '',
  invoice_notes: ''
};

const INITIAL_OWNERS = [];
const INITIAL_SHADES = [];
const INITIAL_INVOICES = [];
const INITIAL_PAYMENTS = [];
const INITIAL_MESSAGES = [];

async function seed() {
  console.log('Starting seed operations on Supabase...');
  try {
    // 1. Settings
    const { error: sErr } = await supabase.from('system_settings').upsert([INITIAL_SETTINGS]);
    if (sErr) throw sErr;
    console.log('✓ System Settings seeded');

    // 2. Owners
    const { error: oErr } = await supabase.from('owners').upsert(INITIAL_OWNERS);
    if (oErr) throw oErr;
    console.log('✓ Owners seeded');

    // 3. Shades
    const { error: shErr } = await supabase.from('shades').upsert(INITIAL_SHADES);
    if (shErr) throw shErr;
    console.log('✓ Shades seeded');

    // 4. Invoices
    const { error: invErr } = await supabase.from('invoices').upsert(INITIAL_INVOICES);
    if (invErr) throw invErr;
    console.log('✓ Invoices seeded');

    // 5. Payments
    const { error: payErr } = await supabase.from('payments').upsert(INITIAL_PAYMENTS);
    if (payErr) throw payErr;
    console.log('✓ Payments seeded');

    // 6. Messages
    const { error: msgErr } = await supabase.from('whatsapp_messages').upsert(INITIAL_MESSAGES);
    if (msgErr) throw msgErr;
    console.log('✓ WhatsApp Messages seeded');

    console.log('🎉 Seed operations completed successfully! Database is fully populated.');
  } catch (err) {
    console.error('❌ Seeding failed:', err.message || err);
  }
}

seed();
