-- TEIL 1: Tabellen erstellen

-- PROFILES
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name TEXT NOT NULL,
  avatar_url TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- FAMILIES
CREATE TABLE IF NOT EXISTS public.families (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  invite_code TEXT UNIQUE NOT NULL,
  created_by UUID REFERENCES public.profiles(id),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- FAMILY MEMBERS
CREATE TABLE IF NOT EXISTS public.family_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  family_id UUID REFERENCES public.families(id) ON DELETE CASCADE,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('parent_a', 'parent_b')),
  joined_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(family_id, user_id)
);

-- CHILDREN
CREATE TABLE IF NOT EXISTS public.children (
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

-- EMERGENCY CONTACTS
CREATE TABLE IF NOT EXISTS public.emergency_contacts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  child_id UUID REFERENCES public.children(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  relationship TEXT,
  phone TEXT NOT NULL,
  is_primary BOOLEAN DEFAULT false
);

-- CUSTODY PATTERNS
CREATE TABLE IF NOT EXISTS public.custody_patterns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  family_id UUID REFERENCES public.families(id) ON DELETE CASCADE,
  pattern_type TEXT NOT NULL CHECK (pattern_type IN ('7_7', '2_2_5_5', '2_2_3', 'custom')),
  start_date DATE NOT NULL,
  starting_parent TEXT NOT NULL CHECK (starting_parent IN ('parent_a', 'parent_b')),
  custom_sequence TEXT[],
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- CUSTODY EXCEPTIONS
CREATE TABLE IF NOT EXISTS public.custody_exceptions (
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

-- HANDOVERS
CREATE TABLE IF NOT EXISTS public.handovers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  family_id UUID REFERENCES public.families(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  from_parent UUID REFERENCES public.profiles(id),
  to_parent UUID REFERENCES public.profiles(id),
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'completed')),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- HANDOVER ITEMS
CREATE TABLE IF NOT EXISTS public.handover_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  handover_id UUID REFERENCES public.handovers(id) ON DELETE CASCADE,
  category TEXT NOT NULL CHECK (category IN ('clothing', 'medication', 'homework', 'document', 'toy', 'other')),
  description TEXT NOT NULL,
  is_checked BOOLEAN DEFAULT false,
  photo_url TEXT,
  child_id UUID REFERENCES public.children(id),
  sort_order INT DEFAULT 0
);

-- EXPENSES
CREATE TABLE IF NOT EXISTS public.expenses (
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

-- SETTLEMENTS
CREATE TABLE IF NOT EXISTS public.settlements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  family_id UUID REFERENCES public.families(id) ON DELETE CASCADE,
  settled_by UUID REFERENCES public.profiles(id),
  amount NUMERIC(10,2) NOT NULL,
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  settled_at TIMESTAMPTZ DEFAULT now()
);
