import { useState } from 'react';
import { View, Text, KeyboardAvoidingView, Platform, ScrollView, Alert } from 'react-native';
import { Link, router } from 'expo-router';
import { useAuth } from '@/lib/auth';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function LoginScreen() {
  const { signIn } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
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
    <SafeAreaView className="flex-1 bg-white">
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        className="flex-1"
      >
        <ScrollView
          contentContainerClassName="flex-grow justify-center px-6 py-8"
          keyboardShouldPersistTaps="handled"
        >
          {/* Logo / Header */}
          <View className="items-center mb-12">
            <View className="w-20 h-20 bg-indigo-600 rounded-2xl items-center justify-center mb-4">
              <Text className="text-white text-3xl font-bold">W</Text>
            </View>
            <Text className="text-2xl font-bold text-gray-900">Wechselmodell</Text>
            <Text className="text-base text-gray-500 mt-1">
              Gemeinsam fuer die Kinder
            </Text>
          </View>

          {/* Form */}
          <View>
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
              placeholder="Dein Passwort"
              value={password}
              onChangeText={setPassword}
              secureTextEntry
            />

            <Button
              title="Anmelden"
              onPress={handleLogin}
              loading={loading}
            />

            <View className="flex-row justify-center mt-6">
              <Text className="text-gray-500">Noch kein Konto? </Text>
              <Link href="/(auth)/register" asChild>
                <Text className="text-indigo-600 font-semibold">Registrieren</Text>
              </Link>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
