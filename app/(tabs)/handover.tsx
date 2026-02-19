import { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  StyleSheet,
  TextInput,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { AppAlert } from '@/lib/alert';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/lib/auth';
import { supabase } from '@/lib/supabase';
import { useFamilyMembers } from '@/hooks/useFamily';
import { formatDayMonth } from '@/lib/date-utils';
import { COLORS } from '@/lib/constants';
import { HANDOVER_CATEGORY_LABELS } from '@/types';
import type { Handover, HandoverItem } from '@/types';
import { useResponsive } from '@/hooks/useResponsive';

export default function HandoverScreen() {
  const { family, user } = useAuth();
  const { contentMaxWidth } = useResponsive();
  const { data: members } = useFamilyMembers();
  const queryClient = useQueryClient();

  const [selectedHandover, setSelectedHandover] = useState<string | null>(null);
  const [newItemName, setNewItemName] = useState('');
  const [showAddInput, setShowAddInput] = useState(false);

  // ──────── Data Fetching ────────

  const { data: handovers, isLoading } = useQuery({
    queryKey: ['handovers', family?.id],
    queryFn: async (): Promise<Handover[]> => {
      if (!family) return [];
      const { data, error } = await supabase
        .from('handovers')
        .select('*')
        .eq('family_id', family.id)
        .order('date', { ascending: false })
        .limit(30);
      if (error) throw error;
      return data ?? [];
    },
    enabled: !!family,
  });

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

  // ──────── Derived State ────────

  const selectedData = handovers?.find((h) => h.id === selectedHandover);
  const isReceiver = selectedData?.to_parent === user?.id;
  const isSender = selectedData?.from_parent === user?.id;
  const isPending = selectedData?.status === 'pending';

  const incomingPending =
    handovers?.filter((h) => h.to_parent === user?.id && h.status === 'pending') ?? [];
  const outgoingPending =
    handovers?.filter((h) => h.from_parent === user?.id && h.status === 'pending') ?? [];
  const pastHandovers =
    handovers?.filter((h) => h.status === 'completed') ?? [];

  const confirmedCount = items?.filter((i) => i.confirmed).length ?? 0;
  const totalCount = items?.length ?? 0;

  // ──────── Helpers ────────

  const memberName = (userId: string) => {
    const member = members?.find((m) => m.user_id === userId);
    return member?.profile?.display_name ?? 'Unbekannt';
  };

  const displayName = (userId: string) => {
    if (userId === user?.id) return 'Dir';
    return memberName(userId);
  };

  // ──────── Mutations ────────

  // Confirm single item (receiver)
  const confirmItem = useMutation({
    mutationFn: async ({ itemId, confirmed }: { itemId: string; confirmed: boolean }) => {
      const { error } = await supabase
        .from('handover_items')
        .update({
          confirmed,
          confirmed_by: confirmed ? user?.id : null,
          confirmed_at: confirmed ? new Date().toISOString() : null,
        })
        .eq('id', itemId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['handover_items', selectedHandover] });
    },
    onError: (error: any) => {
      AppAlert.alert('Fehler', error.message || 'Bestätigung fehlgeschlagen.');
    },
  });

  // Confirm all items at once (receiver)
  const confirmAll = useMutation({
    mutationFn: async () => {
      if (!selectedHandover || !user) throw new Error('Fehler');

      const { error: itemsError } = await supabase
        .from('handover_items')
        .update({
          confirmed: true,
          confirmed_by: user.id,
          confirmed_at: new Date().toISOString(),
        })
        .eq('handover_id', selectedHandover)
        .eq('confirmed', false);
      if (itemsError) throw itemsError;

      const { error: handoverError } = await supabase
        .from('handovers')
        .update({
          status: 'completed',
          confirmed_by: user.id,
          confirmed_at: new Date().toISOString(),
        })
        .eq('id', selectedHandover);
      if (handoverError) throw handoverError;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['handover_items', selectedHandover] });
      queryClient.invalidateQueries({ queryKey: ['handovers', family?.id] });
      AppAlert.alert('Bestätigt!', 'Übergabe wurde quittiert.');
      setSelectedHandover(null);
    },
    onError: (error: any) => {
      AppAlert.alert('Fehler', error.message || 'Bestätigung fehlgeschlagen.');
    },
  });

  // Create new Mitgabe with auto-populated items
  const createHandover = useMutation({
    mutationFn: async () => {
      if (!family || !user) throw new Error('Nicht angemeldet');
      const otherMember = members?.find((m) => m.user_id !== user.id);
      if (!otherMember) throw new Error('Kein anderes Familienmitglied gefunden');

      // Create handover
      const { data, error } = await supabase
        .from('handovers')
        .insert({
          family_id: family.id,
          date: new Date().toISOString().split('T')[0],
          from_parent: user.id,
          to_parent: otherMember.user_id,
          status: 'pending',
        })
        .select()
        .single();
      if (error) throw error;

      // Find last completed handover TO me (items I received → should return them)
      const { data: lastIncoming } = await supabase
        .from('handovers')
        .select('id')
        .eq('family_id', family.id)
        .eq('to_parent', user.id)
        .eq('status', 'completed')
        .order('date', { ascending: false })
        .limit(1)
        .maybeSingle();

      let itemsToInsert: any[] = [];

      if (lastIncoming) {
        const { data: lastItems } = await supabase
          .from('handover_items')
          .select('*')
          .eq('handover_id', lastIncoming.id)
          .order('sort_order');

        if (lastItems && lastItems.length > 0) {
          itemsToInsert = lastItems.map((item, i) => ({
            handover_id: data.id,
            category: item.category,
            description: item.description,
            item_name: item.item_name,
            is_custom: item.is_custom,
            child_id: item.child_id,
            sort_order: i,
          }));
        }
      }

      // If no items from last handover, add defaults
      if (itemsToInsert.length === 0) {
        itemsToInsert = [
          { handover_id: data.id, category: 'clothing', description: 'Wechselkleidung', sort_order: 0 },
          { handover_id: data.id, category: 'medication', description: 'Medikamente', sort_order: 1 },
          { handover_id: data.id, category: 'homework', description: 'Hausaufgaben / Schulsachen', sort_order: 2 },
          { handover_id: data.id, category: 'toy', description: 'Lieblingsspielzeug', sort_order: 3 },
        ];
      }

      await supabase.from('handover_items').insert(itemsToInsert);
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['handovers', family?.id] });
      setSelectedHandover(data.id);
    },
    onError: (error: any) => {
      AppAlert.alert('Fehler', error.message || 'Mitgabe konnte nicht erstellt werden.');
    },
  });

  // Add item to existing handover (sender)
  const addItem = useMutation({
    mutationFn: async (name: string) => {
      if (!selectedHandover) throw new Error('Fehler');

      const { data: existingItems } = await supabase
        .from('handover_items')
        .select('sort_order')
        .eq('handover_id', selectedHandover)
        .order('sort_order', { ascending: false })
        .limit(1);

      const maxOrder = existingItems?.[0]?.sort_order ?? 0;

      const { error } = await supabase.from('handover_items').insert({
        handover_id: selectedHandover,
        category: 'other',
        description: name.trim(),
        item_name: name.trim(),
        is_custom: true,
        sort_order: maxOrder + 1,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['handover_items', selectedHandover] });
      setNewItemName('');
      setShowAddInput(false);
    },
    onError: (error: any) => {
      AppAlert.alert('Fehler', error.message || 'Item konnte nicht hinzugefügt werden.');
    },
  });

  // Delete item (sender)
  const deleteItem = useMutation({
    mutationFn: async (itemId: string) => {
      const { error } = await supabase.from('handover_items').delete().eq('id', itemId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['handover_items', selectedHandover] });
    },
  });

  // Delete entire handover (sender)
  const deleteHandover = useMutation({
    mutationFn: async (handoverId: string) => {
      const { error } = await supabase.from('handovers').delete().eq('id', handoverId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['handovers', family?.id] });
      setSelectedHandover(null);
    },
  });

  // ━━━━━━━━━━━━ DETAIL VIEW ━━━━━━━━━━━━

  if (selectedHandover && selectedData) {
    return (
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity
            onPress={() => {
              setSelectedHandover(null);
              setShowAddInput(false);
            }}
            style={styles.backButton}
          >
            <MaterialCommunityIcons name="arrow-left" size={24} color={COLORS.text} />
          </TouchableOpacity>
          <Text style={styles.headerTitle} numberOfLines={1}>
            {isReceiver
              ? `Mitgabe von ${memberName(selectedData.from_parent)}`
              : 'Meine Mitgabe'}
          </Text>
          <View style={styles.headerActions}>
            {isSender && isPending && (
              <TouchableOpacity
                onPress={() => setShowAddInput(!showAddInput)}
                style={styles.headerActionButton}
              >
                <MaterialCommunityIcons name="plus" size={24} color={COLORS.primary} />
              </TouchableOpacity>
            )}
            {isSender && isPending && (
              <TouchableOpacity
                onPress={() =>
                  AppAlert.alert('Mitgabe löschen?', 'Möchtest du diese Mitgabe wirklich löschen?', [
                    { text: 'Abbrechen', style: 'cancel' },
                    {
                      text: 'Löschen',
                      style: 'destructive',
                      onPress: () => deleteHandover.mutate(selectedHandover),
                    },
                  ])
                }
                style={styles.headerActionButton}
              >
                <MaterialCommunityIcons name="delete-outline" size={22} color={COLORS.error} />
              </TouchableOpacity>
            )}
          </View>
        </View>

        {/* Status Banner */}
        {isReceiver && isPending && (
          <View style={styles.bannerWarning}>
            <MaterialCommunityIcons name="package-variant" size={20} color="#92400E" />
            <Text style={styles.bannerWarningText}>
              Bitte bestätige die erhaltenen Sachen
            </Text>
          </View>
        )}
        {isSender && isPending && (
          <View style={styles.bannerInfo}>
            <MaterialCommunityIcons name="clock-outline" size={20} color="#1E40AF" />
            <Text style={styles.bannerInfoText}>
              Wartet auf Bestätigung · {confirmedCount}/{totalCount}
            </Text>
          </View>
        )}
        {selectedData.status === 'completed' && (
          <View style={styles.bannerSuccess}>
            <MaterialCommunityIcons name="check-circle" size={20} color="#065F46" />
            <Text style={styles.bannerSuccessText}>Alle Items bestätigt</Text>
          </View>
        )}

        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
            <View style={{ maxWidth: contentMaxWidth, alignSelf: 'center', width: '100%' }}>
              {/* Inline Add Item (sender only) */}
              {showAddInput && isSender && isPending && (
                <View style={styles.addItemRow}>
                  <TextInput
                    style={styles.addItemInput}
                    placeholder="z.B. Regenjacke, Schulranzen..."
                    value={newItemName}
                    onChangeText={setNewItemName}
                    autoFocus
                    returnKeyType="done"
                    onSubmitEditing={() => {
                      if (newItemName.trim()) addItem.mutate(newItemName);
                    }}
                  />
                  <TouchableOpacity
                    style={[
                      styles.addItemSend,
                      (!newItemName.trim() || addItem.isPending) && styles.addItemSendDisabled,
                    ]}
                    onPress={() => {
                      if (newItemName.trim()) addItem.mutate(newItemName);
                    }}
                    disabled={!newItemName.trim() || addItem.isPending}
                  >
                    <MaterialCommunityIcons name="check" size={20} color="#fff" />
                  </TouchableOpacity>
                </View>
              )}

              {/* Items List */}
              {items?.map((item) => (
                <View
                  key={item.id}
                  style={[styles.itemCard, item.confirmed && styles.itemCardConfirmed]}
                >
                  <View style={styles.itemRow}>
                    {/* Receiver: Confirm checkbox */}
                    {isReceiver && isPending && (
                      <TouchableOpacity
                        style={styles.confirmCheckbox}
                        onPress={() =>
                          confirmItem.mutate({ itemId: item.id, confirmed: !item.confirmed })
                        }
                      >
                        <MaterialCommunityIcons
                          name={item.confirmed ? 'checkbox-marked-circle' : 'checkbox-blank-circle-outline'}
                          size={28}
                          color={item.confirmed ? '#059669' : '#D1D5DB'}
                        />
                      </TouchableOpacity>
                    )}

                    {/* Completed: Show check icon */}
                    {!isPending && (
                      <View style={styles.confirmedIcon}>
                        <MaterialCommunityIcons name="check-circle" size={24} color="#059669" />
                      </View>
                    )}

                    {/* Item info */}
                    <View style={styles.itemInfo}>
                      <Text
                        style={[styles.itemName, item.confirmed && styles.itemNameConfirmed]}
                      >
                        {item.item_name || item.description}
                      </Text>
                      <Text style={styles.itemCategory}>
                        {HANDOVER_CATEGORY_LABELS[item.category] ?? item.category}
                      </Text>
                    </View>

                    {/* Sender: Status + delete */}
                    {isSender && isPending && (
                      <View style={styles.senderActions}>
                        <MaterialCommunityIcons
                          name={item.confirmed ? 'check-circle' : 'clock-outline'}
                          size={20}
                          color={item.confirmed ? '#059669' : '#D1D5DB'}
                        />
                        <TouchableOpacity
                          onPress={() =>
                            AppAlert.alert(
                              'Item löschen?',
                              `"${item.item_name || item.description}" entfernen?`,
                              [
                                { text: 'Abbrechen', style: 'cancel' },
                                {
                                  text: 'Löschen',
                                  style: 'destructive',
                                  onPress: () => deleteItem.mutate(item.id),
                                },
                              ]
                            )
                          }
                          style={styles.deleteItemButton}
                        >
                          <MaterialCommunityIcons name="close" size={18} color="#EF4444" />
                        </TouchableOpacity>
                      </View>
                    )}
                  </View>
                </View>
              ))}

              {(!items || items.length === 0) && (
                <View style={styles.emptyItems}>
                  <MaterialCommunityIcons name="package-variant-closed" size={40} color={COLORS.textMuted} />
                  <Text style={styles.emptyItemsText}>Keine Items in dieser Mitgabe</Text>
                  {isSender && isPending && (
                    <Text style={styles.emptyItemsHint}>
                      Tippe auf + um Items hinzuzufügen
                    </Text>
                  )}
                </View>
              )}
            </View>
          </ScrollView>

          {/* Bottom Action: Receiver confirms all */}
          {isReceiver && isPending && items && items.length > 0 && (
            <View style={styles.bottomAction}>
              <TouchableOpacity
                style={[styles.confirmAllButton, confirmAll.isPending && styles.buttonDisabled]}
                onPress={() => confirmAll.mutate()}
                disabled={confirmAll.isPending}
              >
                <MaterialCommunityIcons name="check-all" size={20} color="#fff" />
                <Text style={styles.confirmAllText}>
                  {confirmAll.isPending ? 'Wird bestätigt...' : 'Alles bestätigt'}
                </Text>
              </TouchableOpacity>
            </View>
          )}
        </KeyboardAvoidingView>
      </SafeAreaView>
    );
  }

  // ━━━━━━━━━━━━ LIST VIEW ━━━━━━━━━━━━

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
        <View style={{ maxWidth: contentMaxWidth, alignSelf: 'center', width: '100%' }}>
          {/* Create Button */}
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
                <MaterialCommunityIcons name="package-variant-closed" size={20} color="#fff" />
                <Text style={styles.createButtonText}>Neue Mitgabe erstellen</Text>
              </>
            )}
          </TouchableOpacity>

          {/* Incoming - needs my confirmation */}
          {incomingPending.length > 0 && (
            <>
              <Text style={styles.sectionTitle}>Eingehende Mitgabe</Text>
              {incomingPending.map((handover) => (
                <TouchableOpacity
                  key={handover.id}
                  style={[styles.handoverCard, styles.handoverCardIncoming]}
                  onPress={() => setSelectedHandover(handover.id)}
                  activeOpacity={0.7}
                >
                  <View style={styles.handoverRow}>
                    <View style={styles.handoverInfo}>
                      <Text style={styles.handoverDate}>
                        {formatDayMonth(new Date(handover.date + 'T00:00:00'))}
                      </Text>
                      <Text style={styles.handoverFrom}>
                        Von {memberName(handover.from_parent)}
                      </Text>
                    </View>
                    <View style={styles.badgeIncoming}>
                      <MaterialCommunityIcons name="package-variant" size={16} color="#92400E" />
                      <Text style={styles.badgeIncomingText}>Quittieren</Text>
                    </View>
                  </View>
                </TouchableOpacity>
              ))}
            </>
          )}

          {/* Outgoing - waiting for confirmation */}
          {outgoingPending.length > 0 && (
            <>
              <Text style={styles.sectionTitle}>Wartet auf Bestätigung</Text>
              {outgoingPending.map((handover) => (
                <TouchableOpacity
                  key={handover.id}
                  style={styles.handoverCard}
                  onPress={() => setSelectedHandover(handover.id)}
                  activeOpacity={0.7}
                >
                  <View style={styles.handoverRow}>
                    <View style={styles.handoverInfo}>
                      <Text style={styles.handoverDate}>
                        {formatDayMonth(new Date(handover.date + 'T00:00:00'))}
                      </Text>
                      <Text style={styles.handoverFrom}>
                        An {memberName(handover.to_parent)}
                      </Text>
                    </View>
                    <View style={styles.badgeWaiting}>
                      <MaterialCommunityIcons name="clock-outline" size={16} color="#1E40AF" />
                      <Text style={styles.badgeWaitingText}>Offen</Text>
                    </View>
                  </View>
                </TouchableOpacity>
              ))}
            </>
          )}

          {/* Past handovers */}
          {pastHandovers.length > 0 && (
            <>
              <Text style={styles.sectionTitle}>Vergangene Übergaben</Text>
              {pastHandovers.map((handover) => (
                <TouchableOpacity
                  key={handover.id}
                  style={styles.handoverCard}
                  onPress={() => setSelectedHandover(handover.id)}
                  activeOpacity={0.7}
                >
                  <View style={styles.handoverRow}>
                    <View style={styles.handoverInfo}>
                      <Text style={styles.handoverDate}>
                        {formatDayMonth(new Date(handover.date + 'T00:00:00'))}
                      </Text>
                      <Text style={styles.handoverFrom}>
                        {memberName(handover.from_parent)} → {displayName(handover.to_parent)}
                      </Text>
                    </View>
                    <View style={styles.badgeCompleted}>
                      <MaterialCommunityIcons name="check-circle" size={16} color="#059669" />
                      <Text style={styles.badgeCompletedText}>Bestätigt</Text>
                    </View>
                  </View>
                </TouchableOpacity>
              ))}
            </>
          )}

          {/* Empty state */}
          {(!handovers || handovers.length === 0) && !isLoading && (
            <View style={styles.emptyState}>
              <MaterialCommunityIcons name="package-variant" size={56} color={COLORS.textMuted} />
              <Text style={styles.emptyTitle}>Noch keine Übergaben</Text>
              <Text style={styles.emptySubtitle}>
                Erstelle eine Mitgabe-Liste um Sachen{'\n'}bei der Übergabe zu tracken
              </Text>
            </View>
          )}

          {isLoading && (
            <View style={styles.loadingState}>
              <ActivityIndicator size="large" color={COLORS.primary} />
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

  // ── Header ──
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
    flex: 1,
    fontSize: 18,
    fontWeight: '600',
    color: COLORS.text,
  },
  headerActions: {
    flexDirection: 'row',
    gap: 4,
  },
  headerActionButton: {
    padding: 6,
  },

  // ── Banners ──
  bannerWarning: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: '#FFFBEB',
    borderBottomWidth: 1,
    borderBottomColor: '#FDE68A',
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  bannerWarningText: {
    flex: 1,
    fontSize: 14,
    fontWeight: '500',
    color: '#92400E',
  },
  bannerInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: '#EFF6FF',
    borderBottomWidth: 1,
    borderBottomColor: '#BFDBFE',
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  bannerInfoText: {
    flex: 1,
    fontSize: 14,
    fontWeight: '500',
    color: '#1E40AF',
  },
  bannerSuccess: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: '#ECFDF5',
    borderBottomWidth: 1,
    borderBottomColor: '#A7F3D0',
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  bannerSuccessText: {
    flex: 1,
    fontSize: 14,
    fontWeight: '500',
    color: '#065F46',
  },

  // ── Add Item Inline ──
  addItemRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 12,
  },
  addItemInput: {
    flex: 1,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 15,
    color: COLORS.text,
  },
  addItemSend: {
    backgroundColor: COLORS.primary,
    width: 44,
    height: 44,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addItemSendDisabled: {
    backgroundColor: '#D1D5DB',
  },

  // ── Item Cards ──
  itemCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 14,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  itemCardConfirmed: {
    backgroundColor: '#F0FDF4',
    borderColor: '#BBF7D0',
  },
  itemRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  confirmCheckbox: {
    marginRight: 12,
  },
  confirmedIcon: {
    marginRight: 12,
  },
  itemInfo: {
    flex: 1,
  },
  itemName: {
    fontSize: 15,
    fontWeight: '500',
    color: COLORS.text,
  },
  itemNameConfirmed: {
    color: '#065F46',
  },
  itemCategory: {
    fontSize: 12,
    color: COLORS.textMuted,
    marginTop: 2,
  },
  senderActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  deleteItemButton: {
    padding: 4,
  },

  // ── Empty Items ──
  emptyItems: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyItemsText: {
    fontSize: 15,
    color: COLORS.textMuted,
    marginTop: 8,
  },
  emptyItemsHint: {
    fontSize: 13,
    color: COLORS.textMuted,
    marginTop: 4,
  },

  // ── Bottom Action ──
  bottomAction: {
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
    backgroundColor: '#fff',
  },
  confirmAllButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#059669',
    paddingVertical: 14,
    borderRadius: 10,
  },
  confirmAllText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  buttonDisabled: {
    opacity: 0.6,
  },

  // ── Create Button ──
  createButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.primary,
    padding: 16,
    borderRadius: 10,
    marginBottom: 20,
    gap: 8,
  },
  createButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },

  // ── Section Title ──
  sectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.textSecondary,
    marginBottom: 10,
    marginTop: 4,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },

  // ── Handover Cards ──
  handoverCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  handoverCardIncoming: {
    borderColor: '#FDE68A',
    borderWidth: 2,
    backgroundColor: '#FFFBEB',
  },
  handoverRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  handoverInfo: {
    flex: 1,
  },
  handoverDate: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text,
  },
  handoverFrom: {
    fontSize: 14,
    color: COLORS.textSecondary,
    marginTop: 2,
  },

  // ── Badges ──
  badgeIncoming: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  badgeIncomingText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#92400E',
  },
  badgeWaiting: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#DBEAFE',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  badgeWaitingText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#1E40AF',
  },
  badgeCompleted: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#D1FAE5',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  badgeCompletedText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#059669',
  },

  // ── Empty & Loading States ──
  emptyState: {
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: COLORS.textSecondary,
    marginTop: 12,
  },
  emptySubtitle: {
    fontSize: 14,
    color: COLORS.textMuted,
    marginTop: 6,
    textAlign: 'center',
    lineHeight: 20,
  },
  loadingState: {
    paddingVertical: 60,
    alignItems: 'center',
  },
});
