import { supabase } from '../supabaseClient';
import type { WhatsAppSendArgs, WhatsAppSendResult } from './types';

// Calls the whatsapp-send Edge Function, which holds the real Meta access token server-side.
// NOTE: not yet wired into App.tsx/WhatsappSimulator.tsx -- that swap happens once Meta
// credentials are set as Supabase secrets and the templates in whatsapp-integration/templates
// are approved. See whatsapp-integration/README.md.
export async function sendWhatsAppMessage(args: WhatsAppSendArgs): Promise<WhatsAppSendResult> {
  const { data, error } = await supabase.functions.invoke('whatsapp-send', { body: args });
  if (error) return { success: false, error: error.message };
  return data as WhatsAppSendResult;
}
