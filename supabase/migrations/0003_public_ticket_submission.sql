-- Phase 21: allow anonymous ticket submissions from the public /ticket form.
-- Applied to Supabase vxzflohvtfrkwycpaxiy.
CREATE POLICY "tickets_public_submit" ON public.tickets
FOR INSERT TO anon
WITH CHECK (
  opener_type IN ('client', 'anonymous')
  AND assigned_to_id IS NULL
);
