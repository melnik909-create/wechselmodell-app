import { View, Text } from 'react-native';
import { router } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Button } from '@/components/ui/Button';
import { SafeAreaView } from 'react-native-safe-area-context';
import { COLORS } from '@/lib/constants';

export default function WelcomeScreen() {
  return (
    <SafeAreaView className="flex-1 bg-white px-6">
      <View className="flex-1 justify-center items-center">
        {/* Illustration */}
        <View className="w-24 h-24 bg-indigo-100 rounded-full items-center justify-center mb-8">
          <MaterialCommunityIcons name="account-group" size={48} color={COLORS.primary} />
        </View>

        <Text className="text-2xl font-bold text-gray-900 text-center mb-3">
          Willkommen bei Wechselmodell
        </Text>
        <Text className="text-base text-gray-500 text-center mb-12 leading-6">
          Organisiert gemeinsam den Alltag eurer Kinder.{'\n'}
          Kalender, Ausgaben und Uebergaben{'\n'}an einem Ort.
        </Text>

        {/* Features */}
        <View className="w-full mb-12 gap-4">
          <FeatureItem
            icon="calendar-check"
            title="Gemeinsamer Kalender"
            subtitle="Wer hat wann die Kinder?"
          />
          <FeatureItem
            icon="swap-horizontal"
            title="Uebergabe-Checklisten"
            subtitle="Nichts mehr vergessen"
          />
          <FeatureItem
            icon="currency-eur"
            title="Ausgaben teilen"
            subtitle="Fair und transparent"
          />
        </View>
      </View>

      {/* Actions */}
      <View className="pb-6 gap-3">
        <Button
          title="Familie erstellen"
          onPress={() => router.push('/(onboarding)/create-family')}
        />
        <Button
          title="Familie beitreten"
          onPress={() => router.push('/(onboarding)/join-family')}
          variant="outline"
        />
      </View>
    </SafeAreaView>
  );
}

function FeatureItem({ icon, title, subtitle }: { icon: string; title: string; subtitle: string }) {
  return (
    <View className="flex-row items-center gap-4">
      <View className="w-10 h-10 bg-indigo-50 rounded-xl items-center justify-center">
        <MaterialCommunityIcons name={icon as any} size={22} color={COLORS.primary} />
      </View>
      <View className="flex-1">
        <Text className="text-sm font-semibold text-gray-900">{title}</Text>
        <Text className="text-xs text-gray-500">{subtitle}</Text>
      </View>
    </View>
  );
}
