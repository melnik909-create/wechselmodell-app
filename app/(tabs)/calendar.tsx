import { useState, useMemo } from 'react';
import { View, Text, TouchableOpacity, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Card } from '@/components/ui/Card';
import { useCustodyPattern, useCustodyExceptions, useFamilyMembers } from '@/hooks/useFamily';
import { getCustodyForDate, buildExceptionMap, formatDateKey } from '@/lib/custody-engine';
import { getMonthDays, formatMonthYear, formatShortDay, isToday, isSameDay, addDays, startOfMonth } from '@/lib/date-utils';
import { PARENT_COLORS, COLORS } from '@/lib/constants';
import { addMonths, subMonths, isSameMonth } from 'date-fns';
import type { Parent } from '@/types';

const WEEKDAY_HEADERS = ['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So'];

export default function CalendarScreen() {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const { data: pattern } = useCustodyPattern();
  const { data: exceptions } = useCustodyExceptions();
  const { data: members } = useFamilyMembers();

  const exceptionMap = buildExceptionMap(exceptions ?? []);
  const monthDays = useMemo(() => getMonthDays(currentMonth), [currentMonth]);

  const parentName = (parent: Parent) => {
    const member = members?.find(m => m.role === parent);
    return member?.profile?.display_name ?? (parent === 'parent_a' ? 'A' : 'B');
  };

  function goToPreviousMonth() {
    setCurrentMonth(prev => subMonths(prev, 1));
  }

  function goToNextMonth() {
    setCurrentMonth(prev => addMonths(prev, 1));
  }

  function goToToday() {
    setCurrentMonth(new Date());
  }

  return (
    <SafeAreaView className="flex-1 bg-gray-50" edges={['top']}>
      <ScrollView className="flex-1" contentContainerClassName="px-4 py-4">
        {/* Month Navigation */}
        <View className="flex-row items-center justify-between mb-4">
          <TouchableOpacity onPress={goToPreviousMonth} className="p-2">
            <MaterialCommunityIcons name="chevron-left" size={28} color={COLORS.text} />
          </TouchableOpacity>

          <TouchableOpacity onPress={goToToday}>
            <Text className="text-lg font-bold text-gray-900">
              {formatMonthYear(currentMonth)}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity onPress={goToNextMonth} className="p-2">
            <MaterialCommunityIcons name="chevron-right" size={28} color={COLORS.text} />
          </TouchableOpacity>
        </View>

        {/* Calendar Grid */}
        <Card className="mb-4">
          {/* Weekday Headers */}
          <View className="flex-row mb-2">
            {WEEKDAY_HEADERS.map(day => (
              <View key={day} className="flex-1 items-center">
                <Text className="text-xs font-semibold text-gray-500">{day}</Text>
              </View>
            ))}
          </View>

          {/* Day Grid */}
          <View className="flex-row flex-wrap">
            {monthDays.map((day, i) => {
              const inCurrentMonth = isSameMonth(day, currentMonth);
              const today = isToday(day);
              const custodyParent = pattern
                ? getCustodyForDate(pattern, day, exceptionMap)
                : null;
              const dateKey = formatDateKey(day);
              const hasException = exceptions?.some(
                e => e.date === dateKey && e.status === 'accepted'
              );

              return (
                <View
                  key={i}
                  className="items-center justify-center py-1.5"
                  style={{ width: '14.28%' }}
                >
                  <View
                    className={`w-9 h-9 rounded-full items-center justify-center ${
                      today ? 'border-2 border-gray-900' : ''
                    }`}
                    style={
                      custodyParent && inCurrentMonth
                        ? { backgroundColor: PARENT_COLORS[custodyParent] + (inCurrentMonth ? 'CC' : '40') }
                        : { backgroundColor: 'transparent' }
                    }
                  >
                    <Text
                      className={`text-sm ${
                        !inCurrentMonth
                          ? 'text-gray-300'
                          : custodyParent
                          ? 'text-white font-medium'
                          : 'text-gray-700'
                      }`}
                    >
                      {day.getDate()}
                    </Text>
                  </View>
                  {hasException && inCurrentMonth && (
                    <View className="w-1.5 h-1.5 rounded-full bg-yellow-500 mt-0.5" />
                  )}
                </View>
              );
            })}
          </View>
        </Card>

        {/* Legend */}
        <View className="flex-row justify-center gap-6">
          <View className="flex-row items-center gap-2">
            <View className="w-3 h-3 rounded-full" style={{ backgroundColor: PARENT_COLORS.parent_a }} />
            <Text className="text-xs text-gray-500">{parentName('parent_a')}</Text>
          </View>
          <View className="flex-row items-center gap-2">
            <View className="w-3 h-3 rounded-full" style={{ backgroundColor: PARENT_COLORS.parent_b }} />
            <Text className="text-xs text-gray-500">{parentName('parent_b')}</Text>
          </View>
          <View className="flex-row items-center gap-2">
            <View className="w-1.5 h-1.5 rounded-full bg-yellow-500" />
            <Text className="text-xs text-gray-500">Ausnahme</Text>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
