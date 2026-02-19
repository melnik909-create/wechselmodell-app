import { View, Text, ScrollView, TouchableOpacity, StyleSheet } from 'react-native';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useUnreadActivity } from '@/hooks/useUnreadActivity';
import { useResponsive } from '@/hooks/useResponsive';

export default function ActivityScreen() {
  const { contentMaxWidth } = useResponsive();
  const { summary, isLoading, markAllRead } = useUnreadActivity();

  const items = [
    {
      key: 'events',
      label: 'Termine',
      count: summary.events,
      icon: 'calendar',
      color: '#7C3AED',
      onPress: () => router.push('/modal/events-overview'),
    },
    {
      key: 'expenses',
      label: 'Ausgaben',
      count: summary.expenses,
      icon: 'currency-eur',
      color: '#10B981',
      onPress: () => router.push('/(tabs)/expenses'),
    },
    {
      key: 'exceptionsProposed',
      label: 'Neue Ausnahmen',
      count: summary.exceptionsProposed,
      icon: 'calendar-edit',
      color: '#F59E0B',
      onPress: () => router.push('/(tabs)/calendar'),
    },
    {
      key: 'exceptionsResponded',
      label: 'Antworten auf Ausnahmen',
      count: summary.exceptionsResponded,
      icon: 'check-decagram',
      color: '#3B82F6',
      onPress: () => router.push('/(tabs)/calendar'),
    },
    {
      key: 'schoolTasks',
      label: 'Schule',
      count: summary.schoolTasks,
      icon: 'school',
      color: '#EC4899',
      onPress: () => router.push('/modal/school'),
    },
  ].filter((i) => i.count > 0);

  return (
    <SafeAreaView style={styles.safeArea} edges={['bottom']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.closeButton}>
          <MaterialCommunityIcons name="close" size={24} color="#111" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Neuigkeiten</Text>
        <View style={{ width: 28 }} />
      </View>

      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
        <View style={{ maxWidth: contentMaxWidth, alignSelf: 'center', width: '100%' }}>
          {isLoading && (
            <View style={styles.loading}>
              <Text style={styles.loadingText}>Laden...</Text>
            </View>
          )}

          {!isLoading && summary.total === 0 && (
            <View style={styles.emptyState}>
              <MaterialCommunityIcons name="bell-outline" size={64} color="#9CA3AF" />
              <Text style={styles.emptyTitle}>Keine neuen Einträge</Text>
              <Text style={styles.emptyText}>
                Wenn dein anderes Elternteil einen Termin, eine Ausgabe oder eine Ausnahme erstellt, erscheint es hier.
              </Text>
            </View>
          )}

          {!isLoading && items.length > 0 && (
            <>
              <View style={styles.card}>
                <Text style={styles.cardTitle}>Neu seit deinem letzten Besuch</Text>

                {items.map((item) => (
                  <TouchableOpacity
                    key={item.key}
                    style={styles.row}
                    activeOpacity={0.8}
                    onPress={item.onPress}
                  >
                    <View style={[styles.rowIcon, { backgroundColor: item.color + '15' }]}>
                      <MaterialCommunityIcons name={item.icon as any} size={22} color={item.color} />
                    </View>
                    <View style={styles.rowText}>
                      <Text style={styles.rowTitle}>{item.label}</Text>
                      <Text style={styles.rowSubtitle}>{item.count} neu</Text>
                    </View>
                    <MaterialCommunityIcons name="chevron-right" size={22} color="#6B7280" />
                  </TouchableOpacity>
                ))}
              </View>

              <TouchableOpacity
                style={styles.markReadButton}
                activeOpacity={0.85}
                onPress={async () => {
                  await markAllRead();
                  router.back();
                }}
              >
                <MaterialCommunityIcons name="check" size={20} color="#fff" />
                <Text style={styles.markReadText}>Alles als gelesen markieren</Text>
              </TouchableOpacity>
            </>
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
    paddingVertical: 16,
  },
  loading: {
    paddingVertical: 24,
    alignItems: 'center',
  },
  loadingText: {
    color: '#6B7280',
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 48,
    paddingHorizontal: 16,
  },
  emptyTitle: {
    marginTop: 12,
    fontSize: 18,
    fontWeight: '700',
    color: '#111',
  },
  emptyText: {
    marginTop: 6,
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 20,
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  cardTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 12,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
  },
  rowIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  rowText: {
    flex: 1,
  },
  rowTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#111',
  },
  rowSubtitle: {
    marginTop: 2,
    fontSize: 13,
    color: '#6B7280',
  },
  markReadButton: {
    marginTop: 12,
    backgroundColor: '#4F46E5',
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  markReadText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '700',
  },
});

