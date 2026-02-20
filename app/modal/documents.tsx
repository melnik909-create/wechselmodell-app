import { View, Text, ScrollView, TouchableOpacity, StyleSheet } from 'react-native';
import { AppAlert } from '@/lib/alert';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useDocuments, useUpdateDocumentHolder, useAddDocument, useDeleteDocument } from '@/hooks/useDocuments';
import { useChildren } from '@/hooks/useFamily';
import { useAuth } from '@/lib/auth';
import { COLORS } from '@/lib/constants';
import { DOCUMENT_TYPE_LABELS, type DocumentType, type DocumentHolder } from '@/types';
import { useResponsive } from '@/hooks/useResponsive';
import ChildAvatar from '@/components/ChildAvatar';

const DOCUMENT_TYPES: DocumentType[] = [
  'passport',
  'health_card',
  'birth_certificate',
  'vaccination_card',
  'school_reports',
];

const DOCUMENT_ICONS: Record<DocumentType, string> = {
  passport: 'passport',
  health_card: 'card-account-details',
  birth_certificate: 'certificate',
  vaccination_card: 'needle',
  school_reports: 'school',
  other: 'file-document',
};

const HOLDERS: DocumentHolder[] = ['parent_a', 'parent_b', 'other', 'unknown'];

export default function DocumentsScreen() {
  const { contentMaxWidth } = useResponsive();
  const { family } = useAuth();
  const { data: documents, isLoading } = useDocuments();
  const { data: children } = useChildren();
  const updateHolder = useUpdateDocumentHolder();
  const addDocument = useAddDocument();
  const deleteDocument = useDeleteDocument();

  // Initialize documents for each child if they don't exist
  const initializeDocuments = async () => {
    if (!children || children.length === 0) {
      AppAlert.alert('Hinweis', 'Bitte füge zuerst ein Kind hinzu.');
      return;
    }

    try {
      const newDocs = [];
      for (const child of children) {
        for (const docType of DOCUMENT_TYPES) {
          // Check if document already exists
          const exists = documents?.find(
            (d) => d.child_id === child.id && d.document_type === docType
          );
          if (!exists) {
            newDocs.push({
              child_id: child.id,
              document_type: docType,
              held_by: 'unknown' as DocumentHolder,
              custom_name: null,
              notes: null,
            });
          }
        }
      }

      if (newDocs.length > 0) {
        for (const doc of newDocs) {
          await addDocument.mutateAsync(doc);
        }
        AppAlert.alert('Erfolg', `${newDocs.length} Dokumente wurden initialisiert.`);
      } else {
        AppAlert.alert('Info', 'Alle Dokumente sind bereits vorhanden.');
      }
    } catch (error: any) {
      AppAlert.alert('Fehler', error.message || 'Konnte Dokumente nicht initialisieren.');
    }
  };

  const handleHolderChange = (documentId: string, newHolder: DocumentHolder) => {
    updateHolder.mutate({ id: documentId, held_by: newHolder });
  };

  const getChildName = (childId: string | null) => {
    if (!childId) return 'Allgemein';
    return children?.find((c) => c.id === childId)?.name || 'Unbekannt';
  };

  const holderLabel = (holder: DocumentHolder): string => {
    if (holder === 'parent_a') return family?.parent_a_label || 'Elternteil A';
    if (holder === 'parent_b') return family?.parent_b_label || 'Elternteil B';
    if (holder === 'other') return 'Anderer Ort';
    return 'Unbekannt';
  };

  const getHolderColor = (holder: DocumentHolder) => {
    switch (holder) {
      case 'parent_a':
        return '#3B82F6';
      case 'parent_b':
        return '#A855F7';
      case 'other':
        return '#10B981';
      case 'unknown':
        return '#9CA3AF';
      default:
        return '#9CA3AF';
    }
  };

  // Group documents by child
  const documentsByChild = children?.map((child) => ({
    child,
    documents: documents?.filter((d) => d.child_id === child.id) || [],
  })) || [];

  return (
    <SafeAreaView style={styles.safeArea} edges={['bottom']}>
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
        <View style={{ maxWidth: contentMaxWidth, alignSelf: 'center', width: '100%' }}>
        {/* Info Box */}
        <View style={styles.infoBox}>
          <MaterialCommunityIcons name="information" size={20} color={COLORS.primary} />
          <Text style={styles.infoText}>
            Verwalte wichtige Dokumente und behalte den Überblick, wer welches Dokument hat.
          </Text>
        </View>

        {/* Initialize Button */}
        {children && children.length > 0 && documents && documents.length === 0 && (
          <TouchableOpacity
            style={styles.initButton}
            onPress={initializeDocuments}
            activeOpacity={0.7}
          >
            <MaterialCommunityIcons name="plus-circle" size={20} color="#fff" />
            <Text style={styles.initButtonText}>Dokumente initialisieren</Text>
          </TouchableOpacity>
        )}

        {/* Documents by Child */}
        {documentsByChild.map(({ child, documents: childDocs }) => (
          <View key={child.id} style={styles.childSection}>
            <View style={styles.childHeader}>
              <ChildAvatar familyId={family?.id} child={child} size={40} />
              <Text style={styles.childName}>{child.name}</Text>
            </View>

            {childDocs.length === 0 ? (
              <View style={styles.noDocsCard}>
                <Text style={styles.noDocsText}>Noch keine Dokumente initialisiert</Text>
                <TouchableOpacity
                  style={styles.smallButton}
                  onPress={initializeDocuments}
                  activeOpacity={0.7}
                >
                  <Text style={styles.smallButtonText}>Initialisieren</Text>
                </TouchableOpacity>
              </View>
            ) : (
              childDocs.map((doc) => (
                <View key={doc.id} style={styles.documentCard}>
                  <View style={styles.docHeader}>
                    <MaterialCommunityIcons
                      name={DOCUMENT_ICONS[doc.document_type] as any}
                      size={28}
                      color={getHolderColor(doc.held_by)}
                    />
                    <View style={styles.docInfo}>
                      <Text style={styles.docType}>
                        {doc.custom_name || DOCUMENT_TYPE_LABELS[doc.document_type]}
                      </Text>
                      <Text style={styles.docHolder}>
                        Bei: {holderLabel(doc.held_by)}
                      </Text>
                    </View>
                  </View>

                  {/* Holder Buttons */}
                  <View style={styles.holderButtons}>
                    {HOLDERS.map((holder) => (
                      <TouchableOpacity
                        key={holder}
                        style={[
                          styles.holderButton,
                          doc.held_by === holder && styles.holderButtonActive,
                          { borderColor: getHolderColor(holder) },
                        ]}
                        onPress={() => handleHolderChange(doc.id, holder)}
                        activeOpacity={0.7}
                      >
                        <Text
                          style={[
                            styles.holderButtonText,
                            doc.held_by === holder && {
                              color: getHolderColor(holder),
                              fontWeight: '700',
                            },
                          ]}
                          numberOfLines={1}
                        >
                          {holder === 'parent_a' && (family?.parent_a_label || 'A')}
                          {holder === 'parent_b' && (family?.parent_b_label || 'B')}
                          {holder === 'other' && '?'}
                          {holder === 'unknown' && '⌀'}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>
              ))
            )}
          </View>
        ))}

        {(!children || children.length === 0) && !isLoading && (
          <View style={styles.emptyState}>
            <MaterialCommunityIcons name="account-child" size={48} color={COLORS.textMuted} />
            <Text style={styles.emptyText}>Noch keine Kinder</Text>
            <Text style={styles.emptySubtext}>
              Füge zuerst ein Kind hinzu, um Dokumente zu verwalten
            </Text>
          </View>
        )}

        {/* Link to Edit Parent Labels */}
        <TouchableOpacity
          style={styles.parentLabelsLink}
          onPress={() => router.push('/modal/edit-parent-labels')}
          activeOpacity={0.7}
        >
          <MaterialCommunityIcons name="account-edit" size={20} color={COLORS.primary} />
          <Text style={styles.parentLabelsLinkText}>Elternnamen einstellen</Text>
          <MaterialCommunityIcons name="chevron-right" size={20} color={COLORS.textMuted} />
        </TouchableOpacity>
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
  infoBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    backgroundColor: '#EEF2FF',
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#C7D2FE',
  },
  infoText: {
    flex: 1,
    fontSize: 14,
    color: '#4338CA',
    lineHeight: 20,
  },
  initButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.primary,
    padding: 16,
    borderRadius: 8,
    marginBottom: 16,
    gap: 8,
  },
  initButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  childSection: {
    marginBottom: 24,
  },
  childHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  childName: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111',
  },
  noDocsCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  noDocsText: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 12,
  },
  smallButton: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 6,
  },
  smallButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  documentCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  docHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 12,
  },
  docInfo: {
    flex: 1,
  },
  docType: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111',
  },
  docHolder: {
    fontSize: 13,
    color: '#6B7280',
    marginTop: 2,
  },
  holderButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  holderButton: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 2,
    alignItems: 'center',
    backgroundColor: '#fff',
  },
  holderButtonActive: {
    backgroundColor: '#F9FAFB',
  },
  holderButtonText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#9CA3AF',
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
  parentLabelsLink: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginTop: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  parentLabelsLinkText: {
    flex: 1,
    fontSize: 16,
    color: COLORS.primary,
    fontWeight: '500',
  },
});
