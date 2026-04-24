-- Phase 38: in-app notifications inbox.
-- Applied to Supabase vxzflohvtfrkwycpaxiy.
-- notification_logs (from Phase 0) is an outbound send-log for WA/email.
-- This table is the user-facing inbox with read/unread state.

CREATE TABLE public.notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.user_profiles(id) ON DELETE CASCADE,
  kind text NOT NULL,
  title text NOT NULL,
  body text,
  link_to text,
  read_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_notifications_user_recent
  ON public.notifications (user_id, created_at DESC);
CREATE INDEX idx_notifications_user_unread
  ON public.notifications (user_id) WHERE read_at IS NULL;

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "notifications_read_own" ON public.notifications
FOR SELECT TO authenticated USING (user_id = auth.uid());

CREATE POLICY "notifications_update_own" ON public.notifications
FOR UPDATE TO authenticated
USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

-- Triggers write notifications on task assignment + ticket assignment.
-- Skip when the actor is assigning to themselves.

CREATE OR REPLACE FUNCTION public.notify_task_assigned()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public, pg_temp AS $$
BEGIN
  IF NEW.assignee_id IS NOT NULL
     AND NEW.assignee_id <> COALESCE(auth.uid(), '00000000-0000-0000-0000-000000000000'::uuid)
     AND (TG_OP = 'INSERT' OR OLD.assignee_id IS DISTINCT FROM NEW.assignee_id)
  THEN
    INSERT INTO public.notifications (user_id, kind, title, body, link_to)
    VALUES (
      NEW.assignee_id,
      'task_assigned',
      NEW.title,
      NEW.description,
      CASE WHEN NEW.project_id IS NOT NULL THEN '/projects/' || NEW.project_id ELSE NULL END
    );
  END IF;
  RETURN NEW;
END; $$;

CREATE TRIGGER trg_notify_task_assigned
AFTER INSERT OR UPDATE OF assignee_id ON public.tasks
FOR EACH ROW EXECUTE FUNCTION public.notify_task_assigned();

CREATE OR REPLACE FUNCTION public.notify_ticket_assigned()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public, pg_temp AS $$
BEGIN
  IF NEW.assigned_to_id IS NOT NULL
     AND NEW.assigned_to_id <> COALESCE(auth.uid(), '00000000-0000-0000-0000-000000000000'::uuid)
     AND (TG_OP = 'INSERT' OR OLD.assigned_to_id IS DISTINCT FROM NEW.assigned_to_id)
  THEN
    INSERT INTO public.notifications (user_id, kind, title, body, link_to)
    VALUES (
      NEW.assigned_to_id,
      'ticket_assigned',
      NEW.subject,
      NEW.body,
      '/tickets/' || NEW.id
    );
  END IF;
  RETURN NEW;
END; $$;

CREATE TRIGGER trg_notify_ticket_assigned
AFTER INSERT OR UPDATE OF assigned_to_id ON public.tickets
FOR EACH ROW EXECUTE FUNCTION public.notify_ticket_assigned();
