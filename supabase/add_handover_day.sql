-- Add Handover Day Configuration to Custody Patterns
-- Run this in Supabase SQL Editor

-- Add handover_day column to custody_patterns table
-- 0 = Sunday, 1 = Monday, 2 = Tuesday, 3 = Wednesday, 4 = Thursday, 5 = Friday, 6 = Saturday
-- NULL = not configured (use pattern start date day)
ALTER TABLE public.custody_patterns
ADD COLUMN IF NOT EXISTS handover_day INTEGER CHECK (handover_day >= 0 AND handover_day <= 6);

-- Add comment
COMMENT ON COLUMN public.custody_patterns.handover_day IS 'Day of week when handovers occur (0=Sunday, 1=Monday, ..., 6=Saturday). NULL = use pattern start date day.';

-- Success message
DO $$
BEGIN
  RAISE NOTICE 'Handover day column added successfully! ✅';
END $$;
