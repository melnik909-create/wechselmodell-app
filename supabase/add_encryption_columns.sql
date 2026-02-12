-- ============================================
-- Add Encrypted Columns for Sensitive Data
-- Phase 2: Database Migration (Non-Destructive)
-- ============================================
-- This migration adds encrypted columns (*_enc) alongside existing plaintext columns
-- for backward compatibility. Old columns will be deprecated later.
--
-- Total: 17 new encrypted columns across 3 tables
-- - children: 11 columns
-- - emergency_contacts: 1 column
-- - contacts: 5 columns
-- ============================================

-- CHILDREN TABLE (11 sensible Felder)
ALTER TABLE public.children
ADD COLUMN IF NOT EXISTS passport_number_enc TEXT,
ADD COLUMN IF NOT EXISTS insurance_number_enc TEXT,
ADD COLUMN IF NOT EXISTS allergies_enc TEXT,
ADD COLUMN IF NOT EXISTS blood_type_enc TEXT,
ADD COLUMN IF NOT EXISTS doctor_phone_enc TEXT,
ADD COLUMN IF NOT EXISTS doctor_address_enc TEXT,
ADD COLUMN IF NOT EXISTS doctor_name_enc TEXT,
ADD COLUMN IF NOT EXISTS school_phone_enc TEXT,
ADD COLUMN IF NOT EXISTS school_address_enc TEXT,
ADD COLUMN IF NOT EXISTS daycare_phone_enc TEXT,
ADD COLUMN IF NOT EXISTS notes_enc TEXT;

COMMENT ON COLUMN public.children.passport_number_enc IS 'Encrypted passport number (AES-256-CBC, client-side)';
COMMENT ON COLUMN public.children.insurance_number_enc IS 'Encrypted insurance number (AES-256-CBC, client-side)';
COMMENT ON COLUMN public.children.allergies_enc IS 'Encrypted allergies information (AES-256-CBC, client-side)';
COMMENT ON COLUMN public.children.blood_type_enc IS 'Encrypted blood type (AES-256-CBC, client-side)';
COMMENT ON COLUMN public.children.doctor_phone_enc IS 'Encrypted doctor phone (AES-256-CBC, client-side)';
COMMENT ON COLUMN public.children.doctor_address_enc IS 'Encrypted doctor address (AES-256-CBC, client-side)';
COMMENT ON COLUMN public.children.doctor_name_enc IS 'Encrypted doctor name (AES-256-CBC, client-side)';
COMMENT ON COLUMN public.children.school_phone_enc IS 'Encrypted school phone (AES-256-CBC, client-side)';
COMMENT ON COLUMN public.children.school_address_enc IS 'Encrypted school address (AES-256-CBC, client-side)';
COMMENT ON COLUMN public.children.daycare_phone_enc IS 'Encrypted daycare phone (AES-256-CBC, client-side)';
COMMENT ON COLUMN public.children.notes_enc IS 'Encrypted notes (AES-256-CBC, client-side)';

-- EMERGENCY_CONTACTS TABLE (1 sensibles Feld)
ALTER TABLE public.emergency_contacts
ADD COLUMN IF NOT EXISTS phone_enc TEXT;

COMMENT ON COLUMN public.emergency_contacts.phone_enc IS 'Encrypted phone number (AES-256-CBC, client-side)';

-- CONTACTS TABLE (5 sensible Felder)
ALTER TABLE public.contacts
ADD COLUMN IF NOT EXISTS phone_enc TEXT,
ADD COLUMN IF NOT EXISTS mobile_enc TEXT,
ADD COLUMN IF NOT EXISTS email_enc TEXT,
ADD COLUMN IF NOT EXISTS address_enc TEXT,
ADD COLUMN IF NOT EXISTS notes_enc TEXT;

COMMENT ON COLUMN public.contacts.phone_enc IS 'Encrypted phone number (AES-256-CBC, client-side)';
COMMENT ON COLUMN public.contacts.mobile_enc IS 'Encrypted mobile number (AES-256-CBC, client-side)';
COMMENT ON COLUMN public.contacts.email_enc IS 'Encrypted email address (AES-256-CBC, client-side)';
COMMENT ON COLUMN public.contacts.address_enc IS 'Encrypted address (AES-256-CBC, client-side)';
COMMENT ON COLUMN public.contacts.notes_enc IS 'Encrypted notes (AES-256-CBC, client-side)';

-- Success message
DO $$
BEGIN
  RAISE NOTICE '✅ Encryption columns added successfully!';
  RAISE NOTICE 'Tables affected: children, emergency_contacts, contacts';
  RAISE NOTICE 'Total new encrypted columns: 17';
  RAISE NOTICE '';
  RAISE NOTICE 'Next steps:';
  RAISE NOTICE '1. Deploy updated app with encryption logic';
  RAISE NOTICE '2. Users will see migration screen on first login';
  RAISE NOTICE '3. Client-side encryption will migrate data to *_enc columns';
  RAISE NOTICE '4. Old plaintext columns can be dropped in future migration';
END $$;
