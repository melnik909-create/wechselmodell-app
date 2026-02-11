-- ⚠️ Löscht ALLE Benutzer und Daten! Nur für Entwicklung!

-- Schritt 1: RLS temporär deaktivieren (wichtig!)
ALTER TABLE handover_items DISABLE ROW LEVEL SECURITY;
ALTER TABLE handovers DISABLE ROW LEVEL SECURITY;
ALTER TABLE expenses DISABLE ROW LEVEL SECURITY;
ALTER TABLE settlements DISABLE ROW LEVEL SECURITY;
ALTER TABLE custody_exceptions DISABLE ROW LEVEL SECURITY;
ALTER TABLE custody_patterns DISABLE ROW LEVEL SECURITY;
ALTER TABLE emergency_contacts DISABLE ROW LEVEL SECURITY;
ALTER TABLE children DISABLE ROW LEVEL SECURITY;
ALTER TABLE family_members DISABLE ROW LEVEL SECURITY;
ALTER TABLE families DISABLE ROW LEVEL SECURITY;
ALTER TABLE profiles DISABLE ROW LEVEL SECURITY;

-- Schritt 2: Alle Daten löschen (in richtiger Reihenfolge)
TRUNCATE TABLE handover_items CASCADE;
TRUNCATE TABLE handovers CASCADE;
TRUNCATE TABLE expenses CASCADE;
TRUNCATE TABLE settlements CASCADE;
TRUNCATE TABLE custody_exceptions CASCADE;
TRUNCATE TABLE custody_patterns CASCADE;
TRUNCATE TABLE emergency_contacts CASCADE;
TRUNCATE TABLE children CASCADE;
TRUNCATE TABLE family_members CASCADE;
TRUNCATE TABLE families CASCADE;
TRUNCATE TABLE profiles CASCADE;

-- Schritt 3: Auth-Benutzer löschen (benötigt Admin-Rechte)
-- Option A: Über SQL (falls du Service Role Key verwendest)
DELETE FROM auth.users;

-- Option B: Falls obiges nicht funktioniert, im Dashboard:
-- Authentication → Users → Alle auswählen → Delete

-- Schritt 4: RLS wieder aktivieren
ALTER TABLE handover_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE handovers ENABLE ROW LEVEL SECURITY;
ALTER TABLE expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE settlements ENABLE ROW LEVEL SECURITY;
ALTER TABLE custody_exceptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE custody_patterns ENABLE ROW LEVEL SECURITY;
ALTER TABLE emergency_contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE children ENABLE ROW LEVEL SECURITY;
ALTER TABLE family_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE families ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Fertig! Alle Daten und Benutzer wurden gelöscht.
