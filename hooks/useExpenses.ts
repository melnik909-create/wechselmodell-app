import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/auth';
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
        query = query
          .gte('date', `${month}-01`)
          .lte('date', `${month}-31`);
      }

      const { data, error } = await query.order('date', { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
    enabled: !!family,
  });
}

export function useAddExpense() {
  const { family, user } = useAuth();
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
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['expenses', family?.id] });
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
  let totalByParentA = 0;
  let totalByParentB = 0;
  let parentAShare = 0;
  let parentBShare = 0;

  for (const expense of expenses) {
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
