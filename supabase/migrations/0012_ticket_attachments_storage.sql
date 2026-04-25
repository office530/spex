-- Phase 44: public ticket attachments via Supabase Storage.
-- Bucket 'ticket-uploads' (private). Anon can INSERT under 'public/<random>/...'.
-- Authenticated users can read; back-office can delete.
-- Soft anon rate-limit: max 3 inserts in 5 minutes per opener_contact / opener_name.

INSERT INTO storage.buckets (id, name, public)
VALUES ('ticket-uploads', 'ticket-uploads', false)
ON CONFLICT (id) DO NOTHING;

-- Anon role: INSERT only, must live under the 'public/' prefix
CREATE POLICY "ticket_uploads_anon_insert" ON storage.objects
FOR INSERT TO anon
WITH CHECK (
  bucket_id = 'ticket-uploads'
  AND (storage.foldername(name))[1] = 'public'
);

-- Authenticated INSERT (e.g. internal manager-opened tickets, future use)
CREATE POLICY "ticket_uploads_auth_insert" ON storage.objects
FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'ticket-uploads');

-- Any authenticated user can read attachments (RLS on tickets table already gates list visibility)
CREATE POLICY "ticket_uploads_auth_select" ON storage.objects
FOR SELECT TO authenticated
USING (bucket_id = 'ticket-uploads');

-- Back-office can delete attachments
CREATE POLICY "ticket_uploads_back_office_delete" ON storage.objects
FOR DELETE TO authenticated
USING (
  bucket_id = 'ticket-uploads'
  AND EXISTS (
    SELECT 1 FROM public.user_profiles up
    WHERE up.id = auth.uid()
      AND up.role IN ('ceo', 'vp', 'cfo', 'office_manager')
  )
);

-- Soft rate-limit on public ticket inserts.
-- Anon submissions with the same opener_contact OR opener_name in the last 5 minutes
-- are capped at 3. Fully anonymous (no contact/name) is left to client-side cooldown
-- and a future captcha/IP-based edge function.
CREATE OR REPLACE FUNCTION public.tickets_anon_rate_limit()
  RETURNS trigger
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path = public, pg_catalog
AS $$
DECLARE
  recent_count int;
BEGIN
  IF auth.uid() IS NULL
     AND (NEW.opener_contact IS NOT NULL OR NEW.opener_name IS NOT NULL)
  THEN
    SELECT count(*) INTO recent_count
    FROM public.tickets
    WHERE created_at > now() - interval '5 minutes'
      AND (
        (NEW.opener_contact IS NOT NULL AND opener_contact = NEW.opener_contact)
        OR (NEW.opener_name IS NOT NULL AND opener_name = NEW.opener_name)
      );

    IF recent_count >= 3 THEN
      RAISE EXCEPTION 'rate_limit_exceeded'
        USING ERRCODE = 'P0001',
              HINT = 'Too many ticket submissions in a short period. Please try again later.';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_tickets_anon_rate_limit ON public.tickets;
CREATE TRIGGER trg_tickets_anon_rate_limit
  BEFORE INSERT ON public.tickets
  FOR EACH ROW
  EXECUTE FUNCTION public.tickets_anon_rate_limit();
