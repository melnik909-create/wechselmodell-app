import { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  StyleSheet,
} from 'react-native';
import { AppAlert } from '@/lib/alert';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/lib/auth';
import { supabase } from '@/lib/supabase';
import { COLORS, PARENT_COLORS } from '@/lib/constants';
import { PATTERN_LABELS, type PatternType, type Parent } from '@/types';
import { getPatternDescription, getCustodyForRange } from '@/lib/custody-engine';
import { addDays } from 'date-fns';
import { formatShortDay, formatDayMonth } from '@/lib/date-utils';
import { useResponsive } from '@/hooks/useResponsive';

export default function SelectPatternScreen() {
  const { family, refreshFamily } = useAuth();
  const queryClient = useQueryClient();
  const { contentMaxWidth } = useResponsive();
  const [selectedPattern, setSelectedPattern] = useState<PatternType>('7_7');
  const [startingParent, setStartingParent] = useState<Parent>('parent_a');

  const parentName = (parent: Parent) => {
    if (parent === 'parent_a' && family?.parent_a_label) return family.parent_a_label;
    if (parent === 'parent_b' && family?.parent_b_label) return family.parent_b_label;
    return parent === 'parent_a' ? 'Elternteil A' : 'Elternteil B';
  };
  // 1=Montag ... 7=Sonntag (ISO weekday)
  const [handoverDay, setHandoverDay] = useState(1); // Default: Montag
  const [loading, setLoading] = useState(false);

  const WEEKDAYS = [
    { value: 1, label: 'Mo' },
    { value: 2, label: 'Di' },
    { value: 3, label: 'Mi' },
    { value: 4, label: 'Do' },
    { value: 5, label: 'Fr' },
    { value: 6, label: 'Sa' },
    { value: 7, label: 'So' },
  ];

  // Calculate start_date: most recent occurrence of the selected weekday
  function getStartDateForWeekday(isoWeekday: number): Date {
    const today = new Date();
    // JS: 0=Sun, 1=Mon ... 6=Sat → convert ISO weekday to JS
    const jsWeekday = isoWeekday === 7 ? 0 : isoWeekday;
    const todayDay = today.getDay();
    let diff = todayDay - jsWeekday;
    if (diff < 0) diff += 7;
    const result = new Date(today);
    result.setDate(today.getDate() - diff);
    return result;
  }

  const startDate = getStartDateForWeekday(handoverDay);
  const startDateISO = startDate.toISOString().split('T')[0];

  const preview = getCustodyForRange(
    {
      id: 'preview',
      family_id: '',
      pattern_type: selectedPattern,
      start_date: startDateISO,
      starting_parent: startingParent,
      custom_sequence: null,
      is_active: true,
      handover_day: handoverDay === 7 ? 0 : handoverDay, // DB: 0=Sun, 1=Mon
    },
    startDate,
    addDays(startDate, 13),
    []
  );

  async function handleSave() {
    if (!family) {
      AppAlert.alert('Fehler', 'Keine Familie gefunden.');
      return;
    }

    setLoading(true);
    try {
      // Some environments may not have the optional `handover_day` column migrated yet.
      // Try with it first, then retry without on "column does not exist".
      const insertWithHandoverDay = async () => {
        return supabase.from('custody_patterns').insert({
          family_id: family.id,
          pattern_type: selectedPattern,
          start_date: startDateISO,
          starting_parent: startingParent,
          is_active: true,
          handover_day: handoverDay === 7 ? 0 : handoverDay, // DB: 0=Sun, 1=Mon...6=Sat
        });
      };

      const insertWithoutHandoverDay = async () => {
        return supabase.from('custody_patterns').insert({
          family_id: family.id,
          pattern_type: selectedPattern,
          start_date: startDateISO,
          starting_parent: startingParent,
          is_active: true,
        });
      };

      const { error: insertError } = await insertWithHandoverDay();

      if (insertError) {
        const msg = insertError.message || '';
        if (msg.includes('handover_day') && (msg.includes('does not exist') || msg.includes('existiert nicht'))) {
          const { error: retryError } = await insertWithoutHandoverDay();
          if (retryError) throw retryError;
        } else {
          throw insertError;
        }
      }

      await refreshFamily();
      await queryClient.invalidateQueries({ queryKey: ['custody_pattern', family.id] });
      router.replace('/(onboarding)/add-children');
    } catch (error: any) {
      AppAlert.alert('Fehler', error.message || 'Muster konnte nicht gespeichert werden.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
        <View style={{ maxWidth: contentMaxWidth, alignSelf: 'center', width: '100%' }}>
          <Text style={styles.title}>Betreuungsmodell</Text>
          <Text style={styles.subtitle}>Wie teilt ihr die Betreuung auf?</Text>

          {/* Pattern Options */}
          <View style={styles.patternList}>
            {(Object.keys(PATTERN_LABELS) as PatternType[])
              .filter((p) => p !== 'custom')
              .map((pattern) => (
                <TouchableOpacity
                  key={pattern}
                  style={[
                    styles.patternCard,
                    selectedPattern === pattern && styles.patternCardSelected,
                  ]}
                  onPress={() => setSelectedPattern(pattern)}
                >
                  <View style={styles.patternCardContent}>
                    <View style={styles.patternCardText}>
                      <Text style={styles.patternTitle}>{PATTERN_LABELS[pattern]}</Text>
                      <Text style={styles.patternDescription}>
                        {getPatternDescription(pattern)}
                      </Text>
                    </View>
                    {selectedPattern === pattern && (
                      <MaterialCommunityIcons name="check-circle" size={24} color={COLORS.primary} />
                    )}
                  </View>
                </TouchableOpacity>
              ))}
          </View>

          {/* Starting Parent */}
          <Text style={styles.sectionTitle}>Wer hat die Kinder zuerst?</Text>
          <View style={styles.parentRow}>
            <TouchableOpacity
              onPress={() => setStartingParent('parent_a')}
              style={[
                styles.parentButton,
                startingParent === 'parent_a' && styles.parentButtonSelectedA,
              ]}
            >
              <Text
                style={[
                  styles.parentButtonText,
                  startingParent === 'parent_a' && styles.parentButtonTextSelectedA,
                ]}
              >
                {parentName('parent_a')}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => setStartingParent('parent_b')}
              style={[
                styles.parentButton,
                startingParent === 'parent_b' && styles.parentButtonSelectedB,
              ]}
            >
              <Text
                style={[
                  styles.parentButtonText,
                  startingParent === 'parent_b' && styles.parentButtonTextSelectedB,
                ]}
              >
                {parentName('parent_b')}
              </Text>
            </TouchableOpacity>
          </View>

          {/* Handover Weekday */}
          <Text style={styles.sectionTitle}>An welchem Tag ist die Uebergabe?</Text>
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

          {/* Preview */}
          <Text style={styles.sectionTitle}>Vorschau (14 Tage)</Text>
          <View style={styles.previewCard}>
            <View style={styles.previewGrid}>
              {preview.map((day, i) => (
                <View
                  key={i}
                  style={[
                    styles.previewDay,
                    {
                      backgroundColor:
                        day.parent === 'parent_a'
                          ? PARENT_COLORS.parent_a + '20'
                          : PARENT_COLORS.parent_b + '20',
                    },
                  ]}
                >
                  <Text style={styles.previewDayName}>{formatShortDay(day.date)}</Text>
                  <View
                    style={[
                      styles.previewBadge,
                      {
                        backgroundColor: PARENT_COLORS[day.parent],
                      },
                    ]}
                  >
                    <Text style={styles.previewBadgeText}>
                      {day.parent === 'parent_a' ? 'A' : 'B'}
                    </Text>
                  </View>
                  <Text style={styles.previewDate}>{formatDayMonth(day.date)}</Text>
                </View>
              ))}
            </View>
          </View>

          {/* Legend */}
          <View style={styles.legend}>
            <View style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: PARENT_COLORS.parent_a }]} />
              <Text style={styles.legendText}>{parentName('parent_a')}</Text>
            </View>
            <View style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: PARENT_COLORS.parent_b }]} />
              <Text style={styles.legendText}>{parentName('parent_b')}</Text>
            </View>
          </View>
        </View>
      </ScrollView>

      <View style={styles.bottomButton}>
        <TouchableOpacity
          style={[styles.button, loading && styles.buttonDisabled]}
          onPress={handleSave}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.buttonText}>Fertig</Text>
          )}
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#fff',
  },
  scrollView: {
    flex: 1,
    paddingHorizontal: 24,
  },
  scrollContent: {
    paddingVertical: 32,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#111',
    textAlign: 'center',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#6B7280',
    textAlign: 'center',
    marginBottom: 32,
  },
  patternList: {
    gap: 12,
    marginBottom: 32,
  },
  patternCard: {
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  patternCardSelected: {
    borderColor: '#4F46E5',
    borderWidth: 2,
  },
  patternCardContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  patternCardText: {
    flex: 1,
  },
  patternTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111',
  },
  patternDescription: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 4,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 12,
  },
  parentRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 32,
  },
  parentButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#E5E7EB',
  },
  parentButtonSelectedA: {
    borderColor: '#3B82F6',
    backgroundColor: '#EFF6FF',
  },
  parentButtonSelectedB: {
    borderColor: '#A855F7',
    backgroundColor: '#FAF5FF',
  },
  parentButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#6B7280',
  },
  parentButtonTextSelectedA: {
    color: '#3B82F6',
  },
  parentButtonTextSelectedB: {
    color: '#A855F7',
  },
  weekdayRow: {
    flexDirection: 'row',
    gap: 6,
    marginBottom: 24,
  },
  weekdayButton: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 10,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#E5E7EB',
    backgroundColor: '#F9FAFB',
  },
  weekdayButtonSelected: {
    borderColor: '#4F46E5',
    backgroundColor: '#EEF2FF',
  },
  weekdayButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6B7280',
  },
  weekdayButtonTextSelected: {
    color: '#4F46E5',
  },
  previewCard: {
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  previewGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 4,
  },
  previewDay: {
    width: '13%',
    alignItems: 'center',
    paddingVertical: 6,
    borderRadius: 8,
  },
  previewDayName: {
    fontSize: 10,
    color: '#6B7280',
  },
  previewBadge: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
  },
  previewBadgeText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: 'bold',
  },
  previewDate: {
    fontSize: 9,
    color: '#9CA3AF',
    marginTop: 2,
  },
  legend: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 24,
    marginBottom: 16,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  legendDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  legendText: {
    fontSize: 12,
    color: '#6B7280',
  },
  bottomButton: {
    paddingHorizontal: 24,
    paddingBottom: 24,
  },
  button: {
    backgroundColor: '#4F46E5',
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});
