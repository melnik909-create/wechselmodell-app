import { useState } from 'react';
import { View, Text, Alert, TouchableOpacity, ScrollView } from 'react-native';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { useAuth } from '@/lib/auth';
import { supabase } from '@/lib/supabase';
import { COLORS, PARENT_COLORS } from '@/lib/constants';
import { PATTERN_LABELS, type PatternType, type Parent } from '@/types';
import { getPatternDescription, getCustodyForRange } from '@/lib/custody-engine';
import { addDays } from 'date-fns';
import { formatShortDay, formatDayMonth } from '@/lib/date-utils';

export default function SelectPatternScreen() {
  const { family, refreshFamily } = useAuth();
  const [selectedPattern, setSelectedPattern] = useState<PatternType>('7_7');
  const [startingParent, setStartingParent] = useState<Parent>('parent_a');
  const [loading, setLoading] = useState(false);

  const today = new Date();
  const preview = getCustodyForRange(
    {
      id: 'preview',
      family_id: '',
      pattern_type: selectedPattern,
      start_date: today.toISOString().split('T')[0],
      starting_parent: startingParent,
      custom_sequence: null,
      is_active: true,
    },
    today,
    addDays(today, 13),
    [],
  );

  async function handleSave() {
    if (!family) {
      Alert.alert('Fehler', 'Keine Familie gefunden.');
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase.from('custody_patterns').insert({
        family_id: family.id,
        pattern_type: selectedPattern,
        start_date: today.toISOString().split('T')[0],
        starting_parent: startingParent,
        is_active: true,
      });

      if (error) throw error;

      await refreshFamily();
      router.replace('/(tabs)');
    } catch (error: any) {
      Alert.alert('Fehler', error.message || 'Muster konnte nicht gespeichert werden.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <SafeAreaView className="flex-1 bg-white">
      <ScrollView className="flex-1 px-6" contentContainerClassName="py-8">
        <Text className="text-2xl font-bold text-gray-900 text-center mb-2">
          Betreuungsmodell
        </Text>
        <Text className="text-base text-gray-500 text-center mb-8">
          Wie teilt ihr die Betreuung auf?
        </Text>

        {/* Pattern Options */}
        <View className="gap-3 mb-8">
          {(Object.keys(PATTERN_LABELS) as PatternType[])
            .filter(p => p !== 'custom')
            .map((pattern) => (
              <Card
                key={pattern}
                onPress={() => setSelectedPattern(pattern)}
                className={selectedPattern === pattern ? 'border-indigo-600 border-2' : ''}
              >
                <View className="flex-row items-center justify-between">
                  <View className="flex-1">
                    <Text className="text-base font-semibold text-gray-900">
                      {PATTERN_LABELS[pattern]}
                    </Text>
                    <Text className="text-xs text-gray-500 mt-1">
                      {getPatternDescription(pattern)}
                    </Text>
                  </View>
                  {selectedPattern === pattern && (
                    <MaterialCommunityIcons name="check-circle" size={24} color={COLORS.primary} />
                  )}
                </View>
              </Card>
            ))}
        </View>

        {/* Starting Parent */}
        <Text className="text-sm font-semibold text-gray-700 mb-3">
          Wer hat die Kinder zuerst?
        </Text>
        <View className="flex-row gap-3 mb-8">
          <TouchableOpacity
            onPress={() => setStartingParent('parent_a')}
            className={`flex-1 py-3 rounded-xl items-center border-2 ${
              startingParent === 'parent_a' ? 'border-blue-500 bg-blue-50' : 'border-gray-200'
            }`}
          >
            <Text className={`font-semibold ${
              startingParent === 'parent_a' ? 'text-blue-600' : 'text-gray-500'
            }`}>Elternteil A</Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => setStartingParent('parent_b')}
            className={`flex-1 py-3 rounded-xl items-center border-2 ${
              startingParent === 'parent_b' ? 'border-purple-500 bg-purple-50' : 'border-gray-200'
            }`}
          >
            <Text className={`font-semibold ${
              startingParent === 'parent_b' ? 'text-purple-600' : 'text-gray-500'
            }`}>Elternteil B</Text>
          </TouchableOpacity>
        </View>

        {/* Preview */}
        <Text className="text-sm font-semibold text-gray-700 mb-3">
          Vorschau (naechste 14 Tage)
        </Text>
        <Card className="mb-4">
          <View className="flex-row flex-wrap gap-1">
            {preview.map((day, i) => (
              <View
                key={i}
                className="items-center py-1.5 rounded-lg"
                style={{
                  width: '13%',
                  backgroundColor: day.parent === 'parent_a'
                    ? PARENT_COLORS.parent_a + '20'
                    : PARENT_COLORS.parent_b + '20',
                }}
              >
                <Text className="text-[10px] text-gray-500">{formatShortDay(day.date)}</Text>
                <View
                  className="w-6 h-6 rounded-full items-center justify-center mt-0.5"
                  style={{
                    backgroundColor: PARENT_COLORS[day.parent],
                  }}
                >
                  <Text className="text-white text-[10px] font-bold">
                    {day.parent === 'parent_a' ? 'A' : 'B'}
                  </Text>
                </View>
                <Text className="text-[9px] text-gray-400 mt-0.5">{formatDayMonth(day.date)}</Text>
              </View>
            ))}
          </View>
        </Card>

        {/* Legend */}
        <View className="flex-row justify-center gap-6 mb-4">
          <View className="flex-row items-center gap-2">
            <View className="w-3 h-3 rounded-full" style={{ backgroundColor: PARENT_COLORS.parent_a }} />
            <Text className="text-xs text-gray-500">Elternteil A</Text>
          </View>
          <View className="flex-row items-center gap-2">
            <View className="w-3 h-3 rounded-full" style={{ backgroundColor: PARENT_COLORS.parent_b }} />
            <Text className="text-xs text-gray-500">Elternteil B</Text>
          </View>
        </View>
      </ScrollView>

      <View className="px-6 pb-6">
        <Button
          title="Fertig"
          onPress={handleSave}
          loading={loading}
        />
      </View>
    </SafeAreaView>
  );
}
