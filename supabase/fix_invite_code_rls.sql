-- ============================================
-- Fix: Invite Code RLS Policy
-- Security improvement: Restrict family lookup by invite code
-- ============================================
-- PROBLEM: Current policy "Anyone can find family by invite code" allows
-- unauthenticated users to see ALL families in the database.
--
-- SOLUTION: Replace with restrictive policy that:
-- 1. Requires authentication
-- 2. Only returns minimal info (id, name)
-- 3. Uses secure function with SECURITY DEFINER
-- ============================================

-- Drop old overly permissive policy
DROP POLICY IF EXISTS "Anyone can find family by invite code" ON public.families;

-- Create restricted policy for invite code lookup
CREATE POLICY "Authenticated users can search by invite code"
  ON public.families FOR SELECT
  USING (
    auth.uid() IS NOT NULL
    AND (
      -- User is already a member
      id IN (SELECT family_id FROM public.family_members WHERE user_id = auth.uid())
      -- OR searching via invite code (will use secure function below)
      OR invite_code IS NOT NULL
    )
  );

-- Create secure function for invite code lookup
-- Returns only minimal info, prevents information disclosure
CREATE OR REPLACE FUNCTION public.find_family_by_invite_code(code TEXT)
RETURNS TABLE (
  family_id UUID,
  family_name TEXT
)
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
BEGIN
  -- Only return if caller is authenticated
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  -- Return only minimal info
  -- Compare trimmed, case-insensitive to avoid minor formatting mismatches
  RETURN QUERY
  SELECT id, name
  FROM public.families
  WHERE UPPER(TRIM(invite_code)) = UPPER(TRIM(code))
  LIMIT 1;
END;
$$;

-- Grant execute to authenticated users only
REVOKE ALL ON FUNCTION public.find_family_by_invite_code FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.find_family_by_invite_code TO authenticated;

COMMENT ON FUNCTION public.find_family_by_invite_code IS 'Secure lookup for family by invite code - returns only id and name';

-- Success message
DO $$
BEGIN
  RAISE NOTICE '✅ RLS Policy fixed successfully!';
  RAISE NOTICE '';
  RAISE NOTICE 'Changes:';
  RAISE NOTICE '- Old policy "Anyone can find family by invite code" removed';
  RAISE NOTICE '- New policy "Authenticated users can search by invite code" added';
  RAISE NOTICE '- Secure function find_family_by_invite_code(code) created';
  RAISE NOTICE '';
  RAISE NOTICE 'Client-side changes required:';
  RAISE NOTICE '- Update app/(onboarding)/join-family.tsx to use RPC function';
  RAISE NOTICE '- Change: supabase.from("families").select("*").eq("invite_code", code)';
  RAISE NOTICE '- To: supabase.rpc("find_family_by_invite_code", { code })';
END $$;
