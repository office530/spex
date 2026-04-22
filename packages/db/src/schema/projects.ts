import { integer, pgEnum, pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core';
import { id, timestamps } from './_helpers';
import { userProfiles } from './platform';
import { leads } from './crm';

export const clients = pgTable('clients', {
  id,
  company_name: text('company_name').notNull(),
  primary_contact_name: text('primary_contact_name').notNull(),
  phone: text('phone'),
  email: text('email'),
  address: text('address'),
  chashbashvat_customer_id: text('chashbashvat_customer_id'),
  notes: text('notes'),
  ...timestamps,
});

export const contacts = pgTable('contacts', {
  id,
  client_id: uuid('client_id')
    .notNull()
    .references(() => clients.id, { onDelete: 'cascade' }),
  full_name: text('full_name').notNull(),
  role: text('role'),
  phone: text('phone'),
  email: text('email'),
  ...timestamps,
});

export const projectTypeEnum = pgEnum('project_type', [
  'execution',
  'planning_execution',
]);

export const projectStatusEnum = pgEnum('project_status', [
  'active',
  'on_hold',
  'completed',
  'cancelled',
]);

export const projects = pgTable('projects', {
  id,
  client_id: uuid('client_id')
    .notNull()
    .references(() => clients.id, { onDelete: 'restrict' }),
  name: text('name').notNull(),
  type: projectTypeEnum('type').notNull(),
  pm_id: uuid('pm_id').references(() => userProfiles.id, { onDelete: 'set null' }),
  status: projectStatusEnum('status').default('active').notNull(),
  start_date: timestamp('start_date', { withTimezone: true }),
  target_end_date: timestamp('target_end_date', { withTimezone: true }),
  contract_value: integer('contract_value'),
  drive_folder_id: text('drive_folder_id'),
  created_from_lead_id: uuid('created_from_lead_id').references(() => leads.id, {
    onDelete: 'set null',
  }),
  notes: text('notes'),
  ...timestamps,
});

export const projectMemberRoleEnum = pgEnum('project_member_role', [
  'pm',
  'foreman',
  'viewer',
]);

export const projectMembers = pgTable('project_members', {
  id,
  project_id: uuid('project_id')
    .notNull()
    .references(() => projects.id, { onDelete: 'cascade' }),
  user_id: uuid('user_id')
    .notNull()
    .references(() => userProfiles.id, { onDelete: 'cascade' }),
  role: projectMemberRoleEnum('role').notNull(),
  ...timestamps,
});
