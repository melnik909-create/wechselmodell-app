-- ============================================
-- Fix: Familie erstellen via SECURITY DEFINER Funktion
-- Umgeht RLS komplett fuer INSERT
-- ============================================

-- 1. Server-Funktion: Familie erstellen + Mitglied hinzufuegen
CREATE OR REPLACE FUNCTION public.create_family_with_member(
  family_name TEXT,
  invite_code_param TEXT
)
RETURNS JSON
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
DECLARE
  new_family_id UUID;
  result JSON;
BEGIN
  -- Pruefe ob User eingeloggt ist
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- Familie erstellen
  INSERT INTO public.families (name, invite_code, created_by)
  VALUES (family_name, invite_code_param, auth.uid())
  RETURNING id INTO new_family_id;

  -- User als parent_a hinzufuegen
  INSERT INTO public.family_members (family_id, user_id, role)
  VALUES (new_family_id, auth.uid(), 'parent_a');

  -- Ergebnis zurueckgeben
  SELECT json_build_object(
    'id', f.id,
    'name', f.name,
    'invite_code', f.invite_code,
    'created_by', f.created_by,
    'created_at', f.created_at
  ) INTO result
  FROM public.families f
  WHERE f.id = new_family_id;

  RETURN result;
END;
$$;

GRANT EXECUTE ON FUNCTION public.create_family_with_member TO authenticated;

-- 2. Sicherheitshalber: RLS Policies aufraumen
ALTER TABLE public.families
ALTER COLUMN created_by SET DEFAULT auth.uid();

DROP POLICY IF EXISTS "Authenticated users can create families" ON public.families;
CREATE POLICY "Authenticated users can create families"
  ON public.families FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "Members can update their family" ON public.families;
CREATE POLICY "Members can update their family"
  ON public.families FOR UPDATE
  USING (
    id IN (SELECT family_id FROM public.family_members WHERE user_id = auth.uid())
  );

DO $$
BEGIN
  RAISE NOTICE 'create_family_with_member() erstellt!';
END $$;
