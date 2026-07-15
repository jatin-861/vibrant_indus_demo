import type { Invoice, Shade } from '../types';
import type { WhatsAppTemplateKind } from './types';

export interface TemplateContext {
  name: string;
  invoice?: Invoice | null;
  shade?: Shade | null;
  penaltyPerDay?: number;
  daysLeft?: number;
  receiptNo?: string;
}

const fmt = (n: number) => new Intl.NumberFormat('en-IN').format(n);

// Param order here must match the component order built in
// supabase/functions/_shared/templates.ts for the same "kind".
export function buildTemplateArgs(
  kind: WhatsAppTemplateKind,
  ctx: TemplateContext,
): Record<string, string> {
  const inv = ctx.invoice;
  switch (kind) {
    case 'invoice_dispatched':
      return {
        name: ctx.name,
        shadeId: ctx.shade?.id ?? '',
        invoiceId: inv?.id ?? '',
        dueDate: inv?.dueDate ?? '',
        amount: fmt(inv?.totalAmount ?? 0),
      };
    case 'reminder_due_soon':
      return {
        name: ctx.name,
        daysLeft: String(ctx.daysLeft ?? ''),
        invoiceId: inv?.id ?? '',
        amount: fmt(inv?.totalAmount ?? 0),
        dueDate: inv?.dueDate ?? '',
      };
    case 'reminder_due_tomorrow':
      return {
        name: ctx.name,
        invoiceId: inv?.id ?? '',
        amount: fmt(inv?.totalAmount ?? 0),
      };
    case 'overdue_notice':
      return {
        name: ctx.name,
        invoiceId: inv?.id ?? '',
        amount: fmt(inv?.totalAmount ?? 0),
        penaltyPerDay: fmt(ctx.penaltyPerDay ?? 0),
        totalWithFine: fmt((inv?.totalAmount ?? 0) + (ctx.penaltyPerDay ?? 0)),
      };
    case 'payment_receipt':
      return {
        name: ctx.name,
        invoiceId: inv?.id ?? '',
        amount: fmt(inv?.totalAmount ?? 0),
        receiptNo: ctx.receiptNo ?? '',
        paymentDate: new Date().toLocaleDateString('en-IN'),
      };
  }
}

// Mirrors whatsapp-integration/templates/*.json -- submit those to Meta for approval
// under these exact names before sending. Used here for in-app preview only.
export const TEMPLATE_DEFINITIONS: Record<WhatsAppTemplateKind, { name: string; sampleBody: string }> = {
  invoice_dispatched: {
    name: 'fip_invoice_dispatched',
    sampleBody:
      'Dear {{1}}, your maintenance bill for shade {{2}} has been generated. Invoice {{3}}, due {{4}}. Total due: Rs.{{5}}. Pay via the link in this message or visit the office.',
  },
  reminder_due_soon: {
    name: 'fip_payment_reminder',
    sampleBody:
      'Dear {{1}}, your maintenance payment is due in {{2}} days. Invoice {{3}}, amount Rs.{{4}}, due {{5}}. Pay before the due date to avoid a late fine.',
  },
  reminder_due_tomorrow: {
    name: 'fip_payment_due_tomorrow',
    sampleBody:
      'Dear {{1}}, your maintenance payment for invoice {{2}} (Rs.{{3}}) is due TOMORROW. Please pay today to avoid a late fine.',
  },
  overdue_notice: {
    name: 'fip_overdue_notice',
    sampleBody:
      'Dear {{1}}, invoice {{2}} is now overdue. Original amount Rs.{{3}}, late fine Rs.{{4}}/day, total payable Rs.{{5}}. Please pay immediately.',
  },
  payment_receipt: {
    name: 'fip_payment_receipt',
    sampleBody:
      'Dear {{1}}, we have received your payment for invoice {{2}}. Amount paid: Rs.{{3}}. Receipt No: {{4}}, dated {{5}}. Thank you!',
  },
};
