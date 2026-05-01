import {
  boolean,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uuid,
  type AnyPgColumn,
} from 'drizzle-orm/pg-core';
import { id, timestamps } from './_helpers';
import { projects } from './projects';
import { userProfiles } from './platform';
import { boqLineItems } from './boq';

export const taskStatusEnum = pgEnum('task_status', [
  'awaiting_execution',
  'in_progress',
  'done',
  'awaiting_manager_approval',
  'cancelled',
]);

export const taskPriorityEnum = pgEnum('task_priority', [
  'low',
  'medium',
  'high',
  'urgent',
]);

export const tasks = pgTable('tasks', {
  id,
  project_id: uuid('project_id').references(() => projects.id, { onDelete: 'cascade' }),
  parent_task_id: uuid('parent_task_id').references((): AnyPgColumn => tasks.id, {
    onDelete: 'cascade',
  }),
  title: text('title').notNull(),
  description: text('description'),
  status: taskStatusEnum('status').default('awaiting_execution').notNull(),
  priority: taskPriorityEnum('priority').default('medium').notNull(),
  assignee_id: uuid('assignee_id').references(() => userProfiles.id, {
    onDelete: 'set null',
  }),
  due_date: timestamp('due_date', { withTimezone: true }),
  sort_order: integer('sort_order').default(0).notNull(),
  boq_line_item_id: uuid('boq_line_item_id').references(() => boqLineItems.id, {
    onDelete: 'set null',
  }),
  ...timestamps,
});

export const checklistItems = pgTable('checklist_items', {
  id,
  task_id: uuid('task_id')
    .notNull()
    .references(() => tasks.id, { onDelete: 'cascade' }),
  text: text('text').notNull(),
  is_done: boolean('is_done').default(false).notNull(),
  sort_order: integer('sort_order').default(0).notNull(),
  ...timestamps,
});

export const taskDependencies = pgTable('task_dependencies', {
  id,
  task_id: uuid('task_id')
    .notNull()
    .references(() => tasks.id, { onDelete: 'cascade' }),
  depends_on_task_id: uuid('depends_on_task_id')
    .notNull()
    .references(() => tasks.id, { onDelete: 'cascade' }),
});

export const rfiStatusEnum = pgEnum('rfi_status', ['open', 'responded', 'closed']);

export const rfiRecipientTypeEnum = pgEnum('rfi_recipient_type', [
  'client',
  'consultant',
  'supplier',
]);

export const rfis = pgTable('rfis', {
  id,
  project_id: uuid('project_id')
    .notNull()
    .references(() => projects.id, { onDelete: 'cascade' }),
  subject: text('subject').notNull(),
  body: text('body').notNull(),
  recipient_type: rfiRecipientTypeEnum('recipient_type').notNull(),
  recipient_name: text('recipient_name'),
  status: rfiStatusEnum('status').default('open').notNull(),
  linked_task_id: uuid('linked_task_id').references(() => tasks.id, {
    onDelete: 'set null',
  }),
  response: text('response'),
  responded_at: timestamp('responded_at', { withTimezone: true }),
  ...timestamps,
});

export const meetingTypeEnum = pgEnum('meeting_type', [
  'supervision',
  'handover',
  'planning',
]);

export const meetingMinutes = pgTable('meeting_minutes', {
  id,
  project_id: uuid('project_id')
    .notNull()
    .references(() => projects.id, { onDelete: 'cascade' }),
  type: meetingTypeEnum('type').notNull(),
  title: text('title').notNull(),
  held_at: timestamp('held_at', { withTimezone: true }).notNull(),
  attendees: jsonb('attendees'),
  decisions: text('decisions'),
  pdf_url: text('pdf_url'),
  drive_file_id: text('drive_file_id'),
  ...timestamps,
});

export const actionItems = pgTable('action_items', {
  id,
  meeting_id: uuid('meeting_id')
    .notNull()
    .references(() => meetingMinutes.id, { onDelete: 'cascade' }),
  summary: text('summary').notNull(),
  assignee_id: uuid('assignee_id').references(() => userProfiles.id, {
    onDelete: 'set null',
  }),
  due_date: timestamp('due_date', { withTimezone: true }),
  linked_task_id: uuid('linked_task_id').references(() => tasks.id, {
    onDelete: 'set null',
  }),
  ...timestamps,
});

export const handoverProtocols = pgTable('handover_protocols', {
  id,
  project_id: uuid('project_id')
    .notNull()
    .references(() => projects.id, { onDelete: 'cascade' }),
  sections: jsonb('sections'),
  checklist: jsonb('checklist'),
  client_signature_url: text('client_signature_url'),
  signed_at: timestamp('signed_at', { withTimezone: true }),
  pdf_url: text('pdf_url'),
  drive_file_id: text('drive_file_id'),
  ...timestamps,
});
