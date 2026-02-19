import { View, Text, ScrollView, TouchableOpacity, StyleSheet } from 'react-native';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useResponsive } from '@/hooks/useResponsive';

const ACTIONS = [
  { icon: 'currency-eur', label: 'Ausgabe', color: '#10B981', route: '/modal/add-expense' },
  { icon: 'swap-horizontal', label: 'Übergabe', color: '#3B82F6', route: '/(tabs)/handover' },
  { icon: 'calendar-edit', label: 'Ausnahme', color: '#F59E0B', route: '/modal/add-exception' },
  { icon: 'calendar-text', label: 'Terminübersicht', color: '#8B5CF6', route: '/modal/events-overview' },
  { icon: 'account-group', label: 'Kontakte', color: '#14B8A6', route: '/modal/contacts' },
  { icon: 'school', label: 'Schule', color: '#EC4899', route: '/modal/school' },
  { icon: 'file-document', label: 'Dokumente', color: '#6366F1', route: '/modal/documents' },
  { icon: 'calendar-plus', label: 'Termin', color: '#0EA5E9', route: '/modal/add-event' },
] as const;

export default function ActionsScreen() {
  const { contentMaxWidth } = useResponsive();

  return (
    <SafeAreaView style={styles.safeArea} edges={['bottom']}>
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
        <View style={{ maxWidth: contentMaxWidth, alignSelf: 'center', width: '100%' }}>
          <View style={styles.grid}>
            {ACTIONS.map((action) => (
              <TouchableOpacity
                key={action.label}
                style={styles.actionCard}
                onPress={() => router.push(action.route as any)}
                activeOpacity={0.7}
              >
                <View style={[styles.iconContainer, { backgroundColor: action.color + '15' }]}>
                  <MaterialCommunityIcons name={action.icon as any} size={32} color={action.color} />
                </View>
                <Text style={styles.actionLabel}>{action.label}</Text>
              </TouchableOpacity>
            ))}
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
    paddingVertical: 24,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  actionCard: {
    width: '47%',
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  iconContainer: {
    width: 64,
    height: 64,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  actionLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    textAlign: 'center',
  },
});
