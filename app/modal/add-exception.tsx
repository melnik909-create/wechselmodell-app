import { useState } from 'react';
import { View, Text, TextInput, ScrollView, TouchableOpacity, Alert, StyleSheet, KeyboardAvoidingView, Platform } from 'react-native';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/lib/auth';
import { supabase } from '@/lib/supabase';
import { useCustodyPattern } from '@/hooks/useFamily';
import { getCustodyForDate } from '@/lib/custody-engine';
import { EXCEPTION_REASON_LABELS, type ExceptionReason, type Parent } from '@/types';

const REASONS: ExceptionReason[] = ['vacation', 'sick', 'swap', 'holiday', 'other'];

export default function AddExceptionModal() {
  const { family, user } = useAuth();
  const { data: pattern } = useCustodyPattern();
  const queryClient = useQueryClient();

  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [reason, setReason] = useState<ExceptionReason>('swap');
  const [note, setNote] = useState('');

  // Calculate who normally has the child on the selected date
  const normalParent = pattern
    ? getCustodyForDate(pattern, new Date(date + 'T00:00:00'), new Map())
    : null;
  const newParent: Parent | null = normalParent
    ? (normalParent === 'parent_a' ? 'parent_b' : 'parent_a')
    : null;

  const mutation = useMutation({
    mutationFn: async () => {
      if (!family || !normalParent || !newParent) throw new Error('Daten fehlen');
      const { error } = await supabase.from('custody_exceptions').insert({
        family_id: family.id,
        date,
        original_parent: normalParent,
        new_parent: newParent,
        reason,
        note: note.trim() || null,
        status: 'proposed',
        proposed_by: user!.id,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['custody_exceptions'] });
      Alert.alert('Erfolg', 'Ausnahme wurde vorgeschlagen.', [
        { text: 'OK', onPress: () => router.back() },
      ]);
    },
    onError: (error: any) => {
      Alert.alert('Fehler', error.message || 'Ausnahme konnte nicht erstellt werden.');
    },
  });

  return (
    <SafeAreaView style={styles.safeArea} edges={['bottom']}>
      <KeyboardAvoidingView
        style={styles.keyboardView}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
        >
          {/* Date */}
          <Input
            label="Datum (YYYY-MM-DD)"
            placeholder="2026-02-15"
            value={date}
            onChangeText={setDate}
          />

          {normalParent && (
            <View style={styles.infoBox}>
              <Text style={styles.infoText}>
                Normalerweise bei: <Text style={styles.infoTextBold}>
                  {normalParent === 'parent_a' ? 'Elternteil A' : 'Elternteil B'}
                </Text>
              </Text>
              <Text style={[styles.infoText, styles.infoTextMargin]}>
                Wechsel zu: <Text style={styles.infoTextHighlight}>
                  {newParent === 'parent_a' ? 'Elternteil A' : 'Elternteil B'}
                </Text>
              </Text>
            </View>
          )}

          {/* Reason */}
          <Text style={styles.label}>Grund</Text>
          <View style={styles.chipContainer}>
            {REASONS.map(r => (
              <TouchableOpacity
                key={r}
                onPress={() => setReason(r)}
                style={[
                  styles.chip,
                  reason === r ? styles.chipSelected : styles.chipUnselected
                ]}
              >
                <Text style={[
                  styles.chipText,
                  reason === r ? styles.chipTextSelected : styles.chipTextUnselected
                ]}>
                  {EXCEPTION_REASON_LABELS[r]}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Note */}
          <Input
            label="Notiz (optional)"
            placeholder="z.B. Reise nach..."
            value={note}
            onChangeText={setNote}
            multiline
            numberOfLines={3}
          />
        </ScrollView>

        <View style={styles.buttonContainer}>
          <TouchableOpacity
            style={[styles.button, mutation.isPending && styles.buttonDisabled]}
            onPress={() => mutation.mutate()}
            disabled={mutation.isPending}
          >
            <Text style={styles.buttonText}>
              {mutation.isPending ? 'Speichern...' : 'Ausnahme vorschlagen'}
            </Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function Input({
  label,
  placeholder,
  value,
  onChangeText,
  multiline = false,
  numberOfLines = 1,
}: {
  label: string;
  placeholder: string;
  value: string;
  onChangeText: (text: string) => void;
  multiline?: boolean;
  numberOfLines?: number;
}) {
  return (
    <View style={styles.inputGroup}>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        style={[styles.input, multiline && styles.inputMultiline]}
        placeholder={placeholder}
        value={value}
        onChangeText={onChangeText}
        multiline={multiline}
        numberOfLines={numberOfLines}
        placeholderTextColor="#9CA3AF"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#fff',
  },
  keyboardView: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingVertical: 16,
    paddingBottom: 32,
  },
  inputGroup: {
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: '500',
    color: '#374151',
    marginBottom: 8,
  },
  input: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    color: '#111',
  },
  inputMultiline: {
    minHeight: 80,
    textAlignVertical: 'top',
  },
  infoBox: {
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    padding: 12,
    marginBottom: 16,
  },
  infoText: {
    fontSize: 14,
    color: '#6B7280',
  },
  infoTextBold: {
    fontWeight: '600',
    color: '#374151',
  },
  infoTextHighlight: {
    fontWeight: '600',
    color: '#4F46E5',
  },
  infoTextMargin: {
    marginTop: 4,
  },
  chipContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 16,
  },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    borderWidth: 1,
  },
  chipSelected: {
    borderColor: '#4F46E5',
    backgroundColor: '#EEF2FF',
  },
  chipUnselected: {
    borderColor: '#E5E7EB',
    backgroundColor: '#F9FAFB',
  },
  chipText: {
    fontSize: 14,
  },
  chipTextSelected: {
    color: '#4F46E5',
    fontWeight: '600',
  },
  chipTextUnselected: {
    color: '#6B7280',
  },
  buttonContainer: {
    padding: 16,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
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
