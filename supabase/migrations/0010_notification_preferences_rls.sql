-- Phase 41: RLS on notification_preferences + upsert key.
-- Applied to Supabase vxzflohvtfrkwycpaxiy.

ALTER TABLE public.notification_preferences
  ADD CONSTRAINT notification_preferences_unique
  UNIQUE (user_id, event_type, channel);

ALTER TABLE public.notification_preferences ENABLE ROW LEVEL SECURITY;

CREATE POLICY "notification_preferences_own_read" ON public.notification_preferences
FOR SELECT TO authenticated USING (user_id = auth.uid());

CREATE POLICY "notification_preferences_own_write" ON public.notification_preferences
FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());

CREATE POLICY "notification_preferences_own_update" ON public.notification_preferences
FOR UPDATE TO authenticated
USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

CREATE POLICY "notification_preferences_own_delete" ON public.notification_preferences
FOR DELETE TO authenticated USING (user_id = auth.uid());
