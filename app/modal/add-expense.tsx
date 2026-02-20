import { useState, useEffect } from 'react';
import { View, Text, TextInput, ScrollView, TouchableOpacity, StyleSheet, KeyboardAvoidingView, Platform } from 'react-native';
import { AppAlert } from '@/lib/alert';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useAuth } from '@/lib/auth';
import { useAddExpense } from '@/hooks/useExpenses';
import { useChildren } from '@/hooks/useFamily';
import { useEntitlements } from '@/hooks/useEntitlements';
import { EXPENSE_CATEGORY_LABELS, type ExpenseCategory } from '@/types';
import ImagePickerButton from '@/components/ImagePickerButton';
import { uploadImage } from '@/lib/image-upload';
import type { ImagePickerAsset } from 'expo-image-picker';
import { useResponsive } from '@/hooks/useResponsive';

const CATEGORIES: ExpenseCategory[] = [
  'clothing', 'medical', 'school', 'daycare', 'sports',
  'music', 'food', 'transport', 'vacation', 'other',
];

export default function AddExpenseModal() {
  const { contentMaxWidth } = useResponsive();
  const { user, family } = useAuth();
  const { data: children } = useChildren();
  const { data: entitlements } = useEntitlements();
  const addExpense = useAddExpense();

  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState<ExpenseCategory>('other');
  const [selectedChild, setSelectedChild] = useState<string | null>(null);
  const [splitType, setSplitType] = useState<'50_50' | 'custom'>('50_50');
  const [receiptUri, setReceiptUri] = useState<string | null>(null);
  const [receiptAsset, setReceiptAsset] = useState<ImagePickerAsset | null>(null);
  const [isUploading, setIsUploading] = useState(false);

  // Bei nur einem Kind automatisch zuordnen
  useEffect(() => {
    if (children?.length === 1) {
      setSelectedChild(children[0].id);
    }
  }, [children]);

  async function handleSave() {
    const numAmount = parseFloat(amount.replace(',', '.'));
    if (isNaN(numAmount) || numAmount <= 0) {
      AppAlert.alert('Fehler', 'Bitte einen gültigen Betrag eingeben.');
      return;
    }
    if (!description.trim()) {
      AppAlert.alert('Fehler', 'Bitte eine Beschreibung eingeben.');
      return;
    }

    try {
      setIsUploading(true);

      // Upload receipt image if present
      let receiptUrl: string | null = null;
      if (receiptUri && family) {
        // Check Cloud Plus entitlement before upload
        if (!entitlements?.canUpload) {
          router.push('/modal/cloud-plus');
          setIsUploading(false);
          return;
        }

        try {
          // Upload via Edge Function (returns PATH, not URL)
          receiptUrl = await uploadImage(receiptUri, 'receipt', family.id);
        } catch (uploadError: any) {
          // Handle Cloud Plus requirement error
          if (uploadError.message?.includes('Cloud Plus') ||
              uploadError.message?.includes('402') ||
              uploadError.message?.includes('Payment Required')) {
            router.push('/modal/cloud-plus');
            setIsUploading(false);
            return;
          }
          throw uploadError;
        }
      }

      await addExpense.mutateAsync({
        amount: numAmount,
        description: description.trim(),
        category,
        child_id: selectedChild,
        paid_by: user!.id,
        split_type: splitType,
        split_percentage: 50,
        receipt_url: receiptUrl,
        date: new Date().toISOString().split('T')[0],
      });
      router.replace('/(tabs)/expenses');
    } catch (error: any) {
      AppAlert.alert('Fehler', error.message || 'Ausgabe konnte nicht gespeichert werden.');
    } finally {
      setIsUploading(false);
    }
  }

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.closeButton}>
          <MaterialCommunityIcons name="close" size={24} color="#111" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Neue Ausgabe</Text>
        <View style={{ width: 40 }} />
      </View>

      <KeyboardAvoidingView
        style={styles.keyboardView}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
        >
          <View style={{ maxWidth: contentMaxWidth, alignSelf: 'center', width: '100%' }}>
          {/* Receipt Photo */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Beleg (optional)</Text>
            <ImagePickerButton
              imageUri={receiptUri}
              onImageSelected={(uri, asset) => {
                setReceiptUri(uri);
                setReceiptAsset(asset);
              }}
              onImageRemoved={() => {
                setReceiptUri(null);
                setReceiptAsset(null);
              }}
              label="Beleg fotografieren"
            />
          </View>

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

          {/* Child – bei nur einem Kind automatisch zugeordnet, keine Auswahl nötig */}
          {children && children.length > 1 && (
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
          {children?.length === 1 && (
            <View style={styles.autoChildHint}>
              <Text style={styles.autoChildHintText}>Zuordnung: {children[0].name}</Text>
            </View>
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

          {/* Split Type Info */}
          <View style={styles.splitInfoContainer}>
            <MaterialCommunityIcons
              name={splitType === '50_50' ? 'check-circle' : 'alert-circle'}
              size={20}
              color={splitType === '50_50' ? '#10B981' : '#F59E0B'}
            />
            <Text style={[
              styles.splitInfoText,
              { color: splitType === '50_50' ? '#10B981' : '#F59E0B' }
            ]}>
              {splitType === '50_50'
                ? 'Bereits 50:50 Abgerechnet.'
                : 'Muss noch verrechnet werden.'}
            </Text>
          </View>
          </View>
        </ScrollView>

        <View style={styles.buttonContainer}>
          <TouchableOpacity
            style={[styles.button, (addExpense.isPending || isUploading) && styles.buttonDisabled]}
            onPress={handleSave}
            disabled={addExpense.isPending || isUploading}
          >
            <Text style={styles.buttonText}>
              {isUploading ? 'Beleg wird hochgeladen...' : addExpense.isPending ? 'Speichern...' : 'Ausgabe speichern'}
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
    backgroundColor: '#F9FAFB',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  closeButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#111',
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
  autoChildHint: {
    marginBottom: 16,
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: '#EEF2FF',
    borderRadius: 8,
  },
  autoChildHintText: {
    fontSize: 14,
    color: '#4F46E5',
    fontWeight: '500',
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
  splitInfoContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 12,
    backgroundColor: '#F9FAFB',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  splitInfoText: {
    fontSize: 14,
    fontWeight: '600',
    flex: 1,
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
