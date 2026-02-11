import { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  StyleSheet,
} from 'react-native';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '@/lib/auth';
import { supabase } from '@/lib/supabase';

export default function JoinFamilyScreen() {
  const { user, refreshFamily } = useAuth();
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleJoin() {
    const trimmedCode = code.trim().toUpperCase();
    if (trimmedCode.length !== 6) {
      Alert.alert('Fehler', 'Der Einladungscode muss 6 Zeichen lang sein.');
      return;
    }

    setLoading(true);
    try {
      // Find family by invite code
      const { data: family, error: findError } = await supabase
        .from('families')
        .select('*')
        .eq('invite_code', trimmedCode)
        .single();

      if (findError || !family) {
        Alert.alert('Fehler', 'Kein guentiger Einladungscode. Bitte ueberpruefen.');
        return;
      }

      // Check if already a member
      const { data: existing } = await supabase
        .from('family_members')
        .select('id')
        .eq('family_id', family.id)
        .eq('user_id', user!.id)
        .single();

      if (existing) {
        Alert.alert('Hinweis', 'Du bist bereits Mitglied dieser Familie.');
        await refreshFamily();
        router.replace('/(tabs)');
        return;
      }

      // Join as parent_b
      const { error: joinError } = await supabase
        .from('family_members')
        .insert({
          family_id: family.id,
          user_id: user!.id,
          role: 'parent_b',
        });

      if (joinError) throw joinError;

      await refreshFamily();
      Alert.alert(
        'Willkommen!',
        `Du bist der Familie "${family.name}" beigetreten.`,
        [{ text: 'OK', onPress: () => router.replace('/(tabs)') }]
      );
    } catch (error: any) {
      Alert.alert('Fehler', error.message || 'Beitritt fehlgeschlagen.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        <Text style={styles.title}>Familie beitreten</Text>
        <Text style={styles.subtitle}>
          Gib den Einladungscode ein, den du vom anderen Elternteil erhalten hast.
        </Text>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>Einladungscode</Text>
          <TextInput
            style={styles.input}
            placeholder="z.B. A3K9X2"
            value={code}
            onChangeText={(text) => setCode(text.toUpperCase())}
            autoCapitalize="characters"
            editable={!loading}
          />
        </View>
      </View>

      <View style={styles.bottomButtons}>
        <TouchableOpacity
          style={[styles.button, loading && styles.buttonDisabled]}
          onPress={handleJoin}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.buttonText}>Beitreten</Text>
          )}
        </TouchableOpacity>

        <TouchableOpacity style={styles.buttonGhost} onPress={() => router.back()}>
          <Text style={styles.buttonGhostText}>Zurueck</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#fff',
    paddingHorizontal: 24,
  },
  container: {
    flex: 1,
    justifyContent: 'center',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#111',
    textAlign: 'center',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#6B7280',
    textAlign: 'center',
    marginBottom: 32,
  },
  inputGroup: {
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 6,
  },
  input: {
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    backgroundColor: '#fff',
  },
  bottomButtons: {
    paddingBottom: 24,
    gap: 12,
  },
  button: {
    backgroundColor: '#4F46E5',
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  buttonGhost: {
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  buttonGhostText: {
    color: '#6B7280',
    fontSize: 16,
    fontWeight: '600',
  },
});
