-- Add School Tasks Table
-- Run this in Supabase SQL Editor

CREATE TABLE IF NOT EXISTS public.school_tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  family_id UUID REFERENCES public.families(id) ON DELETE CASCADE NOT NULL,
  child_id UUID REFERENCES public.children(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  due_date DATE,
  priority TEXT CHECK (priority IN ('low', 'medium', 'high')) DEFAULT 'medium',
  status TEXT CHECK (status IN ('pending', 'completed')) DEFAULT 'pending',
  created_by UUID REFERENCES auth.users(id) NOT NULL,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.school_tasks ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Familie kann eigene Aufgaben sehen
CREATE POLICY "Familie kann eigene Schul-Aufgaben sehen"
  ON public.school_tasks FOR ALL
  USING (
    family_id IN (
      SELECT family_id FROM public.family_members WHERE user_id = auth.uid()
    )
  );

-- Index für Performance
CREATE INDEX idx_school_tasks_family_id ON public.school_tasks(family_id);
CREATE INDEX idx_school_tasks_child_id ON public.school_tasks(child_id);
CREATE INDEX idx_school_tasks_due_date ON public.school_tasks(due_date);
CREATE INDEX idx_school_tasks_status ON public.school_tasks(status);

-- Success message
DO $$
BEGIN
  RAISE NOTICE 'School tasks table created successfully! ✅';
END $$;
