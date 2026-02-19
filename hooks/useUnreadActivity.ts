import { useEffect, useMemo, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/auth';

export type UnreadActivitySummary = {
  events: number;
  expenses: number;
  exceptionsProposed: number;
  exceptionsResponded: number;
  schoolTasks: number;
  total: number;
};

function emptySummary(): UnreadActivitySummary {
  return {
    events: 0,
    expenses: 0,
    exceptionsProposed: 0,
    exceptionsResponded: 0,
    schoolTasks: 0,
    total: 0,
  };
}

function storageKey(familyId: string, userId: string) {
  return `home_activity_last_seen:${familyId}:${userId}`;
}

async function loadOrInitLastSeen(key: string): Promise<string> {
  const existing = await AsyncStorage.getItem(key);
  if (existing) return existing;
  const nowIso = new Date().toISOString();
  await AsyncStorage.setItem(key, nowIso);
  return nowIso;
}

async function safeCount(query: any): Promise<number> {
  try {
    const { count, error } = await query;
    if (error) return 0;
    return count ?? 0;
  } catch {
    return 0;
  }
}

/**
 * Unread activity since the last time the user marked Home "as seen".
 *
 * MVP design:
 * - Stores last-seen timestamp client-side (AsyncStorage), per family + user.
 * - Counts new/updated rows by the other parent across a few core tables.
 * - If a table doesn't exist in the user's Supabase project yet, it degrades to 0.
 */
export function useUnreadActivity() {
  const { family, user } = useAuth();
  const queryClient = useQueryClient();
  const [lastSeenAt, setLastSeenAt] = useState<string | null>(null);

  useEffect(() => {
    if (!family?.id || !user?.id) {
      setLastSeenAt(null);
      return;
    }

    const key = storageKey(family.id, user.id);
    loadOrInitLastSeen(key)
      .then(setLastSeenAt)
      .catch(() => setLastSeenAt(new Date().toISOString()));
  }, [family?.id, user?.id]);

  const query = useQuery({
    queryKey: ['unread_activity', family?.id, user?.id, lastSeenAt],
    enabled: !!family?.id && !!user?.id && !!lastSeenAt,
    queryFn: async (): Promise<UnreadActivitySummary> => {
      if (!family?.id || !user?.id || !lastSeenAt) return emptySummary();

      const familyId = family.id;
      const userId = user.id;

      const [events, expenses, exceptionsProposed, exceptionsResponded, schoolTasks] =
        await Promise.all([
          safeCount(
            supabase
              .from('events')
              .select('id', { count: 'exact', head: true })
              .eq('family_id', familyId)
              .neq('created_by', userId)
              .or(`created_at.gt.${lastSeenAt},updated_at.gt.${lastSeenAt}`)
          ),
          safeCount(
            supabase
              .from('expenses')
              .select('id', { count: 'exact', head: true })
              .eq('family_id', familyId)
              .neq('paid_by', userId)
              .gt('created_at', lastSeenAt)
          ),
          safeCount(
            supabase
              .from('custody_exceptions')
              .select('id', { count: 'exact', head: true })
              .eq('family_id', familyId)
              .neq('proposed_by', userId)
              .gt('created_at', lastSeenAt)
          ),
          safeCount(
            supabase
              .from('custody_exceptions')
              .select('id', { count: 'exact', head: true })
              .eq('family_id', familyId)
              .eq('proposed_by', userId)
              .gt('responded_at', lastSeenAt)
          ),
          safeCount(
            supabase
              .from('school_tasks')
              .select('id', { count: 'exact', head: true })
              .eq('family_id', familyId)
              .neq('created_by', userId)
              .or(`created_at.gt.${lastSeenAt},updated_at.gt.${lastSeenAt}`)
          ),
        ]);

      const total = events + expenses + exceptionsProposed + exceptionsResponded + schoolTasks;
      return { events, expenses, exceptionsProposed, exceptionsResponded, schoolTasks, total };
    },
  });

  const markAllRead = async () => {
    if (!family?.id || !user?.id) return;
    const key = storageKey(family.id, user.id);
    const nowIso = new Date().toISOString();
    await AsyncStorage.setItem(key, nowIso);
    setLastSeenAt(nowIso);
    queryClient.invalidateQueries({ queryKey: ['unread_activity', family.id, user.id] });
  };

  const summary = useMemo(() => query.data ?? emptySummary(), [query.data]);

  return {
    lastSeenAt,
    summary,
    markAllRead,
    ...query,
  };
}
