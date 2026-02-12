-- Create contacts table for family contacts (friends' parents, etc.)
CREATE TABLE IF NOT EXISTS public.contacts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  family_id UUID NOT NULL REFERENCES public.families(id) ON DELETE CASCADE,
  child_id UUID REFERENCES public.children(id) ON DELETE SET NULL,

  -- Contact person info
  name TEXT NOT NULL,
  relationship TEXT, -- e.g., "Eltern von Max", "Oma", "Freund"

  -- Parent info (if applicable)
  parent_1_name TEXT,
  parent_2_name TEXT,
  parents_together BOOLEAN DEFAULT true, -- Zusammen/Getrennt

  -- Contact details
  address TEXT,
  phone TEXT,
  mobile TEXT,
  email TEXT,

  -- Notes
  notes TEXT,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_contacts_family_id ON public.contacts(family_id);
CREATE INDEX IF NOT EXISTS idx_contacts_child_id ON public.contacts(child_id);

-- Enable Row Level Security
ALTER TABLE public.contacts ENABLE ROW LEVEL SECURITY;

-- RLS Policies (same as other family tables)
-- Users can only access contacts for their family
CREATE POLICY "Users can view contacts in their family"
  ON public.contacts FOR SELECT
  USING (
    family_id IN (
      SELECT family_id FROM public.family_members WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert contacts in their family"
  ON public.contacts FOR INSERT
  WITH CHECK (
    family_id IN (
      SELECT family_id FROM public.family_members WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update contacts in their family"
  ON public.contacts FOR UPDATE
  USING (
    family_id IN (
      SELECT family_id FROM public.family_members WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete contacts in their family"
  ON public.contacts FOR DELETE
  USING (
    family_id IN (
      SELECT family_id FROM public.family_members WHERE user_id = auth.uid()
    )
  );

-- Add trigger to update updated_at
CREATE OR REPLACE FUNCTION update_contacts_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER contacts_updated_at
  BEFORE UPDATE ON public.contacts
  FOR EACH ROW
  EXECUTE FUNCTION update_contacts_updated_at();

COMMENT ON TABLE public.contacts IS 'Family contacts like friends parents, relatives, etc.';
