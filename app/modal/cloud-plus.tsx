import { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, ActivityIndicator } from 'react-native';
import { AppAlert } from '@/lib/alert';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { COLORS } from '@/lib/constants';
import { useResponsive } from '@/hooks/useResponsive';
import { usePayment } from '@/hooks/usePayment';
import { useAuth } from '@/lib/auth';

type CloudPlan = 'cloud_plus_monthly' | 'cloud_plus_yearly';

export default function CloudPlusScreen() {
  const { contentMaxWidth } = useResponsive();
  const { processPayment, loading: paymentLoading } = usePayment();
  const { profile, user } = useAuth();
  const [selectedPlan, setSelectedPlan] = useState<CloudPlan>('cloud_plus_yearly');

  const handleSubscribe = async () => {
    if (!profile?.id) {
      AppAlert.alert('Anmeldung erforderlich', 'Bitte melde dich an um Cloud Plus zu aktivieren.');
      return;
    }

    const userEmail = user?.email || '';

    try {
      const result = await processPayment(selectedPlan, userEmail);

      if (result.success) {
        AppAlert.alert(
          'Cloud Plus aktiviert!',
          'Dein Cloud Plus Abo wurde erfolgreich aktiviert.',
          [{ text: 'OK', onPress: () => router.replace('/(tabs)') }]
        );
      } else if (result.error !== 'Zahlung abgebrochen') {
        AppAlert.alert('Fehler', result.message || 'Zahlung fehlgeschlagen.');
      }
    } catch (error) {
      AppAlert.alert('Fehler', 'Zahlung konnte nicht verarbeitet werden.');
    }
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['bottom']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.closeButton}>
          <MaterialCommunityIcons name="close" size={24} color="#111" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Cloud Plus</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
        <View style={{ maxWidth: contentMaxWidth, alignSelf: 'center', width: '100%' }}>
        {/* Hero Section */}
        <View style={styles.heroSection}>
          <View style={styles.iconCircle}>
            <MaterialCommunityIcons name="cloud-upload" size={56} color="#F59E0B" />
          </View>
          <Text style={styles.heroTitle}>Belege & Fotos = Cloud Plus</Text>
          <Text style={styles.heroSubtitle}>
            Speicher & Traffic verursachen laufende Kosten. Deshalb sind Uploads nur mit Cloud Plus
            verfügbar.
          </Text>
        </View>

        {/* Features */}
        <View style={styles.featuresSection}>
          <Text style={styles.sectionTitle}>Was du mit Cloud Plus bekommst</Text>

          <View style={styles.featureItem}>
            <View style={styles.featureIconContainer}>
              <MaterialCommunityIcons name="receipt" size={24} color="#F59E0B" />
            </View>
            <View style={styles.featureText}>
              <Text style={styles.featureTitle}>Belege hochladen</Text>
              <Text style={styles.featureDescription}>
                Lade Quittungen & Rechnungen zu Ausgaben hoch. Alles an einem Ort.
              </Text>
            </View>
          </View>

          <View style={styles.featureItem}>
            <View style={styles.featureIconContainer}>
              <MaterialCommunityIcons name="camera" size={24} color="#F59E0B" />
            </View>
            <View style={styles.featureText}>
              <Text style={styles.featureTitle}>Übergabe-Fotos</Text>
              <Text style={styles.featureDescription}>
                Dokumentiere Übergaben mit Fotos (z.B. gepackte Tasche, Medikamente).
              </Text>
            </View>
          </View>

          <View style={styles.featureItem}>
            <View style={styles.featureIconContainer}>
              <MaterialCommunityIcons name="account-circle" size={24} color="#F59E0B" />
            </View>
            <View style={styles.featureText}>
              <Text style={styles.featureTitle}>Profilbilder</Text>
              <Text style={styles.featureDescription}>
                Lade Avatare für Kinder und Elternteile hoch.
              </Text>
            </View>
          </View>

          <View style={styles.featureItem}>
            <View style={styles.featureIconContainer}>
              <MaterialCommunityIcons name="cloud-check" size={24} color="#F59E0B" />
            </View>
            <View style={styles.featureText}>
              <Text style={styles.featureTitle}>Cloud-Speicher</Text>
              <Text style={styles.featureDescription}>
                Sichere Speicherung aller Uploads in der Cloud.
              </Text>
            </View>
          </View>
        </View>

        {/* Pricing */}
        <View style={styles.pricingSection}>
          <TouchableOpacity
            style={[styles.pricingCard, selectedPlan === 'cloud_plus_monthly' && styles.pricingCardSelected]}
            onPress={() => setSelectedPlan('cloud_plus_monthly')}
            activeOpacity={0.7}
          >
            <Text style={styles.pricingTitle}>Monatlich</Text>
            <Text style={styles.pricingPrice}>1,99 € / Monat</Text>
            <Text style={styles.pricingDescription}>Jederzeit kündbar</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.pricingCard, styles.pricingCardHighlight, selectedPlan === 'cloud_plus_yearly' && styles.pricingCardSelected]}
            onPress={() => setSelectedPlan('cloud_plus_yearly')}
            activeOpacity={0.7}
          >
            <View style={styles.savingsBadge}>
              <Text style={styles.savingsBadgeText}>2 Monate gratis</Text>
            </View>
            <Text style={styles.pricingTitle}>Jährlich</Text>
            <Text style={styles.pricingPrice}>19,99 € / Jahr</Text>
            <Text style={styles.pricingDescription}>Entspricht 1,67 € / Monat</Text>
          </TouchableOpacity>
        </View>

        {/* Subscribe Button */}
        <TouchableOpacity
          style={[styles.subscribeButton, paymentLoading && styles.subscribeButtonDisabled]}
          onPress={handleSubscribe}
          disabled={paymentLoading}
          activeOpacity={0.7}
        >
          {paymentLoading ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <Text style={styles.subscribeButtonText}>
              {selectedPlan === 'cloud_plus_monthly' ? 'Für 1,99 €/Monat abonnieren' : 'Für 19,99 €/Jahr abonnieren'}
            </Text>
          )}
        </TouchableOpacity>

        {/* Info */}
        <View style={styles.infoBox}>
          <MaterialCommunityIcons name="information" size={16} color="#6B7280" />
          <Text style={styles.infoText}>
            Cloud Plus ergänzt Core (Lifetime). Ohne Uploads funktionieren alle anderen Features
            weiterhin.
          </Text>
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
    marginBottom: 32,
  },
  iconCircle: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: '#FFFBEB',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
    borderWidth: 2,
    borderColor: '#FCD34D',
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
  featuresSection: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111',
    marginBottom: 16,
  },
  featureItem: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
  },
  featureIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#FEF3C7',
    alignItems: 'center',
    justifyContent: 'center',
  },
  featureText: {
    flex: 1,
  },
  featureTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#111',
    marginBottom: 2,
  },
  featureDescription: {
    fontSize: 13,
    color: '#6B7280',
    lineHeight: 18,
  },
  pricingSection: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 24,
  },
  pricingCard: {
    flex: 1,
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    borderWidth: 2,
    borderColor: '#E5E7EB',
    alignItems: 'center',
    position: 'relative',
  },
  pricingCardHighlight: {
    borderColor: '#F59E0B',
    backgroundColor: '#FFFBEB',
  },
  pricingCardSelected: {
    borderColor: '#4F46E5',
    borderWidth: 3,
  },
  savingsBadge: {
    position: 'absolute',
    top: -10,
    backgroundColor: '#10B981',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  savingsBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#fff',
  },
  pricingTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6B7280',
    marginBottom: 4,
  },
  pricingPrice: {
    fontSize: 20,
    fontWeight: '700',
    color: '#111',
    marginBottom: 4,
  },
  pricingDescription: {
    fontSize: 12,
    color: '#9CA3AF',
  },
  subscribeButton: {
    backgroundColor: '#F59E0B',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 16,
  },
  subscribeButtonDisabled: {
    opacity: 0.7,
  },
  subscribeButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
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
