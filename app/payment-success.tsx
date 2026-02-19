import { useEffect, useState } from 'react';
import { View, Text, ActivityIndicator, StyleSheet } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/auth';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useQueryClient } from '@tanstack/react-query';

export default function PaymentSuccessScreen() {
  const { session_id, plan } = useLocalSearchParams<{ session_id?: string; plan?: string }>();
  const { profile } = useAuth();
  const queryClient = useQueryClient();
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [message, setMessage] = useState('');

  const planLabels: Record<string, string> = {
    lifetime: 'Core (Lifetime)',
    cloud_plus_monthly: 'Cloud Plus (Monatlich)',
    cloud_plus_yearly: 'Cloud Plus (Jährlich)',
  };

  useEffect(() => {
    activatePlan();
  }, []);

  const activatePlan = async () => {
    if (!profile?.id || !plan) {
      setStatus('error');
      setMessage('Fehlende Daten. Bitte kontaktiere den Support.');
      return;
    }

    try {
      const { error } = await supabase.rpc('update_plan_after_payment', {
        user_id: profile.id,
        plan_type: plan,
        stripe_payment_intent_id: session_id || 'checkout_' + Date.now(),
      });

      if (error) {
        throw new Error(error.message);
      }

      // Invalidate entitlements cache so UI updates
      queryClient.invalidateQueries({ queryKey: ['entitlements'] });

      setStatus('success');
      setMessage(`${planLabels[plan] || plan} wurde aktiviert!`);

      // Redirect to tabs after 3 seconds
      setTimeout(() => {
        router.replace('/(tabs)');
      }, 3000);
    } catch (err) {
      console.error('Plan activation error:', err);
      setStatus('error');
      setMessage('Plan konnte nicht aktiviert werden. Bitte kontaktiere den Support.');
    }
  };

  return (
    <View style={styles.container}>
      {status === 'loading' && (
        <>
          <ActivityIndicator size="large" color="#4F46E5" />
          <Text style={styles.title}>Zahlung wird verarbeitet...</Text>
          <Text style={styles.subtitle}>Bitte warte einen Moment.</Text>
        </>
      )}

      {status === 'success' && (
        <>
          <View style={styles.iconCircle}>
            <MaterialCommunityIcons name="check-circle" size={64} color="#10B981" />
          </View>
          <Text style={styles.title}>Zahlung erfolgreich!</Text>
          <Text style={styles.subtitle}>{message}</Text>
          <Text style={styles.redirect}>Du wirst gleich weitergeleitet...</Text>
        </>
      )}

      {status === 'error' && (
        <>
          <View style={styles.iconCircleError}>
            <MaterialCommunityIcons name="alert-circle" size={64} color="#EF4444" />
          </View>
          <Text style={styles.title}>Fehler</Text>
          <Text style={styles.subtitle}>{message}</Text>
          <Text
            style={styles.link}
            onPress={() => router.replace('/(tabs)')}
          >
            Zur App
          </Text>
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  iconCircle: {
    marginBottom: 16,
  },
  iconCircleError: {
    marginBottom: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: '#111',
    marginTop: 16,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    color: '#6B7280',
    marginTop: 8,
    textAlign: 'center',
  },
  redirect: {
    fontSize: 14,
    color: '#9CA3AF',
    marginTop: 24,
  },
  link: {
    fontSize: 16,
    color: '#4F46E5',
    fontWeight: '600',
    marginTop: 24,
    textDecorationLine: 'underline',
  },
});
