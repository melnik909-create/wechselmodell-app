import { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
} from 'react-native';
import { AppAlert } from '@/lib/alert';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useCustodyPattern } from '@/hooks/useFamily';
import { useUpdateHandoverDay } from '@/hooks/useFamily';
import { useResponsive } from '@/hooks/useResponsive';

const WEEKDAYS = [
  { value: 1, label: 'Montag', short: 'Mo' },
  { value: 2, label: 'Dienstag', short: 'Di' },
  { value: 3, label: 'Mittwoch', short: 'Mi' },
  { value: 4, label: 'Donnerstag', short: 'Do' },
  { value: 5, label: 'Freitag', short: 'Fr' },
  { value: 6, label: 'Samstag', short: 'Sa' },
  { value: 0, label: 'Sonntag', short: 'So' },
];

export default function ConfigHandoverDayModal() {
  const { contentMaxWidth } = useResponsive();
  const { data: pattern } = useCustodyPattern();
  const updateHandoverDay = useUpdateHandoverDay();
  const [selectedDay, setSelectedDay] = useState<number | null>(null);

  useEffect(() => {
    if (pattern?.handover_day !== undefined) {
      setSelectedDay(pattern.handover_day);
    }
  }, [pattern]);

  function handleSave() {
    if (selectedDay === null) {
      AppAlert.alert('Fehler', 'Bitte wähle einen Wochentag.');
      return;
    }

    AppAlert.alert(
      'Übergabetag festlegen',
      `Möchtest du ${WEEKDAYS.find((d) => d.value === selectedDay)?.label} als Standard-Übergabetag festlegen?`,
      [
        { text: 'Abbrechen', style: 'cancel' },
        {
          text: 'Festlegen',
          onPress: () => {
            updateHandoverDay.mutate(selectedDay, {
              onSuccess: () => {
                AppAlert.alert('Erfolg', 'Übergabetag wurde festgelegt!');
                router.back();
              },
              onError: (error) => {
                AppAlert.alert('Fehler', `Änderung fehlgeschlagen: ${error.message}`);
              },
            });
          },
        },
      ]
    );
  }

  const currentDayLabel = pattern?.handover_day !== null && pattern?.handover_day !== undefined
    ? WEEKDAYS.find((d) => d.value === pattern.handover_day)?.label
    : 'Nicht konfiguriert';

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.closeButton}>
          <MaterialCommunityIcons name="close" size={24} color="#111" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Übergabetag</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
        <View style={{ maxWidth: contentMaxWidth, alignSelf: 'center', width: '100%' }}>
        {/* Info Box */}
        <View style={styles.infoBox}>
          <MaterialCommunityIcons name="information-outline" size={20} color="#3B82F6" />
          <View style={styles.infoTextContainer}>
            <Text style={styles.infoText}>
              Lege fest, an welchem Wochentag die Übergabe der Kinder stattfindet. Dies wird im
              Kalender hervorgehoben.
            </Text>
            <Text style={styles.infoSubtext}>Aktuell: {currentDayLabel}</Text>
          </View>
        </View>

        {/* Weekday Selection */}
        <Text style={styles.sectionTitle}>Wochentag wählen</Text>
        {WEEKDAYS.map((weekday) => (
          <TouchableOpacity
            key={weekday.value}
            style={[
              styles.dayCard,
              selectedDay === weekday.value && styles.dayCardSelected,
            ]}
            onPress={() => setSelectedDay(weekday.value)}
            activeOpacity={0.7}
          >
            <View style={styles.dayLeft}>
              <View
                style={[
                  styles.dayBadge,
                  selectedDay === weekday.value && styles.dayBadgeSelected,
                ]}
              >
                <Text
                  style={[
                    styles.dayBadgeText,
                    selectedDay === weekday.value && styles.dayBadgeTextSelected,
                  ]}
                >
                  {weekday.short}
                </Text>
              </View>
              <Text style={styles.dayLabel}>{weekday.label}</Text>
            </View>
            {selectedDay === weekday.value && (
              <MaterialCommunityIcons name="check-circle" size={24} color="#10B981" />
            )}
          </TouchableOpacity>
        ))}

        {/* Save Button */}
        <TouchableOpacity
          style={[styles.saveButton, updateHandoverDay.isPending && styles.saveButtonDisabled]}
          onPress={handleSave}
          disabled={updateHandoverDay.isPending}
        >
          <MaterialCommunityIcons name="content-save" size={20} color="#fff" />
          <Text style={styles.saveButtonText}>
            {updateHandoverDay.isPending ? 'Wird gespeichert...' : 'Übergabetag festlegen'}
          </Text>
        </TouchableOpacity>
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
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#111',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingVertical: 16,
    paddingBottom: 32,
  },
  infoBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    backgroundColor: '#EFF6FF',
    borderWidth: 1,
    borderColor: '#BFDBFE',
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
  },
  infoTextContainer: {
    flex: 1,
  },
  infoText: {
    fontSize: 14,
    color: '#1E40AF',
    marginBottom: 4,
  },
  infoSubtext: {
    fontSize: 12,
    color: '#3B82F6',
    fontWeight: '600',
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 12,
    marginTop: 8,
  },
  dayCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#fff',
    borderWidth: 2,
    borderColor: '#E5E7EB',
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
  },
  dayCardSelected: {
    borderColor: '#10B981',
    backgroundColor: '#ECFDF5',
  },
  dayLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  dayBadge: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  dayBadgeSelected: {
    backgroundColor: '#10B981',
  },
  dayBadgeText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6B7280',
  },
  dayBadgeTextSelected: {
    color: '#fff',
  },
  dayLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111',
  },
  saveButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#10B981',
    paddingVertical: 14,
    borderRadius: 8,
    marginTop: 16,
  },
  saveButtonDisabled: {
    backgroundColor: '#9CA3AF',
  },
  saveButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});
