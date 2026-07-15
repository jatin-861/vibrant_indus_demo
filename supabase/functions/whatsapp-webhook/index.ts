import { createClient } from 'npm:@supabase/supabase-js@2';
import { corsHeaders } from '../_shared/cors.ts';
import { verifyMetaSignature } from '../_shared/whatsapp.ts';

// Supabase injects these automatically into every Edge Function -- no need to set them as secrets.
const supabaseAdmin = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
);

interface MetaStatus {
  id: string;
  status: 'sent' | 'delivered' | 'read' | 'failed';
  errors?: Array<{ title: string }>;
}

interface MetaInboundMessage {
  id: string;
  from: string;
  timestamp: string;
  type: string;
  text?: { body: string };
}

Deno.serve(async (req: Request) => {
  const url = new URL(req.url);

  // Meta calls this once with GET to verify the webhook URL when you save it in the dashboard.
  if (req.method === 'GET') {
    const mode = url.searchParams.get('hub.mode');
    const token = url.searchParams.get('hub.verify_token');
    const challenge = url.searchParams.get('hub.challenge');
    const verifyToken = Deno.env.get('WHATSAPP_VERIFY_TOKEN');

    if (mode === 'subscribe' && token && verifyToken && token === verifyToken) {
      return new Response(challenge ?? '', { status: 200 });
    }
    return new Response('Forbidden', { status: 403 });
  }

  if (req.method !== 'POST') {
    return new Response('Method Not Allowed', { status: 405, headers: corsHeaders });
  }

  const rawBody = await req.text();
  const signature = req.headers.get('x-hub-signature-256');
  if (!(await verifyMetaSignature(rawBody, signature))) {
    return new Response('Invalid signature', { status: 401 });
  }

  try {
    const payload = JSON.parse(rawBody);
    const value = payload?.entry?.[0]?.changes?.[0]?.value;

    const statuses: MetaStatus[] = value?.statuses ?? [];
    for (const status of statuses) {
      await supabaseAdmin
        .from('whatsapp_messages')
        .update({
          status: status.status,
          error_message: status.errors?.[0]?.title ?? null,
        })
        .eq('wa_message_id', status.id);
    }

    const inboundMessages: MetaInboundMessage[] = value?.messages ?? [];
    for (const msg of inboundMessages) {
      await supabaseAdmin.from('whatsapp_messages').insert({
        id: `wa-in-${msg.id}`,
        phone: msg.from,
        timestamp: new Date(Number(msg.timestamp) * 1000).toLocaleString('en-IN'),
        message_type: 'inbound_reply',
        content: msg.text?.body ?? `[${msg.type} message]`,
        sent: true,
        invoice_id: null,
        wa_message_id: msg.id,
        direction: 'inbound',
        status: 'received',
      });
    }
  } catch (err) {
    // Still return 200 below -- Meta retries aggressively on non-200 and we don't
    // want a transient DB hiccup to trigger a storm of webhook redeliveries.
    console.error('whatsapp-webhook processing error', err);
  }

  return new Response('EVENT_RECEIVED', { status: 200 });
});
