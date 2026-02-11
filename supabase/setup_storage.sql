-- Setup Supabase Storage for Image Uploads
-- Run this in Supabase SQL Editor or Dashboard -> Storage

-- 1. Create storage buckets (must be done via Supabase Dashboard -> Storage)
-- Bucket name: 'receipts' (for expense receipts)
-- Bucket name: 'handover-photos' (for handover checklist photos)
-- Bucket name: 'avatars' (for child/profile avatars)
-- All buckets should be PRIVATE (not public)

-- 2. Set up RLS policies for receipts bucket
-- Policy name: "Familie kann eigene Belege sehen"
-- Allowed operation: SELECT
-- Target roles: authenticated
-- USING expression:
-- (bucket_id = 'receipts') AND (
--   (storage.foldername(name))[1] IN (
--     SELECT family_id::text FROM family_members WHERE user_id = auth.uid()
--   )
-- )

-- Policy name: "Familie kann Belege hochladen"
-- Allowed operation: INSERT
-- Target roles: authenticated
-- WITH CHECK expression:
-- (bucket_id = 'receipts') AND (
--   (storage.foldername(name))[1] IN (
--     SELECT family_id::text FROM family_members WHERE user_id = auth.uid()
--   )
-- )

-- Policy name: "Uploader kann eigene Belege löschen"
-- Allowed operation: DELETE
-- Target roles: authenticated
-- USING expression:
-- (bucket_id = 'receipts') AND (
--   owner = auth.uid()
-- )

-- 3. Same policies for 'handover-photos' bucket
-- 4. Same policies for 'avatars' bucket

-- Note: Storage policies must be created via Supabase Dashboard -> Storage -> Policies
-- File structure: {bucket}/{family_id}/{file_name}

-- Success message
DO $$
BEGIN
  RAISE NOTICE 'Storage setup instructions ready! Create buckets in Supabase Dashboard -> Storage ✅';
END $$;
