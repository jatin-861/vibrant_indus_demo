-- Adds real Meta WhatsApp Cloud API delivery tracking to the existing whatsapp_messages table.
-- Run this against the project's Supabase DB before relying on whatsapp-webhook for status updates.

ALTER TABLE whatsapp_messages
  ADD COLUMN IF NOT EXISTS wa_message_id TEXT,
  ADD COLUMN IF NOT EXISTS direction TEXT NOT NULL DEFAULT 'outbound' CHECK (direction IN ('outbound', 'inbound')),
  ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'sent' CHECK (status IN ('queued', 'sent', 'delivered', 'read', 'failed', 'received')),
  ADD COLUMN IF NOT EXISTS error_message TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS whatsapp_messages_wa_message_id_idx
  ON whatsapp_messages (wa_message_id)
  WHERE wa_message_id IS NOT NULL;

-- Inbound replies from owners/renters aren't tied to one of the original outbound message_type buckets.
ALTER TABLE whatsapp_messages DROP CONSTRAINT IF EXISTS whatsapp_messages_message_type_check;
ALTER TABLE whatsapp_messages ADD CONSTRAINT whatsapp_messages_message_type_check
  CHECK (message_type IN ('invoice_sent', 'reminder_1', 'reminder_final', 'overdue_fine', 'inbound_reply'));
