import { useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator, StyleSheet, Alert, Image } from 'react-native';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/lib/auth';
import { useEntitlements } from '@/hooks/useEntitlements';
import { supabase } from '@/lib/supabase';
import { useFamilyMembers } from '@/hooks/useFamily';
import { formatDayMonth } from '@/lib/date-utils';
import { COLORS } from '@/lib/constants';
import { HANDOVER_CATEGORY_LABELS, type HandoverItemCategory } from '@/types';
import type { Handover, HandoverItem } from '@/types';
import ImagePickerButton from '@/components/ImagePickerButton';
import { uploadImage } from '@/lib/image-upload';
import { useResponsive } from '@/hooks/useResponsive';

export default function HandoverScreen() {
  const { family, user } = useAuth();
  const { contentMaxWidth } = useResponsive();
  const { data: entitlements } = useEntitlements();
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
  const [expandedItem, setExpandedItem] = useState<string | null>(null);

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

  // Toggle AN checkbox
  const toggleAN = useMutation({
    mutationFn: async ({ itemId, checked }: { itemId: string; checked: boolean }) => {
      const { error } = await supabase
        .from('handover_items')
        .update({ checked_an: checked })
        .eq('id', itemId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['handover_items', selectedHandover] });
    },
  });

  // Toggle AB checkbox
  const toggleAB = useMutation({
    mutationFn: async ({ itemId, checked }: { itemId: string; checked: boolean }) => {
      const { error } = await supabase
        .from('handover_items')
        .update({ checked_ab: checked })
        .eq('id', itemId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['handover_items', selectedHandover] });
    },
  });

  const updateItemPhoto = useMutation({
    mutationFn: async ({ itemId, photoPath }: { itemId: string; photoPath: string | null }) => {
      const { error } = await supabase
        .from('handover_items')
        .update({ photo_url: photoPath })
        .eq('id', itemId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['handover_items', selectedHandover] });
    },
  });

  const deleteItem = useMutation({
    mutationFn: async (itemId: string) => {
      const { error } = await supabase.from('handover_items').delete().eq('id', itemId);
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

      // Create default checklist items with AN/AB support
      const defaultItems = [
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

  const handlePhotoSelected = async (itemId: string, uri: string) => {
    if (!family) return;

    // Check Cloud Plus entitlement before upload
    if (!entitlements?.canUpload) {
      router.push('/modal/cloud-plus');
      return;
    }

    try {
      // Upload via Edge Function (returns PATH, not URL)
      const photoPath = await uploadImage(uri, 'handover', family.id);
      await updateItemPhoto.mutateAsync({ itemId, photoPath });
      Alert.alert('Erfolg', 'Foto wurde hochgeladen.');
    } catch (error: any) {
      // Handle Cloud Plus requirement error
      if (error.message?.includes('Cloud Plus') ||
          error.message?.includes('402') ||
          error.message?.includes('Payment Required')) {
        router.push('/modal/cloud-plus');
        return;
      }
      Alert.alert('Fehler', error.message || 'Foto konnte nicht hochgeladen werden.');
    }
  };

  const handlePhotoRemoved = async (itemId: string) => {
    try {
      await updateItemPhoto.mutateAsync({ itemId, photoPath: null });
    } catch (error: any) {
      Alert.alert('Fehler', error.message || 'Foto konnte nicht entfernt werden.');
    }
  };

  const handleDeleteItem = (itemId: string, itemName: string) => {
    Alert.alert('Item löschen', `Möchtest du "${itemName}" wirklich löschen?`, [
      { text: 'Abbrechen', style: 'cancel' },
      {
        text: 'Löschen',
        style: 'destructive',
        onPress: () => deleteItem.mutate(itemId),
      },
    ]);
  };

  const memberName = (userId: string) => {
    const member = members?.find((m) => m.user_id === userId);
    return member?.profile?.display_name ?? 'Unbekannt';
  };

  // Checklist detail view with AN/AB checkboxes
  if (selectedHandover && items) {
    return (
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => setSelectedHandover(null)} style={styles.backButton}>
            <MaterialCommunityIcons name="arrow-left" size={24} color={COLORS.text} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Übergabe-Checkliste</Text>
          <TouchableOpacity
            onPress={() => router.push(`/modal/add-handover-item?handoverId=${selectedHandover}`)}
            style={styles.addItemButton}
          >
            <MaterialCommunityIcons name="plus" size={24} color={COLORS.primary} />
          </TouchableOpacity>
        </View>

        {/* AN/AB Legend */}
        <View style={styles.legend}>
          <View style={styles.legendItem}>
            <View style={[styles.legendBox, { backgroundColor: '#10B981' }]} />
            <Text style={styles.legendText}>AN = Abgegeben</Text>
          </View>
          <View style={styles.legendItem}>
            <View style={[styles.legendBox, { backgroundColor: '#3B82F6' }]} />
            <Text style={styles.legendText}>AB = Zurück</Text>
          </View>
        </View>

        <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
          <View style={{ maxWidth: contentMaxWidth, alignSelf: 'center', width: '100%' }}>
          {items.map((item) => (
            <View key={item.id} style={styles.checklistItem}>
              <View style={styles.itemHeader}>
                <View style={styles.itemTitle}>
                  {item.is_custom && item.item_name && (
                    <Text style={styles.itemName}>{item.item_name}</Text>
                  )}
                  <Text style={styles.itemDescription}>{item.description}</Text>
                  <Text style={styles.itemCategory}>
                    {HANDOVER_CATEGORY_LABELS[item.category]}
                  </Text>
                </View>
                {item.is_custom && (
                  <TouchableOpacity
                    onPress={() => handleDeleteItem(item.id, item.item_name || item.description)}
                    style={styles.deleteButton}
                  >
                    <MaterialCommunityIcons name="delete" size={20} color="#EF4444" />
                  </TouchableOpacity>
                )}
              </View>

              {/* AN/AB Checkboxes */}
              <View style={styles.checkboxRow}>
                <TouchableOpacity
                  style={styles.checkboxButton}
                  onPress={() => toggleAN.mutate({ itemId: item.id, checked: !item.checked_an })}
                  activeOpacity={0.7}
                >
                  <MaterialCommunityIcons
                    name={item.checked_an ? 'checkbox-marked' : 'checkbox-blank-outline'}
                    size={28}
                    color={item.checked_an ? '#10B981' : COLORS.textMuted}
                  />
                  <Text style={[styles.checkboxLabel, item.checked_an && styles.checkboxLabelChecked]}>
                    AN
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.checkboxButton}
                  onPress={() => toggleAB.mutate({ itemId: item.id, checked: !item.checked_ab })}
                  activeOpacity={0.7}
                >
                  <MaterialCommunityIcons
                    name={item.checked_ab ? 'checkbox-marked' : 'checkbox-blank-outline'}
                    size={28}
                    color={item.checked_ab ? '#3B82F6' : COLORS.textMuted}
                  />
                  <Text style={[styles.checkboxLabel, item.checked_ab && styles.checkboxLabelChecked]}>
                    AB
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={() => setExpandedItem(expandedItem === item.id ? null : item.id)}
                  style={styles.expandButton}
                >
                  <MaterialCommunityIcons
                    name={expandedItem === item.id ? 'chevron-up' : 'chevron-down'}
                    size={20}
                    color={COLORS.textMuted}
                  />
                </TouchableOpacity>
              </View>

              {expandedItem === item.id && (
                <View style={styles.photoSection}>
                  <Text style={styles.photoLabel}>Foto (optional)</Text>
                  <ImagePickerButton
                    imageUri={null}
                    onImageSelected={(uri, asset) => handlePhotoSelected(item.id, uri)}
                    onImageRemoved={() => handlePhotoRemoved(item.id)}
                    label="Foto hinzufügen"
                  />
                </View>
              )}
            </View>
          ))}
          </View>
        </ScrollView>
      </SafeAreaView>
    );
  }

  // Handover list view
  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
        <View style={{ maxWidth: contentMaxWidth, alignSelf: 'center', width: '100%' }}>
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
              <Text style={styles.createButtonText}>Neue Übergabe erstellen</Text>
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
              <Text style={styles.emptyText}>Noch keine Übergaben</Text>
            </View>
          )}
        </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#F9FAFB' },
  scrollView: { flex: 1 },
  scrollContent: { paddingHorizontal: 16, paddingVertical: 16 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  backButton: { marginRight: 12 },
  headerTitle: { flex: 1, fontSize: 18, fontWeight: '600', color: '#111' },
  addItemButton: { padding: 4 },
  legend: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 24,
    paddingVertical: 12,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  legendBox: { width: 16, height: 16, borderRadius: 4 },
  legendText: { fontSize: 13, color: '#6B7280', fontWeight: '500' },
  checklistItem: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  itemHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 12 },
  itemTitle: { flex: 1 },
  itemName: { fontSize: 16, fontWeight: '700', color: '#111', marginBottom: 2 },
  itemDescription: { fontSize: 14, color: '#374151' },
  itemCategory: { fontSize: 12, color: '#9CA3AF', marginTop: 2 },
  deleteButton: { padding: 4 },
  checkboxRow: { flexDirection: 'row', gap: 16, alignItems: 'center' },
  checkboxButton: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  checkboxLabel: { fontSize: 16, fontWeight: '600', color: '#6B7280' },
  checkboxLabelChecked: { color: '#111' },
  expandButton: { marginLeft: 'auto', padding: 4 },
  photoSection: { marginTop: 12, paddingTop: 12, borderTopWidth: 1, borderTopColor: '#F3F4F6' },
  photoLabel: { fontSize: 14, fontWeight: '500', color: '#374151', marginBottom: 8 },
  createButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.primary,
    padding: 16,
    borderRadius: 8,
    marginBottom: 16,
    gap: 8,
  },
  createButtonText: { color: '#fff', fontSize: 16, fontWeight: '600' },
  handoverList: { marginTop: 0 },
  handoverCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  handoverRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  handoverDate: { fontSize: 16, fontWeight: '600', color: '#111' },
  handoverParents: { fontSize: 14, color: '#6B7280' },
  statusBadge: { paddingHorizontal: 12, paddingVertical: 4, borderRadius: 12 },
  statusCompleted: { backgroundColor: '#D1FAE5' },
  statusPending: { backgroundColor: '#FEF3C7' },
  statusText: { fontSize: 12, fontWeight: '500' },
  statusTextCompleted: { color: '#059669' },
  statusTextPending: { color: '#D97706' },
  emptyState: { alignItems: 'center', paddingVertical: 48 },
  emptyText: { fontSize: 16, color: '#9CA3AF', marginTop: 8 },
});
