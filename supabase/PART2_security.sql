-- TEIL 2: Row Level Security & Trigger

-- Enable RLS
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.families ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.family_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.children ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.emergency_contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.custody_patterns ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.custody_exceptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.handovers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.handover_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.settlements ENABLE ROW LEVEL SECURITY;

-- Profiles Policies
CREATE POLICY "Users can view own profile"
  ON public.profiles FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Users can update own profile"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile"
  ON public.profiles FOR INSERT
  WITH CHECK (auth.uid() = id);

-- Families Policies
CREATE POLICY "Members can view their family"
  ON public.families FOR SELECT
  USING (
    id IN (SELECT family_id FROM public.family_members WHERE user_id = auth.uid())
  );

CREATE POLICY "Anyone can find family by invite code"
  ON public.families FOR SELECT
  USING (true);

CREATE POLICY "Authenticated users can create families"
  ON public.families FOR INSERT
  WITH CHECK (auth.uid() = created_by);

-- Family Members Policies
CREATE POLICY "Members can view family members"
  ON public.family_members FOR SELECT
  USING (
    family_id IN (SELECT family_id FROM public.family_members WHERE user_id = auth.uid())
  );

CREATE POLICY "Users can join families"
  ON public.family_members FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Children Policies
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

-- Emergency Contacts Policies
CREATE POLICY "Members can manage emergency contacts"
  ON public.emergency_contacts FOR ALL
  USING (
    child_id IN (
      SELECT c.id FROM public.children c
      JOIN public.family_members fm ON fm.family_id = c.family_id
      WHERE fm.user_id = auth.uid()
    )
  );

-- Custody Patterns Policies
CREATE POLICY "Members can view custody patterns"
  ON public.custody_patterns FOR ALL
  USING (
    family_id IN (SELECT family_id FROM public.family_members WHERE user_id = auth.uid())
  );

-- Custody Exceptions Policies
CREATE POLICY "Members can manage exceptions"
  ON public.custody_exceptions FOR ALL
  USING (
    family_id IN (SELECT family_id FROM public.family_members WHERE user_id = auth.uid())
  );

-- Handovers Policies
CREATE POLICY "Members can manage handovers"
  ON public.handovers FOR ALL
  USING (
    family_id IN (SELECT family_id FROM public.family_members WHERE user_id = auth.uid())
  );

-- Handover Items Policies
CREATE POLICY "Members can manage handover items"
  ON public.handover_items FOR ALL
  USING (
    handover_id IN (
      SELECT h.id FROM public.handovers h
      JOIN public.family_members fm ON fm.family_id = h.family_id
      WHERE fm.user_id = auth.uid()
    )
  );

-- Expenses Policies
CREATE POLICY "Members can manage expenses"
  ON public.expenses FOR ALL
  USING (
    family_id IN (SELECT family_id FROM public.family_members WHERE user_id = auth.uid())
  );

-- Settlements Policies
CREATE POLICY "Members can manage settlements"
  ON public.settlements FOR ALL
  USING (
    family_id IN (SELECT family_id FROM public.family_members WHERE user_id = auth.uid())
  );

-- Auto-create profile trigger
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

-- Indexes
CREATE INDEX idx_family_members_user ON public.family_members(user_id);
CREATE INDEX idx_family_members_family ON public.family_members(family_id);
CREATE INDEX idx_children_family ON public.children(family_id);
CREATE INDEX idx_custody_patterns_family ON public.custody_patterns(family_id);
CREATE INDEX idx_custody_exceptions_family_date ON public.custody_exceptions(family_id, date);
CREATE INDEX idx_expenses_family_date ON public.expenses(family_id, date);
CREATE INDEX idx_handovers_family_date ON public.handovers(family_id, date);
CREATE INDEX idx_families_invite_code ON public.families(invite_code);
