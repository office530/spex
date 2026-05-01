-- Phase 77: BoQ line-item QC checks + threaded comments.
-- Each BoQ line item gets its own quality-control checklist. Each check can have a
-- threaded comment discussion. RLS: project members read; back-office or assigned PM
-- can CRUD checks; project members can update status (foreman included); comment
-- authors or back-office can edit/delete their own comments.
-- Applied to Supabase vxzflohvtfrkwycpaxiy.

CREATE TYPE qc_check_status AS ENUM ('pending', 'in_progress', 'done', 'failed', 'waiting');

CREATE TABLE public.boq_line_item_checks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  line_item_id uuid NOT NULL REFERENCES public.boq_line_items(id) ON DELETE CASCADE,
  description text NOT NULL,
  status qc_check_status NOT NULL DEFAULT 'pending',
  assigned_to uuid REFERENCES public.user_profiles(id) ON DELETE SET NULL,
  due_date date,
  completed_by uuid REFERENCES public.user_profiles(id) ON DELETE SET NULL,
  completed_at timestamptz,
  notes text,
  sort_order integer NOT NULL DEFAULT 0,
  created_by uuid REFERENCES public.user_profiles(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX boq_line_item_checks_line_idx ON public.boq_line_item_checks (line_item_id, sort_order);
CREATE INDEX boq_line_item_checks_assigned_idx ON public.boq_line_item_checks (assigned_to) WHERE assigned_to IS NOT NULL;

CREATE TABLE public.boq_qc_comments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  qc_check_id uuid NOT NULL REFERENCES public.boq_line_item_checks(id) ON DELETE CASCADE,
  author_id uuid REFERENCES public.user_profiles(id) ON DELETE SET NULL,
  body text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX boq_qc_comments_check_idx ON public.boq_qc_comments (qc_check_id, created_at);

ALTER TABLE public.boq_line_item_checks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.boq_qc_comments ENABLE ROW LEVEL SECURITY;

-- ── boq_line_item_checks policies ──
CREATE POLICY boq_qc_checks_read ON public.boq_line_item_checks
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.boq_line_items bli
      JOIN public.boq_chapters bc ON bc.id = bli.chapter_id
      WHERE bli.id = boq_line_item_checks.line_item_id
        AND public.is_project_member(bc.project_id)
    )
  );

CREATE POLICY boq_qc_checks_insert ON public.boq_line_item_checks
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.boq_line_items bli
      JOIN public.boq_chapters bc ON bc.id = bli.chapter_id
      WHERE bli.id = line_item_id
        AND (
          public.is_back_office()
          OR EXISTS (
            SELECT 1 FROM public.projects p
            WHERE p.id = bc.project_id AND p.pm_id = auth.uid()
          )
        )
    )
  );

CREATE POLICY boq_qc_checks_update ON public.boq_line_item_checks
  FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.boq_line_items bli
      JOIN public.boq_chapters bc ON bc.id = bli.chapter_id
      WHERE bli.id = boq_line_item_checks.line_item_id
        AND public.is_project_member(bc.project_id)
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.boq_line_items bli
      JOIN public.boq_chapters bc ON bc.id = bli.chapter_id
      WHERE bli.id = line_item_id
        AND public.is_project_member(bc.project_id)
    )
  );

CREATE POLICY boq_qc_checks_delete ON public.boq_line_item_checks
  FOR DELETE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.boq_line_items bli
      JOIN public.boq_chapters bc ON bc.id = bli.chapter_id
      WHERE bli.id = boq_line_item_checks.line_item_id
        AND (
          public.is_back_office()
          OR EXISTS (
            SELECT 1 FROM public.projects p
            WHERE p.id = bc.project_id AND p.pm_id = auth.uid()
          )
        )
    )
  );

-- ── boq_qc_comments policies ──
CREATE POLICY boq_qc_comments_read ON public.boq_qc_comments
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.boq_line_item_checks qc
      JOIN public.boq_line_items bli ON bli.id = qc.line_item_id
      JOIN public.boq_chapters bc ON bc.id = bli.chapter_id
      WHERE qc.id = boq_qc_comments.qc_check_id
        AND public.is_project_member(bc.project_id)
    )
  );

CREATE POLICY boq_qc_comments_insert ON public.boq_qc_comments
  FOR INSERT TO authenticated
  WITH CHECK (
    author_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM public.boq_line_item_checks qc
      JOIN public.boq_line_items bli ON bli.id = qc.line_item_id
      JOIN public.boq_chapters bc ON bc.id = bli.chapter_id
      WHERE qc.id = qc_check_id
        AND public.is_project_member(bc.project_id)
    )
  );

CREATE POLICY boq_qc_comments_update ON public.boq_qc_comments
  FOR UPDATE TO authenticated
  USING (author_id = auth.uid() OR public.is_back_office())
  WITH CHECK (author_id = auth.uid() OR public.is_back_office());

CREATE POLICY boq_qc_comments_delete ON public.boq_qc_comments
  FOR DELETE TO authenticated
  USING (author_id = auth.uid() OR public.is_back_office());
