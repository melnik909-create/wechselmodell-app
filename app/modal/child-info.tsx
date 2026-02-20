import { useState, useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, Linking, Image, Modal, TextInput, Pressable } from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/auth';
import { COLORS } from '@/lib/constants';
import type { Child, EmergencyContact } from '@/types';
import { useResponsive } from '@/hooks/useResponsive';
import { useChildAvatarUrl } from '@/hooks/useChildAvatarUrl';
import { SensitivePin } from '@/lib/sensitive-pin';
import { AppAlert } from '@/lib/alert';

export default function ChildInfoScreen() {
  const { contentMaxWidth } = useResponsive();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { family } = useAuth();

  const { data: child, isLoading, error: queryError } = useQuery({
    queryKey: ['child', id],
    queryFn: async (): Promise<Child | null> => {
      if (!id) return null;
      const { data, error } = await supabase
        .from('children')
        .select('*')
        .eq('id', id)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!id,
  });

  const { data: emergencyContacts } = useQuery({
    queryKey: ['emergency_contacts', id],
    queryFn: async (): Promise<EmergencyContact[]> => {
      if (!id) return [];
      const { data, error } = await supabase
        .from('emergency_contacts')
        .select('*')
        .eq('child_id', id)
        .order('is_primary', { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
    enabled: !!id,
  });

  // Load avatar signed URL with caching
  const { data: avatarSignedUrl } = useChildAvatarUrl(family?.id, id, child?.avatar_url ?? null);

  const [showPassportRevealed, setShowPassportRevealed] = useState(false);
  const [pinModalVisible, setPinModalVisible] = useState(false);
  const [pinInput, setPinInput] = useState('');
  const [hasPin, setHasPin] = useState(false);
  useEffect(() => {
    SensitivePin.hasPin().then(setHasPin);
  }, []);

  const handlePassportPress = () => {
    if (showPassportRevealed) return;
    if (!hasPin) {
      AppAlert.alert(
        'PIN setzen',
        'Um die Reisepassnummer anzuzeigen, musst du zuerst in den Einstellungen unter "PIN für sensible Daten" einen PIN festlegen.',
        [
          { text: 'Abbrechen', style: 'cancel' },
          { text: 'Zu Einstellungen', onPress: () => router.push('/(tabs)/more') },
        ]
      );
      return;
    }
    setPinInput('');
    setPinModalVisible(true);
  };

  const handlePinConfirm = async () => {
    const ok = await SensitivePin.checkPin(pinInput);
    if (ok) {
      setShowPassportRevealed(true);
      setPinModalVisible(false);
      setPinInput('');
    } else {
      AppAlert.alert('Fehler', 'Falscher PIN.');
    }
  };

  if (!id) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.loading}>
          <Text style={styles.loadingText}>Keine ID gefunden</Text>
          <Text style={styles.errorText}>Bitte gehe zurück und versuche es erneut.</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (isLoading) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.loading}>
          <Text style={styles.loadingText}>Laden...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (queryError) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.loading}>
          <Text style={styles.errorText}>Fehler beim Laden</Text>
          <Text style={styles.errorDetail}>{String(queryError)}</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!child) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.loading}>
          <Text style={styles.errorText}>Kind nicht gefunden</Text>
        </View>
      </SafeAreaView>
    );
  }

  const handleCall = (phone: string) => {
    Linking.openURL(`tel:${phone}`);
  };

  const hasHealthInfo = child.allergies || child.blood_type || child.doctor_name || child.insurance_name;
  const hasEducationInfo = child.school_name || child.daycare_name;
  const hasDocumentsInfo = child.passport_number;
  const hasEmergencyContacts = emergencyContacts && emergencyContacts.length > 0;
  const hasAnyInfo = hasHealthInfo || hasEducationInfo || hasDocumentsInfo || hasEmergencyContacts || child.notes;

  return (
    <SafeAreaView style={styles.safeArea} edges={['bottom']}>
      <Modal visible={pinModalVisible} transparent animationType="fade">
        <Pressable style={styles.pinModalOverlay} onPress={() => setPinModalVisible(false)}>
          <Pressable style={styles.pinModalBox} onPress={(e) => e.stopPropagation()}>
            <Text style={styles.pinModalTitle}>PIN eingeben</Text>
            <TextInput
              style={styles.pinModalInput}
              value={pinInput}
              onChangeText={setPinInput}
              placeholder="PIN"
              secureTextEntry
              keyboardType="number-pad"
              maxLength={20}
              autoFocus
            />
            <View style={styles.pinModalButtons}>
              <TouchableOpacity style={styles.pinModalButtonCancel} onPress={() => setPinModalVisible(false)}>
                <Text style={styles.pinModalButtonCancelText}>Abbrechen</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.pinModalButtonOk} onPress={handlePinConfirm}>
                <Text style={styles.pinModalButtonOkText}>Anzeigen</Text>
              </TouchableOpacity>
            </View>
          </Pressable>
        </Pressable>
      </Modal>
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
        <View style={{ maxWidth: contentMaxWidth, alignSelf: 'center', width: '100%' }}>
        {/* Header Card */}
        <View style={styles.headerCard}>
          <View style={styles.avatar}>
            {avatarSignedUrl ? (
              <Image source={{ uri: avatarSignedUrl }} style={styles.avatarImage} />
            ) : (
              <MaterialCommunityIcons name="account-child" size={56} color="#A855F7" />
            )}
          </View>
          <Text style={styles.childName}>{child.name}</Text>
          {child.date_of_birth && (
            <Text style={styles.childBirthdate}>Geboren am {child.date_of_birth}</Text>
          )}
        </View>

        {/* Empty State */}
        {!hasAnyInfo && (
          <View style={styles.emptyState}>
            <MaterialCommunityIcons name="information-outline" size={64} color="#9CA3AF" />
            <Text style={styles.emptyTitle}>Noch keine Informationen</Text>
            <Text style={styles.emptyText}>
              Füge wichtige Informationen zu {child.name} hinzu wie Allergien, Arzt, Schule oder Notfallkontakte.
            </Text>
            <Text style={styles.emptyHint}>
              💡 Diese Funktion wird in Kürze verfügbar sein
            </Text>
          </View>
        )}

        {/* Health Section */}
        {hasHealthInfo && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <MaterialCommunityIcons name="heart-pulse" size={24} color="#EF4444" />
              <Text style={styles.sectionTitle}>Gesundheit</Text>
            </View>

            {child.allergies && (
              <View style={styles.alertCard}>
                <MaterialCommunityIcons name="alert-circle" size={20} color="#EF4444" />
                <View style={styles.alertContent}>
                  <Text style={styles.alertLabel}>Allergien</Text>
                  <Text style={styles.alertValue}>{child.allergies}</Text>
                </View>
              </View>
            )}

            {child.blood_type && (
              <InfoRow
                icon="water"
                iconColor="#EF4444"
                label="Blutgruppe"
                value={child.blood_type}
              />
            )}

            {child.doctor_name && (
              <View style={styles.contactCard}>
                <View style={styles.contactHeader}>
                  <MaterialCommunityIcons name="doctor" size={22} color="#3B82F6" />
                  <Text style={styles.contactTitle}>Kinderarzt</Text>
                </View>
                <Text style={styles.contactName}>{child.doctor_name}</Text>
                {child.doctor_phone && (
                  <TouchableOpacity
                    onPress={() => handleCall(child.doctor_phone!)}
                    style={styles.phoneButton}
                  >
                    <MaterialCommunityIcons name="phone" size={18} color="#4F46E5" />
                    <Text style={styles.phoneText}>{child.doctor_phone}</Text>
                  </TouchableOpacity>
                )}
                {child.doctor_address && (
                  <Text style={styles.contactAddress}>{child.doctor_address}</Text>
                )}
              </View>
            )}

            {child.insurance_name && (
              <InfoRow
                icon="shield-account"
                iconColor="#10B981"
                label="Krankenversicherung"
                value={`${child.insurance_name}${child.insurance_number ? `\n${child.insurance_number}` : ''}`}
              />
            )}
          </View>
        )}

        {/* Education Section */}
        {hasEducationInfo && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <MaterialCommunityIcons name="school" size={24} color="#F59E0B" />
              <Text style={styles.sectionTitle}>Bildung</Text>
            </View>

            {child.school_name && (
              <View style={styles.contactCard}>
                <View style={styles.contactHeader}>
                  <MaterialCommunityIcons name="school" size={22} color="#F59E0B" />
                  <Text style={styles.contactTitle}>Schule</Text>
                </View>
                <Text style={styles.contactName}>{child.school_name}</Text>
                {child.school_phone && (
                  <TouchableOpacity
                    onPress={() => handleCall(child.school_phone!)}
                    style={styles.phoneButton}
                  >
                    <MaterialCommunityIcons name="phone" size={18} color="#4F46E5" />
                    <Text style={styles.phoneText}>{child.school_phone}</Text>
                  </TouchableOpacity>
                )}
                {child.school_address && (
                  <Text style={styles.contactAddress}>{child.school_address}</Text>
                )}
              </View>
            )}

            {child.daycare_name && (
              <View style={styles.contactCard}>
                <View style={styles.contactHeader}>
                  <MaterialCommunityIcons name="home-heart" size={22} color="#EC4899" />
                  <Text style={styles.contactTitle}>Kita</Text>
                </View>
                <Text style={styles.contactName}>{child.daycare_name}</Text>
                {child.daycare_phone && (
                  <TouchableOpacity
                    onPress={() => handleCall(child.daycare_phone!)}
                    style={styles.phoneButton}
                  >
                    <MaterialCommunityIcons name="phone" size={18} color="#4F46E5" />
                    <Text style={styles.phoneText}>{child.daycare_phone}</Text>
                  </TouchableOpacity>
                )}
              </View>
            )}
          </View>
        )}

        {/* Documents Section */}
        {hasDocumentsInfo && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <MaterialCommunityIcons name="passport" size={24} color="#8B5CF6" />
              <Text style={styles.sectionTitle}>Dokumente</Text>
            </View>

            {child.passport_number && (
              <TouchableOpacity style={styles.passportRow} onPress={handlePassportPress} activeOpacity={0.7}>
                <MaterialCommunityIcons name="passport" size={22} color="#8B5CF6" />
                <View style={styles.passportRowContent}>
                  <Text style={styles.passportRowLabel}>Reisepassnummer</Text>
                  <Text style={styles.passportRowValue}>
                    {showPassportRevealed ? child.passport_number : SensitivePin.maskValue(child.passport_number)}
                  </Text>
                </View>
                {!showPassportRevealed && (
                  <Text style={styles.passportTapHint}>Tippen zum Anzeigen</Text>
                )}
              </TouchableOpacity>
            )}
          </View>
        )}

        {/* Emergency Contacts */}
        {emergencyContacts && emergencyContacts.length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <MaterialCommunityIcons name="phone-alert" size={24} color="#EF4444" />
              <Text style={styles.sectionTitle}>Notfallkontakte</Text>
            </View>
            {emergencyContacts.map((contact) => (
              <View key={contact.id} style={styles.contactCard}>
                <View style={styles.emergencyRow}>
                  <View style={styles.contactHeader}>
                    <MaterialCommunityIcons name="account-alert" size={22} color="#EF4444" />
                    <Text style={styles.contactTitle}>{contact.name}</Text>
                  </View>
                  {contact.is_primary && (
                    <View style={styles.primaryBadge}>
                      <Text style={styles.primaryText}>Primär</Text>
                    </View>
                  )}
                </View>
                {contact.relationship && (
                  <Text style={styles.relationshipText}>{contact.relationship}</Text>
                )}
                <TouchableOpacity
                  onPress={() => handleCall(contact.phone)}
                  style={styles.phoneButtonLarge}
                >
                  <MaterialCommunityIcons name="phone" size={20} color="#fff" />
                  <Text style={styles.phoneTextLarge}>{contact.phone}</Text>
                </TouchableOpacity>
              </View>
            ))}
          </View>
        )}

        {/* Notes */}
        {child.notes && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <MaterialCommunityIcons name="note-text" size={24} color="#6366F1" />
              <Text style={styles.sectionTitle}>Notizen</Text>
            </View>
            <View style={styles.notesCard}>
              <Text style={styles.notesText}>{child.notes}</Text>
            </View>
          </View>
        )}

        {/* Edit Button */}
        <TouchableOpacity
          style={styles.editButton}
          onPress={() => router.push(`/modal/edit-child?id=${child.id}`)}
        >
          <MaterialCommunityIcons name="pencil" size={20} color="#fff" />
          <Text style={styles.editButtonText}>Bearbeiten</Text>
        </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function InfoRow({
  icon,
  iconColor,
  label,
  value,
}: {
  icon: string;
  iconColor: string;
  label: string;
  value: string;
}) {
  return (
    <View style={styles.infoRow}>
      <View style={styles.infoRowLeft}>
        <MaterialCommunityIcons name={icon as any} size={20} color={iconColor} />
        <Text style={styles.infoRowLabel}>{label}</Text>
      </View>
      <Text style={styles.infoRowValue}>{value}</Text>
    </View>
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
    paddingVertical: 20,
    paddingBottom: 32,
  },
  loading: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  loadingText: {
    fontSize: 16,
    color: '#6B7280',
    marginBottom: 8,
  },
  errorText: {
    fontSize: 16,
    color: '#EF4444',
    fontWeight: '600',
    marginBottom: 8,
    textAlign: 'center',
  },
  errorDetail: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
  },
  headerCard: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 32,
    alignItems: 'center',
    marginBottom: 24,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  avatar: {
    width: 96,
    height: 96,
    backgroundColor: '#FAF5FF',
    borderRadius: 48,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
    overflow: 'hidden',
  },
  avatarImage: {
    width: 96,
    height: 96,
    borderRadius: 48,
  },
  childName: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#111',
    marginBottom: 6,
  },
  childBirthdate: {
    fontSize: 15,
    color: '#6B7280',
  },
  passportRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: '#F5F3FF',
    borderRadius: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#DDD6FE',
  },
  passportRowContent: { flex: 1 },
  passportRowLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#6B7280',
    marginBottom: 2,
  },
  passportRowValue: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111',
  },
  passportTapHint: {
    fontSize: 11,
    color: '#8B5CF6',
    fontWeight: '500',
  },
  pinModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  pinModalBox: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 24,
    width: '100%',
    maxWidth: 320,
  },
  pinModalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111',
    marginBottom: 16,
    textAlign: 'center',
  },
  pinModalInput: {
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 18,
    marginBottom: 16,
    letterSpacing: 4,
  },
  pinModalButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  pinModalButtonCancel: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
  },
  pinModalButtonCancelText: { fontSize: 16, fontWeight: '600', color: '#6B7280' },
  pinModalButtonOk: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
  },
  pinModalButtonOkText: { fontSize: 16, fontWeight: '600', color: '#fff' },
  section: {
    marginBottom: 28,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#111',
  },
  alertCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    backgroundColor: '#FEE2E2',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#FCA5A5',
  },
  alertContent: {
    flex: 1,
  },
  alertLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#991B1B',
    marginBottom: 4,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  alertValue: {
    fontSize: 16,
    fontWeight: '600',
    color: '#DC2626',
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#fff',
    padding: 14,
    borderRadius: 10,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  infoRowLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  infoRowLabel: {
    fontSize: 15,
    color: '#6B7280',
    fontWeight: '500',
  },
  infoRowValue: {
    fontSize: 15,
    fontWeight: '600',
    color: '#111',
    flexShrink: 1,
    textAlign: 'right',
  },
  contactCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 18,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 4,
    elevation: 1,
  },
  contactHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 10,
  },
  contactTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: '#6B7280',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  contactName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111',
    marginBottom: 10,
  },
  contactAddress: {
    fontSize: 14,
    color: '#6B7280',
    marginTop: 6,
    lineHeight: 20,
  },
  phoneButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 8,
  },
  phoneText: {
    fontSize: 16,
    color: '#4F46E5',
    fontWeight: '600',
  },
  phoneButtonLarge: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    backgroundColor: '#EF4444',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 10,
    marginTop: 10,
  },
  phoneTextLarge: {
    fontSize: 16,
    color: '#fff',
    fontWeight: '600',
  },
  emergencyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  primaryBadge: {
    backgroundColor: '#FECACA',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 10,
  },
  primaryText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#DC2626',
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },
  relationshipText: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 4,
    fontStyle: 'italic',
  },
  notesCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 18,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  notesText: {
    fontSize: 15,
    color: '#374151',
    lineHeight: 22,
  },
  emptyState: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 32,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#111',
    marginTop: 16,
    marginBottom: 8,
    textAlign: 'center',
  },
  emptyText: {
    fontSize: 15,
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 16,
  },
  emptyHint: {
    fontSize: 14,
    color: '#9CA3AF',
    fontStyle: 'italic',
    textAlign: 'center',
  },
  editButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#4F46E5',
    padding: 16,
    borderRadius: 12,
    gap: 8,
    marginTop: 24,
  },
  editButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});
