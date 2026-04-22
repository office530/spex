# Spex — Starter Drizzle Schema

Drizzle ORM schema for `packages/db/src/schema/`. PostgreSQL via Supabase.
Split into domain files; all imported in `index.ts`.

---

## Setup: `packages/db/src/index.ts`

```ts
import { drizzle } from 'drizzle-orm/postgres-js'
import postgres from 'postgres'
import * as schema from './schema'

const client = postgres(process.env.DATABASE_URL!)
export const db = drizzle(client, { schema })
export * from './schema'
```

---

## Shared helpers: `packages/db/src/schema/_helpers.ts`

```ts
import { pgEnum, timestamp, uuid } from 'drizzle-orm/pg-core'

export const timestamps = {
  created_at: timestamp('created_at').defaultNow().notNull(),
  updated_at: timestamp('updated_at').defaultNow().notNull(),
}

export const id = uuid('id').primaryKey().defaultRandom()
```

---

## Domain: Platform — `schema/platform.ts`

```ts
import { pgTable, pgEnum, text, boolean, timestamp, uuid } from 'drizzle-orm/pg-core'
import { id, timestamps } from './_helpers'

export const userRoleEnum = pgEnum('user_role', [
  'ceo', 'vp', 'cfo', 'office_manager', 'pm', 'foreman',
])

export const userProfiles = pgTable('user_profiles', {
  id: uuid('id').primaryKey(), // matches auth.users.id
  role: userRoleEnum('role').notNull(),
  full_name: text('full_name').notNull(),
  phone: text('phone'),
  is_active: boolean('is_active').default(true).notNull(),
  ...timestamps,
})

export const notificationChannelEnum = pgEnum('notification_channel', [
  'in_app', 'email', 'whatsapp',
])

export const notificationPreferences = pgTable('notification_preferences', {
  id,
  user_id: uuid('user_id').notNull().references(() => userProfiles.id),
  event_type: text('event_type').notNull(),
  channel: notificationChannelEnum('channel').notNull(),
  enabled: boolean('enabled').default(true).notNull(),
  ...timestamps,
})

export const notificationLogs = pgTable('notification_logs', {
  id,
  user_id: uuid('user_id').references(() => userProfiles.id),
  event_type: text('event_type').notNull(),
  channel: notificationChannelEnum('channel').notNull(),
  recipient: text('recipient').notNull(),
  payload: text('payload'), // JSON string
  sent_at: timestamp('sent_at').defaultNow().notNull(),
  success: boolean('success').notNull(),
  error: text('error'),
})

export const activityLogs = pgTable('activity_logs', {
  id,
  entity_type: text('entity_type').notNull(),
  entity_id: uuid('entity_id').notNull(),
  action: text('action').notNull(), // create / update / delete / status_change
  user_id: uuid('user_id').references(() => userProfiles.id),
  before: text('before'), // JSON
  after: text('after'),   // JSON
  occurred_at: timestamp('occurred_at').defaultNow().notNull(),
})

export const automationRules = pgTable('automation_rules', {
  id,
  name: text('name').notNull(),
  trigger_event: text('trigger_event').notNull(),
  conditions: text('conditions'), // JSON
  actions: text('actions').notNull(), // JSON
  is_active: boolean('is_active').default(true).notNull(),
  ...timestamps,
})
```

---

## Domain: CRM — `schema/crm.ts`

```ts
import { pgTable, pgEnum, text, integer, timestamp, uuid, boolean } from 'drizzle-orm/pg-core'
import { id, timestamps } from './_helpers'
import { userProfiles } from './platform'

export const leadSourceEnum = pgEnum('lead_source', [
  'website', 'fb_ads', 'referral', 'manual',
])

export const leadTypeEnum = pgEnum('lead_type', [
  'planning', 'execution',
])

export const leadStatusEnum = pgEnum('lead_status', [
  'new',
  'no_answer_1', 'no_answer_2', 'no_answer_3',
  'follow_up',
  'planning_meeting_scheduled',
  'awaiting_plans',
  'quote_issued',
  'work_meeting_scheduled',
  'won',
  'lost',
  'not_relevant',
])

export const leads = pgTable('leads', {
  id,
  full_name: text('full_name').notNull(),
  phone: text('phone').notNull(),
  email: text('email'),
  source: leadSourceEnum('source').notNull(),
  type: leadTypeEnum('type').notNull(),
  status: leadStatusEnum('status').default('new').notNull(),
  estimated_value: integer('estimated_value'),
  owner_id: uuid('owner_id').references(() => userProfiles.id),
  last_contact_at: timestamp('last_contact_at'),
  lost_reason: text('lost_reason'),
  notes: text('notes'),
  ...timestamps,
})

export const interactionTypeEnum = pgEnum('interaction_type', [
  'call', 'whatsapp', 'email', 'meeting', 'note',
])

export const interactions = pgTable('interactions', {
  id,
  lead_id: uuid('lead_id').notNull().references(() => leads.id, { onDelete: 'cascade' }),
  type: interactionTypeEnum('type').notNull(),
  note: text('note'),
  user_id: uuid('user_id').references(() => userProfiles.id),
  occurred_at: timestamp('occurred_at').defaultNow().notNull(),
  ...timestamps,
})

export const eventStatusEnum = pgEnum('event_status', [
  'scheduled', 'cancelled', 'no_show',
])

export const events = pgTable('events', {
  id,
  title: text('title').notNull(),
  status: eventStatusEnum('status').default('scheduled').notNull(),
  scheduled_at: timestamp('scheduled_at').notNull(),
  duration_minutes: integer('duration_minutes').default(60),
  lead_id: uuid('lead_id').references(() => leads.id),
  project_id: uuid('project_id'), // FK added after projects table
  attendee_ids: text('attendee_ids'), // JSON array of user_profile ids
  google_event_id: text('google_event_id'),
  notes: text('notes'),
  ...timestamps,
})
```

---

## Domain: Clients & Projects — `schema/projects.ts`

```ts
import { pgTable, pgEnum, text, integer, timestamp, uuid, boolean } from 'drizzle-orm/pg-core'
import { id, timestamps } from './_helpers'
import { userProfiles } from './platform'
import { leads } from './crm'

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
})

export const contacts = pgTable('contacts', {
  id,
  client_id: uuid('client_id').notNull().references(() => clients.id, { onDelete: 'cascade' }),
  full_name: text('full_name').notNull(),
  role: text('role'),
  phone: text('phone'),
  email: text('email'),
  ...timestamps,
})

export const projectTypeEnum = pgEnum('project_type', [
  'execution', 'planning_execution',
])

export const projectStatusEnum = pgEnum('project_status', [
  'active', 'on_hold', 'completed', 'cancelled',
])

export const projects = pgTable('projects', {
  id,
  client_id: uuid('client_id').notNull().references(() => clients.id),
  name: text('name').notNull(),
  type: projectTypeEnum('type').notNull(),
  pm_id: uuid('pm_id').references(() => userProfiles.id),
  status: projectStatusEnum('status').default('active').notNull(),
  start_date: timestamp('start_date'),
  target_end_date: timestamp('target_end_date'),
  contract_value: integer('contract_value'),
  drive_folder_id: text('drive_folder_id'),
  created_from_lead_id: uuid('created_from_lead_id').references(() => leads.id),
  notes: text('notes'),
  ...timestamps,
})

export const projectMemberRoleEnum = pgEnum('project_member_role', [
  'pm', 'foreman', 'viewer',
])

export const projectMembers = pgTable('project_members', {
  id,
  project_id: uuid('project_id').notNull().references(() => projects.id, { onDelete: 'cascade' }),
  user_id: uuid('user_id').notNull().references(() => userProfiles.id),
  role: projectMemberRoleEnum('role').notNull(),
  ...timestamps,
})
```

---

## Domain: BoQ — `schema/boq.ts`

```ts
import { pgTable, text, integer, uuid, boolean } from 'drizzle-orm/pg-core'
import { id, timestamps } from './_helpers'
import { projects } from './projects'

export const boqTemplates = pgTable('boq_templates', {
  id,
  name: text('name').notNull(),
  description: text('description'),
  ...timestamps,
})

export const boqTemplateItems = pgTable('boq_template_items', {
  id,
  template_id: uuid('template_id').notNull().references(() => boqTemplates.id, { onDelete: 'cascade' }),
  chapter: text('chapter').notNull(),
  description: text('description').notNull(),
  unit: text('unit'),
  unit_price: integer('unit_price'),
  sort_order: integer('sort_order').default(0),
  ...timestamps,
})

export const boqChapters = pgTable('boq_chapters', {
  id,
  project_id: uuid('project_id').notNull().references(() => projects.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  sort_order: integer('sort_order').default(0),
  ...timestamps,
})

export const boqLineItems = pgTable('boq_line_items', {
  id,
  chapter_id: uuid('chapter_id').notNull().references(() => boqChapters.id, { onDelete: 'cascade' }),
  project_id: uuid('project_id').notNull().references(() => projects.id),
  description: text('description').notNull(),
  unit: text('unit'),
  quantity: integer('quantity'),
  unit_price: integer('unit_price'),
  estimated_total: integer('estimated_total'),
  notes: text('notes'),
  sort_order: integer('sort_order').default(0),
  ...timestamps,
})
```

---

## Domain: Milestones — `schema/milestones.ts`

```ts
import { pgTable, pgEnum, text, integer, uuid } from 'drizzle-orm/pg-core'
import { id, timestamps } from './_helpers'
import { projects } from './projects'

export const milestoneTemplates = pgTable('milestone_templates', {
  id,
  name: text('name').notNull(),
  name_he: text('name_he'),
  default_billing_pct: integer('default_billing_pct'),
  sort_order: integer('sort_order').default(0),
  ...timestamps,
})

export const milestoneExecutionStatusEnum = pgEnum('milestone_execution_status', [
  'pending', 'in_progress', 'done',
])

export const milestoneBillingStatusEnum = pgEnum('milestone_billing_status', [
  'not_yet_due', 'ready_to_bill', 'invoiced', 'paid',
])

export const milestones = pgTable('milestones', {
  id,
  project_id: uuid('project_id').notNull().references(() => projects.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  name_he: text('name_he'),
  billing_pct: integer('billing_pct').notNull(),
  sort_order: integer('sort_order').default(0),
  execution_status: milestoneExecutionStatusEnum('execution_status').default('pending').notNull(),
  billing_status: milestoneBillingStatusEnum('billing_status').default('not_yet_due').notNull(),
  ...timestamps,
})
```

---

## Domain: Quotes — `schema/quotes.ts`

```ts
import { pgTable, pgEnum, text, integer, boolean, uuid } from 'drizzle-orm/pg-core'
import { id, timestamps } from './_helpers'
import { projects } from './projects'
import { leads } from './crm'
import { boqLineItems, boqChapters } from './boq'
import { userProfiles } from './platform'

export const customerQuoteKindEnum = pgEnum('customer_quote_kind', [
  'pre_deal', 'variation',
])

export const customerQuoteStatusEnum = pgEnum('customer_quote_status', [
  'draft', 'sent', 'approved', 'rejected', 'cancelled',
])

export const customerQuotes = pgTable('customer_quotes', {
  id,
  kind: customerQuoteKindEnum('kind').notNull(),
  lead_id: uuid('lead_id').references(() => leads.id),
  project_id: uuid('project_id').references(() => projects.id),
  status: customerQuoteStatusEnum('status').default('draft').notNull(),
  total_amount: integer('total_amount'),
  milestone_plan: text('milestone_plan'), // JSON: [{milestone_name, pct}]
  notes: text('notes'),
  chashbashvat_doc_id: text('chashbashvat_doc_id'),
  chashbashvat_pdf_url: text('chashbashvat_pdf_url'),
  ...timestamps,
})

export const supplierQuoteStatusEnum = pgEnum('supplier_quote_status', [
  'draft', 'submitted', 'under_review', 'approved', 'rejected', 'revised',
])

export const supplierQuotes = pgTable('supplier_quotes', {
  id,
  project_id: uuid('project_id').notNull().references(() => projects.id),
  supplier_id: uuid('supplier_id').notNull(), // FK to suppliers
  boq_line_item_id: uuid('boq_line_item_id').references(() => boqLineItems.id),
  boq_chapter_id: uuid('boq_chapter_id').references(() => boqChapters.id),
  rfq_id: uuid('rfq_id'), // FK to rfqs (optional)
  status: supplierQuoteStatusEnum('status').default('draft').notNull(),
  amount: integer('amount'),
  notes: text('notes'),
  submitted_at: text('submitted_at'),
  ...timestamps,
})

export const supplierQuoteComments = pgTable('supplier_quote_comments', {
  id,
  quote_id: uuid('quote_id').notNull().references(() => supplierQuotes.id, { onDelete: 'cascade' }),
  user_id: uuid('user_id').references(() => userProfiles.id),
  body: text('body').notNull(),
  ...timestamps,
})

export const rfqStatusEnum = pgEnum('rfq_status', [
  'open', 'closed', 'cancelled',
])

export const rfqs = pgTable('rfqs', {
  id,
  project_id: uuid('project_id').notNull().references(() => projects.id),
  boq_line_item_id: uuid('boq_line_item_id').references(() => boqLineItems.id),
  status: rfqStatusEnum('status').default('open').notNull(),
  notes: text('notes'),
  ...timestamps,
})

export const variationStatusEnum = pgEnum('variation_status', [
  'draft', 'pending_approval', 'approved', 'rejected', 'billed',
])

export const variations = pgTable('variations', {
  id,
  project_id: uuid('project_id').notNull().references(() => projects.id),
  title: text('title').notNull(),
  description: text('description'),
  amount: integer('amount'),
  status: variationStatusEnum('status').default('draft').notNull(),
  approved_at: text('approved_at'),
  billed_with_milestone_id: uuid('billed_with_milestone_id'),
  ...timestamps,
})
```

---

## Domain: Suppliers & Procurement — `schema/procurement.ts`

```ts
import { pgTable, pgEnum, text, integer, boolean, uuid, timestamp } from 'drizzle-orm/pg-core'
import { id, timestamps } from './_helpers'
import { projects } from './projects'
import { boqLineItems } from './boq'

export const supplierStatusEnum = pgEnum('supplier_status', [
  'pending_approval', 'active', 'blocked',
])

export const suppliers = pgTable('suppliers', {
  id,
  name: text('name').notNull(),
  category: text('category'),
  phone: text('phone'),
  email: text('email'),
  tax_id: text('tax_id'),
  status: supplierStatusEnum('status').default('pending_approval').notNull(),
  chashbashvat_supplier_id: text('chashbashvat_supplier_id'),
  notes: text('notes'),
  ...timestamps,
})

export const poStatusEnum = pgEnum('po_status', [
  'draft', 'issued', 'partially_received', 'received', 'cancelled',
])

export const purchaseOrders = pgTable('purchase_orders', {
  id,
  project_id: uuid('project_id').notNull().references(() => projects.id),
  supplier_id: uuid('supplier_id').notNull().references(() => suppliers.id),
  status: poStatusEnum('status').default('draft').notNull(),
  total_amount: integer('total_amount'),
  issued_at: timestamp('issued_at'),
  chashbashvat_po_id: text('chashbashvat_po_id'),
  chashbashvat_pdf_url: text('chashbashvat_pdf_url'),
  notes: text('notes'),
  ...timestamps,
})

export const poLineItems = pgTable('po_line_items', {
  id,
  po_id: uuid('po_id').notNull().references(() => purchaseOrders.id, { onDelete: 'cascade' }),
  boq_line_item_id: uuid('boq_line_item_id').references(() => boqLineItems.id),
  description: text('description').notNull(),
  quantity: integer('quantity'),
  unit_price: integer('unit_price'),
  total: integer('total'),
  ...timestamps,
})

export const supplierInvoiceStatusEnum = pgEnum('supplier_invoice_status', [
  'received', 'matched', 'disputed', 'processed',
])

export const supplierInvoices = pgTable('supplier_invoices', {
  id,
  project_id: uuid('project_id').notNull().references(() => projects.id),
  supplier_id: uuid('supplier_id').notNull().references(() => suppliers.id),
  po_id: uuid('po_id').references(() => purchaseOrders.id),
  status: supplierInvoiceStatusEnum('status').default('received').notNull(),
  amount: integer('amount').notNull(),
  invoice_number: text('invoice_number'),
  invoice_date: timestamp('invoice_date'),
  file_url: text('file_url'),
  chashbashvat_invoice_id: text('chashbashvat_invoice_id'),
  notes: text('notes'),
  ...timestamps,
})

export const paymentRequestStatusEnum = pgEnum('payment_request_status', [
  'awaiting_payment_request',
  'awaiting_pm_approval',
  'pm_approved_awaiting_back_office',
  'paid',
  'rejected',
])

export const paymentRequests = pgTable('payment_requests', {
  id,
  project_id: uuid('project_id').notNull().references(() => projects.id),
  supplier_invoice_id: uuid('supplier_invoice_id').references(() => supplierInvoices.id),
  po_id: uuid('po_id').references(() => purchaseOrders.id),
  status: paymentRequestStatusEnum('status').default('awaiting_payment_request').notNull(),
  amount: integer('amount').notNull(),
  paid_at: timestamp('paid_at'),
  notes: text('notes'),
  ...timestamps,
})

export const expenses = pgTable('expenses', {
  id,
  project_id: uuid('project_id').notNull().references(() => projects.id),
  payment_request_id: uuid('payment_request_id').references(() => paymentRequests.id),
  supplier_id: uuid('supplier_id').references(() => suppliers.id),
  amount: integer('amount').notNull(),
  description: text('description'),
  expense_date: timestamp('expense_date').defaultNow(),
  ...timestamps,
})
```

---

## Domain: Customer Finance — `schema/finance.ts`

```ts
import { pgTable, pgEnum, text, integer, timestamp, uuid } from 'drizzle-orm/pg-core'
import { id, timestamps } from './_helpers'
import { projects } from './projects'
import { milestones } from './milestones'
import { clients } from './projects'

export const customerInvoiceKindEnum = pgEnum('customer_invoice_kind', [
  'tax_invoice', 'deal_invoice',
])

export const customerInvoiceStatusEnum = pgEnum('customer_invoice_status', [
  'awaiting_issuance', 'issued', 'paid', 'overdue', 'cancelled',
])

export const customerInvoices = pgTable('customer_invoices', {
  id,
  project_id: uuid('project_id').notNull().references(() => projects.id),
  milestone_id: uuid('milestone_id').references(() => milestones.id),
  kind: customerInvoiceKindEnum('kind').notNull(),
  status: customerInvoiceStatusEnum('status').default('awaiting_issuance').notNull(),
  amount: integer('amount').notNull(),
  extras_ids: text('extras_ids'), // JSON array of variation ids bundled
  due_date: timestamp('due_date'),
  issued_at: timestamp('issued_at'),
  paid_at: timestamp('paid_at'),
  chashbashvat_invoice_id: text('chashbashvat_invoice_id'),
  chashbashvat_pdf_url: text('chashbashvat_pdf_url'),
  notes: text('notes'),
  ...timestamps,
})

export const customerReceipts = pgTable('customer_receipts', {
  id,
  invoice_id: uuid('invoice_id').notNull().references(() => customerInvoices.id),
  amount: integer('amount').notNull(),
  received_at: timestamp('received_at').notNull(),
  chashbashvat_receipt_id: text('chashbashvat_receipt_id'),
  ...timestamps,
})
```

---

## Domain: Operations — `schema/operations.ts`

```ts
import { pgTable, pgEnum, text, boolean, integer, timestamp, uuid } from 'drizzle-orm/pg-core'
import { id, timestamps } from './_helpers'
import { projects } from './projects'
import { userProfiles } from './platform'

export const taskStatusEnum = pgEnum('task_status', [
  'awaiting_execution', 'in_progress', 'done',
  'awaiting_manager_approval', 'cancelled',
])

export const taskPriorityEnum = pgEnum('task_priority', [
  'low', 'medium', 'high', 'urgent',
])

export const tasks = pgTable('tasks', {
  id,
  project_id: uuid('project_id').references(() => projects.id),
  parent_task_id: uuid('parent_task_id'), // self-ref; add FK after table is defined
  title: text('title').notNull(),
  description: text('description'),
  status: taskStatusEnum('status').default('awaiting_execution').notNull(),
  priority: taskPriorityEnum('priority').default('medium').notNull(),
  assignee_id: uuid('assignee_id').references(() => userProfiles.id),
  due_date: timestamp('due_date'),
  sort_order: integer('sort_order').default(0),
  ...timestamps,
})

export const checklistItems = pgTable('checklist_items', {
  id,
  task_id: uuid('task_id').notNull().references(() => tasks.id, { onDelete: 'cascade' }),
  text: text('text').notNull(),
  is_done: boolean('is_done').default(false).notNull(),
  sort_order: integer('sort_order').default(0),
  ...timestamps,
})

export const taskDependencies = pgTable('task_dependencies', {
  id,
  task_id: uuid('task_id').notNull().references(() => tasks.id, { onDelete: 'cascade' }),
  depends_on_task_id: uuid('depends_on_task_id').notNull().references(() => tasks.id),
})

export const rfiStatusEnum = pgEnum('rfi_status', [
  'open', 'responded', 'closed',
])

export const rfiRecipientTypeEnum = pgEnum('rfi_recipient_type', [
  'client', 'consultant', 'supplier',
])

export const rfis = pgTable('rfis', {
  id,
  project_id: uuid('project_id').notNull().references(() => projects.id),
  subject: text('subject').notNull(),
  body: text('body').notNull(),
  recipient_type: rfiRecipientTypeEnum('recipient_type').notNull(),
  recipient_name: text('recipient_name'),
  status: rfiStatusEnum('status').default('open').notNull(),
  linked_task_id: uuid('linked_task_id').references(() => tasks.id),
  response: text('response'),
  responded_at: timestamp('responded_at'),
  ...timestamps,
})

export const meetingTypeEnum = pgEnum('meeting_type', [
  'supervision', 'handover', 'planning',
])

export const meetingMinutes = pgTable('meeting_minutes', {
  id,
  project_id: uuid('project_id').notNull().references(() => projects.id),
  type: meetingTypeEnum('type').notNull(),
  title: text('title').notNull(),
  held_at: timestamp('held_at').notNull(),
  attendees: text('attendees'), // JSON array of names/user ids
  decisions: text('decisions'), // rich text
  pdf_url: text('pdf_url'),
  drive_file_id: text('drive_file_id'),
  ...timestamps,
})

export const actionItems = pgTable('action_items', {
  id,
  meeting_id: uuid('meeting_id').notNull().references(() => meetingMinutes.id, { onDelete: 'cascade' }),
  summary: text('summary').notNull(),
  assignee_id: uuid('assignee_id').references(() => userProfiles.id),
  due_date: timestamp('due_date'),
  linked_task_id: uuid('linked_task_id').references(() => tasks.id),
  ...timestamps,
})

export const handoverProtocols = pgTable('handover_protocols', {
  id,
  project_id: uuid('project_id').notNull().references(() => projects.id),
  sections: text('sections'), // JSON
  checklist: text('checklist'), // JSON
  client_signature_url: text('client_signature_url'),
  signed_at: timestamp('signed_at'),
  pdf_url: text('pdf_url'),
  drive_file_id: text('drive_file_id'),
  ...timestamps,
})
```

---

## Domain: Documents & Tickets — `schema/documents.ts`

```ts
import { pgTable, pgEnum, text, uuid } from 'drizzle-orm/pg-core'
import { id, timestamps } from './_helpers'
import { projects } from './projects'
import { userProfiles } from './platform'

export const documents = pgTable('documents', {
  id,
  project_id: uuid('project_id').notNull().references(() => projects.id),
  drive_file_id: text('drive_file_id').notNull(),
  filename: text('filename').notNull(),
  folder_path: text('folder_path'),
  tags: text('tags'), // JSON array
  mime_type: text('mime_type'),
  ...timestamps,
})

export const ticketStatusEnum = pgEnum('ticket_status', [
  'new', 'in_progress', 'awaiting_manager', 'resolved', 'cancelled',
])

export const ticketOpenerTypeEnum = pgEnum('ticket_opener_type', [
  'client', 'manager', 'anonymous',
])

export const tickets = pgTable('tickets', {
  id,
  subject: text('subject').notNull(),
  body: text('body').notNull(),
  opener_type: ticketOpenerTypeEnum('opener_type').notNull(),
  opener_name: text('opener_name'),
  opener_contact: text('opener_contact'),
  status: ticketStatusEnum('status').default('new').notNull(),
  project_id: uuid('project_id').references(() => projects.id),
  assigned_to_id: uuid('assigned_to_id').references(() => userProfiles.id),
  attachments: text('attachments'), // JSON array of storage URLs
  ...timestamps,
})
```

---

## RLS examples (Supabase SQL)

```sql
-- Projects: PM and foreman see only their projects
create policy "project_member_access" on projects
  for select using (
    auth.uid() in (
      select user_id from project_members where project_id = id
    )
    or exists (
      select 1 from user_profiles
      where id = auth.uid()
      and role in ('ceo','vp','cfo','office_manager')
    )
  );

-- Tasks: same scoping via project
create policy "task_project_access" on tasks
  for select using (
    project_id is null -- global tasks
    or project_id in (
      select project_id from project_members where user_id = auth.uid()
    )
    or exists (
      select 1 from user_profiles
      where id = auth.uid()
      and role in ('ceo','vp','cfo','office_manager')
    )
  );
```

---

## Drizzle config: `packages/db/drizzle.config.ts`

```ts
import type { Config } from 'drizzle-kit'

export default {
  schema: './src/schema/index.ts',
  out: './migrations',
  driver: 'pg',
  dbCredentials: {
    connectionString: process.env.DATABASE_URL!,
  },
} satisfies Config
```

---

## `packages/db/src/schema/index.ts`

```ts
export * from './platform'
export * from './crm'
export * from './projects'
export * from './boq'
export * from './milestones'
export * from './quotes'
export * from './procurement'
export * from './finance'
export * from './operations'
export * from './documents'
```
