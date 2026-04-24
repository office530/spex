# Spex — New Session Kickoff

One-page handoff for a fresh Claude Code CLI session in the `office530/spex` repo.
Paste **§ First message** verbatim as your opening prompt.

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

## What NOT to do

- Do not start AI features — out of scope for v1 (DECISIONS.md #11).
- Do not build a client portal — internal-first; supplier portal is Phase 8 (optional).
- Do not modify contract_value for variations — they roll into milestone invoices separately.
- Do not use any Base44 patterns, APIs, or concepts — we are rebuilding from scratch.
- Do not debate the tech stack — it is locked in DECISIONS.md.
