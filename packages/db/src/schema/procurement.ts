import { integer, pgEnum, pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core';
import { id, timestamps } from './_helpers';
import { projects } from './projects';
import { boqLineItems } from './boq';

export const supplierStatusEnum = pgEnum('supplier_status', [
  'pending_approval',
  'active',
  'blocked',
]);

export const suppliers = pgTable('suppliers', {
  id,
  name: text('name').notNull(),
  category: text('category'),
  phone: text('phone'),
  email: text('email'),
  tax_id: text('tax_id'),
  status: supplierStatusEnum('status').default('pending_approval').notNull(),
  chashbashvat_supplier_id: text('chashbashvat_supplier_id'),
  notes: text('notes'),
  ...timestamps,
});

export const poStatusEnum = pgEnum('po_status', [
  'draft',
  'issued',
  'partially_received',
  'received',
  'cancelled',
]);

export const purchaseOrders = pgTable('purchase_orders', {
  id,
  project_id: uuid('project_id')
    .notNull()
    .references(() => projects.id, { onDelete: 'restrict' }),
  supplier_id: uuid('supplier_id')
    .notNull()
    .references(() => suppliers.id, { onDelete: 'restrict' }),
  status: poStatusEnum('status').default('draft').notNull(),
  total_amount: integer('total_amount'),
  issued_at: timestamp('issued_at', { withTimezone: true }),
  chashbashvat_po_id: text('chashbashvat_po_id'),
  chashbashvat_pdf_url: text('chashbashvat_pdf_url'),
  notes: text('notes'),
  ...timestamps,
});

export const poLineItems = pgTable('po_line_items', {
  id,
  po_id: uuid('po_id')
    .notNull()
    .references(() => purchaseOrders.id, { onDelete: 'cascade' }),
  boq_line_item_id: uuid('boq_line_item_id').references(() => boqLineItems.id, {
    onDelete: 'set null',
  }),
  description: text('description').notNull(),
  quantity: integer('quantity'),
  unit_price: integer('unit_price'),
  total: integer('total'),
  ...timestamps,
});

export const supplierInvoiceStatusEnum = pgEnum('supplier_invoice_status', [
  'received',
  'matched',
  'disputed',
  'processed',
]);

export const supplierInvoices = pgTable('supplier_invoices', {
  id,
  project_id: uuid('project_id')
    .notNull()
    .references(() => projects.id, { onDelete: 'restrict' }),
  supplier_id: uuid('supplier_id')
    .notNull()
    .references(() => suppliers.id, { onDelete: 'restrict' }),
  po_id: uuid('po_id').references(() => purchaseOrders.id, { onDelete: 'set null' }),
  status: supplierInvoiceStatusEnum('status').default('received').notNull(),
  amount: integer('amount').notNull(),
  invoice_number: text('invoice_number'),
  invoice_date: timestamp('invoice_date', { withTimezone: true }),
  file_url: text('file_url'),
  chashbashvat_invoice_id: text('chashbashvat_invoice_id'),
  notes: text('notes'),
  ...timestamps,
});

export const paymentRequestStatusEnum = pgEnum('payment_request_status', [
  'awaiting_payment_request',
  'awaiting_pm_approval',
  'pm_approved_awaiting_back_office',
  'paid',
  'rejected',
]);

export const paymentRequests = pgTable('payment_requests', {
  id,
  project_id: uuid('project_id')
    .notNull()
    .references(() => projects.id, { onDelete: 'restrict' }),
  supplier_invoice_id: uuid('supplier_invoice_id').references(() => supplierInvoices.id, {
    onDelete: 'set null',
  }),
  po_id: uuid('po_id').references(() => purchaseOrders.id, { onDelete: 'set null' }),
  status: paymentRequestStatusEnum('status')
    .default('awaiting_payment_request')
    .notNull(),
  amount: integer('amount').notNull(),
  paid_at: timestamp('paid_at', { withTimezone: true }),
  notes: text('notes'),
  ...timestamps,
});

export const expenses = pgTable('expenses', {
  id,
  project_id: uuid('project_id')
    .notNull()
    .references(() => projects.id, { onDelete: 'restrict' }),
  payment_request_id: uuid('payment_request_id').references(() => paymentRequests.id, {
    onDelete: 'set null',
  }),
  supplier_id: uuid('supplier_id').references(() => suppliers.id, { onDelete: 'set null' }),
  amount: integer('amount').notNull(),
  description: text('description'),
  expense_date: timestamp('expense_date', { withTimezone: true }).defaultNow(),
  ...timestamps,
});
