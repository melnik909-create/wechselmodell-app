import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from './supabase';
import { EncryptionService } from './encryption';
import { ENCRYPTED_FIELDS } from './encryption-config';

/**
 * Data Migration Service
 * One-time migration: Encrypt existing plaintext data in the database
 *
 * This service:
 * 1. Reads existing plaintext data from the database
 * 2. Encrypts sensitive fields using EncryptionService
 * 3. Writes encrypted data to *_enc columns (keeps old columns for rollback)
 * 4. Marks migration as complete in AsyncStorage
 *
 * Migration is idempotent - can be safely run multiple times.
 */
export class DataMigrationService {

  /**
   * Migrate children data to encrypted columns
   */
  static async migrateChildren(familyId: string): Promise<void> {
    console.log('[Migration] Starting children migration for family:', familyId);

    // Fetch all children for this family
    const { data: children, error: fetchError } = await supabase
      .from('children')
      .select('*')
      .eq('family_id', familyId);

    if (fetchError) {
      console.error('[Migration] Failed to fetch children:', fetchError);
      throw fetchError;
    }

    if (!children || children.length === 0) {
      console.log('[Migration] No children to migrate');
      return;
    }

    let migratedCount = 0;
    let skippedCount = 0;

    // Encrypt and update each child
    for (const child of children) {
      // Only migrate if encrypted columns are empty (prevent double-encryption)
      if (child.passport_number_enc) {
        console.log(`[Migration] Child ${child.id} already migrated, skipping`);
        skippedCount++;
        continue;
      }

      try {
        const updates: any = {};

        // Encrypt each sensitive field
        for (const field of ENCRYPTED_FIELDS.children) {
          const plaintextValue = child[field];
          if (plaintextValue) {
            updates[`${field}_enc`] = await EncryptionService.encrypt(plaintextValue);
          }
        }

        // Update database with encrypted values
        const { error: updateError } = await supabase
          .from('children')
          .update(updates)
          .eq('id', child.id);

        if (updateError) {
          console.error(`[Migration] Failed to migrate child ${child.id}:`, updateError);
          throw updateError;
        }

        migratedCount++;
        console.log(`[Migration] Child ${child.id} migrated successfully`);
      } catch (error) {
        console.error(`[Migration] Error migrating child ${child.id}:`, error);
        throw error;
      }
    }

    console.log(`[Migration] Children migration completed - Migrated: ${migratedCount}, Skipped: ${skippedCount}`);
  }

  /**
   * Migrate emergency contacts to encrypted columns
   */
  static async migrateEmergencyContacts(familyId: string): Promise<void> {
    console.log('[Migration] Starting emergency contacts migration for family:', familyId);

    // Get all children for this family
    const { data: children } = await supabase
      .from('children')
      .select('id')
      .eq('family_id', familyId);

    if (!children || children.length === 0) {
      console.log('[Migration] No children found, skipping emergency contacts');
      return;
    }

    const childIds = children.map(c => c.id);

    // Fetch emergency contacts for these children
    const { data: contacts, error: fetchError } = await supabase
      .from('emergency_contacts')
      .select('*')
      .in('child_id', childIds);

    if (fetchError) {
      console.error('[Migration] Failed to fetch emergency contacts:', fetchError);
      throw fetchError;
    }

    if (!contacts || contacts.length === 0) {
      console.log('[Migration] No emergency contacts to migrate');
      return;
    }

    let migratedCount = 0;
    let skippedCount = 0;

    for (const contact of contacts) {
      if (contact.phone_enc) {
        skippedCount++;
        continue; // Already migrated
      }

      try {
        const { error } = await supabase
          .from('emergency_contacts')
          .update({
            phone_enc: await EncryptionService.encrypt(contact.phone),
          })
          .eq('id', contact.id);

        if (error) {
          console.error(`[Migration] Failed to migrate emergency contact ${contact.id}:`, error);
          throw error;
        }

        migratedCount++;
      } catch (error) {
        console.error(`[Migration] Error migrating emergency contact ${contact.id}:`, error);
        throw error;
      }
    }

    console.log(`[Migration] Emergency contacts migration completed - Migrated: ${migratedCount}, Skipped: ${skippedCount}`);
  }

  /**
   * Migrate contacts to encrypted columns
   */
  static async migrateContacts(familyId: string): Promise<void> {
    console.log('[Migration] Starting contacts migration for family:', familyId);

    const { data: contacts, error: fetchError } = await supabase
      .from('contacts')
      .select('*')
      .eq('family_id', familyId);

    if (fetchError) {
      console.error('[Migration] Failed to fetch contacts:', fetchError);
      throw fetchError;
    }

    if (!contacts || contacts.length === 0) {
      console.log('[Migration] No contacts to migrate');
      return;
    }

    let migratedCount = 0;
    let skippedCount = 0;

    for (const contact of contacts) {
      if (contact.phone_enc) {
        skippedCount++;
        continue; // Already migrated
      }

      try {
        const updates: any = {};

        // Encrypt each sensitive field
        for (const field of ENCRYPTED_FIELDS.contacts) {
          const plaintextValue = contact[field];
          if (plaintextValue) {
            updates[`${field}_enc`] = await EncryptionService.encrypt(plaintextValue);
          }
        }

        const { error } = await supabase
          .from('contacts')
          .update(updates)
          .eq('id', contact.id);

        if (error) {
          console.error(`[Migration] Failed to migrate contact ${contact.id}:`, error);
          throw error;
        }

        migratedCount++;
      } catch (error) {
        console.error(`[Migration] Error migrating contact ${contact.id}:`, error);
        throw error;
      }
    }

    console.log(`[Migration] Contacts migration completed - Migrated: ${migratedCount}, Skipped: ${skippedCount}`);
  }

  /**
   * Run full migration for a family
   * This is the main entry point - call this to migrate all data
   */
  static async migrateFamily(familyId: string): Promise<void> {
    console.log('[Migration] ========================================');
    console.log('[Migration] Starting full migration for family:', familyId);
    console.log('[Migration] ========================================');

    try {
      // Ensure master key is initialized
      await EncryptionService.initializeMasterKey();

      // Migrate all tables sequentially
      await this.migrateChildren(familyId);
      await this.migrateEmergencyContacts(familyId);
      await this.migrateContacts(familyId);

      // Mark migration as complete
      await AsyncStorage.setItem(
        `migration_completed_${familyId}`,
        new Date().toISOString()
      );

      console.log('[Migration] ========================================');
      console.log('[Migration] ✅ Full migration completed successfully!');
      console.log('[Migration] ========================================');
    } catch (error) {
      console.error('[Migration] ========================================');
      console.error('[Migration] ❌ Migration failed:', error);
      console.error('[Migration] ========================================');
      throw error;
    }
  }

  /**
   * Check if migration has been completed for this family
   */
  static async isMigrationComplete(familyId: string): Promise<boolean> {
    try {
      const timestamp = await AsyncStorage.getItem(`migration_completed_${familyId}`);
      const isComplete = !!timestamp;

      if (isComplete) {
        console.log(`[Migration] Migration already completed for family ${familyId} at ${timestamp}`);
      } else {
        console.log(`[Migration] Migration not yet completed for family ${familyId}`);
      }

      return isComplete;
    } catch (error) {
      console.error('[Migration] Error checking migration status:', error);
      return false;
    }
  }

  /**
   * Reset migration status (for testing/debugging only)
   * WARNING: This will cause migration to run again on next login
   */
  static async resetMigrationStatus(familyId: string): Promise<void> {
    await AsyncStorage.removeItem(`migration_completed_${familyId}`);
    console.warn(`[Migration] Migration status reset for family ${familyId}`);
  }
}
