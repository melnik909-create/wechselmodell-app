import { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert, Switch } from 'react-native';
import { Link, router } from 'expo-router';
import { useAuth } from '@/lib/auth';

export default function LoginScreen() {
  const { signIn } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(true);
  const [loading, setLoading] = useState(false);

  async function handleLogin() {
    if (!email.trim() || !password.trim()) {
      Alert.alert('Fehler', 'Bitte E-Mail und Passwort eingeben.');
      return;
    }

    setLoading(true);
    try {
      await signIn(email.trim(), password);
      router.replace('/');
    } catch (error: any) {
      Alert.alert('Anmeldung fehlgeschlagen', error.message || 'Bitte versuche es erneut.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Wechselmodell</Text>
        <Text style={styles.subtitle}>Gemeinsam fuer die Kinder</Text>
      </View>

      <View style={styles.form}>
        <TextInput
          style={styles.input}
          placeholder="E-Mail"
          value={email}
          onChangeText={setEmail}
          keyboardType="email-address"
          autoCapitalize="none"
        />
        <TextInput
          style={styles.input}
          placeholder="Passwort"
          value={password}
          onChangeText={setPassword}
          secureTextEntry
        />

        <View style={styles.rememberMeContainer}>
          <Switch
            value={rememberMe}
            onValueChange={setRememberMe}
            trackColor={{ false: '#D1D5DB', true: '#818CF8' }}
            thumbColor={rememberMe ? '#4F46E5' : '#F3F4F6'}
          />
          <Text style={styles.rememberMeText}>Anmeldung merken</Text>
        </View>

        <TouchableOpacity
          style={[styles.button, loading && styles.buttonDisabled]}
          onPress={handleLogin}
          disabled={loading}
        >
          <Text style={styles.buttonText}>
            {loading ? 'Laden...' : 'Anmelden'}
          </Text>
        </TouchableOpacity>

        <View style={styles.footer}>
          <Text>Noch kein Konto? </Text>
          <Link href="/(auth)/register">
            <Text style={styles.link}>Registrieren</Text>
          </Link>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    justifyContent: 'center',
    padding: 24,
  },
  header: {
    alignItems: 'center',
    marginBottom: 48,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
  },
  form: {
    width: '100%',
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
    fontSize: 16,
  },
  rememberMeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  rememberMeText: {
    fontSize: 14,
    color: '#374151',
    marginLeft: 8,
  },
  button: {
    backgroundColor: '#4F46E5',
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 8,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 24,
  },
  link: {
    color: '#4F46E5',
    fontWeight: '600',
  },
});
