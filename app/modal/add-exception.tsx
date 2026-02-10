import { useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, Alert } from 'react-native';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { useAuth } from '@/lib/auth';
import { supabase } from '@/lib/supabase';
import { useCustodyPattern } from '@/hooks/useFamily';
import { getCustodyForDate, buildExceptionMap } from '@/lib/custody-engine';
import { EXCEPTION_REASON_LABELS, type ExceptionReason, type Parent } from '@/types';
import { COLORS } from '@/lib/constants';

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
    <SafeAreaView className="flex-1 bg-white">
      {/* Header */}
      <View className="flex-row items-center justify-between px-4 py-3 border-b border-gray-100">
        <TouchableOpacity onPress={() => router.back()}>
          <MaterialCommunityIcons name="close" size={24} color={COLORS.text} />
        </TouchableOpacity>
        <Text className="text-lg font-semibold text-gray-900">Ausnahme hinzufuegen</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView className="flex-1 px-4 py-4" keyboardShouldPersistTaps="handled">
        {/* Date */}
        <Input
          label="Datum (YYYY-MM-DD)"
          placeholder="2026-02-15"
          value={date}
          onChangeText={setDate}
        />

        {normalParent && (
          <View className="bg-gray-50 rounded-xl p-3 mb-4">
            <Text className="text-sm text-gray-500">
              Normalerweise bei: <Text className="font-semibold text-gray-700">
                {normalParent === 'parent_a' ? 'Elternteil A' : 'Elternteil B'}
              </Text>
            </Text>
            <Text className="text-sm text-gray-500 mt-1">
              Wechsel zu: <Text className="font-semibold text-indigo-600">
                {newParent === 'parent_a' ? 'Elternteil A' : 'Elternteil B'}
              </Text>
            </Text>
          </View>
        )}

        {/* Reason */}
        <Text className="text-sm font-medium text-gray-700 mb-2">Grund</Text>
        <View className="flex-row flex-wrap gap-2 mb-4">
          {REASONS.map(r => (
            <TouchableOpacity
              key={r}
              onPress={() => setReason(r)}
              className={`px-3 py-2 rounded-xl border ${
                reason === r
                  ? 'border-indigo-600 bg-indigo-50'
                  : 'border-gray-200 bg-gray-50'
              }`}
            >
              <Text className={`text-sm ${
                reason === r ? 'text-indigo-600 font-semibold' : 'text-gray-600'
              }`}>
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

      <View className="px-4 pb-6">
        <Button
          title="Ausnahme vorschlagen"
          onPress={() => mutation.mutate()}
          loading={mutation.isPending}
        />
      </View>
    </SafeAreaView>
  );
}
