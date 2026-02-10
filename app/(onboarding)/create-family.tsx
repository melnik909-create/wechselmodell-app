import { useState } from 'react';
import { View, Text, Alert, Share } from 'react-native';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Card } from '@/components/ui/Card';
import { useAuth } from '@/lib/auth';
import { supabase } from '@/lib/supabase';
import { generateInviteCode, COLORS } from '@/lib/constants';

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
        message: `Tritt unserer Familie in der Wechselmodell-App bei! Dein Einladungscode: ${inviteCode}`,
      });
    } catch {}
  }

  if (created) {
    return (
      <SafeAreaView className="flex-1 bg-white px-6">
        <View className="flex-1 justify-center items-center">
          <View className="w-20 h-20 bg-green-100 rounded-full items-center justify-center mb-6">
            <MaterialCommunityIcons name="check-circle" size={48} color="#10B981" />
          </View>
          <Text className="text-2xl font-bold text-gray-900 text-center mb-2">
            Familie erstellt!
          </Text>
          <Text className="text-base text-gray-500 text-center mb-8">
            Teile diesen Code mit dem anderen Elternteil:
          </Text>

          <Card className="w-full items-center mb-8">
            <Text className="text-4xl font-mono font-bold text-indigo-600 tracking-widest">
              {inviteCode}
            </Text>
          </Card>

          <Button
            title="Code teilen"
            onPress={handleShare}
            variant="outline"
            icon={<MaterialCommunityIcons name="share-variant" size={20} color={COLORS.primary} />}
          />
        </View>

        <View className="pb-6">
          <Button
            title="Weiter: Kinder hinzufuegen"
            onPress={() => router.push('/(onboarding)/add-children')}
          />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-white px-6">
      <View className="flex-1 justify-center">
        <Text className="text-2xl font-bold text-gray-900 text-center mb-2">
          Familie erstellen
        </Text>
        <Text className="text-base text-gray-500 text-center mb-8">
          Gib eurer Familie einen Namen.
        </Text>

        <Input
          label="Familienname"
          placeholder="z.B. Familie Mueller"
          value={familyName}
          onChangeText={setFamilyName}
        />
      </View>

      <View className="pb-6">
        <Button
          title="Familie erstellen"
          onPress={handleCreate}
          loading={loading}
        />
      </View>
    </SafeAreaView>
  );
}
