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
 * Web-only Payment Hook using Stripe.js
 * For Native (iOS/Android), use usePayment.native.ts
 */
export const usePayment = () => {
  const { profile } = useAuth();
  const [loading, setLoading] = useState(false);
  const [initialized, setInitialized] = useState(false);

  // Initialize Stripe.js on web
  useEffect(() => {
    initializeStripe();
  }, []);

  const initializeStripe = async () => {
    if (initialized) return;

    try {
      // Load Stripe.js script if not already loaded
      if (!(window as any).Stripe) {
        // Stripe will be loaded dynamically when needed
        console.log('Stripe.js will be loaded on first payment attempt');
      }
      setInitialized(true);
    } catch (error) {
      console.error('Failed to initialize Stripe:', error);
    }
  };

  /**
   * Process payment on web using Stripe Hosted Payment Form or Checkout
   */
  const processPayment = async (
    planType: 'lifetime' | 'cloud_plus_monthly' | 'cloud_plus_yearly',
    userEmail: string
  ): Promise<PaymentResult> => {
    if (!profile?.id) {
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

      // Step 2: For web, we redirect to Stripe Checkout
      // In a real implementation, you would:
      // 1. Call your backend to create a Stripe Checkout Session
      // 2. Redirect to session.url
      // 3. Handle the return_url callback
      
      // For now, show a message that explains the payment flow
      const planDetails = {
        lifetime: { amount: 1499, currency: 'eur', description: 'Core (Lifetime)' },
        cloud_plus_monthly: { amount: 199, currency: 'eur', description: 'Cloud Plus (Monatlich)' },
        cloud_plus_yearly: { amount: 1999, currency: 'eur', description: 'Cloud Plus (Jährlich)' },
      };

      const details = planDetails[planType];

      // In production, this would be replaced with actual Stripe Checkout redirect
      AppAlert.alert(
        'Zahlung',
        `Du wirst zu Stripe Checkout weitergeleitet.
Plan: ${details.description}
Betrag: €${(details.amount / 100).toFixed(2)}

(Hinweis: Stripe Checkout ist in dieser Demo-Version noch nicht vollständig konfiguriert. 
Bitte konfiguriere deine Stripe Account in PAYMENT_SYSTEM.md)`,
        [
          {
            text: 'Abbrechen',
            onPress: () => setLoading(false),
            style: 'cancel',
          },
          {
            text: 'Zu Stripe Checkout',
            onPress: async () => {
              // Simulate successful payment for demo
              const result = await updatePlanAfterPayment(planType);
              setLoading(false);
              
              if (result.success) {
                AppAlert.alert(
                  '✅ Demo: Zahlung simuliert',
                  'In Production würde die echte Stripe-Zahlung hier erfolgen.',
                  [{ text: 'OK' }]
                );
              }
            },
          },
        ]
      );

      return {
        success: true,
        message: 'Demo mode: Payment processing simulated',
        planType,
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

  /**
   * Update user plan after successful payment
   */
  const updatePlanAfterPayment = async (planType: string): Promise<PaymentResult> => {
    if (!profile?.id) {
      return { success: false, message: 'User not found' };
    }

    try {
      const { data, error } = await supabase.rpc(
        'update_plan_after_payment',
        {
          user_id: profile.id,
          plan_type: planType,
          stripe_payment_intent_id: 'web_demo_' + Date.now(),
        }
      );

      if (error) {
        throw new Error(`Failed to update plan: ${error.message}`);
      }

      return {
        success: true,
        message: 'Plan activated successfully!',
        planType,
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to update plan';
      return {
        success: false,
        message: errorMessage,
      };
    }
  };

  return {
    processPayment,
    loading,
    initialized,
  };
};
