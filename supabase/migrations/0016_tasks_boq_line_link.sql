-- Phase 80: Link tasks to BoQ line items.
-- Adds an optional boq_line_item_id column to tasks so a task can belong to a specific
-- BoQ line. NULL means a project-level (unscoped) task — preserves all existing behavior.
-- The workspace TasksTab uses this column to scope tasks to the active line.
-- RLS already inherits from tasks.project_id, so no policy change needed.
-- Applied to Supabase vxzflohvtfrkwycpaxiy.

ALTER TABLE public.tasks
  ADD COLUMN IF NOT EXISTS boq_line_item_id uuid
  REFERENCES public.boq_line_items(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS tasks_boq_line_item_idx
  ON public.tasks (boq_line_item_id)
  WHERE boq_line_item_id IS NOT NULL;
