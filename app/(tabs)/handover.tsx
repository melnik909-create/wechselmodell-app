import { useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { useAuth } from '@/lib/auth';
import { supabase } from '@/lib/supabase';
import { useFamilyMembers, useChildren } from '@/hooks/useFamily';
import { formatFullDate, formatDayMonth } from '@/lib/date-utils';
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
      const otherMember = members?.find(m => m.user_id !== user.id);

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
      const defaultItems: { handover_id: string; category: HandoverItemCategory; description: string; sort_order: number }[] = [
        { handover_id: data.id, category: 'clothing', description: 'Wechselkleidung', sort_order: 0 },
        { handover_id: data.id, category: 'medication', description: 'Medikamente', sort_order: 1 },
        { handover_id: data.id, category: 'homework', description: 'Hausaufgaben / Schulsachen', sort_order: 2 },
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
    const member = members?.find(m => m.user_id === userId);
    return member?.profile?.display_name ?? 'Unbekannt';
  };

  if (selectedHandover && items) {
    return (
      <SafeAreaView className="flex-1 bg-gray-50" edges={['top']}>
        <View className="flex-row items-center px-4 py-3 bg-white border-b border-gray-100">
          <TouchableOpacity onPress={() => setSelectedHandover(null)} className="mr-3">
            <MaterialCommunityIcons name="arrow-left" size={24} color={COLORS.text} />
          </TouchableOpacity>
          <Text className="text-lg font-semibold text-gray-900">Uebergabe-Checkliste</Text>
        </View>
        <ScrollView className="flex-1 px-4 py-4">
          {items.map(item => (
            <Card key={item.id} className="mb-2">
              <TouchableOpacity
                onPress={() => toggleItem.mutate({ itemId: item.id, checked: !item.is_checked })}
                className="flex-row items-center gap-3"
              >
                <MaterialCommunityIcons
                  name={item.is_checked ? 'checkbox-marked-circle' : 'checkbox-blank-circle-outline'}
                  size={24}
                  color={item.is_checked ? '#10B981' : COLORS.textMuted}
                />
                <View className="flex-1">
                  <Text className={`text-base ${item.is_checked ? 'text-gray-400 line-through' : 'text-gray-900'}`}>
                    {item.description}
                  </Text>
                  <Text className="text-xs text-gray-400">
                    {HANDOVER_CATEGORY_LABELS[item.category]}
                  </Text>
                </View>
              </TouchableOpacity>
            </Card>
          ))}
        </ScrollView>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-gray-50" edges={['top']}>
      <ScrollView className="flex-1 px-4 py-4">
        <Button
          title="Neue Uebergabe erstellen"
          onPress={() => createHandover.mutate()}
          loading={createHandover.isPending}
          icon={<MaterialCommunityIcons name="plus" size={20} color="#fff" />}
        />

        <View className="mt-4">
          {handovers?.map(handover => (
            <Card
              key={handover.id}
              className="mb-3"
              onPress={() => setSelectedHandover(handover.id)}
            >
              <View className="flex-row items-center justify-between">
                <View>
                  <Text className="text-base font-semibold text-gray-900">
                    {formatDayMonth(new Date(handover.date + 'T00:00:00'))}
                  </Text>
                  <Text className="text-sm text-gray-500">
                    {memberName(handover.from_parent)} → {memberName(handover.to_parent)}
                  </Text>
                </View>
                <View className={`px-3 py-1 rounded-full ${
                  handover.status === 'completed' ? 'bg-green-100' : 'bg-yellow-100'
                }`}>
                  <Text className={`text-xs font-medium ${
                    handover.status === 'completed' ? 'text-green-700' : 'text-yellow-700'
                  }`}>
                    {handover.status === 'completed' ? 'Erledigt' : 'Offen'}
                  </Text>
                </View>
              </View>
            </Card>
          ))}

          {(!handovers || handovers.length === 0) && !isLoading && (
            <View className="items-center py-12">
              <MaterialCommunityIcons name="swap-horizontal" size={48} color={COLORS.textMuted} />
              <Text className="text-base text-gray-400 mt-2">Noch keine Uebergaben</Text>
            </View>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
