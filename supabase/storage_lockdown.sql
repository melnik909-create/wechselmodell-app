-- ============================================
-- Storage Lockdown: Block Direct Client Access
-- Alle Uploads/Downloads nur noch über Edge Functions
-- ============================================

-- 1. Enable RLS on storage.objects if not already enabled
ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

-- 2. Drop any existing permissive policies
DROP POLICY IF EXISTS "Anyone can upload to buckets" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can update their own files" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can delete their own files" ON storage.objects;
DROP POLICY IF EXISTS "Public access to all files" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can upload" ON storage.objects;

-- 3. Block all direct client access (INSERT/UPDATE/DELETE)
-- Clients MUST use Edge Functions for signed URLs
DROP POLICY IF EXISTS "no_client_insert" ON storage.objects;
CREATE POLICY "no_client_insert"
  ON storage.objects
  FOR INSERT
  TO authenticated
  WITH CHECK (false);

DROP POLICY IF EXISTS "no_client_update" ON storage.objects;
CREATE POLICY "no_client_update"
  ON storage.objects
  FOR UPDATE
  TO authenticated
  USING (false);

DROP POLICY IF EXISTS "no_client_delete" ON storage.objects;
CREATE POLICY "no_client_delete"
  ON storage.objects
  FOR DELETE
  TO authenticated
  USING (false);

-- 4. Block direct SELECT (optional but recommended)
-- Downloads only via signed URLs from Edge Functions
DROP POLICY IF EXISTS "no_client_select" ON storage.objects;
CREATE POLICY "no_client_select"
  ON storage.objects
  FOR SELECT
  TO authenticated
  USING (false);

-- 5. Service Role (Edge Functions) can still do everything
-- No explicit policy needed - service_role bypasses RLS

-- Success message
DO $$
BEGIN
  RAISE NOTICE '🔒 Storage Lockdown complete!';
  RAISE NOTICE '';
  RAISE NOTICE 'Direct client access blocked for:';
  RAISE NOTICE '- INSERT (uploads)';
  RAISE NOTICE '- UPDATE (modifications)';
  RAISE NOTICE '- DELETE (removals)';
  RAISE NOTICE '- SELECT (downloads)';
  RAISE NOTICE '';
  RAISE NOTICE 'All storage operations must now go through Edge Functions:';
  RAISE NOTICE '- create_upload_url (for uploads)';
  RAISE NOTICE '- create_download_url (for downloads)';
  RAISE NOTICE '- settle_family (for cleanup)';
END $$;
