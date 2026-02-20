-- ============================================
-- FIX 1: grant_vip_access - "plan" column ambiguous
-- FIX 2: event_attendances - RLS policy for INSERT
-- Run this in Supabase SQL Editor
-- ============================================

-- =====================
-- FIX 1: Recreate grant_vip_access with unambiguous column names
-- =====================

DROP FUNCTION IF EXISTS public.grant_vip_access(UUID, BOOLEAN);

CREATE OR REPLACE FUNCTION public.grant_vip_access(
  p_user_id UUID,
  granted_by_admin BOOLEAN DEFAULT false
)
RETURNS TABLE (
  success BOOLEAN,
  message TEXT,
  affected_user_id UUID,
  new_plan TEXT,
  new_cloud_until TIMESTAMPTZ
)
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
DECLARE
  v_user_exists BOOLEAN;
  v_plan TEXT;
  v_cloud_until TIMESTAMPTZ;
BEGIN
  SELECT EXISTS(SELECT 1 FROM public.profiles WHERE id = p_user_id)
  INTO v_user_exists;

  IF NOT v_user_exists THEN
    RETURN QUERY SELECT 
      false, 
      'User not found'::TEXT,
      p_user_id,
      NULL::TEXT,
      NULL::TIMESTAMPTZ;
    RETURN;
  END IF;

  UPDATE public.profiles
  SET 
    plan = 'lifetime',
    cloud_until = '2099-12-31'::timestamptz
  WHERE id = p_user_id
  RETURNING profiles.plan, profiles.cloud_until
  INTO v_plan, v_cloud_until;

  RETURN QUERY SELECT 
    true,
    'VIP Access granted successfully (Lifetime + Cloud Plus)'::TEXT,
    p_user_id,
    v_plan,
    v_cloud_until;
END;
$$;

REVOKE ALL ON FUNCTION public.grant_vip_access(UUID, BOOLEAN) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.grant_vip_access(UUID, BOOLEAN) TO authenticated;

-- =====================
-- FIX 2: event_attendances RLS policies
-- Drop old policies and create proper separate ones
-- =====================

DROP POLICY IF EXISTS "Benutzer kann eigene Zusage verwalten" ON public.event_attendances;
DROP POLICY IF EXISTS "Familie kann Event-Zusagen sehen" ON public.event_attendances;

-- SELECT: Family members can see attendances for their family's events
CREATE POLICY "event_attendances_select"
  ON public.event_attendances FOR SELECT
  USING (
    event_id IN (
      SELECT e.id FROM public.events e
      WHERE e.family_id IN (
        SELECT fm.family_id FROM public.family_members fm WHERE fm.user_id = auth.uid()
      )
    )
  );

-- INSERT: User can insert their own attendance for family events
CREATE POLICY "event_attendances_insert"
  ON public.event_attendances FOR INSERT
  WITH CHECK (
    user_id = auth.uid()
    AND event_id IN (
      SELECT e.id FROM public.events e
      WHERE e.family_id IN (
        SELECT fm.family_id FROM public.family_members fm WHERE fm.user_id = auth.uid()
      )
    )
  );

-- UPDATE: User can update their own attendance
CREATE POLICY "event_attendances_update"
  ON public.event_attendances FOR UPDATE
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- DELETE: User can delete their own attendance
CREATE POLICY "event_attendances_delete"
  ON public.event_attendances FOR DELETE
  USING (user_id = auth.uid());

-- =====================
-- Verify
-- =====================
DO $$
BEGIN
  RAISE NOTICE 'Both fixes applied successfully!';
  RAISE NOTICE '1. grant_vip_access: parameter renamed to p_user_id, no more ambiguity';
  RAISE NOTICE '2. event_attendances: separate INSERT/UPDATE/DELETE policies';
END $$;
