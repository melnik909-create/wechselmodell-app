import { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Alert,
  ScrollView,
  ActivityIndicator,
  StyleSheet,
} from 'react-native';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useAuth } from '@/lib/auth';
import { supabase } from '@/lib/supabase';

interface ChildEntry {
  name: string;
  dateOfBirth: string;
}

export default function AddChildrenScreen() {
  const { family } = useAuth();
  const [children, setChildren] = useState<ChildEntry[]>([{ name: '', dateOfBirth: '' }]);
  const [loading, setLoading] = useState(false);

  function addChild() {
    setChildren((prev) => [...prev, { name: '', dateOfBirth: '' }]);
  }

  function removeChild(index: number) {
    if (children.length <= 1) return;
    setChildren((prev) => prev.filter((_, i) => i !== index));
  }

  function updateChild(index: number, field: keyof ChildEntry, value: string) {
    setChildren((prev) =>
      prev.map((child, i) => (i === index ? { ...child, [field]: value } : child))
    );
  }

  async function handleSave() {
    const validChildren = children.filter((c) => c.name.trim());
    if (validChildren.length === 0) {
      Alert.alert('Fehler', 'Bitte mindestens ein Kind hinzufuegen.');
      return;
    }

    if (!family) {
      Alert.alert('Fehler', 'Keine Familie gefunden.');
      return;
    }

    setLoading(true);
    try {
      const inserts = validChildren.map((child) => ({
        family_id: family.id,
        name: child.name.trim(),
        date_of_birth: child.dateOfBirth || null,
      }));

      const { error } = await supabase.from('children').insert(inserts);
      if (error) throw error;

      router.push('/(onboarding)/select-pattern');
    } catch (error: any) {
      Alert.alert('Fehler', error.message || 'Kinder konnten nicht gespeichert werden.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
        <Text style={styles.title}>Kinder hinzufuegen</Text>
        <Text style={styles.subtitle}>Fuer welche Kinder organisiert ihr euch?</Text>

        {children.map((child, index) => (
          <View key={index} style={styles.card}>
            <View style={styles.cardHeader}>
              <Text style={styles.cardTitle}>Kind {index + 1}</Text>
              {children.length > 1 && (
                <TouchableOpacity onPress={() => removeChild(index)}>
                  <MaterialCommunityIcons name="close-circle" size={22} color="#9CA3AF" />
                </TouchableOpacity>
              )}
            </View>
            <View style={styles.inputGroup}>
              <TextInput
                style={styles.input}
                placeholder="Name des Kindes"
                value={child.name}
                onChangeText={(text) => updateChild(index, 'name', text)}
                autoCapitalize="words"
                editable={!loading}
              />
            </View>
            <View style={styles.inputGroup}>
              <TextInput
                style={styles.input}
                placeholder="Geburtsdatum (optional, z.B. 2018-05-15)"
                value={child.dateOfBirth}
                onChangeText={(text) => updateChild(index, 'dateOfBirth', text)}
                keyboardType="numeric"
                editable={!loading}
              />
            </View>
          </View>
        ))}

        <TouchableOpacity style={styles.addButton} onPress={addChild}>
          <MaterialCommunityIcons name="plus-circle-outline" size={22} color="#4F46E5" />
          <Text style={styles.addButtonText}>Weiteres Kind hinzufuegen</Text>
        </TouchableOpacity>
      </ScrollView>

      <View style={styles.bottomButton}>
        <TouchableOpacity
          style={[styles.button, loading && styles.buttonDisabled]}
          onPress={handleSave}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.buttonText}>Weiter</Text>
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
  },
  scrollView: {
    flex: 1,
    paddingHorizontal: 24,
  },
  scrollContent: {
    paddingVertical: 32,
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
  card: {
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  cardTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
  },
  inputGroup: {
    marginBottom: 12,
  },
  input: {
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    backgroundColor: '#fff',
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    marginBottom: 16,
  },
  addButtonText: {
    color: '#4F46E5',
    fontSize: 16,
    fontWeight: '600',
  },
  bottomButton: {
    paddingHorizontal: 24,
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
