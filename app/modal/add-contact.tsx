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
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useAddContact, useUpdateContact, useContacts } from '@/hooks/useContacts';
import { useChildren } from '@/hooks/useFamily';
import { COLORS } from '@/lib/constants';
import { useResponsive } from '@/hooks/useResponsive';

export default function AddContactModal() {
  const { contentMaxWidth } = useResponsive();
  const params = useLocalSearchParams<{ contactId?: string }>();
  const { data: contacts } = useContacts();
  const { data: children } = useChildren();
  const addContact = useAddContact();
  const updateContact = useUpdateContact();

  // If editing, find the contact
  const existingContact = params.contactId
    ? contacts?.find((c) => c.id === params.contactId)
    : null;

  const [name, setName] = useState(existingContact?.name || '');
  const [relationship, setRelationship] = useState(existingContact?.relationship || '');
  const [childId, setChildId] = useState<string | null>(existingContact?.child_id || null);
  const [parent1Name, setParent1Name] = useState(existingContact?.parent_1_name || '');
  const [parent2Name, setParent2Name] = useState(existingContact?.parent_2_name || '');
  const [parentsTogether, setParentsTogether] = useState(
    existingContact?.parents_together ?? true
  );
  const [address, setAddress] = useState(existingContact?.address || '');
  const [phone, setPhone] = useState(existingContact?.phone || '');
  const [mobile, setMobile] = useState(existingContact?.mobile || '');
  const [email, setEmail] = useState(existingContact?.email || '');
  const [notes, setNotes] = useState(existingContact?.notes || '');

  const handleSave = async () => {
    if (!name.trim()) {
      AppAlert.alert('Fehler', 'Bitte gib einen Namen ein.');
      return;
    }

    try {
      if (existingContact) {
        // Update
        await updateContact.mutateAsync({
          id: existingContact.id,
          updates: {
            name: name.trim(),
            relationship: relationship.trim() || null,
            child_id: childId,
            parent_1_name: parent1Name.trim() || null,
            parent_2_name: parent2Name.trim() || null,
            parents_together: parentsTogether,
            address: address.trim() || null,
            phone: phone.trim() || null,
            mobile: mobile.trim() || null,
            email: email.trim() || null,
            notes: notes.trim() || null,
          },
        });
        AppAlert.alert('Erfolg', 'Kontakt wurde aktualisiert.', [
          { text: 'OK', onPress: () => router.back() },
        ]);
      } else {
        // Add new
        await addContact.mutateAsync({
          name: name.trim(),
          relationship: relationship.trim() || null,
          child_id: childId,
          parent_1_name: parent1Name.trim() || null,
          parent_2_name: parent2Name.trim() || null,
          parents_together: parentsTogether,
          address: address.trim() || null,
          phone: phone.trim() || null,
          mobile: mobile.trim() || null,
          email: email.trim() || null,
          notes: notes.trim() || null,
        });
        AppAlert.alert('Erfolg', 'Kontakt wurde hinzugefügt.', [
          { text: 'OK', onPress: () => router.back() },
        ]);
      }
    } catch (error: any) {
      AppAlert.alert('Fehler', error.message || 'Kontakt konnte nicht gespeichert werden.');
    }
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
          {/* Name */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Name *</Text>
            <TextInput
              style={styles.input}
              placeholder="z.B. Familie Müller"
              value={name}
              onChangeText={setName}
            />
          </View>

          {/* Relationship */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Beziehung</Text>
            <TextInput
              style={styles.input}
              placeholder="z.B. Eltern von Max"
              value={relationship}
              onChangeText={setRelationship}
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

          {/* Parent Names */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Eltern-Info</Text>
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Elternteil 1</Text>
              <TextInput
                style={styles.input}
                placeholder="Name"
                value={parent1Name}
                onChangeText={setParent1Name}
              />
            </View>
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Elternteil 2</Text>
              <TextInput
                style={styles.input}
                placeholder="Name"
                value={parent2Name}
                onChangeText={setParent2Name}
              />
            </View>
            {/* Together/Separated Toggle */}
            <TouchableOpacity
              style={styles.toggleContainer}
              onPress={() => setParentsTogether(!parentsTogether)}
              activeOpacity={0.7}
            >
              <MaterialCommunityIcons
                name={parentsTogether ? 'checkbox-marked' : 'checkbox-blank-outline'}
                size={24}
                color={COLORS.primary}
              />
              <Text style={styles.toggleLabel}>Eltern zusammen</Text>
            </TouchableOpacity>
          </View>

          {/* Contact Details */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Kontaktdaten</Text>
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Adresse</Text>
              <TextInput
                style={[styles.input, styles.inputMultiline]}
                placeholder="Straße, PLZ, Ort"
                value={address}
                onChangeText={setAddress}
                multiline
                numberOfLines={2}
              />
            </View>
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Telefon</Text>
              <TextInput
                style={styles.input}
                placeholder="+49 123 456789"
                value={phone}
                onChangeText={setPhone}
                keyboardType="phone-pad"
              />
            </View>
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Mobil</Text>
              <TextInput
                style={styles.input}
                placeholder="+49 123 456789"
                value={mobile}
                onChangeText={setMobile}
                keyboardType="phone-pad"
              />
            </View>
            <View style={styles.inputGroup}>
              <Text style={styles.label}>E-Mail</Text>
              <TextInput
                style={styles.input}
                placeholder="email@beispiel.de"
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
              />
            </View>
          </View>

          {/* Notes */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Notizen</Text>
            <TextInput
              style={[styles.input, styles.inputMultiline]}
              placeholder="Zusätzliche Informationen..."
              value={notes}
              onChangeText={setNotes}
              multiline
              numberOfLines={3}
            />
          </View>
          </View>
        </ScrollView>

        <View style={styles.buttonContainer}>
          <TouchableOpacity
            style={[styles.button, (addContact.isPending || updateContact.isPending) && styles.buttonDisabled]}
            onPress={handleSave}
            disabled={addContact.isPending || updateContact.isPending}
          >
            <Text style={styles.buttonText}>
              {addContact.isPending || updateContact.isPending
                ? 'Speichern...'
                : existingContact
                ? 'Aktualisieren'
                : 'Hinzufügen'}
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
  section: {
    marginTop: 24,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#111',
    marginBottom: 12,
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
  toggleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 8,
  },
  toggleLabel: {
    fontSize: 15,
    color: '#374151',
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
