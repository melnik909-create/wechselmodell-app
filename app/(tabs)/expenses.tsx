import { useState, useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, Image, Modal, Pressable } from 'react-native';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useAuth } from '@/lib/auth';
import { useExpenses, calculateBalance } from '@/hooks/useExpenses';
import { useFamilyMembers } from '@/hooks/useFamily';
import { EXPENSE_CATEGORY_LABELS } from '@/types';
import { formatDayMonth } from '@/lib/date-utils';
import { COLORS } from '@/lib/constants';
import { format } from 'date-fns';
import { getSignedUrl } from '@/lib/image-upload';

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
  const { familyMember } = useAuth();
  const { data: members } = useFamilyMembers();
  const [selectedMonth] = useState(format(new Date(), 'yyyy-MM'));
  const { data: expenses, isLoading } = useExpenses(selectedMonth);
  const [receiptUrls, setReceiptUrls] = useState<Record<string, string>>({});
  const [selectedReceipt, setSelectedReceipt] = useState<string | null>(null);

  const parentAMember = members?.find((m) => m.role === 'parent_a');
  const balance =
    expenses && parentAMember ? calculateBalance(expenses, parentAMember.user_id) : null;

  // Load signed URLs for receipt images
  useEffect(() => {
    if (expenses) {
      const loadUrls = async () => {
        const urls: Record<string, string> = {};
        for (const expense of expenses) {
          if (expense.receipt_url) {
            try {
              const signedUrl = await getSignedUrl('receipts', expense.receipt_url);
              urls[expense.id] = signedUrl;
            } catch (error) {
              console.error('Failed to load receipt URL:', error);
            }
          }
        }
        setReceiptUrls(urls);
      };
      loadUrls();
    }
  }, [expenses]);

  const memberName = (userId: string) => {
    const member = members?.find((m) => m.user_id === userId);
    return member?.profile?.display_name ?? 'Unbekannt';
  };

  const isParentA = familyMember?.role === 'parent_a';
  const myOwes = balance ? (isParentA ? balance.parentAOwes : balance.parentBOwes) : 0;

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
        {/* Balance Card */}
        {balance && (
          <View style={styles.balanceCard}>
            <Text style={styles.balanceLabel}>Offener Saldo</Text>
            <Text
              style={[
                styles.balanceAmount,
                myOwes > 0 && styles.balanceAmountNegative,
                myOwes < 0 && styles.balanceAmountPositive,
              ]}
            >
              {myOwes > 0
                ? `Du schuldest ${Math.abs(myOwes).toFixed(2)} €`
                : myOwes < 0
                ? `Dir werden ${Math.abs(myOwes).toFixed(2)} € geschuldet`
                : 'Ausgeglichen ✓'}
            </Text>
            <View style={styles.balanceDetails}>
              <View style={styles.balanceItem}>
                <Text style={styles.balanceItemLabel}>
                  Bezahlt von {memberName(parentAMember!.user_id)}
                </Text>
                <Text style={styles.balanceItemValue}>
                  {balance.totalByParentA.toFixed(2)} €
                </Text>
              </View>
              <View style={styles.balanceItem}>
                <Text style={styles.balanceItemLabel}>
                  Bezahlt von{' '}
                  {memberName(members?.find((m) => m.role === 'parent_b')?.user_id ?? '')}
                </Text>
                <Text style={styles.balanceItemValue}>
                  {balance.totalByParentB.toFixed(2)} €
                </Text>
              </View>
            </View>
          </View>
        )}

        {/* Add Expense Button */}
        <TouchableOpacity
          style={styles.addButton}
          onPress={() => router.push('/modal/add-expense')}
          activeOpacity={0.7}
        >
          <MaterialCommunityIcons name="plus" size={20} color="#fff" />
          <Text style={styles.addButtonText}>Ausgabe hinzufuegen</Text>
        </TouchableOpacity>

        {/* Expense List */}
        <View style={styles.expenseList}>
          {expenses?.map((expense) => (
            <View key={expense.id} style={styles.expenseCard}>
              <View style={styles.expenseRow}>
                <View style={styles.categoryIcon}>
                  <MaterialCommunityIcons
                    name={(CATEGORY_ICONS[expense.category] ?? 'dots-horizontal') as any}
                    size={22}
                    color={COLORS.primary}
                  />
                </View>
                <View style={styles.expenseInfo}>
                  <Text style={styles.expenseDescription}>{expense.description}</Text>
                  <Text style={styles.expenseDetails}>
                    {EXPENSE_CATEGORY_LABELS[expense.category]} ·{' '}
                    {formatDayMonth(new Date(expense.date + 'T00:00:00'))}
                  </Text>
                </View>
                <View style={styles.expenseAmount}>
                  <Text style={styles.amountText}>{Number(expense.amount).toFixed(2)} €</Text>
                  <Text style={styles.paidByText}>{memberName(expense.paid_by)}</Text>
                </View>
              </View>
              {receiptUrls[expense.id] && (
                <TouchableOpacity
                  style={styles.receiptThumbnailContainer}
                  onPress={() => setSelectedReceipt(receiptUrls[expense.id])}
                  activeOpacity={0.7}
                >
                  <Image
                    source={{ uri: receiptUrls[expense.id] }}
                    style={styles.receiptThumbnail}
                    resizeMode="cover"
                  />
                  <View style={styles.receiptBadge}>
                    <MaterialCommunityIcons name="receipt" size={12} color="#fff" />
                    <Text style={styles.receiptBadgeText}>Beleg</Text>
                  </View>
                </TouchableOpacity>
              )}
            </View>
          ))}

          {(!expenses || expenses.length === 0) && !isLoading && (
            <View style={styles.emptyState}>
              <MaterialCommunityIcons name="currency-eur" size={48} color={COLORS.textMuted} />
              <Text style={styles.emptyText}>Noch keine Ausgaben</Text>
            </View>
          )}
        </View>
      </ScrollView>

      {/* Receipt Image Modal */}
      <Modal
        visible={!!selectedReceipt}
        transparent
        animationType="fade"
        onRequestClose={() => setSelectedReceipt(null)}
      >
        <Pressable style={styles.modalOverlay} onPress={() => setSelectedReceipt(null)}>
          <View style={styles.modalContent}>
            <TouchableOpacity
              style={styles.closeModalButton}
              onPress={() => setSelectedReceipt(null)}
            >
              <MaterialCommunityIcons name="close-circle" size={32} color="#fff" />
            </TouchableOpacity>
            {selectedReceipt && (
              <Image
                source={{ uri: selectedReceipt }}
                style={styles.fullReceiptImage}
                resizeMode="contain"
              />
            )}
          </View>
        </Pressable>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingVertical: 16,
  },
  balanceCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  balanceLabel: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
    marginBottom: 4,
  },
  balanceAmount: {
    fontSize: 24,
    fontWeight: 'bold',
    textAlign: 'center',
    color: '#111',
  },
  balanceAmountNegative: {
    color: '#EF4444',
  },
  balanceAmountPositive: {
    color: '#10B981',
  },
  balanceDetails: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
  },
  balanceItem: {
    flex: 1,
    alignItems: 'center',
  },
  balanceItemLabel: {
    fontSize: 12,
    color: '#9CA3AF',
  },
  balanceItemValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#111',
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#4F46E5',
    padding: 16,
    borderRadius: 8,
    marginBottom: 16,
    gap: 8,
  },
  addButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  expenseList: {
    marginTop: 0,
  },
  expenseCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  expenseRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  categoryIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#EEF2FF',
  },
  expenseInfo: {
    flex: 1,
  },
  expenseDescription: {
    fontSize: 14,
    fontWeight: '600',
    color: '#111',
  },
  expenseDetails: {
    fontSize: 12,
    color: '#6B7280',
  },
  expenseAmount: {
    alignItems: 'flex-end',
  },
  amountText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#111',
  },
  paidByText: {
    fontSize: 12,
    color: '#9CA3AF',
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 48,
  },
  emptyText: {
    fontSize: 16,
    color: '#9CA3AF',
    marginTop: 8,
  },
  receiptThumbnailContainer: {
    marginTop: 8,
    borderRadius: 8,
    overflow: 'hidden',
    position: 'relative',
  },
  receiptThumbnail: {
    width: '100%',
    height: 120,
    backgroundColor: '#F3F4F6',
  },
  receiptBadge: {
    position: 'absolute',
    top: 8,
    right: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  receiptBadgeText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '600',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.9)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeModalButton: {
    position: 'absolute',
    top: 40,
    right: 20,
    zIndex: 10,
  },
  fullReceiptImage: {
    width: '90%',
    height: '80%',
  },
});
