# Spex — Rebuild Blueprint

Authoritative design doc for Spex, the ground-up rebuild of renobuild.
Paired with `DECISIONS.md` (locked answers), `MIRO_READOUT.md` (requirements source), `SCHEMA.md` (starter Drizzle schema), `SALVAGE.md` (reusable old code), `HANDOFF.md` (new-session kickoff).

---

## 1. Product summary

Internal operations platform for an Israeli renovation / construction contractor. Project-centric. Runs the full lifecycle from lead capture → sales → project execution → milestone-based client billing → supplier procurement & payments → handover.

Integrates with:
- **Chashbashvat** — accounting, source of truth for financial docs.
- **Google Drive** — project documents (read-write).
- **Google Calendar** — CRM events (two-way sync).
- **WhatsApp** — outbound alerts + two-way inbox.
- **Facebook Lead Ads** — lead source webhook.

Scale: ~30 leads/month, 10–30 projects/year (3–4 mo each), 6–15 internal users, ~5–10 active projects concurrently. Internal-first; optional supplier portal in Phase 8; public ticket form in Phase 6.

---

## 2. Design principles

1. **Project is the central container.** BoQ, quotes, POs, payments, tasks, RFIs, meetings, and documents all belong to a project.
2. **BoQ is the spine.** The Bill of Quantities connects planning → procurement → cost control → % complete → payment milestones.
3. **Two-layer finance.** Operational docs live in our app. Legal financial documents live in Chashbashvat. A button in our UI triggers doc creation there; the resulting doc is mirrored back as a link + preview.
4. **Event-driven notifications.** Every meaningful state change emits an event. A single notification layer subscribes. No `NotificationService.send(...)` calls scattered through business logic.
5. **One responsive UI.** No separate mobile pages. Touch-friendly + mobile-responsive throughout.
6. **Role-based, project-scoped permissions.** Enforced at the database level via Supabase RLS, not app-level guards only.
7. **Internal-first.** Public surfaces are narrow and explicit: `/ticket` form, Phase-8 supplier portal.
8. **No vendor lock-in.** Standard React + Postgres stack; any competent dev can maintain.

---

## 3. Entity model

Complete list in §3 of `SCHEMA.md` (Drizzle code). High-level summary below, grouped by domain.

### 3.1 Sales & CRM
- **LeadSource** — website · fb_ads · referral · manual.
- **Lead** — name, phone, email, source, type (`planning`/`execution`), status (13-value enum per Miro), estimated_value, owner (PM), last_contact_at, lost_reason, notes.
- **Interaction** — per-lead activity log: call / wa / email / meeting / note.
- **Event** — CRM calendar item. Attaches to a Lead (for planning/work meetings) or Project (for supervision/handover). Google Calendar `google_event_id`.

### 3.2 Clients & Projects
- **Client** — company, primary contact, address, `chashbashvat_customer_id`.
- **Contact** — additional people at a client.
- **Project** — client, name, type (`execution`/`planning_execution`), PM, status, start/target dates, contract_value, `drive_folder_id`, optional `created_from_lead_id`.
- **ProjectMember** — per-project roles (pm / foreman / viewer).

### 3.3 BoQ (Bill of Quantities)
- **BoQTemplate + BoQTemplateItem** — reusable BoQ libraries (not project-bound).
- **BoQChapter** — project-scoped chapter ("שלד", "גמר", etc.).
- **BoQLineItem** — unit, quantity, unit_price, estimated_total, notes.

### 3.4 Milestones
- **MilestoneTemplate** — global library (the 11 defaults from Miro: New Project → Handover).
- **Milestone** — per-project, with `execution_status` (pending / in_progress / done) + `billing_status` (not_yet_due / ready_to_bill / invoiced / paid) + `billing_pct`.

### 3.5 Quotes — three distinct entities
- **CustomerQuote** — kind: `pre_deal` (attached to Lead, drives deal signing) or `variation` (attached to Project, customer-facing extras). Has `milestone_plan` jsonb.
- **SupplierQuote** — per project, per BoQ line or chapter. Status: draft/submitted/under_review/approved/rejected/revised. Each has a comments thread.
- **SupplierQuoteComment** — discussion on a supplier quote.
- **RFQ** (optional grouper) — a request for quote on a BoQ line, status open/closed/cancelled.
- **Variation** (בלתמים) — project extras. Don't modify contract_value. Billed by rolling into the next milestone invoice.

### 3.6 Procurement & Supplier Finance
- **Supplier** — pending_approval / active / blocked. `chashbashvat_supplier_id`, tax_id, category.
- **PurchaseOrder** + **PoLineItem** — issued PO mirrored from Chashbashvat, linked back to BoQ lines.
- **SupplierInvoice** — received invoice from supplier (file + metadata), references PO, mirrored to Chashbashvat.
- **PaymentRequest** — full Miro status set: `awaiting_payment_request` → `awaiting_pm_approval` → `pm_approved_awaiting_back_office` → `paid` / `rejected`.
- **Expense** — created when PR paid, rolls into project cost control.

### 3.7 Customer Finance
- **CustomerInvoice** — triggered when a milestone flips to `ready_to_bill`. Kind: `tax_invoice` or `deal_invoice`. Bundles approved Variations via `extras_ids` jsonb. Status: awaiting_issuance / issued / paid / overdue / cancelled.
- **CustomerReceipt** — synced back from Chashbashvat when payment is recorded there.

### 3.8 Operations
- **Task** — project-scoped or global; parent/child hierarchy; statuses per Miro (awaiting_execution / in_progress / done / awaiting_manager_approval / cancelled); priority; assignee; due_date; order for Kanban.
- **ChecklistItem** — nested under a Task.
- **TaskDependency** — self-referential.
- **RFI** — opened by PM/Foreman/senior user → recipient (client / consultant / supplier). Status open/responded/closed. Thread-style response.
- **MeetingMinutes** — supervision/handover/planning meetings. Decisions (rich text), attendees, generates PDF.
- **ActionItem** — each line of a MoM → auto-creates a Task.
- **HandoverProtocol** — structured form: sections, checklist, client signature, generates signed PDF.

### 3.9 Documents & Tickets
- **Document** — Drive-backed; `drive_file_id`, filename, folder_path, tags. Documents tab mirrors the Drive tree.
- **Ticket** — public form submission. Opener type client / manager / anonymous. Status: new / in_progress / awaiting_manager / resolved / cancelled.

### 3.10 Platform & Audit
- **UserProfile** — extends `auth.users` with role (ceo / vp / cfo / office_manager / pm / foreman), phone, name, is_active.
- **NotificationPreference** — per-user, per-event-type, per-channel (in_app / email / whatsapp) opt-out.
- **NotificationLog** — immutable send record.
- **AutomationRule** — admin-defined if/then rules.
- **ActivityLog** — audit trail (entity_type, entity_id, action, user, before/after jsonb, occurred_at).

---

## 4. Project Workspace — tabs UX

Entering a project lands on the **Overview** tab. Ten tabs total (mobile: collapse to drawer).

| Tab | What it shows / does |
|---|---|
| **Overview** | Header (client · PM · contract value · drive link · status). Milestone strip with %s + execution state. Budget widget (BoQ total vs committed vs spent). Recent activity. Recent documents. Next 5 tasks. Outstanding payment summary. Open RFIs count. |
| **BoQ** | Chapters → line items editor. Inline totals. Buttons: "Start RFQ on line", "Link to PO". Planned vs committed vs actual per line. Export PDF. |
| **Procurement** | Per BoQ line: all submitted SupplierQuotes side-by-side. Amount, notes, date. Status, comments thread per quote, approve/reject/revise. Approved → "Create PO". |
| **Finance** | Sub-tabs: POs · Supplier Invoices · Payment Requests · Expenses. Each filterable list with drill-downs. Clear "Create PO" / "Upload invoice" / "Submit PR" flows. |
| **Schedule (Gantt)** | Tasks as Gantt. Dependencies visualized. Drag to reschedule. Milestones overlaid. Critical path highlighted. |
| **Tasks** | Kanban + list toggle. Parent/child hierarchy. Checklists. Filters by assignee/status/due. |
| **RFI** | List + detail. Open new RFI (recipient, subject, body, attachments). Thread responses. Link to a task. |
| **Variations** | List of extras. Each row has status + its VariationQuote. "Bundle with next milestone invoice" checkbox. |
| **Client Billing** | Milestones with billing state (Chashbashvat mirror). Per-milestone: "Issue Invoice" button, invoice status, due date, paid date, receipt link. Overdue escalation button. |
| **Meetings** | Meeting list (supervision / handover / planning). New-meeting form: attendees, decisions, action items → each becomes a Task with assignee + due date. Export MoM to PDF. |
| **Documents** | Mirrors project's Drive folder tree. Upload/rename/move/delete in-app (writes to Drive). Tag docs. Inline preview for images/PDFs. |
| **Handover** | Structured handover protocol. Deliverables checklist. Client signature capture. Generates signed PDF → Documents. |

Global (non-project) surfaces:
- **Dashboard** — KPIs: leads this month, active projects, overdue invoices, my tasks, recent tickets.
- **CRM** — leads pipeline + events calendar.
- **Clients** · **Suppliers** · **Users** · **Tickets** · **Reports** · **Settings**.

---

## 5. Key flows (end-to-end)

### 5.1 Lead → Project creation
1. Lead enters (FB webhook / website form / referral / manual).
2. CRM pipeline progresses through Miro stages with automations (auto-WA on new, no-answer sequence, meeting reminders).
3. CustomerQuote issued from the lead (`kind='pre_deal'`) with milestone plan.
4. Stage flips to `won` → triggers:
   - Create Client (+ Chashbashvat customer via API).
   - Create Project (linked to Client, cloned BoQ template + Milestone template).
   - Create Drive folder tree from **Folder Template**: `Plans/ · Consultants/ · Contract/ · Invoices/ · Photos/ · Meetings/ · Handover/`.
   - Create first CustomerInvoice row for `מקדמה` (awaiting issuance).
   - Notify PM (WA + in-app).

### 5.2 BoQ → RFQ → PO
1. PM fills BoQ on the Project.
2. For procurement-needed lines: "Start RFQ". Office Manager / Procurement enters supplier quotes (or suppliers submit via Phase-8 portal).
3. Side-by-side comparison; discussion thread per quote.
4. PM / CFO approves one quote → system creates draft PO pre-filled from quote.
5. "Issue PO" → Chashbashvat API → PO number issued there → mirrored back with PDF link.
6. Supplier notified (WA + email).

### 5.3 Supplier payment flow
1. Supplier submits invoice (emailed PDF or Phase-8 portal).
2. Office Manager creates `SupplierInvoice` (file + metadata, Chashbashvat-mirrored).
3. `PaymentRequest` created (linked to invoice, PO, project).
4. Workflow per Miro:
   - `awaiting_pm_approval` → PM approves → WA to supplier + back office.
   - `pm_approved_awaiting_back_office` → CFO / Office Manager marks paid via Chashbashvat button → WA to supplier + internal.
5. On paid: `Expense` row auto-created; cost control updated.

### 5.4 Client billing
1. PM flips Milestone's `execution_status` → `done`.
2. System flips `billing_status` → `ready_to_bill` + creates a Task for PM: "Issue invoice for milestone X".
3. PM reviews approved Variations (checkboxes) and clicks "Issue Invoice".
4. API → Chashbashvat creates חשבונית מס.
5. Mirrored back; customer notified via WA + email; due in 5 days.
6. Cron: after 5 days → `overdue` → auto WA + email to client. Manual escalation button fires harsher template.
7. On receipt (matched in Chashbashvat) → sync back → milestone `billing_status` → `paid`.

### 5.5 Variations (בלתמים)
1. PM opens Variation on project (title, description, amount).
2. Generates a VariationQuote (CustomerQuote kind=`variation`, customer-facing PDF).
3. Client approval (signed PDF upload or WA confirmation) → Variation `approved`.
4. Next Milestone invoice → PM can bundle approved Variations (checkbox UI) into the invoice total.

### 5.6 RFI
1. PM / Foreman / senior user opens RFI: recipient (client / consultant / supplier), subject, body, attachments.
2. Sent via email + optional WA.
3. Response captured in thread; can be linked to a Task.
4. Visible on RFI tab; count on Project Overview.

### 5.7 Meeting minutes → tasks
1. PM creates Meeting (type, attendees, date).
2. Writes decisions. Adds action items (each: summary, assignee, due date).
3. On save: each action item auto-creates a Task linked back to the meeting.
4. Export MoM as PDF → Documents.

### 5.8 Public ticket
1. Client submits via `/ticket` page (no auth, rate-limited, captcha).
2. Lands in `Tickets` queue (`new`). Office Manager triages; optionally assigns to a project + PM.
3. Status progression: `in_progress` → `awaiting_manager` → `resolved`.

---

## 6. Two-layer finance — Chashbashvat integration

### 6.1 Model
All financial documents exist in two places:
- **Spex (operational layer)**: internal status tracking, workflow, approvals, linked records.
- **Chashbashvat (legal layer)**: the authoritative PDF, sequential doc number, VAT compliance.

### 6.2 Outbound (Spex → Chashbashvat)
A button in Spex triggers an API call. Chashbashvat creates the doc, returns its ID + PDF URL. Spex stores both and displays a preview.

| Spex action | Chashbashvat doc created |
|---|---|
| "Issue PO" on an approved SupplierQuote | Purchase Order |
| "Issue Invoice" on a milestone | חשבונית מס (Tax Invoice) or חשבון עסקה (Deal Invoice) |
| "Register Supplier Invoice" | Records supplier's incoming invoice |
| "Mark Paid" on PaymentRequest | Payment confirmation |

### 6.3 Inbound (Chashbashvat → Spex)
Webhook or polling sync:
- Receipt recorded in Chashbashvat → CustomerReceipt row in Spex → milestone `billing_status` → `paid`.
- PO number assigned → PurchaseOrder.chashbashvat_po_number populated.

### 6.4 Pre-build discovery
Mandatory 1-hour call with Chashbashvat integration team before Phase 3:
- Which objects are API-accessible?
- Do inbound webhooks exist, or must we poll?
- Rate limits and auth mechanism (API key vs OAuth).
- Sandbox environment availability.

### 6.5 Fallback
If Chashbashvat API is not available: UI opens a pre-filled PDF template for manual entry; user uploads the PDF back. Same Spex record is updated; `chashbashvat_*_id` stays null and a flag `manually_processed: true` is set.

---

## 7. Permissions matrix

Six roles. PM sees only their projects. Foreman sees their project's operational tabs only.

| Capability | CEO | VP | CFO | Office Mgr | PM | Foreman |
|---|---|---|---|---|---|---|
| View all projects | ✓ | ✓ | ✓ | ✓ | own only | own only |
| Edit project / BoQ | ✓ | ✓ | — | — | ✓ | — |
| Approve supplier quote | ✓ | ✓ | ✓ | — | ✓ | — |
| Issue PO | ✓ | ✓ | ✓ | ✓ | — | — |
| Submit payment request | ✓ | ✓ | — | ✓ | — | — |
| Approve payment request (PM level) | ✓ | ✓ | — | — | ✓ | — |
| Approve payment request (back office) | ✓ | — | ✓ | ✓ | — | — |
| Issue customer invoice | ✓ | ✓ | ✓ | ✓ | ✓ | — |
| View finance tabs | ✓ | ✓ | ✓ | ✓ | ✓ | — |
| Manage users / roles | ✓ | ✓ | — | ✓ | — | — |
| Manage suppliers | ✓ | ✓ | ✓ | ✓ | — | — |
| View CRM / leads | ✓ | ✓ | — | ✓ | ✓ | — |
| Edit leads | ✓ | ✓ | — | ✓ | ✓ | — |
| Tasks (create/edit) | ✓ | ✓ | — | ✓ | ✓ | ✓ (own) |
| Open RFI | ✓ | ✓ | — | — | ✓ | ✓ |
| Meeting minutes | ✓ | ✓ | — | — | ✓ | — |
| Admin / settings | ✓ | ✓ | — | ✓ | — | — |
| Reports | ✓ | ✓ | ✓ | ✓ | own | — |

RLS enforcement: all DB queries filter by `project_id` vs `project_members` membership for PM/Foreman rows. CEO/VP/CFO/Office Manager bypass the project filter but are still authenticated Supabase users.

---

## 8. Integrations & notification catalog

### 8.1 WhatsApp alert catalog

All WA messages go through Green API (or 360dialog fallback). Templates pre-approved in WhatsApp Business Manager. Hebrew text; English fallback.

| # | Event trigger | Recipient(s) | Template key |
|---|---|---|---|
| 1 | New lead arrives | PM assigned (or default PM) | `new_lead_arrival` |
| 2 | Lead no-answer attempt 1 | PM | `no_answer_1` |
| 3 | Lead no-answer attempt 2 | PM | `no_answer_2` |
| 4 | Lead no-answer attempt 3 | PM | `no_answer_3` |
| 5 | Planning meeting scheduled | Client | `meeting_confirm` |
| 6 | Meeting reminder (eve) | Client | `meeting_reminder_eve` |
| 7 | Meeting reminder (AM of) | Client | `meeting_reminder_morning` |
| 8 | Deal won → project created | PM | `project_created` |
| 9 | PO issued | Supplier | `po_issued` |
| 10 | Payment request received | Supplier | `pr_received` |
| 11 | Payment request PM-approved | Supplier + back office | `pr_pm_approved` |
| 12 | Payment confirmed (paid) | Supplier | `payment_confirmed` |
| 13 | Milestone invoice issued | Client | `invoice_issued` |
| 14 | Invoice overdue (day 6) | Client | `invoice_overdue` |
| 15 | Invoice overdue escalation | Client | `invoice_overdue_escalation` |
| 16 | Variation approved | PM | `variation_approved` |
| 17 | RFI sent to recipient | Recipient (client/consultant/supplier) | `rfi_sent` |
| 18 | New ticket submitted | Office Manager | `ticket_new` |

### 8.2 Email alerts
Mirror of WA alerts where recipient has email preference. Same event, different channel. NotificationPreference table controls opt-out per user per event per channel.

### 8.3 Google Drive
- On project creation: create folder `Projects/{Project Name}/` with sub-folders: `Plans/ · Consultants/ · Contract/ · Invoices/ · Photos/ · Meetings/ · Handover/`.
- On document upload in Documents tab: upload to correct Drive sub-folder.
- On rename/move/delete in app: mirror to Drive.
- Documents tab: list Drive folder tree via API; inline preview for images + PDFs.
- Store `drive_folder_id` on Project and `drive_file_id` on Document.

### 8.4 Google Calendar
- Two-way sync for CRM Events.
- On Event created in Spex → create Google Calendar event; store `google_event_id`.
- On Google Calendar event updated (webhook) → update Spex Event.
- Cancellations synced both directions.

### 8.5 Facebook Lead Ads
- Webhook registered on FB page → receives new lead form submissions.
- Payload mapped to Lead row (name, phone, email, source=`fb_ads`, type derived from form field).
- Dedup by phone (within 30 days).

---

## 9. Tech stack

### 9.1 Locked choices

| Layer | Choice | Rationale |
|---|---|---|
| Frontend | React 18 + Vite + TypeScript | Industry standard; large hiring pool; Vite is fast |
| UI components | Radix UI + Tailwind CSS + shadcn/ui | Accessible; headless; RTL-compatible; composable |
| i18n | i18next | RTL + plurals + namespaces; Hebrew primary |
| Data fetching | TanStack Query v5 | Server state, caching, optimistic updates |
| Client state | Zustand | Minimal; predictable; no boilerplate |
| Forms | React Hook Form + Zod | Best-in-class validation; TS-first |
| Database | PostgreSQL via Supabase (eu-west-1) | Managed Postgres + Auth + RLS + Storage + Realtime |
| ORM | Drizzle ORM | Type-safe; schema-as-code; fast migrations; no magic |
| Auth | Supabase Auth | JWT; MFA-ready; integrates with RLS natively |
| Backend API | Fastify (Node.js) on Railway | Thin; fast; TypeScript-native; easy Railway deploy |
| Job queue | BullMQ on Upstash Redis | Reliable; retries; delayed jobs; WA/email/cron |
| File storage | Google Drive (project docs) + Supabase Storage (attachments) | Drive for project docs mirrors business workflow |
| PDF generation | @react-pdf/renderer (server-side) | Hebrew RTL support; programmatic; no puppeteer |
| Monorepo | pnpm + Turborepo | Fast installs; workspace caching; clean dep graph |
| Testing | Vitest (unit) + Playwright (E2E) | Fast unit tests; reliable E2E for golden paths |
| Observability | Sentry + Betterstack | Error tracking + log aggregation + uptime |
| CI/CD | GitHub Actions | Free for private repos at this scale |
| Hosting | Vercel (web) + Railway (API + workers) + Supabase | Each service in its sweet spot |

### 9.2 Monorepo structure

```
spex/
├── apps/
│   └── web/              # React + Vite frontend
├── api/                  # Fastify backend + BullMQ workers
├── packages/
│   ├── db/               # Drizzle schema, migrations, client
│   ├── shared/           # Zod schemas, enums, types shared by web+api
│   └── ui/               # shadcn/ui component library (RTL-configured)
├── pnpm-workspace.yaml
└── turbo.json
```

### 9.3 Key architectural patterns

- **Event-driven notifications**: Business logic emits domain events (e.g., `milestone.status_changed`). A single `NotificationWorker` (BullMQ) subscribes and fans out to WA/email/in-app. Zero `NotificationService.send()` calls in business logic.
- **Supabase RLS as first defense**: DB-level row filtering. App-level role checks are secondary (defense in depth, not the only gate).
- **Chashbashvat sync via worker**: API calls to Chashbashvat happen in background jobs (BullMQ), not synchronously in request handlers. Failures retry with exponential backoff.
- **Optimistic UI**: TanStack Query mutation + rollback for common interactions (task status, milestone flip).
- **RTL-first**: All Tailwind utilities default to `dir="rtl"`. LTR overrides are explicit.

---

## 10. Phased build plan

All phases build on the previous. Each phase ships usable functionality.

| Phase | Scope | Est. duration |
|---|---|---|
| **0 — Foundation** | pnpm monorepo scaffold; Supabase project; Drizzle schema + first migration; auth (login, session, role claim in JWT); UserProfile CRUD; role-based routing shell; CI pipeline | 2 weeks |
| **1 — CRM + Leads** | Lead entity + pipeline; Interaction log; LeadSource; CRM page with pipeline view; Event entity + calendar view; Google Calendar sync; Facebook Lead Ads webhook; WA automations for lead pipeline (templates 1–7); Lead → CustomerQuote (pre-deal) | 3 weeks |
| **2 — Projects + BoQ + Tasks** | Client entity; Project creation from won lead; BoQ (chapters + line items) editor; MilestoneTemplate → per-project Milestones; ProjectMember roles; Task (kanban + list, parent/child, checklists, dependencies); Documents tab (Drive integration); Project Overview tab; Schedule (Gantt) MVP | 4 weeks |
| **3 — Procurement + Supplier Finance** | Supplier entity; SupplierQuote (submit, compare, comment, approve); RFQ grouper; PO creation → Chashbashvat API; SupplierInvoice upload; PaymentRequest workflow; Expense auto-creation; Finance tab sub-tabs; WA automations (templates 9–12) | 4 weeks |
| **4 — Client Billing** | CustomerInvoice triggered by milestone flip; Variations (בלתמים) entity + VariationQuote; bundle Variations into invoice; Chashbashvat invoice API; CustomerReceipt sync; overdue cron + WA/email (templates 13–16); Client Billing tab; milestone billing_status machine | 2 weeks |
| **5 — Ops polish** | RFI (open, thread, link to task); MeetingMinutes (create, action items → tasks, export PDF); HandoverProtocol (checklist, client signature, PDF); Variations tab; Meetings tab; Handover tab; in-app notification center | 3 weeks |
| **6 — Tickets + Admin + Reports** | Public `/ticket` page (captcha, rate limit); Tickets queue + triage; Admin: AutomationRule UI, NotificationPreference; basic Reports (CEO/VP/CFO weekly views); ActivityLog viewer | 1.5 weeks |
| **7 — Hardening** | Playwright E2E for golden paths (lead→project, milestone billing, supplier PO); Vitest unit tests for business logic; Sentry + Betterstack wiring; load test; security audit (OWASP top 10, Supabase RLS audit); performance (Core Web Vitals); accessibility | 1.5 weeks |
| **8 — Supplier portal** *(optional, deferrable)* | Authenticated supplier sub-app; submit payment requests; view PO status; upload invoices | 2 weeks |

**Total v1 (Phases 0–7): ~21 weeks** with one strong full-stack developer.

### 10.1 Phase 0 checklist (first sprint)
1. `pnpm create turbo@latest spex` scaffold.
2. Create Supabase project (eu-west-1 Frankfurt). Enable `uuid-ossp`, `pgcrypto`.
3. `packages/db`: Drizzle config + initial migration with `user_profiles`, `leads`, `projects` stubs.
4. Supabase Auth: email+password; add `role` custom claim in JWT via DB trigger.
5. `apps/web`: Vite + React 18 + TS; Tailwind RTL; shadcn/ui; i18next Hebrew.
6. Login page → redirect by role to correct landing view.
7. GitHub Actions: lint + typecheck + Vitest on PR.
8. Vercel + Railway project creation; env secrets.

---

## 11. Open questions (before / during build)

| # | Question | Who resolves | By when |
|---|---|---|---|
| 1 | Supabase region — is existing project eu-west-1 Frankfurt? If not, new project. | Dev + Vision | Phase 0 |
| 2 | Domain: `renobuild.co.il` → `spex.*`? Subdomain convention `app.` / `ticket.`? | Vision | Phase 0 |
| 3 | Data residency — any Israel-only legal requirement that blocks Frankfurt hosting? | Legal / Vision | Phase 0 |
| 4 | Chashbashvat API: which objects? Webhooks in or polling? Rate limits? Auth? Sandbox? | Dev + Chashbashvat team | Phase 3 kickoff |
| 5 | Milestone template: authoritative list of 11 milestone names + default billing %? | Vision | Phase 2 |
| 6 | Drive folder template: exact subfolder names per new project? | Vision | Phase 2 |
| 7 | Customer quote PDF: layout, logo, Hebrew legal disclaimers? | Vision / Design | Phase 1 |
| 8 | Handover protocol template: sections, checklist, signature style? | Vision | Phase 5 |
| 9 | Reports v1 scope: which reports do CEO / VP / CFO actually read weekly? | Vision | Phase 6 |
| 10 | WhatsApp provider: Green API or 360dialog? Account already set up? | Vision + Dev | Phase 1 |

---

## 12. Recommended next steps

1. **Clone this blueprint** into the `office530/spex` repo root alongside DECISIONS.md, MIRO_READOUT.md, SCHEMA.md, SALVAGE.md, HANDOFF.md.
2. **Start a local Claude Code CLI session** in the `spex` repo. Paste the contents of `HANDOFF.md` as the first message. The agent will have full context.
3. **Resolve open questions** in §11 before the Phase 0 kickoff sprint — especially Supabase region (#1) and domain (#2), which block deployment setup.
4. **Schedule Chashbashvat API discovery call** (1 hour) before Phase 3 starts — this is the riskiest external dependency.
5. **Procure WhatsApp Business API** access (Green API or 360dialog) — approval can take 1–2 weeks; start early.
6. **Prioritize Phase 0** strictly: no feature work until auth, DB, and CI are solid. This foundation determines velocity for all subsequent phases.
7. **Weekly checkpoint**: after each phase, review open questions list and update DECISIONS.md with any new locked answers before the next phase begins.
