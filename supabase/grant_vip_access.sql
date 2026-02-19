-- ============================================
-- Admin Function: Grant VIP Access
-- Allows admins to grant lifetime + cloud plus to test users
-- ============================================

-- Step 1: Create function to search users by email
CREATE OR REPLACE FUNCTION public.search_user_by_email(search_email TEXT)
RETURNS TABLE (
  id UUID,
  email TEXT,
  display_name TEXT,
  plan TEXT,
  cloud_until TIMESTAMPTZ
)
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
BEGIN
  -- Return user data by email (case-insensitive search)
  RETURN QUERY
  SELECT 
    p.id,
    au.email,
    p.display_name,
    p.plan,
    p.cloud_until
  FROM public.profiles p
  INNER JOIN auth.users au ON p.id = au.id
  WHERE LOWER(au.email) = LOWER(search_email)
  LIMIT 1;
END;
$$;

REVOKE ALL ON FUNCTION public.search_user_by_email(TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.search_user_by_email(TEXT) TO authenticated;

COMMENT ON FUNCTION public.search_user_by_email IS 'Search for user by email address - returns profile + auth info';

-- Step 2: Create the function to grant VIP
CREATE OR REPLACE FUNCTION public.grant_vip_access(
  user_id UUID,
  granted_by_admin BOOLEAN DEFAULT false
)
RETURNS TABLE (
  success BOOLEAN,
  message TEXT,
  user_id UUID,
  plan TEXT,
  cloud_until TIMESTAMPTZ
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
  -- Check if user exists
  SELECT EXISTS(SELECT 1 FROM public.profiles WHERE id = user_id)
  INTO v_user_exists;

  IF NOT v_user_exists THEN
    RETURN QUERY SELECT 
      false, 
      'User not found',
      user_id,
      NULL::TEXT,
      NULL::TIMESTAMPTZ;
    RETURN;
  END IF;

  -- Update user to lifetime + cloud plus
  UPDATE public.profiles
  SET 
    plan = 'lifetime',
    cloud_until = '2099-12-31'::timestamptz
  WHERE id = user_id
  RETURNING plan, cloud_until
  INTO v_plan, v_cloud_until;

  -- Log the VIP grant
  RAISE NOTICE 'VIP Access granted to user %: plan=%, cloud_until=%', user_id, v_plan, v_cloud_until;

  RETURN QUERY SELECT 
    true,
    'VIP Access granted successfully (Lifetime + Cloud Plus)',
    user_id,
    v_plan,
    v_cloud_until;
END;
$$;

REVOKE ALL ON FUNCTION public.grant_vip_access(UUID, BOOLEAN) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.grant_vip_access(UUID, BOOLEAN) TO authenticated;

-- Step 3: Create function to revoke VIP access
CREATE OR REPLACE FUNCTION public.revoke_vip_access(user_id UUID)
RETURNS TABLE (
  success BOOLEAN,
  message TEXT
)
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
DECLARE
  v_user_exists BOOLEAN;
BEGIN
  SELECT EXISTS(SELECT 1 FROM public.profiles WHERE id = user_id)
  INTO v_user_exists;

  IF NOT v_user_exists THEN
    RETURN QUERY SELECT false, 'User not found';
    RETURN;
  END IF;

  UPDATE public.profiles
  SET 
    plan = 'trial',
    cloud_until = NULL
  WHERE id = user_id;

  RAISE NOTICE 'VIP Access revoked for user %', user_id;

  RETURN QUERY SELECT true, 'VIP Access revoked (reset to trial)';
END;
$$;

REVOKE ALL ON FUNCTION public.revoke_vip_access(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.revoke_vip_access(UUID) TO authenticated;

-- Step 4: Success message
DO $$
BEGIN
  RAISE NOTICE '✅ VIP Access Admin Functions created!';
  RAISE NOTICE '';
  RAISE NOTICE 'Available Functions:';
  RAISE NOTICE '  • search_user_by_email(email) - Find user by email';
  RAISE NOTICE '  • grant_vip_access(user_id) - Grant VIP (lifetime + cloud)';
  RAISE NOTICE '  • revoke_vip_access(user_id) - Revoke VIP (reset to trial)';
  RAISE NOTICE '';
  RAISE NOTICE 'Usage Examples:';
  RAISE NOTICE '  SELECT * FROM public.search_user_by_email(''test@example.com'');';
  RAISE NOTICE '  SELECT * FROM public.grant_vip_access(''<user_id>'');';
  RAISE NOTICE '  SELECT * FROM public.revoke_vip_access(''<user_id>'');';
END $$;
