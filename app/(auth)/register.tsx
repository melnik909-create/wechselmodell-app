import { useState } from 'react';
import { View, Text, KeyboardAvoidingView, Platform, ScrollView, Alert } from 'react-native';
import { Link, router } from 'expo-router';
import { useAuth } from '@/lib/auth';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function RegisterScreen() {
  const { signUp } = useAuth();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleRegister() {
    if (!name.trim() || !email.trim() || !password.trim()) {
      Alert.alert('Fehler', 'Bitte alle Felder ausfuellen.');
      return;
    }
    if (password !== confirmPassword) {
      Alert.alert('Fehler', 'Die Passwoerter stimmen nicht ueberein.');
      return;
    }
    if (password.length < 6) {
      Alert.alert('Fehler', 'Das Passwort muss mindestens 6 Zeichen lang sein.');
      return;
    }

    setLoading(true);
    try {
      await signUp(email.trim(), password, name.trim());
      Alert.alert(
        'Registrierung erfolgreich',
        'Bitte bestaetigen Sie Ihre E-Mail-Adresse.',
        [{ text: 'OK', onPress: () => router.replace('/(auth)/login') }]
      );
    } catch (error: any) {
      Alert.alert('Registrierung fehlgeschlagen', error.message || 'Bitte versuche es erneut.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <SafeAreaView className="flex-1 bg-white">
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        className="flex-1"
      >
        <ScrollView
          contentContainerClassName="flex-grow justify-center px-6 py-8"
          keyboardShouldPersistTaps="handled"
        >
          {/* Header */}
          <View className="items-center mb-10">
            <Text className="text-2xl font-bold text-gray-900">Konto erstellen</Text>
            <Text className="text-base text-gray-500 mt-1">
              Starte jetzt mit Wechselmodell
            </Text>
          </View>

          {/* Form */}
          <View>
            <Input
              label="Name"
              placeholder="Dein Name"
              value={name}
              onChangeText={setName}
              autoCapitalize="words"
            />
            <Input
              label="E-Mail"
              placeholder="deine@email.de"
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
            />
            <Input
              label="Passwort"
              placeholder="Mindestens 6 Zeichen"
              value={password}
              onChangeText={setPassword}
              secureTextEntry
            />
            <Input
              label="Passwort bestaetigen"
              placeholder="Passwort wiederholen"
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              secureTextEntry
            />

            <Text className="text-xs text-gray-400 mb-4 text-center">
              Mit der Registrierung stimmst du unserer Datenschutzerklaerung zu.
            </Text>

            <Button
              title="Registrieren"
              onPress={handleRegister}
              loading={loading}
            />

            <View className="flex-row justify-center mt-6">
              <Text className="text-gray-500">Bereits ein Konto? </Text>
              <Link href="/(auth)/login" asChild>
                <Text className="text-indigo-600 font-semibold">Anmelden</Text>
              </Link>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
