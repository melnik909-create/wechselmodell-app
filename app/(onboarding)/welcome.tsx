import { useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { router } from 'expo-router';
import { useAuth } from '@/lib/auth';
import { useResponsive } from '@/hooks/useResponsive';

export default function WelcomeScreen() {
  const { isOnboarded } = useAuth();
  const { contentMaxWidth } = useResponsive();

  // If user is already onboarded, redirect to tabs (fixes PWA issue)
  useEffect(() => {
    if (isOnboarded) {
      router.replace('/(tabs)');
    }
  }, [isOnboarded]);

  return (
    <View style={styles.container}>
      <View style={{ maxWidth: contentMaxWidth, alignSelf: 'center', width: '100%' }}>
        <Text style={styles.title}>Willkommen bei Wechselmodell-Planer</Text>
        <Text style={styles.subtitle}>
          Organisiert gemeinsam den Alltag eurer Kinder
        </Text>

        <TouchableOpacity
          style={styles.button}
          onPress={() => router.push('/(onboarding)/create-family')}
        >
          <Text style={styles.buttonText}>Familie erstellen</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.button, styles.buttonSecondary]}
          onPress={() => router.push('/(onboarding)/join-family')}
        >
          <Text style={styles.buttonTextSecondary}>Familie beitreten</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 12,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    marginBottom: 48,
    textAlign: 'center',
  },
  button: {
    backgroundColor: '#4F46E5',
    padding: 16,
    borderRadius: 8,
    width: '100%',
    alignItems: 'center',
    marginBottom: 12,
  },
  buttonSecondary: {
    backgroundColor: '#fff',
    borderWidth: 2,
    borderColor: '#4F46E5',
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  buttonTextSecondary: {
    color: '#4F46E5',
    fontSize: 16,
    fontWeight: '600',
  },
});
