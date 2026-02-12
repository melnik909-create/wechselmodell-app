import { useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet } from 'react-native';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { COLORS } from '@/lib/constants';
import { useResponsive } from '@/hooks/useResponsive';

const GUIDE_SECTIONS = [
  {
    title: 'Kalender & Betreuungsmodell',
    icon: 'calendar',
    content: `Der Kalender zeigt, wer wann die Kinder betreut.\n\n• Farbige Tage zeigen die Betreuung\n• Orange Punkte = Ausnahmen\n• Blaue Punkte = Termine\n\nDu kannst das Modell jederzeit in den Einstellungen ändern.`,
  },
  {
    title: 'Termine erstellen',
    icon: 'calendar-plus',
    content: `Tippe auf einen Tag im Kalender, um einen Termin zu erstellen.\n\n• Wähle zwischen Schul-Termin und normalem Termin\n• Füge Titel, Uhrzeit, Kategorie und Ort hinzu\n• Alle Termine sind für beide Elternteile sichtbar\n\nÖffne die Terminübersicht über die Schnellaktionen.`,
  },
  {
    title: 'Ausnahmen vorschlagen',
    icon: 'calendar-alert',
    content: `Wenn du einen Tag tauschen möchtest:\n\n1. Tippe auf "Ausnahme" in den Schnellaktionen\n2. Wähle das Datum und den Grund\n3. Der andere Elternteil muss akzeptieren\n\nSobald akzeptiert, wird der Tag orange markiert.`,
  },
  {
    title: 'Übergabe-Checklisten',
    icon: 'clipboard-check',
    content: `Vor jeder Übergabe kannst du eine Checkliste erstellen:\n\n• Kleidung, Medikamente, Hausaufgaben, etc.\n• Füge Fotos hinzu (z.B. von gepackten Sachen)\n• Hake Punkte ab wenn erledigt\n\nSo vergisst niemand etwas Wichtiges!`,
  },
  {
    title: 'Ausgaben teilen',
    icon: 'currency-eur',
    content: `Erfasse gemeinsame Kosten für die Kinder:\n\n• Betrag, Kategorie, Belege\n• Wähle die Aufteilung (50/50 oder custom)\n• Sieh den aktuellen Saldo\n• Exportiere als PDF oder CSV\n\nDie App berechnet automatisch, wer wem was schuldet.`,
  },
  {
    title: 'Kind-Informationen',
    icon: 'account-child',
    content: `Speichere wichtige Infos:\n\n• Gesundheit: Allergien, Blutgruppe, Arzt\n• Bildung: Schule, Kita\n• Dokumente: Reisepassnummer\n• Notfallkontakte\n• Profilbild\n\nBeide Elternteile haben immer Zugriff auf diese Infos.`,
  },
  {
    title: 'Betreuungsmodell ändern',
    icon: 'cog',
    content: `Du kannst das Modell jederzeit ändern:\n\n1. Gehe zu "Mehr" > "Betreuungsmodell ändern"\n2. Wähle ein neues Muster (7/7, 2/2/5/5, 2/2/3, 14/14)\n3. Bestimme den Starttermin\n\nDas neue Modell gilt ab dem gewählten Datum.`,
  },
  {
    title: 'Übergabetag konfigurieren',
    icon: 'calendar-sync',
    content: `Lege fest, an welchem Wochentag die Übergaben stattfinden:\n\n1. Gehe zu "Mehr" > "Übergabetag konfigurieren"\n2. Wähle den Wochentag (z.B. Freitag)\n\nDer Betreuungsplan passt sich automatisch an.`,
  },
  {
    title: 'Datenschutz & Sicherheit',
    icon: 'shield-lock',
    content: `Deine sensiblen Daten sind bei uns sicher:\n\n• AES-256-Verschlüsselung für Reisepassnummern, Versicherungsnummern, Gesundheitsdaten und Kontaktinformationen\n• Verschlüsselungsschlüssel bleibt nur auf deinem Gerät\n• Selbst bei einem Datenbankzugriff sind deine Daten unleserlich\n• Automatische Verschlüsselung im Hintergrund\n\nDeine Privatsphäre hat oberste Priorität.`,
  },
  {
    title: 'Datenschutz & DSGVO',
    icon: 'shield-check',
    content: `Wir nehmen Datenschutz ernst:\n\n• Vollständig konform mit der DSGVO\n• Es wird kein Handel mit deinen Daten getrieben\n• Deine Daten gehören dir und werden niemals verkauft\n• Sichere Cloud-Speicherung in der EU\n• Transparenz und Kontrolle über deine Daten`,
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
                <View style={[styles.iconContainer, { backgroundColor: COLORS.primary + '15' }]}>
                  <MaterialCommunityIcons
                    name={section.icon as any}
                    size={24}
                    color={COLORS.primary}
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
