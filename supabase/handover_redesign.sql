-- Handover Redesign: Mitgabe + Quittierung Flow
-- Adds confirmation tracking to handovers and handover_items
-- Run this in Supabase SQL Editor

-- Step 1: Add confirmation tracking columns to handover_items
ALTER TABLE public.handover_items
ADD COLUMN IF NOT EXISTS confirmed BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS confirmed_by UUID REFERENCES public.profiles(id),
ADD COLUMN IF NOT EXISTS confirmed_at TIMESTAMPTZ;

-- Step 2: Add confirmation tracking to handovers
ALTER TABLE public.handovers
ADD COLUMN IF NOT EXISTS confirmed_by UUID REFERENCES public.profiles(id),
ADD COLUMN IF NOT EXISTS confirmed_at TIMESTAMPTZ;

-- Step 3: Comments
COMMENT ON COLUMN public.handover_items.confirmed IS 'Receiver confirmed this item was received';
COMMENT ON COLUMN public.handover_items.confirmed_by IS 'User who confirmed receipt of this item';
COMMENT ON COLUMN public.handover_items.confirmed_at IS 'When this item was confirmed';
COMMENT ON COLUMN public.handovers.confirmed_by IS 'User who confirmed the full handover';
COMMENT ON COLUMN public.handovers.confirmed_at IS 'When the handover was fully confirmed';

-- Step 4: Index for faster lookups
CREATE INDEX IF NOT EXISTS idx_handover_items_confirmed
  ON public.handover_items(handover_id, confirmed);

-- Success
DO $$
BEGIN
  RAISE NOTICE 'Handover redesign migration completed successfully!';
END $$;
