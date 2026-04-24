-- Phase 25: Chashbashvat integration infrastructure.
--
-- App code enqueues sync jobs as entities are created / status-flipped.
-- A future backend worker (Railway) will consume the queue and call the
-- Chashbashvat API once that integration call happens per BLUEPRINT §6.4.
--
-- Flow:
--   1. App inserts into chashbashvat_sync_jobs (status='pending')
--   2. INSERT trigger mirrors 'pending' onto the source entity row
--   3. Worker picks a pending job, flips to 'processing', calls API
--   4. Worker flips job to 'synced' or 'failed'; UPDATE trigger mirrors
--      the final status back onto the source entity
--
-- NOT applied yet — this file will be run via Supabase MCP once the
-- connection stabilizes; until then it's the canonical definition.

CREATE TYPE public.chashbashvat_sync_entity AS ENUM (
  'client',
  'supplier',
  'customer_invoice',
  'customer_receipt',
  'supplier_invoice',
  'purchase_order'
);

CREATE TYPE public.chashbashvat_sync_operation AS ENUM (
  'create',
  'update',
  'cancel'
);

CREATE TYPE public.chashbashvat_sync_status AS ENUM (
  'pending',
  'processing',
  'synced',
  'failed'
);

CREATE TABLE public.chashbashvat_sync_jobs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_type public.chashbashvat_sync_entity NOT NULL,
  entity_id uuid NOT NULL,
  operation public.chashbashvat_sync_operation NOT NULL,
  status public.chashbashvat_sync_status NOT NULL DEFAULT 'pending',
  payload jsonb,
  attempts int NOT NULL DEFAULT 0,
  last_error text,
  scheduled_at timestamptz NOT NULL DEFAULT now(),
  completed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_chbsv_jobs_status_scheduled
  ON public.chashbashvat_sync_jobs (status, scheduled_at);

CREATE INDEX idx_chbsv_jobs_entity
  ON public.chashbashvat_sync_jobs (entity_type, entity_id);

ALTER TABLE public.chashbashvat_sync_jobs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "chbsv_jobs_read" ON public.chashbashvat_sync_jobs
FOR SELECT TO authenticated USING (public.is_back_office());

CREATE POLICY "chbsv_jobs_write" ON public.chashbashvat_sync_jobs
FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "chbsv_jobs_update" ON public.chashbashvat_sync_jobs
FOR UPDATE TO authenticated
USING (public.is_back_office())
WITH CHECK (public.is_back_office());

-- Mirror the latest sync_status onto the source entity for easy UI
-- rendering without a join.
ALTER TABLE public.customer_invoices
  ADD COLUMN IF NOT EXISTS chashbashvat_sync_status public.chashbashvat_sync_status;
ALTER TABLE public.customer_receipts
  ADD COLUMN IF NOT EXISTS chashbashvat_sync_status public.chashbashvat_sync_status;
ALTER TABLE public.supplier_invoices
  ADD COLUMN IF NOT EXISTS chashbashvat_sync_status public.chashbashvat_sync_status;
ALTER TABLE public.purchase_orders
  ADD COLUMN IF NOT EXISTS chashbashvat_sync_status public.chashbashvat_sync_status;
ALTER TABLE public.clients
  ADD COLUMN IF NOT EXISTS chashbashvat_sync_status public.chashbashvat_sync_status;
ALTER TABLE public.suppliers
  ADD COLUMN IF NOT EXISTS chashbashvat_sync_status public.chashbashvat_sync_status;

CREATE OR REPLACE FUNCTION public.propagate_chbsv_sync_status()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  IF NEW.status IS DISTINCT FROM OLD.status THEN
    CASE NEW.entity_type
      WHEN 'customer_invoice' THEN
        UPDATE public.customer_invoices SET chashbashvat_sync_status = NEW.status WHERE id = NEW.entity_id;
      WHEN 'customer_receipt' THEN
        UPDATE public.customer_receipts SET chashbashvat_sync_status = NEW.status WHERE id = NEW.entity_id;
      WHEN 'supplier_invoice' THEN
        UPDATE public.supplier_invoices SET chashbashvat_sync_status = NEW.status WHERE id = NEW.entity_id;
      WHEN 'purchase_order' THEN
        UPDATE public.purchase_orders SET chashbashvat_sync_status = NEW.status WHERE id = NEW.entity_id;
      WHEN 'client' THEN
        UPDATE public.clients SET chashbashvat_sync_status = NEW.status WHERE id = NEW.entity_id;
      WHEN 'supplier' THEN
        UPDATE public.suppliers SET chashbashvat_sync_status = NEW.status WHERE id = NEW.entity_id;
    END CASE;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_propagate_chbsv_sync_status
AFTER UPDATE OF status ON public.chashbashvat_sync_jobs
FOR EACH ROW EXECUTE FUNCTION public.propagate_chbsv_sync_status();

CREATE OR REPLACE FUNCTION public.mark_chbsv_sync_pending()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  CASE NEW.entity_type
    WHEN 'customer_invoice' THEN
      UPDATE public.customer_invoices SET chashbashvat_sync_status = NEW.status WHERE id = NEW.entity_id;
    WHEN 'customer_receipt' THEN
      UPDATE public.customer_receipts SET chashbashvat_sync_status = NEW.status WHERE id = NEW.entity_id;
    WHEN 'supplier_invoice' THEN
      UPDATE public.supplier_invoices SET chashbashvat_sync_status = NEW.status WHERE id = NEW.entity_id;
    WHEN 'purchase_order' THEN
      UPDATE public.purchase_orders SET chashbashvat_sync_status = NEW.status WHERE id = NEW.entity_id;
    WHEN 'client' THEN
      UPDATE public.clients SET chashbashvat_sync_status = NEW.status WHERE id = NEW.entity_id;
    WHEN 'supplier' THEN
      UPDATE public.suppliers SET chashbashvat_sync_status = NEW.status WHERE id = NEW.entity_id;
  END CASE;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_mark_chbsv_sync_pending
AFTER INSERT ON public.chashbashvat_sync_jobs
FOR EACH ROW EXECUTE FUNCTION public.mark_chbsv_sync_pending();
