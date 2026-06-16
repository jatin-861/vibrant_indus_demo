import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://ceolzbnjzpjigdplyhau.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNlb2x6Ym5qenBqaWdkcGx5aGF1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzk4MzY4MTUsImV4cCI6MjA5NTQxMjgxNX0.0nzrkGR_6WwLzxkqyL2k1-Uhlnf1b6wOy-lShr4eI2Y';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function run() {
  console.log('Clearing all tables in Supabase...');
  try {
    const { error: payErr } = await supabase.from('payments').delete().neq('id', 'dummy');
    if (payErr) console.error('Payments clear error:', payErr);
    else console.log('✓ Cleared payments');

    const { error: fineErr } = await supabase.from('fines').delete().neq('id', 'dummy');
    if (fineErr) console.error('Fines clear error:', fineErr);
    else console.log('✓ Cleared fines');

    const { error: msgErr } = await supabase.from('whatsapp_messages').delete().neq('id', 'dummy');
    if (msgErr) console.error('Messages clear error:', msgErr);
    else console.log('✓ Cleared whatsapp_messages');

    const { error: invErr } = await supabase.from('invoices').delete().neq('id', 'dummy');
    if (invErr) console.error('Invoices clear error:', invErr);
    else console.log('✓ Cleared invoices');

    const { error: shadeErr } = await supabase.from('shades').delete().neq('id', 'dummy');
    if (shadeErr) console.error('Shades clear error:', shadeErr);
    else console.log('✓ Cleared shades');

    const { error: ownerErr } = await supabase.from('owners').delete().neq('id', 'dummy');
    if (ownerErr) console.error('Owners clear error:', ownerErr);
    else console.log('✓ Cleared owners');

    const { error: reqErr } = await supabase.from('change_requests').delete().neq('id', 'dummy');
    if (reqErr) console.error('Requests clear error:', reqErr);
    else console.log('✓ Cleared change_requests');

    // Reset settings row to blank
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
    const { error: setErr } = await supabase.from('system_settings').upsert([INITIAL_SETTINGS]);
    if (setErr) console.error('Settings reset error:', setErr);
    else console.log('✓ Reset system_settings to blank');

    console.log('🎉 Supabase database is now completely clean!');
  } catch (err) {
    console.error('Error clearing database:', err);
  }
}

run();
