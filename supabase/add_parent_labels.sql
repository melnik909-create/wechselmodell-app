-- Add Parent Labels to Families Table
-- Allows custom naming for Parent A and Parent B (e.g., "Mama", "Papa", custom names)
-- Run this in Supabase SQL Editor

-- Add parent_a_label and parent_b_label columns to families table
ALTER TABLE public.families
ADD COLUMN IF NOT EXISTS parent_a_label TEXT,
ADD COLUMN IF NOT EXISTS parent_b_label TEXT;

-- Add comments
COMMENT ON COLUMN public.families.parent_a_label IS 'Custom display name for Parent A (e.g., "Mama", "Papa"). NULL = use profile display_name.';
COMMENT ON COLUMN public.families.parent_b_label IS 'Custom display name for Parent B (e.g., "Mama", "Papa"). NULL = use profile display_name.';

-- Success message
DO $$
BEGIN
  RAISE NOTICE 'Parent label columns added successfully! ✅';
  RAISE NOTICE 'Users can now set custom names for Parent A and Parent B in settings.';
END $$;
