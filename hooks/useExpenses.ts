import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/auth';
import { notifyNewExpense, notifySettlement } from '@/lib/notifications';
import { endOfMonth, format } from 'date-fns';
import type { Expense } from '@/types';

export function useExpenses(month?: string) {
  const { family } = useAuth();
  return useQuery({
    queryKey: ['expenses', family?.id, month],
    queryFn: async (): Promise<Expense[]> => {
      if (!family) return [];
      let query = supabase
        .from('expenses')
        .select('*')
        .eq('family_id', family.id);

      if (month) {
        // Use proper last day of month instead of hardcoded 31
        const lastDay = format(endOfMonth(new Date(`${month}-01`)), 'yyyy-MM-dd');
        query = query
          .gte('date', `${month}-01`)
          .lte('date', lastDay);
      }

      const { data, error } = await query.order('date', { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
    enabled: !!family,
  });
}

export function useAddExpense() {
  const { family, user, profile } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (expense: Omit<Expense, 'id' | 'family_id' | 'created_at' | 'status'>) => {
      if (!family) throw new Error('Keine Familie');
      const { data, error } = await supabase
        .from('expenses')
        .insert({
          ...expense,
          family_id: family.id,
          status: 'pending',
        })
        .select()
        .single();
      if (error) throw error;

      // Send notification to other parent (skip if memo)
      if (!expense.is_memo) {
        const { data: members } = await supabase
          .from('family_members')
          .select('user_id')
          .eq('family_id', family.id)
          .neq('user_id', user!.id);

        const otherParent = members?.[0];
        if (otherParent && profile) {
          notifyNewExpense(
            otherParent.user_id,
            expense.amount,
            expense.description,
            profile.display_name
          ).catch((error) => console.error('Failed to send notification:', error));
        }
      }

      return data;
    },
    onSuccess: () => {
      // Invalidate all expense queries for this family (including different month filters)
      queryClient.invalidateQueries({
        queryKey: ['expenses'],
        refetchType: 'active'
      });
    },
  });
}

export interface BalanceSummary {
  totalByParentA: number;
  totalByParentB: number;
  parentAOwes: number;
  parentBOwes: number;
}

export function calculateBalance(
  expenses: Expense[],
  parentAId: string,
): BalanceSummary {
  // Filter out 50/50 memo expenses (already settled, not counted in balance)
  const calculableExpenses = expenses.filter(
    (e) => !(e.split_type === '50_50' && e.is_memo === true)
  );

  let totalByParentA = 0;
  let totalByParentB = 0;
  let parentAShare = 0;
  let parentBShare = 0;

  for (const expense of calculableExpenses) {
    const splitPct = expense.split_type === '50_50' ? 50 : expense.split_percentage;
    const parentAShareAmount = (expense.amount * splitPct) / 100;
    const parentBShareAmount = expense.amount - parentAShareAmount;

    parentAShare += parentAShareAmount;
    parentBShare += parentBShareAmount;

    if (expense.paid_by === parentAId) {
      totalByParentA += expense.amount;
    } else {
      totalByParentB += expense.amount;
    }
  }

  // Positive = this parent owes, negative = is owed
  const parentAOwes = parentAShare - totalByParentA;
  const parentBOwes = parentBShare - totalByParentB;

  return { totalByParentA, totalByParentB, parentAOwes, parentBOwes };
}

/**
 * Settle all expenses (Quitt)
 * Calls Edge Function to delete expenses + receipts server-side
 */
export function useSettleExpenses() {
  const { family, profile } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      if (!family) throw new Error('Keine Familie');

      // Call Edge Function to handle settlement server-side
      // This includes: deleting expenses, deleting storage files, resetting cycle
      const { data, error } = await supabase.functions.invoke('settle_family', {
        body: {
          family_id: family.id,
        },
      });

      if (error) {
        console.error('Settlement Edge Function error:', error);
        throw new Error(error.message || 'Settlement fehlgeschlagen');
      }

      if (!data || !data.success) {
        throw new Error('Settlement fehlgeschlagen');
      }

      // Send notification to other parent (if provided by Edge Function)
      if (data.otherParentId && profile) {
        notifySettlement(data.otherParentId, profile.display_name).catch((error) =>
          console.error('Failed to send settlement notification:', error)
        );
      }

      return {
        deletedCount: data.deletedCount ?? 0,
        deletedFiles: data.deletedFiles ?? 0,
        failedFiles: data.failedFiles ?? 0,
      };
    },
    onSuccess: () => {
      // Invalidate all expense queries
      queryClient.invalidateQueries({ queryKey: ['expenses'] });

      // Invalidate receipt signed URLs (receipts were deleted)
      queryClient.invalidateQueries({ queryKey: ['receiptSignedUrl'] });

      // Invalidate settlement cycle (next_settlement_due_at was reset)
      queryClient.invalidateQueries({ queryKey: ['settlementCycle'] });

      // Clear all cached queries to ensure UI refresh
      queryClient.refetchQueries({ queryKey: ['expenses'], type: 'active' });
    },
  });
}
