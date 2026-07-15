import { corsHeaders } from '../_shared/cors.ts';
import { sendWhatsAppTemplate, sendWhatsAppText } from '../_shared/whatsapp.ts';
import { buildTemplateRequest, type WhatsAppTemplateKind } from '../_shared/templates.ts';

interface SendRequestBody {
  to: string;
  kind?: WhatsAppTemplateKind;
  args?: Record<string, string>;
  // Only valid within the 24h session window opened by an inbound user message.
  freeformText?: string;
}

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }
  if (req.method !== 'POST') {
    return jsonResponse({ success: false, error: 'Method not allowed' }, 405);
  }

  try {
    const body: SendRequestBody = await req.json();
    if (!body.to) throw new Error('Missing "to" phone number');

    // Meta expects digits only: country code + number, no "+", spaces or dashes.
    const to = body.to.replace(/\D/g, '');

    const result = body.freeformText
      ? await sendWhatsAppText({ to, body: body.freeformText })
      : await (async () => {
          if (!body.kind) throw new Error('Missing "kind" template identifier');
          const { templateName, languageCode, components } = buildTemplateRequest(
            body.kind,
            body.args ?? {},
          );
          return sendWhatsAppTemplate({ to, templateName, languageCode, components });
        })();

    const waMessageId = result?.messages?.[0]?.id ?? null;
    return jsonResponse({ success: true, waMessageId, raw: result });
  } catch (err) {
    return jsonResponse({ success: false, error: (err as Error).message }, 400);
  }
});
