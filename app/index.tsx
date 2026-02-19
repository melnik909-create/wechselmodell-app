import { Redirect } from 'expo-router';
import { ActivityIndicator, View, StyleSheet } from 'react-native';
import { useAuth } from '@/lib/auth';
import { useTrialGate } from '@/hooks/useTrialGate';

// DEV_SKIP_AUTH: true = direkt zu Tabs, false = normale Auth
const DEV_SKIP_AUTH = false;

export default function Index() {
  const { session, isLoading, isOnboarded } = useAuth();
  const { isBlocked } = useTrialGate();

  // Auth komplett überspringen zum Testen
  if (DEV_SKIP_AUTH) {
    return <Redirect href="/(tabs)" />;
  }

  if (isLoading) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color="#4F46E5" />
      </View>
    );
  }

  if (!session) {
    return <Redirect href="/(auth)/login" />;
  }

  if (!isOnboarded) {
    return <Redirect href="/(onboarding)/welcome" />;
  }

  // If trial is expired, the gate hook will auto-open paywall
  // Still render tabs so user can see them, but paywall overlays
  return <Redirect href="/(tabs)" />;
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fff',
  },
});
