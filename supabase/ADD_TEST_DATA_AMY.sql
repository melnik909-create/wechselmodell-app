-- Test-Daten für Amy hinzufügen
-- Führe dies im Supabase SQL Editor aus

-- 1. Finde Amy's ID (ändere "Amy" wenn der Name anders ist)
-- SELECT id, family_id FROM children WHERE name = 'Amy';

-- 2. Füge Test-Daten hinzu (ersetze YOUR_AMY_ID mit der echten ID von oben)
UPDATE children
SET
  date_of_birth = '2018-05-15',
  allergies = 'Erdnüsse, Laktoseintoleranz',
  blood_type = 'A+',
  doctor_name = 'Dr. Maria Schmidt',
  doctor_phone = '+49 30 12345678',
  doctor_address = 'Hauptstraße 123, 10115 Berlin',
  school_name = 'Grundschule am Stadtpark',
  school_phone = '+49 30 98765432',
  school_address = 'Schulweg 5, 10115 Berlin',
  insurance_name = 'TK - Techniker Krankenkasse',
  insurance_number = 'K123456789',
  notes = 'Nimmt montags Schwimmunterricht. Bitte Schwimmtasche nicht vergessen! Liebt Dinosaurier und Pizza.'
WHERE name = 'Amy';

-- 3. Füge Notfallkontakte hinzu
-- Ersetze YOUR_AMY_ID mit Amy's ID
INSERT INTO emergency_contacts (child_id, name, relationship, phone, is_primary)
VALUES
  ('YOUR_AMY_ID', 'Oma Helga', 'Großmutter', '+49 30 11111111', true),
  ('YOUR_AMY_ID', 'Onkel Thomas', 'Onkel', '+49 30 22222222', false);

-- Fertig! Jetzt die App neu laden und Amy anklicken.
