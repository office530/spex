import { integer, jsonb, pgEnum, pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core';
import { id, timestamps } from './_helpers';
import { projects } from './projects';
import { leads } from './crm';
import { boqLineItems, boqChapters } from './boq';
import { milestones } from './milestones';
import { suppliers } from './procurement';
import { userProfiles } from './platform';

export const customerQuoteKindEnum = pgEnum('customer_quote_kind', [
  'pre_deal',
  'variation',
]);

export const customerQuoteStatusEnum = pgEnum('customer_quote_status', [
  'draft',
  'sent',
  'approved',
  'rejected',
  'cancelled',
]);

export const customerQuotes = pgTable('customer_quotes', {
  id,
  kind: customerQuoteKindEnum('kind').notNull(),
  lead_id: uuid('lead_id').references(() => leads.id, { onDelete: 'set null' }),
  project_id: uuid('project_id').references(() => projects.id, { onDelete: 'cascade' }),
  status: customerQuoteStatusEnum('status').default('draft').notNull(),
  total_amount: integer('total_amount'),
  milestone_plan: jsonb('milestone_plan'),
  notes: text('notes'),
  chashbashvat_doc_id: text('chashbashvat_doc_id'),
  chashbashvat_pdf_url: text('chashbashvat_pdf_url'),
  ...timestamps,
});

export const rfqStatusEnum = pgEnum('rfq_status', ['open', 'closed', 'cancelled']);

export const rfqs = pgTable('rfqs', {
  id,
  project_id: uuid('project_id')
    .notNull()
    .references(() => projects.id, { onDelete: 'cascade' }),
  boq_line_item_id: uuid('boq_line_item_id').references(() => boqLineItems.id, {
    onDelete: 'set null',
  }),
  status: rfqStatusEnum('status').default('open').notNull(),
  notes: text('notes'),
  ...timestamps,
});

export const supplierQuoteStatusEnum = pgEnum('supplier_quote_status', [
  'draft',
  'submitted',
  'under_review',
  'approved',
  'rejected',
  'revised',
]);

export const supplierQuotes = pgTable('supplier_quotes', {
  id,
  project_id: uuid('project_id')
    .notNull()
    .references(() => projects.id, { onDelete: 'cascade' }),
  supplier_id: uuid('supplier_id')
    .notNull()
    .references(() => suppliers.id, { onDelete: 'restrict' }),
  boq_line_item_id: uuid('boq_line_item_id').references(() => boqLineItems.id, {
    onDelete: 'set null',
  }),
  boq_chapter_id: uuid('boq_chapter_id').references(() => boqChapters.id, {
    onDelete: 'set null',
  }),
  rfq_id: uuid('rfq_id').references(() => rfqs.id, { onDelete: 'set null' }),
  status: supplierQuoteStatusEnum('status').default('draft').notNull(),
  amount: integer('amount'),
  notes: text('notes'),
  submitted_at: timestamp('submitted_at', { withTimezone: true }),
  ...timestamps,
});

export const supplierQuoteComments = pgTable('supplier_quote_comments', {
  id,
  quote_id: uuid('quote_id')
    .notNull()
    .references(() => supplierQuotes.id, { onDelete: 'cascade' }),
  user_id: uuid('user_id').references(() => userProfiles.id, { onDelete: 'set null' }),
  body: text('body').notNull(),
  ...timestamps,
});

export const variationStatusEnum = pgEnum('variation_status', [
  'draft',
  'pending_approval',
  'approved',
  'rejected',
  'billed',
]);

export const variations = pgTable('variations', {
  id,
  project_id: uuid('project_id')
    .notNull()
    .references(() => projects.id, { onDelete: 'cascade' }),
  title: text('title').notNull(),
  description: text('description'),
  amount: integer('amount'),
  status: variationStatusEnum('status').default('draft').notNull(),
  approved_at: timestamp('approved_at', { withTimezone: true }),
  billed_with_milestone_id: uuid('billed_with_milestone_id').references(() => milestones.id, {
    onDelete: 'set null',
  }),
  ...timestamps,
});
