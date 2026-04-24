-- Phase 22: project documents via Supabase Storage.
-- Applied to Supabase vxzflohvtfrkwycpaxiy.
-- Private bucket 'project-docs'; objects keyed <project_id>/<filename>.
-- Access via project membership on the first path segment.

INSERT INTO storage.buckets (id, name, public)
VALUES ('project-docs', 'project-docs', false)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "project_docs_read" ON storage.objects
FOR SELECT TO authenticated
USING (
  bucket_id = 'project-docs'
  AND public.is_project_member((storage.foldername(name))[1]::uuid)
);

CREATE POLICY "project_docs_write" ON storage.objects
FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'project-docs'
  AND public.is_project_member((storage.foldername(name))[1]::uuid)
);

CREATE POLICY "project_docs_delete" ON storage.objects
FOR DELETE TO authenticated
USING (
  bucket_id = 'project-docs'
  AND public.is_project_member((storage.foldername(name))[1]::uuid)
);

CREATE POLICY "project_docs_update" ON storage.objects
FOR UPDATE TO authenticated
USING (
  bucket_id = 'project-docs'
  AND public.is_project_member((storage.foldername(name))[1]::uuid)
)
WITH CHECK (
  bucket_id = 'project-docs'
  AND public.is_project_member((storage.foldername(name))[1]::uuid)
);

ALTER TABLE public.documents
  ALTER COLUMN drive_file_id DROP NOT NULL;

ALTER TABLE public.documents
  ADD COLUMN IF NOT EXISTS size_bytes bigint;

ALTER TABLE public.documents
  ADD COLUMN IF NOT EXISTS uploaded_by_id uuid REFERENCES public.user_profiles(id) ON DELETE SET NULL;
