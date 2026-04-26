-- Phase 72: Work Log entity (Miro Board 9 / יומן עבודה).
-- Daily on-site logging of crew, hours, and tasks. Status set per
-- Miro: planned (תואם), in_progress (בעבודה), done (בוצע), cancelled (בוטל).
-- RLS: project members (PM, foreman, back-office) can manage; everyone
-- else can't see other projects' work logs.
-- Applied to Supabase vxzflohvtfrkwycpaxiy.

CREATE TYPE public.work_log_status AS ENUM (
  'planned',
  'in_progress',
  'done',
  'cancelled'
);

CREATE TABLE public.work_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  task_id uuid REFERENCES public.tasks(id) ON DELETE SET NULL,
  work_date date NOT NULL,
  hours numeric(5, 2),
  crew_size integer,
  status public.work_log_status NOT NULL DEFAULT 'planned',
  notes text,
  created_by uuid REFERENCES public.user_profiles(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX work_logs_project_idx ON public.work_logs (project_id, work_date DESC);
CREATE INDEX work_logs_created_by_idx ON public.work_logs (created_by);

ALTER TABLE public.work_logs ENABLE ROW LEVEL SECURITY;

-- Read: any project member (back-office implicitly via is_project_member).
CREATE POLICY "work_logs_read" ON public.work_logs
  FOR SELECT TO authenticated
  USING (public.is_project_member(project_id));

-- Insert: any project member can log on their own project.
CREATE POLICY "work_logs_insert" ON public.work_logs
  FOR INSERT TO authenticated
  WITH CHECK (public.is_project_member(project_id));

-- Update: creator can update own entry; back-office can update any.
CREATE POLICY "work_logs_update" ON public.work_logs
  FOR UPDATE TO authenticated
  USING (created_by = auth.uid() OR public.is_back_office())
  WITH CHECK (public.is_project_member(project_id));

-- Delete: creator can delete own entry; back-office can delete any.
CREATE POLICY "work_logs_delete" ON public.work_logs
  FOR DELETE TO authenticated
  USING (created_by = auth.uid() OR public.is_back_office());
