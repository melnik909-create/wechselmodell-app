import { useEffect, useState } from 'react';
import { useStripe } from '@stripe/stripe-react-native';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/auth';
import { AppAlert } from '@/lib/alert';

interface PaymentResult {
  success: boolean;
  message: string;
  planType?: string;
  error?: string;
}

export const usePayment = () => {
  const { initPaymentSheet, presentPaymentSheet } = useStripe();
  const { profile } = useAuth();
  const [loading, setLoading] = useState(false);
  const [initialized, setInitialized] = useState(false);

  // Initialize payment sheet on mount
  useEffect(() => {
    initializePaymentSheet();
  }, []);

  const initializePaymentSheet = async () => {
    if (initialized || !profile?.id) return;

    try {
      setLoading(true);
      
      // Initialize Stripe
      const { error: initError } = await initPaymentSheet({
        merchantDisplayName: 'Wechselmodell',
        billingDetailsCollectionConfiguration: {
          address: 'automatic',
          phone: 'automatic',
          email: 'always',
        },
      });

      if (initError) {
        console.error('Payment sheet init error:', initError);
        return;
      }

      setInitialized(true);
    } catch (error) {
      console.error('Failed to initialize payment:', error);
    } finally {
      setLoading(false);
    }
  };

  /**
   * Process a payment for a specific plan
   * @param planType - 'lifetime' | 'cloud_plus_monthly' | 'cloud_plus_yearly'
   * @param userEmail - User's email for receipt
   * @returns PaymentResult
   */
  const processPayment = async (
    planType: 'lifetime' | 'cloud_plus_monthly' | 'cloud_plus_yearly',
    userEmail: string
  ): Promise<PaymentResult> => {
    if (!initialized || !profile?.id) {
      return {
        success: false,
        message: 'Payment system not initialized',
        error: 'System error',
      };
    }

    try {
      setLoading(true);

      // Step 1: Create payment intent via Supabase RPC
      const { data: paymentData, error: rpcError } = await supabase.rpc(
        'create_payment_intent',
        {
          plan_type: planType,
          user_email: userEmail,
        }
      );

      if (rpcError) {
        throw new Error(`Payment setup failed: ${rpcError.message}`);
      }

      // Step 2: Call Stripe payment sheet
      // Note: In production, this would require a backend endpoint to exchange
      // the client secret from your Stripe account
      const { error: paymentError } = await presentPaymentSheet();

      if (paymentError?.code === 'Canceled') {
        return {
          success: false,
          message: 'Payment cancelled',
          error: paymentError.message,
        };
      }

      if (paymentError) {
        throw new Error(`Payment failed: ${paymentError.message}`);
      }

      // Step 3: Update plan in database after successful payment
      const { data: updateResult, error: updateError } = await supabase.rpc(
        'update_plan_after_payment',
        {
          user_id: profile.id,
          plan_type: planType,
          stripe_payment_intent_id: paymentData?.stripe_payment_intent_id || 'manual_' + Date.now(),
        }
      );

      if (updateError) {
        throw new Error(`Failed to update plan: ${updateError.message}`);
      }

      return {
        success: true,
        message: 'Payment successful! Your plan has been activated.',
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
