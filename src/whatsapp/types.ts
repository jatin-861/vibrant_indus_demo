export type WhatsAppTemplateKind =
  | 'invoice_dispatched'
  | 'reminder_due_soon'
  | 'reminder_due_tomorrow'
  | 'overdue_notice'
  | 'payment_receipt';

export interface WhatsAppSendArgs {
  to: string;
  kind: WhatsAppTemplateKind;
  args: Record<string, string>;
}

export interface WhatsAppSendResult {
  success: boolean;
  waMessageId?: string;
  error?: string;
}
