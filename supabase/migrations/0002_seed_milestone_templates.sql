-- Phase 3b: seed 11 default milestone templates and auto-seed new projects.
--
-- Applied to Supabase project vxzflohvtfrkwycpaxiy as migration
-- 20260424_seed_milestone_templates_and_auto_seed_trigger.
--
-- Note: Hebrew names and billing percentages below are sensible defaults for
-- the Israeli renovation flow (source: Miro board). Review and adjust via the
-- admin UI (Phase 3c) or SQL as needed. Billing percentages sum to 100%.

INSERT INTO milestone_templates (name, default_billing_pct, sort_order) VALUES
  ('פתיחת פרויקט',        0,  0),
  ('מקדמה',               15, 1),
  ('הריסה ופירוק',        5,  2),
  ('שלד ואינסטלציה',      15, 3),
  ('חשמל ותקשורת',        10, 4),
  ('טיח וריצוף',          15, 5),
  ('נגרות ודלתות',        10, 6),
  ('מטבח ואמבטיה',        10, 7),
  ('צבע וגימורים',        10, 8),
  ('ניקיון וגימור',       5,  9),
  ('מסירה',               5,  10);

-- Clone templates into per-project milestones whenever a project is inserted.
-- SECURITY DEFINER so the trigger bypasses RLS on the milestones table — the
-- project creator may not yet be a project_member when this fires.
CREATE OR REPLACE FUNCTION public.seed_project_milestones()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  INSERT INTO public.milestones (project_id, name, name_he, billing_pct, sort_order)
  SELECT NEW.id, name, name_he, COALESCE(default_billing_pct, 0), sort_order
  FROM public.milestone_templates
  ORDER BY sort_order;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_seed_project_milestones
AFTER INSERT ON public.projects
FOR EACH ROW EXECUTE FUNCTION public.seed_project_milestones();
