# WhatsApp Integration (Meta Cloud API)

Real WhatsApp sending/receiving for Vibrant Industrial Park, replacing the simulated
chat in `src/components/WhatsappSimulator.tsx`. Built across three places because of
how this stack is split:

- `supabase/functions/whatsapp-send/` — outbound: app calls this, it calls Meta.
- `supabase/functions/whatsapp-webhook/` — inbound: Meta calls this (delivery
  statuses + replies from owners/renters).
- `src/whatsapp/` — frontend client + template param builders.

The access token and app secret live only in Supabase Function secrets, never in the
Vite client bundle.

## What's NOT done yet

The app still calls the simulator, not these functions. Swapping that in
(`App.tsx` / `WhatsappSimulator.tsx` → `sendWhatsAppMessage` from `src/whatsapp/client.ts`)
is the last step, intentionally left until templates are approved and credentials are live
(see Steps below) — there's no point wiring it in before Meta can actually deliver anything.

## Setup steps

1. **Meta App** — create a Business-type app at developers.facebook.com, add the
   WhatsApp product.
2. **Phone number** — in WhatsApp Manager, add/verify the business phone number.
   Note the **Phone Number ID** and **WhatsApp Business Account (WABA) ID**.
3. **Access token** — in Meta Business Settings, create a System User, assign the
   WABA asset to it with full control, generate a **permanent token** with
   `whatsapp_business_messaging` + `whatsapp_business_management` permissions.
4. **App secret** — found in Meta App → Settings → Basic. Used to verify that
   incoming webhook calls really come from Meta.
5. **Verify token** — make up any random string yourself; it's just a shared
   secret for the webhook handshake in step 8.
6. Set everything as Supabase secrets (never as `VITE_`-prefixed vars):
   ```
   supabase secrets set \
     WHATSAPP_ACCESS_TOKEN=xxx \
     WHATSAPP_PHONE_NUMBER_ID=xxx \
     WHATSAPP_BUSINESS_ACCOUNT_ID=xxx \
     WHATSAPP_VERIFY_TOKEN=xxx \
     WHATSAPP_APP_SECRET=xxx
   ```
7. Deploy the functions:
   ```
   supabase functions deploy whatsapp-send
   supabase functions deploy whatsapp-webhook --no-verify-jwt
   ```
   (`whatsapp-webhook` must allow unauthenticated calls — Meta doesn't send a
   Supabase JWT. `whatsapp-send` should keep JWT verification on since only this
   app should call it.)
8. In Meta App → WhatsApp → Configuration, set the **Webhook URL** to the deployed
   `whatsapp-webhook` URL and **Verify Token** to the same value as
   `WHATSAPP_VERIFY_TOKEN`. Subscribe to the `messages` field.
9. **Submit message templates** — in WhatsApp Manager → Message Templates, submit
   each file in `templates/` (or POST them to
   `https://graph.facebook.com/v23.0/{WABA_ID}/message_templates`). Approval is
   usually minutes, occasionally longer. Outside an active customer conversation,
   Meta will only deliver template messages, not freeform text.
10. **Run the DB migration** — `migrate_add_whatsapp_tracking_columns.sql` against
    the Supabase DB, so the webhook can record delivery status/replies.
11. Once templates show "Approved", wire `sendWhatsAppMessage` (from
    `src/whatsapp/client.ts`) into the real call sites in `App.tsx` /
    `WhatsappSimulator.tsx` in place of the simulated `onSendMessage`.

## Files

- `templates/*.json` — exact payloads to submit to Meta for template approval.
  Names/param order must stay in sync with `buildTemplateArgs` in
  `src/whatsapp/templates.ts` and `buildTemplateRequest` in
  `supabase/functions/_shared/templates.ts`.
- `migrate_add_whatsapp_tracking_columns.sql` — adds `wa_message_id`, `direction`,
  `status`, `error_message` to `whatsapp_messages` for real delivery tracking.
