import { View, Text, TouchableOpacity, StyleSheet, ScrollView, ActivityIndicator } from 'react-native';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { COLORS } from '@/lib/constants';
import { useEntitlements } from '@/hooks/useEntitlements';
import { AppAlert } from '@/lib/alert';

export default function UpgradeScreen() {
  const { data: entitlements, isLoading } = useEntitlements();

  const handleRestore = () => {
    // TODO: Restore purchases
    AppAlert.alert(
      'Käufe wiederherstellen',
      'Die Wiederherstellung wird bald implementiert.',
      [{ text: 'OK' }]
    );
  };

  if (isLoading) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={COLORS.primary} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea} edges={['bottom']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <MaterialCommunityIcons name="arrow-left" size={24} color="#111" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Upgrade</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
        {/* Current Plan Status */}
        <View style={styles.statusCard}>
          <View style={styles.statusHeader}>
            <MaterialCommunityIcons
              name={
                entitlements?.isLifetime ? "check-decagram" :
                entitlements?.isCloudPlusActive ? "cloud-check" :
                entitlements?.isTrialActive ? "clock-outline" :
                "lock"
              }
              size={32}
              color={
                entitlements?.isLifetime ? "#10B981" :
                entitlements?.isCloudPlusActive ? "#F59E0B" :
                entitlements?.isTrialActive ? "#6B7280" :
                "#EF4444"
              }
            />
            <Text style={styles.statusTitle}>
              {entitlements?.isLifetime && entitlements?.canUpload ? 'Lifetime + Cloud Plus' :
               entitlements?.isLifetime ? 'Core (Lifetime)' :
               entitlements?.isCloudPlusActive ? 'Cloud Plus aktiv' :
               entitlements?.isTrialActive ? 'Testversion' :
               'Nicht freigeschaltet'}
            </Text>
          </View>
          {entitlements?.isTrialActive && entitlements.trialDaysRemaining !== null && (
            <Text style={styles.statusDescription}>
              Noch {entitlements.trialDaysRemaining} {entitlements.trialDaysRemaining === 1 ? 'Tag' : 'Tage'} Testversion
            </Text>
          )}
          {entitlements?.isCloudPlusActive && entitlements.cloudDaysRemaining !== null && (
            <Text style={styles.statusDescription}>
              Cloud Plus läuft noch {entitlements.cloudDaysRemaining} {entitlements.cloudDaysRemaining === 1 ? 'Tag' : 'Tage'}
            </Text>
          )}
          {!entitlements?.canUseCore && (
            <Text style={[styles.statusDescription, styles.statusDescriptionError]}>
              Testversion abgelaufen. Bitte Core freischalten.
            </Text>
          )}
        </View>

        {/* Active Features */}
        <Text style={styles.sectionTitle}>Deine Features</Text>
        <View style={styles.featuresList}>
          <FeatureRow
            icon="calendar-check"
            title="Wechselplan"
            active={entitlements?.canUseCore ?? false}
          />
          <FeatureRow
            icon="clipboard-check"
            title="Übergabe-Checklisten"
            active={entitlements?.canUseCore ?? false}
          />
          <FeatureRow
            icon="currency-eur"
            title="Ausgaben & Saldo"
            active={entitlements?.canUseCore ?? false}
          />
          <FeatureRow
            icon="file-export"
            title="Export (CSV/PDF)"
            active={entitlements?.canUseCore ?? false}
          />
          <FeatureRow
            icon="cloud-upload"
            title="Uploads (Belege, Fotos)"
            active={entitlements?.canUpload ?? false}
          />
        </View>

        {/* Action Buttons */}
        {!entitlements?.isLifetime && !entitlements?.isCloudPlusActive && (
          <TouchableOpacity
            style={styles.upgradeButton}
            onPress={() => router.push('/modal/paywall')}
            activeOpacity={0.7}
          >
            <MaterialCommunityIcons name="lock-open" size={20} color="#fff" />
            <Text style={styles.upgradeButtonText}>Core freischalten (14,99 €)</Text>
          </TouchableOpacity>
        )}

        {!entitlements?.canUpload && (
          <TouchableOpacity
            style={styles.cloudPlusButton}
            onPress={() => router.push('/modal/cloud-plus')}
            activeOpacity={0.7}
          >
            <MaterialCommunityIcons name="cloud-upload" size={20} color="#F59E0B" />
            <Text style={styles.cloudPlusButtonText}>Cloud Plus hinzufügen</Text>
          </TouchableOpacity>
        )}

        {/* Restore Button */}
        <TouchableOpacity
          style={styles.restoreButton}
          onPress={handleRestore}
          activeOpacity={0.7}
        >
          <MaterialCommunityIcons name="restore" size={18} color="#6B7280" />
          <Text style={styles.restoreButtonText}>Käufe wiederherstellen</Text>
        </TouchableOpacity>

        {/* Info */}
        <View style={styles.infoBox}>
          <MaterialCommunityIcons name="information" size={16} color="#6B7280" />
          <Text style={styles.infoText}>
            Core (Lifetime) schaltet alle Kernfunktionen frei. Cloud Plus ist optional und ermöglicht Uploads.
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function FeatureRow({ icon, title, active }: { icon: string; title: string; active: boolean }) {
  return (
    <View style={styles.featureRow}>
      <MaterialCommunityIcons
        name={icon as any}
        size={20}
        color={active ? '#10B981' : '#D1D5DB'}
      />
      <Text style={[styles.featureText, !active && styles.featureTextInactive]}>{title}</Text>
      <MaterialCommunityIcons
        name={active ? 'check-circle' : 'close-circle'}
        size={18}
        color={active ? '#10B981' : '#D1D5DB'}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
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
  backButton: {
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
    paddingVertical: 24,
  },
  statusCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 20,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    alignItems: 'center',
  },
  statusHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 8,
  },
  statusTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#111',
  },
  statusDescription: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
  },
  statusDescriptionError: {
    color: '#EF4444',
    fontWeight: '600',
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#111',
    marginBottom: 12,
  },
  featuresList: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 4,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  featureRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  featureText: {
    flex: 1,
    fontSize: 15,
    color: '#111',
  },
  featureTextInactive: {
    color: '#9CA3AF',
  },
  upgradeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#4F46E5',
    paddingVertical: 16,
    borderRadius: 12,
    marginBottom: 12,
  },
  upgradeButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
  cloudPlusButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#fff',
    paddingVertical: 14,
    borderRadius: 12,
    marginBottom: 12,
    borderWidth: 2,
    borderColor: '#F59E0B',
  },
  cloudPlusButtonText: {
    color: '#F59E0B',
    fontSize: 15,
    fontWeight: '600',
  },
  restoreButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    marginBottom: 16,
  },
  restoreButtonText: {
    color: '#6B7280',
    fontSize: 14,
  },
  infoBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    backgroundColor: '#F3F4F6',
    padding: 12,
    borderRadius: 8,
  },
  infoText: {
    flex: 1,
    fontSize: 12,
    color: '#6B7280',
    lineHeight: 18,
  },
});
