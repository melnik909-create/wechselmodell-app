import { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useAuth } from '@/lib/auth';
import { useUpdateFamily } from '@/hooks/useFamily';
import { COLORS } from '@/lib/constants';

export default function EditParentLabelsScreen() {
  const { family } = useAuth();
  const updateFamily = useUpdateFamily();

  const [parentALabel, setParentALabel] = useState('');
  const [parentBLabel, setParentBLabel] = useState('');

  useEffect(() => {
    if (family) {
      setParentALabel(family.parent_a_label ?? '');
      setParentBLabel(family.parent_b_label ?? '');
    }
  }, [family]);

  async function handleSave() {
    if (!family) return;

    updateFamily.mutate(
      {
        parent_a_label: parentALabel.trim() || null,
        parent_b_label: parentBLabel.trim() || null,
      },
      {
        onSuccess: () => {
          Alert.alert('Gespeichert', 'Elternnamen wurden aktualisiert.', [
            { text: 'OK', onPress: () => router.back() },
          ]);
        },
        onError: (error: any) => {
          Alert.alert('Fehler', error.message || 'Konnte nicht speichern.');
        },
      }
    );
  }

  return (
    <SafeAreaView style={styles.safeArea} edges={['bottom']}>
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.closeButton}>
            <MaterialCommunityIcons name="close" size={24} color="#111" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Elternnamen anpassen</Text>
          <View style={{ width: 24 }} />
        </View>

        {/* Content */}
        <View style={styles.content}>
          <View style={styles.infoBox}>
            <MaterialCommunityIcons name="information" size={20} color={COLORS.primary} />
            <Text style={styles.infoText}>
              Passe die Anzeigenamen für die Elternteile an. Diese Namen werden überall in der App angezeigt.
            </Text>
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Elternteil A</Text>
            <TextInput
              style={styles.input}
              placeholder="z.B. Mama, Papa, Max..."
              value={parentALabel}
              onChangeText={setParentALabel}
              placeholderTextColor="#9CA3AF"
            />
            <Text style={styles.hint}>
              Leer lassen, um den Profilnamen zu verwenden
            </Text>
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Elternteil B</Text>
            <TextInput
              style={styles.input}
              placeholder="z.B. Mama, Papa, Lisa..."
              value={parentBLabel}
              onChangeText={setParentBLabel}
              placeholderTextColor="#9CA3AF"
            />
            <Text style={styles.hint}>
              Leer lassen, um den Profilnamen zu verwenden
            </Text>
          </View>
        </View>

        {/* Save Button */}
        <View style={styles.buttonContainer}>
          <TouchableOpacity
            style={[styles.saveButton, updateFamily.isPending && styles.saveButtonDisabled]}
            onPress={handleSave}
            disabled={updateFamily.isPending}
          >
            <Text style={styles.saveButtonText}>
              {updateFamily.isPending ? 'Speichern...' : 'Speichern'}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  container: {
    flex: 1,
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
  content: {
    flex: 1,
    paddingHorizontal: 16,
    paddingVertical: 24,
  },
  infoBox: {
    flexDirection: 'row',
    gap: 12,
    backgroundColor: '#EEF2FF',
    padding: 16,
    borderRadius: 12,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: '#C7D2FE',
  },
  infoText: {
    flex: 1,
    fontSize: 14,
    color: '#4338CA',
    lineHeight: 20,
  },
  inputGroup: {
    marginBottom: 24,
  },
  label: {
    fontSize: 15,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 8,
  },
  input: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 8,
    padding: 14,
    fontSize: 16,
    color: '#111',
  },
  hint: {
    fontSize: 13,
    color: '#6B7280',
    marginTop: 6,
    fontStyle: 'italic',
  },
  buttonContainer: {
    padding: 16,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  saveButton: {
    backgroundColor: COLORS.primary,
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  saveButtonDisabled: {
    opacity: 0.6,
  },
  saveButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});
