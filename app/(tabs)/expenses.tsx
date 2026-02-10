import { useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, Alert } from 'react-native';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { useAuth } from '@/lib/auth';
import { useExpenses, calculateBalance } from '@/hooks/useExpenses';
import { useFamilyMembers } from '@/hooks/useFamily';
import { EXPENSE_CATEGORY_LABELS } from '@/types';
import { formatDayMonth } from '@/lib/date-utils';
import { COLORS, PARENT_COLORS } from '@/lib/constants';
import { format } from 'date-fns';

const CATEGORY_ICONS: Record<string, string> = {
  clothing: 'tshirt-crew',
  medical: 'medical-bag',
  school: 'school',
  daycare: 'baby-face-outline',
  sports: 'basketball',
  music: 'music',
  food: 'food',
  transport: 'car',
  vacation: 'beach',
  other: 'dots-horizontal',
};

export default function ExpensesScreen() {
  const { user, familyMember } = useAuth();
  const { data: members } = useFamilyMembers();
  const [selectedMonth] = useState(format(new Date(), 'yyyy-MM'));
  const { data: expenses, isLoading } = useExpenses(selectedMonth);

  const parentAMember = members?.find(m => m.role === 'parent_a');
  const balance = expenses && parentAMember
    ? calculateBalance(expenses, parentAMember.user_id)
    : null;

  const memberName = (userId: string) => {
    const member = members?.find(m => m.user_id === userId);
    return member?.profile?.display_name ?? 'Unbekannt';
  };

  const isParentA = familyMember?.role === 'parent_a';
  const myOwes = balance
    ? (isParentA ? balance.parentAOwes : balance.parentBOwes)
    : 0;

  return (
    <SafeAreaView className="flex-1 bg-gray-50" edges={['top']}>
      <ScrollView className="flex-1 px-4 py-4">
        {/* Balance Card */}
        {balance && (
          <Card className="mb-4">
            <Text className="text-sm text-gray-500 text-center mb-1">Offener Saldo</Text>
            <Text className={`text-2xl font-bold text-center ${
              myOwes > 0 ? 'text-red-500' : myOwes < 0 ? 'text-green-500' : 'text-gray-900'
            }`}>
              {myOwes > 0
                ? `Du schuldest ${Math.abs(myOwes).toFixed(2)} €`
                : myOwes < 0
                ? `Dir werden ${Math.abs(myOwes).toFixed(2)} € geschuldet`
                : 'Ausgeglichen ✓'}
            </Text>
            <View className="flex-row justify-between mt-3 pt-3 border-t border-gray-100">
              <View className="items-center flex-1">
                <Text className="text-xs text-gray-400">Bezahlt von {memberName(parentAMember!.user_id)}</Text>
                <Text className="text-sm font-semibold text-gray-900">
                  {balance.totalByParentA.toFixed(2)} €
                </Text>
              </View>
              <View className="items-center flex-1">
                <Text className="text-xs text-gray-400">Bezahlt von {memberName(members?.find(m => m.role === 'parent_b')?.user_id ?? '')}</Text>
                <Text className="text-sm font-semibold text-gray-900">
                  {balance.totalByParentB.toFixed(2)} €
                </Text>
              </View>
            </View>
          </Card>
        )}

        {/* Add Expense Button */}
        <Button
          title="Ausgabe hinzufuegen"
          onPress={() => router.push('/modal/add-expense')}
          icon={<MaterialCommunityIcons name="plus" size={20} color="#fff" />}
        />

        {/* Expense List */}
        <View className="mt-4">
          {expenses?.map(expense => (
            <Card key={expense.id} className="mb-2">
              <View className="flex-row items-center gap-3">
                <View
                  className="w-10 h-10 rounded-xl items-center justify-center"
                  style={{ backgroundColor: COLORS.primary + '15' }}
                >
                  <MaterialCommunityIcons
                    name={(CATEGORY_ICONS[expense.category] ?? 'dots-horizontal') as any}
                    size={22}
                    color={COLORS.primary}
                  />
                </View>
                <View className="flex-1">
                  <Text className="text-sm font-semibold text-gray-900">{expense.description}</Text>
                  <Text className="text-xs text-gray-500">
                    {EXPENSE_CATEGORY_LABELS[expense.category]} · {formatDayMonth(new Date(expense.date + 'T00:00:00'))}
                  </Text>
                </View>
                <View className="items-end">
                  <Text className="text-base font-bold text-gray-900">
                    {Number(expense.amount).toFixed(2)} €
                  </Text>
                  <Text className="text-xs text-gray-400">
                    {memberName(expense.paid_by)}
                  </Text>
                </View>
              </View>
            </Card>
          ))}

          {(!expenses || expenses.length === 0) && !isLoading && (
            <View className="items-center py-12">
              <MaterialCommunityIcons name="currency-eur" size={48} color={COLORS.textMuted} />
              <Text className="text-base text-gray-400 mt-2">Noch keine Ausgaben</Text>
            </View>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
