import { View, Text, ScrollView, TouchableOpacity, StyleSheet } from 'react-native';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useAuth } from '@/lib/auth';
import { useCustodyPattern, useCustodyExceptions, useFamilyMembers, useEvents, useMyAttendances } from '@/hooks/useFamily';
import { useUnreadActivity } from '@/hooks/useUnreadActivity';
import { getCustodyForDate, buildExceptionMap } from '@/lib/custody-engine';
import { getNext7Days, formatShortDay, formatDayMonth, formatFullDate } from '@/lib/date-utils';
import { PARENT_COLORS, COLORS } from '@/lib/constants';
import { useResponsive } from '@/hooks/useResponsive';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import type { Parent } from '@/types';

export default function HomeScreen() {
  const { profile, family, user } = useAuth();
  const { contentMaxWidth } = useResponsive();
  const { data: pattern } = useCustodyPattern();
  const { data: exceptions } = useCustodyExceptions();
  const { data: members } = useFamilyMembers();
  const { data: events } = useEvents();
  const { data: myAttendances } = useMyAttendances();
  const { summary } = useUnreadActivity();

  const pendingExceptions = exceptions?.filter((e) => e.status === 'proposed' && e.proposed_by !== user?.id) ?? [];
  const answeredEventIds = new Set(myAttendances?.map((a) => a.event_id) ?? []);
  const schoolEventsNeedingRsvp = events?.filter(
    (e) => e.category === 'school' && e.created_by !== user?.id && !answeredEventIds.has(e.id)
  ) ?? [];

  const { data: pendingHandovers } = useQuery({
    queryKey: ['handovers_pending_home', family?.id],
    queryFn: async () => {
      if (!family || !user) return [];
      const { data, error } = await supabase
        .from('handovers')
        .select('id, date, from_parent, to_parent')
        .eq('family_id', family.id)
        .eq('status', 'pending')
        .eq('to_parent', user.id)
        .order('date');
      if (error) throw error;
      return data ?? [];
    },
    enabled: !!family && !!user,
  });

  const today = new Date();
  const next7Days = getNext7Days(today);
  const exceptionMap = buildExceptionMap(exceptions ?? []);

  const todayParent: Parent | null = pattern
    ? getCustodyForDate(pattern, today, exceptionMap)
    : null;

  const parentName = (parent: Parent) => {
    if (parent === 'parent_a' && family?.parent_a_label) return family.parent_a_label;
    if (parent === 'parent_b' && family?.parent_b_label) return family.parent_b_label;
    const member = members?.find((m) => m.role === parent);
    if (member?.profile?.display_name) return member.profile.display_name;
    return parent === 'parent_a' ? 'Elternteil A' : 'Elternteil B';
  };

  const parentInitial = (parent: Parent) => {
    const name = parentName(parent);
    return name.charAt(0).toUpperCase();
  };

  const unreadLabel = (() => {
    const parts: string[] = [];
    if (summary.events > 0) parts.push(`${summary.events} Termin${summary.events === 1 ? '' : 'e'}`);
    if (summary.expenses > 0) parts.push(`${summary.expenses} Ausgabe${summary.expenses === 1 ? '' : 'n'}`);
    if (summary.exceptionsProposed > 0) parts.push(`${summary.exceptionsProposed} Ausnahme${summary.exceptionsProposed === 1 ? '' : 'n'}`);
    if (summary.exceptionsResponded > 0) parts.push(`${summary.exceptionsResponded} Antwort${summary.exceptionsResponded === 1 ? '' : 'en'}`);
    if (summary.schoolTasks > 0) parts.push(`${summary.schoolTasks} Aufgabe${summary.schoolTasks === 1 ? '' : 'n'}`);
    return parts.join(' • ');
  })();

    return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
        <View style={{ maxWidth: contentMaxWidth, alignSelf: 'center', width: '100%' }}>
        {/* Greeting */}
        <Text style={styles.greeting}>Hallo, {profile?.display_name ?? 'dort'} 👋</Text>

        {/* In-app activity notifications */}
        {summary.total > 0 && (
          <TouchableOpacity
            style={styles.notificationBar}
            activeOpacity={0.8}
            onPress={() => router.push('/modal/activity')}
          >
            <View style={styles.notificationBarLeft}>
              <View style={styles.notificationDot} />
              <MaterialCommunityIcons name="bell" size={18} color="#991B1B" />
              <Text style={styles.notificationTitle}>Neu</Text>
            </View>
            <Text style={styles.notificationText} numberOfLines={1}>
              {unreadLabel || `${summary.total} Update${summary.total === 1 ? '' : 's'}`}
            </Text>
            <MaterialCommunityIcons name="chevron-right" size={22} color="#991B1B" />
          </TouchableOpacity>
        )}

        {/* Today Card */}
        {todayParent && (
          <View style={styles.card}>
            <View style={styles.todayCard}>
              <Text style={styles.todayDate}>Heute, {formatFullDate(today)}</Text>
              <View
                style={[
                  styles.todayAvatar,
                  { backgroundColor: PARENT_COLORS[todayParent] },
                ]}
              >
                <MaterialCommunityIcons name="account" size={32} color="#fff" />
              </View>
              <Text style={styles.todayName}>Bei {parentName(todayParent)}</Text>
            </View>
          </View>
        )}

        {/* Week Preview */}
        {pattern && (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Naechste 7 Tage</Text>
            <View style={styles.weekPreview}>
              {next7Days.map((day, i) => {
                const parent = getCustodyForDate(pattern, day, exceptionMap);
                const isToday = i === 0;
                return (
                  <View key={i} style={styles.dayColumn}>
                    <Text style={[styles.dayName, isToday && styles.dayNameToday]}>
                      {formatShortDay(day)}
                    </Text>
                    <View
                      style={[
                        styles.dayBadge,
                        { backgroundColor: PARENT_COLORS[parent] },
                        isToday && styles.dayBadgeToday,
                      ]}
                    >
                      <Text style={styles.dayBadgeText}>
                        {parentInitial(parent)}
                      </Text>
                    </View>
                    <Text style={styles.dayDate}>{formatDayMonth(day)}</Text>
                  </View>
                );
              })}
            </View>
          </View>
        )}

        {/* Pending Exceptions */}
        {pendingExceptions.length > 0 && (
          <TouchableOpacity
            style={styles.alertCard}
            onPress={() => router.push('/modal/add-exception')}
            activeOpacity={0.7}
          >
            <View style={[styles.alertIcon, { backgroundColor: '#FEF3C7' }]}>
              <MaterialCommunityIcons name="swap-horizontal" size={20} color="#F59E0B" />
            </View>
            <View style={styles.alertInfo}>
              <Text style={styles.alertTitle}>
                Vorgeschlagene Ausnahmen ({pendingExceptions.length})
              </Text>
              <Text style={styles.alertDesc}>Warten auf deine Antwort</Text>
            </View>
            <MaterialCommunityIcons name="chevron-right" size={22} color="#9CA3AF" />
          </TouchableOpacity>
        )}

        {/* School Event Requests */}
        {schoolEventsNeedingRsvp.length > 0 && (
          <TouchableOpacity
            style={styles.alertCard}
            onPress={() => router.push('/modal/school')}
            activeOpacity={0.7}
          >
            <View style={[styles.alertIcon, { backgroundColor: '#EEF2FF' }]}>
              <MaterialCommunityIcons name="school" size={20} color={COLORS.primary} />
            </View>
            <View style={styles.alertInfo}>
              <Text style={styles.alertTitle}>
                Schultermine ({schoolEventsNeedingRsvp.length})
              </Text>
              <Text style={styles.alertDesc}>Zu-/Absage ausstehend</Text>
            </View>
            <MaterialCommunityIcons name="chevron-right" size={22} color="#9CA3AF" />
          </TouchableOpacity>
        )}

        {/* Pending Handover Confirmations */}
        {pendingHandovers && pendingHandovers.length > 0 && (
          <TouchableOpacity
            style={styles.alertCard}
            onPress={() => router.push('/(tabs)/handover')}
            activeOpacity={0.7}
          >
            <View style={[styles.alertIcon, { backgroundColor: '#FEF3C7' }]}>
              <MaterialCommunityIcons name="package-variant" size={20} color="#92400E" />
            </View>
            <View style={styles.alertInfo}>
              <Text style={styles.alertTitle}>
                Mitgabe bestätigen ({pendingHandovers.length})
              </Text>
              <Text style={styles.alertDesc}>Eingehende Übergabe quittieren</Text>
            </View>
            <MaterialCommunityIcons name="chevron-right" size={22} color="#9CA3AF" />
          </TouchableOpacity>
        )}

        {/* Quick Actions */}
        <Text style={styles.sectionTitle}>Schnellaktionen</Text>
        <View style={styles.quickActions}>
          <QuickAction
            icon="currency-eur"
            label="Ausgabe"
            color="#10B981"
            onPress={() => router.push('/modal/add-expense')}
          />
          <QuickAction
            icon="swap-horizontal"
            label="Uebergabe"
            color="#3B82F6"
            onPress={() => router.push('/(tabs)/handover')}
          />
          <QuickAction
            icon="calendar-edit"
            label="Ausnahme"
            color="#F59E0B"
            onPress={() => router.push('/modal/add-exception')}
          />
          <QuickAction
            icon="calendar-text"
            label="Terminübersicht"
            color="#8B5CF6"
            onPress={() => router.push('/modal/events-overview')}
          />
          <QuickAction
            icon="account-group"
            label="Kontakte"
            color="#14B8A6"
            onPress={() => router.push('/modal/contacts')}
          />
          <QuickAction
            icon="school"
            label="Schule"
            color="#EC4899"
            onPress={() => router.push('/modal/school')}
          />
          <QuickAction
            icon="file-document"
            label="Dokumente"
            color="#6366F1"
            onPress={() => router.push('/modal/documents')}
          />
        </View>

        {/* No pattern message */}
        {!pattern && (
          <View style={styles.card}>
            <View style={styles.noPattern}>
              <MaterialCommunityIcons name="calendar-question" size={40} color={COLORS.textMuted} />
              <Text style={styles.noPatternTitle}>Noch kein Betreuungsmodell</Text>
              <Text style={styles.noPatternText}>
                Richte zuerst euer Betreuungsmodell ein.
              </Text>
            </View>
          </View>
        )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function QuickAction({
  icon,
  label,
  color,
  onPress,
}: {
  icon: string;
  label: string;
  color: string;
  onPress: () => void;
}) {
  return (
    <TouchableOpacity onPress={onPress} style={styles.quickActionButton} activeOpacity={0.7}>
      <View
        style={[
          styles.quickActionIcon,
          { backgroundColor: color + '15' },
        ]}
      >
        <MaterialCommunityIcons name={icon as any} size={26} color={color} />
      </View>
      <Text style={styles.quickActionLabel}>{label}</Text>
    </TouchableOpacity>
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
    paddingBottom: 32,
  },
  greeting: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111',
    marginBottom: 16,
  },
  notificationBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FEF2F2',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#FCA5A5',
  },
  notificationBarLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  notificationDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#EF4444',
  },
  notificationTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#991B1B',
  },
  notificationText: {
    flex: 1,
    marginLeft: 10,
    marginRight: 10,
    fontSize: 13,
    color: '#991B1B',
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  todayCard: {
    alignItems: 'center',
    paddingVertical: 8,
  },
  todayDate: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 4,
  },
  todayAvatar: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  todayName: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#111',
  },
  cardTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 12,
  },
  weekPreview: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  dayColumn: {
    flex: 1,
    alignItems: 'center',
  },
  dayName: {
    fontSize: 12,
    color: '#6B7280',
    marginBottom: 4,
  },
  dayNameToday: {
    fontWeight: 'bold',
    color: '#111',
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
  dayBadgeText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  dayDate: {
    fontSize: 10,
    color: '#9CA3AF',
    marginTop: 4,
  },
  alertCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#FDE68A',
    gap: 12,
  },
  alertIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  alertInfo: {
    flex: 1,
  },
  alertTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#111',
  },
  alertDesc: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 2,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 12,
  },
  quickActions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 24,
    justifyContent: 'flex-start',
  },
  quickActionButton: {
    width: '22%',
    alignItems: 'center',
  },
  quickActionIcon: {
    width: 56,
    height: 56,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 6,
  },
  quickActionLabel: {
    fontSize: 12,
    color: '#4B5563',
    textAlign: 'center',
  },
  noPattern: {
    alignItems: 'center',
    paddingVertical: 16,
  },
  noPatternTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#374151',
    marginTop: 8,
  },
  noPatternText: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
    marginTop: 4,
  },
});
