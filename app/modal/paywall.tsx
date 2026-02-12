import { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, Alert } from 'react-native';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { COLORS } from '@/lib/constants';
import { useEntitlements } from '@/hooks/useEntitlements';
import { useResponsive } from '@/hooks/useResponsive';

type PlanOption = 'lifetime' | 'cloud_plus_monthly' | 'cloud_plus_yearly';

export default function PaywallScreen() {
  const { contentMaxWidth } = useResponsive();
  const [selectedPlan, setSelectedPlan] = useState<PlanOption>('lifetime');
  const { data: entitlements } = useEntitlements();

  const handlePurchase = () => {
    // TODO: Integrate IAP / RevenueCat
    Alert.alert(
      'In-App-Kauf',
      'Die Zahlungsintegration ist noch in Entwicklung. Diese Funktion wird bald verfügbar sein.',
      [{ text: 'OK' }]
    );
  };

  const handleRestore = () => {
    // TODO: Restore purchases
    Alert.alert(
      'Käufe wiederherstellen',
      'Die Wiederherstellung wird bald implementiert.',
      [{ text: 'OK' }]
    );
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['bottom']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.closeButton}>
          <MaterialCommunityIcons name="close" size={24} color="#111" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Freischalten</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
        <View style={{ maxWidth: contentMaxWidth, alignSelf: 'center', width: '100%' }}>
        {/* Hero Section */}
        <View style={styles.heroSection}>
          <View style={styles.iconCircle}>
            <MaterialCommunityIcons name="lock-open" size={48} color="#4F46E5" />
          </View>
          <Text style={styles.heroTitle}>Wechselmodell-Planer freischalten</Text>
          <Text style={styles.heroSubtitle}>
            14 Tage kostenlos testen mit voller Nutzung {'\u2013'} danach einmalig 14,99 {'\u20AC'}, fair & ohne Abo.{'\n'}
            Belege/Fotos hochladen optional mit Cloud Pro (nur f{'\u00FC'}r Serverkosten).
          </Text>
          {entitlements?.isTrialActive && entitlements.trialDaysRemaining !== null && (
            <View style={styles.trialBadge}>
              <Text style={styles.trialBadgeText}>
                {entitlements.trialDaysRemaining} {entitlements.trialDaysRemaining === 1 ? 'Tag' : 'Tage'} Testversion
              </Text>
            </View>
          )}
        </View>

        {/* Plan: Lifetime */}
        <TouchableOpacity
          style={[
            styles.planCard,
            selectedPlan === 'lifetime' && styles.planCardSelected,
            styles.planCardPrimary,
          ]}
          onPress={() => setSelectedPlan('lifetime')}
          activeOpacity={0.7}
        >
          <View style={styles.recommendedBadge}>
            <Text style={styles.recommendedBadgeText}>Empfohlen</Text>
          </View>
          <View style={styles.planHeader}>
            <View style={styles.planRadio}>
              {selectedPlan === 'lifetime' && <View style={styles.planRadioInner} />}
            </View>
            <View style={styles.planInfo}>
              <Text style={styles.planName}>Core (Lifetime)</Text>
              <Text style={styles.planPrice}>14,99 € einmalig</Text>
            </View>
          </View>
          <View style={styles.featureList}>
            <FeatureBullet text="Wechselplan mit allen Modellen" />
            <FeatureBullet text="Übergabe-Checklisten" />
            <FeatureBullet text="Ausgaben & Saldo-Tracking" />
            <FeatureBullet text="Pflicht-Abrechnung alle 2 Monate" />
            <FeatureBullet text="Export-Funktionen (CSV/PDF)" />
          </View>
        </TouchableOpacity>

        {/* Plan: Cloud Plus Monthly */}
        <TouchableOpacity
          style={[
            styles.planCard,
            selectedPlan === 'cloud_plus_monthly' && styles.planCardSelected,
          ]}
          onPress={() => setSelectedPlan('cloud_plus_monthly')}
          activeOpacity={0.7}
        >
          <View style={styles.planHeader}>
            <View style={styles.planRadio}>
              {selectedPlan === 'cloud_plus_monthly' && <View style={styles.planRadioInner} />}
            </View>
            <View style={styles.planInfo}>
              <Text style={styles.planName}>Cloud Plus (Monatlich)</Text>
              <Text style={styles.planPrice}>1,99 € / Monat</Text>
            </View>
          </View>
          <View style={styles.featureList}>
            <FeatureBullet text="Belege & Fotos hochladen" />
            <FeatureBullet text="Übergabe-Fotos" />
            <FeatureBullet text="Profilbilder & Avatare" />
            <FeatureBullet text="Cloud-Speicher & Archiv" />
          </View>
        </TouchableOpacity>

        {/* Plan: Cloud Plus Yearly */}
        <TouchableOpacity
          style={[
            styles.planCard,
            selectedPlan === 'cloud_plus_yearly' && styles.planCardSelected,
          ]}
          onPress={() => setSelectedPlan('cloud_plus_yearly')}
          activeOpacity={0.7}
        >
          <View style={styles.savingsBadge}>
            <Text style={styles.savingsBadgeText}>2 Monate gratis</Text>
          </View>
          <View style={styles.planHeader}>
            <View style={styles.planRadio}>
              {selectedPlan === 'cloud_plus_yearly' && <View style={styles.planRadioInner} />}
            </View>
            <View style={styles.planInfo}>
              <Text style={styles.planName}>Cloud Plus (Jährlich)</Text>
              <Text style={styles.planPrice}>19,99 € / Jahr</Text>
            </View>
          </View>
          <View style={styles.featureList}>
            <FeatureBullet text="Alle Cloud Plus Features" />
            <FeatureBullet text="Günstiger als monatlich" />
          </View>
        </TouchableOpacity>

        {/* Purchase Button */}
        <TouchableOpacity
          style={styles.purchaseButton}
          onPress={handlePurchase}
          activeOpacity={0.7}
        >
          <Text style={styles.purchaseButtonText}>
            {selectedPlan === 'lifetime' ? 'Einmalig 14,99 € zahlen' :
             selectedPlan === 'cloud_plus_monthly' ? 'Für 1,99 €/Monat abonnieren' :
             'Für 19,99 €/Jahr abonnieren'}
          </Text>
        </TouchableOpacity>

        {/* Restore Button */}
        <TouchableOpacity
          style={styles.restoreButton}
          onPress={handleRestore}
          activeOpacity={0.7}
        >
          <Text style={styles.restoreButtonText}>Käufe wiederherstellen</Text>
        </TouchableOpacity>

        {/* Footer Info */}
        <View style={styles.footerInfo}>
          <MaterialCommunityIcons name="information" size={16} color="#6B7280" />
          <Text style={styles.footerText}>
            Uploads sind im Test nicht enthalten. Cloud Plus kann jederzeit dazugebucht werden.
          </Text>
        </View>

        {/* Terms */}
        <Text style={styles.termsText}>
          Das Cloud Plus Abo verlängert sich automatisch. Du kannst jederzeit kündigen.
        </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function FeatureBullet({ text }: { text: string }) {
  return (
    <View style={styles.featureBullet}>
      <MaterialCommunityIcons name="check-circle" size={16} color="#10B981" />
      <Text style={styles.featureBulletText}>{text}</Text>
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
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingVertical: 24,
  },
  heroSection: {
    alignItems: 'center',
    marginBottom: 24,
  },
  iconCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#EEF2FF',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  heroTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#111',
    textAlign: 'center',
    marginBottom: 8,
  },
  heroSubtitle: {
    fontSize: 15,
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 22,
    paddingHorizontal: 16,
  },
  trialBadge: {
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 16,
    marginTop: 12,
  },
  trialBadgeText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#F59E0B',
  },
  planCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 2,
    borderColor: '#E5E7EB',
    position: 'relative',
  },
  planCardSelected: {
    borderColor: '#4F46E5',
    backgroundColor: '#EEF2FF',
  },
  planCardPrimary: {
    borderWidth: 3,
  },
  recommendedBadge: {
    position: 'absolute',
    top: -10,
    right: 16,
    backgroundColor: '#4F46E5',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  recommendedBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#fff',
    textTransform: 'uppercase',
  },
  savingsBadge: {
    position: 'absolute',
    top: -10,
    right: 16,
    backgroundColor: '#10B981',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  savingsBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#fff',
  },
  planHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 12,
  },
  planRadio: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#4F46E5',
    alignItems: 'center',
    justifyContent: 'center',
  },
  planRadioInner: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#4F46E5',
  },
  planInfo: {
    flex: 1,
  },
  planName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111',
  },
  planPrice: {
    fontSize: 14,
    color: '#6B7280',
    marginTop: 2,
  },
  featureList: {
    gap: 8,
    marginLeft: 36,
  },
  featureBullet: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  featureBulletText: {
    fontSize: 13,
    color: '#374151',
  },
  purchaseButton: {
    backgroundColor: '#4F46E5',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 8,
    marginBottom: 12,
  },
  purchaseButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
  restoreButton: {
    paddingVertical: 12,
    alignItems: 'center',
    marginBottom: 16,
  },
  restoreButtonText: {
    color: '#6B7280',
    fontSize: 14,
    textDecorationLine: 'underline',
  },
  footerInfo: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    backgroundColor: '#F3F4F6',
    padding: 12,
    borderRadius: 8,
    marginBottom: 12,
  },
  footerText: {
    flex: 1,
    fontSize: 12,
    color: '#6B7280',
    lineHeight: 18,
  },
  termsText: {
    fontSize: 11,
    color: '#9CA3AF',
    textAlign: 'center',
    lineHeight: 16,
  },
});
