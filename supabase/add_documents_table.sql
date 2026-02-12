-- Create documents table for tracking important documents
CREATE TABLE IF NOT EXISTS public.documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  family_id UUID NOT NULL REFERENCES public.families(id) ON DELETE CASCADE,
  child_id UUID REFERENCES public.children(id) ON DELETE CASCADE,

  -- Document type
  document_type TEXT NOT NULL CHECK (document_type IN (
    'passport',           -- Reisepass
    'health_card',        -- Krankenkarte
    'birth_certificate',  -- Geburtsurkunde
    'school_reports',     -- Zeugnisse
    'vaccination_card',   -- Impfpass
    'other'               -- Sonstiges
  )),

  -- Who has it?
  held_by TEXT CHECK (held_by IN ('parent_a', 'parent_b', 'other', 'unknown')),

  -- Custom name for 'other' type documents
  custom_name TEXT,

  -- Notes
  notes TEXT,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_documents_family_id ON public.documents(family_id);
CREATE INDEX IF NOT EXISTS idx_documents_child_id ON public.documents(child_id);

-- Enable Row Level Security
ALTER TABLE public.documents ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view documents in their family"
  ON public.documents FOR SELECT
  USING (
    family_id IN (
      SELECT family_id FROM public.family_members WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert documents in their family"
  ON public.documents FOR INSERT
  WITH CHECK (
    family_id IN (
      SELECT family_id FROM public.family_members WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update documents in their family"
  ON public.documents FOR UPDATE
  USING (
    family_id IN (
      SELECT family_id FROM public.family_members WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete documents in their family"
  ON public.documents FOR DELETE
  USING (
    family_id IN (
      SELECT family_id FROM public.family_members WHERE user_id = auth.uid()
    )
  );

-- Auto-update trigger
CREATE OR REPLACE FUNCTION update_documents_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER documents_updated_at
  BEFORE UPDATE ON public.documents
  FOR EACH ROW
  EXECUTE FUNCTION update_documents_updated_at();

COMMENT ON TABLE public.documents IS 'Tracking of important documents like passports, health cards, etc.';
