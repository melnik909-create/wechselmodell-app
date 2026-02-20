import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

const PIN_KEY = 'sensitive_data_pin';

export const SensitivePin = {
  async hasPin(): Promise<boolean> {
    if (Platform.OS === 'web') {
      try {
        const v = localStorage.getItem(PIN_KEY);
        return !!v && v.length >= 4;
      } catch {
        return false;
      }
    }
    try {
      const v = await SecureStore.getItemAsync(PIN_KEY);
      return !!v && v.length >= 4;
    } catch {
      return false;
    }
  },

  async setPin(pin: string): Promise<void> {
    if (!pin || pin.length < 4) throw new Error('PIN muss mindestens 4 Zeichen haben.');
    if (Platform.OS === 'web') {
      localStorage.setItem(PIN_KEY, pin);
      return;
    }
    await SecureStore.setItemAsync(PIN_KEY, pin);
  },

  async checkPin(input: string): Promise<boolean> {
    if (Platform.OS === 'web') {
      const stored = localStorage.getItem(PIN_KEY);
      return !!stored && stored === input;
    }
    try {
      const stored = await SecureStore.getItemAsync(PIN_KEY);
      return !!stored && stored === input;
    } catch {
      return false;
    }
  },

  /** Maskiert sensible Zahlen wie Reisepassnummer: "C01X00T47" → "C01 (XXX)" */
  maskValue(value: string | null | undefined): string {
    if (!value || !value.trim()) return '—';
    const s = value.trim();
    if (s.length <= 3) return 'XXX';
    return s.slice(0, 3) + ' (XXX)';
  },
};
