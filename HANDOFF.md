# Spex — New Session Kickoff

One-page handoff for a fresh Claude Code CLI session in the `office530/spex` repo.

**📍 Current state (§ Progress log below for the detailed phase-by-phase):**
Phase 0–5 complete, Phase 6 mostly complete, Phase 3/4 Chashbashvat-runtime and all WA/email/Drive/Calendar integrations are blocked waiting on external setup. Design language (DESIGN.md) and sidebar layout + teal palette shipped; 34 feature / polish phases merged as of 2026-04-24.

What's live: auth + roles, dashboard with KPIs + recent projects + my tasks, leads (interactions, events, pre-deal quotes, convert-to-project), clients, suppliers, users, projects with 6 tabs (General / Team / Milestones / Financials / Operations / Documents), BoQ with chapters + line items + supplier quotes + RFQ grouper + comments + cheapest highlight, milestones auto-seed, customer invoices + receipts (with milestone auto-trigger), supplier invoices + payment requests + POs, Chashbashvat sync queue infrastructure, variations, tasks with parent/child + checklists + dependencies, RFI, meetings + action items, handover protocol, documents via Supabase Storage, tickets (public + internal), reports, settings/milestones.

What's left (non-external): Task kanban (drag-drop lib), Schedule/Gantt (lib), PDF export (lib), in-app notifications (new schema), activity log (new schema), automation rules (new schema), consultants entity (new schema), E2E + unit tests.

External-blocked: Chashbashvat API runtime (infra exists, worker pending), Google Drive mirror, Google Calendar sync, WhatsApp (Green API), email, Facebook Lead Ads webhook.

For the first prompt in a brand-new session, see **§ First message**.

---

## Context for you (the human reading this)

You are about to start a new Claude Code CLI session inside the `spex` repo.
The six files in the repo root are the complete context for the project:

| File | What it contains |
|---|---|
| `BLUEPRINT.md` | Full design doc — entities, UX, flows, permissions, integrations, tech stack, build plan |
| `DECISIONS.md` | Locked business + architectural decisions |
| `MIRO_READOUT.md` | Original Miro board requirements source |
| `SCHEMA.md` | Starter Drizzle ORM schema for all domains |
| `SALVAGE.md` | Reusable code from the old Base44 system |
| `HANDOFF.md` | This file |

Read them in that order. BLUEPRINT.md is authoritative. DECISIONS.md resolves conflicts.

---

## First message (paste this verbatim)

```
You are starting work on "Spex", a ground-up rebuild of an Israeli renovation / construction CRM+ERP.
The repo is `office530/spex`. All design context is in the files in this repo root:

- BLUEPRINT.md — authoritative design: entities, UX tabs, end-to-end flows, permissions matrix, integrations, tech stack, 8-phase build plan
- DECISIONS.md — locked architectural + business decisions
- MIRO_READOUT.md — original Miro board requirements
- SCHEMA.md — starter Drizzle ORM schema (PostgreSQL via Supabase)
- SALVAGE.md — reusable code patterns from the old system

Please read all five files now, then confirm you understand the project and ask me which phase to start with.

Tech stack summary (locked — do not debate):
- React 18 + Vite + TypeScript (frontend, apps/web)
- Fastify + Node.js (backend API, api/)
- Drizzle ORM + PostgreSQL via Supabase (packages/db)
- TanStack Query + Zustand + React Hook Form + Zod
- Radix UI + Tailwind CSS + shadcn/ui (RTL Hebrew-first)
- BullMQ on Upstash Redis (job queue)
- pnpm + Turborepo (monorepo)
- Vercel (web) + Railway (api) + Supabase (db/auth/storage)

Monorepo structure:
spex/
├── apps/web/          ← React + Vite frontend
├── api/               ← Fastify backend + BullMQ workers
├── packages/
│   ├── db/            ← Drizzle schema, migrations, db client
│   ├── shared/        ← Zod schemas, enums, types (web + api)
│   └── ui/            ← shadcn/ui RTL component library
├── pnpm-workspace.yaml
└── turbo.json

We are starting at Phase 0 (foundation):
1. pnpm monorepo scaffold with Turborepo
2. Supabase project configured (eu-west-1 Frankfurt)
3. Drizzle schema + first migration (from SCHEMA.md)
4. Supabase Auth: email+password; role claim in JWT
5. UserProfile CRUD
6. Role-based routing shell (login → role-appropriate landing)
7. GitHub Actions CI: lint + typecheck + Vitest on PR

Start by setting up the pnpm + Turborepo monorepo scaffold. Create the directory structure, root package.json, pnpm-workspace.yaml, and turbo.json. Use Node 20. TypeScript 5. pnpm 9.
```

---

## Key business context (brief)

- **Client**: Israeli renovation contractor. 6–15 internal users. 10–30 projects/year, 5–10 concurrent.
- **Core model**: Project is the container. BoQ (Bill of Quantities) is the spine. Everything hangs off projects.
- **Finance**: Two-layer model — operational docs in Spex; legal docs (tax invoices, POs, receipts) issued via Chashbashvat API and mirrored back.
- **Client billing**: Milestone-based (% of contract value). 11 default milestones per Miro. Flipping a milestone to `done` triggers an invoice workflow.
- **Supplier procurement**: BoQ → RFQ → compare SupplierQuotes side-by-side → approve → PO → Chashbashvat.
- **Notifications**: All WA/email alerts are event-driven via BullMQ workers. No `NotificationService.send()` in business logic.
- **Permissions**: RLS-enforced. PM sees only their projects. Foreman sees operational tabs only. CEO/VP/CFO/Office Manager see everything.
- **Hebrew RTL**: The **only** user-facing language. All UI copy ships in Hebrew. `dir="rtl"` on `<html>` always. Every string goes through i18next (`he.json`); English (`en.json`) is a developer fallback only — it must never surface to end users. Do not add a language switcher; do not render English strings in the UI; do not hard-code English text in components.

## Open questions to resolve before/during build

See BLUEPRINT.md §11 for the full list. Critical blockers for Phase 0:
1. Supabase region — confirm eu-west-1 Frankfurt or create new project.
2. Domain — `renobuild.co.il` or new `spex.*` domain?
3. Data residency — any Israel-only legal constraint on Frankfurt hosting?

Critical blocker for Phase 3 (Procurement):
4. Chashbashvat API discovery — schedule 1-hour call with their integration team.

---

## Progress log

Chronological phase log so a future agent can pick up where we left off.

| # | Branch | What | Status |
|---|---|---|---|
| 0 | — | Foundation: monorepo, Supabase, Drizzle, auth, roles, routing shell, CI, Vercel | ✅ |
| 1 | — | Leads + interactions + events + pre-deal CustomerQuote + convert-to-project | ✅ (calendar, Google Calendar, FB Lead Ads, WA — blocked) |
| 2 | — | Clients + Projects + BoQ + Milestones (auto-seed from templates) + ProjectMember + Documents tab (Supabase Storage instead of Drive) + Project Overview KPIs | ✅ (Gantt + Kanban — deferred) |
| 3 | — | Suppliers + SupplierQuote + comments (§3 compare is partial — sort + cheapest chip) + RFQ grouper + SupplierInvoices + PaymentRequests + POs + Chashbashvat sync queue infra | ✅ (PO→Chashbashvat runtime, WA — blocked) |
| 4 | — | CustomerInvoices + CustomerReceipts + Variations + milestone ready_to_bill → auto-invoice trigger | ✅ (Chashbashvat sync runtime, overdue cron — blocked) |
| 5 | — | RFI + MeetingMinutes + action items + HandoverProtocol (checklist + signed_at) + in-app notifications bell (Phase 38) | ✅ (PDF export + client-signature upload — deferred) |
| 6 | — | Public /ticket + internal tickets queue + Reports + Settings/milestones + **ActivityLog viewer (Phase 37)** + **AutomationRule UI + 7 seeded WA rules (Phase 40)** + **Calendar grid (Phase 39)** | ✅ (captcha on /ticket — deferred; NotificationPreference UI — deferred) |
| 7 | — | Hardening: E2E, unit tests, Sentry, a11y | ❌ |
| 8 | — | Supplier portal | Deferred per blueprint |

Post-Phase-6 polish sweep (Miro catch-up):

| # | What | Status |
|---|---|---|
| 35 | Overdue tasks flagged red (Miro §7) | ✅ |
| 36 | Default customer-invoice due date = issued_at + 5 days (Miro §5) | ✅ |
| 37 | ActivityLog viewer + generic audit trigger | ✅ |
| 38 | In-app notifications bell + 30s poll | ✅ |
| 39 | Calendar month grid (RTL, Hebrew weekday labels) | ✅ |
| 40 | AutomationRule UI + 7 seeded inactive WA rules | ✅ |
| 41 | NotificationPreferences grid (in_app / email / whatsapp) | ✅ |
| 42 | Tasks kanban view toggle (status columns, no DnD yet) | ✅ |
| 43 | Consultants entity (list + edit, back-office CRUD) | ✅ |
| 44 | Public ticket image attachments + soft anon rate-limit | ✅ (captcha + IP rate-limit — pending hCaptcha account + edge function) |
| 45 | Vitest scaffolding + first 23 business-logic tests | ✅ (Phase 7 hardening — Playwright E2E / Sentry / a11y still pending) |

Design:
- DESIGN.md written (17-section spec: brand, tokens, typography, layout, tabs, components, motion, RTL, a11y)
- Sidebar layout + dark-teal palette + gradient hero on entity pages
- Shared primitives in `@spex/ui`: StatusBadge, EmptyState, KpiTile, KpiDelta, Avatar, AvatarStack, Tabs, Table, formatCurrencyILS
- System-wide rollout of StatusBadge across 14 status enum families
- EmptyState in every inline panel
- Login page with 2-panel hero layout
- Project tabs with count badges
- Avatar stacks on project hero + members panel

Migrations (in `supabase/migrations/`):
- `0001_auth_rls.sql` — Phase 0 auth + roles + RLS base
- `0002_seed_milestone_templates.sql` — 11 default milestones (Hebrew) + project-INSERT auto-seed trigger
- `0003_public_ticket_submission.sql` — anon role INSERT policy on tickets
- `0004_project_documents_storage.sql` — storage bucket + policies + documents columns (size_bytes, uploaded_by_id)
- `0005_chashbashvat_sync_infrastructure.sql` — sync queue table + triggers
- `0006_auto_invoice_on_milestone_ready.sql` — milestone ready_to_bill → customer_invoice trigger
- `0007_activity_log_triggers.sql` — generic audit trigger wired to projects / leads / customer_invoices / tasks
- `0008_in_app_notifications.sql` — notifications table + task/ticket assignment triggers
- `0009_automation_rules_rls_and_seed.sql` — RLS + 7 seeded inactive WA rules from BLUEPRINT §8.1
- `0010_notification_preferences_rls.sql` — RLS + UNIQUE(user_id, event_type, channel)
- `0011_consultants_entity.sql` — consultants table + RLS (back-office write)
- `0012_ticket_attachments_storage.sql` — `ticket-uploads` storage bucket + anon-insert policy + soft anon rate-limit trigger on tickets

Shipped in this long session: PRs #6 through #43 on `main` via `claude/start-spex-rebuild-ZiKng` branch.

---

## What NOT to do

- Do not start AI features — out of scope for v1 (DECISIONS.md #11).
- Do not build a client portal — internal-first; supplier portal is Phase 8 (optional).
- Do not modify contract_value for variations — they roll into milestone invoices separately.
- Do not use any Base44 patterns, APIs, or concepts — we are rebuilding from scratch.
- Do not debate the tech stack — it is locked in DECISIONS.md.
