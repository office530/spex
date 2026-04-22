import { boolean, jsonb, pgEnum, pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core';
import { id, timestamps } from './_helpers';

export const userRoleEnum = pgEnum('user_role', [
  'ceo',
  'vp',
  'cfo',
  'office_manager',
  'pm',
  'foreman',
]);

export const userProfiles = pgTable('user_profiles', {
  id: uuid('id').primaryKey(),
  role: userRoleEnum('role').notNull(),
  full_name: text('full_name').notNull(),
  phone: text('phone'),
  is_active: boolean('is_active').default(true).notNull(),
  ...timestamps,
});

export const notificationChannelEnum = pgEnum('notification_channel', [
  'in_app',
  'email',
  'whatsapp',
]);

export const notificationPreferences = pgTable('notification_preferences', {
  id,
  user_id: uuid('user_id')
    .notNull()
    .references(() => userProfiles.id, { onDelete: 'cascade' }),
  event_type: text('event_type').notNull(),
  channel: notificationChannelEnum('channel').notNull(),
  enabled: boolean('enabled').default(true).notNull(),
  ...timestamps,
});

export const notificationLogs = pgTable('notification_logs', {
  id,
  user_id: uuid('user_id').references(() => userProfiles.id, { onDelete: 'set null' }),
  event_type: text('event_type').notNull(),
  channel: notificationChannelEnum('channel').notNull(),
  recipient: text('recipient').notNull(),
  payload: jsonb('payload'),
  sent_at: timestamp('sent_at', { withTimezone: true }).defaultNow().notNull(),
  success: boolean('success').notNull(),
  error: text('error'),
});

export const activityLogs = pgTable('activity_logs', {
  id,
  entity_type: text('entity_type').notNull(),
  entity_id: uuid('entity_id').notNull(),
  action: text('action').notNull(),
  user_id: uuid('user_id').references(() => userProfiles.id, { onDelete: 'set null' }),
  before: jsonb('before'),
  after: jsonb('after'),
  occurred_at: timestamp('occurred_at', { withTimezone: true }).defaultNow().notNull(),
});

export const automationRules = pgTable('automation_rules', {
  id,
  name: text('name').notNull(),
  trigger_event: text('trigger_event').notNull(),
  conditions: jsonb('conditions'),
  actions: jsonb('actions').notNull(),
  is_active: boolean('is_active').default(true).notNull(),
  ...timestamps,
});
