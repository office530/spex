import { integer, pgEnum, pgTable, text, uuid } from 'drizzle-orm/pg-core';
import { id, timestamps } from './_helpers';
import { projects } from './projects';

export const milestoneTemplates = pgTable('milestone_templates', {
  id,
  name: text('name').notNull(),
  name_he: text('name_he'),
  default_billing_pct: integer('default_billing_pct'),
  sort_order: integer('sort_order').default(0).notNull(),
  ...timestamps,
});

export const milestoneExecutionStatusEnum = pgEnum('milestone_execution_status', [
  'pending',
  'in_progress',
  'done',
]);

export const milestoneBillingStatusEnum = pgEnum('milestone_billing_status', [
  'not_yet_due',
  'ready_to_bill',
  'invoiced',
  'paid',
]);

export const milestones = pgTable('milestones', {
  id,
  project_id: uuid('project_id')
    .notNull()
    .references(() => projects.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  name_he: text('name_he'),
  billing_pct: integer('billing_pct').notNull(),
  sort_order: integer('sort_order').default(0).notNull(),
  execution_status: milestoneExecutionStatusEnum('execution_status')
    .default('pending')
    .notNull(),
  billing_status: milestoneBillingStatusEnum('billing_status')
    .default('not_yet_due')
    .notNull(),
  ...timestamps,
});
