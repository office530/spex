import { timestamp, uuid } from 'drizzle-orm/pg-core';

export const timestamps = {
  created_at: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updated_at: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
};

export const id = uuid('id').primaryKey().defaultRandom();
