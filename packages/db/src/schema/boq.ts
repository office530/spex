import { date, integer, pgEnum, pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core';
import { id, timestamps } from './_helpers';
import { projects } from './projects';
import { userProfiles } from './platform';

export const boqTemplates = pgTable('boq_templates', {
  id,
  name: text('name').notNull(),
  description: text('description'),
  ...timestamps,
});

export const boqTemplateItems = pgTable('boq_template_items', {
  id,
  template_id: uuid('template_id')
    .notNull()
    .references(() => boqTemplates.id, { onDelete: 'cascade' }),
  chapter: text('chapter').notNull(),
  description: text('description').notNull(),
  unit: text('unit'),
  unit_price: integer('unit_price'),
  sort_order: integer('sort_order').default(0).notNull(),
  ...timestamps,
});

export const boqChapters = pgTable('boq_chapters', {
  id,
  project_id: uuid('project_id')
    .notNull()
    .references(() => projects.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  sort_order: integer('sort_order').default(0).notNull(),
  ...timestamps,
});

export const boqLineItems = pgTable('boq_line_items', {
  id,
  chapter_id: uuid('chapter_id')
    .notNull()
    .references(() => boqChapters.id, { onDelete: 'cascade' }),
  project_id: uuid('project_id')
    .notNull()
    .references(() => projects.id, { onDelete: 'cascade' }),
  description: text('description').notNull(),
  unit: text('unit'),
  quantity: integer('quantity'),
  unit_price: integer('unit_price'),
  estimated_total: integer('estimated_total'),
  notes: text('notes'),
  sort_order: integer('sort_order').default(0).notNull(),
  ...timestamps,
});

// Phase 77: QC entity. Per-line-item quality-control checklist with threaded comments.
export const qcCheckStatusEnum = pgEnum('qc_check_status', [
  'pending',
  'in_progress',
  'done',
  'failed',
  'waiting',
]);

export const boqLineItemChecks = pgTable('boq_line_item_checks', {
  id,
  line_item_id: uuid('line_item_id')
    .notNull()
    .references(() => boqLineItems.id, { onDelete: 'cascade' }),
  description: text('description').notNull(),
  status: qcCheckStatusEnum('status').default('pending').notNull(),
  assigned_to: uuid('assigned_to').references(() => userProfiles.id, { onDelete: 'set null' }),
  due_date: date('due_date'),
  completed_by: uuid('completed_by').references(() => userProfiles.id, { onDelete: 'set null' }),
  completed_at: timestamp('completed_at', { withTimezone: true }),
  notes: text('notes'),
  sort_order: integer('sort_order').default(0).notNull(),
  created_by: uuid('created_by').references(() => userProfiles.id, { onDelete: 'set null' }),
  ...timestamps,
});

export const boqQcComments = pgTable('boq_qc_comments', {
  id,
  qc_check_id: uuid('qc_check_id')
    .notNull()
    .references(() => boqLineItemChecks.id, { onDelete: 'cascade' }),
  author_id: uuid('author_id').references(() => userProfiles.id, { onDelete: 'set null' }),
  body: text('body').notNull(),
  created_at: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});
