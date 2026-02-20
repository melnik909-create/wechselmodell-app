-- Prüfe alle Pattern-Einträge für eine Familie
-- Ersetze 'DEINE_FAMILY_ID' mit der tatsächlichen family_id

-- Alle Pattern-Einträge anzeigen
SELECT 
  id,
  family_id,
  pattern_type,
  start_date,
  starting_parent,
  is_active,
  handover_day,
  created_at
FROM custody_patterns
ORDER BY created_at DESC;

-- Pattern für eine spezifische Familie prüfen
-- (Ersetze 'DEINE_FAMILY_ID' mit der tatsächlichen family_id)
-- SELECT * FROM custody_patterns WHERE family_id = 'DEINE_FAMILY_ID';

-- Aktive Pattern prüfen
SELECT 
  id,
  family_id,
  pattern_type,
  is_active,
  created_at
FROM custody_patterns
WHERE is_active = true
ORDER BY created_at DESC;
