-- ============================================
-- Konto-Löschung als Database Function (RPC)
-- Ersetzt die Edge Function delete_account
-- 
-- Im Supabase SQL Editor ausführen!
-- ============================================

CREATE OR REPLACE FUNCTION public.delete_my_account()
RETURNS JSONB
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
DECLARE
  v_user_id UUID := auth.uid();
  v_family_ids UUID[];
  v_fid UUID;
  v_remaining INT;
  v_result JSONB := '{}'::JSONB;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- Get all family memberships
  SELECT ARRAY_AGG(DISTINCT family_id) INTO v_family_ids
  FROM family_members WHERE user_id = v_user_id;

  -- Delete event_attendances
  DELETE FROM event_attendances WHERE user_id = v_user_id;

  -- Delete push_tokens (if table exists)
  BEGIN
    EXECUTE 'DELETE FROM push_tokens WHERE user_id = $1' USING v_user_id;
  EXCEPTION WHEN undefined_table THEN NULL;
  END;

  -- Delete documents (if table exists)
  BEGIN
    EXECUTE 'DELETE FROM documents WHERE uploaded_by = $1' USING v_user_id;
  EXCEPTION WHEN undefined_table THEN NULL;
  END;

  -- Delete contacts (if table exists)
  BEGIN
    EXECUTE 'DELETE FROM contacts WHERE created_by = $1' USING v_user_id;
  EXCEPTION WHEN undefined_table THEN NULL;
  END;

  IF v_family_ids IS NOT NULL THEN
    FOREACH v_fid IN ARRAY v_family_ids LOOP
      -- Delete user's expenses in this family
      DELETE FROM expenses WHERE family_id = v_fid AND paid_by = v_user_id;

      -- Delete user's custody exceptions
      DELETE FROM custody_exceptions WHERE family_id = v_fid AND proposed_by = v_user_id;

      -- Delete user's events
      BEGIN
        DELETE FROM events WHERE family_id = v_fid AND created_by = v_user_id;
      EXCEPTION WHEN OTHERS THEN NULL;
      END;

      -- Delete user's school tasks
      BEGIN
        EXECUTE 'DELETE FROM school_tasks WHERE family_id = $1 AND created_by = $2' USING v_fid, v_user_id;
      EXCEPTION WHEN undefined_table THEN NULL;
      END;

      -- Handovers: try to null references
      BEGIN
        UPDATE handovers SET from_parent = NULL WHERE family_id = v_fid AND from_parent = v_user_id;
      EXCEPTION WHEN OTHERS THEN NULL;
      END;
      BEGIN
        UPDATE handovers SET to_parent = NULL WHERE family_id = v_fid AND to_parent = v_user_id;
      EXCEPTION WHEN OTHERS THEN NULL;
      END;

      -- Settlements: try to null reference
      BEGIN
        UPDATE settlements SET settled_by = NULL WHERE family_id = v_fid AND settled_by = v_user_id;
      EXCEPTION WHEN OTHERS THEN NULL;
      END;

      -- Remove family membership
      DELETE FROM family_members WHERE family_id = v_fid AND user_id = v_user_id;

      -- If no members left, delete the family (cascades children etc.)
      SELECT COUNT(*) INTO v_remaining FROM family_members WHERE family_id = v_fid;
      IF v_remaining = 0 THEN
        DELETE FROM families WHERE id = v_fid;
      END IF;
    END LOOP;
  END IF;

  -- Delete profile
  DELETE FROM profiles WHERE id = v_user_id;

  -- Delete auth user
  DELETE FROM auth.users WHERE id = v_user_id;

  RETURN jsonb_build_object('success', true, 'user_id', v_user_id);
END;
$$;

-- Grant access to authenticated users
REVOKE ALL ON FUNCTION public.delete_my_account() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.delete_my_account() TO authenticated;
