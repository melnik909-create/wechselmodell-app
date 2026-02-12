import { View, Text, ScrollView, TouchableOpacity, Alert, StyleSheet, Linking } from 'react-native';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useContacts, useDeleteContact } from '@/hooks/useContacts';
import { useChildren } from '@/hooks/useFamily';
import { COLORS } from '@/lib/constants';
import { useResponsive } from '@/hooks/useResponsive';

export default function ContactsScreen() {
  const { contentMaxWidth } = useResponsive();
  const { data: contacts, isLoading } = useContacts();
  const { data: children } = useChildren();
  const deleteContact = useDeleteContact();

  const getChildName = (childId: string | null) => {
    if (!childId) return null;
    return children?.find((c) => c.id === childId)?.name || null;
  };

  const handleCall = (number: string) => {
    Linking.openURL(`tel:${number}`);
  };

  const handleEmail = (email: string) => {
    Linking.openURL(`mailto:${email}`);
  };

  const handleDelete = (contactId: string, name: string) => {
    Alert.alert('Kontakt löschen', `Möchtest du "${name}" wirklich löschen?`, [
      { text: 'Abbrechen', style: 'cancel' },
      {
        text: 'Löschen',
        style: 'destructive',
        onPress: () => {
          deleteContact.mutate(contactId);
        },
      },
    ]);
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['bottom']}>
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
        <View style={{ maxWidth: contentMaxWidth, alignSelf: 'center', width: '100%' }}>
        {/* Add Button */}
        <TouchableOpacity
          style={styles.addButton}
          onPress={() => router.push('/modal/add-contact')}
          activeOpacity={0.7}
        >
          <MaterialCommunityIcons name="plus" size={20} color="#fff" />
          <Text style={styles.addButtonText}>Neuer Kontakt</Text>
        </TouchableOpacity>

        {/* Contact List */}
        <View style={styles.contactList}>
          {contacts?.map((contact) => {
            const childName = getChildName(contact.child_id);
            return (
              <View key={contact.id} style={styles.contactCard}>
                {/* Header */}
                <View style={styles.contactHeader}>
                  <View style={styles.contactTitleRow}>
                    <MaterialCommunityIcons
                      name="account-group"
                      size={24}
                      color={COLORS.primary}
                    />
                    <View style={styles.contactTitleInfo}>
                      <Text style={styles.contactName}>{contact.name}</Text>
                      {contact.relationship && (
                        <Text style={styles.contactRelationship}>{contact.relationship}</Text>
                      )}
                    </View>
                  </View>
                  <View style={styles.contactActions}>
                    <TouchableOpacity
                      onPress={() => router.push(`/modal/add-contact?contactId=${contact.id}`)}
                      activeOpacity={0.7}
                    >
                      <MaterialCommunityIcons name="pencil" size={20} color="#6B7280" />
                    </TouchableOpacity>
                    <TouchableOpacity
                      onPress={() => handleDelete(contact.id, contact.name)}
                      activeOpacity={0.7}
                    >
                      <MaterialCommunityIcons name="delete" size={20} color="#EF4444" />
                    </TouchableOpacity>
                  </View>
                </View>

                {/* Child Badge */}
                {childName && (
                  <View style={styles.childBadge}>
                    <MaterialCommunityIcons name="account-child" size={14} color={COLORS.primary} />
                    <Text style={styles.childBadgeText}>{childName}</Text>
                  </View>
                )}

                {/* Parents Info */}
                {(contact.parent_1_name || contact.parent_2_name) && (
                  <View style={styles.parentsInfo}>
                    <View style={styles.infoRow}>
                      <MaterialCommunityIcons name="account-multiple" size={16} color="#6B7280" />
                      <Text style={styles.infoText}>
                        {[contact.parent_1_name, contact.parent_2_name]
                          .filter(Boolean)
                          .join(' & ')}
                      </Text>
                    </View>
                    {!contact.parents_together && (
                      <View style={styles.separatedBadge}>
                        <Text style={styles.separatedText}>Getrennt</Text>
                      </View>
                    )}
                  </View>
                )}

                {/* Contact Details */}
                <View style={styles.contactDetails}>
                  {contact.address && (
                    <View style={styles.detailRow}>
                      <MaterialCommunityIcons name="map-marker" size={16} color="#6B7280" />
                      <Text style={styles.detailText}>{contact.address}</Text>
                    </View>
                  )}
                  {contact.phone && (
                    <TouchableOpacity
                      style={styles.detailRow}
                      onPress={() => handleCall(contact.phone!)}
                      activeOpacity={0.7}
                    >
                      <MaterialCommunityIcons name="phone" size={16} color={COLORS.primary} />
                      <Text style={[styles.detailText, styles.detailTextLink]}>
                        {contact.phone}
                      </Text>
                    </TouchableOpacity>
                  )}
                  {contact.mobile && (
                    <TouchableOpacity
                      style={styles.detailRow}
                      onPress={() => handleCall(contact.mobile!)}
                      activeOpacity={0.7}
                    >
                      <MaterialCommunityIcons name="cellphone" size={16} color={COLORS.primary} />
                      <Text style={[styles.detailText, styles.detailTextLink]}>
                        {contact.mobile}
                      </Text>
                    </TouchableOpacity>
                  )}
                  {contact.email && (
                    <TouchableOpacity
                      style={styles.detailRow}
                      onPress={() => handleEmail(contact.email!)}
                      activeOpacity={0.7}
                    >
                      <MaterialCommunityIcons name="email" size={16} color={COLORS.primary} />
                      <Text style={[styles.detailText, styles.detailTextLink]}>
                        {contact.email}
                      </Text>
                    </TouchableOpacity>
                  )}
                </View>

                {/* Notes */}
                {contact.notes && (
                  <View style={styles.notesContainer}>
                    <Text style={styles.notesText}>{contact.notes}</Text>
                  </View>
                )}
              </View>
            );
          })}

          {(!contacts || contacts.length === 0) && !isLoading && (
            <View style={styles.emptyState}>
              <MaterialCommunityIcons name="account-group" size={48} color={COLORS.textMuted} />
              <Text style={styles.emptyText}>Noch keine Kontakte</Text>
              <Text style={styles.emptySubtext}>
                Füge Kontakte von Freunden, Familie oder anderen wichtigen Personen hinzu
              </Text>
            </View>
          )}
        </View>
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
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.primary,
    padding: 16,
    borderRadius: 8,
    marginBottom: 16,
    gap: 8,
  },
  addButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  contactList: {
    marginTop: 0,
  },
  contactCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  contactHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  contactTitleRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    flex: 1,
  },
  contactTitleInfo: {
    flex: 1,
  },
  contactName: {
    fontSize: 16,
    fontWeight: '700',
    color: '#111',
  },
  contactRelationship: {
    fontSize: 13,
    color: '#6B7280',
    marginTop: 2,
  },
  contactActions: {
    flexDirection: 'row',
    gap: 12,
  },
  childBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#EEF2FF',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    alignSelf: 'flex-start',
    marginBottom: 8,
  },
  childBadgeText: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.primary,
  },
  parentsInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flex: 1,
  },
  infoText: {
    fontSize: 14,
    color: '#374151',
    fontWeight: '500',
  },
  separatedBadge: {
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: '#FCD34D',
  },
  separatedText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#F59E0B',
  },
  contactDetails: {
    gap: 8,
    marginTop: 8,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  detailText: {
    fontSize: 14,
    color: '#6B7280',
  },
  detailTextLink: {
    color: COLORS.primary,
    textDecorationLine: 'underline',
  },
  notesContainer: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
  },
  notesText: {
    fontSize: 13,
    color: '#6B7280',
    lineHeight: 18,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 48,
  },
  emptyText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#9CA3AF',
    marginTop: 12,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#9CA3AF',
    textAlign: 'center',
    marginTop: 4,
    paddingHorizontal: 32,
  },
});
