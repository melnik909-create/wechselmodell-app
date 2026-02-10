import { useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, Alert } from 'react-native';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Card } from '@/components/ui/Card';
import { useAuth } from '@/lib/auth';
import { useAddExpense } from '@/hooks/useExpenses';
import { useChildren } from '@/hooks/useFamily';
import { EXPENSE_CATEGORY_LABELS, type ExpenseCategory } from '@/types';
import { COLORS } from '@/lib/constants';

const CATEGORIES: ExpenseCategory[] = [
  'clothing', 'medical', 'school', 'daycare', 'sports',
  'music', 'food', 'transport', 'vacation', 'other',
];

export default function AddExpenseModal() {
  const { user } = useAuth();
  const { data: children } = useChildren();
  const addExpense = useAddExpense();

  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState<ExpenseCategory>('other');
  const [selectedChild, setSelectedChild] = useState<string | null>(null);
  const [splitType, setSplitType] = useState<'50_50' | 'custom'>('50_50');

  async function handleSave() {
    const numAmount = parseFloat(amount.replace(',', '.'));
    if (isNaN(numAmount) || numAmount <= 0) {
      Alert.alert('Fehler', 'Bitte einen gueltigen Betrag eingeben.');
      return;
    }
    if (!description.trim()) {
      Alert.alert('Fehler', 'Bitte eine Beschreibung eingeben.');
      return;
    }

    try {
      await addExpense.mutateAsync({
        amount: numAmount,
        description: description.trim(),
        category,
        child_id: selectedChild,
        paid_by: user!.id,
        split_type: splitType,
        split_percentage: 50,
        receipt_url: null,
        date: new Date().toISOString().split('T')[0],
      });
      router.back();
    } catch (error: any) {
      Alert.alert('Fehler', error.message || 'Ausgabe konnte nicht gespeichert werden.');
    }
  }

  return (
    <SafeAreaView className="flex-1 bg-white">
      {/* Header */}
      <View className="flex-row items-center justify-between px-4 py-3 border-b border-gray-100">
        <TouchableOpacity onPress={() => router.back()}>
          <MaterialCommunityIcons name="close" size={24} color={COLORS.text} />
        </TouchableOpacity>
        <Text className="text-lg font-semibold text-gray-900">Neue Ausgabe</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView className="flex-1 px-4 py-4" keyboardShouldPersistTaps="handled">
        {/* Amount */}
        <Input
          label="Betrag (EUR)"
          placeholder="0,00"
          value={amount}
          onChangeText={setAmount}
          keyboardType="numeric"
        />

        {/* Description */}
        <Input
          label="Beschreibung"
          placeholder="z.B. Winterjacke"
          value={description}
          onChangeText={setDescription}
        />

        {/* Category */}
        <Text className="text-sm font-medium text-gray-700 mb-2">Kategorie</Text>
        <View className="flex-row flex-wrap gap-2 mb-4">
          {CATEGORIES.map(cat => (
            <TouchableOpacity
              key={cat}
              onPress={() => setCategory(cat)}
              className={`px-3 py-2 rounded-xl border ${
                category === cat
                  ? 'border-indigo-600 bg-indigo-50'
                  : 'border-gray-200 bg-gray-50'
              }`}
            >
              <Text className={`text-sm ${
                category === cat ? 'text-indigo-600 font-semibold' : 'text-gray-600'
              }`}>
                {EXPENSE_CATEGORY_LABELS[cat]}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Child */}
        {children && children.length > 0 && (
          <>
            <Text className="text-sm font-medium text-gray-700 mb-2">Kind</Text>
            <View className="flex-row flex-wrap gap-2 mb-4">
              <TouchableOpacity
                onPress={() => setSelectedChild(null)}
                className={`px-3 py-2 rounded-xl border ${
                  !selectedChild
                    ? 'border-indigo-600 bg-indigo-50'
                    : 'border-gray-200 bg-gray-50'
                }`}
              >
                <Text className={`text-sm ${!selectedChild ? 'text-indigo-600 font-semibold' : 'text-gray-600'}`}>
                  Alle
                </Text>
              </TouchableOpacity>
              {children.map(child => (
                <TouchableOpacity
                  key={child.id}
                  onPress={() => setSelectedChild(child.id)}
                  className={`px-3 py-2 rounded-xl border ${
                    selectedChild === child.id
                      ? 'border-indigo-600 bg-indigo-50'
                      : 'border-gray-200 bg-gray-50'
                  }`}
                >
                  <Text className={`text-sm ${
                    selectedChild === child.id ? 'text-indigo-600 font-semibold' : 'text-gray-600'
                  }`}>
                    {child.name}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </>
        )}

        {/* Split Type */}
        <Text className="text-sm font-medium text-gray-700 mb-2">Aufteilung</Text>
        <View className="flex-row gap-3 mb-6">
          <TouchableOpacity
            onPress={() => setSplitType('50_50')}
            className={`flex-1 py-3 rounded-xl items-center border-2 ${
              splitType === '50_50' ? 'border-indigo-600 bg-indigo-50' : 'border-gray-200'
            }`}
          >
            <Text className={`font-semibold ${splitType === '50_50' ? 'text-indigo-600' : 'text-gray-500'}`}>
              50 / 50
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => setSplitType('custom')}
            className={`flex-1 py-3 rounded-xl items-center border-2 ${
              splitType === 'custom' ? 'border-indigo-600 bg-indigo-50' : 'border-gray-200'
            }`}
          >
            <Text className={`font-semibold ${splitType === 'custom' ? 'text-indigo-600' : 'text-gray-500'}`}>
              Individuell
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      <View className="px-4 pb-6">
        <Button
          title="Ausgabe speichern"
          onPress={handleSave}
          loading={addExpense.isPending}
        />
      </View>
    </SafeAreaView>
  );
}
