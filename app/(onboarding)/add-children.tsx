import { useState } from 'react';
import { View, Text, Alert, TouchableOpacity, ScrollView } from 'react-native';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Card } from '@/components/ui/Card';
import { useAuth } from '@/lib/auth';
import { supabase } from '@/lib/supabase';
import { COLORS } from '@/lib/constants';

interface ChildEntry {
  name: string;
  dateOfBirth: string;
}

export default function AddChildrenScreen() {
  const { family } = useAuth();
  const [children, setChildren] = useState<ChildEntry[]>([{ name: '', dateOfBirth: '' }]);
  const [loading, setLoading] = useState(false);

  function addChild() {
    setChildren(prev => [...prev, { name: '', dateOfBirth: '' }]);
  }

  function removeChild(index: number) {
    if (children.length <= 1) return;
    setChildren(prev => prev.filter((_, i) => i !== index));
  }

  function updateChild(index: number, field: keyof ChildEntry, value: string) {
    setChildren(prev =>
      prev.map((child, i) => (i === index ? { ...child, [field]: value } : child))
    );
  }

  async function handleSave() {
    const validChildren = children.filter(c => c.name.trim());
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
      const inserts = validChildren.map(child => ({
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
    <SafeAreaView className="flex-1 bg-white">
      <ScrollView className="flex-1 px-6" contentContainerClassName="py-8">
        <Text className="text-2xl font-bold text-gray-900 text-center mb-2">
          Kinder hinzufuegen
        </Text>
        <Text className="text-base text-gray-500 text-center mb-8">
          Fuer welche Kinder organisiert ihr euch?
        </Text>

        {children.map((child, index) => (
          <Card key={index} className="mb-4">
            <View className="flex-row items-center justify-between mb-2">
              <Text className="text-sm font-semibold text-gray-700">
                Kind {index + 1}
              </Text>
              {children.length > 1 && (
                <TouchableOpacity onPress={() => removeChild(index)}>
                  <MaterialCommunityIcons name="close-circle" size={22} color={COLORS.textMuted} />
                </TouchableOpacity>
              )}
            </View>
            <Input
              placeholder="Name des Kindes"
              value={child.name}
              onChangeText={(text) => updateChild(index, 'name', text)}
              autoCapitalize="words"
            />
            <Input
              placeholder="Geburtsdatum (optional, z.B. 2018-05-15)"
              value={child.dateOfBirth}
              onChangeText={(text) => updateChild(index, 'dateOfBirth', text)}
              keyboardType="numeric"
            />
          </Card>
        ))}

        <TouchableOpacity
          onPress={addChild}
          className="flex-row items-center justify-center gap-2 py-3 mb-4"
        >
          <MaterialCommunityIcons name="plus-circle-outline" size={22} color={COLORS.primary} />
          <Text className="text-indigo-600 font-semibold">Weiteres Kind hinzufuegen</Text>
        </TouchableOpacity>
      </ScrollView>

      <View className="px-6 pb-6">
        <Button
          title="Weiter"
          onPress={handleSave}
          loading={loading}
        />
      </View>
    </SafeAreaView>
  );
}
