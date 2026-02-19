import { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { AppAlert } from '@/lib/alert';
import { router, useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/lib/auth';
import { supabase } from '@/lib/supabase';
import { useChildren } from '@/hooks/useFamily';
import ImagePickerButton from '@/components/ImagePickerButton';
import { uploadImage } from '@/lib/image-upload';
import { COLORS } from '@/lib/constants';
import type { ImagePickerAsset } from 'expo-image-picker';
import { useResponsive } from '@/hooks/useResponsive';

export default function AddHandoverItemModal() {
  const { contentMaxWidth } = useResponsive();
  const params = useLocalSearchParams<{ handoverId: string }>();
  const { family } = useAuth();
  const { data: children } = useChildren();
  const queryClient = useQueryClient();

  const [itemName, setItemName] = useState('');
  const [description, setDescription] = useState('');
  const [childId, setChildId] = useState<string | null>(null);
  const [imageUri, setImageUri] = useState<string | null>(null);
  const [imageAsset, setImageAsset] = useState<ImagePickerAsset | null>(null);

  const addItem = useMutation({
    mutationFn: async () => {
      if (!params.handoverId || !family) throw new Error('Fehlende Daten');
      if (!itemName.trim()) throw new Error('Bitte gib einen Namen ein');

      // Upload photo if present
      let photoPath: string | null = null;
      if (imageUri && imageAsset) {
        photoPath = await uploadImage(imageUri, 'handover', family.id);
      }

      // Get current max sort_order
      const { data: existingItems } = await supabase
        .from('handover_items')
        .select('sort_order')
        .eq('handover_id', params.handoverId)
        .order('sort_order', { ascending: false })
        .limit(1);

      const maxSortOrder = existingItems?.[0]?.sort_order ?? 0;

      // Insert custom item
      const { error } = await supabase.from('handover_items').insert({
        handover_id: params.handoverId,
        category: 'other',
        description: description.trim() || itemName.trim(),
        item_name: itemName.trim(),
        is_custom: true,
        child_id: childId,
        photo_url: photoPath,
        sort_order: maxSortOrder + 1,
        checked_an: false,
        checked_ab: false,
      });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['handover_items', params.handoverId] });
      AppAlert.alert('Erfolg', 'Item wurde hinzugefügt.', [
        { text: 'OK', onPress: () => router.back() },
      ]);
    },
    onError: (error: any) => {
      AppAlert.alert('Fehler', error.message || 'Item konnte nicht hinzugefügt werden.');
    },
  });

  const handleImageSelected = (uri: string, asset: ImagePickerAsset) => {
    setImageUri(uri);
    setImageAsset(asset);
  };

  const handleImageRemoved = () => {
    setImageUri(null);
    setImageAsset(null);
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['bottom']}>
      <KeyboardAvoidingView
        style={styles.keyboardView}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
        >
          <View style={{ maxWidth: contentMaxWidth, alignSelf: 'center', width: '100%' }}>
          {/* Item Name */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Name des Items *</Text>
            <TextInput
              style={styles.input}
              placeholder="z.B. Teddybär, Schulranzen"
              value={itemName}
              onChangeText={setItemName}
            />
          </View>

          {/* Description */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Beschreibung (optional)</Text>
            <TextInput
              style={[styles.input, styles.inputMultiline]}
              placeholder="Zusätzliche Details..."
              value={description}
              onChangeText={setDescription}
              multiline
              numberOfLines={3}
            />
          </View>

          {/* Child Assignment */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Zugeordnet zu Kind</Text>
            <View style={styles.childSelector}>
              <TouchableOpacity
                style={[styles.childOption, !childId && styles.childOptionSelected]}
                onPress={() => setChildId(null)}
              >
                <Text style={[styles.childOptionText, !childId && styles.childOptionTextSelected]}>
                  Allgemein
                </Text>
              </TouchableOpacity>
              {children?.map((child) => (
                <TouchableOpacity
                  key={child.id}
                  style={[styles.childOption, childId === child.id && styles.childOptionSelected]}
                  onPress={() => setChildId(child.id)}
                >
                  <Text
                    style={[
                      styles.childOptionText,
                      childId === child.id && styles.childOptionTextSelected,
                    ]}
                  >
                    {child.name}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Photo */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Foto (optional)</Text>
            <ImagePickerButton
              imageUri={imageUri}
              onImageSelected={handleImageSelected}
              onImageRemoved={handleImageRemoved}
              label="Foto hinzufügen"
            />
          </View>
          </View>
        </ScrollView>

        <View style={styles.buttonContainer}>
          <TouchableOpacity
            style={[styles.button, addItem.isPending && styles.buttonDisabled]}
            onPress={() => addItem.mutate()}
            disabled={addItem.isPending}
          >
            <Text style={styles.buttonText}>
              {addItem.isPending ? 'Wird hinzugefügt...' : 'Hinzufügen'}
            </Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  keyboardView: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingVertical: 16,
  },
  inputGroup: {
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 6,
  },
  input: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 15,
    color: '#111',
  },
  inputMultiline: {
    minHeight: 80,
    textAlignVertical: 'top',
  },
  childSelector: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  childOption: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    backgroundColor: '#fff',
  },
  childOptionSelected: {
    borderColor: COLORS.primary,
    backgroundColor: '#EEF2FF',
  },
  childOptionText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#6B7280',
  },
  childOptionTextSelected: {
    color: COLORS.primary,
    fontWeight: '600',
  },
  buttonContainer: {
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
    backgroundColor: '#fff',
  },
  button: {
    backgroundColor: COLORS.primary,
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});
