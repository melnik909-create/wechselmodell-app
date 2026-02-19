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
import { useAuth } from '@/lib/auth';
import { useCustodyPattern, useFamilyMembers, useUpdatePattern } from '@/hooks/useFamily';
import { PATTERN_LABELS } from '@/types';
import type { PatternType, Parent } from '@/types';
import { format } from 'date-fns';
import { useResponsive } from '@/hooks/useResponsive';

const PATTERN_OPTIONS: { type: PatternType; description: string }[] = [
  { type: '3_3', description: '3 Tage bei A, dann 3 Tage bei B' },
  { type: '5_5', description: '5 Tage bei A, dann 5 Tage bei B' },
  { type: '7_7', description: '1 Woche bei A, 1 Woche bei B' },
  { type: '14_14', description: '2 Wochen bei A, dann 2 Wochen bei B' },
];

export default function ChangePatternModal() {
  const { contentMaxWidth } = useResponsive();
  const { family } = useAuth();
  const { data: currentPattern } = useCustodyPattern();
  const { data: members } = useFamilyMembers();
  const updatePattern = useUpdatePattern();

  const [selectedType, setSelectedType] = useState<PatternType>('7_7');
  const [startingParent, setStartingParent] = useState<Parent>('parent_a');
  // 1=Montag ... 7=Sonntag (ISO weekday)
  const [handoverDay, setHandoverDay] = useState(1);

  const WEEKDAYS = [
    { value: 1, label: 'Mo' },
    { value: 2, label: 'Di' },
    { value: 3, label: 'Mi' },
    { value: 4, label: 'Do' },
    { value: 5, label: 'Fr' },
    { value: 6, label: 'Sa' },
    { value: 7, label: 'So' },
  ];

  useEffect(() => {
    if (currentPattern) {
      setSelectedType(currentPattern.pattern_type);
      setStartingParent(currentPattern.starting_parent);
      // Convert DB handover_day (0=Sun, 1=Mon...6=Sat) to ISO (1=Mon...7=Sun)
      if (currentPattern.handover_day != null) {
        setHandoverDay(currentPattern.handover_day === 0 ? 7 : currentPattern.handover_day);
      }
    }
  }, [currentPattern]);

  // Calculate start_date: most recent occurrence of the selected weekday
  function getStartDateForWeekday(isoWeekday: number): string {
    const today = new Date();
    const jsWeekday = isoWeekday === 7 ? 0 : isoWeekday;
    const todayDay = today.getDay();
    let diff = todayDay - jsWeekday;
    if (diff < 0) diff += 7;
    const result = new Date(today);
    result.setDate(today.getDate() - diff);
    return format(result, 'yyyy-MM-dd');
  }

  const parentName = (parent: Parent) => {
    if (parent === 'parent_a' && family?.parent_a_label) return family.parent_a_label;
    if (parent === 'parent_b' && family?.parent_b_label) return family.parent_b_label;
    const member = members?.find((m) => m.role === parent);
    if (member?.profile?.display_name) return member.profile.display_name;
    return parent === 'parent_a' ? 'Elternteil A' : 'Elternteil B';
  };

  function handleSave() {
    const startDate = getStartDateForWeekday(handoverDay);
    const dbHandoverDay = handoverDay === 7 ? 0 : handoverDay;

    AppAlert.alert(
      'Modell ändern',
      `Möchtest du das Betreuungsmodell wirklich ändern? Wechsel ist jetzt immer ${WEEKDAYS.find(d => d.value === handoverDay)?.label ?? ''}.`,
      [
        { text: 'Abbrechen', style: 'cancel' },
        {
          text: 'Ändern',
          onPress: () => {
            updatePattern.mutate(
              {
                pattern_type: selectedType,
                starting_parent: startingParent,
                start_date: startDate,
                handover_day: dbHandoverDay,
              },
              {
                onSuccess: () => {
                  AppAlert.alert('Erfolg', 'Betreuungsmodell wurde geändert!');
                  router.back();
                },
                onError: (error) => {
                  AppAlert.alert('Fehler', `Änderung fehlgeschlagen: ${error.message}`);
                },
              }
            );
          },
        },
      ]
    );
  }

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.closeButton}>
          <MaterialCommunityIcons name="close" size={24} color="#111" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Modell ändern</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
        <View style={{ maxWidth: contentMaxWidth, alignSelf: 'center', width: '100%' }}>
        {/* Current Pattern Info */}
        {currentPattern && (
          <View style={styles.infoBox}>
            <MaterialCommunityIcons name="information-outline" size={20} color="#3B82F6" />
            <Text style={styles.infoText}>
              Aktuell: {PATTERN_LABELS[currentPattern.pattern_type]} ab{' '}
              {currentPattern.start_date}
            </Text>
          </View>
        )}

        {/* Pattern Selection */}
        <Text style={styles.sectionTitle}>Neues Modell wählen</Text>
        {PATTERN_OPTIONS.map((option) => (
          <TouchableOpacity
            key={option.type}
            style={[
              styles.patternCard,
              selectedType === option.type && styles.patternCardSelected,
            ]}
            onPress={() => setSelectedType(option.type)}
            activeOpacity={0.7}
          >
            <View style={styles.patternHeader}>
              <Text style={styles.patternTitle}>{PATTERN_LABELS[option.type]}</Text>
              {selectedType === option.type && (
                <MaterialCommunityIcons name="check-circle" size={22} color="#10B981" />
              )}
            </View>
            <Text style={styles.patternDescription}>{option.description}</Text>
          </TouchableOpacity>
        ))}

        {/* Starting Parent */}
        <Text style={styles.sectionTitle}>Startet bei</Text>
        <View style={styles.parentButtons}>
          <TouchableOpacity
            style={[
              styles.parentButton,
              startingParent === 'parent_a' && styles.parentButtonSelected,
            ]}
            onPress={() => setStartingParent('parent_a')}
          >
            <MaterialCommunityIcons
              name="account"
              size={20}
              color={startingParent === 'parent_a' ? '#fff' : '#6B7280'}
            />
            <Text
              style={[
                styles.parentButtonText,
                startingParent === 'parent_a' && styles.parentButtonTextSelected,
              ]}
            >
              {parentName('parent_a')}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.parentButton,
              startingParent === 'parent_b' && styles.parentButtonSelected,
            ]}
            onPress={() => setStartingParent('parent_b')}
          >
            <MaterialCommunityIcons
              name="account"
              size={20}
              color={startingParent === 'parent_b' ? '#fff' : '#6B7280'}
            />
            <Text
              style={[
                styles.parentButtonText,
                startingParent === 'parent_b' && styles.parentButtonTextSelected,
              ]}
            >
              {parentName('parent_b')}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Handover Weekday */}
        <Text style={styles.sectionTitle}>Uebergabetag</Text>
        <View style={styles.weekdayRow}>
          {WEEKDAYS.map((day) => (
            <TouchableOpacity
              key={day.value}
              onPress={() => setHandoverDay(day.value)}
              style={[
                styles.weekdayButton,
                handoverDay === day.value && styles.weekdayButtonSelected,
              ]}
            >
              <Text
                style={[
                  styles.weekdayButtonText,
                  handoverDay === day.value && styles.weekdayButtonTextSelected,
                ]}
              >
                {day.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Save Button */}
        <TouchableOpacity
          style={[styles.saveButton, updatePattern.isPending && styles.saveButtonDisabled]}
          onPress={handleSave}
          disabled={updatePattern.isPending}
        >
          <MaterialCommunityIcons name="content-save" size={20} color="#fff" />
          <Text style={styles.saveButtonText}>
            {updatePattern.isPending ? 'Wird geändert...' : 'Modell ändern'}
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
    alignItems: 'center',
    gap: 10,
    backgroundColor: '#EFF6FF',
    borderWidth: 1,
    borderColor: '#BFDBFE',
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
  },
  infoText: {
    flex: 1,
    fontSize: 14,
    color: '#1E40AF',
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 12,
    marginTop: 8,
  },
  patternCard: {
    backgroundColor: '#fff',
    borderWidth: 2,
    borderColor: '#E5E7EB',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  patternCardSelected: {
    borderColor: '#10B981',
    backgroundColor: '#ECFDF5',
  },
  patternHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  patternTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111',
  },
  patternDescription: {
    fontSize: 14,
    color: '#6B7280',
  },
  parentButtons: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
  },
  parentButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#fff',
    borderWidth: 2,
    borderColor: '#E5E7EB',
    borderRadius: 8,
    paddingVertical: 12,
  },
  parentButtonSelected: {
    backgroundColor: '#10B981',
    borderColor: '#10B981',
  },
  parentButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#374151',
  },
  parentButtonTextSelected: {
    color: '#fff',
  },
  weekdayRow: {
    flexDirection: 'row',
    gap: 6,
    marginBottom: 16,
  },
  weekdayButton: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 10,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#E5E7EB',
    backgroundColor: '#fff',
  },
  weekdayButtonSelected: {
    borderColor: '#10B981',
    backgroundColor: '#ECFDF5',
  },
  weekdayButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6B7280',
  },
  weekdayButtonTextSelected: {
    color: '#10B981',
  },
  saveButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#10B981',
    paddingVertical: 14,
    borderRadius: 8,
    marginTop: 8,
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
