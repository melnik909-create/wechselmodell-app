-- ============================================
-- Fix: Trial von 7 auf 14 Tage ändern
-- ============================================

-- 1. Trigger-Funktion aktualisieren: 14 Tage statt 7
CREATE OR REPLACE FUNCTION public.set_trial_period()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
BEGIN
  -- Set trial to 14 days from now
  NEW.trial_end_at := now() + interval '14 days';
  NEW.plan := 'trial';
  RETURN NEW;
END;
$$;

-- 2. Bestehende Trial-User auf 14 Tage ab Erstellung setzen
UPDATE public.profiles
SET trial_end_at = created_at + interval '14 days'
WHERE plan = 'trial';

-- Fertig!
DO $$
BEGIN
  RAISE NOTICE '✅ Trial auf 14 Tage geändert!';
END $$;
