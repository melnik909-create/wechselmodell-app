import { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Alert,
  Share,
  ActivityIndicator,
  StyleSheet,
  Platform,
} from 'react-native';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useAuth } from '@/lib/auth';
import { supabase } from '@/lib/supabase';
import { generateInviteCode } from '@/lib/constants';

export default function CreateFamilyScreen() {
  const { user, refreshFamily } = useAuth();
  const [familyName, setFamilyName] = useState('');
  const [inviteCode, setInviteCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [created, setCreated] = useState(false);

  async function handleCreate() {
    if (!familyName.trim()) {
      Alert.alert('Fehler', 'Bitte gib einen Familiennamen ein.');
      return;
    }

    setLoading(true);
    try {
      const code = generateInviteCode();

      // Create family
      const { data: family, error: familyError } = await supabase
        .from('families')
        .insert({
          name: familyName.trim(),
          invite_code: code,
          created_by: user!.id,
        })
        .select()
        .single();

      if (familyError) throw familyError;

      // Add creator as parent_a
      const { error: memberError } = await supabase
        .from('family_members')
        .insert({
          family_id: family.id,
          user_id: user!.id,
          role: 'parent_a',
        });

      if (memberError) throw memberError;

      setInviteCode(code);
      setCreated(true);
      await refreshFamily();
    } catch (error: any) {
      Alert.alert('Fehler', error.message || 'Familie konnte nicht erstellt werden.');
    } finally {
      setLoading(false);
    }
  }

  async function handleShare() {
    try {
      await Share.share({
        message: `Tritt unserer Familie im WechselPlaner bei! Dein Einladungscode: ${inviteCode}`,
      });
    } catch {}
  }

  if (created) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.createdContainer}>
          <View style={styles.successIcon}>
            <MaterialCommunityIcons name="check-circle" size={48} color="#10B981" />
          </View>
          <Text style={styles.successTitle}>Familie erstellt!</Text>
          <Text style={styles.successSubtitle}>
            Teile diesen Code mit dem anderen Elternteil:
          </Text>

          <View style={styles.codeCard}>
            <Text style={styles.codeText}>{inviteCode}</Text>
          </View>

          <TouchableOpacity style={styles.shareButton} onPress={handleShare}>
            <MaterialCommunityIcons name="share-variant" size={20} color="#4F46E5" />
            <Text style={styles.shareButtonText}>Code teilen</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.bottomButton}>
          <TouchableOpacity
            style={styles.button}
            onPress={() => router.push('/(onboarding)/add-children')}
          >
            <Text style={styles.buttonText}>Weiter: Kinder hinzufuegen</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        <Text style={styles.title}>Familie erstellen</Text>
        <Text style={styles.subtitle}>Gib eurer Familie einen Namen.</Text>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>Familienname</Text>
          <TextInput
            style={styles.input}
            placeholder="z.B. Familie Mueller"
            value={familyName}
            onChangeText={setFamilyName}
            editable={!loading}
          />
        </View>
      </View>

      <View style={styles.bottomButton}>
        <TouchableOpacity
          style={[styles.button, loading && styles.buttonDisabled]}
          onPress={handleCreate}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.buttonText}>Familie erstellen</Text>
          )}
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
  createdContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  successIcon: {
    width: 80,
    height: 80,
    backgroundColor: '#D1FAE5',
    borderRadius: 40,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
  },
  successTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#111',
    textAlign: 'center',
    marginBottom: 8,
  },
  successSubtitle: {
    fontSize: 16,
    color: '#6B7280',
    textAlign: 'center',
    marginBottom: 32,
  },
  codeCard: {
    width: '100%',
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    padding: 24,
    alignItems: 'center',
    marginBottom: 32,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  codeText: {
    fontSize: 36,
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
    fontWeight: 'bold',
    color: '#4F46E5',
    letterSpacing: 4,
  },
  shareButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: '#4F46E5',
    backgroundColor: '#fff',
  },
  shareButtonText: {
    color: '#4F46E5',
    fontSize: 16,
    fontWeight: '600',
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
  bottomButton: {
    paddingBottom: 24,
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
});
