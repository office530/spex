-- Phase 60 (security advisor follow-up):
-- Tighten the chashbashvat_sync_jobs INSERT policy.
--
-- Original policy (migration 0005) was `WITH CHECK (true)` which the
-- Supabase advisor flagged as overly permissive. Authenticated PM /
-- foreman roles could in principle enqueue sync jobs for entities
-- outside their scope.
--
-- Tighten to back-office only. The two frontend call sites (CustomerInvoicesPanel,
-- PurchaseOrdersPanel) already gate the "Sync to Chashbashvat" button on
-- canWrite (back-office or project PM), but the policy now matches the
-- read+update policies — back-office is the source of truth for sync
-- enqueueing. PM-triggered sync can be re-enabled in a follow-up if
-- demanded.

DROP POLICY IF EXISTS "chbsv_jobs_write" ON public.chashbashvat_sync_jobs;

CREATE POLICY "chbsv_jobs_write" ON public.chashbashvat_sync_jobs
FOR INSERT TO authenticated
WITH CHECK (public.is_back_office());
