-- Phase 37: activity_log RLS + generic audit trigger wired to core entities.
-- Applied to Supabase vxzflohvtfrkwycpaxiy.
--
-- The activity_logs table was created in Phase 0; this migration:
-- 1. Enables RLS — back-office reads; no direct client INSERT.
-- 2. Adds a generic SECURITY DEFINER trigger function activity_audit()
--    that writes a row for every INSERT/UPDATE/DELETE on a watched table.
--    Skips no-op UPDATEs where before = after.
-- 3. Wires the trigger to projects, leads, customer_invoices, tasks.
--    More tables can opt in by adding their own CREATE TRIGGER line.

ALTER TABLE public.activity_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "activity_logs_read" ON public.activity_logs
FOR SELECT TO authenticated USING (public.is_back_office());

CREATE POLICY "activity_logs_no_direct_write" ON public.activity_logs
FOR INSERT TO authenticated WITH CHECK (false);

CREATE OR REPLACE FUNCTION public.activity_audit()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_entity_id uuid;
  v_before jsonb;
  v_after jsonb;
BEGIN
  IF TG_OP = 'DELETE' THEN
    v_entity_id := OLD.id;
    v_before := to_jsonb(OLD);
    v_after := NULL;
  ELSIF TG_OP = 'INSERT' THEN
    v_entity_id := NEW.id;
    v_before := NULL;
    v_after := to_jsonb(NEW);
  ELSE
    v_entity_id := NEW.id;
    v_before := to_jsonb(OLD);
    v_after := to_jsonb(NEW);
    IF v_before = v_after THEN RETURN NEW; END IF;
  END IF;

  INSERT INTO public.activity_logs (
    entity_type, entity_id, action, user_id, before, after
  ) VALUES (
    TG_TABLE_NAME, v_entity_id, lower(TG_OP),
    auth.uid(), v_before, v_after
  );

  RETURN CASE TG_OP WHEN 'DELETE' THEN OLD ELSE NEW END;
END;
$$;

CREATE TRIGGER trg_audit_projects
AFTER INSERT OR UPDATE OR DELETE ON public.projects
FOR EACH ROW EXECUTE FUNCTION public.activity_audit();

CREATE TRIGGER trg_audit_leads
AFTER INSERT OR UPDATE OR DELETE ON public.leads
FOR EACH ROW EXECUTE FUNCTION public.activity_audit();

CREATE TRIGGER trg_audit_customer_invoices
AFTER INSERT OR UPDATE OR DELETE ON public.customer_invoices
FOR EACH ROW EXECUTE FUNCTION public.activity_audit();

CREATE TRIGGER trg_audit_tasks
AFTER INSERT OR UPDATE OR DELETE ON public.tasks
FOR EACH ROW EXECUTE FUNCTION public.activity_audit();
