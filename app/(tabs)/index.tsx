import { View, Text, ScrollView, TouchableOpacity, StyleSheet } from 'react-native';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useAuth } from '@/lib/auth';
import { useCustodyPattern, useCustodyExceptions, useFamilyMembers } from '@/hooks/useFamily';
import { getCustodyForDate, buildExceptionMap } from '@/lib/custody-engine';
import { getNext7Days, formatShortDay, formatDayMonth, formatFullDate } from '@/lib/date-utils';
import { PARENT_COLORS, COLORS } from '@/lib/constants';
import { useResponsive } from '@/hooks/useResponsive';
import type { Parent } from '@/types';

export default function HomeScreen() {
  const { profile, family } = useAuth();
  const { contentMaxWidth } = useResponsive();
  const { data: pattern } = useCustodyPattern();
  const { data: exceptions } = useCustodyExceptions();
  const { data: members } = useFamilyMembers();

  const today = new Date();
  const next7Days = getNext7Days(today);
  const exceptionMap = buildExceptionMap(exceptions ?? []);

  const todayParent: Parent | null = pattern
    ? getCustodyForDate(pattern, today, exceptionMap)
    : null;

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

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
        <View style={{ maxWidth: contentMaxWidth, alignSelf: 'center', width: '100%' }}>
        {/* Greeting */}
        <Text style={styles.greeting}>Hallo, {profile?.display_name ?? 'dort'} 👋</Text>

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
                        {parent === 'parent_a' ? 'A' : 'B'}
                      </Text>
                    </View>
                    <Text style={styles.dayDate}>{formatDayMonth(day)}</Text>
                  </View>
                );
              })}
            </View>
          </View>
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
