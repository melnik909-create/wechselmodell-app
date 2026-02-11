import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/auth';
import type { SchoolTask, TaskStatus } from '@/types';

export function useSchoolTasks(childId?: string) {
  const { family } = useAuth();
  return useQuery({
    queryKey: ['school_tasks', family?.id, childId],
    queryFn: async (): Promise<SchoolTask[]> => {
      if (!family) return [];
      let query = supabase
        .from('school_tasks')
        .select('*')
        .eq('family_id', family.id);

      if (childId) query = query.eq('child_id', childId);

      const { data, error } = await query.order('due_date', { ascending: true, nullsFirst: false });
      if (error) throw error;
      return data ?? [];
    },
    enabled: !!family,
  });
}

export function useAddSchoolTask() {
  const { family, user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (task: Omit<SchoolTask, 'id' | 'family_id' | 'created_by' | 'created_at' | 'updated_at' | 'completed_at'>) => {
      if (!family || !user) throw new Error('No family or user');
      const { error } = await supabase.from('school_tasks').insert({
        ...task,
        family_id: family.id,
        created_by: user.id,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['school_tasks', family?.id] });
    },
  });
}

export function useUpdateSchoolTask() {
  const { family } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ taskId, updates }: { taskId: string; updates: Partial<SchoolTask> }) => {
      const { error } = await supabase
        .from('school_tasks')
        .update({
          ...updates,
          updated_at: new Date().toISOString(),
        })
        .eq('id', taskId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['school_tasks', family?.id] });
    },
  });
}

export function useToggleTaskStatus() {
  const { family } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ taskId, status }: { taskId: string; status: TaskStatus }) => {
      const updates: Partial<SchoolTask> = {
        status,
        completed_at: status === 'completed' ? new Date().toISOString() : null,
        updated_at: new Date().toISOString(),
      };
      const { error } = await supabase
        .from('school_tasks')
        .update(updates)
        .eq('id', taskId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['school_tasks', family?.id] });
    },
  });
}

export function useDeleteSchoolTask() {
  const { family } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (taskId: string) => {
      const { error } = await supabase.from('school_tasks').delete().eq('id', taskId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['school_tasks', family?.id] });
    },
  });
}
