import { View, Text, ScrollView, TouchableOpacity, Alert, Share } from 'react-native';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Card } from '@/components/ui/Card';
import { useAuth } from '@/lib/auth';
import { useChildren } from '@/hooks/useFamily';
import { COLORS } from '@/lib/constants';

export default function MoreScreen() {
  const { profile, family, signOut } = useAuth();
  const { data: children } = useChildren();

  async function handleShare() {
    if (!family) return;
    try {
      await Share.share({
        message: `Tritt unserer Familie in der Wechselmodell-App bei! Code: ${family.invite_code}`,
      });
    } catch {}
  }

  async function handleSignOut() {
    Alert.alert(
      'Abmelden',
      'Moechtest du dich wirklich abmelden?',
      [
        { text: 'Abbrechen', style: 'cancel' },
        { text: 'Abmelden', style: 'destructive', onPress: () => signOut() },
      ]
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-gray-50" edges={['top']}>
      <ScrollView className="flex-1 px-4 py-4">
        {/* Profile Card */}
        <Card className="mb-4">
          <View className="flex-row items-center gap-4">
            <View className="w-14 h-14 bg-indigo-100 rounded-full items-center justify-center">
              <Text className="text-xl font-bold text-indigo-600">
                {profile?.display_name?.charAt(0)?.toUpperCase() ?? '?'}
              </Text>
            </View>
            <View className="flex-1">
              <Text className="text-lg font-semibold text-gray-900">
                {profile?.display_name}
              </Text>
              <Text className="text-sm text-gray-500">
                {family?.name ?? 'Keine Familie'}
              </Text>
            </View>
          </View>
        </Card>

        {/* Family Code */}
        {family && (
          <Card className="mb-4" onPress={handleShare}>
            <View className="flex-row items-center justify-between">
              <View>
                <Text className="text-sm font-semibold text-gray-700">Familiencode</Text>
                <Text className="text-2xl font-mono font-bold text-indigo-600 tracking-wider">
                  {family.invite_code}
                </Text>
              </View>
              <MaterialCommunityIcons name="share-variant" size={24} color={COLORS.primary} />
            </View>
          </Card>
        )}

        {/* Children */}
        <Text className="text-sm font-semibold text-gray-700 mb-3 mt-2">
          Kinder
        </Text>
        {children?.map(child => (
          <Card
            key={child.id}
            className="mb-2"
            onPress={() => router.push(`/modal/child-info?id=${child.id}`)}
          >
            <View className="flex-row items-center justify-between">
              <View className="flex-row items-center gap-3">
                <View className="w-10 h-10 bg-purple-100 rounded-full items-center justify-center">
                  <MaterialCommunityIcons name="account-child" size={22} color="#A855F7" />
                </View>
                <View>
                  <Text className="text-base font-semibold text-gray-900">{child.name}</Text>
                  {child.date_of_birth && (
                    <Text className="text-xs text-gray-500">{child.date_of_birth}</Text>
                  )}
                </View>
              </View>
              <MaterialCommunityIcons name="chevron-right" size={22} color={COLORS.textMuted} />
            </View>
          </Card>
        ))}

        {/* Settings Items */}
        <Text className="text-sm font-semibold text-gray-700 mb-3 mt-6">
          Einstellungen
        </Text>

        <SettingsItem
          icon="shield-check"
          label="Datenschutz"
          onPress={() => Alert.alert('Datenschutz', 'Deine Daten werden DSGVO-konform in Frankfurt gespeichert.')}
        />
        <SettingsItem
          icon="download"
          label="Meine Daten exportieren"
          onPress={() => Alert.alert('Datenexport', 'Diese Funktion wird bald verfuegbar sein.')}
        />
        <SettingsItem
          icon="logout"
          label="Abmelden"
          onPress={handleSignOut}
          danger
        />
      </ScrollView>
    </SafeAreaView>
  );
}

function SettingsItem({
  icon,
  label,
  onPress,
  danger = false,
}: {
  icon: string;
  label: string;
  onPress: () => void;
  danger?: boolean;
}) {
  return (
    <TouchableOpacity
      onPress={onPress}
      className="flex-row items-center gap-3 py-3.5 border-b border-gray-100"
      activeOpacity={0.6}
    >
      <MaterialCommunityIcons
        name={icon as any}
        size={22}
        color={danger ? COLORS.error : COLORS.textSecondary}
      />
      <Text className={`text-base flex-1 ${danger ? 'text-red-500' : 'text-gray-900'}`}>
        {label}
      </Text>
      <MaterialCommunityIcons name="chevron-right" size={20} color={COLORS.textMuted} />
    </TouchableOpacity>
  );
}
