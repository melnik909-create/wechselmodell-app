import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/auth';
import { notifyExceptionStatusChanged } from '@/lib/notifications';
import { formatFullDate } from '@/lib/date-utils';
import { EncryptionService } from '@/lib/encryption';
import { ENCRYPTED_FIELDS } from '@/lib/encryption-config';
import type { Child, CustodyPattern, CustodyException, Profile, FamilyMember, Event, EventAttendance, AttendanceStatus } from '@/types';

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
      if (!data) return [];

      // Decrypt sensitive fields client-side
      const decrypted = await Promise.all(
        data.map(async (child: any) => {
          const decryptedChild: any = { ...child };

          // Decrypt each sensitive field
          for (const field of ENCRYPTED_FIELDS.children) {
            const encField = `${field}_enc`;
            if (child[encField]) {
              // Read from encrypted column
              decryptedChild[field] = await EncryptionService.decrypt(child[encField]);
            } else if (child[field]) {
              // Fallback: old data not yet migrated
              decryptedChild[field] = child[field];
            }
          }

          return decryptedChild as Child;
        })
      );

      return decrypted;
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

export function useAcceptException() {
  const { family } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (exceptionId: string) => {
      // Get exception details before updating
      const { data: exception } = await supabase
        .from('custody_exceptions')
        .select('*, proposed_by')
        .eq('id', exceptionId)
        .single();

      // Update exception status
      const { error } = await supabase
        .from('custody_exceptions')
        .update({
          status: 'accepted',
          responded_at: new Date().toISOString(),
        })
        .eq('id', exceptionId);
      if (error) throw error;

      // Send notification to proposer
      if (exception) {
        const formattedDate = formatFullDate(new Date(exception.date + 'T00:00:00'));
        notifyExceptionStatusChanged(exception.proposed_by, 'accepted', formattedDate).catch(
          (error) => console.error('Failed to send notification:', error)
        );
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['custody_exceptions', family?.id] });
    },
  });
}

export function useRejectException() {
  const { family } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (exceptionId: string) => {
      // Get exception details before updating
      const { data: exception } = await supabase
        .from('custody_exceptions')
        .select('*, proposed_by')
        .eq('id', exceptionId)
        .single();

      // Update exception status
      const { error } = await supabase
        .from('custody_exceptions')
        .update({
          status: 'rejected',
          responded_at: new Date().toISOString(),
        })
        .eq('id', exceptionId);
      if (error) throw error;

      // Send notification to proposer
      if (exception) {
        const formattedDate = formatFullDate(new Date(exception.date + 'T00:00:00'));
        notifyExceptionStatusChanged(exception.proposed_by, 'rejected', formattedDate).catch(
          (error) => console.error('Failed to send notification:', error)
        );
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['custody_exceptions', family?.id] });
    },
  });
}

export function useEvents(startDate?: string, endDate?: string) {
  const { family } = useAuth();
  return useQuery({
    queryKey: ['events', family?.id, startDate, endDate],
    queryFn: async (): Promise<Event[]> => {
      if (!family) return [];
      let query = supabase
        .from('events')
        .select('*')
        .eq('family_id', family.id);

      if (startDate) query = query.gte('date', startDate);
      if (endDate) query = query.lte('date', endDate);

      const { data, error } = await query.order('date').order('time');
      if (error) throw error;
      return data ?? [];
    },
    enabled: !!family,
  });
}

export function useAddEvent() {
  const { family, user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (event: Omit<Event, 'id' | 'family_id' | 'created_by' | 'created_at' | 'updated_at'>) => {
      if (!family || !user) throw new Error('No family or user');
      const { error } = await supabase.from('events').insert({
        ...event,
        family_id: family.id,
        created_by: user.id,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['events', family?.id] });
    },
  });
}

export function useDeleteEvent() {
  const { family } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (eventId: string) => {
      const { error } = await supabase.from('events').delete().eq('id', eventId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['events', family?.id] });
    },
  });
}

export function useUpdatePattern() {
  const { family } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (newPattern: {
      pattern_type: CustodyPattern['pattern_type'];
      starting_parent: CustodyPattern['starting_parent'];
      start_date: string;
      handover_day?: number | null;
    }) => {
      if (!family) throw new Error('No family');

      // Deactivate all current patterns
      const { error: deactivateError } = await supabase
        .from('custody_patterns')
        .update({ is_active: false })
        .eq('family_id', family.id)
        .eq('is_active', true);

      if (deactivateError) throw deactivateError;

      // Insert new pattern
      const { error: insertError } = await supabase.from('custody_patterns').insert({
        family_id: family.id,
        pattern_type: newPattern.pattern_type,
        starting_parent: newPattern.starting_parent,
        start_date: newPattern.start_date,
        is_active: true,
        custom_sequence: null,
        handover_day: newPattern.handover_day ?? null,
      });

      if (insertError) throw insertError;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['custody_pattern', family?.id] });
    },
  });
}

export function useUpdateHandoverDay() {
  const { family } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (handoverDay: number) => {
      if (!family) throw new Error('No family');

      // Update handover_day for active pattern
      const { error } = await supabase
        .from('custody_patterns')
        .update({ handover_day: handoverDay })
        .eq('family_id', family.id)
        .eq('is_active', true);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['custody_pattern', family?.id] });
    },
  });
}

export function useEventAttendances(eventId: string) {
  return useQuery({
    queryKey: ['event_attendances', eventId],
    queryFn: async (): Promise<EventAttendance[]> => {
      if (!eventId) return [];
      const { data, error } = await supabase
        .from('event_attendances')
        .select('*')
        .eq('event_id', eventId);
      if (error) throw error;
      return data ?? [];
    },
    enabled: !!eventId,
  });
}

export function useSetAttendance() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ eventId, status }: { eventId: string; status: AttendanceStatus }) => {
      if (!user) throw new Error('No user');

      // Upsert attendance
      const { error } = await supabase
        .from('event_attendances')
        .upsert({
          event_id: eventId,
          user_id: user.id,
          status,
          updated_at: new Date().toISOString(),
        }, {
          onConflict: 'event_id,user_id',
        });
      if (error) throw error;
    },
    onSuccess: (_, { eventId }) => {
      queryClient.invalidateQueries({ queryKey: ['event_attendances', eventId] });
    },
  });
}

export function useUpdateFamily() {
  const { family, refreshFamily } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (updates: { parent_a_label?: string | null; parent_b_label?: string | null }) => {
      if (!family) throw new Error('No family');

      const { error } = await supabase
        .from('families')
        .update(updates)
        .eq('id', family.id);

      if (error) throw error;
    },
    onSuccess: async () => {
      await refreshFamily();
      queryClient.invalidateQueries({ queryKey: ['family'] });
    },
  });
}
