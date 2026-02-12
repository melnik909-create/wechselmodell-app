import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/auth';

export interface EntitlementStatus {
  // Raw data
  plan: 'trial' | 'lifetime' | 'cloud_plus';
  trialEndAt: string | null;
  cloudUntil: string | null;

  // Computed flags
  isTrialActive: boolean;
  isLifetime: boolean;
  isCloudPlusActive: boolean;
  canUseCore: boolean;
  canUpload: boolean;

  // Helper info
  trialDaysRemaining: number | null;
  cloudDaysRemaining: number | null;
}

/**
 * useEntitlements
 *
 * Fetches user entitlements from Supabase profiles table.
 * Derives computed flags for core access and upload permissions.
 *
 * Logic:
 * - canUseCore = isTrialActive || isLifetime || isCloudPlusActive
 * - canUpload = isCloudPlusActive
 */
export function useEntitlements() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['entitlements', user?.id],
    queryFn: async (): Promise<EntitlementStatus> => {
      if (!user) {
        throw new Error('User not authenticated');
      }

      const { data, error } = await supabase
        .from('profiles')
        .select('plan, trial_end_at, cloud_until')
        .eq('id', user.id)
        .single();

      if (error) throw error;

      const now = new Date();

      // Parse dates
      const trialEndAt = data.trial_end_at ? new Date(data.trial_end_at) : null;
      const cloudUntil = data.cloud_until ? new Date(data.cloud_until) : null;

      // Compute flags
      const isTrialActive = data.plan === 'trial' && trialEndAt !== null && now < trialEndAt;
      const isLifetime = data.plan === 'lifetime';
      const isCloudPlusActive =
        data.plan === 'cloud_plus' && cloudUntil !== null && now < cloudUntil;

      const canUseCore = isTrialActive || isLifetime || isCloudPlusActive;
      const canUpload = isCloudPlusActive;

      // Helper: days remaining
      const trialDaysRemaining = trialEndAt
        ? Math.max(0, Math.ceil((trialEndAt.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)))
        : null;
      const cloudDaysRemaining = cloudUntil
        ? Math.max(0, Math.ceil((cloudUntil.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)))
        : null;

      return {
        plan: data.plan,
        trialEndAt: data.trial_end_at,
        cloudUntil: data.cloud_until,
        isTrialActive,
        isLifetime,
        isCloudPlusActive,
        canUseCore,
        canUpload,
        trialDaysRemaining,
        cloudDaysRemaining,
      };
    },
    enabled: !!user,
    staleTime: 1000 * 60 * 5, // 5 minutes
    refetchOnWindowFocus: true,
  });
}

/**
 * useSettlementCycle
 *
 * Fetches current family settlement cycle info.
 * Returns whether settlement is due (mandatory).
 */
export interface SettlementCycleStatus {
  cycleStartedAt: string;
  nextSettlementDueAt: string;
  isSettlementDue: boolean;
  daysUntilDue: number;
}

export function useSettlementCycle() {
  const { family } = useAuth();

  return useQuery({
    queryKey: ['settlement-cycle', family?.id],
    queryFn: async (): Promise<SettlementCycleStatus> => {
      if (!family) {
        throw new Error('No family');
      }

      const { data, error } = await supabase
        .from('families')
        .select('cycle_started_at, next_settlement_due_at')
        .eq('id', family.id)
        .single();

      if (error) throw error;

      const now = new Date();
      const nextSettlementDueAt = new Date(data.next_settlement_due_at);

      const isSettlementDue = now >= nextSettlementDueAt;
      const daysUntilDue = Math.ceil(
        (nextSettlementDueAt.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
      );

      return {
        cycleStartedAt: data.cycle_started_at,
        nextSettlementDueAt: data.next_settlement_due_at,
        isSettlementDue,
        daysUntilDue,
      };
    },
    enabled: !!family,
    staleTime: 1000 * 60 * 5, // 5 minutes
    refetchOnWindowFocus: true,
  });
}
