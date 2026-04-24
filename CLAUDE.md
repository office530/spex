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

## Other durable rules

See `HANDOFF.md` for phase history, `BLUEPRINT.md` for architecture, `DECISIONS.md` for the tech stack, `SCHEMA.md` for the DB schema.

- Working branch: `claude/start-spex-rebuild-ZiKng`.
- Back-office roles (full access): `ceo`, `vp`, `cfo`, `office_manager`. PM / Foreman are project-scoped via RLS.
- Supabase project: `vxzflohvtfrkwycpaxiy` (ap-southeast-1 Singapore).
- Each phase: write code → `pnpm --filter web build` → commit → push → open a **draft** PR.
