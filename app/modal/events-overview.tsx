import { useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, Modal, Pressable } from 'react-native';
import { AppAlert } from '@/lib/alert';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useEvents, useDeleteEvent, useCustodyExceptions, useEventAttendances, useSetAttendance, useFamilyMembers, useMyAttendances } from '@/hooks/useFamily';
import { useAuth } from '@/lib/auth';
import { COLORS } from '@/lib/constants';
import { EVENT_CATEGORY_LABELS, type EventCategory, type AttendanceStatus, ATTENDANCE_STATUS_LABELS, type Event } from '@/types';
import { formatDayMonth } from '@/lib/date-utils';
import { startOfMonth, format, parseISO } from 'date-fns';
import { de } from 'date-fns/locale';
import { useResponsive } from '@/hooks/useResponsive';
import { addEventToCalendar, addMultipleEventsToCalendar } from '@/lib/calendar-export';

export default function EventsOverviewScreen() {
  const { contentMaxWidth } = useResponsive();
  const { user } = useAuth();
  const { data: events, isLoading } = useEvents();
  const { data: exceptions } = useCustodyExceptions();
  const { data: members } = useFamilyMembers();
  const deleteEvent = useDeleteEvent();
  const setAttendance = useSetAttendance();
  const [showAddMenu, setShowAddMenu] = useState(false);

  const { data: myAttendances } = useMyAttendances();

  const pendingExceptions = exceptions?.filter((e) => e.status === 'proposed' && e.proposed_by !== user?.id) ?? [];
  const answeredEventIds = new Set(myAttendances?.map((a) => a.event_id) ?? []);
  const schoolEventsNeedingRsvp = events?.filter(
    (e) => e.category === 'school' && e.created_by !== user?.id && !answeredEventIds.has(e.id)
  ) ?? [];

  // Group events by month
  const eventsByMonth = events?.reduce((acc, event) => {
    const monthKey = format(parseISO(event.date), 'yyyy-MM', { locale: de });
    if (!acc[monthKey]) {
      acc[monthKey] = [];
    }
    acc[monthKey].push(event);
    return acc;
  }, {} as Record<string, typeof events>);

  const monthKeys = eventsByMonth ? Object.keys(eventsByMonth).sort().reverse() : [];

  function handleDeleteEvent(eventId: string, title: string) {
    AppAlert.alert(
      'Termin löschen',
      `Möchtest du "${title}" wirklich löschen?`,
      [
        { text: 'Abbrechen', style: 'cancel' },
        {
          text: 'Löschen',
          style: 'destructive',
          onPress: () => deleteEvent.mutate(eventId),
        },
      ]
    );
  }

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
    <SafeAreaView style={styles.safeArea} edges={['bottom']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.closeButton}>
          <MaterialCommunityIcons name="close" size={24} color="#111" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Terminübersicht</Text>
        <TouchableOpacity
          onPress={() => setShowAddMenu(true)}
          style={styles.addButton}
        >
          <MaterialCommunityIcons name="plus" size={24} color={COLORS.primary} />
        </TouchableOpacity>
      </View>

      {/* Add Menu Modal */}
      <Modal visible={showAddMenu} transparent animationType="fade" onRequestClose={() => setShowAddMenu(false)}>
        <Pressable style={styles.actionSheetOverlay} onPress={() => setShowAddMenu(false)}>
          <View style={styles.actionSheetCard}>
            <Text style={styles.actionSheetTitle}>Termin erstellen</Text>
            <TouchableOpacity style={styles.actionSheetOption} onPress={() => { setShowAddMenu(false); router.push('/modal/add-event'); }}>
              <View style={[styles.actionSheetIconWrap, { backgroundColor: '#EEF2FF' }]}>
                <MaterialCommunityIcons name="calendar-plus" size={22} color={COLORS.primary} />
              </View>
              <View style={styles.actionSheetOptionText}>
                <Text style={styles.actionSheetOptionTitle}>Standard-Termin</Text>
                <Text style={styles.actionSheetOptionDesc}>Arzt, Sport, Geburtstag, etc.</Text>
              </View>
            </TouchableOpacity>
            <TouchableOpacity style={styles.actionSheetOption} onPress={() => { setShowAddMenu(false); router.push('/modal/add-event?category=school'); }}>
              <View style={[styles.actionSheetIconWrap, { backgroundColor: '#FEF3C7' }]}>
                <MaterialCommunityIcons name="school" size={22} color="#F59E0B" />
              </View>
              <View style={styles.actionSheetOptionText}>
                <Text style={styles.actionSheetOptionTitle}>Schul- / Gemeinschaftstermin</Text>
                <Text style={styles.actionSheetOptionDesc}>Elternabend, Schulfest, etc.</Text>
              </View>
            </TouchableOpacity>
            <TouchableOpacity style={styles.actionSheetOption} onPress={() => { setShowAddMenu(false); router.push('/modal/add-exception'); }}>
              <View style={[styles.actionSheetIconWrap, { backgroundColor: '#FEE2E2' }]}>
                <MaterialCommunityIcons name="swap-horizontal" size={22} color="#EF4444" />
              </View>
              <View style={styles.actionSheetOptionText}>
                <Text style={styles.actionSheetOptionTitle}>Ausnahme / Tagetausch</Text>
                <Text style={styles.actionSheetOptionDesc}>Einmalige Änderung am Wechselplan</Text>
              </View>
            </TouchableOpacity>
            <TouchableOpacity style={styles.actionSheetCancel} onPress={() => setShowAddMenu(false)}>
              <Text style={styles.actionSheetCancelText}>Abbrechen</Text>
            </TouchableOpacity>
          </View>
        </Pressable>
      </Modal>

      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
        <View style={{ maxWidth: contentMaxWidth, alignSelf: 'center', width: '100%' }}>

        {/* Pending Exceptions */}
        {pendingExceptions.length > 0 && (
          <View style={styles.pendingSection}>
            <Text style={styles.pendingSectionTitle}>Vorgeschlagene Ausnahmen ({pendingExceptions.length})</Text>
            {pendingExceptions.map((exc) => (
              <View key={exc.id} style={styles.pendingCard}>
                <View style={[styles.pendingIconWrap, { backgroundColor: '#FEF3C7' }]}>
                  <MaterialCommunityIcons name="swap-horizontal" size={20} color="#F59E0B" />
                </View>
                <View style={styles.pendingInfo}>
                  <Text style={styles.pendingTitle}>{formatDayMonth(parseISO(exc.date))}</Text>
                  <Text style={styles.pendingDesc}>{exc.reason || 'Ausnahme vorgeschlagen'}</Text>
                </View>
                <TouchableOpacity onPress={() => router.push('/modal/add-exception')} style={styles.pendingAction}>
                  <Text style={styles.pendingActionText}>Ansehen</Text>
                </TouchableOpacity>
              </View>
            ))}
          </View>
        )}

        {/* School Events needing RSVP */}
        {schoolEventsNeedingRsvp.length > 0 && (
          <View style={styles.pendingSection}>
            <Text style={styles.pendingSectionTitle}>Schultermine (Anfragen)</Text>
            {schoolEventsNeedingRsvp.map((event) => (
              <EventRsvpCard
                key={event.id}
                event={event}
                userId={user?.id ?? ''}
                members={members ?? []}
                onSetAttendance={(status) => setAttendance.mutate({ eventId: event.id, status })}
              />
            ))}
          </View>
        )}

        {isLoading && (
          <View style={styles.loading}>
            <Text style={styles.loadingText}>Laden...</Text>
          </View>
        )}

        {!isLoading && events && events.length === 0 && (
          <View style={styles.emptyState}>
            <MaterialCommunityIcons name="calendar-blank" size={64} color="#9CA3AF" />
            <Text style={styles.emptyTitle}>Keine Termine</Text>
            <Text style={styles.emptyText}>
              Du hast noch keine Termine erstellt. Tippe auf einen Tag im Kalender oder auf das + oben, um einen Termin anzulegen.
            </Text>
            <TouchableOpacity
              style={styles.emptyButton}
              onPress={() => router.push('/modal/add-event')}
            >
              <MaterialCommunityIcons name="plus" size={20} color="#fff" />
              <Text style={styles.emptyButtonText}>Ersten Termin erstellen</Text>
            </TouchableOpacity>
          </View>
        )}

        {!isLoading && events && events.length > 0 && (
          <TouchableOpacity
            style={styles.exportAllButton}
            onPress={() => addMultipleEventsToCalendar(
              events.map((e) => ({
                title: e.title,
                date: e.date,
                time: e.time,
                location: e.location,
                description: e.description,
              }))
            )}
            activeOpacity={0.7}
          >
            <MaterialCommunityIcons name="calendar-export" size={18} color="#4F46E5" />
            <Text style={styles.exportAllButtonText}>Alle Termine in Kalender übertragen</Text>
          </TouchableOpacity>
        )}

        {!isLoading && monthKeys.length > 0 && monthKeys.map((monthKey) => {
          const monthEvents = eventsByMonth![monthKey];
          const monthLabel = format(
            parseISO(`${monthKey}-01`),
            'MMMM yyyy',
            { locale: de }
          );

          return (
            <View key={monthKey} style={styles.monthSection}>
              <Text style={styles.monthTitle}>{monthLabel}</Text>
              {monthEvents.map((event) => (
                <View key={event.id} style={styles.eventCard}>
                  <View style={styles.eventLeft}>
                    <View
                      style={[
                        styles.eventIconContainer,
                        { backgroundColor: categoryColors[event.category] + '15' },
                      ]}
                    >
                      <MaterialCommunityIcons
                        name={categoryIcons[event.category] as any}
                        size={24}
                        color={categoryColors[event.category]}
                      />
                    </View>
                    <View style={styles.eventInfo}>
                      <Text style={styles.eventTitle}>{event.title}</Text>
                      <View style={styles.eventMeta}>
                        <Text style={styles.eventDate}>
                          {formatDayMonth(parseISO(event.date))}
                        </Text>
                        {event.time && (
                          <>
                            <Text style={styles.eventMetaDot}>•</Text>
                            <Text style={styles.eventTime}>{event.time}</Text>
                          </>
                        )}
                        <Text style={styles.eventMetaDot}>•</Text>
                        <Text style={styles.eventCategory}>
                          {EVENT_CATEGORY_LABELS[event.category]}
                        </Text>
                      </View>
                      {event.location && (
                        <View style={styles.eventLocationRow}>
                          <MaterialCommunityIcons name="map-marker" size={14} color="#6B7280" />
                          <Text style={styles.eventLocation}>{event.location}</Text>
                        </View>
                      )}
                    </View>
                  </View>
                  <View style={styles.eventActions}>
                    <TouchableOpacity
                      onPress={() => addEventToCalendar({
                        title: event.title,
                        date: event.date,
                        time: event.time,
                        location: event.location,
                        description: event.description,
                      })}
                      style={styles.calendarExportButton}
                    >
                      <MaterialCommunityIcons name="calendar-export" size={20} color="#4F46E5" />
                    </TouchableOpacity>
                    <TouchableOpacity
                      onPress={() => handleDeleteEvent(event.id, event.title)}
                      style={styles.deleteButton}
                      disabled={deleteEvent.isPending}
                    >
                      <MaterialCommunityIcons name="delete-outline" size={22} color="#EF4444" />
                    </TouchableOpacity>
                  </View>
                </View>
              ))}
            </View>
          );
        })}
        </View>
      </ScrollView>

      {/* Floating Action Button */}
      {!isLoading && events && events.length > 0 && (
        <TouchableOpacity
          style={styles.fab}
          onPress={() => setShowAddMenu(true)}
          activeOpacity={0.8}
        >
          <MaterialCommunityIcons name="plus" size={28} color="#fff" />
        </TouchableOpacity>
      )}
    </SafeAreaView>
  );
}

const RSVP_COLORS: Record<AttendanceStatus, { bg: string; border: string; text: string; activeBg: string }> = {
  yes:   { bg: '#F0FDF4', border: '#86EFAC', text: '#15803D', activeBg: '#22C55E' },
  no:    { bg: '#FEF2F2', border: '#FCA5A5', text: '#B91C1C', activeBg: '#EF4444' },
  maybe: { bg: '#FFFBEB', border: '#FCD34D', text: '#92400E', activeBg: '#F59E0B' },
};

const RSVP_ICONS: Record<AttendanceStatus, string> = {
  yes: 'check-circle',
  no: 'close-circle',
  maybe: 'help-circle',
};

function EventRsvpCard({ event, userId, members, onSetAttendance }: {
  event: Event; userId: string; members: any[];
  onSetAttendance: (status: AttendanceStatus) => void;
}) {
  const { data: attendances } = useEventAttendances(event.id);
  const myAttendance = attendances?.find((a) => a.user_id === userId);

  const otherResponses = attendances
    ?.filter((a) => a.user_id !== userId)
    .map((a) => {
      const member = members.find((m: any) => m.user_id === a.user_id);
      const name = member?.profile?.display_name ?? 'Partner';
      return { name, status: a.status as AttendanceStatus };
    }) ?? [];

  return (
    <View style={styles.pendingCard}>
      <View style={[styles.pendingIconWrap, { backgroundColor: '#EEF2FF' }]}>
        <MaterialCommunityIcons name="school" size={20} color={COLORS.primary} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={styles.pendingTitle}>{event.title}</Text>
        <Text style={styles.pendingDesc}>
          {formatDayMonth(parseISO(event.date))}{event.time ? ` • ${event.time.substring(0, 5)}` : ''}
        </Text>

        {otherResponses.length > 0 && (
          <View style={styles.otherResponsesRow}>
            {otherResponses.map((r, i) => (
              <View key={i} style={[styles.otherResponseTag, { backgroundColor: RSVP_COLORS[r.status].bg, borderColor: RSVP_COLORS[r.status].border }]}>
                <MaterialCommunityIcons name={RSVP_ICONS[r.status] as any} size={13} color={RSVP_COLORS[r.status].text} />
                <Text style={[styles.otherResponseText, { color: RSVP_COLORS[r.status].text }]}>
                  {r.name}: {ATTENDANCE_STATUS_LABELS[r.status]}
                </Text>
              </View>
            ))}
          </View>
        )}

        <View style={styles.rsvpRow}>
          {(['yes', 'no', 'maybe'] as AttendanceStatus[]).map((status) => {
            const isSelected = myAttendance?.status === status;
            const colors = RSVP_COLORS[status];
            return (
              <TouchableOpacity
                key={status}
                onPress={() => onSetAttendance(status)}
                style={[
                  styles.rsvpChip,
                  { borderColor: colors.border, backgroundColor: isSelected ? colors.activeBg : colors.bg },
                  isSelected && { borderWidth: 2 },
                ]}
              >
                <MaterialCommunityIcons name={RSVP_ICONS[status] as any} size={14} color={isSelected ? '#fff' : colors.text} />
                <Text style={[styles.rsvpChipText, { color: isSelected ? '#fff' : colors.text }, isSelected && { fontWeight: '700' }]}>
                  {ATTENDANCE_STATUS_LABELS[status]}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>
    </View>
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
  addButton: {
    padding: 4,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingVertical: 16,
    paddingBottom: 100,
  },
  loading: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 100,
  },
  loadingText: {
    fontSize: 16,
    color: '#6B7280',
  },
  emptyState: {
    alignItems: 'center',
    paddingTop: 80,
    paddingHorizontal: 32,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#111',
    marginTop: 16,
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 15,
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 24,
  },
  emptyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: COLORS.primary,
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 12,
  },
  emptyButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  monthSection: {
    marginBottom: 24,
  },
  monthTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#374151',
    marginBottom: 12,
    textTransform: 'capitalize',
  },
  eventCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  eventLeft: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    flex: 1,
    gap: 12,
  },
  eventIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  eventInfo: {
    flex: 1,
  },
  eventTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111',
    marginBottom: 6,
  },
  eventMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: 4,
  },
  eventDate: {
    fontSize: 14,
    color: '#6B7280',
  },
  eventTime: {
    fontSize: 14,
    color: '#6B7280',
  },
  eventCategory: {
    fontSize: 14,
    color: '#6B7280',
  },
  eventMetaDot: {
    fontSize: 14,
    color: '#D1D5DB',
  },
  eventLocationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 4,
  },
  eventLocation: {
    fontSize: 13,
    color: '#9CA3AF',
  },
  eventActions: {
    alignItems: 'center',
    gap: 2,
  },
  calendarExportButton: {
    padding: 8,
  },
  deleteButton: {
    padding: 8,
  },
  exportAllButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#EEF2FF',
    borderWidth: 1,
    borderColor: '#C7D2FE',
    borderRadius: 10,
    paddingVertical: 12,
    marginBottom: 16,
  },
  exportAllButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#4F46E5',
  },
  fab: {
    position: 'absolute',
    bottom: 24,
    right: 24,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  actionSheetOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'flex-end',
  },
  actionSheetCard: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    paddingBottom: 36,
  },
  actionSheetTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111',
    textAlign: 'center',
    marginBottom: 16,
  },
  actionSheetOption: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: 12,
    backgroundColor: '#F9FAFB',
    marginBottom: 8,
    gap: 12,
  },
  actionSheetIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionSheetOptionText: {
    flex: 1,
  },
  actionSheetOptionTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#111',
  },
  actionSheetOptionDesc: {
    fontSize: 13,
    color: '#6B7280',
    marginTop: 2,
  },
  actionSheetCancel: {
    marginTop: 8,
    padding: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  actionSheetCancelText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#6B7280',
  },
  pendingSection: {
    marginBottom: 20,
  },
  pendingSectionTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#374151',
    marginBottom: 10,
  },
  pendingCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#FDE68A',
    gap: 10,
  },
  pendingIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pendingInfo: {
    flex: 1,
  },
  pendingTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#111',
  },
  pendingDesc: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 2,
  },
  pendingAction: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: '#EEF2FF',
  },
  pendingActionText: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.primary,
  },
  otherResponsesRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 4,
    marginTop: 6,
  },
  otherResponseTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 10,
    borderWidth: 1,
  },
  otherResponseText: {
    fontSize: 10,
    fontWeight: '600',
  },
  rsvpRow: {
    flexDirection: 'row',
    gap: 6,
    marginTop: 8,
  },
  rsvpChip: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 3,
    paddingVertical: 6,
    borderRadius: 6,
    borderWidth: 1,
  },
  rsvpChipText: {
    fontSize: 11,
    fontWeight: '600',
  },
});
