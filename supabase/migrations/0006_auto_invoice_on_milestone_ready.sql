-- Phase 26: Auto-create customer_invoice when a milestone flips to ready_to_bill.
-- Applied to Supabase vxzflohvtfrkwycpaxiy.
-- Per BLUEPRINT §5.4. Amount = project.contract_value * milestone.billing_pct / 100.
-- Idempotent: only creates if no customer_invoice already exists for this milestone.

CREATE OR REPLACE FUNCTION public.auto_invoice_on_milestone_ready()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_contract_value int;
  v_amount int;
BEGIN
  IF NEW.billing_status = 'ready_to_bill'
     AND (OLD.billing_status IS NULL OR OLD.billing_status IS DISTINCT FROM NEW.billing_status)
  THEN
    IF EXISTS (SELECT 1 FROM public.customer_invoices WHERE milestone_id = NEW.id) THEN
      RETURN NEW;
    END IF;

    SELECT contract_value INTO v_contract_value
    FROM public.projects
    WHERE id = NEW.project_id;

    v_amount := COALESCE(v_contract_value, 0) * COALESCE(NEW.billing_pct, 0) / 100;

    INSERT INTO public.customer_invoices (
      project_id,
      milestone_id,
      kind,
      status,
      amount,
      notes
    )
    VALUES (
      NEW.project_id,
      NEW.id,
      'tax_invoice',
      'awaiting_issuance',
      v_amount,
      'אוטומטית מאבן דרך: ' || NEW.name
    );
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_auto_invoice_on_milestone_ready
AFTER UPDATE OF billing_status ON public.milestones
FOR EACH ROW EXECUTE FUNCTION public.auto_invoice_on_milestone_ready();
