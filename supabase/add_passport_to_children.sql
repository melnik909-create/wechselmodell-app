-- Add Passport Number to Children Table
-- Allows storing passport information for children
-- Run this in Supabase SQL Editor

-- Add passport_number column to children table
ALTER TABLE public.children
ADD COLUMN IF NOT EXISTS passport_number TEXT;

-- Add comment
COMMENT ON COLUMN public.children.passport_number IS 'Child passport number for travel documentation.';

-- Success message
DO $$
BEGIN
  RAISE NOTICE 'Passport number column added successfully! ✅';
  RAISE NOTICE 'Users can now store passport information for their children.';
END $$;
