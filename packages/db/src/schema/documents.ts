import { jsonb, pgEnum, pgTable, text, uuid } from 'drizzle-orm/pg-core';
import { id, timestamps } from './_helpers';
import { projects } from './projects';
import { userProfiles } from './platform';

export const documents = pgTable('documents', {
  id,
  project_id: uuid('project_id')
    .notNull()
    .references(() => projects.id, { onDelete: 'cascade' }),
  drive_file_id: text('drive_file_id').notNull(),
  filename: text('filename').notNull(),
  folder_path: text('folder_path'),
  tags: jsonb('tags'),
  mime_type: text('mime_type'),
  ...timestamps,
});

export const ticketStatusEnum = pgEnum('ticket_status', [
  'new',
  'in_progress',
  'awaiting_manager',
  'resolved',
  'cancelled',
]);

export const ticketOpenerTypeEnum = pgEnum('ticket_opener_type', [
  'client',
  'manager',
  'anonymous',
]);

export const tickets = pgTable('tickets', {
  id,
  subject: text('subject').notNull(),
  body: text('body').notNull(),
  opener_type: ticketOpenerTypeEnum('opener_type').notNull(),
  opener_name: text('opener_name'),
  opener_contact: text('opener_contact'),
  status: ticketStatusEnum('status').default('new').notNull(),
  project_id: uuid('project_id').references(() => projects.id, { onDelete: 'set null' }),
  assigned_to_id: uuid('assigned_to_id').references(() => userProfiles.id, {
    onDelete: 'set null',
  }),
  attachments: jsonb('attachments'),
  ...timestamps,
});
