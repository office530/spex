# Spex — Security model

Last reviewed: 2026-04-25 (Phase 60).

## TL;DR
- **All access to user data goes through Supabase Postgres RLS.** No service-role
  key in the frontend; the web app authenticates as the end user and is bound
  by the policies below.
- **Roles** (in JWT `role` claim, set by DB trigger): `ceo`, `vp`, `cfo`,
  `office_manager` (back-office, full access), `pm` (project-scoped), `foreman`
  (operational tabs of their projects).
- **Single source of truth for the role check**: `public.is_back_office()`.
  Policies that grant write access to back-office roles call this function,
  not an inline `IN (...)` list.

## Threat surface

| Surface | Defense |
|---|---|
| Browser ↔ Supabase | RLS on every public table; HTTPS; anon key only |
| `/ticket` public form | RLS allows anon `INSERT` on `tickets` only; soft rate-limit trigger; image upload bucket allows anon `INSERT` only under `public/<uuid>/` |
| Document downloads | Storage policy gates by `is_project_member((storage.foldername(name))[1]::uuid)` |
| Audit trail | `activity_audit()` SECURITY DEFINER trigger captures every projects / leads / customer_invoices / tasks change |
| Notifications | Per-user RLS — users only read their own notification rows |
| Chashbashvat sync queue | Back-office only insert (Phase 60 fix); read+update back-office only |

## RLS policy inventory

Every table with user-facing data has RLS enabled. Policies live in
`supabase/migrations/` — search for `CREATE POLICY` to enumerate.

### Public-anon write
- `tickets` INSERT (public ticket form). Triggers `tickets_anon_rate_limit()`
  caps anon submissions at 3 per 5-min window keyed on
  `opener_contact` / `opener_name`.
- `storage.objects` (`ticket-uploads` bucket) INSERT, restricted to keys
  starting with `public/`. No SELECT for anon.

### Authenticated read, back-office write
- `clients`, `suppliers`, `consultants`, `automation_rules`, `milestone_templates`,
  `chashbashvat_sync_jobs`.

### Project-scoped (member visibility)
- `projects`, `boq_chapters`, `boq_line_items`, `milestones`, `tasks`, `rfis`,
  `meeting_minutes`, `action_items`, `handover_protocols`, `documents`,
  `customer_invoices`, `customer_receipts`, `variations`, `purchase_orders`,
  `supplier_invoices`, `payment_requests`, `supplier_quotes`, `rfqs`,
  `events`.

  Visibility = back-office OR `is_project_member(project_id)`.
  Write = back-office OR project PM (per BLUEPRINT §7).

### Per-user
- `notifications`, `notification_preferences` — `user_id = auth.uid()`.

## Audit log

Migration `0007_activity_log_triggers.sql` defines a generic
`activity_audit()` SECURITY DEFINER trigger and wires it to
`projects`, `leads`, `customer_invoices`, `tasks`. Every INSERT / UPDATE
(non-no-op) / DELETE writes a row to `activity_logs` with actor uid,
entity type+id, action, and a JSON diff. The viewer at `/activity` is
back-office only.

## SECURITY DEFINER functions
| Function | Why DEFINER |
|---|---|
| `is_back_office()` | Reads `user_profiles` to find the caller's role; called inside many RLS policies; needs to escape RLS |
| `is_project_member(uuid)` | Same shape — looks up `project_members` and `projects.pm_id` for the caller |
| `activity_audit()` | Writes to `activity_logs` with `auth.uid()` as actor regardless of who can read the table |
| `propagate_chbsv_sync_status()` | Mirrors sync status onto source entity |
| `mark_chbsv_sync_pending()` | Mirrors initial pending state |
| `tickets_anon_rate_limit()` | Reads recent `tickets` rows to count anon submissions |
| `notify_task_assigned()` / `notify_ticket_assigned()` | Inserts into `notifications` for users other than `auth.uid()` |

`search_path` is explicitly set to `public, pg_catalog` in every DEFINER
function to prevent schema-shadowing attacks.

## Known advisor lints — status

Run `mcp__supabase__get_advisors` for a fresh report.

### Security (1 unresolved, both informational)
- ✅ **`chbsv_jobs_write` permissive** — fixed in migration `0013`.
- ⚠️ **Leaked password protection disabled** — Supabase Auth config knob,
  not in our SQL. Toggle in
  https://supabase.com/dashboard/project/vxzflohvtfrkwycpaxiy/auth/providers
  → Email Auth → "Check passwords against HaveIBeenPwned".

### Performance (102 informational)
| Lint | Count | Plan |
|---|---|---|
| `unindexed_foreign_keys` | 63 | Add indexes incrementally as we hit slow queries; not yet observed |
| `auth_rls_initplan` | 25 | Wrap `auth.uid()` calls in `(select auth.uid())` for plan caching — sweep migration scheduled |
| `multiple_permissive_policies` | 10 | Acceptable; policies separate read/write/own-row concerns intentionally |
| `unused_index` | 4 | Review at v1 ship — likely the `idx_chbsv_*` indexes that wait on the worker |

## OWASP top 10 quick check

| Risk | Status |
|---|---|
| A01 Broken Access Control | RLS on every table; back-office matrix obeyed |
| A02 Cryptographic Failures | HTTPS only; Supabase manages secrets |
| A03 Injection | Drizzle parameterizes queries; no string concat in policies; trigger functions use `:=` |
| A04 Insecure Design | Audit log + role-based UI gating + soft anon rate-limit |
| A05 Security Misconfiguration | DEFINER functions explicitly set `search_path`; one Auth config knob open (leaked-password protection) |
| A06 Vulnerable Components | `pnpm audit` not yet wired into CI — recommended follow-up |
| A07 Identification & Auth Failures | Supabase Auth handles session refresh + email verification |
| A08 Software & Data Integrity | All migrations checked into git; CI runs typecheck + tests |
| A09 Logging & Monitoring | `activity_logs` for app-level audit; no Sentry/Betterstack yet (BLUEPRINT Phase 7) |
| A10 SSRF | No server-side fetch from user input today |

## Public ticket — extra notes

The `/ticket` route accepts anonymous submissions. Defenses:
1. RLS allows only `INSERT` on `tickets` for `anon` role.
2. `tickets_anon_rate_limit()` trigger caps named-anon submissions at 3 per
   5-minute window.
3. Client-side 30-second cooldown via `localStorage`.
4. Image upload limited to `image/*` mime, 5 MB, max 4 files.
5. Storage anon policy scoped to `public/<random-uuid>/...` — anon cannot
   list or read.

**Pending hardening**: real captcha (hCaptcha) + IP-based rate-limit via a
Supabase Edge Function. Blocked on hCaptcha account.

## Backup / disaster recovery
Out of scope for v1. Supabase free tier provides daily snapshots; production
should move to a paid tier with point-in-time recovery before launch.

## Reporting a vulnerability
Email Shay directly. Do not open a public GitHub issue.
