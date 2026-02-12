import { useState, useMemo } from 'react';
import { View, Text, TouchableOpacity, ScrollView, StyleSheet, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useCustodyPattern, useCustodyExceptions, useFamilyMembers, useAcceptException, useRejectException, useEvents } from '@/hooks/useFamily';
import { getCustodyForDate, buildExceptionMap, formatDateKey } from '@/lib/custody-engine';
import { getMonthDays, formatMonthYear, isToday, formatFullDate, formatDayMonth } from '@/lib/date-utils';
import { PARENT_COLORS, COLORS, EXCEPTION_COLORS } from '@/lib/constants';
import { EXCEPTION_REASON_LABELS, EVENT_CATEGORY_LABELS } from '@/types';
import { addMonths, subMonths, isSameMonth, startOfMonth, endOfMonth, format, parseISO } from 'date-fns';
import type { Parent, EventCategory } from '@/types';
import { useAuth } from '@/lib/auth';
import { useResponsive } from '@/hooks/useResponsive';

const WEEKDAY_HEADERS = ['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So'];

export default function CalendarScreen() {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const { user, family } = useAuth();
  const { contentMaxWidth } = useResponsive();
  const { data: pattern } = useCustodyPattern();
  const { data: exceptions } = useCustodyExceptions();
  const { data: members } = useFamilyMembers();
  const acceptException = useAcceptException();
  const rejectException = useRejectException();

  const monthStart = format(startOfMonth(currentMonth), 'yyyy-MM-dd');
  const monthEnd = format(endOfMonth(currentMonth), 'yyyy-MM-dd');
  const { data: events } = useEvents(monthStart, monthEnd);

  const exceptionMap = buildExceptionMap(exceptions ?? []);
  const monthDays = useMemo(() => getMonthDays(currentMonth), [currentMonth]);

  // Build event map: dateKey -> event count
  const eventsByDate = useMemo(() => {
    const map = new Map<string, number>();
    if (!events) return map;
    for (const event of events) {
      const count = map.get(event.date) || 0;
      map.set(event.date, count + 1);
    }
    return map;
  }, [events]);

  const pendingExceptions = exceptions?.filter(
    (e) => e.status === 'proposed' && e.proposed_by !== user?.id
  ) ?? [];

  const parentName = (parent: Parent) => {
    // First check for custom label
    if (parent === 'parent_a' && family?.parent_a_label) return family.parent_a_label;
    if (parent === 'parent_b' && family?.parent_b_label) return family.parent_b_label;
    // Then check profile name
    const member = members?.find((m) => m.role === parent);
    if (member?.profile?.display_name) return member.profile.display_name;
    // Fallback
    return parent === 'parent_a' ? 'Elternteil A' : 'Elternteil B';
  };

  function handleAccept(exceptionId: string) {
    Alert.alert('Ausnahme akzeptieren', 'Möchtest du diese Ausnahme akzeptieren?', [
      { text: 'Abbrechen', style: 'cancel' },
      {
        text: 'Akzeptieren',
        onPress: () => acceptException.mutate(exceptionId),
      },
    ]);
  }

  function handleReject(exceptionId: string) {
    Alert.alert('Ausnahme ablehnen', 'Möchtest du diese Ausnahme ablehnen?', [
      { text: 'Abbrechen', style: 'cancel' },
      {
        text: 'Ablehnen',
        style: 'destructive',
        onPress: () => rejectException.mutate(exceptionId),
      },
    ]);
  }

  function handleDayPress(day: Date, inCurrentMonth: boolean) {
    if (!inCurrentMonth) return; // Ignore days outside current month

    const dateString = format(day, 'yyyy-MM-dd');

    Alert.alert(
      'Termin erstellen',
      `Welchen Typ Termin möchtest du für den ${format(day, 'dd.MM.yyyy')} erstellen?`,
      [
        {
          text: 'Schul-Termin',
          onPress: () => router.push(`/modal/add-event?date=${dateString}&category=school`),
        },
        {
          text: 'Normaler Termin',
          onPress: () => router.push(`/modal/add-event?date=${dateString}`),
        },
        {
          text: 'Abbrechen',
          style: 'cancel',
        },
      ]
    );
  }

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
        <View style={{ maxWidth: contentMaxWidth, alignSelf: 'center', width: '100%' }}>
        {/* Pending Exceptions */}
        {pendingExceptions.length > 0 && (
          <View style={styles.pendingSection}>
            <Text style={styles.pendingTitle}>
              Vorgeschlagene Ausnahmen ({pendingExceptions.length})
            </Text>
            {pendingExceptions.map((exception) => (
              <View key={exception.id} style={styles.exceptionCard}>
                <View style={styles.exceptionHeader}>
                  <MaterialCommunityIcons name="calendar-alert" size={20} color="#F59E0B" />
                  <Text style={styles.exceptionDate}>
                    {formatFullDate(new Date(exception.date + 'T00:00:00'))}
                  </Text>
                </View>
                <Text style={styles.exceptionReason}>
                  {EXCEPTION_REASON_LABELS[exception.reason]}
                </Text>
                {exception.note && (
                  <Text style={styles.exceptionNote}>{exception.note}</Text>
                )}
                <View style={styles.exceptionChange}>
                  <Text style={styles.exceptionChangeText}>
                    Normalerweise: {parentName(exception.original_parent)}
                  </Text>
                  <MaterialCommunityIcons name="arrow-right" size={16} color="#6B7280" />
                  <Text style={styles.exceptionChangeText}>
                    Neu: {parentName(exception.new_parent)}
                  </Text>
                </View>
                <View style={styles.exceptionButtons}>
                  <TouchableOpacity
                    style={[styles.exceptionButton, styles.rejectButton]}
                    onPress={() => handleReject(exception.id)}
                    disabled={rejectException.isPending}
                  >
                    <MaterialCommunityIcons name="close" size={18} color="#EF4444" />
                    <Text style={styles.rejectButtonText}>Ablehnen</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.exceptionButton, styles.acceptButton]}
                    onPress={() => handleAccept(exception.id)}
                    disabled={acceptException.isPending}
                  >
                    <MaterialCommunityIcons name="check" size={18} color="#10B981" />
                    <Text style={styles.acceptButtonText}>Akzeptieren</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ))}
          </View>
        )}

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
              // Get exception for this date (proposed or accepted)
              const exception = exceptions?.find(
                (e) => e.date === dateKey && (e.status === 'proposed' || e.status === 'accepted')
              );
              const eventCount = eventsByDate.get(dateKey) || 0;

              return (
                <TouchableOpacity
                  key={i}
                  style={styles.dayCell}
                  onPress={() => handleDayPress(day, inCurrentMonth)}
                  activeOpacity={inCurrentMonth ? 0.7 : 1}
                  disabled={!inCurrentMonth}
                >
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
                  <View style={styles.dayIndicators}>
                    {exception && inCurrentMonth && (
                      <View style={[
                        styles.exceptionDot,
                        {
                          backgroundColor: exception.status === 'proposed'
                            ? EXCEPTION_COLORS.proposed  // GELB
                            : EXCEPTION_COLORS.accepted   // GRÜN
                        }
                      ]} />
                    )}
                    {eventCount > 0 && inCurrentMonth && (
                      <View style={styles.eventDot} />
                    )}
                  </View>
                </TouchableOpacity>
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
            <View style={[styles.legendDot, { backgroundColor: EXCEPTION_COLORS.proposed }]} />
            <Text style={styles.legendText}>Ausnahme (Pipeline)</Text>
          </View>
          <View style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: EXCEPTION_COLORS.accepted }]} />
            <Text style={styles.legendText}>Ausnahme (OK!)</Text>
          </View>
          <View style={styles.legendItem}>
            <View style={[styles.legendDot, styles.eventDot]} />
            <Text style={styles.legendText}>Termin</Text>
          </View>
        </View>

        {/* Events This Month */}
        {events && events.length > 0 && (
          <View style={styles.eventsSection}>
            <View style={styles.eventsSectionHeader}>
              <Text style={styles.eventsSectionTitle}>Termine diesen Monat</Text>
              {events.length > 3 && (
                <TouchableOpacity onPress={() => router.push('/modal/events-overview')}>
                  <Text style={styles.eventsViewAll}>Alle anzeigen →</Text>
                </TouchableOpacity>
              )}
            </View>
            {events.slice(0, 3).map((event) => {
              const categoryIcons: Record<EventCategory, string> = {
                doctor: 'doctor',
                school: 'school',
                daycare: 'home-heart',
                sports: 'run',
                music: 'music',
                birthday: 'cake-variant',
                vacation: 'beach',
                other: 'calendar',
              };
              const categoryColors: Record<EventCategory, string> = {
                doctor: '#EF4444',
                school: '#F59E0B',
                daycare: '#EC4899',
                sports: '#10B981',
                music: '#8B5CF6',
                birthday: '#F97316',
                vacation: '#3B82F6',
                other: '#6B7280',
              };

              return (
                <TouchableOpacity
                  key={event.id}
                  style={styles.eventItem}
                  onPress={() => router.push('/modal/events-overview')}
                  activeOpacity={0.7}
                >
                  <View
                    style={[
                      styles.eventItemIcon,
                      { backgroundColor: categoryColors[event.category] + '15' },
                    ]}
                  >
                    <MaterialCommunityIcons
                      name={categoryIcons[event.category] as any}
                      size={20}
                      color={categoryColors[event.category]}
                    />
                  </View>
                  <View style={styles.eventItemContent}>
                    <Text style={styles.eventItemTitle}>{event.title}</Text>
                    <View style={styles.eventItemMeta}>
                      <Text style={styles.eventItemDate}>
                        {formatDayMonth(parseISO(event.date))}
                      </Text>
                      {event.time && (
                        <>
                          <Text style={styles.eventItemDot}>•</Text>
                          <Text style={styles.eventItemTime}>{event.time}</Text>
                        </>
                      )}
                    </View>
                  </View>
                  <MaterialCommunityIcons name="chevron-right" size={20} color="#9CA3AF" />
                </TouchableOpacity>
              );
            })}
            {events.length > 3 && (
              <Text style={styles.eventsCount}>
                +{events.length - 3} weitere Termine
              </Text>
            )}
          </View>
        )}
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
  dayIndicators: {
    flexDirection: 'row',
    gap: 3,
    marginTop: 2,
  },
  exceptionDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#F59E0B',
  },
  eventDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#EC4899', // Pink
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
  pendingSection: {
    marginBottom: 16,
  },
  pendingTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 12,
  },
  exceptionCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#FDE68A',
    borderLeftWidth: 4,
    borderLeftColor: '#F59E0B',
  },
  exceptionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  exceptionDate: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111',
    flex: 1,
  },
  exceptionReason: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 4,
  },
  exceptionNote: {
    fontSize: 13,
    color: '#9CA3AF',
    fontStyle: 'italic',
    marginBottom: 8,
  },
  exceptionChange: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: '#F9FAFB',
    borderRadius: 8,
    marginBottom: 12,
  },
  exceptionChangeText: {
    fontSize: 13,
    color: '#374151',
  },
  exceptionButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  exceptionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
  },
  acceptButton: {
    backgroundColor: '#D1FAE5',
    borderColor: '#10B981',
  },
  rejectButton: {
    backgroundColor: '#FEE2E2',
    borderColor: '#EF4444',
  },
  acceptButtonText: {
    color: '#059669',
    fontSize: 14,
    fontWeight: '600',
  },
  rejectButtonText: {
    color: '#DC2626',
    fontSize: 14,
    fontWeight: '600',
  },
  eventsSection: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginTop: 24,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  eventsSectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  eventsSectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#111',
  },
  eventsViewAll: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.primary,
  },
  eventItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  eventItemIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  eventItemContent: {
    flex: 1,
  },
  eventItemTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#111',
    marginBottom: 4,
  },
  eventItemMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  eventItemDate: {
    fontSize: 13,
    color: '#6B7280',
  },
  eventItemTime: {
    fontSize: 13,
    color: '#6B7280',
  },
  eventItemDot: {
    fontSize: 13,
    color: '#D1D5DB',
  },
  eventsCount: {
    fontSize: 13,
    color: '#6B7280',
    textAlign: 'center',
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
  },
});
