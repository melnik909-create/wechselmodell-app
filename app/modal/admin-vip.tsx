import { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  ScrollView,
} from 'react-native';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/auth';
import { useQueryClient } from '@tanstack/react-query';
import { AppAlert } from '@/lib/alert';

const PROMO_CODES: Record<string, { plan: 'lifetime' | 'cloud_plus'; cloud: boolean; label: string }> = {
  BETARIDER247: { plan: 'lifetime', cloud: false, label: 'Beta-Zugang (Software)' },
  BETARIDER247FULL: { plan: 'lifetime', cloud: true, label: 'Beta-Zugang (Software + Cloud)' },
};

export default function AdminVIPModal() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [redeemed, setRedeemed] = useState(false);
  const [redeemedLabel, setRedeemedLabel] = useState('');

  async function handleRedeemCode() {
    const trimmed = code.trim().toUpperCase();

    if (!trimmed) {
      AppAlert.alert('Fehler', 'Bitte einen Promocode eingeben.');
      return;
    }

    const promoEntry = PROMO_CODES[trimmed];
    if (!promoEntry) {
      AppAlert.alert('Ungültiger Code', 'Dieser Promocode ist nicht gültig. Bitte überprüfe die Eingabe.');
      return;
    }

    if (!user) {
      AppAlert.alert('Fehler', 'Du musst angemeldet sein.');
      return;
    }

    setLoading(true);
    try {
      if (promoEntry.cloud) {
        const { data, error } = await supabase.rpc('grant_vip_access', {
          p_user_id: user.id,
        });
        if (error) throw error;
        const result = Array.isArray(data) ? data[0] : data;
        if (!result?.success) throw new Error(result?.message || 'Freischaltung fehlgeschlagen.');
      } else {
        const { error } = await supabase
          .from('profiles')
          .update({ plan: 'lifetime' })
          .eq('id', user.id);
        if (error) throw error;
      }

      queryClient.invalidateQueries({ queryKey: ['entitlements'] });
      setRedeemed(true);
      setRedeemedLabel(promoEntry.label);
    } catch (error: any) {
      AppAlert.alert('Fehler', error.message || 'Freischaltung fehlgeschlagen.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()}>
            <MaterialCommunityIcons name="close" size={24} color="#111" />
          </TouchableOpacity>
          <Text style={styles.title}>Promocode einlösen</Text>
          <View style={{ width: 24 }} />
        </View>

        {!redeemed ? (
          <>
            {/* Promocode Section */}
            <View style={styles.promoSection}>
              <View style={styles.promoIconWrap}>
                <MaterialCommunityIcons name="ticket-percent" size={48} color="#4F46E5" />
              </View>
              <Text style={styles.promoTitle}>Hast du einen Promocode?</Text>
              <Text style={styles.promoSubtitle}>
                Gib deinen Code ein, um alle Funktionen kostenlos freizuschalten.
              </Text>

              <TextInput
                style={styles.input}
                placeholder="PROMOCODE"
                value={code}
                onChangeText={setCode}
                autoCapitalize="characters"
                autoCorrect={false}
                editable={!loading}
              />
              <TouchableOpacity
                style={[styles.button, loading && styles.buttonDisabled]}
                onPress={handleRedeemCode}
                disabled={loading}
              >
                {loading ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <>
                    <MaterialCommunityIcons name="check-decagram" size={20} color="#fff" />
                    <Text style={styles.buttonText}>Code einlösen</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>

            {/* Info */}
            <View style={styles.infoSection}>
              <Text style={styles.infoTitle}>So funktioniert's</Text>
              <View style={styles.infoRow}>
                <MaterialCommunityIcons name="numeric-1-circle" size={22} color="#4F46E5" />
                <Text style={styles.infoText}>Promocode oben eingeben</Text>
              </View>
              <View style={styles.infoRow}>
                <MaterialCommunityIcons name="numeric-2-circle" size={22} color="#4F46E5" />
                <Text style={styles.infoText}>„Code einlösen" tippen</Text>
              </View>
              <View style={styles.infoRow}>
                <MaterialCommunityIcons name="numeric-3-circle" size={22} color="#4F46E5" />
                <Text style={styles.infoText}>Sofort freigeschaltet – kein Abo, keine Kosten</Text>
              </View>
            </View>
          </>
        ) : (
          /* Success State */
          <View style={styles.successSection}>
            <View style={styles.successIconWrap}>
              <MaterialCommunityIcons name="check-circle" size={64} color="#10B981" />
            </View>
            <Text style={styles.successTitle}>Erfolgreich freigeschaltet!</Text>
            <Text style={styles.successSubtitle}>{redeemedLabel}</Text>
            <Text style={styles.successDetail}>
              Alle Funktionen stehen dir ab sofort kostenlos zur Verfügung. Viel Spaß!
            </Text>
            <TouchableOpacity
              style={styles.successButton}
              onPress={() => router.back()}
            >
              <Text style={styles.successButtonText}>Zurück zur App</Text>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#fff',
  },
  container: {
    padding: 16,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: '#111',
  },

  promoSection: {
    alignItems: 'center',
    paddingVertical: 24,
  },
  promoIconWrap: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#EEF2FF',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  promoTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#111',
    marginBottom: 8,
    textAlign: 'center',
  },
  promoSubtitle: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 24,
    paddingHorizontal: 16,
  },
  input: {
    width: '100%',
    borderWidth: 2,
    borderColor: '#D1D5DB',
    borderRadius: 12,
    padding: 16,
    fontSize: 20,
    fontWeight: '700',
    textAlign: 'center',
    letterSpacing: 2,
    backgroundColor: '#F9FAFB',
    marginBottom: 16,
    color: '#111',
  },
  button: {
    width: '100%',
    backgroundColor: '#4F46E5',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },

  infoSection: {
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    padding: 16,
    marginTop: 24,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  infoTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 12,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 10,
  },
  infoText: {
    fontSize: 14,
    color: '#4B5563',
    flex: 1,
  },

  successSection: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  successIconWrap: {
    marginBottom: 20,
  },
  successTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#065F46',
    marginBottom: 8,
    textAlign: 'center',
  },
  successSubtitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#10B981',
    marginBottom: 12,
    textAlign: 'center',
  },
  successDetail: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 32,
    paddingHorizontal: 16,
  },
  successButton: {
    backgroundColor: '#10B981',
    paddingVertical: 14,
    paddingHorizontal: 32,
    borderRadius: 12,
  },
  successButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
});
