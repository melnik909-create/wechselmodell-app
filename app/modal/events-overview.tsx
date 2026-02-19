import { View, Text, ScrollView, TouchableOpacity, StyleSheet } from 'react-native';
import { AppAlert } from '@/lib/alert';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useEvents, useDeleteEvent } from '@/hooks/useFamily';
import { COLORS } from '@/lib/constants';
import { EVENT_CATEGORY_LABELS, type EventCategory } from '@/types';
import { formatDayMonth } from '@/lib/date-utils';
import { startOfMonth, format, parseISO } from 'date-fns';
import { de } from 'date-fns/locale';
import { useResponsive } from '@/hooks/useResponsive';

export default function EventsOverviewScreen() {
  const { contentMaxWidth } = useResponsive();
  const { data: events, isLoading } = useEvents(); // No date filter - show all events
  const deleteEvent = useDeleteEvent();

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
          onPress={() => router.push('/modal/add-event')}
          style={styles.addButton}
        >
          <MaterialCommunityIcons name="plus" size={24} color={COLORS.primary} />
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
        <View style={{ maxWidth: contentMaxWidth, alignSelf: 'center', width: '100%' }}>
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
                  <TouchableOpacity
                    onPress={() => handleDeleteEvent(event.id, event.title)}
                    style={styles.deleteButton}
                    disabled={deleteEvent.isPending}
                  >
                    <MaterialCommunityIcons name="delete-outline" size={22} color="#EF4444" />
                  </TouchableOpacity>
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
          onPress={() => router.push('/modal/add-event')}
          activeOpacity={0.8}
        >
          <MaterialCommunityIcons name="plus" size={28} color="#fff" />
        </TouchableOpacity>
      )}
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
  deleteButton: {
    padding: 8,
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
});
