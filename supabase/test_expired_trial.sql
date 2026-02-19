-- ============================================
-- Test Data: Expired Trial User
-- Sets up a user with expired 14-day trial for testing
-- ============================================

-- Option 1: Set trial_end_at to past for existing user
-- Replace UUID (without < >) with actual user ID
-- Example: WHERE id = '42d03def-05b6-4a2d-a107-ec00aea32cde';
UPDATE public.profiles
SET 
  plan = 'trial',
  trial_end_at = NOW() - INTERVAL '1 day'
WHERE id = '42d03def-05b6-4a2d-a107-ec00aea32cde';

-- OR Option 2: Check current trial status
-- SELECT id, display_name, plan, trial_end_at, 
--        CASE 
--          WHEN plan = 'trial' AND trial_end_at < NOW() THEN 'EXPIRED'
--          WHEN plan = 'trial' AND trial_end_at > NOW() THEN 'ACTIVE (' || CEIL(EXTRACT(DAY FROM trial_end_at - NOW())) || ' days)'
--          WHEN plan = 'lifetime' THEN 'LIFETIME'
--          WHEN plan = 'cloud_plus' THEN 'CLOUD PLUS'
--        END as status
-- FROM public.profiles
-- WHERE id = '<USER_ID>';

-- Success
DO $$
BEGIN
  RAISE NOTICE '✅ Trial User Test Setup Complete!';
  RAISE NOTICE '';
  RAISE NOTICE 'Instructions:';
  RAISE NOTICE '1. Replace <USER_ID> with actual UUID from auth.users';
  RAISE NOTICE '2. Run the UPDATE query';
  RAISE NOTICE '3. User trial_end_at will be set to yesterday (EXPIRED)';
  RAISE NOTICE '4. When app loads, user should see Paywall/Upgrade screen';
END $$;
