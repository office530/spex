-- Phase 40: RLS on automation_rules + seed 7 default WA templates.
-- Applied to Supabase vxzflohvtfrkwycpaxiy.
-- The rules land inactive — when the WA/email worker ships they can
-- be flipped on without code changes.

ALTER TABLE public.automation_rules ENABLE ROW LEVEL SECURITY;

CREATE POLICY "automation_rules_read" ON public.automation_rules
FOR SELECT TO authenticated USING (public.is_back_office());
CREATE POLICY "automation_rules_write" ON public.automation_rules
FOR INSERT TO authenticated WITH CHECK (public.is_back_office());
CREATE POLICY "automation_rules_update" ON public.automation_rules
FOR UPDATE TO authenticated
USING (public.is_back_office()) WITH CHECK (public.is_back_office());
CREATE POLICY "automation_rules_delete" ON public.automation_rules
FOR DELETE TO authenticated USING (public.is_back_office());

INSERT INTO public.automation_rules (name, trigger_event, conditions, actions, is_active) VALUES
  ('WA ללקוח על הנפקת חשבונית', 'customer_invoice.issued', NULL,
    '{"channel":"whatsapp","template":"invoice_issued","recipient":"client"}'::jsonb, false),
  ('WA על איחור חשבונית (יום 6)', 'customer_invoice.overdue', NULL,
    '{"channel":"whatsapp","template":"invoice_overdue","recipient":"client"}'::jsonb, false),
  ('WA לספק על הנפקת PO', 'purchase_order.issued', NULL,
    '{"channel":"whatsapp","template":"po_issued","recipient":"supplier"}'::jsonb, false),
  ('WA על קבלת בקשת תשלום', 'payment_request.received', NULL,
    '{"channel":"whatsapp","template":"pr_received","recipient":"supplier"}'::jsonb, false),
  ('WA על אישור בקשת תשלום ע״י PM', 'payment_request.pm_approved', NULL,
    '{"channel":"whatsapp","template":"pr_pm_approved","recipient":"supplier_and_back_office"}'::jsonb, false),
  ('WA על תשלום לספק', 'payment_request.paid', NULL,
    '{"channel":"whatsapp","template":"payment_confirmed","recipient":"supplier"}'::jsonb, false),
  ('WA ל-PM על הגעת ליד חדש', 'lead.created', NULL,
    '{"channel":"whatsapp","template":"new_lead_arrival","recipient":"assigned_pm"}'::jsonb, false);
