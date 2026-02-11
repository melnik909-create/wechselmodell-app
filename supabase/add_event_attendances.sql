-- Add Event Attendances Table (RSVP System)
-- Run this in Supabase SQL Editor

CREATE TABLE IF NOT EXISTS public.event_attendances (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID REFERENCES public.events(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  status TEXT CHECK (status IN ('yes', 'no', 'maybe')) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(event_id, user_id)
);

-- Enable RLS
ALTER TABLE public.event_attendances ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Familie kann Zusagen sehen
CREATE POLICY "Familie kann Event-Zusagen sehen"
  ON public.event_attendances FOR SELECT
  USING (
    event_id IN (
      SELECT e.id FROM public.events e
      WHERE e.family_id IN (
        SELECT family_id FROM public.family_members WHERE user_id = auth.uid()
      )
    )
  );

-- RLS Policy: Benutzer kann eigene Zusage erstellen/ändern
CREATE POLICY "Benutzer kann eigene Zusage verwalten"
  ON public.event_attendances FOR ALL
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Index für Performance
CREATE INDEX idx_event_attendances_event_id ON public.event_attendances(event_id);
CREATE INDEX idx_event_attendances_user_id ON public.event_attendances(user_id);
CREATE INDEX idx_event_attendances_status ON public.event_attendances(status);

-- Success message
DO $$
BEGIN
  RAISE NOTICE 'Event attendances table created successfully! ✅';
END $$;
