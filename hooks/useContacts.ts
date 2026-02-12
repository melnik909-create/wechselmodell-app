import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/auth';
import { EncryptionService } from '@/lib/encryption';
import { ENCRYPTED_FIELDS } from '@/lib/encryption-config';
import type { Contact } from '@/types';

/**
 * Get all contacts for the current family
 */
export function useContacts() {
  const { family } = useAuth();
  return useQuery({
    queryKey: ['contacts', family?.id],
    queryFn: async (): Promise<Contact[]> => {
      if (!family) return [];
      const { data, error } = await supabase
        .from('contacts')
        .select('*')
        .eq('family_id', family.id)
        .order('name', { ascending: true });
      if (error) throw error;
      if (!data) return [];

      // Decrypt sensitive fields
      const decrypted = await Promise.all(
        data.map(async (contact: any) => {
          const decryptedContact: any = { ...contact };

          for (const field of ENCRYPTED_FIELDS.contacts) {
            const encField = `${field}_enc`;
            if (contact[encField]) {
              decryptedContact[field] = await EncryptionService.decrypt(contact[encField]);
            } else if (contact[field]) {
              decryptedContact[field] = contact[field]; // Fallback
            }
          }

          return decryptedContact as Contact;
        })
      );

      return decrypted;
    },
    enabled: !!family,
  });
}

/**
 * Get contacts for a specific child
 */
export function useChildContacts(childId: string | null) {
  const { family } = useAuth();
  return useQuery({
    queryKey: ['contacts', family?.id, 'child', childId],
    queryFn: async (): Promise<Contact[]> => {
      if (!family || !childId) return [];
      const { data, error } = await supabase
        .from('contacts')
        .select('*')
        .eq('family_id', family.id)
        .eq('child_id', childId)
        .order('name', { ascending: true });
      if (error) throw error;
      if (!data) return [];

      // Decrypt sensitive fields
      const decrypted = await Promise.all(
        data.map(async (contact: any) => {
          const decryptedContact: any = { ...contact };

          for (const field of ENCRYPTED_FIELDS.contacts) {
            const encField = `${field}_enc`;
            if (contact[encField]) {
              decryptedContact[field] = await EncryptionService.decrypt(contact[encField]);
            } else if (contact[field]) {
              decryptedContact[field] = contact[field];
            }
          }

          return decryptedContact as Contact;
        })
      );

      return decrypted;
    },
    enabled: !!family && !!childId,
  });
}

/**
 * Add a new contact
 */
export function useAddContact() {
  const { family } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (contact: Omit<Contact, 'id' | 'family_id' | 'created_at' | 'updated_at'>) => {
      if (!family) throw new Error('Keine Familie');

      // Encrypt sensitive fields
      const encrypted: any = { ...contact };
      for (const field of ENCRYPTED_FIELDS.contacts) {
        const value = contact[field as keyof typeof contact];
        if (typeof value === 'string') {
          encrypted[`${field}_enc`] = await EncryptionService.encrypt(value);
          delete encrypted[field]; // Don't store plaintext
        }
      }

      const { data, error } = await supabase
        .from('contacts')
        .insert({
          ...encrypted,
          family_id: family.id,
        })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contacts'] });
    },
  });
}

/**
 * Update an existing contact
 */
export function useUpdateContact() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      updates,
    }: {
      id: string;
      updates: Partial<Omit<Contact, 'id' | 'family_id' | 'created_at' | 'updated_at'>>;
    }) => {
      // Encrypt sensitive fields
      const encrypted: any = { ...updates };
      for (const field of ENCRYPTED_FIELDS.contacts) {
        const value = updates[field as keyof typeof updates];
        if (value !== undefined) {
          if (typeof value === 'string') {
            encrypted[`${field}_enc`] = await EncryptionService.encrypt(value);
          } else {
            // null value - store as null in encrypted column
            encrypted[`${field}_enc`] = null;
          }
          delete encrypted[field]; // Don't update plaintext column
        }
      }

      const { data, error } = await supabase
        .from('contacts')
        .update(encrypted)
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contacts'] });
    },
  });
}

/**
 * Delete a contact
 */
export function useDeleteContact() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (contactId: string) => {
      const { error } = await supabase.from('contacts').delete().eq('id', contactId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contacts'] });
    },
  });
}
