import { useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/lib/auth';
import { supabase } from '@/lib/supabase';
import { useFamilyMembers } from '@/hooks/useFamily';
import { formatDayMonth } from '@/lib/date-utils';
import { COLORS } from '@/lib/constants';
import { HANDOVER_CATEGORY_LABELS, type HandoverItemCategory } from '@/types';
import type { Handover, HandoverItem } from '@/types';

export default function HandoverScreen() {
  const { family, user } = useAuth();
  const { data: members } = useFamilyMembers();
  const queryClient = useQueryClient();

  const { data: handovers, isLoading } = useQuery({
    queryKey: ['handovers', family?.id],
    queryFn: async (): Promise<Handover[]> => {
      if (!family) return [];
      const { data, error } = await supabase
        .from('handovers')
        .select('*')
        .eq('family_id', family.id)
        .order('date', { ascending: false })
        .limit(20);
      if (error) throw error;
      return data ?? [];
    },
    enabled: !!family,
  });

  const [selectedHandover, setSelectedHandover] = useState<string | null>(null);

  const { data: items } = useQuery({
    queryKey: ['handover_items', selectedHandover],
    queryFn: async (): Promise<HandoverItem[]> => {
      if (!selectedHandover) return [];
      const { data, error } = await supabase
        .from('handover_items')
        .select('*')
        .eq('handover_id', selectedHandover)
        .order('sort_order');
      if (error) throw error;
      return data ?? [];
    },
    enabled: !!selectedHandover,
  });

  const toggleItem = useMutation({
    mutationFn: async ({ itemId, checked }: { itemId: string; checked: boolean }) => {
      const { error } = await supabase
        .from('handover_items')
        .update({ is_checked: checked })
        .eq('id', itemId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['handover_items', selectedHandover] });
    },
  });

  const createHandover = useMutation({
    mutationFn: async () => {
      if (!family || !user) throw new Error('Nicht angemeldet');
      const otherMember = members?.find((m) => m.user_id !== user.id);

      const { data, error } = await supabase
        .from('handovers')
        .insert({
          family_id: family.id,
          date: new Date().toISOString().split('T')[0],
          from_parent: user.id,
          to_parent: otherMember?.user_id ?? user.id,
          status: 'pending',
        })
        .select()
        .single();
      if (error) throw error;

      // Create default checklist items
      const defaultItems: {
        handover_id: string;
        category: HandoverItemCategory;
        description: string;
        sort_order: number;
      }[] = [
        { handover_id: data.id, category: 'clothing', description: 'Wechselkleidung', sort_order: 0 },
        { handover_id: data.id, category: 'medication', description: 'Medikamente', sort_order: 1 },
        {
          handover_id: data.id,
          category: 'homework',
          description: 'Hausaufgaben / Schulsachen',
          sort_order: 2,
        },
        { handover_id: data.id, category: 'toy', description: 'Lieblingsspielzeug', sort_order: 3 },
      ];
      await supabase.from('handover_items').insert(defaultItems);

      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['handovers', family?.id] });
      setSelectedHandover(data.id);
    },
  });

  const memberName = (userId: string) => {
    const member = members?.find((m) => m.user_id === userId);
    return member?.profile?.display_name ?? 'Unbekannt';
  };

  if (selectedHandover && items) {
    return (
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => setSelectedHandover(null)} style={styles.backButton}>
            <MaterialCommunityIcons name="arrow-left" size={24} color={COLORS.text} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Uebergabe-Checkliste</Text>
        </View>
        <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
          {items.map((item) => (
            <TouchableOpacity
              key={item.id}
              onPress={() => toggleItem.mutate({ itemId: item.id, checked: !item.is_checked })}
              style={styles.checklistItem}
              activeOpacity={0.7}
            >
              <View style={styles.checklistRow}>
                <MaterialCommunityIcons
                  name={item.is_checked ? 'checkbox-marked-circle' : 'checkbox-blank-circle-outline'}
                  size={24}
                  color={item.is_checked ? '#10B981' : COLORS.textMuted}
                />
                <View style={styles.checklistText}>
                  <Text style={[styles.checklistDescription, item.is_checked && styles.checkedText]}>
                    {item.description}
                  </Text>
                  <Text style={styles.checklistCategory}>
                    {HANDOVER_CATEGORY_LABELS[item.category]}
                  </Text>
                </View>
              </View>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
        <TouchableOpacity
          style={styles.createButton}
          onPress={() => createHandover.mutate()}
          disabled={createHandover.isPending}
          activeOpacity={0.7}
        >
          {createHandover.isPending ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <>
              <MaterialCommunityIcons name="plus" size={20} color="#fff" />
              <Text style={styles.createButtonText}>Neue Uebergabe erstellen</Text>
            </>
          )}
        </TouchableOpacity>

        <View style={styles.handoverList}>
          {handovers?.map((handover) => (
            <TouchableOpacity
              key={handover.id}
              style={styles.handoverCard}
              onPress={() => setSelectedHandover(handover.id)}
              activeOpacity={0.7}
            >
              <View style={styles.handoverRow}>
                <View>
                  <Text style={styles.handoverDate}>
                    {formatDayMonth(new Date(handover.date + 'T00:00:00'))}
                  </Text>
                  <Text style={styles.handoverParents}>
                    {memberName(handover.from_parent)} → {memberName(handover.to_parent)}
                  </Text>
                </View>
                <View
                  style={[
                    styles.statusBadge,
                    handover.status === 'completed' ? styles.statusCompleted : styles.statusPending,
                  ]}
                >
                  <Text
                    style={[
                      styles.statusText,
                      handover.status === 'completed'
                        ? styles.statusTextCompleted
                        : styles.statusTextPending,
                    ]}
                  >
                    {handover.status === 'completed' ? 'Erledigt' : 'Offen'}
                  </Text>
                </View>
              </View>
            </TouchableOpacity>
          ))}

          {(!handovers || handovers.length === 0) && !isLoading && (
            <View style={styles.emptyState}>
              <MaterialCommunityIcons name="swap-horizontal" size={48} color={COLORS.textMuted} />
              <Text style={styles.emptyText}>Noch keine Uebergaben</Text>
            </View>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingVertical: 16,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  backButton: {
    marginRight: 12,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111',
  },
  checklistItem: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  checklistRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  checklistText: {
    flex: 1,
  },
  checklistDescription: {
    fontSize: 16,
    color: '#111',
  },
  checkedText: {
    color: '#9CA3AF',
    textDecorationLine: 'line-through',
  },
  checklistCategory: {
    fontSize: 12,
    color: '#9CA3AF',
  },
  createButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#4F46E5',
    padding: 16,
    borderRadius: 8,
    marginBottom: 16,
    gap: 8,
  },
  createButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  handoverList: {
    marginTop: 0,
  },
  handoverCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  handoverRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  handoverDate: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111',
  },
  handoverParents: {
    fontSize: 14,
    color: '#6B7280',
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusCompleted: {
    backgroundColor: '#D1FAE5',
  },
  statusPending: {
    backgroundColor: '#FEF3C7',
  },
  statusText: {
    fontSize: 12,
    fontWeight: '500',
  },
  statusTextCompleted: {
    color: '#059669',
  },
  statusTextPending: {
    color: '#D97706',
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 48,
  },
  emptyText: {
    fontSize: 16,
    color: '#9CA3AF',
    marginTop: 8,
  },
});
