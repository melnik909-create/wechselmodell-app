-- ============================================
-- FIX: event_attendances RLS - Buttons funktionieren nicht
-- Problem: FOR ALL Policy blockiert INSERT bei upsert
-- Lösung: Separate Policies für SELECT, INSERT, UPDATE, DELETE
-- 
-- ANLEITUNG: In Supabase SQL Editor ausführen!
-- ============================================

-- Alte Policies entfernen (alle möglichen Namen)
DROP POLICY IF EXISTS "Benutzer kann eigene Zusage verwalten" ON public.event_attendances;
DROP POLICY IF EXISTS "Familie kann Event-Zusagen sehen" ON public.event_attendances;
DROP POLICY IF EXISTS "event_attendances_select" ON public.event_attendances;
DROP POLICY IF EXISTS "event_attendances_insert" ON public.event_attendances;
DROP POLICY IF EXISTS "event_attendances_update" ON public.event_attendances;
DROP POLICY IF EXISTS "event_attendances_delete" ON public.event_attendances;

-- SELECT: Familienmitglieder können Anwesenheiten ihrer Familie sehen
CREATE POLICY "event_attendances_select"
  ON public.event_attendances FOR SELECT
  USING (
    event_id IN (
      SELECT e.id FROM public.events e
      WHERE e.family_id IN (
        SELECT fm.family_id FROM public.family_members fm WHERE fm.user_id = auth.uid()
      )
    )
  );

-- INSERT: Benutzer kann eigene Anwesenheit für Familien-Events eintragen
CREATE POLICY "event_attendances_insert"
  ON public.event_attendances FOR INSERT
  WITH CHECK (
    user_id = auth.uid()
    AND event_id IN (
      SELECT e.id FROM public.events e
      WHERE e.family_id IN (
        SELECT fm.family_id FROM public.family_members fm WHERE fm.user_id = auth.uid()
      )
    )
  );

-- UPDATE: Benutzer kann eigene Anwesenheit ändern
CREATE POLICY "event_attendances_update"
  ON public.event_attendances FOR UPDATE
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- DELETE: Benutzer kann eigene Anwesenheit löschen
CREATE POLICY "event_attendances_delete"
  ON public.event_attendances FOR DELETE
  USING (user_id = auth.uid());

-- Prüfung
DO $$
BEGIN
  RAISE NOTICE 'RLS Policies für event_attendances erfolgreich aktualisiert!';
  RAISE NOTICE 'Die Teilnahme-Buttons sollten jetzt funktionieren.';
END $$;
