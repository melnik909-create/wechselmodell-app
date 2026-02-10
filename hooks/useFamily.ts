import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/auth';
import type { Child, CustodyPattern, CustodyException, Profile, FamilyMember } from '@/types';

export function useChildren() {
  const { family } = useAuth();
  return useQuery({
    queryKey: ['children', family?.id],
    queryFn: async (): Promise<Child[]> => {
      if (!family) return [];
      const { data, error } = await supabase
        .from('children')
        .select('*')
        .eq('family_id', family.id)
        .order('name');
      if (error) throw error;
      return data ?? [];
    },
    enabled: !!family,
  });
}

export function useCustodyPattern() {
  const { family } = useAuth();
  return useQuery({
    queryKey: ['custody_pattern', family?.id],
    queryFn: async (): Promise<CustodyPattern | null> => {
      if (!family) return null;
      const { data, error } = await supabase
        .from('custody_patterns')
        .select('*')
        .eq('family_id', family.id)
        .eq('is_active', true)
        .single();
      if (error && error.code !== 'PGRST116') throw error;
      return data;
    },
    enabled: !!family,
  });
}

export function useCustodyExceptions(startDate?: string, endDate?: string) {
  const { family } = useAuth();
  return useQuery({
    queryKey: ['custody_exceptions', family?.id, startDate, endDate],
    queryFn: async (): Promise<CustodyException[]> => {
      if (!family) return [];
      let query = supabase
        .from('custody_exceptions')
        .select('*')
        .eq('family_id', family.id);

      if (startDate) query = query.gte('date', startDate);
      if (endDate) query = query.lte('date', endDate);

      const { data, error } = await query.order('date');
      if (error) throw error;
      return data ?? [];
    },
    enabled: !!family,
  });
}

export function useFamilyMembers() {
  const { family } = useAuth();
  return useQuery({
    queryKey: ['family_members', family?.id],
    queryFn: async (): Promise<(FamilyMember & { profile: Profile })[]> => {
      if (!family) return [];
      const { data, error } = await supabase
        .from('family_members')
        .select('*, profiles(*)')
        .eq('family_id', family.id);
      if (error) throw error;
      return (data ?? []).map((m: any) => ({
        ...m,
        profile: m.profiles,
      }));
    },
    enabled: !!family,
  });
}
