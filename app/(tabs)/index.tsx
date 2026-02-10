import { View, Text, ScrollView, TouchableOpacity } from 'react-native';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Card } from '@/components/ui/Card';
import { useAuth } from '@/lib/auth';
import { useCustodyPattern, useCustodyExceptions, useFamilyMembers } from '@/hooks/useFamily';
import { getCustodyForDate, getCustodyForRange, buildExceptionMap, formatDateKey } from '@/lib/custody-engine';
import { getNext7Days, formatShortDay, formatDayMonth, formatFullDate } from '@/lib/date-utils';
import { PARENT_COLORS, COLORS } from '@/lib/constants';
import { addDays } from 'date-fns';
import type { Parent } from '@/types';

export default function HomeScreen() {
  const { profile } = useAuth();
  const { data: pattern } = useCustodyPattern();
  const { data: exceptions } = useCustodyExceptions();
  const { data: members } = useFamilyMembers();

  const today = new Date();
  const next7Days = getNext7Days(today);
  const exceptionMap = buildExceptionMap(exceptions ?? []);

  const todayParent: Parent | null = pattern
    ? getCustodyForDate(pattern, today, exceptionMap)
    : null;

  const parentName = (parent: Parent) => {
    const member = members?.find(m => m.role === parent);
    return member?.profile?.display_name ?? (parent === 'parent_a' ? 'Elternteil A' : 'Elternteil B');
  };

  return (
    <SafeAreaView className="flex-1 bg-gray-50" edges={['top']}>
      <ScrollView className="flex-1" contentContainerClassName="px-4 py-4 pb-8">
        {/* Greeting */}
        <Text className="text-lg font-semibold text-gray-900 mb-4">
          Hallo, {profile?.display_name ?? 'dort'} 👋
        </Text>

        {/* Today Card */}
        {todayParent && (
          <Card className="mb-4">
            <View className="items-center py-2">
              <Text className="text-sm text-gray-500 mb-1">Heute, {formatFullDate(today)}</Text>
              <View
                className="w-16 h-16 rounded-full items-center justify-center mb-2"
                style={{ backgroundColor: PARENT_COLORS[todayParent] }}
              >
                <MaterialCommunityIcons name="account" size={32} color="#fff" />
              </View>
              <Text className="text-xl font-bold text-gray-900">
                Bei {parentName(todayParent)}
              </Text>
            </View>
          </Card>
        )}

        {/* Week Preview */}
        {pattern && (
          <Card className="mb-4">
            <Text className="text-sm font-semibold text-gray-700 mb-3">
              Naechste 7 Tage
            </Text>
            <View className="flex-row justify-between">
              {next7Days.map((day, i) => {
                const parent = getCustodyForDate(pattern, day, exceptionMap);
                const isToday = i === 0;
                return (
                  <View key={i} className="items-center flex-1">
                    <Text className={`text-xs mb-1 ${isToday ? 'font-bold text-gray-900' : 'text-gray-500'}`}>
                      {formatShortDay(day)}
                    </Text>
                    <View
                      className={`w-9 h-9 rounded-full items-center justify-center ${isToday ? 'border-2 border-gray-900' : ''}`}
                      style={{ backgroundColor: PARENT_COLORS[parent] }}
                    >
                      <Text className="text-white text-xs font-bold">
                        {parent === 'parent_a' ? 'A' : 'B'}
                      </Text>
                    </View>
                    <Text className="text-[10px] text-gray-400 mt-1">
                      {formatDayMonth(day)}
                    </Text>
                  </View>
                );
              })}
            </View>
          </Card>
        )}

        {/* Quick Actions */}
        <Text className="text-sm font-semibold text-gray-700 mb-3">
          Schnellaktionen
        </Text>
        <View className="flex-row gap-3 mb-6">
          <QuickAction
            icon="currency-eur"
            label="Ausgabe"
            color="#10B981"
            onPress={() => router.push('/modal/add-expense')}
          />
          <QuickAction
            icon="swap-horizontal"
            label="Uebergabe"
            color="#3B82F6"
            onPress={() => router.push('/(tabs)/handover')}
          />
          <QuickAction
            icon="calendar-edit"
            label="Ausnahme"
            color="#F59E0B"
            onPress={() => router.push('/modal/add-exception')}
          />
          <QuickAction
            icon="card-account-details"
            label="Kind-Info"
            color="#A855F7"
            onPress={() => router.push('/(tabs)/more')}
          />
        </View>

        {/* No pattern message */}
        {!pattern && (
          <Card className="mb-4">
            <View className="items-center py-4">
              <MaterialCommunityIcons name="calendar-question" size={40} color={COLORS.textMuted} />
              <Text className="text-base font-semibold text-gray-700 mt-2">
                Noch kein Betreuungsmodell
              </Text>
              <Text className="text-sm text-gray-500 text-center mt-1">
                Richte zuerst euer Wechselmodell ein.
              </Text>
            </View>
          </Card>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function QuickAction({
  icon,
  label,
  color,
  onPress,
}: {
  icon: string;
  label: string;
  color: string;
  onPress: () => void;
}) {
  return (
    <TouchableOpacity
      onPress={onPress}
      className="flex-1 items-center"
      activeOpacity={0.7}
    >
      <View
        className="w-14 h-14 rounded-2xl items-center justify-center mb-1.5"
        style={{ backgroundColor: color + '15' }}
      >
        <MaterialCommunityIcons name={icon as any} size={26} color={color} />
      </View>
      <Text className="text-xs text-gray-600 text-center">{label}</Text>
    </TouchableOpacity>
  );
}
