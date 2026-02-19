import { createClient } from '@supabase/supabase-js';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

// Web: localStorage adapter (SecureStore not available on web)
const WebStorageAdapter = {
  getItem: (key: string) => Promise.resolve(
    typeof window !== 'undefined' ? localStorage.getItem(key) : null
  ),
  setItem: (key: string, value: string) => {
    if (typeof window !== 'undefined') localStorage.setItem(key, value);
    return Promise.resolve();
  },
  removeItem: (key: string) => {
    if (typeof window !== 'undefined') localStorage.removeItem(key);
    return Promise.resolve();
  },
};

// Native: SecureStore with AsyncStorage fallback
const NativeStorageAdapter = {
  getItem: async (key: string) => {
    try {
      const SecureStore = require('expo-secure-store');
      return await SecureStore.getItemAsync(key);
    } catch (error) {
      console.error('[SecureStore] getItem error:', error);
      return null;
    }
  },
  setItem: async (key: string, value: string) => {
    try {
      const SecureStore = require('expo-secure-store');
      await SecureStore.setItemAsync(key, value);
    } catch (error) {
      console.error('[SecureStore] setItem error (falling back to AsyncStorage):', error);
      await AsyncStorage.setItem(key, value);
    }
  },
  removeItem: async (key: string) => {
    try {
      const SecureStore = require('expo-secure-store');
      await SecureStore.deleteItemAsync(key);
    } catch (error) {
      console.error('[SecureStore] removeItem error:', error);
      await AsyncStorage.removeItem(key);
    }
  },
};

const StorageAdapter = Platform.OS === 'web' ? WebStorageAdapter : NativeStorageAdapter;

// Supabase credentials - with hardcoded fallback
const DEFAULT_SUPABASE_URL = 'https://dtsffvopfwuasohffwny.supabase.co';
const DEFAULT_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImR0c2Zmdm9wZnd1YXNvaGZmd255Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzA3NjQ4NzIsImV4cCI6MjA4NjM0MDg3Mn0.mSEBTcgg7NP7NuV1-jBO5X2WhCoL_7cVe7F4sXU6pWY';

const supabaseUrl = (process.env.EXPO_PUBLIC_SUPABASE_URL || '').trim() || DEFAULT_SUPABASE_URL;
const supabaseAnonKey = (process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || '').trim() || DEFAULT_ANON_KEY;

// Validation
if (!supabaseUrl || !supabaseUrl.startsWith('https://')) {
  console.error('[Supabase] Invalid URL:', supabaseUrl);
}
if (!supabaseAnonKey) {
  console.error('[Supabase] Missing ANON_KEY');
}

console.log('[Supabase] Initializing with URL:', supabaseUrl);

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: StorageAdapter,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: Platform.OS === 'web',
  },
});
