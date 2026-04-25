# Spex — UX/UI Redesign Plan

**Status**: Proposal awaiting Shay's sign-off
**Author**: Claude Code session, 2026-04-25
**Scope**: System-wide visual + structural redesign of `apps/web` to fix the "feels too simple / not intuitive" gap
**Companion docs**: `DESIGN.md` (current authority), `PATTERNS.md` (recipes), `BLUEPRINT.md` §4–§7 (IA + roles), `MIRO_READOUT.md` (requirements source)

---

## 1. Goal & non-goals

### Goal
Take Spex from "scaffolded internal tool" to "operational platform a contractor wants to open every morning." The shipped surface today is functionally complete for Phases 0–6 but is visually flat, IA-incomplete, and role-blind. After this redesign:

- Each role sees a Dashboard that maps to *their* job (CEO sees money, PM sees project pipeline, Foreman sees today's work).
- The data the user is most likely to act on is *one click away*, not buried in a project's Financials tab.
- The design system has the primitives every CRM needs (PageHeader, Drawer, DateRange, Stepper, Timeline) so future features land consistently in 1 day, not 1 week.
- Every page passes the [DESIGN.md §17 review checklist](DESIGN.md#17-review-checklist-mirrored-from-patternsmd).

### Non-goals (this plan does NOT)
- Re-open the [DECISIONS.md](DECISIONS.md) tech stack.
- Build any external integration (Chashbashvat / Drive / Calendar / WA / email / FB) — all blocked.
- Rewrite the schema. Schema additions are limited to the missing **Work Log** entity (BLUEPRINT.md §5 / MIRO Board 9).
- Touch the API surface unless a new view requires a new query.
- Change the core stack (React 18 / Tailwind / shadcn / TanStack Query / Zustand) — the redesign rides on top.

---

## 2. Method

Three parallel ground-truth audits + four anchor-page reads, all on branch `claude/start-spex-rebuild-ZiKng` HEAD (5 commits ahead of `main` on PR #63):

| Audit | Scope | Output |
|---|---|---|
| Page-level | Every route + project panel | Density score 1–5 + issue list per page |
| Primitive coverage | `packages/ui` adoption sweep across `apps/web` | Adoption matrix + missing-primitive register |
| IA / flow | Sidebar nav, project tabs, role gates, cross-page drill-paths | Validation of prior findings + 5 new IA bugs |

**Anchor pages read firsthand**: [Dashboard.tsx (330 lines)](apps/web/src/pages/Dashboard.tsx), [ProjectEditPage.tsx (1503 lines)](apps/web/src/pages/ProjectEditPage.tsx), [LeadsPage.tsx (355 lines)](apps/web/src/pages/LeadsPage.tsx), [AppShell.tsx](apps/web/src/components/AppShell.tsx).

---

## 3. Diagnosis

The user's two complaints — "too simple" and "not intuitive" — are *both* true, but for different reasons. "Too simple" is a **visual layer** problem. "Not intuitive" is an **information architecture** problem. They need separate fixes.

### 3.1 Visual layer — why it feels "too simple"

| # | Finding | Evidence | Severity |
|---|---|---|---|
| V1 | **Dashboard ends with a placeholder card.** A `welcome` + `scaffoldNotice` card sits at the bottom of the page taking up real estate, signalling to the user "this isn't finished yet." | [Dashboard.tsx:322-327](apps/web/src/pages/Dashboard.tsx#L322-L327) | **P0** |
| V2 | **Dashboard has no financial signal.** The 4 KPI tiles are all volume metrics (active projects, leads, my tasks, open RFIs). No money, no overdue, no risk. A CEO or CFO opening this app sees nothing actionable. | [Dashboard.tsx:154-189](apps/web/src/pages/Dashboard.tsx#L154-L189) | **P0** |
| V3 | **List pages are read-only walls of text.** [LeadsPage.tsx:309-311](apps/web/src/pages/LeadsPage.tsx#L309) and [ProjectsPage.tsx:282-284](apps/web/src/pages/ProjectsPage.tsx) use bare `<p>` paragraphs for empty states — direct violation of [DESIGN.md §12](DESIGN.md#12-empty-states). No KPI banner above the table. No bulk actions. No filter persistence. | grep | P1 |
| V4 | **Polish primitives shipped in Phase 55–57 are barely used.** `AnimatedNumber` 0 usages, `Skeleton` 0 standardized usages, `Popover` 0, `KpiTile` 3, `KpiDelta` 2, `ProgressRing` 2, `HoverCard` 6, `Combobox` 4, `Dialog` 3. The library is more capable than the UI shows. | adoption matrix | P1 |
| V5 | **Hand-rolled status colors** still present in 4 places despite the central `<StatusBadge>` rule: [BoqPage.tsx:873](apps/web/src/pages/BoqPage.tsx) "cheapest" chip; [ActivityLogPage.tsx:20-22](apps/web/src/pages/ActivityLogPage.tsx) `ACTION_COLORS` record; [TasksPanel.tsx:446](apps/web/src/components/project/TasksPanel.tsx); [AutomationRulesPage.tsx:108](apps/web/src/pages/AutomationRulesPage.tsx). Each violates [PATTERNS.md §1](PATTERNS.md#1-status-badges). | grep | P1 |
| V6 | **`ProjectEditPage` is 1503 lines** — single file holds project header + form + members + milestones panel + 5 financial sub-panels. The size itself is a code-smell that matches the user's "overwhelming when I open a project" feeling. | `wc -l` | P1 |
| V7 | **No motion / depth language.** Cards are flat. Hover states are only `bg-muted/60`. No card-lift on hover, no skeleton shimmer, no number tween, no slide-in detail panes. The system feels like a static rendering, not an app. | DESIGN.md §10 minimal | P1 |
| V8 | **No `<Skeleton>` adoption.** Every page first-paints "טוען…" centered text per [DESIGN.md §13](DESIGN.md#13-loading--feedback) fallback. Tables, KPIs, cards all start blank then pop. Replacing with skeleton rows is a 1-day sweep with disproportionate "feels modern" payoff. | grep | P1 |

### 3.2 Component primitive layer — what the library is missing

`packages/ui` has 19 primitives. Per the adoption audit, **9 are underadopted** and **12 are simply missing**. Missing ones force inline workarounds that bloat pages and break consistency.

| Missing primitive | Where its absence hurts most | Priority |
|---|---|---|
| **`<PageHeader>`** | Every entity page rebuilds the header inline (title + back + actions). [PATTERNS.md §8](PATTERNS.md#8-page-shells) already specifies the API but no component exists. ~15 pages would each lose ~10 LOC. | **P0** |
| **`<SideDrawer>`** | Task detail, ticket detail, supplier detail open as full pages. RTL right-slide drawer is the ergonomic shape — keeps the user in context, works on mobile. Unblocks the "click row to peek" pattern every CRM has. | **P0** |
| **`<DateRangePicker>`** | Reports + invoice filters + activity log all use *two* DatePickers side-by-side. Clunky on RTL — the order looks wrong to Hebrew readers. | **P0** |
| **`<MoneyInput>`** | [PATTERNS.md §5](PATTERNS.md#5-money) and [DESIGN.md §11](DESIGN.md#11-forms) both reference `<MoneyInput>` as if it exists. It doesn't. Money inputs are plain `type="number"`. | **P0** |
| **`<FieldGroup>`** | Same — referenced in spec, not in code. Forms with >5 fields (ProjectForm, LeadForm) just stack inputs in a 2-col grid. | **P0** |
| **`<Toast>` adoption sweep** | Sonner is wired in 10 files / 35 calls — Edit pages mostly. List pages and panels are mute on success/failure. | **P1** |
| **`<Breadcrumb>`** | ProjectEditPage has no ancestor nav. Mobile collapse loses you. | **P1** |
| **`<ActivityTimeline>`** | ActivityLogPage renders a flat divided list. Should be a vertical timeline with date connectors. Same primitive enables comment threads, audit history, lead interaction log. | **P1** |
| **`<Stepper>`** | Invoice issuance, handover protocol, lead-to-project conversion are all multi-step. Currently rendered as a sequence of cards — no progress indicator. | **P1** |
| **`<SegmentedControl>`** | Status filters (active/on-hold/completed) on Projects + Leads pages are styled radio buttons. | **P2** |
| **`<InlineEdit>`** | Click-to-edit a project name without opening the form would be a high-frequency win. | **P2** |
| **`<TagInput>`** | Project tags, document tags, RFQ tags. Currently text + button. | **P2** |
| **`<FileDropzone>`** | DocumentsPanel + ticket attachments use hidden `<input type="file">`. | **P2** |
| **`<Tabs>` count-badge variant** | The current `<Tabs>` doesn't support `<TabsTrigger value="finance">Finance <Badge>5</Badge></TabsTrigger>`. ProjectEditPage hard-codes count display. | **P1** |
| **`<Card>` `interactive` + `elevated` variants** | All cards are flat `shadow-sm`. Hoverable / clickable cards (recent projects, KPI tiles) reimplement hover-lift each time. | **P2** |
| **`<Button>` `loading` state** | Saving buttons manually combine `disabled` + spinner. | **P2** |

### 3.3 IA / structural layer — why it feels "not intuitive"

This is the bigger problem. The visual layer is fixable in 1–2 sprints; the IA reshape is the real redesign.

| # | Finding | Evidence | Severity |
|---|---|---|---|
| IA1 | **PMs cannot edit their own projects.** [ProjectEditPage.tsx:135](apps/web/src/pages/ProjectEditPage.tsx#L135) hard-gates `readOnly = !isAdmin`. BLUEPRINT.md §7 says PM has "Edit project / BoQ" rights. This is a real bug, not just an IA quirk. | grep | **P0 BUG** |
| IA2 | **No global task queue.** [Dashboard.tsx:180](apps/web/src/pages/Dashboard.tsx#L180) wires the "openTasks" KPI to `/projects` — the wrong destination. There is no `/my-tasks` route in [App.tsx](apps/web/src/App.tsx). PMs and Foremen have no cross-project task view. | grep | **P0** |
| IA3 | **No global financial-risk view.** Cash exposure, AR aging, overdue invoices, project margin — all of it lives only inside individual project Financials tabs. CFO has to walk projects one-by-one to see total cash position. | App.tsx route inventory | **P0** |
| IA4 | **`ProjectEditPage` Financials tab stacks 5 sub-panels vertically** (CustomerInvoices, Variations, PurchaseOrders, SupplierInvoices, PaymentRequests) — direct violation of [DESIGN.md §7.3](DESIGN.md#73-tabs) "pages with >4 sections must use Tabs." Should be sub-tabbed. | ProjectEditPage source | **P0** |
| IA5 | **Project tabs collapse 12 logical surfaces into 6.** BLUEPRINT.md §4 lists Overview / BoQ / Procurement / Finance / Schedule / Tasks / RFI / Variations / Client Billing / Meetings / Documents / Handover. The shipped tab set is General / Team / Milestones / Financials / Operations / Documents. **BoQ is at `/projects/:id/boq`** (separate route, not a tab) and **Schedule / Procurement are merged into Operations**. Users have to memorize that "Procurement" lives behind Operations. | App.tsx + ProjectEditPage | **P1** |
| IA6 | **Foreman sees Financials tab they cannot use.** Tab visibility is *not* role-gated even though edits are. Per BLUEPRINT.md §7, foreman has no Finance access. They get a locked tab — bad UX, also a low-grade information leak. | ProjectEditPage tabs | **P1** |
| IA7 | **Settings is two unrelated pages with the same icon.** [`/settings/milestones`](apps/web/src/pages/MilestoneTemplatesPage.tsx) and [`/settings/automations`](apps/web/src/pages/AutomationRulesPage.tsx) are independent nav items in [AppShell.tsx:51-52](apps/web/src/components/AppShell.tsx#L51-L52). NotificationPreferences page exists at `/settings/notifications` but is **not in the sidebar** at all — users have no way to find it without typing the URL. | AppShell | **P1** |
| IA8 | **Work Log (Miro Board 9, יומן עבודה) is missing entirely** — no schema, no UI, no nav. This is a core Miro requirement. It blocks the foreman role from doing their primary job (logging daily site work, hours, crew). | schema + UI grep | **P1** |
| IA9 | **`/tickets` in main nav conflates two queues** — public ticket submissions (anonymous) and internal team workflow share the same page entry. | AppShell + TicketsPage | **P2** |
| IA10 | **No breadcrumbs anywhere.** ProjectEditPage with 6 tabs, BoqPage as a leaf route, Edit pages — none have ancestor nav. Mobile loses context. | grep | **P1** |
| IA11 | **No drill-throughs from finance entities back to suppliers/clients.** From a PaymentRequest you can't click the supplier name to land on `/suppliers/:id`. From a CustomerInvoice no link to `/clients/:id`. Each finance row is a dead end. | panel source | **P1** |
| IA12 | **Calendar page exists but is sparse** — 208 lines, no drag-to-create, single grid view, no role filter. | wc -l | **P2** |

### 3.4 Role-fit — every role gets the same Dashboard

The current Dashboard is generic. It serves none of the six roles well:

| Role | What they actually need | What they currently see |
|---|---|---|
| **CEO** | Cash flow forecast · overdue AR · margin variance · top projects by value | 4 volume KPIs · 6 recent projects · *my* tasks |
| **VP** | Project portfolio health · stalled projects · PM workload | Same generic view |
| **CFO** | AR aging · invoices to issue today · supplier payment schedule · revenue trend | Same generic view |
| **Office Manager** | Pending payment requests · invoices to register · ticket queue depth | Same generic view |
| **PM** | *My* projects · *my* tasks (sortable by urgency) · milestones due ≤14 days · open RFIs *I* own | Same generic view (close — but tasks are fine, projects column shows *all* recent, not *my* projects) |
| **Foreman** | Today's site work · my open tasks · materials due on site · check-in / work log entry | Same generic view (with Finance/RFI tiles they can't act on) |

Conclusion: **Dashboard needs role variants**, not one-size-fits-all.

### 3.5 Data / feature gaps surfaced by the redesign work

These don't affect existing pages but are required to land redesigned ones:

1. **Work Log entity** (Miro Board 9) — schema + UI + foreman dashboard tile.
2. **`/my-tasks` query** — cross-project tasks WHERE assignee_id = me, sortable by priority + due_date.
3. **`/financials` aggregate query** — overdue invoice count + sum + AR aging buckets across all projects (RLS-respecting; CEO/CFO/VP/Office Manager only).
4. **`StatusBadge` audit_action family** — to retire the hand-rolled `ACTION_COLORS` in ActivityLogPage.

---

## 4. Top-20 prioritized backlog

Severity scale: **P0** = blocks daily use or violates spec / **P1** = compounds across pages / **P2** = polish.

| # | Item | Layer | P |
|---|---|---|---|
| 1 | Fix [ProjectEditPage.tsx:135](apps/web/src/pages/ProjectEditPage.tsx#L135) — let PMs edit their own projects per BLUEPRINT.md §7 | IA / bug | P0 |
| 2 | Build `<PageHeader>` primitive ([PATTERNS.md §8](PATTERNS.md#8-page-shells)) and adopt across all entity pages | Component | P0 |
| 3 | Build `<MoneyInput>` + `<FieldGroup>` primitives ([DESIGN.md §11](DESIGN.md#11-forms) / [PATTERNS.md §7](PATTERNS.md#7-forms)) | Component | P0 |
| 4 | Build `<SideDrawer>` (RTL right-slide) — adopt for task/ticket/supplier quick-look | Component | P0 |
| 5 | Build `<DateRangePicker>` — adopt in Reports + ActivityLog + invoice filters | Component | P0 |
| 6 | New `/my-tasks` route + page + role-aware Dashboard tile rewire | IA | P0 |
| 7 | New `/financials` aggregate page (CEO/CFO/VP/OM) — overdue / AR aging / cash forecast | IA | P0 |
| 8 | Sub-tab the Financials tab in ProjectEditPage (POs · Supplier Invoices · PRs · Customer Invoices · Variations) | IA | P0 |
| 9 | Replace Dashboard scaffoldNotice card + add finance signal tile | Visual | P0 |
| 10 | Role-aware Dashboard variants (CEO / CFO / PM / Foreman) | IA + visual | P1 |
| 11 | `<Skeleton>` adoption sweep — every page that fetches data | Visual | P1 |
| 12 | Sonner toast adoption sweep — list pages + panels | Visual | P1 |
| 13 | Replace 4 hand-rolled status pills with `<StatusBadge>` (extend with `audit_action` family) | Visual | P1 |
| 14 | `<Breadcrumb>` primitive + adopt in entity pages + mobile | Component / IA | P1 |
| 15 | Decompose ProjectEditPage.tsx (1503 LOC → ≤300 LOC parent + extracted panels) | Visual / code health | P1 |
| 16 | `<Tabs>` count-badge variant + adopt in ProjectEditPage tabs | Component | P1 |
| 17 | `<ActivityTimeline>` primitive + retrofit ActivityLogPage + lead Interactions list + ticket updates | Component | P1 |
| 18 | Work Log entity: migration `0013_work_logs.sql` + project tab + foreman dashboard widget | Data + IA | P1 |
| 19 | Drill-through links: PR/PO/SupplierInvoice → `/suppliers/:id`; CustomerInvoice → `/clients/:id` | IA | P1 |
| 20 | Foreman: hide Financials tab + RFI tile entirely; surface "today's site work" | IA | P1 |

Items 21+ (out of top-20 but in plan): `<Stepper>`, `<SegmentedControl>`, `<InlineEdit>`, `<TagInput>`, `<FileDropzone>`, `<Card>` variants, `<Button loading>`, motion polish (slide-in detail panes), Calendar v2, Reports v2, ProjectEditPage tab restructure to match BLUEPRINT.md §4 (12 surfaces), unify `/settings/*` under one Settings page with sub-nav.

---

## 5. Phased plan (Phase 66 → 76)

Sequencing logic: **foundation primitives first**, then **role-aware pages** that use them, then **per-feature polish**. Each phase is one PR (or stack), CI green, auto-merge, and one row appended to [HANDOFF.md §Progress log](HANDOFF.md#progress-log).

### Phase 66 — Design system foundations *(unblocks all later phases)*
**Goal**: every later phase consumes ready-made primitives instead of inlining.
**Ships**:
- `<PageHeader>` ([PATTERNS.md §8](PATTERNS.md#8-page-shells) shape: title + subtitle + back + actions slot)
- `<MoneyInput>` (ILS-formatted, blur-format, paste-strip-non-digits)
- `<FieldGroup>` (label + description + slot for fields)
- `<SideDrawer>` (Radix Dialog under the hood, right-slide RTL, focus-trap)
- `<DateRangePicker>` (composes existing `<DatePicker>` × 2 + linked state)
- `<Breadcrumb>` (hierarchical nav, RTL `ArrowRight` separators)
- `<StatusBadge>` `audit_action` family (insert / update / delete / select)
- `<Tabs>` count-badge variant: `<TabsTrigger value="x" count={5}>`
- `<Card>` `interactive` + `elevated` variants
- `<Button loading>` state (spinner + auto-disable)
- Update `DESIGN.md` §8 components inventory + `PATTERNS.md` recipes for each new primitive
**Adoption sweeps shipped in same phase** (so the new primitives don't sit unused):
- `<Skeleton>` adoption across every page that fetches data
- Sonner toast adoption across list pages + panels
- Replace 4 hand-rolled status pills with `<StatusBadge>`
- Replace `Dashboard` scaffoldNotice card with one of the financial tiles from Phase 67
**Out of scope**: `<ActivityTimeline>`, `<Stepper>`, `<InlineEdit>`, `<TagInput>`, `<FileDropzone>` — added in later phases when their host page is redesigned.
**Estimated**: 3–4 days. ~12 files added, ~30 modified.

### Phase 67 — Dashboard role variants + `/my-tasks`
**Goal**: open the app, see what *I* need to do today.
**Ships**:
- New `/my-tasks` route + page (cross-project task list + filters: assignee, status, priority, due date, project)
- `useRole()` returning role + role-group enum (`back_office | pm | foreman`)
- Dashboard router renders one of three variants:
  - **Back-office** (CEO/VP/CFO/OM): finance health hero (overdue count + sum, AR aging mini-bar) + portfolio table + pending approvals queue
  - **PM**: my projects (% complete via `<ProgressRing>`) + my upcoming tasks + milestones due ≤14d + open RFIs I own
  - **Foreman**: today's site work + my open tasks + work log entry shortcut
- Wire all Dashboard tiles to correct destinations (`/my-tasks` not `/projects` for tasks, `/projects` filtered by `pm_id=me` for PM's projects, etc.)
**Estimated**: 4–5 days.

### Phase 68 — `/financials` global view
**Goal**: CFO/CEO/VP/OM open one page and see total cash exposure across all projects.
**Ships**:
- `/financials` route (back-office only)
- KPI banner: total AR · overdue AR · cash position · this week's outflow
- AR aging bucket chart (0–30 / 30–60 / 60+ days) using existing Recharts setup
- Overdue invoices table (project · client · amount · days overdue · "remind" action via existing WA template `invoice_overdue`)
- Supplier payment schedule (next 30 days)
- Cash forecast: weekly buckets, current AR + scheduled supplier outflows
- Add to sidebar `DIRECTORY` section
**Estimated**: 4–5 days.

### Phase 69 — ProjectEditPage IA refactor
**Goal**: opening a project should not feel like a 6-tab wall of stacked panels.
**Ships**:
- **Bug fix**: relax `readOnly = !isAdmin` to `readOnly = !canEditProject(role, projectMembership)` per BLUEPRINT.md §7 (PM can edit own; Foreman read-only; back-office full).
- **Tab restructure** to match BLUEPRINT.md §4 surfaces, where reasonable:
  - Overview (existing General + hero financial chip + recent activity)
  - **BoQ** (move from `/projects/:id/boq` → tab)
  - **Procurement** (split out from current "Operations") — supplier quotes + RFQ comparison
  - **Finance** (now sub-tabbed: POs · Supplier Invoices · PRs · Customer Invoices · Variations)
  - **Schedule / Tasks** (existing kanban + Gantt)
  - **RFI**
  - **Meetings**
  - **Handover**
  - **Documents**
- Tab visibility role-gated: Foreman sees Overview / Schedule / Tasks / Documents only.
- Hero gets a financial chip: `₪X spent of ₪Y contract • Z% margin variance`.
- File decomposition: extract Overview/General/Members/Milestones/Schedule/etc. into [components/project/](apps/web/src/components/project/) so `ProjectEditPage.tsx` ≤300 LOC.
- Adopt `<Tabs>` count-badge variant from Phase 66 (e.g., "RFI (3 open)").
- Add `<Breadcrumb>` (`Projects > [name] > [tab]`).
**Estimated**: 6–7 days. **Riskiest phase** — touches ~15 panel files. Bring extra test coverage.

### Phase 70 — List page polish sweep
**Goal**: every list page (Projects, Leads, Suppliers, Clients, Users, Consultants, Tickets) has a KPI banner, proper empty state, and consistent hover-card.
**Ships**:
- KPI banner above each table (3–4 tiles) summarizing the listed entity
- Replace bare `<p>` empty states with `<EmptyState>` everywhere (LeadsPage:309, ProjectsPage:282, etc.)
- Extract shared `<EntityHoverCard>` from LeadsPage / ProjectsPage duplication
- `<SegmentedControl>` for status filters (replaces radio-button groups)
- Persistent filter state in URL search params
**Estimated**: 3–4 days.

### Phase 71 — Activity Timeline + Comment Thread + lead history
**Goal**: visual hierarchy for time-ordered data.
**Ships**:
- `<ActivityTimeline>` primitive (vertical, date-grouped, RTL connectors, slot for icon + actor + body)
- Retrofit [ActivityLogPage](apps/web/src/pages/ActivityLogPage.tsx) onto it
- Retrofit lead Interactions list onto it
- Retrofit ticket updates onto it
- `<CommentThread>` primitive (avatar + body + reply nesting, RTL)
- Retrofit SupplierQuoteComment thread (currently flat) and add to RFI thread
**Estimated**: 3 days.

### Phase 72 — Work Log entity
**Goal**: foreman has a real workspace, schema parity with Miro Board 9.
**Ships**:
- Migration `0013_work_logs.sql` (`work_logs` table: project_id, work_date, crew_ids[], task_id?, hours, status enum, notes, created_by, RLS)
- API endpoints + Zod schemas in `packages/shared`
- Project tab "Work Log"
- Foreman Dashboard tile: today's log entry
- Daily-entry form with `<FieldGroup>` + `<MoneyInput>` (for crew daily rate)
**Estimated**: 4 days.

### Phase 73 — BoQ + Procurement polish
**Goal**: the spine of the system reads like the spine.
**Ships**:
- BoqPage moves to a tab inside ProjectEditPage (Phase 69 prerequisite already moves it, so 73 is the deep polish)
- RFQ comparison view: side-by-side `<Table>` with cheapest highlighted via `<StatusBadge family="supplier_quote" value="cheapest">` (extend family) — retire BoqPage:873 hand-rolled emerald chip
- Per-line drill: hover shows `<HoverCard>` with planned vs committed vs actual chart
- Adopt `<KpiTile>` for chapter totals
**Estimated**: 3 days.

### Phase 74 — Settings consolidation
**Goal**: one Settings hub instead of three orphan pages.
**Ships**:
- `/settings` index page with sub-nav: Milestones · Automations · Notifications · Workspace
- Surface NotificationPreferences in nav (currently URL-only)
- Move all `/settings/*` under one shell with shared `<PageHeader>` + breadcrumbs
**Estimated**: 1 day.

### Phase 75 — Foreman & mobile pass
**Goal**: the foreman role is mostly mobile + on-site. Make it work.
**Ships**:
- Foreman-only sidebar items (hide Reports/Activity/Suppliers/Consultants/Settings)
- Mobile bottom-tab nav for foreman (Dashboard / My Tasks / Work Log / Documents)
- `<SideDrawer>` adoption for task detail (peek-without-leaving on tasks list)
- Touch-friendly sizing audit on the foreman flow
**Estimated**: 3 days.

### Phase 76 — Motion + visual depth
**Goal**: it should feel alive without feeling cute.
**Ships**:
- `<AnimatedNumber>` adoption on KPI tiles
- Card hover-lift (`hover:-translate-y-0.5 hover:shadow-md`) standardized via `<Card interactive>`
- Skeleton shimmer on first-paint (replaces today's centered "טוען…")
- Slide-in transitions on `<SideDrawer>` open
- Page-transition fade (200ms) on route change
- Update [DESIGN.md §10 Motion](DESIGN.md#10-motion) with codified rules
**Estimated**: 2 days.

**Total estimated**: ~36 working days (≈7 weeks of focused work). Roughly 11 PRs.

---

## 6. Decision register (proposed; needs Shay sign-off)

| # | Decision | Recommendation | Rationale |
|---|---|---|---|
| D1 | Should Dashboard render different layouts per role-group, or one layout with role-conditional sections? | **Different layouts** (3 variants). | One layout with conditional sections becomes spaghetti at 3+ roles. Three small files are cleaner. |
| D2 | Should BoQ and Schedule be tabs in ProjectEditPage, or stay as separate routes (`/projects/:id/boq`)? | **Tabs.** | BLUEPRINT.md §4 lists them as tabs. Separate routes break breadcrumb mental model. |
| D3 | Should Work Log live as a per-project tab, or as a global `/work-log` page (foreman-centric)? | **Both — but per-project is canonical.** Global `/work-log` is just a filtered view. | Foreman needs cross-project, but the data is project-scoped (RLS, billing rollup). |
| D4 | Should the new `/financials` page replace [ReportsPage](apps/web/src/pages/ReportsPage.tsx) or live alongside? | **Alongside.** Reports stays operational ("how many leads / projects / tasks"). Financials is *just* money. | Different mental model; different audiences (Reports for Office Manager, Financials for CFO). |
| D5 | Sonner is wired in 10 files but list pages are silent. Sweep all pages or only critical actions? | **Sweep.** Every mutation gets a toast. | Cheap; consistency matters more than picking-and-choosing. |
| D6 | Tab restructure (Phase 69) — should we drop `/projects/:id/boq` route immediately or keep redirect for 1 phase? | **Keep redirect** for one phase, then remove. | Bookmarks + external doc links may exist. |
| D7 | Public ticket form (`/ticket`) confusion — rename internal nav "Tickets" or split? | **Rename** internal nav to "פניות שירות" (service requests) with `<Inbox>` icon. Keep `/ticket` public route as-is. | Cheaper than splitting the queue. The Hebrew label disambiguates. |

---

## 7. Open questions for Shay

1. **Order of phases** — Phase 66 (foundations) is the hard prerequisite. After that, do you want me to attack **Dashboard first** (Phase 67, fastest visible win) or **ProjectEditPage first** (Phase 69, biggest perceived complexity drop)? My recommendation: 67 first — KPI dashboards are the demo surface.
2. **Role-variant Dashboard** (D1) — confirm 3 variants is right, not 6 (one per role).
3. **`/financials` audience** — confirm CEO + CFO + VP + Office Manager. Should PM see a personal `/financials/me` (just *their* projects' rollup)?
4. **Project tab restructure** (D2) — confirm we're aligning with BLUEPRINT.md §4 12-surface model, even though that means breaking current bookmarks.
5. **Work Log fields** — what does a daily entry actually contain? My guess from MIRO Board 9: date · crew · hours · task link · status · notes. Should it record *materials consumed* too (which would tie back to BoQ actuals)?
6. **Foreman scope** (D7 / Phase 75) — does the foreman ever need access to RFI? Today they can `Open RFI` per BLUEPRINT.md §7, but the Dashboard tile assumes they don't care about counts. Confirm.
7. ~~**Visual direction**~~ — ✅ **RESOLVED 2026-04-25**: locked **Direction A v1 (Site Foreman, clean)** — slate sidebar + safety orange CTA, white cards on slate-50, no glass, no gradient cards. Tokens codified in [UX_MOODBOARD.md](UX_MOODBOARD.md). Reference: [a-foreman.html](apps/web/public/mockups/a-foreman.html).
8. **Mobile priority** — Phase 75 focuses on foreman mobile. Is anyone else (PM in the field?) heavy mobile, or is desktop-first OK for the back-office?

---

## 8. Appendix — page-by-page score grid

Densities are subjective 1–5 (5 = rich + intuitive, 1 = sparse + generic). Score includes both visual depth and IA fit. Notes are issue summaries — full citations in §3.

| Page | Score | Notes |
|---|---:|---|
| [Dashboard](apps/web/src/pages/Dashboard.tsx) | **2** | Sparse; placeholder card; no finance signal; wrong tile destinations; role-blind |
| [LeadsPage](apps/web/src/pages/LeadsPage.tsx) | **3** | Proper Table + HoverCard; bare `<p>` empty state; no funnel viz / source attribution / KPI banner |
| [LeadEditPage](apps/web/src/pages/LeadEditPage.tsx) | **3** | Form is fine; no Stepper for status progression; Interactions section is flat list (Phase 71 target) |
| [ProjectsPage](apps/web/src/pages/ProjectsPage.tsx) | **3** | Same as Leads — duplicates HoverCard, bare empty state, no portfolio KPIs above |
| [ProjectEditPage](apps/web/src/pages/ProjectEditPage.tsx) | **3** | Comprehensive but 1503 LOC; Financials sub-panel stack overload; PM edit bug; foreman tab leak; no breadcrumb |
| [BoqPage](apps/web/src/pages/BoqPage.tsx) | **3** | Functional; hand-rolled "cheapest" chip (V5); should be a tab not a route; no chapter KPIs |
| [ClientsPage](apps/web/src/pages/ClientsPage.tsx) | **3** | TanStack Table fine; no contact aggregation; no KPI banner |
| [ClientEditPage](apps/web/src/pages/ClientEditPage.tsx) | **3** | Standard edit form; no `<MoneyInput>` for invoiced/paid totals |
| [SuppliersPage](apps/web/src/pages/SuppliersPage.tsx) | **3** | TanStack Table fine; no spend KPI; no recent POs preview |
| [SupplierEditPage](apps/web/src/pages/SupplierEditPage.tsx) | **3** | Same as Client; missing "open POs" / "outstanding invoices" sub-card |
| [ConsultantsPage](apps/web/src/pages/ConsultantsPage.tsx) | **3** | Bare bones; serves the use case |
| [ConsultantEditPage](apps/web/src/pages/ConsultantEditPage.tsx) | **3** | Standard form |
| [UsersPage](apps/web/src/pages/UsersPage.tsx) | **3** | Standard list; no role-distribution KPI |
| [UserEditPage](apps/web/src/pages/UserEditPage.tsx) | **3** | Standard edit |
| [TicketsPage](apps/web/src/pages/TicketsPage.tsx) | **3** | Queue view; no SLA badge; no per-status counts |
| [TicketEditPage](apps/web/src/pages/TicketEditPage.tsx) | **3** | Standard edit; no thread/`<CommentThread>` (Phase 71 target) |
| [PublicTicketPage](apps/web/src/pages/PublicTicketPage.tsx) | **4** | Phase 65 hCaptcha + image attachments; landing form is clean |
| [CalendarPage](apps/web/src/pages/CalendarPage.tsx) | **2** | Month grid only; no drag-create, no role filter, no event-detail drawer |
| [ReportsPage](apps/web/src/pages/ReportsPage.tsx) | **3** | Recharts donuts; lacks `<DateRangePicker>`, drill-throughs, exportable views |
| [ActivityLogPage](apps/web/src/pages/ActivityLogPage.tsx) | **2** | Flat list; hand-rolled status colors (V5); needs `<ActivityTimeline>` |
| [AutomationRulesPage](apps/web/src/pages/AutomationRulesPage.tsx) | **3** | Read-only-ish, hand-rolled status (V5); fine for an admin surface |
| [NotificationPreferencesPage](apps/web/src/pages/NotificationPreferencesPage.tsx) | **3** | Grid works; not in nav (IA7) |
| [MilestoneTemplatesPage](apps/web/src/pages/MilestoneTemplatesPage.tsx) | **3** | Admin CRUD; lives under fragmented Settings |
| [Login](apps/web/src/pages/Login.tsx) | **4** | Two-panel hero per [DESIGN.md §16](DESIGN.md#16-per-page-conventions) — one of the strongest pages in the app |

| Project panel | Score | Notes |
|---|---:|---|
| [TasksPanel](apps/web/src/components/project/TasksPanel.tsx) | **3** | Phase 62 DnD kanban + list toggle; hand-rolled status (V5); no peek drawer |
| [SchedulePanel](apps/web/src/components/project/SchedulePanel.tsx) | **3** | Phase 63 Gantt; needs zoom + critical path highlight |
| [CustomerInvoicesPanel](apps/web/src/components/project/CustomerInvoicesPanel.tsx) | **3** | Clean; no overdue badge; no client drill-through (IA11) |
| [PaymentRequestsPanel](apps/web/src/components/project/PaymentRequestsPanel.tsx) | **3** | Workflow OK; no supplier drill-through (IA11) |
| [PurchaseOrdersPanel](apps/web/src/components/project/PurchaseOrdersPanel.tsx) | **3** | Same — no drill-through |
| [SupplierInvoicesPanel](apps/web/src/components/project/SupplierInvoicesPanel.tsx) | **3** | Same — no drill-through |
| [RfiPanel](apps/web/src/components/project/RfiPanel.tsx) | **3** | Thread is flat (Phase 71 target) |
| [MeetingsPanel](apps/web/src/components/project/MeetingsPanel.tsx) | **3** | Action-item → task auto-creation works; PDF export Phase 64 |
| [HandoverPanel](apps/web/src/components/project/HandoverPanel.tsx) | **3** | Optimistic-update reference; PDF export Phase 64 |
| [DocumentsPanel](apps/web/src/components/project/DocumentsPanel.tsx) | **3** | Flat list; no `<FileDropzone>`, no folder breadcrumbs, no preview |

---

*End of plan. Awaiting Shay's answers to §7 open questions before opening Phase 66 PR.*
