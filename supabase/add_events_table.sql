-- Add Events/Termine Table
-- Run this in Supabase SQL Editor

CREATE TABLE IF NOT EXISTS public.events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  family_id UUID REFERENCES public.families(id) ON DELETE CASCADE,
  child_id UUID REFERENCES public.children(id) ON DELETE CASCADE, -- optional, NULL = alle Kinder
  title TEXT NOT NULL,
  description TEXT,
  date DATE NOT NULL,
  time TIME, -- optional
  category TEXT NOT NULL CHECK (category IN ('doctor', 'school', 'daycare', 'sports', 'music', 'birthday', 'vacation', 'other')),
  location TEXT,
  created_by UUID REFERENCES public.profiles(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Index for faster queries
CREATE INDEX IF NOT EXISTS idx_events_family_date ON public.events(family_id, date DESC);
CREATE INDEX IF NOT EXISTS idx_events_child ON public.events(child_id);

-- RLS Policies
ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;

-- Policy: Familie kann eigene Events sehen
CREATE POLICY "Familie kann eigene Events sehen"
ON public.events FOR SELECT
TO authenticated
USING (
  family_id IN (
    SELECT family_id FROM public.family_members WHERE user_id = auth.uid()
  )
);

-- Policy: Familie kann Events erstellen
CREATE POLICY "Familie kann Events erstellen"
ON public.events FOR INSERT
TO authenticated
WITH CHECK (
  family_id IN (
    SELECT family_id FROM public.family_members WHERE user_id = auth.uid()
  )
);

-- Policy: Ersteller kann eigene Events updaten
CREATE POLICY "Ersteller kann eigene Events updaten"
ON public.events FOR UPDATE
TO authenticated
USING (created_by = auth.uid());

-- Policy: Ersteller kann eigene Events löschen
CREATE POLICY "Ersteller kann eigene Events löschen"
ON public.events FOR DELETE
TO authenticated
USING (created_by = auth.uid());

-- Function: Update updated_at timestamp
CREATE OR REPLACE FUNCTION public.update_events_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger: Auto-update updated_at
CREATE TRIGGER update_events_updated_at
  BEFORE UPDATE ON public.events
  FOR EACH ROW
  EXECUTE FUNCTION public.update_events_updated_at();

-- Success message
DO $$
BEGIN
  RAISE NOTICE 'Events table created successfully! ✅';
END $$;
