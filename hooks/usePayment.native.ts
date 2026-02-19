import { useState } from 'react';
import { useStripe } from '@stripe/stripe-react-native';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/auth';

interface PaymentResult {
  success: boolean;
  message: string;
  planType?: string;
  error?: string;
}

const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

/**
 * Native Payment Hook using @stripe/stripe-react-native Payment Sheet
 * Calls Supabase Edge Function to create PaymentIntent,
 * then presents the Stripe Payment Sheet.
 */
export const usePayment = () => {
  const { initPaymentSheet, presentPaymentSheet } = useStripe();
  const { profile, user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [initialized] = useState(true);

  const processPayment = async (
    planType: 'lifetime' | 'cloud_plus_monthly' | 'cloud_plus_yearly',
    _userEmail: string
  ): Promise<PaymentResult> => {
    if (!profile?.id) {
      return {
        success: false,
        message: 'Bitte melde dich an um zu bezahlen.',
        error: 'Not authenticated',
      };
    }

    try {
      setLoading(true);

      // 1. Get session token
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) {
        throw new Error('Keine aktive Sitzung');
      }

      // 2. Call Edge Function to create PaymentIntent
      const response = await fetch(
        `${SUPABASE_URL}/functions/v1/stripe-checkout`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session.access_token}`,
            'apikey': SUPABASE_ANON_KEY || '',
          },
          body: JSON.stringify({
            plan_type: planType,
            mode: 'native',
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'PaymentIntent konnte nicht erstellt werden');
      }

      // 3. Initialize Payment Sheet with client secret
      const { error: initError } = await initPaymentSheet({
        merchantDisplayName: 'WechselPlaner',
        paymentIntentClientSecret: data.clientSecret,
        defaultBillingDetails: {
          email: user?.email || undefined,
        },
      });

      if (initError) {
        throw new Error(`Payment Sheet Fehler: ${initError.message}`);
      }

      // 4. Present Payment Sheet
      const { error: paymentError } = await presentPaymentSheet();

      if (paymentError?.code === 'Canceled') {
        return {
          success: false,
          message: 'Zahlung abgebrochen',
          error: paymentError.message,
        };
      }

      if (paymentError) {
        throw new Error(`Zahlung fehlgeschlagen: ${paymentError.message}`);
      }

      // 5. Update plan in database
      const { error: updateError } = await supabase.rpc(
        'update_plan_after_payment',
        {
          user_id: profile.id,
          plan_type: planType,
          stripe_payment_intent_id: data.paymentIntentId,
        }
      );

      if (updateError) {
        throw new Error(`Plan-Update fehlgeschlagen: ${updateError.message}`);
      }

      return {
        success: true,
        message: 'Zahlung erfolgreich! Dein Plan wurde aktiviert.',
        planType,
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Zahlung fehlgeschlagen';
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
