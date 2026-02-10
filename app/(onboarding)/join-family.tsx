import { useState } from 'react';
import { View, Text, Alert } from 'react-native';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
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
    <SafeAreaView className="flex-1 bg-white px-6">
      <View className="flex-1 justify-center">
        <Text className="text-2xl font-bold text-gray-900 text-center mb-2">
          Familie beitreten
        </Text>
        <Text className="text-base text-gray-500 text-center mb-8">
          Gib den Einladungscode ein, den du vom anderen Elternteil erhalten hast.
        </Text>

        <Input
          label="Einladungscode"
          placeholder="z.B. A3K9X2"
          value={code}
          onChangeText={(text) => setCode(text.toUpperCase())}
          autoCapitalize="characters"
        />
      </View>

      <View className="pb-6 gap-3">
        <Button
          title="Beitreten"
          onPress={handleJoin}
          loading={loading}
        />
        <Button
          title="Zurueck"
          onPress={() => router.back()}
          variant="ghost"
        />
      </View>
    </SafeAreaView>
  );
}
