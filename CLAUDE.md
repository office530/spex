# Spex — agent instructions

## Orientation (read in this order)

1. **`HANDOFF.md` §Current state + §Progress log** — what's already shipped + what's left. Don't restart a phase that's done.
2. **`BLUEPRINT.md` §10 phased plan** — the authoritative roadmap. Every piece of work should map to a phase.
3. **`DECISIONS.md`** — locked product + stack decisions. Don't re-open them.
4. **`DESIGN.md`** — authoritative UI/UX spec. Read before any visual work.
5. **`PATTERNS.md`** — copy-paste UI recipes. Cite a section when a new pattern is introduced.
6. **`MIRO_READOUT.md`** — original requirements source. Resolves ambiguity in BLUEPRINT.
7. **`SCHEMA.md`** — database schema reference (also in `packages/db/src/schema/`).
8. **`SALVAGE.md`** — reusable snippets from the old Base44 app.

## Language (non-negotiable)

**The entire user-facing UI must be in Hebrew.** No exceptions.

- `dir="rtl"` on `<html>` — always.
- Every visible string goes through i18next using keys in `apps/web/src/i18n/locales/he.json`.
- `en.json` is a developer-side fallback only. It must never reach end users.
- Do **not** add a language switcher, locale toggle, or "translate" affordance to the UI.
- Do **not** hard-code English literals in JSX, button labels, toast messages, form labels, placeholders, validation messages, empty states, or error strings. Every one of those must be a `t('…')` call with a Hebrew value in `he.json`.
- New i18n keys land in **both** `he.json` and `en.json` in the same commit. The Hebrew value is the source of truth; the English value is there only so typos/missing keys don't silently ship.
- Dates and numbers: use `Intl.DateTimeFormat(i18n.language, …)` / `Intl.NumberFormat` — no manual English-locale formatting.
- When unsure of a Hebrew translation, ask Shay rather than inventing English-language placeholders.

## UI & design (non-negotiable)

The complete design language lives in **`DESIGN.md`**. Read it before any UI work. `PATTERNS.md` has copy-paste recipes. Follow the rules below **before** adding any new UI.

- **Shared primitives live in `packages/ui`** — not in page files, not in `apps/web/src/components`. If a pattern is used more than once, extract it.
- **Status colors** come from a single source: `packages/ui/src/components/status-badge.tsx`. Do not define per-module `STATUS_COLORS` records; extend the central map.
- **Icons from `lucide-react` only.** Every nav item, every primary action button, and every empty state has an icon. No emoji.
- **Lists with >3 columns** use `<Table>` (from `@spex/ui`), not divided flex rows. Row-divided lists are for timelines and card-like items only.
- **Empty states** use `<EmptyState>` with icon + title + optional CTA. Bare "no X yet" text is banned.
- **Information architecture**: a page with more than 4 distinct content sections must use the shared `<Tabs>` primitive, not vertical stacking.
- **Visual hierarchy** (do not deviate without explicit reason):
  - page `<h1>`: `text-2xl font-bold`
  - section / card title: `text-base font-semibold`
  - row title: `text-sm font-medium`
  - meta / secondary: `text-xs text-muted-foreground`
- **Forms**: group fields into sections via `<FieldGroup>` when a form has >5 fields. Money inputs use the `<MoneyInput>` component (ILS-formatted). Dates displayed via `Intl.DateTimeFormat(i18n.language, …)`.
- **Density defaults**: card `p-4`; list row `py-3 px-6`; form field gap `gap-4`; KPI tile `p-4`.

If you think you need a new pattern not covered here, add it to `PATTERNS.md` in the same PR that introduces it.

## Workflow rules (durable)

- **Branch**: all work goes on `claude/start-spex-rebuild-ZiKng` (long-lived working branch). Each phase is a commit (or stack of commits) → push → PR → merge to `main`.
- **Supabase project**: `vxzflohvtfrkwycpaxiy` (ap-southeast-1 Singapore). All DDL goes through `mcp__supabase__apply_migration`. The same SQL is **also** saved as `supabase/migrations/NNNN_descriptive_name.sql` so git tracks what's been applied. Current highest-numbered file is the source of truth for "what's applied".
- **Migrations applied to date**: `0001_auth_rls.sql` → `0006_auto_invoice_on_milestone_ready.sql`. Next one is `0007_*`.
- **Roles**: back-office (full access) = `ceo`, `vp`, `cfo`, `office_manager`. PM / Foreman are project-scoped via RLS. The full matrix is in `BLUEPRINT.md §7` — obey it when gating UI.
- **Each phase**: write code → `pnpm --filter web build` → commit → push → open PR (can be non-draft since auto-merge is approved) → `mcp__github__enable_pr_auto_merge` (waits for CI) OR merge manually once `lint · typecheck · test` is green. Shay has **pre-authorized auto-merge** for PRs Claude authors on `claude/*` branches: CI green + no unresolved review comments is the gate. Debug failing CI; don't skip hooks.
- **After every merged phase**: append one row to `HANDOFF.md` §Progress log so the next session sees current state at a glance.

## External-integration status (reference only — don't try to build these without explicit go-ahead)

All of these are blocked pending user-side setup. Schema columns and/or sync queues are already in place, but runtime integration is not.

| Integration | Status | Notes |
|---|---|---|
| Chashbashvat API | 🚫 Blocked | Sync queue + triggers live (`chashbashvat_sync_jobs`). Worker is future Railway job — see `BLUEPRINT.md §6.4`. |
| Google Drive | 🚫 Blocked | Substituted Supabase Storage for documents (see `DECISIONS.md #5` — documented deviation). |
| Google Calendar | 🚫 Blocked | Events table + `google_event_id` column exist; no sync yet. |
| WhatsApp (Green API) | 🚫 Blocked | Blueprint §8.1 lists 18 templates. Not wired. |
| Email | 🚫 Blocked | Same NotificationPreference pipeline as WA. Not wired. |
| Facebook Lead Ads | 🚫 Blocked | Lead source `fb_ads` exists; no webhook. |

## What to build next (pointer)

Per the audit (2026-04-24), the non-blocked / non-library-dependent work left is roughly:

1. Overdue tasks flagged red (Miro §7)
2. Default customer-invoice due date = 5 days from issuance (Miro §5)
3. ActivityLog viewer + triggers (Blueprint Phase 6, schema exists)
4. In-app notifications center + preferences UI (Blueprint Phase 6, schema exists — `notification_preferences`, `notification_logs`)
5. Calendar grid view for events (Blueprint Phase 1 / Miro §6)
6. AutomationRule UI (Blueprint Phase 6, schema exists — read-only to start)
7. Captcha + rate-limit on public `/ticket` (hCaptcha)

Library-dependent (install before building): task Kanban (`@dnd-kit/core`), Gantt (`gantt-task-react` or similar), PDF export (`@react-pdf/renderer`).

