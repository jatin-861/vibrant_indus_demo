const GRAPH_API_VERSION = Deno.env.get('WHATSAPP_API_VERSION') ?? 'v23.0';

interface TemplateComponent {
  type: string;
  parameters: Array<{ type: 'text'; text: string }>;
}

interface SendTemplateArgs {
  to: string;
  templateName: string;
  languageCode?: string;
  components?: TemplateComponent[];
}

interface SendTextArgs {
  to: string;
  body: string;
  previewUrl?: boolean;
}

function phoneNumberId(): string {
  const id = Deno.env.get('WHATSAPP_PHONE_NUMBER_ID');
  if (!id) throw new Error('WHATSAPP_PHONE_NUMBER_ID secret is not set');
  return id;
}

function graphUrl(): string {
  return `https://graph.facebook.com/${GRAPH_API_VERSION}/${phoneNumberId()}/messages`;
}

function authHeaders(): Record<string, string> {
  const token = Deno.env.get('WHATSAPP_ACCESS_TOKEN');
  if (!token) throw new Error('WHATSAPP_ACCESS_TOKEN secret is not set');
  return {
    Authorization: `Bearer ${token}`,
    'Content-Type': 'application/json',
  };
}

async function callGraphApi(payload: Record<string, unknown>) {
  const res = await fetch(graphUrl(), {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify(payload),
  });
  const data = await res.json();
  if (!res.ok) {
    throw new Error(`Meta API error (${res.status}): ${JSON.stringify(data)}`);
  }
  return data;
}

export async function sendWhatsAppTemplate({
  to,
  templateName,
  languageCode = 'en',
  components = [],
}: SendTemplateArgs) {
  return callGraphApi({
    messaging_product: 'whatsapp',
    to,
    type: 'template',
    template: {
      name: templateName,
      language: { code: languageCode },
      components,
    },
  });
}

// Freeform text only works inside the 24h customer-service window (i.e. the
// user messaged us first/recently) -- otherwise Meta rejects it. Use a
// template message for any business-initiated message outside that window.
export async function sendWhatsAppText({ to, body, previewUrl = false }: SendTextArgs) {
  return callGraphApi({
    messaging_product: 'whatsapp',
    to,
    type: 'text',
    text: { preview_url: previewUrl, body },
  });
}

export async function verifyMetaSignature(
  rawBody: string,
  signatureHeader: string | null,
): Promise<boolean> {
  const appSecret = Deno.env.get('WHATSAPP_APP_SECRET');
  if (!appSecret || !signatureHeader) return false;

  const expected = signatureHeader.replace('sha256=', '');
  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(appSecret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  );
  const sigBuf = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(rawBody));
  const computed = Array.from(new Uint8Array(sigBuf))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');

  if (computed.length !== expected.length) return false;
  let diff = 0;
  for (let i = 0; i < computed.length; i++) diff |= computed.charCodeAt(i) ^ expected.charCodeAt(i);
  return diff === 0;
}
