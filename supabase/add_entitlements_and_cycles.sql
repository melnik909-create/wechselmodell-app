-- ============================================
-- Migration: Add Entitlements & Settlement Cycles
-- Zweck: Trial/Lifetime/Cloud Plus + 2-Monats-Abrechnung
-- ============================================

-- 1. ENTITLEMENTS: Extend profiles table
-- ============================================
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS plan TEXT NOT NULL DEFAULT 'trial',
ADD COLUMN IF NOT EXISTS trial_end_at TIMESTAMPTZ NULL,
ADD COLUMN IF NOT EXISTS cloud_until TIMESTAMPTZ NULL;

-- Add constraints (skip if already exists)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'profiles_plan_check'
  ) THEN
    ALTER TABLE public.profiles
    ADD CONSTRAINT profiles_plan_check
    CHECK (plan IN ('trial', 'lifetime', 'cloud_plus'));
  END IF;
END $$;

-- Add comment
COMMENT ON COLUMN public.profiles.plan IS 'Subscription plan: trial | lifetime | cloud_plus';
COMMENT ON COLUMN public.profiles.trial_end_at IS 'Trial expires at this timestamp (14 days after registration)';
COMMENT ON COLUMN public.profiles.cloud_until IS 'Cloud Plus active until this timestamp';

-- 2. SETTLEMENT CYCLES: Extend families table
-- ============================================
ALTER TABLE public.families
ADD COLUMN IF NOT EXISTS cycle_started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
ADD COLUMN IF NOT EXISTS next_settlement_due_at TIMESTAMPTZ NULL;

-- Add comment
COMMENT ON COLUMN public.families.cycle_started_at IS 'Current expense tracking cycle started at';
COMMENT ON COLUMN public.families.next_settlement_due_at IS 'Next mandatory settlement due at (cycle_started_at + 2 months)';

-- 3. FUNCTION: Auto-set trial_end_at on user creation
-- ============================================
CREATE OR REPLACE FUNCTION public.set_trial_period()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
BEGIN
  -- Set trial to 7 days from now
  NEW.trial_end_at := now() + interval '7 days';
  NEW.plan := 'trial';
  RETURN NEW;
END;
$$;

-- Trigger: Set trial on profile insert
DROP TRIGGER IF EXISTS on_profile_created_set_trial ON public.profiles;
CREATE TRIGGER on_profile_created_set_trial
  BEFORE INSERT ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.set_trial_period();

-- 4. FUNCTION: Auto-set next_settlement_due_at on family creation
-- ============================================
CREATE OR REPLACE FUNCTION public.set_settlement_cycle()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
BEGIN
  -- Set next settlement to 2 months from cycle start
  NEW.next_settlement_due_at := NEW.cycle_started_at + interval '2 months';
  RETURN NEW;
END;
$$;

-- Trigger: Set cycle on family insert/update
DROP TRIGGER IF EXISTS on_family_cycle_update ON public.families;
CREATE TRIGGER on_family_cycle_update
  BEFORE INSERT OR UPDATE OF cycle_started_at ON public.families
  FOR EACH ROW
  EXECUTE FUNCTION public.set_settlement_cycle();

-- 5. BACKFILL: Set trial_end_at for existing users (if any)
-- ============================================
UPDATE public.profiles
SET trial_end_at = created_at + interval '7 days',
    plan = 'trial'
WHERE trial_end_at IS NULL;

-- 6. BACKFILL: Set cycle for existing families (if any)
-- ============================================
UPDATE public.families
SET cycle_started_at = created_at,
    next_settlement_due_at = created_at + interval '2 months'
WHERE next_settlement_due_at IS NULL;

-- 7. RPC FUNCTION: Grant Lifetime (for testing / IAP webhook later)
-- ============================================
CREATE OR REPLACE FUNCTION public.grant_lifetime(user_id_param UUID)
RETURNS void
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
BEGIN
  UPDATE public.profiles
  SET plan = 'lifetime',
      trial_end_at = NULL
  WHERE id = user_id_param;
END;
$$;

GRANT EXECUTE ON FUNCTION public.grant_lifetime TO authenticated;

-- 8. RPC FUNCTION: Grant Cloud Plus (for testing / IAP webhook later)
-- ============================================
CREATE OR REPLACE FUNCTION public.grant_cloud_plus(
  user_id_param UUID,
  duration_months INT DEFAULT 1
)
RETURNS void
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
BEGIN
  UPDATE public.profiles
  SET plan = 'cloud_plus',
      cloud_until = now() + (duration_months || ' months')::interval
  WHERE id = user_id_param;
END;
$$;

GRANT EXECUTE ON FUNCTION public.grant_cloud_plus TO authenticated;

-- 9. RPC FUNCTION: Reset Settlement Cycle (called after Quitt)
-- ============================================
CREATE OR REPLACE FUNCTION public.reset_settlement_cycle(family_id_param UUID)
RETURNS void
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
BEGIN
  -- Check if user is member of this family
  IF NOT EXISTS (
    SELECT 1 FROM public.family_members
    WHERE family_id = family_id_param AND user_id = auth.uid()
  ) THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;

  -- Reset cycle
  UPDATE public.families
  SET cycle_started_at = now(),
      next_settlement_due_at = now() + interval '2 months'
  WHERE id = family_id_param;
END;
$$;

GRANT EXECUTE ON FUNCTION public.reset_settlement_cycle TO authenticated;

-- Success message
DO $$
BEGIN
  RAISE NOTICE '✅ Entitlements & Settlement Cycles Migration complete!';
  RAISE NOTICE '';
  RAISE NOTICE 'Added to profiles:';
  RAISE NOTICE '- plan (trial | lifetime | cloud_plus)';
  RAISE NOTICE '- trial_end_at (7 days from registration)';
  RAISE NOTICE '- cloud_until (Cloud Plus expiration)';
  RAISE NOTICE '';
  RAISE NOTICE 'Added to families:';
  RAISE NOTICE '- cycle_started_at (current cycle start)';
  RAISE NOTICE '- next_settlement_due_at (mandatory settlement date)';
  RAISE NOTICE '';
  RAISE NOTICE 'Functions created:';
  RAISE NOTICE '- grant_lifetime(user_id)';
  RAISE NOTICE '- grant_cloud_plus(user_id, duration_months)';
  RAISE NOTICE '- reset_settlement_cycle(family_id)';
END $$;
