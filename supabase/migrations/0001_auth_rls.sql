-- Phase 0 step 4a: Supabase Auth + RLS policies
--
-- Coarse-grain RLS per blueprint §7:
--   Back-office (ceo/vp/cfo/office_manager): full access, bypass project filter.
--   PM/Foreman: rows where project_id ∈ their project_members memberships.
--   Reference data (clients, suppliers, leads, contacts, templates): all authed read; back-office write.
--   User-owned (user_profiles, notification_preferences): self manages; back-office bypass.
-- Fine-grained capability checks (e.g. "CFO can issue PO, PM cannot") live in RPC/app layer.

-- ─────────────────────────────────────────────────────────────
-- 1. Link user_profiles.id to auth.users.id
-- ─────────────────────────────────────────────────────────────
ALTER TABLE public.user_profiles
  DROP CONSTRAINT IF EXISTS user_profiles_id_auth_users_id_fk;

ALTER TABLE public.user_profiles
  ADD CONSTRAINT user_profiles_id_auth_users_id_fk
  FOREIGN KEY (id) REFERENCES auth.users(id) ON DELETE CASCADE;

-- ─────────────────────────────────────────────────────────────
-- 2. Auto-provision user_profiles on auth.users INSERT
-- ─────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  INSERT INTO public.user_profiles (id, role, full_name, phone, is_active)
  VALUES (
    NEW.id,
    COALESCE(NULLIF(NEW.raw_user_meta_data ->> 'role', ''), 'pm')::public.user_role,
    COALESCE(NULLIF(NEW.raw_user_meta_data ->> 'full_name', ''), NEW.email),
    NEW.raw_user_meta_data ->> 'phone',
    true
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ─────────────────────────────────────────────────────────────
-- 3. Role helper functions (SECURITY DEFINER to bypass RLS recursion)
-- ─────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.current_user_role()
RETURNS public.user_role
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT role FROM public.user_profiles WHERE id = auth.uid();
$$;

CREATE OR REPLACE FUNCTION public.is_back_office()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT public.current_user_role() IN ('ceo', 'vp', 'cfo', 'office_manager');
$$;

CREATE OR REPLACE FUNCTION public.is_project_member(p_project_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT
    p_project_id IS NOT NULL AND (
      public.is_back_office() OR EXISTS (
        SELECT 1 FROM public.project_members
        WHERE project_id = p_project_id AND user_id = auth.uid()
      )
    );
$$;

GRANT EXECUTE ON FUNCTION public.current_user_role() TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_back_office() TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_project_member(uuid) TO authenticated;

-- ─────────────────────────────────────────────────────────────
-- 4. Enable RLS on all public tables
-- ─────────────────────────────────────────────────────────────
ALTER TABLE public.activity_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.automation_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notification_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notification_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.interactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.boq_chapters ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.boq_line_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.boq_template_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.boq_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.milestone_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.milestones ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payment_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.po_line_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.purchase_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.supplier_invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.suppliers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.customer_quotes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rfqs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.supplier_quote_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.supplier_quotes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.variations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.customer_invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.customer_receipts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.action_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.checklist_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.handover_protocols ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.meeting_minutes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rfis ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.task_dependencies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tickets ENABLE ROW LEVEL SECURITY;

-- ─────────────────────────────────────────────────────────────
-- 5. Policies — user_profiles (self + back-office)
-- ─────────────────────────────────────────────────────────────
CREATE POLICY "user_profiles_select_self_or_admin" ON public.user_profiles
  FOR SELECT TO authenticated
  USING (id = auth.uid() OR public.is_back_office());

CREATE POLICY "user_profiles_update_self_or_admin" ON public.user_profiles
  FOR UPDATE TO authenticated
  USING (id = auth.uid() OR public.is_back_office())
  WITH CHECK (id = auth.uid() OR public.is_back_office());

CREATE POLICY "user_profiles_insert_admin" ON public.user_profiles
  FOR INSERT TO authenticated
  WITH CHECK (public.is_back_office());

CREATE POLICY "user_profiles_delete_admin" ON public.user_profiles
  FOR DELETE TO authenticated
  USING (public.is_back_office());

-- ─────────────────────────────────────────────────────────────
-- 6. Policies — self-owned preferences
-- ─────────────────────────────────────────────────────────────
CREATE POLICY "notification_preferences_self" ON public.notification_preferences
  FOR ALL TO authenticated
  USING (user_id = auth.uid() OR public.is_back_office())
  WITH CHECK (user_id = auth.uid() OR public.is_back_office());

-- ─────────────────────────────────────────────────────────────
-- 7. Policies — back-office-only tables
--    (automation_rules, milestone_templates, boq_templates, boq_template_items,
--     notification_logs, activity_logs)
-- ─────────────────────────────────────────────────────────────
CREATE POLICY "automation_rules_admin" ON public.automation_rules
  FOR ALL TO authenticated
  USING (public.is_back_office()) WITH CHECK (public.is_back_office());

CREATE POLICY "milestone_templates_read" ON public.milestone_templates
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "milestone_templates_write" ON public.milestone_templates
  FOR INSERT TO authenticated WITH CHECK (public.is_back_office());
CREATE POLICY "milestone_templates_update" ON public.milestone_templates
  FOR UPDATE TO authenticated USING (public.is_back_office()) WITH CHECK (public.is_back_office());
CREATE POLICY "milestone_templates_delete" ON public.milestone_templates
  FOR DELETE TO authenticated USING (public.is_back_office());

CREATE POLICY "boq_templates_read" ON public.boq_templates
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "boq_templates_write" ON public.boq_templates
  FOR INSERT TO authenticated WITH CHECK (public.is_back_office());
CREATE POLICY "boq_templates_update" ON public.boq_templates
  FOR UPDATE TO authenticated USING (public.is_back_office()) WITH CHECK (public.is_back_office());
CREATE POLICY "boq_templates_delete" ON public.boq_templates
  FOR DELETE TO authenticated USING (public.is_back_office());

CREATE POLICY "boq_template_items_read" ON public.boq_template_items
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "boq_template_items_write" ON public.boq_template_items
  FOR INSERT TO authenticated WITH CHECK (public.is_back_office());
CREATE POLICY "boq_template_items_update" ON public.boq_template_items
  FOR UPDATE TO authenticated USING (public.is_back_office()) WITH CHECK (public.is_back_office());
CREATE POLICY "boq_template_items_delete" ON public.boq_template_items
  FOR DELETE TO authenticated USING (public.is_back_office());

-- Audit tables: admin read; inserts/updates via SECURITY DEFINER triggers bypass RLS.
CREATE POLICY "notification_logs_admin_read" ON public.notification_logs
  FOR SELECT TO authenticated USING (public.is_back_office() OR user_id = auth.uid());

CREATE POLICY "activity_logs_admin_read" ON public.activity_logs
  FOR SELECT TO authenticated USING (public.is_back_office());

-- ─────────────────────────────────────────────────────────────
-- 8. Policies — global reference data (all authed read; back-office write)
-- ─────────────────────────────────────────────────────────────
CREATE POLICY "clients_read" ON public.clients
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "clients_write" ON public.clients
  FOR INSERT TO authenticated WITH CHECK (public.is_back_office());
CREATE POLICY "clients_update" ON public.clients
  FOR UPDATE TO authenticated USING (public.is_back_office()) WITH CHECK (public.is_back_office());
CREATE POLICY "clients_delete" ON public.clients
  FOR DELETE TO authenticated USING (public.is_back_office());

CREATE POLICY "contacts_read" ON public.contacts
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "contacts_write" ON public.contacts
  FOR INSERT TO authenticated WITH CHECK (public.is_back_office());
CREATE POLICY "contacts_update" ON public.contacts
  FOR UPDATE TO authenticated USING (public.is_back_office()) WITH CHECK (public.is_back_office());
CREATE POLICY "contacts_delete" ON public.contacts
  FOR DELETE TO authenticated USING (public.is_back_office());

CREATE POLICY "suppliers_read" ON public.suppliers
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "suppliers_write" ON public.suppliers
  FOR INSERT TO authenticated WITH CHECK (public.is_back_office());
CREATE POLICY "suppliers_update" ON public.suppliers
  FOR UPDATE TO authenticated USING (public.is_back_office()) WITH CHECK (public.is_back_office());
CREATE POLICY "suppliers_delete" ON public.suppliers
  FOR DELETE TO authenticated USING (public.is_back_office());

-- Leads & interactions: back-office + owner.
CREATE POLICY "leads_read" ON public.leads
  FOR SELECT TO authenticated
  USING (public.is_back_office() OR owner_id = auth.uid());
CREATE POLICY "leads_write" ON public.leads
  FOR INSERT TO authenticated
  WITH CHECK (public.is_back_office() OR owner_id = auth.uid());
CREATE POLICY "leads_update" ON public.leads
  FOR UPDATE TO authenticated
  USING (public.is_back_office() OR owner_id = auth.uid())
  WITH CHECK (public.is_back_office() OR owner_id = auth.uid());
CREATE POLICY "leads_delete" ON public.leads
  FOR DELETE TO authenticated USING (public.is_back_office());

CREATE POLICY "interactions_read" ON public.interactions
  FOR SELECT TO authenticated
  USING (public.is_back_office() OR EXISTS (
    SELECT 1 FROM public.leads l WHERE l.id = interactions.lead_id AND l.owner_id = auth.uid()
  ));
CREATE POLICY "interactions_write" ON public.interactions
  FOR INSERT TO authenticated
  WITH CHECK (public.is_back_office() OR EXISTS (
    SELECT 1 FROM public.leads l WHERE l.id = lead_id AND l.owner_id = auth.uid()
  ));
CREATE POLICY "interactions_update" ON public.interactions
  FOR UPDATE TO authenticated
  USING (public.is_back_office() OR user_id = auth.uid())
  WITH CHECK (public.is_back_office() OR user_id = auth.uid());
CREATE POLICY "interactions_delete" ON public.interactions
  FOR DELETE TO authenticated USING (public.is_back_office());

-- Events: back-office + anyone linked (lead owner or project member).
CREATE POLICY "events_read" ON public.events
  FOR SELECT TO authenticated
  USING (
    public.is_back_office()
    OR public.is_project_member(project_id)
    OR EXISTS (SELECT 1 FROM public.leads l WHERE l.id = events.lead_id AND l.owner_id = auth.uid())
  );
CREATE POLICY "events_write" ON public.events
  FOR ALL TO authenticated
  USING (public.is_back_office() OR public.is_project_member(project_id))
  WITH CHECK (public.is_back_office() OR public.is_project_member(project_id));

-- ─────────────────────────────────────────────────────────────
-- 9. Policies — project-scoped (direct project_id)
-- ─────────────────────────────────────────────────────────────
CREATE POLICY "projects_access" ON public.projects
  FOR ALL TO authenticated
  USING (public.is_project_member(id))
  WITH CHECK (public.is_back_office());

CREATE POLICY "project_members_read" ON public.project_members
  FOR SELECT TO authenticated
  USING (public.is_back_office() OR user_id = auth.uid() OR public.is_project_member(project_id));
CREATE POLICY "project_members_write" ON public.project_members
  FOR INSERT TO authenticated WITH CHECK (public.is_back_office());
CREATE POLICY "project_members_update" ON public.project_members
  FOR UPDATE TO authenticated USING (public.is_back_office()) WITH CHECK (public.is_back_office());
CREATE POLICY "project_members_delete" ON public.project_members
  FOR DELETE TO authenticated USING (public.is_back_office());

CREATE POLICY "boq_chapters_access" ON public.boq_chapters
  FOR ALL TO authenticated
  USING (public.is_project_member(project_id))
  WITH CHECK (public.is_project_member(project_id));

CREATE POLICY "boq_line_items_access" ON public.boq_line_items
  FOR ALL TO authenticated
  USING (public.is_project_member(project_id))
  WITH CHECK (public.is_project_member(project_id));

CREATE POLICY "milestones_access" ON public.milestones
  FOR ALL TO authenticated
  USING (public.is_project_member(project_id))
  WITH CHECK (public.is_project_member(project_id));

CREATE POLICY "expenses_access" ON public.expenses
  FOR ALL TO authenticated
  USING (public.is_project_member(project_id))
  WITH CHECK (public.is_project_member(project_id));

CREATE POLICY "payment_requests_access" ON public.payment_requests
  FOR ALL TO authenticated
  USING (public.is_project_member(project_id))
  WITH CHECK (public.is_project_member(project_id));

CREATE POLICY "purchase_orders_access" ON public.purchase_orders
  FOR ALL TO authenticated
  USING (public.is_project_member(project_id))
  WITH CHECK (public.is_project_member(project_id));

CREATE POLICY "supplier_invoices_access" ON public.supplier_invoices
  FOR ALL TO authenticated
  USING (public.is_project_member(project_id))
  WITH CHECK (public.is_project_member(project_id));

CREATE POLICY "rfqs_access" ON public.rfqs
  FOR ALL TO authenticated
  USING (public.is_project_member(project_id))
  WITH CHECK (public.is_project_member(project_id));

CREATE POLICY "supplier_quotes_access" ON public.supplier_quotes
  FOR ALL TO authenticated
  USING (public.is_project_member(project_id))
  WITH CHECK (public.is_project_member(project_id));

CREATE POLICY "variations_access" ON public.variations
  FOR ALL TO authenticated
  USING (public.is_project_member(project_id))
  WITH CHECK (public.is_project_member(project_id));

CREATE POLICY "customer_invoices_access" ON public.customer_invoices
  FOR ALL TO authenticated
  USING (public.is_project_member(project_id))
  WITH CHECK (public.is_project_member(project_id));

CREATE POLICY "handover_protocols_access" ON public.handover_protocols
  FOR ALL TO authenticated
  USING (public.is_project_member(project_id))
  WITH CHECK (public.is_project_member(project_id));

CREATE POLICY "meeting_minutes_access" ON public.meeting_minutes
  FOR ALL TO authenticated
  USING (public.is_project_member(project_id))
  WITH CHECK (public.is_project_member(project_id));

CREATE POLICY "rfis_access" ON public.rfis
  FOR ALL TO authenticated
  USING (public.is_project_member(project_id))
  WITH CHECK (public.is_project_member(project_id));

CREATE POLICY "documents_access" ON public.documents
  FOR ALL TO authenticated
  USING (public.is_project_member(project_id))
  WITH CHECK (public.is_project_member(project_id));

-- Customer quotes: project-scoped if set, else lead-scoped (owner or back-office).
CREATE POLICY "customer_quotes_access" ON public.customer_quotes
  FOR ALL TO authenticated
  USING (
    public.is_project_member(project_id)
    OR (project_id IS NULL AND (
      public.is_back_office()
      OR EXISTS (SELECT 1 FROM public.leads l WHERE l.id = customer_quotes.lead_id AND l.owner_id = auth.uid())
    ))
  )
  WITH CHECK (
    public.is_project_member(project_id)
    OR (project_id IS NULL AND (
      public.is_back_office()
      OR EXISTS (SELECT 1 FROM public.leads l WHERE l.id = lead_id AND l.owner_id = auth.uid())
    ))
  );

-- Tasks: project-scoped if set, else self-owned (personal tasks).
CREATE POLICY "tasks_access" ON public.tasks
  FOR ALL TO authenticated
  USING (
    (project_id IS NOT NULL AND public.is_project_member(project_id))
    OR (project_id IS NULL AND (assignee_id = auth.uid() OR public.is_back_office()))
  )
  WITH CHECK (
    (project_id IS NOT NULL AND public.is_project_member(project_id))
    OR (project_id IS NULL AND (assignee_id = auth.uid() OR public.is_back_office()))
  );

-- Tickets: public-form inserts go through edge functions with service role (bypass RLS);
-- viewer access is back-office or assigned PM or linked project member.
CREATE POLICY "tickets_read" ON public.tickets
  FOR SELECT TO authenticated
  USING (
    public.is_back_office()
    OR assigned_to_id = auth.uid()
    OR (project_id IS NOT NULL AND public.is_project_member(project_id))
  );
CREATE POLICY "tickets_write" ON public.tickets
  FOR INSERT TO authenticated
  WITH CHECK (public.is_back_office() OR assigned_to_id = auth.uid());
CREATE POLICY "tickets_update" ON public.tickets
  FOR UPDATE TO authenticated
  USING (public.is_back_office() OR assigned_to_id = auth.uid())
  WITH CHECK (public.is_back_office() OR assigned_to_id = auth.uid());
CREATE POLICY "tickets_delete" ON public.tickets
  FOR DELETE TO authenticated USING (public.is_back_office());

-- ─────────────────────────────────────────────────────────────
-- 10. Policies — project-scoped via parent (JOIN-through)
-- ─────────────────────────────────────────────────────────────
CREATE POLICY "po_line_items_access" ON public.po_line_items
  FOR ALL TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.purchase_orders po
    WHERE po.id = po_line_items.po_id AND public.is_project_member(po.project_id)
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.purchase_orders po
    WHERE po.id = po_id AND public.is_project_member(po.project_id)
  ));

CREATE POLICY "supplier_quote_comments_access" ON public.supplier_quote_comments
  FOR ALL TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.supplier_quotes sq
    WHERE sq.id = supplier_quote_comments.quote_id AND public.is_project_member(sq.project_id)
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.supplier_quotes sq
    WHERE sq.id = quote_id AND public.is_project_member(sq.project_id)
  ));

CREATE POLICY "customer_receipts_access" ON public.customer_receipts
  FOR ALL TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.customer_invoices ci
    WHERE ci.id = customer_receipts.invoice_id AND public.is_project_member(ci.project_id)
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.customer_invoices ci
    WHERE ci.id = invoice_id AND public.is_project_member(ci.project_id)
  ));

CREATE POLICY "action_items_access" ON public.action_items
  FOR ALL TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.meeting_minutes mm
    WHERE mm.id = action_items.meeting_id AND public.is_project_member(mm.project_id)
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.meeting_minutes mm
    WHERE mm.id = meeting_id AND public.is_project_member(mm.project_id)
  ));

CREATE POLICY "checklist_items_access" ON public.checklist_items
  FOR ALL TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.tasks t
    WHERE t.id = checklist_items.task_id
    AND (
      (t.project_id IS NOT NULL AND public.is_project_member(t.project_id))
      OR (t.project_id IS NULL AND (t.assignee_id = auth.uid() OR public.is_back_office()))
    )
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.tasks t
    WHERE t.id = task_id
    AND (
      (t.project_id IS NOT NULL AND public.is_project_member(t.project_id))
      OR (t.project_id IS NULL AND (t.assignee_id = auth.uid() OR public.is_back_office()))
    )
  ));

CREATE POLICY "task_dependencies_access" ON public.task_dependencies
  FOR ALL TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.tasks t
    WHERE t.id = task_dependencies.task_id
    AND (
      (t.project_id IS NOT NULL AND public.is_project_member(t.project_id))
      OR (t.project_id IS NULL AND (t.assignee_id = auth.uid() OR public.is_back_office()))
    )
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.tasks t
    WHERE t.id = task_id
    AND (
      (t.project_id IS NOT NULL AND public.is_project_member(t.project_id))
      OR (t.project_id IS NULL AND (t.assignee_id = auth.uid() OR public.is_back_office()))
    )
  ));
