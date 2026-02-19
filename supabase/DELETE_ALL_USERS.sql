-- ⚠️ LÖSCHT ALLE BENUTZER & ALLE APP-DATEN (inkl. Auth)!
-- Nur ausführen, wenn du wirklich ALLES in diesem Supabase-Projekt löschen willst.
-- Empfohlen: NUR in DEV/STAGING. In PROD ist das i.d.R. ein Totalschaden.

-- Schritt 1: RLS temporär deaktivieren (best-effort; überspringt Tabellen ohne OWNER-Rechte)
DO $$
BEGIN
  BEGIN IF to_regclass('public.event_attendances') IS NOT NULL THEN EXECUTE 'ALTER TABLE public.event_attendances DISABLE ROW LEVEL SECURITY'; END IF; EXCEPTION WHEN insufficient_privilege THEN NULL; END;
  BEGIN IF to_regclass('public.events') IS NOT NULL THEN EXECUTE 'ALTER TABLE public.events DISABLE ROW LEVEL SECURITY'; END IF; EXCEPTION WHEN insufficient_privilege THEN NULL; END;
  BEGIN IF to_regclass('public.handover_items') IS NOT NULL THEN EXECUTE 'ALTER TABLE public.handover_items DISABLE ROW LEVEL SECURITY'; END IF; EXCEPTION WHEN insufficient_privilege THEN NULL; END;
  BEGIN IF to_regclass('public.handovers') IS NOT NULL THEN EXECUTE 'ALTER TABLE public.handovers DISABLE ROW LEVEL SECURITY'; END IF; EXCEPTION WHEN insufficient_privilege THEN NULL; END;
  BEGIN IF to_regclass('public.expenses') IS NOT NULL THEN EXECUTE 'ALTER TABLE public.expenses DISABLE ROW LEVEL SECURITY'; END IF; EXCEPTION WHEN insufficient_privilege THEN NULL; END;
  BEGIN IF to_regclass('public.settlements') IS NOT NULL THEN EXECUTE 'ALTER TABLE public.settlements DISABLE ROW LEVEL SECURITY'; END IF; EXCEPTION WHEN insufficient_privilege THEN NULL; END;
  BEGIN IF to_regclass('public.custody_exceptions') IS NOT NULL THEN EXECUTE 'ALTER TABLE public.custody_exceptions DISABLE ROW LEVEL SECURITY'; END IF; EXCEPTION WHEN insufficient_privilege THEN NULL; END;
  BEGIN IF to_regclass('public.custody_patterns') IS NOT NULL THEN EXECUTE 'ALTER TABLE public.custody_patterns DISABLE ROW LEVEL SECURITY'; END IF; EXCEPTION WHEN insufficient_privilege THEN NULL; END;
  BEGIN IF to_regclass('public.emergency_contacts') IS NOT NULL THEN EXECUTE 'ALTER TABLE public.emergency_contacts DISABLE ROW LEVEL SECURITY'; END IF; EXCEPTION WHEN insufficient_privilege THEN NULL; END;
  BEGIN IF to_regclass('public.school_tasks') IS NOT NULL THEN EXECUTE 'ALTER TABLE public.school_tasks DISABLE ROW LEVEL SECURITY'; END IF; EXCEPTION WHEN insufficient_privilege THEN NULL; END;
  BEGIN IF to_regclass('public.documents') IS NOT NULL THEN EXECUTE 'ALTER TABLE public.documents DISABLE ROW LEVEL SECURITY'; END IF; EXCEPTION WHEN insufficient_privilege THEN NULL; END;
  BEGIN IF to_regclass('public.contacts') IS NOT NULL THEN EXECUTE 'ALTER TABLE public.contacts DISABLE ROW LEVEL SECURITY'; END IF; EXCEPTION WHEN insufficient_privilege THEN NULL; END;
  BEGIN IF to_regclass('public.children') IS NOT NULL THEN EXECUTE 'ALTER TABLE public.children DISABLE ROW LEVEL SECURITY'; END IF; EXCEPTION WHEN insufficient_privilege THEN NULL; END;
  BEGIN IF to_regclass('public.family_members') IS NOT NULL THEN EXECUTE 'ALTER TABLE public.family_members DISABLE ROW LEVEL SECURITY'; END IF; EXCEPTION WHEN insufficient_privilege THEN NULL; END;
  BEGIN IF to_regclass('public.families') IS NOT NULL THEN EXECUTE 'ALTER TABLE public.families DISABLE ROW LEVEL SECURITY'; END IF; EXCEPTION WHEN insufficient_privilege THEN NULL; END;
  BEGIN IF to_regclass('public.profiles') IS NOT NULL THEN EXECUTE 'ALTER TABLE public.profiles DISABLE ROW LEVEL SECURITY'; END IF; EXCEPTION WHEN insufficient_privilege THEN NULL; END;
END $$;

-- Supabase Storage Tabellen (`storage.*`) gehören i.d.R. nicht deinem SQL-Editor-User.
-- Deshalb hier NICHT anfassen. Storage-Dateien bitte im Dashboard löschen:
-- Storage → Buckets → Dateien markieren → Delete (oder Bucket löschen).

-- Schritt 2: Alle App-Daten löschen (TRUNCATE ist schnell & räumt FK-Graphen über CASCADE auf)
-- Hinweis: Postgres unterstützt bei TRUNCATE kein "IF EXISTS".
-- Deshalb hier als DO-Block mit dynamischem EXECUTE.
DO $$
BEGIN
  BEGIN IF to_regclass('public.event_attendances') IS NOT NULL THEN EXECUTE 'TRUNCATE TABLE public.event_attendances CASCADE'; END IF; EXCEPTION WHEN insufficient_privilege THEN NULL; END;
  BEGIN IF to_regclass('public.events') IS NOT NULL THEN EXECUTE 'TRUNCATE TABLE public.events CASCADE'; END IF; EXCEPTION WHEN insufficient_privilege THEN NULL; END;
  BEGIN IF to_regclass('public.handover_items') IS NOT NULL THEN EXECUTE 'TRUNCATE TABLE public.handover_items CASCADE'; END IF; EXCEPTION WHEN insufficient_privilege THEN NULL; END;
  BEGIN IF to_regclass('public.handovers') IS NOT NULL THEN EXECUTE 'TRUNCATE TABLE public.handovers CASCADE'; END IF; EXCEPTION WHEN insufficient_privilege THEN NULL; END;
  BEGIN IF to_regclass('public.expenses') IS NOT NULL THEN EXECUTE 'TRUNCATE TABLE public.expenses CASCADE'; END IF; EXCEPTION WHEN insufficient_privilege THEN NULL; END;
  BEGIN IF to_regclass('public.settlements') IS NOT NULL THEN EXECUTE 'TRUNCATE TABLE public.settlements CASCADE'; END IF; EXCEPTION WHEN insufficient_privilege THEN NULL; END;
  BEGIN IF to_regclass('public.custody_exceptions') IS NOT NULL THEN EXECUTE 'TRUNCATE TABLE public.custody_exceptions CASCADE'; END IF; EXCEPTION WHEN insufficient_privilege THEN NULL; END;
  BEGIN IF to_regclass('public.custody_patterns') IS NOT NULL THEN EXECUTE 'TRUNCATE TABLE public.custody_patterns CASCADE'; END IF; EXCEPTION WHEN insufficient_privilege THEN NULL; END;
  BEGIN IF to_regclass('public.emergency_contacts') IS NOT NULL THEN EXECUTE 'TRUNCATE TABLE public.emergency_contacts CASCADE'; END IF; EXCEPTION WHEN insufficient_privilege THEN NULL; END;
  BEGIN IF to_regclass('public.school_tasks') IS NOT NULL THEN EXECUTE 'TRUNCATE TABLE public.school_tasks CASCADE'; END IF; EXCEPTION WHEN insufficient_privilege THEN NULL; END;
  BEGIN IF to_regclass('public.documents') IS NOT NULL THEN EXECUTE 'TRUNCATE TABLE public.documents CASCADE'; END IF; EXCEPTION WHEN insufficient_privilege THEN NULL; END;
  BEGIN IF to_regclass('public.contacts') IS NOT NULL THEN EXECUTE 'TRUNCATE TABLE public.contacts CASCADE'; END IF; EXCEPTION WHEN insufficient_privilege THEN NULL; END;
  BEGIN IF to_regclass('public.children') IS NOT NULL THEN EXECUTE 'TRUNCATE TABLE public.children CASCADE'; END IF; EXCEPTION WHEN insufficient_privilege THEN NULL; END;
  BEGIN IF to_regclass('public.family_members') IS NOT NULL THEN EXECUTE 'TRUNCATE TABLE public.family_members CASCADE'; END IF; EXCEPTION WHEN insufficient_privilege THEN NULL; END;
  BEGIN IF to_regclass('public.families') IS NOT NULL THEN EXECUTE 'TRUNCATE TABLE public.families CASCADE'; END IF; EXCEPTION WHEN insufficient_privilege THEN NULL; END;
  BEGIN IF to_regclass('public.profiles') IS NOT NULL THEN EXECUTE 'TRUNCATE TABLE public.profiles CASCADE'; END IF; EXCEPTION WHEN insufficient_privilege THEN NULL; END;
END $$;

-- Optional: Storage komplett leeren (Dateien/Uploads)
-- Nicht per SQL (fehlende OWNER-Rechte). Bitte im Dashboard löschen (siehe Kommentar oben).

-- Schritt 3: Auth-Benutzer löschen (SQL Editor im Supabase Dashboard hat in der Regel genug Rechte)
-- Hinweis: Löscht ALLE Accounts, Sessions, Identities, etc. (über FK/Cascade in auth-Schema).
DELETE FROM auth.users;

-- Schritt 4: RLS wieder aktivieren (best-effort; überspringt Tabellen ohne OWNER-Rechte)
DO $$
BEGIN
  BEGIN IF to_regclass('public.event_attendances') IS NOT NULL THEN EXECUTE 'ALTER TABLE public.event_attendances ENABLE ROW LEVEL SECURITY'; END IF; EXCEPTION WHEN insufficient_privilege THEN NULL; END;
  BEGIN IF to_regclass('public.events') IS NOT NULL THEN EXECUTE 'ALTER TABLE public.events ENABLE ROW LEVEL SECURITY'; END IF; EXCEPTION WHEN insufficient_privilege THEN NULL; END;
  BEGIN IF to_regclass('public.handover_items') IS NOT NULL THEN EXECUTE 'ALTER TABLE public.handover_items ENABLE ROW LEVEL SECURITY'; END IF; EXCEPTION WHEN insufficient_privilege THEN NULL; END;
  BEGIN IF to_regclass('public.handovers') IS NOT NULL THEN EXECUTE 'ALTER TABLE public.handovers ENABLE ROW LEVEL SECURITY'; END IF; EXCEPTION WHEN insufficient_privilege THEN NULL; END;
  BEGIN IF to_regclass('public.expenses') IS NOT NULL THEN EXECUTE 'ALTER TABLE public.expenses ENABLE ROW LEVEL SECURITY'; END IF; EXCEPTION WHEN insufficient_privilege THEN NULL; END;
  BEGIN IF to_regclass('public.settlements') IS NOT NULL THEN EXECUTE 'ALTER TABLE public.settlements ENABLE ROW LEVEL SECURITY'; END IF; EXCEPTION WHEN insufficient_privilege THEN NULL; END;
  BEGIN IF to_regclass('public.custody_exceptions') IS NOT NULL THEN EXECUTE 'ALTER TABLE public.custody_exceptions ENABLE ROW LEVEL SECURITY'; END IF; EXCEPTION WHEN insufficient_privilege THEN NULL; END;
  BEGIN IF to_regclass('public.custody_patterns') IS NOT NULL THEN EXECUTE 'ALTER TABLE public.custody_patterns ENABLE ROW LEVEL SECURITY'; END IF; EXCEPTION WHEN insufficient_privilege THEN NULL; END;
  BEGIN IF to_regclass('public.emergency_contacts') IS NOT NULL THEN EXECUTE 'ALTER TABLE public.emergency_contacts ENABLE ROW LEVEL SECURITY'; END IF; EXCEPTION WHEN insufficient_privilege THEN NULL; END;
  BEGIN IF to_regclass('public.school_tasks') IS NOT NULL THEN EXECUTE 'ALTER TABLE public.school_tasks ENABLE ROW LEVEL SECURITY'; END IF; EXCEPTION WHEN insufficient_privilege THEN NULL; END;
  BEGIN IF to_regclass('public.documents') IS NOT NULL THEN EXECUTE 'ALTER TABLE public.documents ENABLE ROW LEVEL SECURITY'; END IF; EXCEPTION WHEN insufficient_privilege THEN NULL; END;
  BEGIN IF to_regclass('public.contacts') IS NOT NULL THEN EXECUTE 'ALTER TABLE public.contacts ENABLE ROW LEVEL SECURITY'; END IF; EXCEPTION WHEN insufficient_privilege THEN NULL; END;
  BEGIN IF to_regclass('public.children') IS NOT NULL THEN EXECUTE 'ALTER TABLE public.children ENABLE ROW LEVEL SECURITY'; END IF; EXCEPTION WHEN insufficient_privilege THEN NULL; END;
  BEGIN IF to_regclass('public.family_members') IS NOT NULL THEN EXECUTE 'ALTER TABLE public.family_members ENABLE ROW LEVEL SECURITY'; END IF; EXCEPTION WHEN insufficient_privilege THEN NULL; END;
  BEGIN IF to_regclass('public.families') IS NOT NULL THEN EXECUTE 'ALTER TABLE public.families ENABLE ROW LEVEL SECURITY'; END IF; EXCEPTION WHEN insufficient_privilege THEN NULL; END;
  BEGIN IF to_regclass('public.profiles') IS NOT NULL THEN EXECUTE 'ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY'; END IF; EXCEPTION WHEN insufficient_privilege THEN NULL; END;
END $$;

-- Storage RLS wurde oben bewusst nicht verändert.

-- Fertig: Alle Benutzer & Daten sind gelöscht.
