import { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/auth';
import { AppAlert } from '@/lib/alert';

interface PaymentResult {
  success: boolean;
  message: string;
  planType?: string;
  error?: string;
}

const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

/**
 * Platform-agnostic Payment Hook (fallback)
 * - Web: usePayment.web.ts (Stripe Checkout redirect)
 * - Native: usePayment.native.ts (Stripe Payment Sheet)
 *
 * Expo auto-selects the correct .web.ts or .native.ts version.
 * This file is the fallback if no platform-specific version matches.
 */
export const usePayment = () => {
  const { profile } = useAuth();
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

      // Get session token
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) {
        throw new Error('Keine aktive Sitzung');
      }

      // Call Supabase Edge Function
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
            mode: 'web',
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Zahlung konnte nicht gestartet werden');
      }

      if (data.url) {
        // Web-style redirect
        if (typeof window !== 'undefined') {
          window.location.href = data.url;
        }
      }

      return {
        success: true,
        message: 'Weiterleitung zu Stripe...',
        planType,
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Zahlung fehlgeschlagen';
      console.error('Payment error:', errorMessage);

      AppAlert.alert('Zahlungsfehler', errorMessage, [{ text: 'OK' }]);

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

