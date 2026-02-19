import * as Crypto from 'expo-crypto';
import { Platform } from 'react-native';

const MASTER_KEY_STORAGE_KEY = 'wechselmodell_master_key';

// Platform-aware secure storage
async function getSecureItem(key: string): Promise<string | null> {
  if (Platform.OS === 'web') {
    return typeof window !== 'undefined' ? localStorage.getItem(key) : null;
  }
  const SecureStore = require('expo-secure-store');
  return SecureStore.getItemAsync(key);
}

async function setSecureItem(key: string, value: string): Promise<void> {
  if (Platform.OS === 'web') {
    if (typeof window !== 'undefined') localStorage.setItem(key, value);
    return;
  }
  const SecureStore = require('expo-secure-store');
  await SecureStore.setItemAsync(key, value);
}

async function deleteSecureItem(key: string): Promise<void> {
  if (Platform.OS === 'web') {
    if (typeof window !== 'undefined') localStorage.removeItem(key);
    return;
  }
  const SecureStore = require('expo-secure-store');
  await SecureStore.deleteItemAsync(key);
}

// Web Crypto AES helpers
async function webEncrypt(plaintext: string, keyHex: string, ivHex: string): Promise<string> {
  const encoder = new TextEncoder();
  const keyBytes = new Uint8Array(keyHex.match(/.{2}/g)!.map(b => parseInt(b, 16)));
  const ivBytes = new Uint8Array(ivHex.match(/.{2}/g)!.map(b => parseInt(b, 16)));
  const cryptoKey = await crypto.subtle.importKey('raw', keyBytes, 'AES-CBC', false, ['encrypt']);
  const encrypted = await crypto.subtle.encrypt({ name: 'AES-CBC', iv: ivBytes }, cryptoKey, encoder.encode(plaintext));
  return btoa(String.fromCharCode(...new Uint8Array(encrypted)));
}

async function webDecrypt(ciphertextB64: string, keyHex: string, ivHex: string): Promise<string> {
  const keyBytes = new Uint8Array(keyHex.match(/.{2}/g)!.map(b => parseInt(b, 16)));
  const ivBytes = new Uint8Array(ivHex.match(/.{2}/g)!.map(b => parseInt(b, 16)));
  const cipherBytes = Uint8Array.from(atob(ciphertextB64), c => c.charCodeAt(0));
  const cryptoKey = await crypto.subtle.importKey('raw', keyBytes, 'AES-CBC', false, ['decrypt']);
  const decrypted = await crypto.subtle.decrypt({ name: 'AES-CBC', iv: ivBytes }, cryptoKey, cipherBytes);
  return new TextDecoder().decode(decrypted);
}

/**
 * Encryption Service for sensitive data
 * Uses AES-256-CBC with random IV per field
 * Native: SecureStore + react-native-aes-crypto
 * Web: localStorage + Web Crypto API
 */
export class EncryptionService {
  private static masterKey: string | null = null;

  static async initializeMasterKey(): Promise<void> {
    try {
      let key = await getSecureItem(MASTER_KEY_STORAGE_KEY);

      if (!key) {
        const randomBytes = await Crypto.getRandomBytesAsync(32);
        key = Array.from(randomBytes, byte => byte.toString(16).padStart(2, '0')).join('');
        await setSecureItem(MASTER_KEY_STORAGE_KEY, key);
      }

      this.masterKey = key;
    } catch (error) {
      console.error('[Encryption] Failed to initialize master key:', error);
      throw new Error('Encryption initialization failed');
    }
  }

  static async encrypt(plaintext: string | null): Promise<string | null> {
    if (!plaintext || plaintext.trim() === '') return null;
    if (!this.masterKey) await this.initializeMasterKey();

    try {
      const ivBytes = await Crypto.getRandomBytesAsync(16);
      const iv = Array.from(ivBytes, byte => byte.toString(16).padStart(2, '0')).join('');

      let ciphertext: string;
      if (Platform.OS === 'web') {
        ciphertext = await webEncrypt(plaintext, this.masterKey!, iv);
      } else {
        const Aes = require('react-native-aes-crypto').default;
        ciphertext = await Aes.encrypt(plaintext, this.masterKey!, iv);
      }

      return `${iv}:${ciphertext}`;
    } catch (error) {
      console.error('[Encryption] Encryption failed:', error);
      throw error;
    }
  }

  static async decrypt(ciphertext: string | null): Promise<string | null> {
    if (!ciphertext || ciphertext.trim() === '') return null;
    if (!this.masterKey) await this.initializeMasterKey();

    try {
      const parts = ciphertext.split(':');
      if (parts.length !== 2) return null;
      const [iv, encryptedData] = parts;

      let plaintext: string;
      if (Platform.OS === 'web') {
        plaintext = await webDecrypt(encryptedData, this.masterKey!, iv);
      } else {
        const Aes = require('react-native-aes-crypto').default;
        plaintext = await Aes.decrypt(encryptedData, this.masterKey!, iv);
      }

      return plaintext;
    } catch (error) {
      console.error('[Encryption] Decryption failed:', error);
      return null;
    }
  }

  static async encryptFields<T extends Record<string, any>>(data: T, fieldsToEncrypt: (keyof T)[]): Promise<T> {
    const encrypted = { ...data };
    for (const field of fieldsToEncrypt) {
      if (typeof data[field] === 'string') {
        encrypted[field] = await this.encrypt(data[field]) as any;
      }
    }
    return encrypted;
  }

  static async decryptFields<T extends Record<string, any>>(data: T, fieldsToDecrypt: (keyof T)[]): Promise<T> {
    const decrypted = { ...data };
    for (const field of fieldsToDecrypt) {
      const value = data[field];
      if (typeof value === 'string' && value.includes(':')) {
        decrypted[field] = await this.decrypt(value) as any;
      }
    }
    return decrypted;
  }

  static clearMasterKey(): void {
    this.masterKey = null;
  }

  static async rotateMasterKey(): Promise<void> {
    await deleteSecureItem(MASTER_KEY_STORAGE_KEY);
    this.masterKey = null;
    await this.initializeMasterKey();
  }
}
