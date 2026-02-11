import { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Alert,
} from 'react-native';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useCustodyPattern, useFamilyMembers } from '@/hooks/useFamily';
import { useUpdatePattern } from '@/hooks/useFamily';
import { PATTERN_LABELS } from '@/types';
import type { PatternType, Parent } from '@/types';
import { format } from 'date-fns';

const PATTERN_OPTIONS: { type: PatternType; description: string }[] = [
  { type: '7_7', description: '1 Woche bei A, 1 Woche bei B' },
  { type: '2_2_5_5', description: '2 Tage A, 2 Tage B, 5 Tage A, dann umgekehrt' },
  { type: '2_2_3', description: '2 Tage A, 2 Tage B, 3 Tage A, dann umgekehrt' },
];

export default function ChangePatternModal() {
  const { data: currentPattern } = useCustodyPattern();
  const { data: members } = useFamilyMembers();
  const updatePattern = useUpdatePattern();

  const [selectedType, setSelectedType] = useState<PatternType>('7_7');
  const [startingParent, setStartingParent] = useState<Parent>('parent_a');
  const [startDate, setStartDate] = useState(format(new Date(), 'yyyy-MM-dd'));

  useEffect(() => {
    if (currentPattern) {
      setSelectedType(currentPattern.pattern_type);
      setStartingParent(currentPattern.starting_parent);
      setStartDate(currentPattern.start_date);
    }
  }, [currentPattern]);

  const parentName = (parent: Parent) => {
    const member = members?.find((m) => m.role === parent);
    return member?.profile?.display_name ?? (parent === 'parent_a' ? 'Elternteil A' : 'Elternteil B');
  };

  function handleSave() {
    if (!startDate) {
      Alert.alert('Fehler', 'Bitte wähle ein Startdatum.');
      return;
    }

    Alert.alert(
      'Modell ändern',
      'Möchtest du das Betreuungsmodell wirklich ändern? Das aktuelle Modell wird deaktiviert und ein neues ab dem gewählten Datum erstellt.',
      [
        { text: 'Abbrechen', style: 'cancel' },
        {
          text: 'Ändern',
          onPress: () => {
            updatePattern.mutate(
              {
                pattern_type: selectedType,
                starting_parent: startingParent,
                start_date: startDate,
              },
              {
                onSuccess: () => {
                  Alert.alert('Erfolg', 'Betreuungsmodell wurde geändert!');
                  router.back();
                },
                onError: (error) => {
                  Alert.alert('Fehler', `Änderung fehlgeschlagen: ${error.message}`);
                },
              }
            );
          },
        },
      ]
    );
  }

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.closeButton}>
          <MaterialCommunityIcons name="close" size={24} color="#111" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Modell ändern</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
        {/* Current Pattern Info */}
        {currentPattern && (
          <View style={styles.infoBox}>
            <MaterialCommunityIcons name="information-outline" size={20} color="#3B82F6" />
            <Text style={styles.infoText}>
              Aktuell: {PATTERN_LABELS[currentPattern.pattern_type]} ab{' '}
              {currentPattern.start_date}
            </Text>
          </View>
        )}

        {/* Pattern Selection */}
        <Text style={styles.sectionTitle}>Neues Modell wählen</Text>
        {PATTERN_OPTIONS.map((option) => (
          <TouchableOpacity
            key={option.type}
            style={[
              styles.patternCard,
              selectedType === option.type && styles.patternCardSelected,
            ]}
            onPress={() => setSelectedType(option.type)}
            activeOpacity={0.7}
          >
            <View style={styles.patternHeader}>
              <Text style={styles.patternTitle}>{PATTERN_LABELS[option.type]}</Text>
              {selectedType === option.type && (
                <MaterialCommunityIcons name="check-circle" size={22} color="#10B981" />
              )}
            </View>
            <Text style={styles.patternDescription}>{option.description}</Text>
          </TouchableOpacity>
        ))}

        {/* Starting Parent */}
        <Text style={styles.sectionTitle}>Startet bei</Text>
        <View style={styles.parentButtons}>
          <TouchableOpacity
            style={[
              styles.parentButton,
              startingParent === 'parent_a' && styles.parentButtonSelected,
            ]}
            onPress={() => setStartingParent('parent_a')}
          >
            <MaterialCommunityIcons
              name="account"
              size={20}
              color={startingParent === 'parent_a' ? '#fff' : '#6B7280'}
            />
            <Text
              style={[
                styles.parentButtonText,
                startingParent === 'parent_a' && styles.parentButtonTextSelected,
              ]}
            >
              {parentName('parent_a')}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.parentButton,
              startingParent === 'parent_b' && styles.parentButtonSelected,
            ]}
            onPress={() => setStartingParent('parent_b')}
          >
            <MaterialCommunityIcons
              name="account"
              size={20}
              color={startingParent === 'parent_b' ? '#fff' : '#6B7280'}
            />
            <Text
              style={[
                styles.parentButtonText,
                startingParent === 'parent_b' && styles.parentButtonTextSelected,
              ]}
            >
              {parentName('parent_b')}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Start Date */}
        <Text style={styles.sectionTitle}>Startdatum</Text>
        <View style={styles.inputGroup}>
          <TextInput
            style={styles.input}
            placeholder="YYYY-MM-DD"
            value={startDate}
            onChangeText={setStartDate}
            placeholderTextColor="#9CA3AF"
          />
          <Text style={styles.inputHint}>Ab diesem Datum gilt das neue Modell</Text>
        </View>

        {/* Save Button */}
        <TouchableOpacity
          style={[styles.saveButton, updatePattern.isPending && styles.saveButtonDisabled]}
          onPress={handleSave}
          disabled={updatePattern.isPending}
        >
          <MaterialCommunityIcons name="content-save" size={20} color="#fff" />
          <Text style={styles.saveButtonText}>
            {updatePattern.isPending ? 'Wird geändert...' : 'Modell ändern'}
          </Text>
        </TouchableOpacity>
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
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#111',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingVertical: 16,
    paddingBottom: 32,
  },
  infoBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: '#EFF6FF',
    borderWidth: 1,
    borderColor: '#BFDBFE',
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
  },
  infoText: {
    flex: 1,
    fontSize: 14,
    color: '#1E40AF',
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 12,
    marginTop: 8,
  },
  patternCard: {
    backgroundColor: '#fff',
    borderWidth: 2,
    borderColor: '#E5E7EB',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  patternCardSelected: {
    borderColor: '#10B981',
    backgroundColor: '#ECFDF5',
  },
  patternHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  patternTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111',
  },
  patternDescription: {
    fontSize: 14,
    color: '#6B7280',
  },
  parentButtons: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
  },
  parentButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#fff',
    borderWidth: 2,
    borderColor: '#E5E7EB',
    borderRadius: 8,
    paddingVertical: 12,
  },
  parentButtonSelected: {
    backgroundColor: '#10B981',
    borderColor: '#10B981',
  },
  parentButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#374151',
  },
  parentButtonTextSelected: {
    color: '#fff',
  },
  inputGroup: {
    marginBottom: 16,
  },
  input: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 15,
    color: '#111',
  },
  inputHint: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 4,
  },
  saveButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#10B981',
    paddingVertical: 14,
    borderRadius: 8,
    marginTop: 8,
  },
  saveButtonDisabled: {
    backgroundColor: '#9CA3AF',
  },
  saveButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});
