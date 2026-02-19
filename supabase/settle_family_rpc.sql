-- Settle (Quitt) function - deletes all expenses for a family
-- Replaces the Edge Function with a simple SQL RPC
-- Run this in Supabase SQL Editor

CREATE OR REPLACE FUNCTION public.settle_family(family_id_param UUID)
RETURNS JSON
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
DECLARE
  deleted_count INTEGER;
  other_parent_id UUID;
BEGIN
  -- Check authentication
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- Check family membership
  IF NOT EXISTS (
    SELECT 1 FROM public.family_members
    WHERE family_id = family_id_param AND user_id = auth.uid()
  ) THEN
    RAISE EXCEPTION 'Not a family member';
  END IF;

  -- Count expenses before deletion
  SELECT COUNT(*) INTO deleted_count
  FROM public.expenses
  WHERE family_id = family_id_param;

  -- Delete all expenses for this family
  DELETE FROM public.expenses
  WHERE family_id = family_id_param;

  -- Get other parent for notification
  SELECT user_id INTO other_parent_id
  FROM public.family_members
  WHERE family_id = family_id_param AND user_id != auth.uid()
  LIMIT 1;

  RETURN json_build_object(
    'success', true,
    'deletedCount', deleted_count,
    'deletedFiles', 0,
    'failedFiles', 0,
    'otherParentId', other_parent_id
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.settle_family TO authenticated;

-- Success message
DO $$
BEGIN
  RAISE NOTICE 'settle_family RPC function created successfully!';
END $$;
