import { integer, jsonb, pgEnum, pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core';
import { id, timestamps } from './_helpers';
import { projects } from './projects';
import { milestones } from './milestones';

export const customerInvoiceKindEnum = pgEnum('customer_invoice_kind', [
  'tax_invoice',
  'deal_invoice',
]);

export const customerInvoiceStatusEnum = pgEnum('customer_invoice_status', [
  'awaiting_issuance',
  'issued',
  'paid',
  'overdue',
  'cancelled',
]);

export const customerInvoices = pgTable('customer_invoices', {
  id,
  project_id: uuid('project_id')
    .notNull()
    .references(() => projects.id, { onDelete: 'restrict' }),
  milestone_id: uuid('milestone_id').references(() => milestones.id, {
    onDelete: 'set null',
  }),
  kind: customerInvoiceKindEnum('kind').notNull(),
  status: customerInvoiceStatusEnum('status').default('awaiting_issuance').notNull(),
  amount: integer('amount').notNull(),
  extras_ids: jsonb('extras_ids'),
  due_date: timestamp('due_date', { withTimezone: true }),
  issued_at: timestamp('issued_at', { withTimezone: true }),
  paid_at: timestamp('paid_at', { withTimezone: true }),
  chashbashvat_invoice_id: text('chashbashvat_invoice_id'),
  chashbashvat_pdf_url: text('chashbashvat_pdf_url'),
  notes: text('notes'),
  ...timestamps,
});

export const customerReceipts = pgTable('customer_receipts', {
  id,
  invoice_id: uuid('invoice_id')
    .notNull()
    .references(() => customerInvoices.id, { onDelete: 'cascade' }),
  amount: integer('amount').notNull(),
  received_at: timestamp('received_at', { withTimezone: true }).notNull(),
  chashbashvat_receipt_id: text('chashbashvat_receipt_id'),
  ...timestamps,
});
