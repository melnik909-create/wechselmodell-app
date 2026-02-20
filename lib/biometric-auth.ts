import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

const BIOMETRIC_CREDS_KEY = 'biometric_credentials';
const REMEMBER_ME_KEY = 'remember_me';

async function getSecureStore() {
  if (Platform.OS === 'web') return null;
  try {
    return require('expo-secure-store');
  } catch {
    return null;
  }
}

async function getLocalAuth() {
  if (Platform.OS === 'web') return null;
  try {
    return require('expo-local-authentication');
  } catch {
    return null;
  }
}

export const BiometricAuth = {
  async isAvailable(): Promise<boolean> {
    const LocalAuth = await getLocalAuth();
    if (!LocalAuth) return false;
    try {
      const compatible = await LocalAuth.hasHardwareAsync();
      if (!compatible) return false;
      const enrolled = await LocalAuth.isEnrolledAsync();
      return enrolled;
    } catch {
      return false;
    }
  },

  async authenticate(promptMessage = 'Anmelden mit Biometrie'): Promise<boolean> {
    const LocalAuth = await getLocalAuth();
    if (!LocalAuth) return false;
    try {
      const result = await LocalAuth.authenticateAsync({
        promptMessage,
        cancelLabel: 'Abbrechen',
        disableDeviceFallback: false,
      });
      return result.success;
    } catch {
      return false;
    }
  },

  async saveCredentials(email: string, password: string): Promise<void> {
    const SecureStore = await getSecureStore();
    const payload = JSON.stringify({ email, password });
    if (SecureStore) {
      try {
        await SecureStore.setItemAsync(BIOMETRIC_CREDS_KEY, payload);
        return;
      } catch {}
    }
    if (Platform.OS === 'web') {
      try { localStorage.setItem(BIOMETRIC_CREDS_KEY, payload); } catch {}
    } else {
      await AsyncStorage.setItem(BIOMETRIC_CREDS_KEY, payload);
    }
  },

  async getCredentials(): Promise<{ email: string; password: string } | null> {
    const SecureStore = await getSecureStore();
    let raw: string | null = null;
    if (SecureStore) {
      try { raw = await SecureStore.getItemAsync(BIOMETRIC_CREDS_KEY); } catch {}
    }
    if (!raw && Platform.OS === 'web') {
      try { raw = localStorage.getItem(BIOMETRIC_CREDS_KEY); } catch {}
    }
    if (!raw && Platform.OS !== 'web') {
      try { raw = await AsyncStorage.getItem(BIOMETRIC_CREDS_KEY); } catch {}
    }
    if (!raw) return null;
    try {
      return JSON.parse(raw);
    } catch {
      return null;
    }
  },

  async clearCredentials(): Promise<void> {
    const SecureStore = await getSecureStore();
    if (SecureStore) {
      try { await SecureStore.deleteItemAsync(BIOMETRIC_CREDS_KEY); } catch {}
    }
    if (Platform.OS === 'web') {
      try { localStorage.removeItem(BIOMETRIC_CREDS_KEY); } catch {}
    } else {
      try { await AsyncStorage.removeItem(BIOMETRIC_CREDS_KEY); } catch {}
    }
  },

  async setRememberMe(value: boolean): Promise<void> {
    if (Platform.OS === 'web') {
      try { localStorage.setItem(REMEMBER_ME_KEY, value ? '1' : '0'); } catch {}
    } else {
      await AsyncStorage.setItem(REMEMBER_ME_KEY, value ? '1' : '0');
    }
  },

  async getRememberMe(): Promise<boolean> {
    let val: string | null = null;
    if (Platform.OS === 'web') {
      try { val = localStorage.getItem(REMEMBER_ME_KEY); } catch {}
    } else {
      val = await AsyncStorage.getItem(REMEMBER_ME_KEY);
    }
    return val !== '0';
  },
};
