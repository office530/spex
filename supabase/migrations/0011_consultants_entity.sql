-- Phase 43: Consultants entity.
-- Applied to Supabase vxzflohvtfrkwycpaxiy.
-- Back-office CRUD, all authed users can read. Mirrors the suppliers
-- access pattern.

CREATE TABLE public.consultants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  specialty text,
  phone text,
  email text,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.consultants ENABLE ROW LEVEL SECURITY;

CREATE POLICY "consultants_read" ON public.consultants
FOR SELECT TO authenticated USING (true);

CREATE POLICY "consultants_write" ON public.consultants
FOR INSERT TO authenticated WITH CHECK (public.is_back_office());

CREATE POLICY "consultants_update" ON public.consultants
FOR UPDATE TO authenticated
USING (public.is_back_office()) WITH CHECK (public.is_back_office());

CREATE POLICY "consultants_delete" ON public.consultants
FOR DELETE TO authenticated USING (public.is_back_office());
