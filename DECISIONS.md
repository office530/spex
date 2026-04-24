# Spex — Locked Decisions

Source of truth for all business and architectural decisions made during discovery.
Paired with `BLUEPRINT.md` (design) and `MIRO_READOUT.md` (requirements source).

---

## Business model (from the vision)

- Israeli renovation / construction contractor. Project-centric. One PM per project.
- Client billing is **milestone-based** (% of contract value per execution stage).
- Each project's backbone is a **BoQ** (Bill of Quantities) — the "zero budget" that drives procurement, cost control, and planned-vs-actual analysis.
- End-to-end lifecycle: Lead → Deal → Project → BoQ → Procurement (POs, expenses) → Field execution → Milestone invoicing → Handover.
- Two-layer finance:
  - **Operational layer** (inside Spex): payment requests, POs, quotes, supplier invoices.
  - **Financial layer** (Chashbashvat via API): legal financial docs live there; mirrored back into Spex as links + previews.

---

## Locked decisions

| # | Topic | Decision |
|---|---|---|
| 1 | **Milestones** | One list per project. Use Miro's 11 execution stages as the default template. Each milestone carries execution status + % of contract value to bill. Cloned & customizable per project. |
| 2 | **Quotes** | Three distinct entities: `CustomerQuote` (pre-deal, on Lead) · `SupplierQuote` (procurement, per BoQ line, with comparison + discussion) · `VariationQuote` (mid-project extras, customer-facing). |
| 3 | **Accounting integration** | Chashbashvat is source of truth. User clicks a button in Spex → API call to Chashbashvat → doc created there → synced back as link + preview. |
| 4 | **Change orders (בלתמים)** | Tracked as separate "Extras" on the project. Do **not** modify contract value. Billed by rolling into the next milestone invoice. |
| 5 | **Google Drive** | Read-write. Spex creates/moves/renames folders and files for each project. |
| 6 | **Portals** | Internal-first UI. Supplier portal in Phase 8 (deferrable) for submitting payment requests. No client portal. |
| 7 | **Public ticket form** | In scope. Clients open tickets via a public `/ticket` page, no auth, captcha-protected. |
| 8 | **Events calendar** | Folded into the CRM as a sub-feature. Google Calendar 2-way sync. Not a standalone module. |
| 9 | **Roles** | `ceo` · `vp` · `cfo` · `office_manager` · `pm` · `foreman`. PM sees only their own projects. Full matrix in BLUEPRINT §7. |
| 10 | **WhatsApp** | Two-way inbox kept. Outbound alerts catalog in BLUEPRINT §8.1 — full event → channel → recipient mapping. |
| 11 | **AI features** | Out of scope for v1. Not deferred in code; cut entirely. |
| 12 | **Data migration** | None. Start empty. No legacy import. |
| 13 | **Dropped capabilities** | Base44 platform, PF subsystem, anycrm/ subsystem, dedicated Mobile pages (responsive instead), duplicate report pages. |

---

## Scale (drives infra sizing)

- ~30 leads / month
- 10–30 projects / year
- Project lifespan: 3–4 months typical, sometimes longer
- Therefore: ~5–10 active projects concurrently
- Team: 6–15 users
- Implication: small-to-medium scale. No multi-tenancy, no sharding, no enterprise complexity.

---

## Tech stack (locked)

| Layer | Choice |
|---|---|
| Frontend | React 18 + Vite + **TypeScript** |
| UI | Radix + Tailwind + shadcn/ui (RTL-first for Hebrew) |
| Data | Postgres via **Supabase** (ap-southeast-1 Singapore) — auth + RLS + realtime + storage |
| Backend | Thin Node.js (Fastify) on Railway (Phase 3+ only) |
| Queue | BullMQ on Upstash Redis |
| File storage | Google Drive (project docs) + Supabase Storage (in-app attachments, tickets) |
| State | TanStack Query + Zustand |
| Forms | React Hook Form + Zod |
| i18n | i18next — **Hebrew is the only user-facing language.** `en.json` exists as a developer-side fallback and must never surface in the UI. No language switcher. |
| PDF | `@react-pdf/renderer` server-side |
| Hosting | Vercel (web) + Railway (backend + Redis) + Supabase (DB + auth + storage) |
| Observability | Sentry + Betterstack |
| Testing | Vitest (unit) + Playwright (E2E golden paths) |
| CI | GitHub Actions |

**Rejected**: staying on Base44 (vendor lock-in, awkward for complex relations, narrow hiring pool).

---

## Open items (needed before / during build)

- **Supabase region** — ✅ Resolved: `ap-southeast-1` Singapore. New project `vxzflohvtfrkwycpaxiy` created 2026-04-23.
- **Domain** — `renobuild.co.il` vs. new `spex.*` domain. Subdomain convention `app.` / `ticket.` proposed.
- **Data residency** — confirm no Israel-only legal requirement.
- **Chashbashvat API discovery** — 1-hour call with their integration team before Phase 3. Confirm which objects expose via API and whether inbound webhooks exist.
- **Milestone template** — the authoritative list of 11 milestone names + default billing %.
- **Drive folder template** — exact subfolder names per project.
- **Customer quote PDF template** — layout, logo, Hebrew legal disclaimers.
- **Handover protocol template** — sections, checklist, signature style.
- **Reports v1 scope** — which reports CEO / VP / CFO actually read weekly.

---

## Phase summary (detail in BLUEPRINT §10)

| Phase | Scope | Rough duration |
|---|---|---|
| 0 | Monorepo foundation, auth, users, roles, login shell | 2 wk |
| 1 | CRM + Leads (full pipeline with automations) | 3 wk |
| 2 | Clients + Projects shell + BoQ + Milestones + Tasks + Documents | 4 wk |
| 3 | Procurement (RFQ → PO) + Supplier finance + **Chashbashvat integration** | 4 wk |
| 4 | Client finance (milestone billing) | 2 wk |
| 5 | Ops polish: RFI, Meeting minutes, Variations, Handover | 3 wk |
| 6 | Tickets + Admin + basic reports | 1.5 wk |
| 7 | Hardening (E2E, perf, security) | 1.5 wk |
| 8 | Supplier portal (optional, deferrable) | 2 wk |

**v1 total** (Phases 0–7): ~21 weeks with 1 strong full-stack dev.
