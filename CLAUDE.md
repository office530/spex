# Spex — agent instructions

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

## Other durable rules

See `DESIGN.md` for the full design language, `HANDOFF.md` for phase history, `BLUEPRINT.md` for architecture, `DECISIONS.md` for the tech stack, `SCHEMA.md` for the DB schema, `PATTERNS.md` for UI recipes.

- Working branch: `claude/start-spex-rebuild-ZiKng`.
- Back-office roles (full access): `ceo`, `vp`, `cfo`, `office_manager`. PM / Foreman are project-scoped via RLS.
- Supabase project: `vxzflohvtfrkwycpaxiy` (ap-southeast-1 Singapore).
- Each phase: write code → `pnpm --filter web build` → commit → push → open a **draft** PR.
- **Auto-merge approved by Shay** for PRs you author on `claude/*` branches: after push, wait for CI (`lint · typecheck · test`) green AND no unresolved review comments, then merge the PR yourself (`mcp__github__merge_pull_request`). If CI fails, debug and fix before asking. If a review comment lands, address it first.
