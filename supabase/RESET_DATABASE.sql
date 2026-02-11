-- ⚠️ WARNUNG: Dieses Script löscht ALLE Daten aus der Datenbank!
-- Nur für Entwicklung/Testing verwenden!

-- 1. Lösche alle Daten (in richtiger Reihenfolge wegen Foreign Keys)
DELETE FROM handover_items;
DELETE FROM handovers;
DELETE FROM expenses;
DELETE FROM settlements;
DELETE FROM custody_exceptions;
DELETE FROM custody_patterns;
DELETE FROM emergency_contacts;
DELETE FROM children;
DELETE FROM family_members;
DELETE FROM families;
DELETE FROM profiles;

-- 2. Lösche alle Auth-Benutzer
-- Dies muss im Supabase Dashboard gemacht werden:
-- Authentication → Users → Alle auswählen → Delete

-- ODER über SQL (benötigt Supabase Admin Rechte):
-- DELETE FROM auth.users;

-- 3. Sequenzen zurücksetzen (optional, für saubere IDs)
-- Diese Zeilen nur ausführen, wenn du die ID-Zähler zurücksetzen willst
-- ALTER SEQUENCE IF EXISTS families_id_seq RESTART WITH 1;

-- Fertig! Alle Daten wurden gelöscht.
-- Du kannst jetzt neue Test-Accounts erstellen.
