export type WhatsAppTemplateKind =
  | 'invoice_dispatched'
  | 'reminder_due_soon'
  | 'reminder_due_tomorrow'
  | 'overdue_notice'
  | 'payment_receipt';

interface TemplateComponent {
  type: string;
  parameters: Array<{ type: 'text'; text: string }>;
}

export interface TemplateRequest {
  templateName: string;
  languageCode: string;
  components: TemplateComponent[];
}

const bodyParams = (...values: string[]): TemplateComponent[] => [
  {
    type: 'body',
    parameters: values.map((text) => ({ type: 'text', text })),
  },
];

// Keep template names/param order in sync with src/whatsapp/templates.ts (TEMPLATE_DEFINITIONS)
// and with whatever is approved in Meta WhatsApp Manager.
export function buildTemplateRequest(
  kind: WhatsAppTemplateKind,
  args: Record<string, string>,
): TemplateRequest {
  switch (kind) {
    case 'invoice_dispatched':
      return {
        templateName: 'fip_invoice_dispatched',
        languageCode: 'en',
        components: bodyParams(
          args.name ?? '',
          args.shadeId ?? '',
          args.invoiceId ?? '',
          args.dueDate ?? '',
          args.amount ?? '',
        ),
      };
    case 'reminder_due_soon':
      return {
        templateName: 'fip_payment_reminder',
        languageCode: 'en',
        components: bodyParams(
          args.name ?? '',
          args.daysLeft ?? '',
          args.invoiceId ?? '',
          args.amount ?? '',
          args.dueDate ?? '',
        ),
      };
    case 'reminder_due_tomorrow':
      return {
        templateName: 'fip_payment_due_tomorrow',
        languageCode: 'en',
        components: bodyParams(args.name ?? '', args.invoiceId ?? '', args.amount ?? ''),
      };
    case 'overdue_notice':
      return {
        templateName: 'fip_overdue_notice',
        languageCode: 'en',
        components: bodyParams(
          args.name ?? '',
          args.invoiceId ?? '',
          args.amount ?? '',
          args.penaltyPerDay ?? '',
          args.totalWithFine ?? '',
        ),
      };
    case 'payment_receipt':
      return {
        templateName: 'fip_payment_receipt',
        languageCode: 'en',
        components: bodyParams(
          args.name ?? '',
          args.invoiceId ?? '',
          args.amount ?? '',
          args.receiptNo ?? '',
          args.paymentDate ?? '',
        ),
      };
    default:
      throw new Error(`Unknown template kind: ${kind}`);
  }
}
