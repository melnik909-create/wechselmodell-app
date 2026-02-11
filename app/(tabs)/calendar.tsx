import { useState, useMemo } from 'react';
import { View, Text, TouchableOpacity, ScrollView, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useCustodyPattern, useCustodyExceptions, useFamilyMembers } from '@/hooks/useFamily';
import { getCustodyForDate, buildExceptionMap, formatDateKey } from '@/lib/custody-engine';
import { getMonthDays, formatMonthYear, isToday } from '@/lib/date-utils';
import { PARENT_COLORS, COLORS } from '@/lib/constants';
import { addMonths, subMonths, isSameMonth } from 'date-fns';
import type { Parent } from '@/types';

const WEEKDAY_HEADERS = ['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So'];

export default function CalendarScreen() {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const { data: pattern } = useCustodyPattern();
  const { data: exceptions } = useCustodyExceptions();
  const { data: members } = useFamilyMembers();

  const exceptionMap = buildExceptionMap(exceptions ?? []);
  const monthDays = useMemo(() => getMonthDays(currentMonth), [currentMonth]);

  const parentName = (parent: Parent) => {
    const member = members?.find((m) => m.role === parent);
    return member?.profile?.display_name ?? (parent === 'parent_a' ? 'A' : 'B');
  };

  function goToPreviousMonth() {
    setCurrentMonth((prev) => subMonths(prev, 1));
  }

  function goToNextMonth() {
    setCurrentMonth((prev) => addMonths(prev, 1));
  }

  function goToToday() {
    setCurrentMonth(new Date());
  }

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
        {/* Month Navigation */}
        <View style={styles.navigation}>
          <TouchableOpacity onPress={goToPreviousMonth} style={styles.navButton}>
            <MaterialCommunityIcons name="chevron-left" size={28} color={COLORS.text} />
          </TouchableOpacity>

          <TouchableOpacity onPress={goToToday}>
            <Text style={styles.monthTitle}>{formatMonthYear(currentMonth)}</Text>
          </TouchableOpacity>

          <TouchableOpacity onPress={goToNextMonth} style={styles.navButton}>
            <MaterialCommunityIcons name="chevron-right" size={28} color={COLORS.text} />
          </TouchableOpacity>
        </View>

        {/* Calendar Grid */}
        <View style={styles.card}>
          {/* Weekday Headers */}
          <View style={styles.weekdayRow}>
            {WEEKDAY_HEADERS.map((day) => (
              <View key={day} style={styles.weekdayCell}>
                <Text style={styles.weekdayText}>{day}</Text>
              </View>
            ))}
          </View>

          {/* Day Grid */}
          <View style={styles.dayGrid}>
            {monthDays.map((day, i) => {
              const inCurrentMonth = isSameMonth(day, currentMonth);
              const today = isToday(day);
              const custodyParent = pattern
                ? getCustodyForDate(pattern, day, exceptionMap)
                : null;
              const dateKey = formatDateKey(day);
              const hasException = exceptions?.some(
                (e) => e.date === dateKey && e.status === 'accepted'
              );

              return (
                <View key={i} style={styles.dayCell}>
                  <View
                    style={[
                      styles.dayBadge,
                      custodyParent && inCurrentMonth && {
                        backgroundColor:
                          PARENT_COLORS[custodyParent] + (inCurrentMonth ? 'CC' : '40'),
                      },
                      today && styles.dayBadgeToday,
                    ]}
                  >
                    <Text
                      style={[
                        styles.dayText,
                        !inCurrentMonth && styles.dayTextMuted,
                        custodyParent && inCurrentMonth && styles.dayTextBold,
                      ]}
                    >
                      {day.getDate()}
                    </Text>
                  </View>
                  {hasException && inCurrentMonth && (
                    <View style={styles.exceptionDot} />
                  )}
                </View>
              );
            })}
          </View>
        </View>

        {/* Legend */}
        <View style={styles.legend}>
          <View style={styles.legendItem}>
            <View
              style={[styles.legendDot, { backgroundColor: PARENT_COLORS.parent_a }]}
            />
            <Text style={styles.legendText}>{parentName('parent_a')}</Text>
          </View>
          <View style={styles.legendItem}>
            <View
              style={[styles.legendDot, { backgroundColor: PARENT_COLORS.parent_b }]}
            />
            <Text style={styles.legendText}>{parentName('parent_b')}</Text>
          </View>
          <View style={styles.legendItem}>
            <View style={[styles.legendDot, styles.exceptionDot]} />
            <Text style={styles.legendText}>Ausnahme</Text>
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
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingVertical: 16,
  },
  navigation: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  navButton: {
    padding: 8,
  },
  monthTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#111',
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  weekdayRow: {
    flexDirection: 'row',
    marginBottom: 8,
  },
  weekdayCell: {
    flex: 1,
    alignItems: 'center',
  },
  weekdayText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#6B7280',
  },
  dayGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  dayCell: {
    width: '14.28%',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 6,
  },
  dayBadge: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dayBadgeToday: {
    borderWidth: 2,
    borderColor: '#111',
  },
  dayText: {
    fontSize: 14,
    color: '#374151',
  },
  dayTextMuted: {
    color: '#D1D5DB',
  },
  dayTextBold: {
    color: '#fff',
    fontWeight: '500',
  },
  exceptionDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#F59E0B',
    marginTop: 2,
  },
  legend: {
    flexDirection: 'row',
    justifyContent: 'center',
    flexWrap: 'wrap',
    gap: 24,
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
});
