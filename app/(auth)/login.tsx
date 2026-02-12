import { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert, Switch, ScrollView, KeyboardAvoidingView, Platform } from 'react-native';
import { Link, router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useAuth } from '@/lib/auth';
import { useResponsive } from '@/hooks/useResponsive';

export default function LoginScreen() {
  const { signIn } = useAuth();
  const { contentMaxWidth, isLandscape } = useResponsive();
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
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
        >
          <View style={[styles.container, { maxWidth: contentMaxWidth, alignSelf: 'center', width: '100%' }]}>
            {/* Logo */}
            <View style={[styles.logoContainer, isLandscape && { marginBottom: 24 }]}>
              <MaterialCommunityIcons name="calendar-sync" size={isLandscape ? 40 : 60} color="#4F46E5" />
              <Text style={styles.appName}>Wechselmodell-Planer</Text>
              {!isLandscape && (
                <>
                  <Text style={styles.tagline}>Gemeinsam organisiert – Fair gelöst.</Text>
                  <Text style={styles.subtagline}>So geht Co-Parenting ohne Kopfschmerzen.</Text>
                </>
              )}
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

              {/* Trial & Pricing Info */}
              <View style={styles.trialInfo}>
                <Text style={styles.trialText}>
                  14 Tage kostenlos testen mit voller Nutzung {'\u2013'} damit ihr sicher seid, dass es f{'\u00FC'}r euer Wechselmodell passt.
                </Text>
                <Text style={styles.trialText}>
                  Danach einmalig 14,99 {'\u20AC'} {'\u2013'} fair & ohne Abo.{'\n'}
                  Belege/Fotos hochladen optional mit Cloud Pro 1,99 {'\u20AC'}/Monat (nur f{'\u00FC'}r Serverkosten).
                </Text>
              </View>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    justifyContent: 'center',
    padding: 24,
  },
  logoContainer: {
    alignItems: 'center',
    marginBottom: 48,
  },
  appName: {
    fontSize: 28,
    fontWeight: '700',
    color: '#4F46E5',
    marginTop: 12,
    marginBottom: 8,
  },
  tagline: {
    fontSize: 16,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 4,
  },
  subtagline: {
    fontSize: 14,
    color: '#6B7280',
    fontStyle: 'italic',
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
  trialInfo: {
    marginTop: 32,
    paddingTop: 20,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  trialText: {
    fontSize: 12,
    color: '#9CA3AF',
    textAlign: 'center',
    lineHeight: 18,
    marginBottom: 8,
  },
});
