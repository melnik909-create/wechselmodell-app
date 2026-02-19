-- ============================================
-- Payment Integration: Create Payment Intent
-- ============================================
-- This function creates a Stripe PaymentIntent for plan purchases
-- Requires: user to be authenticated (verified in RLS)

CREATE OR REPLACE FUNCTION public.create_payment_intent(
  plan_type TEXT,
  user_email TEXT
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID;
  v_amount INTEGER;
  v_currency TEXT := 'eur';
  v_payment_info JSONB;
BEGIN
  -- Get current user ID
  v_user_id := auth.uid();
  
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- Determine amount based on plan type
  CASE plan_type
    WHEN 'lifetime' THEN
      v_amount := 1499; -- €14.99
    WHEN 'cloud_plus_monthly' THEN
      v_amount := 199; -- €1.99
    WHEN 'cloud_plus_yearly' THEN
      v_amount := 1999; -- €19.99
    ELSE
      RAISE EXCEPTION 'Invalid plan type: %', plan_type;
  END CASE;

  -- Return payment info to be sent to frontend
  -- Frontend will call Stripe to create the payment intent
  v_payment_info := jsonb_build_object(
    'user_id', v_user_id,
    'plan_type', plan_type,
    'amount', v_amount,
    'currency', v_currency,
    'email', user_email,
    'created_at', NOW()
  );

  RETURN v_payment_info;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION public.create_payment_intent(TEXT, TEXT) 
  TO authenticated;

-- ============================================
-- Function: Update plan after successful payment
-- ============================================
CREATE OR REPLACE FUNCTION public.update_plan_after_payment(
  user_id UUID,
  plan_type TEXT,
  stripe_payment_intent_id TEXT
)
RETURNS TABLE (
  success BOOLEAN,
  message TEXT,
  new_plan TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_trial_end TIMESTAMPTZ;
  v_cloud_until TIMESTAMPTZ;
BEGIN
  -- Verify user is updating their own profile
  IF auth.uid() <> user_id AND NOT is_admin(auth.uid()) THEN
    RETURN QUERY SELECT false, 'Unauthorized', NULL::TEXT;
    RETURN;
  END IF;

  -- Update based on plan type
  CASE plan_type
    WHEN 'lifetime' THEN
      UPDATE public.profiles
      SET 
        plan = 'lifetime',
        trial_end_at = NULL,
        stripe_payment_intent_id = stripe_payment_intent_id,
        updated_at = NOW()
      WHERE id = user_id;
      
      RETURN QUERY SELECT true, 'Lifetime plan activated', 'lifetime'::TEXT;
      
    WHEN 'cloud_plus_monthly' THEN
      v_cloud_until := NOW() + INTERVAL '1 month';
      UPDATE public.profiles
      SET 
        plan = CASE 
                 WHEN plan = 'trial' THEN 'cloud_plus'
                 ELSE plan
               END,
        cloud_until = v_cloud_until,
        stripe_payment_intent_id = stripe_payment_intent_id,
        updated_at = NOW()
      WHERE id = user_id;
      
      RETURN QUERY SELECT true, 'Cloud Plus monthly subscription activated', plan FROM public.profiles WHERE id = user_id LIMIT 1;
      
    WHEN 'cloud_plus_yearly' THEN
      v_cloud_until := NOW() + INTERVAL '1 year';
      UPDATE public.profiles
      SET 
        plan = CASE 
                 WHEN plan = 'trial' THEN 'cloud_plus'
                 ELSE plan
               END,
        cloud_until = v_cloud_until,
        stripe_payment_intent_id = stripe_payment_intent_id,
        updated_at = NOW()
      WHERE id = user_id;
      
      RETURN QUERY SELECT true, 'Cloud Plus yearly subscription activated', plan FROM public.profiles WHERE id = user_id LIMIT 1;
      
    ELSE
      RETURN QUERY SELECT false, 'Invalid plan type', NULL::TEXT;
  END CASE;
END;
$$;

-- Grant execute to authenticated users
GRANT EXECUTE ON FUNCTION public.update_plan_after_payment(UUID, TEXT, TEXT) 
  TO authenticated;

-- ============================================
-- Add Stripe columns to profiles table
-- ============================================
-- Check if column exists before adding (safe to run multiple times)
DO $$
BEGIN
  IF NOT EXISTS(SELECT 1 FROM information_schema.columns 
    WHERE table_name='profiles' AND column_name='stripe_payment_intent_id') THEN
    ALTER TABLE public.profiles 
      ADD COLUMN stripe_payment_intent_id TEXT;
  END IF;
END $$;

-- Set permissions on profiles for Stripe
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Helper function to check if user is admin
CREATE OR REPLACE FUNCTION is_admin(check_user_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN EXISTS(
    SELECT 1 FROM public.profiles 
    WHERE id = check_user_id AND role = 'admin'
  );
END;
$$;
