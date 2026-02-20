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
 * Web Payment Hook - Stripe Checkout (redirect)
 * Creates a Checkout Session via Supabase Edge Function,
 * then redirects the user to Stripe's hosted payment page.
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

      // Get current session token for auth
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) {
        throw new Error('Keine aktive Sitzung');
      }

      if (!SUPABASE_URL) {
        throw new Error('Supabase URL ist nicht konfiguriert. Bitte .env prüfen.');
      }

      let response: Response;
      try {
        response = await fetch(
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
      } catch (fetchError) {
        throw new Error(
          'Verbindung zum Zahlungsserver fehlgeschlagen. Bitte prüfe deine Internetverbindung und versuche es erneut.'
        );
      }

      let data: any;
      try {
        data = await response.json();
      } catch {
        throw new Error(`Server-Antwort ungültig (Status ${response.status}). Bitte später erneut versuchen.`);
      }

      if (!response.ok) {
        throw new Error(data.error || `Checkout-Session konnte nicht erstellt werden (${response.status})`);
      }

      if (!data.url) {
        throw new Error('Keine Checkout-URL erhalten');
      }

      window.location.href = data.url;

      return {
        success: true,
        message: 'Weiterleitung zu Stripe...',
        planType,
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Zahlung fehlgeschlagen';
      console.error('Payment error:', errorMessage);

      AppAlert.alert(
        'Zahlungsfehler',
        errorMessage,
        [{ text: 'OK' }]
      );

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
