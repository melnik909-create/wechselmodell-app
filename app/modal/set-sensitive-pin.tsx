import { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet } from 'react-native';
import { AppAlert } from '@/lib/alert';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { SensitivePin } from '@/lib/sensitive-pin';
import { COLORS } from '@/lib/constants';

export default function SetSensitivePinScreen() {
  const [pin, setPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [hasExistingPin, setHasExistingPin] = useState(false);

  useEffect(() => {
    SensitivePin.hasPin().then(setHasExistingPin);
  }, []);

  const handleSave = async () => {
    if (pin.length < 4) {
      AppAlert.alert('Hinweis', 'PIN muss mindestens 4 Zeichen haben.');
      return;
    }
    if (pin !== confirmPin) {
      AppAlert.alert('Fehler', 'PIN und Bestätigung stimmen nicht überein.');
      return;
    }
    try {
      await SensitivePin.setPin(pin);
      AppAlert.alert('Erfolg', 'PIN wurde gespeichert. Er wird zum Anzeigen sensibler Daten (z.B. Reisepassnummer) abgefragt.', [
        { text: 'OK', onPress: () => router.back() },
      ]);
    } catch (e: any) {
      AppAlert.alert('Fehler', e?.message || 'PIN konnte nicht gespeichert werden.');
    }
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['bottom']}>
      <View style={styles.content}>
        <View style={styles.iconWrap}>
          <MaterialCommunityIcons name="lock" size={40} color={COLORS.primary} />
        </View>
        <Text style={styles.title}>PIN für sensible Daten</Text>
        <Text style={styles.desc}>
          Dieser PIN schützt z.B. Reisepassnummern in den Kind-Dokumenten. Beim Tippen auf die Nummer wird der PIN abgefragt.
        </Text>

        <Text style={styles.label}>{hasExistingPin ? 'Neuer PIN' : 'PIN'} (min. 4 Zeichen)</Text>
        <TextInput
          style={styles.input}
          value={pin}
          onChangeText={setPin}
          placeholder="••••"
          secureTextEntry
          keyboardType="number-pad"
          maxLength={20}
        />

        <Text style={styles.label}>PIN bestätigen</Text>
        <TextInput
          style={styles.input}
          value={confirmPin}
          onChangeText={setConfirmPin}
          placeholder="••••"
          secureTextEntry
          keyboardType="number-pad"
          maxLength={20}
        />

        <TouchableOpacity style={styles.button} onPress={handleSave} activeOpacity={0.8}>
          <Text style={styles.buttonText}>PIN speichern</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#F9FAFB' },
  content: { padding: 24, maxWidth: 400, alignSelf: 'center', width: '100%' },
  iconWrap: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#EEF2FF',
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'center',
    marginBottom: 16,
  },
  title: { fontSize: 20, fontWeight: '700', color: '#111', textAlign: 'center', marginBottom: 8 },
  desc: { fontSize: 14, color: '#6B7280', textAlign: 'center', marginBottom: 24, lineHeight: 20 },
  label: { fontSize: 14, fontWeight: '600', color: '#374151', marginBottom: 6 },
  input: {
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    marginBottom: 16,
    backgroundColor: '#fff',
  },
  button: {
    backgroundColor: COLORS.primary,
    borderRadius: 12,
    paddingVertical: 14,
    marginTop: 8,
    alignItems: 'center',
  },
  buttonText: { fontSize: 16, fontWeight: '600', color: '#fff' },
});
