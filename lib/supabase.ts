import { createClient } from '@supabase/supabase-js';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

// SecureStore adapter for Supabase auth (more secure than AsyncStorage)
// Stores tokens in iOS Keychain / Android Keystore
// Falls back to AsyncStorage if value exceeds 2KB limit
const SecureStoreAdapter = {
  getItem: async (key: string) => {
    try {
      return await SecureStore.getItemAsync(key);
    } catch (error) {
      console.error('[SecureStore] getItem error:', error);
      return null;
    }
  },
  setItem: async (key: string, value: string) => {
    try {
      await SecureStore.setItemAsync(key, value);
    } catch (error) {
      console.error('[SecureStore] setItem error (falling back to AsyncStorage):', error);
      // Fallback to AsyncStorage if value too large (>2KB limit)
      await AsyncStorage.setItem(key, value);
    }
  },
  removeItem: async (key: string) => {
    try {
      await SecureStore.deleteItemAsync(key);
    } catch (error) {
      console.error('[SecureStore] removeItem error:', error);
      // Also try AsyncStorage in case it was stored there
      await AsyncStorage.removeItem(key);
    }
  },
};

// TODO: Replace with your actual Supabase project URL and anon key
// Create a .env file or use expo-constants for these values
const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL || 'https://YOUR_PROJECT.supabase.co';
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || 'YOUR_ANON_KEY';

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: SecureStoreAdapter, // Changed from AsyncStorageAdapter for better security
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});
