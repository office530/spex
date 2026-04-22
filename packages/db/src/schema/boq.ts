import { integer, pgTable, text, uuid } from 'drizzle-orm/pg-core';
import { id, timestamps } from './_helpers';
import { projects } from './projects';

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
