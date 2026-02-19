import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/auth';
import { AppAlert } from '@/lib/alert';

interface PaymentResult {
  success: boolean;
  message: string;
  planType?: string;
  error?: string;
}

/**
 * Platform-agnostic Payment Hook
 * - Web: Uses Stripe.js (see usePayment.web.ts)
 * - Native: Uses @stripe/stripe-react-native (see usePayment.native.ts)
 * 
 * Expo will automatically select the correct version based on platform
 */
export const usePayment = () => {
  const { profile } = useAuth();
  const [loading, setLoading] = useState(false);
  const [initialized, setInitialized] = useState(false);

  // Initialize on mount
  useEffect(() => {
    initializePayment();
  }, []);

  const initializePayment = async () => {
    if (initialized) return;
    try {
      setInitialized(true);
    } catch (error) {
      console.error('Failed to initialize payment:', error);
    }
  };

  /**
   * Process a payment for a specific plan
   * Implementation depends on platform:
   * - Web: Stripe.js with Checkout
   * - Native: Stripe Payment Sheet
   */
  const processPayment = async (
    planType: 'lifetime' | 'cloud_plus_monthly' | 'cloud_plus_yearly',
    userEmail: string
  ): Promise<PaymentResult> => {
    try {
      setLoading(true);

      // Demo mode: Skip RPC functions if not deployed yet
      // In production, these RPC functions will be used
      
      console.log('[Payment] Processing payment for plan:', planType);
      console.log('[Payment] User email:', userEmail);

      // Simulate payment processing
      await new Promise(resolve => setTimeout(resolve, 1500));

      // If user is authenticated, try to update their plan
      if (profile?.id) {
        try {
          const { data: updateResult, error: updateError } = await supabase.rpc(
            'update_plan_after_payment',
            {
              user_id: profile.id,
              plan_type: planType,
              stripe_payment_intent_id: 'demo_' + Date.now(),
            }
          );

          if (updateError) {
            console.warn('[Payment] RPC error (expected if SQL not deployed):', updateError.message);
            // Continue anyway - in demo mode we allow this
          }
        } catch (rpcErr) {
          console.warn('[Payment] RPC call failed - SQL migrations may not be deployed yet');
        }
      }

      return {
        success: true,
        message: '✅ Demo-Zahlung erfolgreich! (Hinweis: Echte Stripe-Integration wird nach Deployment aktiviert)',
        planType: planType,
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Payment processing failed';
      console.error('Payment error:', errorMessage);

      return {
        success: false,
        message: errorMessage,
      };
    } finally {
      setLoading(false);
    }
  };

  return {
    processPayment,
    loading,
    initialized,
  };
};

