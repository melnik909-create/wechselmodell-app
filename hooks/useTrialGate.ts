import { useEffect } from 'react';
import { router } from 'expo-router';
import { useEntitlements } from './useEntitlements';

/**
 * useTrialGate
 * 
 * Automatically redirects user trying to access Core features if trial is expired.
 * If user doesn't have access (canUseCore = false), opens paywall modal.
 */
export function useTrialGate() {
  const { data: entitlements, isLoading } = useEntitlements();

  useEffect(() => {
    // Only check after data is loaded
    if (isLoading || !entitlements) return;

    // If user can't use core, show paywall
    if (!entitlements.canUseCore) {
      // Open paywall modal (it will stay open until user upgrades)
      router.push('/modal/paywall');
    }
  }, [entitlements?.canUseCore, isLoading]);

  return {
    isBlocked: !entitlements?.canUseCore && !isLoading,
    entitlements,
    isLoading,
  };
}
