import { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Alert,
} from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useChildren } from '@/hooks/useFamily';
import { useAddEvent } from '@/hooks/useFamily';
import { EVENT_CATEGORY_LABELS } from '@/types';
import type { EventCategory } from '@/types';
import DateInput from '@/components/DateInput';
import { useResponsive } from '@/hooks/useResponsive';

export default function AddEventModal() {
  const params = useLocalSearchParams<{ date?: string; category?: string }>();

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [date, setDate] = useState(params.date || '');
  const [time, setTime] = useState('');
  const [category, setCategory] = useState<EventCategory>(
    (params.category as EventCategory) || 'other'
  );
  const [location, setLocation] = useState('');
  const [childId, setChildId] = useState<string | null>(null);
  const [showCategoryPicker, setShowCategoryPicker] = useState(false);
  const [showChildPicker, setShowChildPicker] = useState(false);

  const { contentMaxWidth } = useResponsive();
  const { data: children } = useChildren();
  const addEvent = useAddEvent();

  function handleSave() {
    if (!title.trim()) {
      Alert.alert('Fehler', 'Bitte gib einen Titel ein.');
      return;
    }
    if (!date) {
      Alert.alert('Fehler', 'Bitte wähle ein Datum aus.');
      return;
    }

    addEvent.mutate(
      {
        title: title.trim(),
        description: description.trim() || null,
        date,
        time: time.trim() || null,
        category,
        location: location.trim() || null,
        child_id: childId,
      },
      {
        onSuccess: () => {
          Alert.alert('Erfolg', 'Termin wurde erstellt!');
          router.back();
        },
        onError: (error) => {
          Alert.alert('Fehler', `Termin konnte nicht erstellt werden: ${error.message}`);
        },
      }
    );
  }

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.closeButton}>
          <MaterialCommunityIcons name="close" size={24} color="#111" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Neuer Termin</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
        <View style={{ maxWidth: contentMaxWidth, alignSelf: 'center', width: '100%' }}>
        {/* Title */}
        <Input
          label="Titel *"
          placeholder="z.B. Arzttermin, Geburtstag, ..."
          value={title}
          onChangeText={setTitle}
        />

        {/* Description */}
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Beschreibung</Text>
          <TextInput
            style={[styles.input, styles.textArea]}
            placeholder="Weitere Details (optional)"
            value={description}
            onChangeText={setDescription}
            multiline
            numberOfLines={3}
            placeholderTextColor="#9CA3AF"
          />
        </View>

        {/* Date */}
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Datum * (dd.MM.yyyy)</Text>
          <DateInput
            value={date}
            onChangeText={setDate}
            placeholder="dd.MM.yyyy"
          />
        </View>

        {/* Time */}
        <Input
          label="Uhrzeit (optional)"
          placeholder="HH:MM"
          value={time}
          onChangeText={setTime}
        />

        {/* Category Picker */}
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Kategorie</Text>
          <TouchableOpacity
            style={styles.pickerButton}
            onPress={() => setShowCategoryPicker(!showCategoryPicker)}
          >
            <Text style={styles.pickerButtonText}>{EVENT_CATEGORY_LABELS[category]}</Text>
            <MaterialCommunityIcons
              name={showCategoryPicker ? 'chevron-up' : 'chevron-down'}
              size={20}
              color="#6B7280"
            />
          </TouchableOpacity>
          {showCategoryPicker && (
            <View style={styles.pickerOptions}>
              {(Object.keys(EVENT_CATEGORY_LABELS) as EventCategory[]).map((cat) => (
                <TouchableOpacity
                  key={cat}
                  style={styles.pickerOption}
                  onPress={() => {
                    setCategory(cat);
                    setShowCategoryPicker(false);
                  }}
                >
                  <Text
                    style={[
                      styles.pickerOptionText,
                      category === cat && styles.pickerOptionTextActive,
                    ]}
                  >
                    {EVENT_CATEGORY_LABELS[cat]}
                  </Text>
                  {category === cat && (
                    <MaterialCommunityIcons name="check" size={18} color="#10B981" />
                  )}
                </TouchableOpacity>
              ))}
            </View>
          )}
        </View>

        {/* Child Picker */}
        {children && children.length > 0 && (
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Kind (optional)</Text>
            <TouchableOpacity
              style={styles.pickerButton}
              onPress={() => setShowChildPicker(!showChildPicker)}
            >
              <Text style={styles.pickerButtonText}>
                {childId
                  ? children.find((c) => c.id === childId)?.name || 'Alle Kinder'
                  : 'Alle Kinder'}
              </Text>
              <MaterialCommunityIcons
                name={showChildPicker ? 'chevron-up' : 'chevron-down'}
                size={20}
                color="#6B7280"
              />
            </TouchableOpacity>
            {showChildPicker && (
              <View style={styles.pickerOptions}>
                <TouchableOpacity
                  style={styles.pickerOption}
                  onPress={() => {
                    setChildId(null);
                    setShowChildPicker(false);
                  }}
                >
                  <Text
                    style={[
                      styles.pickerOptionText,
                      !childId && styles.pickerOptionTextActive,
                    ]}
                  >
                    Alle Kinder
                  </Text>
                  {!childId && <MaterialCommunityIcons name="check" size={18} color="#10B981" />}
                </TouchableOpacity>
                {children.map((child) => (
                  <TouchableOpacity
                    key={child.id}
                    style={styles.pickerOption}
                    onPress={() => {
                      setChildId(child.id);
                      setShowChildPicker(false);
                    }}
                  >
                    <Text
                      style={[
                        styles.pickerOptionText,
                        childId === child.id && styles.pickerOptionTextActive,
                      ]}
                    >
                      {child.name}
                    </Text>
                    {childId === child.id && (
                      <MaterialCommunityIcons name="check" size={18} color="#10B981" />
                    )}
                  </TouchableOpacity>
                ))}
              </View>
            )}
          </View>
        )}

        {/* Location */}
        <Input
          label="Ort (optional)"
          placeholder="z.B. Dr. Müller Praxis"
          value={location}
          onChangeText={setLocation}
        />

        {/* Save Button */}
        <TouchableOpacity
          style={[styles.saveButton, addEvent.isPending && styles.saveButtonDisabled]}
          onPress={handleSave}
          disabled={addEvent.isPending}
        >
          <MaterialCommunityIcons name="calendar-check" size={20} color="#fff" />
          <Text style={styles.saveButtonText}>
            {addEvent.isPending ? 'Wird erstellt...' : 'Termin erstellen'}
          </Text>
        </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function Input({
  label,
  placeholder,
  value,
  onChangeText,
  keyboardType = 'default',
}: {
  label: string;
  placeholder: string;
  value: string;
  onChangeText: (text: string) => void;
  keyboardType?: 'default' | 'numeric' | 'phone-pad';
}) {
  return (
    <View style={styles.inputGroup}>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        style={styles.input}
        placeholder={placeholder}
        value={value}
        onChangeText={onChangeText}
        keyboardType={keyboardType}
        placeholderTextColor="#9CA3AF"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  closeButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#111',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingVertical: 16,
    paddingBottom: 32,
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
    borderColor: '#D1D5DB',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 15,
    color: '#111',
  },
  textArea: {
    minHeight: 80,
    textAlignVertical: 'top',
  },
  pickerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
  },
  pickerButtonText: {
    fontSize: 15,
    color: '#111',
  },
  pickerOptions: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 8,
    marginTop: 8,
    overflow: 'hidden',
  },
  pickerOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  pickerOptionText: {
    fontSize: 15,
    color: '#374151',
  },
  pickerOptionTextActive: {
    color: '#10B981',
    fontWeight: '600',
  },
  saveButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#10B981',
    paddingVertical: 14,
    borderRadius: 8,
    marginTop: 8,
  },
  saveButtonDisabled: {
    backgroundColor: '#9CA3AF',
  },
  saveButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});
