import { useState } from 'react';
import { View, Text, TextInput, ScrollView, TouchableOpacity, Alert, StyleSheet, KeyboardAvoidingView, Platform } from 'react-native';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '@/lib/auth';
import { useAddExpense } from '@/hooks/useExpenses';
import { useChildren } from '@/hooks/useFamily';
import { EXPENSE_CATEGORY_LABELS, type ExpenseCategory } from '@/types';

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
      Alert.alert('Fehler', 'Bitte einen gültigen Betrag eingeben.');
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
    <SafeAreaView style={styles.safeArea} edges={['bottom']}>
      <KeyboardAvoidingView
        style={styles.keyboardView}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
        >
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
          <Text style={styles.label}>Kategorie</Text>
          <View style={styles.chipContainer}>
            {CATEGORIES.map(cat => (
              <TouchableOpacity
                key={cat}
                onPress={() => setCategory(cat)}
                style={[
                  styles.chip,
                  category === cat ? styles.chipSelected : styles.chipUnselected
                ]}
              >
                <Text style={[
                  styles.chipText,
                  category === cat ? styles.chipTextSelected : styles.chipTextUnselected
                ]}>
                  {EXPENSE_CATEGORY_LABELS[cat]}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Child */}
          {children && children.length > 0 && (
            <>
              <Text style={styles.label}>Kind</Text>
              <View style={styles.chipContainer}>
                <TouchableOpacity
                  onPress={() => setSelectedChild(null)}
                  style={[
                    styles.chip,
                    !selectedChild ? styles.chipSelected : styles.chipUnselected
                  ]}
                >
                  <Text style={[
                    styles.chipText,
                    !selectedChild ? styles.chipTextSelected : styles.chipTextUnselected
                  ]}>
                    Alle
                  </Text>
                </TouchableOpacity>
                {children.map(child => (
                  <TouchableOpacity
                    key={child.id}
                    onPress={() => setSelectedChild(child.id)}
                    style={[
                      styles.chip,
                      selectedChild === child.id ? styles.chipSelected : styles.chipUnselected
                    ]}
                  >
                    <Text style={[
                      styles.chipText,
                      selectedChild === child.id ? styles.chipTextSelected : styles.chipTextUnselected
                    ]}>
                      {child.name}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </>
          )}

          {/* Split Type */}
          <Text style={styles.label}>Aufteilung</Text>
          <View style={styles.splitContainer}>
            <TouchableOpacity
              onPress={() => setSplitType('50_50')}
              style={[
                styles.splitButton,
                splitType === '50_50' ? styles.splitButtonSelected : styles.splitButtonUnselected
              ]}
            >
              <Text style={[
                styles.splitButtonText,
                splitType === '50_50' ? styles.splitButtonTextSelected : styles.splitButtonTextUnselected
              ]}>
                50 / 50
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => setSplitType('custom')}
              style={[
                styles.splitButton,
                splitType === 'custom' ? styles.splitButtonSelected : styles.splitButtonUnselected
              ]}
            >
              <Text style={[
                styles.splitButtonText,
                splitType === 'custom' ? styles.splitButtonTextSelected : styles.splitButtonTextUnselected
              ]}>
                Individuell
              </Text>
            </TouchableOpacity>
          </View>
        </ScrollView>

        <View style={styles.buttonContainer}>
          <TouchableOpacity
            style={[styles.button, addExpense.isPending && styles.buttonDisabled]}
            onPress={handleSave}
            disabled={addExpense.isPending}
          >
            <Text style={styles.buttonText}>
              {addExpense.isPending ? 'Speichern...' : 'Ausgabe speichern'}
            </Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function Input({
  label,
  placeholder,
  value,
  onChangeText,
  keyboardType = 'default',
}: {
  label: string;
  placeholder: string;
  value: string;
  onChangeText: (text: string) => void;
  keyboardType?: 'default' | 'numeric' | 'phone-pad';
}) {
  return (
    <View style={styles.inputGroup}>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        style={styles.input}
        placeholder={placeholder}
        value={value}
        onChangeText={onChangeText}
        keyboardType={keyboardType}
        placeholderTextColor="#9CA3AF"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#fff',
  },
  keyboardView: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingVertical: 16,
    paddingBottom: 32,
  },
  inputGroup: {
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: '500',
    color: '#374151',
    marginBottom: 8,
  },
  input: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    color: '#111',
  },
  chipContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 16,
  },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    borderWidth: 1,
  },
  chipSelected: {
    borderColor: '#4F46E5',
    backgroundColor: '#EEF2FF',
  },
  chipUnselected: {
    borderColor: '#E5E7EB',
    backgroundColor: '#F9FAFB',
  },
  chipText: {
    fontSize: 14,
  },
  chipTextSelected: {
    color: '#4F46E5',
    fontWeight: '600',
  },
  chipTextUnselected: {
    color: '#6B7280',
  },
  splitContainer: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 24,
  },
  splitButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 2,
  },
  splitButtonSelected: {
    borderColor: '#4F46E5',
    backgroundColor: '#EEF2FF',
  },
  splitButtonUnselected: {
    borderColor: '#E5E7EB',
    backgroundColor: '#fff',
  },
  splitButtonText: {
    fontWeight: '600',
  },
  splitButtonTextSelected: {
    color: '#4F46E5',
  },
  splitButtonTextUnselected: {
    color: '#6B7280',
  },
  buttonContainer: {
    padding: 16,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  button: {
    backgroundColor: '#4F46E5',
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});
