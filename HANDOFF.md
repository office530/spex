# Spex — New Session Kickoff

One-page handoff for a fresh Claude Code CLI session in the `office530/spex` repo.

---

## ⚡ Resume in Antigravity (added 2026-04-25)

The previous Claude Code session ran on a different host. To continue here:

1. You are on branch `claude/start-spex-rebuild-ZiKng`. There are **5 unmerged commits ahead of `main`** (Phases 62–65 + the `ui-ux-pro-max` skill install). A draft PR has been opened — merge it (or keep building on top) before opening anything new.
2. Read these files in order: **`CLAUDE.md` → this file → `BLUEPRINT.md` §10 → `DESIGN.md` → `PATTERNS.md`**.
3. The most recent **in-flight work** (not yet shipped) was a system-wide **UX/UI redesign analysis** Shay requested. Three Explore-agent audits (page-level, primitive-level, IA/flow-level) were completed but the synthesizing **`UX_REDESIGN_PLAN.md`** was never written. Top findings:
   - **Visual layer**: Dashboard sparse/generic, list pages flat & monotone, several `@spex/ui` primitives (ProgressRing, AnimatedNumber, HoverCard, Combobox) underadopted.
   - **IA layer**: No global financial-risk view (CEO), no global task queue (PM/Foreman), Financials tab overloaded with 5 stacked panels, foreman sees Finance/General tabs they can't actually access. "View All Tasks" on Dashboard links to `/projects` (wrong — should go to a `/my-tasks` page that doesn't exist yet).
   - **Missing primitives**: breadcrumbs, side drawer, stepper, date-range picker, inline edit, segmented control, notification stack, activity timeline, comment thread, tag input, file dropzone, page header.
   - **Missing data layer**: Work Log (Miro Board 9) was never implemented — no schema for it.
4. Shay's stated goal: redesign so the system "feels intuitive" and not "too simple". After writing `UX_REDESIGN_PLAN.md`, implement in phases — Dashboard first, then ProjectEditPage tab restructure, then list-page polish, then missing primitives, then IA fixes (role-based tab hiding, global queues, Work Log).
5. **`.claude/skills/ui-ux-pro-max/`** is installed — useful for the redesign work. Invoke via the Skill tool.

**Next concrete action a fresh session should take**: write `UX_REDESIGN_PLAN.md` synthesizing the three audits above, propose Phase 66+ in BLUEPRINT.md numbering, then ask Shay which page to redesign first.

---

**📍 Current state (§ Progress log below for the detailed phase-by-phase):**
Phase 0–5 complete, Phase 6 complete, Phase 7 (hardening) partially complete via Phases 45–47 (Vitest + a11y polish) and Phase 60 (security audit). Phase 3/4 Chashbashvat-runtime and all WA/email/Drive/Calendar integrations remain blocked on external setup. Design language (DESIGN.md) + sidebar layout + dark-teal palette shipped. **65 feature/polish phases merged through 2026-04-25** (Phases 62–65 sitting on the branch in a draft PR).

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
| 46 | BoQ aggregation helpers (`computeLineTotal` / `computeChapterTotal` / `computeProjectTotal`) + 10 tests | ✅ |
| 47 | A11y polish: skip-to-content link, mobile sign-out aria-label, `<main>` landmark id | ✅ |
| 48 | Route-level code splitting via `React.lazy` | ✅ |
| 49 | TanStack Query + Sonner toast foundation | ✅ |
| 50 | Donut charts on Reports page (Recharts) | ✅ |
| 51 | `Dialog` + `DatePicker` primitives in `@spex/ui` | ✅ |
| 52 | TanStack Table on `LeadsPage` (sortable + filterable) | ✅ |
| 53 | `cmdk` Cmd+K command palette | ✅ |
| 54 | DatePicker adoption in `CustomerInvoicesPanel` | ✅ |
| 55 | Polish primitives — `KpiTile` icon-chip + `ProgressRing` + `AnimatedNumber` + `HoverCard` + `Combobox` + `DropdownMenu` + `Skeleton` | ✅ |
| 56 | Visual flair — `bg-mesh-hero` + `gradient-border-animated` + `glow-halo` utilities | ✅ |
| 57 | Project page polish — underline tabs + `ProgressRing` on milestone bar | ✅ |
| 58 | Projects + Tickets pages on TanStack Table | ✅ |
| 59a | Suppliers + Clients + Users pages on TanStack Table | ✅ |
| 59b | Sonner toasts on every edit page | ✅ |
| 59c | `DatePicker` on every remaining date input system-wide | ✅ |
| 60 | Security audit + `SECURITY.md` (XSS / CSP / RLS / dependency review) | ✅ |
| 62 | Drag-and-drop kanban on Tasks via `@dnd-kit/core` | 🟡 on branch (draft PR pending) |
| 63 | Gantt schedule tab via `gantt-task-react` | 🟡 on branch (draft PR pending) |
| 64 | PDF export for `HandoverProtocol` + `MeetingMinutes` via `@react-pdf/renderer` | 🟡 on branch (draft PR pending) |
| 65 | hCaptcha widget on public ticket form (env-gated via `VITE_HCAPTCHA_SITEKEY`) | ✅ shipped in PR #63 |
| — | Install `.claude/skills/ui-ux-pro-max/` skill (design intelligence: 67 styles, 96 palettes, 57 font pairings) | ✅ shipped in PR #63 |
| 66 | UX redesign foundations — A v1 token swap (slate + safety orange) + 6 new primitives (PageHeader, MoneyInput, FieldGroup, SideDrawer, DateRangePicker, Breadcrumb) + 4 extended (StatusBadge audit_action/automation_rule/flag, Tabs count-badge, Card variants, Button loading) + 4 hand-rolled status pills retired + Skeleton sweep (ActivityLog/AutomationRules/Reports) + Dashboard scaffoldNotice removed | ✅ shipped in PR #63 |
| 67 | Dashboard role variants (BackOffice / PM / Foreman) via `useRoleGroup()` + `/my-tasks` cross-project queue + Login mesh re-tinted from teal → orange/slate | ✅ shipped in PR #64 |

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
- `0013_chashbashvat_jobs_policy_tighten.sql` — narrowed RLS on `chashbashvat_sync_jobs` (applied to remote 2026-04-25)

Active phases roadmap (UX redesign post-PR #63):

| # | What | Status |
|---|---|---|
| 66 | Design system foundations + A v1 token swap | ✅ PR #63 |
| 67 | Dashboard role variants (BackOffice/PM/Foreman) + /my-tasks + Login mesh | ✅ PR #64 |
| 68 | /financials global view (back-office) | ✅ PR #65 |
| 69 | ProjectEditPage IA refactor — PM edit bug fix + Financials sub-tabbed + foreman tab visibility | ✅ PR #66 |
| 70 | SegmentedControl primitive + bare-empty-state sweep on Leads/Projects | ✅ PR #67 |
| 71 | ActivityTimeline + CommentThread primitives + ActivityLog retrofit | ✅ PR #68 |
| 72 | Work Log entity (migration 0014 + WorkLogPanel + StatusBadge work_log family) | ✅ PR #69 |
| 73 | BoQ polish — PageHeader + 3-tile KPI banner + Skeleton/EmptyState | ✅ PR #70 |
| 74 | Settings consolidation under /settings hub + breadcrumbs on sub-pages | ✅ PR #71 |
| 75 | Foreman scope (no /leads in nav) + mobile nav touch targets + bell on mobile | ✅ PR #72 |
| 76 | Motion + visual depth — Skeleton shimmer + page-fade-in + DESIGN.md §10 codified | ✅ PR #73 |
| 66.5 | A v1 → A v2 token swap (orange #f97316 → sky blue #0284c7) — whole-app palette change. Mesh hero blobs + gradient-border-animated re-tinted. UX_MOODBOARD A v2 amendment. | ✅ PR #75 |
| 77 | Workspace shell `/projects/:id/workspace` (3-column: chapter navigator + line-item detail with 4 sub-tabs + collapsible doc rail). QC entity full: migration 0015 (`boq_line_item_checks` + `boq_qc_comments` + 5-status enum + RLS), CRUD, comment thread, status update via SegmentedControl. ProjectEditPage gets a "פתח סביבת ביצוע" CTA. ProcurementTab reads supplier_quotes for line; OverviewTab shows notes + activity timeline; TasksTab placeholder until Phase 80. | ✅ PR #76 |
| 78 | Inline BoQ editing inside the workspace: pencil/trash icons reveal on hover for chapters + lines; "+ הוסף שורה" inline form per chapter; "+" in navigator header opens new-chapter form; full create/rename/delete via supabase mutations from `ProjectWorkspacePage` (canCrud-gated). No schema change. | ✅ PR #77 |
| 79 | Global Ctrl+K search palette extended to workspace entities: BoQ chapters, line items, QC checks, tasks, documents — each result deep-links to `/projects/:id/workspace?chapter=&line=&tab=`. Three result groups (Entities / Workspace / Tasks & docs). 8 new i18n keys. | ✅ PR #78 |
| 80 | Tasks-by-line linking: migration 0016 adds nullable `boq_line_item_id` FK on `tasks`. Workspace `TasksTab` replaces the placeholder — full CRUD scoped to active line, status quick-update via SegmentedControl (canCrud or own-task), tab count badge from open-task aggregate. ~11 new i18n keys under `workspace.tasks.*`. | ✅ PR #80 |

Migrations applied to remote since 0013:
- `0014_work_logs_entity.sql` — work_log_status enum + work_logs table + 4 RLS policies (Phase 72)
- `0015_boq_line_item_checks.sql` — qc_check_status enum + boq_line_item_checks + boq_qc_comments + 8 RLS policies (Phase 77, applied to remote 2026-05-01)
- `0016_tasks_boq_line_link.sql` — nullable `boq_line_item_id` FK on tasks + partial index (Phase 80, applied to remote 2026-05-02)

Shipped in this long session: PRs #6 through #43 on `main` via `claude/start-spex-rebuild-ZiKng` branch.

---

## What NOT to do

- Do not start AI features — out of scope for v1 (DECISIONS.md #11).
- Do not build a client portal — internal-first; supplier portal is Phase 8 (optional).
- Do not modify contract_value for variations — they roll into milestone invoices separately.
- Do not use any Base44 patterns, APIs, or concepts — we are rebuilding from scratch.
- Do not debate the tech stack — it is locked in DECISIONS.md.
