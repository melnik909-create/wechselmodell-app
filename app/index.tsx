import { Redirect } from 'expo-router';
import { ActivityIndicator, View, StyleSheet } from 'react-native';
import { useAuth } from '@/lib/auth';
import { useTrialGate } from '@/hooks/useTrialGate';
import { useChildren, useCustodyPattern } from '@/hooks/useFamily';

export default function Index() {
  const { session, isLoading, family } = useAuth();
  const { isBlocked } = useTrialGate();
  const { data: pattern, isLoading: patternLoading } = useCustodyPattern();
  const { data: children, isLoading: childrenLoading } = useChildren();

  if (isLoading || (session && family?.id && (patternLoading || childrenLoading))) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color="#4F46E5" />
      </View>
    );
  }

  if (!session) {
    return <Redirect href="/(auth)/login" />;
  }

  if (!family?.id) {
    return <Redirect href="/(onboarding)/welcome" />;
  }

  if (!pattern) {
    return <Redirect href="/(onboarding)/select-pattern" />;
  }

  if (!children || children.length === 0) {
    return <Redirect href="/(onboarding)/add-children" />;
  }

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
