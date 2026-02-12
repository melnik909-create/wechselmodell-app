-- Add is_memo column to expenses table
-- For marking 50/50 expenses that should not be calculated in balance
-- Run this in Supabase SQL Editor

-- Add is_memo column
ALTER TABLE public.expenses
ADD COLUMN IF NOT EXISTS is_memo BOOLEAN DEFAULT false;

-- Add comment
COMMENT ON COLUMN public.expenses.is_memo IS '50/50 expenses marked as memo are not calculated in balance (already settled)';

-- Success message
DO $$
BEGIN
  RAISE NOTICE '✅ is_memo column added to expenses table!';
  RAISE NOTICE 'Users can now mark 50/50 expenses as memo (not counted in balance).';
END $$;
