import { useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet } from 'react-native';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { COLORS } from '@/lib/constants';
import { useResponsive } from '@/hooks/useResponsive';

const GUIDE_SECTIONS = [
  {
    title: 'Kalender & Wechselplan',
    icon: 'calendar-sync',
    color: '#4F46E5',
    content: `Dein Betreuungskalender auf einen Blick – klar, farbig und sofort verständlich.\n\n📅  Farbige Tage zeigen an, wer gerade dran ist\n🟠  Orange markierte Tage = Ausnahmen (z.B. getauschte Tage)\n🔵  Blaue Punkte = eingetragene Termine\n\n💡 Beispiel: Du siehst sofort, dass nächsten Mittwoch Papa dran ist – auch wenn sonst Mama-Woche wäre, weil ihr einen Tausch vereinbart habt.\n\nDas Modell (7/7, 2/2/5/5, 2/2/3, 14/14) kannst du jederzeit unter „Mehr" → „Betreuungsmodell ändern" anpassen.`,
  },
  {
    title: 'Termine anlegen',
    icon: 'calendar-plus',
    color: '#059669',
    content: `Beide Elternteile sehen alle Termine – keine doppelten WhatsApp-Nachrichten mehr.\n\n📌 So geht's:\n1. Tippe auf einen Tag im Kalender\n2. Wähle „Termin" oder „Schul-Termin"\n3. Trage Titel, Uhrzeit, Ort und Kategorie ein\n\n💡 Beispiel: „Elternsprechtag, Fr 14:30, Grundschule" – beide Eltern sehen den Termin, können zusagen oder absagen (RSVP).\n\n🔔 Tipp: Nutze die Schnellaktionen auf der Startseite, um direkt zur Terminübersicht zu gelangen.`,
  },
  {
    title: 'Ausnahmen vorschlagen',
    icon: 'calendar-alert',
    color: '#F59E0B',
    content: `Mal muss ein Tag getauscht werden – kein Problem, aber transparent.\n\n📌 So funktioniert's:\n1. Tippe auf „Ausnahme" (Schnellaktionen oder Kalender)\n2. Wähle Datum und Grund (Urlaub, Krankheit, Tausch, Feiertag, Sonstiges)\n3. Der andere Elternteil erhält eine Benachrichtigung\n4. Erst nach Zustimmung wird der Tag getauscht\n\n💡 Beispiel: Du möchtest am 15.03. tauschen, weil du beruflich verreist. Der andere Elternteil sieht „Tausch vorgeschlagen – Grund: Dienstreise" und kann akzeptieren oder ablehnen.\n\n✅ Akzeptierte Ausnahmen werden im Kalender orange markiert.`,
  },
  {
    title: 'Übergabe-Checklisten',
    icon: 'clipboard-check',
    color: '#8B5CF6',
    content: `Damit zwischen Tür und Angel nichts verloren geht.\n\n📌 So nutzt du Übergaben:\n1. Erstelle vor der Übergabe eine neue Mitgabe-Liste\n2. Items werden automatisch aus der letzten Übergabe übernommen\n3. Füge weitere Items hinzu (z.B. „Regenjacke", „Lieblingsteddy")\n4. Der empfangende Elternteil quittiert jedes Item einzeln\n\n💡 Beispiel: Papa packt Wechselkleidung, Medikamente und Schulranzen ein. Mama bestätigt beim Abholen: ✅ Kleidung, ✅ Medikamente, ✅ Schulranzen.\n\n📸 Tipp: Fotos von gepackten Sachen helfen bei Unklarheiten.`,
  },
  {
    title: 'Ausgaben fair teilen',
    icon: 'currency-eur',
    color: '#EF4444',
    content: `Gemeinsame Kosten transparent erfassen – Schluss mit Zettelwirtschaft.\n\n📌 So funktioniert's:\n1. Tippe auf „Ausgabe hinzufügen"\n2. Trage Betrag, Kategorie und Beschreibung ein\n3. Optional: Beleg fotografieren\n4. Wähle die Aufteilung\n\n⚖️ Verrechnung:\n• Standard: Ausgaben werden gegeneinander verrechnet. Wer mehr bezahlt hat, dem wird der Differenzbetrag geschuldet.\n• 50:50-Tag: Wenn du eine Ausgabe mit „50:50" markierst, gilt sie als bereits fair geteilt und dient nur der Übersicht.\n\n💡 Beispiel: Mama kauft Winterschuhe (80 €), Papa zahlt Sportverein (60 €). Saldo: Papa schuldet Mama 10 €.\n\n📊 Alle 2 Monate wird eine Abrechnung fällig – ihr geht „Quitt" und startet frisch.`,
  },
  {
    title: 'Schule & Termine',
    icon: 'school',
    color: '#0EA5E9',
    content: `Schultermine, Aufgaben und Erinnerungen – damit nichts untergeht.\n\n📌 Aufgaben (To-Dos):\n• Hausaufgaben, Unterschriften, Materialien besorgen\n• Priorität setzen (hoch/mittel/niedrig)\n• Fälligkeitsdatum + Kind zuordnen\n\n📌 Schul-Termine:\n• Elternsprechtag, Schulfest, Ausflug, etc.\n• RSVP: Wer kann teilnehmen? (Ja / Nein / Vielleicht)\n• Beide Elternteile sehen sofort, wer zugesagt hat\n\n👀 Besonders praktisch: Schultermine des anderen Elternteils werden farbig markiert – so siehst du auf einen Blick, wer wann wo hingeht und ob noch ein Termin offen ist.\n\n💡 Beispiel: Mama sagt „Ja" zum Elternsprechtag → Papa sieht das sofort und weiß, dass es abgedeckt ist.`,
  },
  {
    title: 'Kind-Informationen',
    icon: 'account-child',
    color: '#10B981',
    content: `Alle wichtigen Daten der Kinder an einem Ort – immer aktuell, immer verfügbar.\n\n📋 Was du speichern kannst:\n• 🏥 Gesundheit: Allergien, Blutgruppe, Kinderarzt, Versicherungsnummer\n• 🏫 Bildung: Schule/Kita, Adresse, Telefon\n• 📄 Dokumente: Reisepassnummer, Ausweisnummer\n• 📞 Notfallkontakte: Großeltern, Babysitter, etc.\n• 📸 Profilbild\n\n🔒 Sensible Daten (Pass, Versicherung, Gesundheit) werden mit AES-256 verschlüsselt – der Schlüssel bleibt auf deinem Gerät.`,
  },
  {
    title: 'Betreuungsmodell ändern',
    icon: 'cog',
    color: '#6366F1',
    content: `Flexibel bleiben – das Modell passt sich eurem Leben an.\n\n📌 So änderst du es:\n1. Gehe zu „Mehr" → „Betreuungsmodell ändern"\n2. Wähle ein neues Muster:\n   • 7/7 – Wochenrhythmus\n   • 2/2/5/5 – kurze + lange Blöcke\n   • 2/2/3 – gleichmäßiger Wechsel\n   • 14/14 – Zwei-Wochen-Rhythmus\n3. Lege den Starttag und den ersten Elternteil fest\n\n💡 Tipp: Du siehst eine 14-Tage-Vorschau, bevor du bestätigst.\n\nDas neue Modell gilt ab dem gewählten Datum – bisherige Einträge bleiben erhalten.`,
  },
  {
    title: 'Übergabetag festlegen',
    icon: 'calendar-sync',
    color: '#F97316',
    content: `An welchem Tag wechseln die Kinder? Einmal einstellen – der Kalender passt sich an.\n\n📌 So geht's:\n1. Gehe zu „Mehr" → „Übergabetag konfigurieren"\n2. Wähle den Wochentag (z.B. Freitag)\n\n💡 Beispiel: Übergabe freitags nach der Schule – die Kinder gehen direkt zum anderen Elternteil. Im Kalender ist der Wechsel klar markiert.`,
  },
  {
    title: 'Export & Dokumentation',
    icon: 'file-export',
    color: '#6B7280',
    content: `Für den Überblick oder als Nachweis – alles exportierbar.\n\n📌 Du kannst exportieren:\n• Ausgabenübersicht als PDF oder CSV\n• Kalender-Ansichten\n• Übergabe-Protokolle\n\n💡 Praktisch z.B. für:\n• Steuererklärung (Kinderbetreuungskosten)\n• Abstimmung mit Anwalt oder Mediator\n• Eigene Dokumentation`,
  },
  {
    title: 'Sicherheit & Verschlüsselung',
    icon: 'shield-lock',
    color: '#1E40AF',
    content: `Deine sensiblen Daten sind mit modernster Technik geschützt.\n\n🔐 AES-256-Verschlüsselung für:\n• Reisepassnummern\n• Versicherungsnummern\n• Gesundheitsdaten\n• Kontaktinformationen\n\n🔑 Der Verschlüsselungsschlüssel bleibt ausschließlich auf deinem Gerät – selbst wir können die Daten nicht lesen.\n\n✅ Auch bei einem hypothetischen Datenbankzugriff wären deine Daten komplett unleserlich.`,
  },
  {
    title: 'Datenschutz & DSGVO',
    icon: 'shield-check',
    color: '#059669',
    content: `Deine Daten gehören dir – Punkt.\n\n🇪🇺 Vollständig DSGVO-konform\n🚫 Kein Handel mit deinen Daten – niemals\n☁️ Sichere Cloud-Speicherung in der EU\n🔍 Volle Transparenz: Du kannst jederzeit einsehen, was gespeichert ist\n🗑️ Dein Recht auf Löschung wird respektiert\n\nWir verdienen Geld durch die App – nicht durch deine Daten.`,
  },
];

export default function GuideScreen() {
  const { contentMaxWidth } = useResponsive();
  const [expandedIndex, setExpandedIndex] = useState<number | null>(null);

  function toggleSection(index: number) {
    setExpandedIndex(expandedIndex === index ? null : index);
  }

  return (
    <SafeAreaView style={styles.safeArea} edges={['bottom']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.closeButton}>
          <MaterialCommunityIcons name="close" size={24} color="#111" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Anleitung</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
        <View style={{ maxWidth: contentMaxWidth, alignSelf: 'center', width: '100%' }}>
        <View style={styles.intro}>
          <MaterialCommunityIcons name="help-circle" size={48} color={COLORS.primary} />
          <Text style={styles.introTitle}>Willkommen bei Wechselmodell-Planer</Text>
          <Text style={styles.introText}>
            Hier findest du Hilfe zu allen Funktionen der App. Tippe auf einen Bereich, um mehr zu erfahren.
          </Text>
        </View>

        {GUIDE_SECTIONS.map((section, index) => (
          <View key={index} style={styles.sectionCard}>
            <TouchableOpacity
              onPress={() => toggleSection(index)}
              style={styles.sectionHeader}
              activeOpacity={0.7}
            >
              <View style={styles.sectionLeft}>
                <View style={[styles.iconContainer, { backgroundColor: (section.color ?? COLORS.primary) + '15' }]}>
                  <MaterialCommunityIcons
                    name={section.icon as any}
                    size={24}
                    color={section.color ?? COLORS.primary}
                  />
                </View>
                <Text style={styles.sectionTitle}>{section.title}</Text>
              </View>
              <MaterialCommunityIcons
                name={expandedIndex === index ? 'chevron-up' : 'chevron-down'}
                size={24}
                color="#6B7280"
              />
            </TouchableOpacity>

            {expandedIndex === index && (
              <View style={styles.sectionContent}>
                <Text style={styles.sectionText}>{section.content}</Text>
              </View>
            )}
          </View>
        ))}

        <View style={styles.footer}>
          <Text style={styles.footerText}>
            Brauchst du weitere Hilfe? Kontaktiere uns über die Einstellungen.
          </Text>
        </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  closeButton: {
    padding: 4,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingVertical: 24,
  },
  intro: {
    alignItems: 'center',
    marginBottom: 32,
  },
  introTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#111',
    marginTop: 16,
    marginBottom: 8,
  },
  introText: {
    fontSize: 15,
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 22,
    paddingHorizontal: 16,
  },
  sectionCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    overflow: 'hidden',
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
  },
  sectionLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: 12,
  },
  iconContainer: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111',
    flex: 1,
  },
  sectionContent: {
    paddingHorizontal: 16,
    paddingBottom: 16,
    paddingTop: 0,
  },
  sectionText: {
    fontSize: 15,
    color: '#4B5563',
    lineHeight: 24,
  },
  footer: {
    marginTop: 32,
    padding: 20,
    backgroundColor: '#EEF2FF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#C7D2FE',
  },
  footerText: {
    fontSize: 14,
    color: '#4338CA',
    textAlign: 'center',
    lineHeight: 20,
  },
});
