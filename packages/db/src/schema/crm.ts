import { integer, jsonb, pgEnum, pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core';
import { id, timestamps } from './_helpers';
import { userProfiles } from './platform';

export const leadSourceEnum = pgEnum('lead_source', [
  'website',
  'fb_ads',
  'referral',
  'manual',
]);

export const leadTypeEnum = pgEnum('lead_type', ['planning', 'execution']);

export const leadStatusEnum = pgEnum('lead_status', [
  'new',
  'no_answer_1',
  'no_answer_2',
  'no_answer_3',
  'follow_up',
  'planning_meeting_scheduled',
  'awaiting_plans',
  'quote_issued',
  'work_meeting_scheduled',
  'won',
  'lost',
  'not_relevant',
]);

export const leads = pgTable('leads', {
  id,
  full_name: text('full_name').notNull(),
  phone: text('phone').notNull(),
  email: text('email'),
  source: leadSourceEnum('source').notNull(),
  type: leadTypeEnum('type').notNull(),
  status: leadStatusEnum('status').default('new').notNull(),
  estimated_value: integer('estimated_value'),
  owner_id: uuid('owner_id').references(() => userProfiles.id, { onDelete: 'set null' }),
  last_contact_at: timestamp('last_contact_at', { withTimezone: true }),
  lost_reason: text('lost_reason'),
  notes: text('notes'),
  ...timestamps,
});

export const interactionTypeEnum = pgEnum('interaction_type', [
  'call',
  'whatsapp',
  'email',
  'meeting',
  'note',
]);

export const interactions = pgTable('interactions', {
  id,
  lead_id: uuid('lead_id')
    .notNull()
    .references(() => leads.id, { onDelete: 'cascade' }),
  type: interactionTypeEnum('type').notNull(),
  note: text('note'),
  user_id: uuid('user_id').references(() => userProfiles.id, { onDelete: 'set null' }),
  occurred_at: timestamp('occurred_at', { withTimezone: true }).defaultNow().notNull(),
  ...timestamps,
});

export const eventStatusEnum = pgEnum('event_status', [
  'scheduled',
  'cancelled',
  'no_show',
]);

export const events = pgTable('events', {
  id,
  title: text('title').notNull(),
  status: eventStatusEnum('status').default('scheduled').notNull(),
  scheduled_at: timestamp('scheduled_at', { withTimezone: true }).notNull(),
  duration_minutes: integer('duration_minutes').default(60),
  lead_id: uuid('lead_id').references(() => leads.id, { onDelete: 'set null' }),
  // project_id FK is declared in projects.ts via a separate table reference; kept as plain
  // column here to break the crm → projects → crm import cycle.
  project_id: uuid('project_id'),
  attendee_ids: jsonb('attendee_ids'),
  google_event_id: text('google_event_id'),
  notes: text('notes'),
  ...timestamps,
});
