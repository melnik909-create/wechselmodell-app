-- Fix: Families RLS Policy for INSERT (v2 - using trigger)
-- Problem: DEFAULT auth.uid() doesn't work, need trigger instead

-- Step 1: Drop the old INSERT policy
DROP POLICY IF EXISTS "Authenticated users can create families" ON public.families;

-- Step 2: Create simpler INSERT policy (just check if authenticated)
CREATE POLICY "Authenticated users can create families"
  ON public.families FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

-- Step 3: Create trigger to auto-set created_by
CREATE OR REPLACE FUNCTION public.set_family_created_by()
RETURNS TRIGGER AS $$
BEGIN
  -- Auto-set created_by to current user if not provided
  IF NEW.created_by IS NULL THEN
    NEW.created_by := auth.uid();
  END IF;

  -- Security check: ensure created_by matches auth user
  IF NEW.created_by != auth.uid() THEN
    RAISE EXCEPTION 'created_by must match authenticated user';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Step 4: Attach trigger to families table
DROP TRIGGER IF EXISTS trigger_set_family_created_by ON public.families;
CREATE TRIGGER trigger_set_family_created_by
  BEFORE INSERT ON public.families
  FOR EACH ROW
  EXECUTE FUNCTION public.set_family_created_by();

-- Step 5: Add UPDATE policy for families (was missing!)
DROP POLICY IF EXISTS "Family members can update their family" ON public.families;
CREATE POLICY "Family members can update their family"
  ON public.families FOR UPDATE
  USING (
    id IN (SELECT family_id FROM public.family_members WHERE user_id = auth.uid())
  );

-- Success message
DO $$
BEGIN
  RAISE NOTICE '✅ Families RLS policy fixed (v2)!';
  RAISE NOTICE '✅ Trigger auto-sets created_by to auth.uid()';
  RAISE NOTICE '✅ Security check prevents spoofing';
  RAISE NOTICE '✅ UPDATE policy added';
  RAISE NOTICE 'Users can now create families without RLS errors!';
END $$;
