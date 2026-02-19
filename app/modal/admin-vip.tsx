import { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  ScrollView,
  Alert,
} from 'react-native';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { supabase } from '@/lib/supabase';

interface VIPUser {
  id: string;
  email: string;
  display_name: string;
  plan: 'trial' | 'lifetime' | 'cloud_plus';
  cloud_until: string | null;
}

export default function AdminVIPModal() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [user, setUser] = useState<VIPUser | null>(null);
  const [searching, setSearching] = useState(false);

  async function handleSearch() {
    if (!email.trim()) {
      Alert.alert('Fehler', 'Bitte E-Mail eingeben.');
      return;
    }

    setSearching(true);
    try {
      // Search for user by email via RPC
      const { data, error } = await supabase.rpc('search_user_by_email', {
        search_email: email.trim(),
      });

      if (error) {
        Alert.alert('Fehler', error.message || 'Suche fehlgeschlagen.');
        setUser(null);
        setSearching(false);
        return;
      }

      const userData = Array.isArray(data) ? data[0] : data;

      if (!userData) {
        Alert.alert('Nicht gefunden', 'Kein User mit dieser E-Mail gefunden.');
        setUser(null);
        setSearching(false);
        return;
      }

      setUser(userData as VIPUser);
    } catch (error: any) {
      Alert.alert('Fehler', error.message || 'Suche fehlgeschlagen.');
    } finally {
      setSearching(false);
    }
  }

  async function handleGrantVIP() {
    if (!user) return;

    setLoading(true);
    try {
      const { data, error } = await supabase.rpc('grant_vip_access', {
        user_id: user.id,
      });

      if (error) throw error;

      Alert.alert('✅ Erfolg', `VIP-Zugang vergeben für ${user.display_name}`);
      // Refresh user data
      setUser({
        ...user,
        plan: 'lifetime',
        cloud_until: '2099-12-31',
      });
    } catch (error: any) {
      Alert.alert('Fehler', error.message || 'VIP-Zugang vergeben fehlgeschlagen.');
    } finally {
      setLoading(false);
    }
  }

  async function handleRevokeVIP() {
    if (!user) return;

    Alert.alert(
      'Bestätigung',
      `VIP-Status für ${user.display_name} wirklich zurücksetzen?`,
      [
        { text: 'Abbrechen', style: 'cancel' },
        {
          text: 'Ja, zurücksetzen',
          style: 'destructive',
          onPress: async () => {
            setLoading(true);
            try {
              const { data, error } = await supabase.rpc('revoke_vip_access', {
                user_id: user.id,
              });

              if (error) throw error;

              Alert.alert('✅ Erfolg', `VIP-Status zurückgesetzt für ${user.display_name}`);
              setUser({
                ...user,
                plan: 'trial',
                cloud_until: null,
              });
            } catch (error: any) {
              Alert.alert('Fehler', error.message || 'Zurücksetzen fehlgeschlagen.');
            } finally {
              setLoading(false);
            }
          },
        },
      ]
    );
  }

  const isVIP = user?.plan === 'lifetime' && user?.cloud_until === '2099-12-31';

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()}>
            <MaterialCommunityIcons name="close" size={24} color="#111" />
          </TouchableOpacity>
          <Text style={styles.title}>Admin: VIP-Zugang</Text>
          <View style={{ width: 24 }} />
        </View>

        {/* Search Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>User finden</Text>
          <TextInput
            style={styles.input}
            placeholder="E-Mail eingeben"
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
            editable={!searching && !loading}
          />
          <TouchableOpacity
            style={[styles.button, (searching || loading) && styles.buttonDisabled]}
            onPress={handleSearch}
            disabled={searching || loading}
          >
            {searching ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.buttonText}>🔍 Suchen</Text>
            )}
          </TouchableOpacity>
        </View>

        {/* User Details */}
        {user && (
          <View style={styles.section}>
            <View style={styles.userCard}>
              <View style={styles.userHeader}>
                <View>
                  <Text style={styles.userName}>{user.display_name}</Text>
                  <Text style={styles.userEmail}>{user.email}</Text>
                </View>
                <View
                  style={[
                    styles.statusBadge,
                    isVIP ? styles.statusVIP : styles.statusTrial,
                  ]}
                >
                  <Text style={styles.statusText}>
                    {isVIP ? '⭐ VIP' : user.plan === 'cloud_plus' ? '☁️ Cloud' : '📝 Trial'}
                  </Text>
                </View>
              </View>

              <View style={styles.userDetails}>
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Plan:</Text>
                  <Text style={styles.detailValue}>{user.plan}</Text>
                </View>
                {user.cloud_until && (
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Cloud bis:</Text>
                    <Text style={styles.detailValue}>
                      {new Date(user.cloud_until).toLocaleDateString('de-DE')}
                    </Text>
                  </View>
                )}
              </View>

              {/* Actions */}
              <View style={styles.actions}>
                {!isVIP ? (
                  <TouchableOpacity
                    style={[styles.actionButton, styles.actionButtonVIP]}
                    onPress={handleGrantVIP}
                    disabled={loading}
                  >
                    {loading ? (
                      <ActivityIndicator color="#fff" size="small" />
                    ) : (
                      <Text style={styles.actionButtonText}>⭐ VIP Vergeben</Text>
                    )}
                  </TouchableOpacity>
                ) : (
                  <TouchableOpacity
                    style={[styles.actionButton, styles.actionButtonRevoke]}
                    onPress={handleRevokeVIP}
                    disabled={loading}
                  >
                    {loading ? (
                      <ActivityIndicator color="#fff" size="small" />
                    ) : (
                      <Text style={styles.actionButtonText}>❌ VIP Zurücksetzen</Text>
                    )}
                  </TouchableOpacity>
                )}
              </View>
            </View>
          </View>
        )}

        {/* Info */}
        <View style={styles.infoSection}>
          <Text style={styles.infoTitle}>ℹ️ Info</Text>
          <Text style={styles.infoText}>
            VIP-Zugang = Lifetime + Cloud Plus aktiviert (kostenlos für Test-User)
          </Text>
        </View>
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
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6B7280',
    marginBottom: 12,
  },
  input: {
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    marginBottom: 12,
    backgroundColor: '#F9FAFB',
  },
  button: {
    backgroundColor: '#4F46E5',
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  userCard: {
    backgroundColor: '#F9FAFB',
    borderRadius: 8,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  userHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  userName: {
    fontSize: 16,
    fontWeight: '700',
    color: '#111',
    marginBottom: 4,
  },
  userEmail: {
    fontSize: 14,
    color: '#6B7280',
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  statusVIP: {
    backgroundColor: '#FCD34D',
  },
  statusTrial: {
    backgroundColor: '#DDD6FE',
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#111',
  },
  userDetails: {
    marginBottom: 16,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  detailLabel: {
    fontSize: 13,
    color: '#6B7280',
  },
  detailValue: {
    fontSize: 13,
    fontWeight: '600',
    color: '#111',
  },
  actions: {
    gap: 8,
  },
  actionButton: {
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
  },
  actionButtonVIP: {
    backgroundColor: '#10B981',
  },
  actionButtonRevoke: {
    backgroundColor: '#EF4444',
  },
  actionButtonText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '600',
  },
  infoSection: {
    backgroundColor: '#EFF6FF',
    borderRadius: 8,
    padding: 12,
    borderLeftWidth: 4,
    borderLeftColor: '#3B82F6',
  },
  infoTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1E40AF',
    marginBottom: 8,
  },
  infoText: {
    fontSize: 13,
    color: '#1E40AF',
    lineHeight: 20,
  },
});
