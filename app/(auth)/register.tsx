import { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  ActivityIndicator,
  StyleSheet,
} from 'react-native';
import { Link, router } from 'expo-router';
import { AppAlert } from '@/lib/alert';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useAuth } from '@/lib/auth';
import { useResponsive } from '@/hooks/useResponsive';

export default function RegisterScreen() {
  const { signUp } = useAuth();
  const { contentMaxWidth, isLandscape } = useResponsive();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleRegister() {
    if (!name.trim() || !email.trim() || !password.trim()) {
      AppAlert.alert('Fehler', 'Bitte alle Felder ausfüllen.');
      return;
    }
    if (password !== confirmPassword) {
      AppAlert.alert('Fehler', 'Die Passwörter stimmen nicht überein.');
      return;
    }

    // Sichere Passwort-Validierung
    if (password.length < 8) {
      AppAlert.alert('Schwaches Passwort', 'Das Passwort muss mindestens 8 Zeichen lang sein.');
      return;
    }
    if (!/[A-Z]/.test(password)) {
      AppAlert.alert('Schwaches Passwort', 'Das Passwort muss mindestens einen Großbuchstaben enthalten.');
      return;
    }
    if (!/[a-z]/.test(password)) {
      AppAlert.alert('Schwaches Passwort', 'Das Passwort muss mindestens einen Kleinbuchstaben enthalten.');
      return;
    }
    if (!/[0-9]/.test(password)) {
      AppAlert.alert('Schwaches Passwort', 'Das Passwort muss mindestens eine Zahl enthalten.');
      return;
    }
    if (!/[^A-Za-z0-9]/.test(password)) {
      AppAlert.alert('Schwaches Passwort', 'Das Passwort muss mindestens ein Sonderzeichen enthalten (!@#$%^&* etc.).');
      return;
    }

    setLoading(true);
    try {
      await signUp(email.trim(), password, name.trim());
      AppAlert.alert(
        'Registrierung erfolgreich',
        'Bitte bestaetigen Sie Ihre E-Mail-Adresse.',
        [{ text: 'OK', onPress: () => router.replace('/(auth)/login') }]
      );
    } catch (error: any) {
      AppAlert.alert('Registrierung fehlgeschlagen', error.message || 'Bitte versuche es erneut.');
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
          <View style={[{ maxWidth: contentMaxWidth, alignSelf: 'center', width: '100%' }]}>
          {/* Logo */}
          <View style={[styles.logoContainer, isLandscape && { marginBottom: 16 }]}>
            <MaterialCommunityIcons name="calendar-sync" size={isLandscape ? 40 : 60} color="#4F46E5" />
            <Text style={styles.appName}>Wechselmodell-Planer</Text>
            {!isLandscape && (
              <>
                <Text style={styles.tagline}>Gemeinsam organisiert – Fair gelöst.</Text>
                <Text style={styles.subtagline}>So geht Co-Parenting ohne Kopfschmerzen.</Text>
              </>
            )}
          </View>

          {/* Header */}
          <View style={[styles.header, isLandscape && { marginBottom: 16 }]}>
            <Text style={styles.title}>Konto erstellen</Text>
          </View>

          {/* Form */}
          <View style={styles.form}>
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Name</Text>
              <TextInput
                style={styles.input}
                placeholder="Dein Name"
                value={name}
                onChangeText={setName}
                autoCapitalize="words"
                editable={!loading}
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>E-Mail</Text>
              <TextInput
                style={styles.input}
                placeholder="deine@email.de"
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
                editable={!loading}
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Passwort</Text>
              <TextInput
                style={styles.input}
                placeholder="Mindestens 8 Zeichen"
                value={password}
                onChangeText={setPassword}
                secureTextEntry
                editable={!loading}
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Passwort bestätigen</Text>
              <TextInput
                style={styles.input}
                placeholder="Passwort wiederholen"
                value={confirmPassword}
                onChangeText={setConfirmPassword}
                secureTextEntry
                editable={!loading}
              />
            </View>

            <View style={styles.passwordRequirements}>
              <Text style={styles.requirementsTitle}>Passwort-Anforderungen:</Text>
              <Text style={[styles.requirementItem, password.length >= 8 && styles.requirementMet]}>
                {password.length >= 8 ? '\u2713' : '\u2022'} Mindestens 8 Zeichen
              </Text>
              <Text style={[styles.requirementItem, /[A-Z]/.test(password) && styles.requirementMet]}>
                {/[A-Z]/.test(password) ? '\u2713' : '\u2022'} Ein Großbuchstabe
              </Text>
              <Text style={[styles.requirementItem, /[a-z]/.test(password) && styles.requirementMet]}>
                {/[a-z]/.test(password) ? '\u2713' : '\u2022'} Ein Kleinbuchstabe
              </Text>
              <Text style={[styles.requirementItem, /[0-9]/.test(password) && styles.requirementMet]}>
                {/[0-9]/.test(password) ? '\u2713' : '\u2022'} Eine Zahl
              </Text>
              <Text style={[styles.requirementItem, /[^A-Za-z0-9]/.test(password) && styles.requirementMet]}>
                {/[^A-Za-z0-9]/.test(password) ? '\u2713' : '\u2022'} Ein Sonderzeichen (!@#$% etc.)
              </Text>
            </View>

            <Text style={styles.disclaimer}>
              Mit der Registrierung stimmst du unserer Datenschutzerklaerung zu.
            </Text>

            <TouchableOpacity
              style={[styles.button, loading && styles.buttonDisabled]}
              onPress={handleRegister}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.buttonText}>Registrieren</Text>
              )}
            </TouchableOpacity>

            <View style={styles.footer}>
              <Text style={styles.footerText}>Bereits ein Konto? </Text>
              <Link href="/(auth)/login" asChild>
                <TouchableOpacity>
                  <Text style={styles.link}>Anmelden</Text>
                </TouchableOpacity>
              </Link>
            </View>
          </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#fff',
  },
  keyboardView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingHorizontal: 24,
    paddingVertical: 32,
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
  header: {
    alignItems: 'center',
    marginBottom: 40,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#111',
  },
  subtitle: {
    fontSize: 16,
    color: '#6B7280',
    marginTop: 4,
  },
  form: {
    width: '100%',
  },
  inputGroup: {
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 6,
  },
  input: {
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    backgroundColor: '#fff',
  },
  passwordRequirements: {
    backgroundColor: '#F9FAFB',
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  requirementsTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 6,
  },
  requirementItem: {
    fontSize: 13,
    color: '#9CA3AF',
    marginBottom: 2,
  },
  requirementMet: {
    color: '#10B981',
  },
  disclaimer: {
    fontSize: 12,
    color: '#9CA3AF',
    textAlign: 'center',
    marginBottom: 16,
  },
  button: {
    backgroundColor: '#4F46E5',
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
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
  footerText: {
    color: '#6B7280',
    fontSize: 14,
  },
  link: {
    color: '#4F46E5',
    fontSize: 14,
    fontWeight: '600',
  },
});
