import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/auth';
import type { Document, DocumentType, DocumentHolder } from '@/types';

/**
 * Get all documents for the current family
 */
export function useDocuments() {
  const { family } = useAuth();
  return useQuery({
    queryKey: ['documents', family?.id],
    queryFn: async (): Promise<Document[]> => {
      if (!family) return [];
      const { data, error } = await supabase
        .from('documents')
        .select('*')
        .eq('family_id', family.id)
        .order('document_type', { ascending: true });
      if (error) throw error;
      return data ?? [];
    },
    enabled: !!family,
  });
}

/**
 * Get documents for a specific child
 */
export function useChildDocuments(childId: string | null) {
  const { family } = useAuth();
  return useQuery({
    queryKey: ['documents', family?.id, 'child', childId],
    queryFn: async (): Promise<Document[]> => {
      if (!family || !childId) return [];
      const { data, error } = await supabase
        .from('documents')
        .select('*')
        .eq('family_id', family.id)
        .eq('child_id', childId)
        .order('document_type', { ascending: true });
      if (error) throw error;
      return data ?? [];
    },
    enabled: !!family && !!childId,
  });
}

/**
 * Add a new document
 */
export function useAddDocument() {
  const { family } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (document: Omit<Document, 'id' | 'family_id' | 'created_at' | 'updated_at'>) => {
      if (!family) throw new Error('Keine Familie');
      const { data, error } = await supabase
        .from('documents')
        .insert({
          ...document,
          family_id: family.id,
        })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['documents'] });
    },
  });
}

/**
 * Update document holder
 */
export function useUpdateDocumentHolder() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, held_by }: { id: string; held_by: DocumentHolder }) => {
      const { data, error } = await supabase
        .from('documents')
        .update({ held_by })
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['documents'] });
    },
  });
}

/**
 * Update an existing document
 */
export function useUpdateDocument() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      updates,
    }: {
      id: string;
      updates: Partial<Omit<Document, 'id' | 'family_id' | 'created_at' | 'updated_at'>>;
    }) => {
      const { data, error } = await supabase
        .from('documents')
        .update(updates)
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['documents'] });
    },
  });
}

/**
 * Delete a document
 */
export function useDeleteDocument() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (documentId: string) => {
      const { error } = await supabase.from('documents').delete().eq('id', documentId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['documents'] });
    },
  });
}
