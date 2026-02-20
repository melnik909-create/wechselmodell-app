import { useState, useCallback } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, Image, Modal, Pressable } from 'react-native';
import { AppAlert } from '@/lib/alert';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useFocusEffect } from '@react-navigation/native';
import { useAuth } from '@/lib/auth';
import { useExpenses, calculateBalance, useSettleExpenses } from '@/hooks/useExpenses';
import { useFamilyMembers } from '@/hooks/useFamily';
import { useSettlementCycle } from '@/hooks/useEntitlements';
import { EXPENSE_CATEGORY_LABELS, type Expense } from '@/types';
import { formatDayMonth } from '@/lib/date-utils';
import { COLORS } from '@/lib/constants';
import { format } from 'date-fns';
import { getReceiptImageUrl } from '@/lib/image-upload';
import { useResponsive } from '@/hooks/useResponsive';
import { useOnboardingHint } from '@/hooks/useOnboardingHint';

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

// Hook for fetching signed receipt URL with caching
function useReceiptSignedUrl(familyId: string | undefined, expenseId: string, path: string | null) {
  return useQuery({
    queryKey: ['receiptSignedUrl', familyId, expenseId, path],
    queryFn: async () => {
      if (!path || !familyId) return null;

      // Legacy support: if path is old URL format, use directly
      if (path.startsWith('http')) {
        console.warn('Legacy receipt URL detected:', path);
        return path;
      }

      // Fetch signed download URL via Edge Function
      try {
        const signedUrl = await getReceiptImageUrl(familyId, path);
        return signedUrl;
      } catch (error: any) {
        if (error.message?.includes('Cloud Plus') ||
            error.message?.includes('402') ||
            error.message?.includes('Payment Required')) {
          console.log('Cloud Plus required to view receipt');
          return null;
        }
        throw error;
      }
    },
    enabled: !!path && !!familyId,
    staleTime: 9 * 60 * 1000, // 9 minutes (before 10-minute expiry)
    gcTime: 10 * 60 * 1000, // 10 minutes
  });
}

// Expense card component with receipt support
function ExpenseCard({
  expense,
  memberName,
  familyId,
  onReceiptPress,
}: {
  expense: Expense;
  memberName: (userId: string) => string;
  familyId: string | undefined;
  onReceiptPress: (url: string) => void;
}) {
  const { data: receiptUrl } = useReceiptSignedUrl(familyId, expense.id, expense.receipt_url);

  return (
    <View style={styles.expenseCard}>
      <View style={styles.expenseRow}>
        <View style={styles.categoryIcon}>
          <MaterialCommunityIcons
            name={(CATEGORY_ICONS[expense.category] ?? 'dots-horizontal') as any}
            size={22}
            color={COLORS.primary}
          />
        </View>
        <View style={styles.expenseInfo}>
          <View style={styles.descriptionRow}>
            <Text style={styles.expenseDescription}>{expense.description}</Text>
            {expense.split_type === '50_50' && (
              <View style={styles.settledBadge}>
                <MaterialCommunityIcons name="check-circle" size={10} color="#10B981" />
                <Text style={styles.settledBadgeText}>50:50</Text>
              </View>
            )}
          </View>
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
      {receiptUrl && (
        <TouchableOpacity
          style={styles.receiptThumbnailContainer}
          onPress={() => onReceiptPress(receiptUrl)}
          activeOpacity={0.7}
        >
          <Image
            source={{ uri: receiptUrl }}
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
  );
}

export default function ExpensesScreen() {
  const { familyMember, family } = useAuth();
  const { contentMaxWidth } = useResponsive();
  const queryClient = useQueryClient();
  const showHint = useOnboardingHint();
  const { data: members } = useFamilyMembers();
  const [selectedMonth] = useState(format(new Date(), 'yyyy-MM'));
  const { data: expenses, isLoading } = useExpenses(selectedMonth);
  const [selectedReceipt, setSelectedReceipt] = useState<string | null>(null);
  const settleExpensesMutation = useSettleExpenses();
  const { data: settlementCycle } = useSettlementCycle();

  useFocusEffect(
    useCallback(() => {
      queryClient.invalidateQueries({ queryKey: ['expenses'] });
    }, [queryClient])
  );

  const parentAMember = members?.find((m) => m.role === 'parent_a');
  const balance =
    expenses && parentAMember ? calculateBalance(expenses, parentAMember.user_id) : null;

  const memberName = (userId: string) => {
    const member = members?.find((m) => m.user_id === userId);
    return member?.profile?.display_name ?? 'Unbekannt';
  };

  const handleSettleExpenses = () => {
    AppAlert.alert(
      'Ihr seid Quitt!',
      'Alle bisherigen Kauf-Notizen werden gelöscht. Käufe werden bei beiden Elternteilen neu gezählt. Der andere Elternteil wird benachrichtigt.\n\nMöchtest du fortfahren?',
      [
        {
          text: 'Abbrechen',
          style: 'cancel',
        },
        {
          text: 'Quitt',
          style: 'destructive',
          onPress: async () => {
            try {
              await settleExpensesMutation.mutateAsync();
              AppAlert.alert(
                'Erfolgreich!',
                'Alle Ausgaben wurden gelöscht. Ihr seid Quitt!'
              );
            } catch (error: any) {
              AppAlert.alert(
                'Fehler',
                error.message || 'Die Ausgaben konnten nicht gelöscht werden.'
              );
            }
          },
        },
      ]
    );
  };

  const isParentA = familyMember?.role === 'parent_a';
  const myOwes = balance ? (isParentA ? balance.parentAOwes : balance.parentBOwes) : 0;

  // Check if mandatory settlement is due (2 months)
  const isSettlementDue = settlementCycle?.isSettlementDue ?? false;

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
        <View style={{ maxWidth: contentMaxWidth, alignSelf: 'center', width: '100%' }}>
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

        {/* Mandatory Settlement Banner - Show when 2 months passed */}
        {isSettlementDue && (
          <View style={styles.mandatorySettlementCard}>
            <View style={styles.mandatorySettlementHeader}>
              <MaterialCommunityIcons name="alert-circle" size={28} color="#EF4444" />
              <Text style={styles.mandatorySettlementTitle}>Pflicht-Abrechnung fällig!</Text>
            </View>
            <Text style={styles.mandatorySettlementText}>
              2 Monate sind vorbei. Bitte jetzt abrechnen, um weiter Ausgaben zu erfassen.
            </Text>
            <TouchableOpacity
              style={styles.mandatorySettlementButton}
              onPress={handleSettleExpenses}
              activeOpacity={0.7}
            >
              <Text style={styles.mandatorySettlementButtonText}>Jetzt abrechnen (Quitt)</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.mandatorySettlementHelpButton}
              onPress={() =>
                AppAlert.alert(
                  'Warum?',
                  'Um die Datenmenge gering zu halten und Speicherkosten zu minimieren, wird alle 2 Monate eine Abrechnung fällig. Belege werden dann gelöscht und ihr könnt neu starten.'
                )
              }
              activeOpacity={0.7}
            >
              <MaterialCommunityIcons name="help-circle" size={16} color="#6B7280" />
              <Text style={styles.mandatorySettlementHelpText}>Warum?</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Quitt Button - Only show if there are expenses */}
        {expenses && expenses.length > 0 && (
          <TouchableOpacity
            style={styles.quittButton}
            onPress={handleSettleExpenses}
            activeOpacity={0.7}
          >
            <MaterialCommunityIcons name="handshake" size={20} color="#10B981" />
            <Text style={styles.quittButtonText}>Quitt - Alle Ausgaben löschen</Text>
          </TouchableOpacity>
        )}

        {/* Add Expense Button - Disabled wenn Settlement fällig */}
        <TouchableOpacity
          style={[styles.addButton, isSettlementDue && styles.addButtonDisabled]}
          onPress={() => {
            if (isSettlementDue) {
              AppAlert.alert(
                'Abrechnung fällig',
                'Bitte erst abrechnen, bevor neue Ausgaben erfasst werden können.'
              );
              return;
            }
            router.push('/modal/add-expense');
          }}
          activeOpacity={0.7}
          disabled={isSettlementDue}
        >
          <MaterialCommunityIcons name="plus" size={20} color={isSettlementDue ? '#9CA3AF' : '#fff'} />
          <Text style={[styles.addButtonText, isSettlementDue && styles.addButtonTextDisabled]}>
            Ausgabe hinzufuegen
          </Text>
        </TouchableOpacity>

        {/* Expense List */}
        <View style={styles.expenseList}>
          {expenses?.map((expense) => (
            <ExpenseCard
              key={expense.id}
              expense={expense}
              memberName={memberName}
              familyId={family?.id}
              onReceiptPress={setSelectedReceipt}
            />
          ))}

          {(!expenses || expenses.length === 0) && !isLoading && (
            <View style={styles.emptyState}>
              <MaterialCommunityIcons name="currency-eur" size={48} color={COLORS.textMuted} />
              <Text style={styles.emptyText}>Noch keine Ausgaben</Text>
            </View>
          )}
        </View>

        {showHint && (
          <View style={styles.hintBox}>
            <MaterialCommunityIcons name="lightbulb-outline" size={20} color="#92400E" />
            <View style={styles.hintContent}>
              <Text style={styles.hintTitle}>So funktionieren Ausgaben</Text>
              <Text style={styles.hintText}>
                Erfasse gemeinsame Kosten für die Kinder – Kleidung, Arztbesuche, Sportverein, Nachhilfe, etc.{'\n\n'}
                ⚖️ Verrechnung: Ausgaben werden automatisch gegeneinander verrechnet. Wer mehr bezahlt hat, dem wird der Differenzbetrag geschuldet.{'\n\n'}
                🏷️ 50:50-Tag: Markierst du eine Ausgabe mit „50:50", gilt sie als bereits fair geteilt. Sie dient dann nur der Übersicht und wird nicht in den Saldo eingerechnet.{'\n\n'}
                Beispiel: Mama kauft Winterschuhe (80 €), Papa zahlt Sportverein (60 €) → Papa schuldet Mama 10 €.{'\n\n'}
                📊 Alle 2 Monate wird eine Abrechnung fällig – ihr geht „Quitt" und startet frisch.
              </Text>
            </View>
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
  mandatorySettlementCard: {
    backgroundColor: '#FEF2F2',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderWidth: 2,
    borderColor: '#EF4444',
  },
  mandatorySettlementHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 8,
  },
  mandatorySettlementTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#991B1B',
  },
  mandatorySettlementText: {
    fontSize: 14,
    color: '#7F1D1D',
    lineHeight: 20,
    marginBottom: 16,
  },
  mandatorySettlementButton: {
    backgroundColor: '#EF4444',
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 8,
  },
  mandatorySettlementButtonText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '700',
  },
  mandatorySettlementHelpButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 8,
  },
  mandatorySettlementHelpText: {
    fontSize: 13,
    color: '#6B7280',
    textDecorationLine: 'underline',
  },
  quittButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fff',
    padding: 14,
    borderRadius: 8,
    marginBottom: 12,
    gap: 8,
    borderWidth: 1.5,
    borderColor: '#10B981',
  },
  quittButtonText: {
    color: '#10B981',
    fontSize: 15,
    fontWeight: '600',
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
  addButtonDisabled: {
    backgroundColor: '#E5E7EB',
    opacity: 0.6,
  },
  addButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  addButtonTextDisabled: {
    color: '#9CA3AF',
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
  descriptionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flexWrap: 'wrap',
  },
  expenseDescription: {
    fontSize: 14,
    fontWeight: '600',
    color: '#111',
  },
  settledBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: '#D1FAE5',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: '#6EE7B7',
  },
  settledBadgeText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#10B981',
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
  hintBox: {
    flexDirection: 'row',
    backgroundColor: '#FFFBEB',
    borderRadius: 12,
    padding: 12,
    marginTop: 16,
    borderWidth: 1,
    borderColor: '#FDE68A',
    gap: 10,
  },
  hintContent: {
    flex: 1,
  },
  hintTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#92400E',
    marginBottom: 4,
  },
  hintText: {
    fontSize: 12,
    color: '#78350F',
    lineHeight: 18,
  },
});
