# Wechselmodell App - Setup Anleitung

## 1. Supabase Projekt erstellen

### Schritt 1: Account erstellen
1. Gehe zu https://supabase.com
2. Klicke "Start your project"
3. Melde dich mit GitHub an (oder E-Mail)

### Schritt 2: Neues Projekt erstellen
1. Klicke "New Project"
2. **Wichtig:** Wähle "Frankfurt (eu-central-1)" als Region (DSGVO!)
3. Projekt-Name: `wechselmodell` (oder beliebig)
4. Database Password: Generiere ein sicheres Passwort (wird angezeigt, speichere es!)
5. Pricing Plan: "Free" reicht zum Testen
6. Klicke "Create new project"
7. ⏳ Warte 1-2 Minuten bis das Projekt fertig ist

### Schritt 3: API Keys holen
1. In deinem Projekt, klicke links auf "Settings" (Zahnrad-Symbol)
2. Klicke "API"
3. Kopiere diese zwei Werte:
   - **Project URL** (z.B. `https://abc123xyz.supabase.co`)
   - **anon public** Key (langer String unter "Project API keys")

### Schritt 4: .env erstellen
1. Öffne `wechselmodell-app/.env.example`
2. Kopiere den Inhalt
3. Erstelle eine neue Datei `wechselmodell-app/.env`
4. Füge deine Werte ein:
   ```
   EXPO_PUBLIC_SUPABASE_URL=https://abc123xyz.supabase.co
   EXPO_PUBLIC_SUPABASE_ANON_KEY=dein_anon_key_hier
   ```

### Schritt 5: Datenbank-Schema einrichten
1. In Supabase, klicke links auf "SQL Editor"
2. Klicke "New query"
3. Öffne die Datei `wechselmodell-app/supabase/migrations/001_initial_schema.sql`
4. Kopiere den GESAMTEN Inhalt (ca. 300 Zeilen)
5. Füge ihn in den SQL Editor ein
6. Klicke "Run" (oder F5)
7. ✅ Du solltest "Success" sehen

### Schritt 6: App neu starten
```bash
# Im Terminal, wo Expo läuft, drücke 'r' um neu zu laden
# Oder stoppe und starte neu:
npx expo start --port 8082
```

---

## 2. Android Emulator einrichten

### Option A: Android Studio (empfohlen, ca. 10 Minuten)

#### Installation:
1. **Android Studio downloaden:**
   - Gehe zu https://developer.android.com/studio
   - Download für Windows (ca. 1 GB)
   - Installiere mit Standard-Einstellungen

2. **Emulator erstellen:**
   - Öffne Android Studio
   - Klicke oben rechts auf "More Actions" → "Virtual Device Manager"
   - Klicke "Create Device"
   - Wähle "Phone" → "Pixel 7" (oder ein anderes Gerät)
   - Klicke "Next"
   - System Image: Wähle **"UpsideDownCake" (API 34)** (empfohlen)
   - Falls nicht installiert: Klicke auf den Download-Link neben dem Image
   - Klicke "Next" → "Finish"

3. **Emulator starten:**
   - In der Device-Liste, klicke auf das Play-Symbol ▶️
   - Warte bis der Emulator hochfährt (1-2 Minuten beim ersten Mal)
   - Du siehst jetzt ein Android-Phone-Fenster

4. **App im Emulator öffnen:**
   - Im Expo-Terminal, drücke **`a`** (für Android)
   - Die App öffnet sich automatisch im Emulator
   - Oder: Scanne den QR-Code mit der Expo Go App im Emulator

### Option B: Eigenes Android-Handy (schneller!)

1. **Developer Mode aktivieren:**
   - Einstellungen → Über das Telefon
   - Tippe 7x auf "Build-Nummer"
   - Developer Options sind jetzt freigeschaltet

2. **USB Debugging aktivieren:**
   - Einstellungen → Entwickleroptionen
   - Aktiviere "USB-Debugging"

3. **Handy anschließen:**
   - Verbinde dein Handy per USB-Kabel
   - Bestätige "USB-Debugging zulassen" auf dem Handy

4. **App starten:**
   - Im Expo-Terminal, drücke **`a`**
   - Die App installiert sich auf deinem Handy

### Option C: Expo Go App (am schnellsten zum Testen!)

1. **Expo Go installieren:**
   - Play Store: Suche "Expo Go" und installiere
   - Oder direkt: https://play.google.com/store/apps/details?id=host.exp.exponent

2. **App öffnen:**
   - Öffne Expo Go
   - Tippe "Scan QR code"
   - Scanne den QR-Code aus dem Expo-Terminal
   - Die App lädt und startet

---

## 3. Testen

### Login testen:
1. Öffne die App
2. Du siehst den Login-Screen
3. Klicke "Registrieren"
4. Gib Name, E-Mail, Passwort ein
5. Nach Registrierung: **Check deine E-Mail** für Bestätigung
6. Bestätige die E-Mail, dann kannst du dich einloggen

### Onboarding testen:
1. Nach Login: "Familie erstellen"
2. Name eingeben (z.B. "Familie Müller")
3. Du siehst einen 6-stelligen Code (z.B. "A3K9X2")
4. "Weiter" → Kinder hinzufügen
5. Namen eingeben (optional: Geburtsdatum)
6. "Weiter" → Betreuungsmodell wählen
7. Wähle z.B. "7/7" (Woche/Woche)
8. Siehst du die Vorschau mit farbigen Kreisen? ✅
9. "Fertig" → Du bist im Dashboard!

### Dashboard testen:
- Siehst du "Heute bei [Name]"? ✅
- Siehst du 7 farbige Kreise für die Woche? ✅
- Quick Actions funktionieren? ✅
- Tabs unten: Home, Kalender, Übergabe, Ausgaben, Mehr ✅

---

## Troubleshooting

### "Network request failed" beim Login
→ Prüfe ob `.env` korrekt ist und Supabase-URL erreichbar

### App lädt nicht im Emulator
→ Drücke `r` im Expo-Terminal zum Reload
→ Oder: Restart mit `npx expo start --clear --port 8082`

### "Unable to resolve module"
→ Cache löschen: `npx expo start --clear`
→ Dependencies neu installieren: `rm -rf node_modules && npm install`

### Emulator zu langsam
→ Android Studio: AVD Manager → Edit Device → Graphics: "Hardware - GLES 2.0"
→ Oder nutze dein echtes Handy (viel schneller!)

---

## Nächste Schritte

1. ✅ Supabase eingerichtet
2. ✅ Emulator läuft
3. ✅ App startet

Jetzt kannst du:
- Zweiten Account erstellen und mit Invite-Code beitreten (Familie teilen)
- Kalender anschauen
- Ausgaben hinzufügen
- Übergabe-Checklisten erstellen
- Kind-Infos ausfüllen

Viel Spaß beim Testen! 🚀
