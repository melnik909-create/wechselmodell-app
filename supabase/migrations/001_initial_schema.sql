-- ============================================
-- Wechselmodell App - Initial Database Schema
-- ============================================

-- PROFILES (extends Supabase auth.users)
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name TEXT NOT NULL,
  avatar_url TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own profile"
  ON public.profiles FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Users can update own profile"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile"
  ON public.profiles FOR INSERT
  WITH CHECK (auth.uid() = id);

-- Auto-create profile on user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (id, display_name)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'display_name', 'User'));
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- FAMILIES
CREATE TABLE public.families (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  invite_code TEXT UNIQUE NOT NULL,
  created_by UUID REFERENCES public.profiles(id),
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.families ENABLE ROW LEVEL SECURITY;

-- Users can view families they belong to
CREATE POLICY "Members can view their family"
  ON public.families FOR SELECT
  USING (
    id IN (SELECT family_id FROM public.family_members WHERE user_id = auth.uid())
  );

-- Anyone can view a family by invite code (for joining)
CREATE POLICY "Anyone can find family by invite code"
  ON public.families FOR SELECT
  USING (true);

CREATE POLICY "Authenticated users can create families"
  ON public.families FOR INSERT
  WITH CHECK (auth.uid() = created_by);

-- FAMILY MEMBERS
CREATE TABLE public.family_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  family_id UUID REFERENCES public.families(id) ON DELETE CASCADE,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('parent_a', 'parent_b')),
  joined_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(family_id, user_id)
);

ALTER TABLE public.family_members ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can view family members"
  ON public.family_members FOR SELECT
  USING (
    family_id IN (SELECT family_id FROM public.family_members WHERE user_id = auth.uid())
  );

CREATE POLICY "Users can join families"
  ON public.family_members FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- CHILDREN
CREATE TABLE public.children (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  family_id UUID REFERENCES public.families(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  date_of_birth DATE,
  avatar_url TEXT,
  allergies TEXT,
  blood_type TEXT,
  doctor_name TEXT,
  doctor_phone TEXT,
  doctor_address TEXT,
  school_name TEXT,
  school_phone TEXT,
  school_address TEXT,
  daycare_name TEXT,
  daycare_phone TEXT,
  insurance_name TEXT,
  insurance_number TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.children ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can view children"
  ON public.children FOR SELECT
  USING (
    family_id IN (SELECT family_id FROM public.family_members WHERE user_id = auth.uid())
  );

CREATE POLICY "Members can manage children"
  ON public.children FOR ALL
  USING (
    family_id IN (SELECT family_id FROM public.family_members WHERE user_id = auth.uid())
  );

-- EMERGENCY CONTACTS
CREATE TABLE public.emergency_contacts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  child_id UUID REFERENCES public.children(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  relationship TEXT,
  phone TEXT NOT NULL,
  is_primary BOOLEAN DEFAULT false
);

ALTER TABLE public.emergency_contacts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can view emergency contacts"
  ON public.emergency_contacts FOR ALL
  USING (
    child_id IN (
      SELECT c.id FROM public.children c
      JOIN public.family_members fm ON fm.family_id = c.family_id
      WHERE fm.user_id = auth.uid()
    )
  );

-- CUSTODY PATTERNS
CREATE TABLE public.custody_patterns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  family_id UUID REFERENCES public.families(id) ON DELETE CASCADE,
  pattern_type TEXT NOT NULL CHECK (pattern_type IN ('7_7', '2_2_5_5', '2_2_3', 'custom')),
  start_date DATE NOT NULL,
  starting_parent TEXT NOT NULL CHECK (starting_parent IN ('parent_a', 'parent_b')),
  custom_sequence TEXT[],
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.custody_patterns ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can view custody patterns"
  ON public.custody_patterns FOR ALL
  USING (
    family_id IN (SELECT family_id FROM public.family_members WHERE user_id = auth.uid())
  );

-- CUSTODY EXCEPTIONS
CREATE TABLE public.custody_exceptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  family_id UUID REFERENCES public.families(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  original_parent TEXT NOT NULL CHECK (original_parent IN ('parent_a', 'parent_b')),
  new_parent TEXT NOT NULL CHECK (new_parent IN ('parent_a', 'parent_b')),
  reason TEXT NOT NULL CHECK (reason IN ('vacation', 'sick', 'swap', 'holiday', 'other')),
  note TEXT,
  status TEXT NOT NULL DEFAULT 'proposed' CHECK (status IN ('proposed', 'accepted', 'rejected')),
  proposed_by UUID REFERENCES public.profiles(id),
  responded_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.custody_exceptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can manage exceptions"
  ON public.custody_exceptions FOR ALL
  USING (
    family_id IN (SELECT family_id FROM public.family_members WHERE user_id = auth.uid())
  );

-- HANDOVERS
CREATE TABLE public.handovers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  family_id UUID REFERENCES public.families(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  from_parent UUID REFERENCES public.profiles(id),
  to_parent UUID REFERENCES public.profiles(id),
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'completed')),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.handovers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can manage handovers"
  ON public.handovers FOR ALL
  USING (
    family_id IN (SELECT family_id FROM public.family_members WHERE user_id = auth.uid())
  );

-- HANDOVER ITEMS
CREATE TABLE public.handover_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  handover_id UUID REFERENCES public.handovers(id) ON DELETE CASCADE,
  category TEXT NOT NULL CHECK (category IN ('clothing', 'medication', 'homework', 'document', 'toy', 'other')),
  description TEXT NOT NULL,
  is_checked BOOLEAN DEFAULT false,
  photo_url TEXT,
  child_id UUID REFERENCES public.children(id),
  sort_order INT DEFAULT 0
);

ALTER TABLE public.handover_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can manage handover items"
  ON public.handover_items FOR ALL
  USING (
    handover_id IN (
      SELECT h.id FROM public.handovers h
      JOIN public.family_members fm ON fm.family_id = h.family_id
      WHERE fm.user_id = auth.uid()
    )
  );

-- EXPENSES
CREATE TABLE public.expenses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  family_id UUID REFERENCES public.families(id) ON DELETE CASCADE,
  child_id UUID REFERENCES public.children(id),
  amount NUMERIC(10,2) NOT NULL,
  description TEXT NOT NULL,
  category TEXT NOT NULL CHECK (category IN (
    'clothing', 'medical', 'school', 'daycare', 'sports',
    'music', 'food', 'transport', 'vacation', 'other'
  )),
  paid_by UUID REFERENCES public.profiles(id) NOT NULL,
  split_type TEXT NOT NULL DEFAULT '50_50' CHECK (split_type IN ('50_50', 'custom')),
  split_percentage NUMERIC(5,2) DEFAULT 50.00,
  receipt_url TEXT,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.expenses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can manage expenses"
  ON public.expenses FOR ALL
  USING (
    family_id IN (SELECT family_id FROM public.family_members WHERE user_id = auth.uid())
  );

-- SETTLEMENTS
CREATE TABLE public.settlements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  family_id UUID REFERENCES public.families(id) ON DELETE CASCADE,
  settled_by UUID REFERENCES public.profiles(id),
  amount NUMERIC(10,2) NOT NULL,
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  settled_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.settlements ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can manage settlements"
  ON public.settlements FOR ALL
  USING (
    family_id IN (SELECT family_id FROM public.family_members WHERE user_id = auth.uid())
  );

-- INDEXES for performance
CREATE INDEX idx_family_members_user ON public.family_members(user_id);
CREATE INDEX idx_family_members_family ON public.family_members(family_id);
CREATE INDEX idx_children_family ON public.children(family_id);
CREATE INDEX idx_custody_patterns_family ON public.custody_patterns(family_id);
CREATE INDEX idx_custody_exceptions_family_date ON public.custody_exceptions(family_id, date);
CREATE INDEX idx_expenses_family_date ON public.expenses(family_id, date);
CREATE INDEX idx_handovers_family_date ON public.handovers(family_id, date);
CREATE INDEX idx_families_invite_code ON public.families(invite_code);
