import * as Crypto from 'expo-crypto';
import * as SecureStore from 'expo-secure-store';
import Aes from 'react-native-aes-crypto';

const MASTER_KEY_STORAGE_KEY = 'wechselmodell_master_key';

/**
 * Encryption Service for sensitive data
 * Uses AES-256-CBC with random IV per field
 * Master key stored in SecureStore (iOS Keychain / Android Keystore)
 */
export class EncryptionService {
  private static masterKey: string | null = null;

  /**
   * Initialize or retrieve the master encryption key
   * Stored in Expo SecureStore (Keychain on iOS, Keystore on Android)
   */
  static async initializeMasterKey(): Promise<void> {
    try {
      // Check if master key exists
      let key = await SecureStore.getItemAsync(MASTER_KEY_STORAGE_KEY);

      if (!key) {
        // Generate new 256-bit master key (32 bytes)
        const randomBytes = await Crypto.getRandomBytesAsync(32);
        key = Array.from(randomBytes, byte => byte.toString(16).padStart(2, '0')).join('');

        // Store in secure storage
        await SecureStore.setItemAsync(MASTER_KEY_STORAGE_KEY, key);
        console.log('[Encryption] New master key generated and stored securely');
      } else {
        console.log('[Encryption] Master key loaded from secure storage');
      }

      this.masterKey = key;
    } catch (error) {
      console.error('[Encryption] Failed to initialize master key:', error);
      throw new Error('Encryption initialization failed');
    }
  }

  /**
   * Encrypt a plaintext string
   * Returns: base64(iv):base64(ciphertext)
   * Returns null for null/empty input
   */
  static async encrypt(plaintext: string | null): Promise<string | null> {
    if (!plaintext || plaintext.trim() === '') {
      return null;
    }

    if (!this.masterKey) {
      await this.initializeMasterKey();
    }

    try {
      // Generate random IV (16 bytes for AES)
      const ivBytes = await Crypto.getRandomBytesAsync(16);
      const iv = Array.from(ivBytes, byte => byte.toString(16).padStart(2, '0')).join('');

      // Encrypt using AES-256-CBC
      const ciphertext = await Aes.encrypt(plaintext, this.masterKey!, iv);

      // Format: iv:ciphertext (both base64)
      return `${iv}:${ciphertext}`;
    } catch (error) {
      console.error('[Encryption] Encryption failed:', error);
      throw error;
    }
  }

  /**
   * Decrypt a ciphertext string
   * Expects format: base64(iv):base64(ciphertext)
   * Returns null for null/empty input or decryption errors
   */
  static async decrypt(ciphertext: string | null): Promise<string | null> {
    if (!ciphertext || ciphertext.trim() === '') {
      return null;
    }

    if (!this.masterKey) {
      await this.initializeMasterKey();
    }

    try {
      // Split IV and ciphertext
      const parts = ciphertext.split(':');
      if (parts.length !== 2) {
        console.warn('[Encryption] Invalid ciphertext format:', ciphertext.substring(0, 20));
        return null;
      }

      const [iv, encryptedData] = parts;

      // Decrypt using AES-256-CBC
      const plaintext = await Aes.decrypt(encryptedData, this.masterKey!, iv);

      return plaintext;
    } catch (error) {
      console.error('[Encryption] Decryption failed:', error);
      // Don't throw - return null to handle gracefully
      return null;
    }
  }

  /**
   * Bulk encrypt multiple fields in an object
   * Only encrypts string values
   */
  static async encryptFields<T extends Record<string, any>>(
    data: T,
    fieldsToEncrypt: (keyof T)[]
  ): Promise<T> {
    const encrypted = { ...data };

    for (const field of fieldsToEncrypt) {
      const value = data[field];
      if (typeof value === 'string') {
        encrypted[field] = await this.encrypt(value) as any;
      }
    }

    return encrypted;
  }

  /**
   * Bulk decrypt multiple fields in an object
   * Automatically detects encrypted values (contains ':')
   */
  static async decryptFields<T extends Record<string, any>>(
    data: T,
    fieldsToDecrypt: (keyof T)[]
  ): Promise<T> {
    const decrypted = { ...data };

    for (const field of fieldsToDecrypt) {
      const value = data[field];
      if (typeof value === 'string' && value.includes(':')) {
        decrypted[field] = await this.decrypt(value) as any;
      }
    }

    return decrypted;
  }

  /**
   * Clear master key from memory (use on logout)
   */
  static clearMasterKey(): void {
    this.masterKey = null;
    console.log('[Encryption] Master key cleared from memory');
  }

  /**
   * For admin purposes only: rotate master key
   * WARNING: This will make all existing encrypted data unreadable!
   */
  static async rotateMasterKey(): Promise<void> {
    await SecureStore.deleteItemAsync(MASTER_KEY_STORAGE_KEY);
    this.masterKey = null;
    await this.initializeMasterKey();
    console.warn('[Encryption] Master key rotated - all existing encrypted data is now unreadable!');
  }
}
