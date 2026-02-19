import { useState, useRef, useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity, Share, StyleSheet, Platform } from 'react-native';
import { AppAlert } from '@/lib/alert';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useAuth } from '@/lib/auth';
import { useChildren } from '@/hooks/useFamily';
import { COLORS } from '@/lib/constants';
import { useResponsive } from '@/hooks/useResponsive';

export default function MoreScreen() {
  const { profile, family, signOut } = useAuth();
  const { contentMaxWidth } = useResponsive();
  const { data: children } = useChildren();
  
  // Admin mode triple-tap detection
  const [adminTaps, setAdminTaps] = useState(0);
  const adminTapTimerRef = useRef<any>(null);

  const handleAdminTap = () => {
    setAdminTaps(prev => prev + 1);
    
    if (adminTapTimerRef.current) {
      clearTimeout(adminTapTimerRef.current);
    }

    if (adminTaps + 1 === 3) {
      // Open admin panel
      router.push('/modal/admin-vip');
      setAdminTaps(0);
      return;
    }

    // Reset tap counter after 500ms
    adminTapTimerRef.current = setTimeout(() => {
      setAdminTaps(0);
    }, 500);
  };

  useEffect(() => {
    return () => {
      if (adminTapTimerRef.current) {
        clearTimeout(adminTapTimerRef.current);
      }
    };
  }, []);

  async function handleShare() {
    if (!family) return;
    try {
      await Share.share({
        message: `Tritt unserer Familie im Wechselmodell-Planer bei! Code: ${family.invite_code}`,
      });
    } catch {}
  }

  async function handleSignOut() {
    AppAlert.alert(
      'Abmelden',
      'Moechtest du dich wirklich abmelden?',
      [
        { text: 'Abbrechen', style: 'cancel' },
        { text: 'Abmelden', style: 'destructive', onPress: () => signOut() },
      ]
    );
  }

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
        <View style={{ maxWidth: contentMaxWidth, alignSelf: 'center', width: '100%' }}>
        {/* Profile Card - Triple tap for admin */}
        <TouchableOpacity style={styles.card} onPress={handleAdminTap} activeOpacity={0.7}>
          <View style={styles.profileRow}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>
                {profile?.display_name?.charAt(0)?.toUpperCase() ?? '?'}
              </Text>
            </View>
            <View style={styles.profileInfo}>
              <Text style={styles.profileName}>{profile?.display_name}</Text>
              <Text style={styles.profileFamily}>{family?.name ?? 'Keine Familie'}</Text>
            </View>
            {adminTaps > 0 && (
              <Text style={styles.adminTapHint}>({adminTaps}/3)</Text>
            )}
          </View>
        </TouchableOpacity>

        {/* Family Code */}
        {family && (
          <TouchableOpacity style={styles.card} onPress={handleShare} activeOpacity={0.7}>
            <View style={styles.familyCodeRow}>
              <View>
                <Text style={styles.familyCodeLabel}>Familiencode</Text>
                <Text style={styles.familyCode}>{family.invite_code}</Text>
              </View>
              <MaterialCommunityIcons name="share-variant" size={24} color={COLORS.primary} />
            </View>
          </TouchableOpacity>
        )}

        {/* Children */}
        <Text style={styles.sectionTitle}>Kinder</Text>
        {children?.map((child) => (
          <TouchableOpacity
            key={child.id}
            style={styles.card}
            onPress={() => router.push(`/modal/child-info?id=${child.id}`)}
            activeOpacity={0.7}
          >
            <View style={styles.childRow}>
              <View style={styles.childLeft}>
                <View style={styles.childAvatar}>
                  <MaterialCommunityIcons name="account-child" size={22} color="#A855F7" />
                </View>
                <View>
                  <Text style={styles.childName}>{child.name}</Text>
                  {child.date_of_birth && (
                    <Text style={styles.childBirthdate}>{child.date_of_birth}</Text>
                  )}
                </View>
              </View>
              <MaterialCommunityIcons name="chevron-right" size={22} color={COLORS.textMuted} />
            </View>
          </TouchableOpacity>
        ))}

        {/* Settings Items */}
        <Text style={styles.sectionTitle}>Einstellungen</Text>

        <SettingsItem
          icon="calendar-sync"
          label="Betreuungsmodell ändern"
          description="z.B. von 7/7 auf 3/3 wechseln"
          onPress={() => router.push('/modal/change-pattern')}
        />
        <SettingsItem
          icon="swap-horizontal-circle"
          label="Übergabetag konfigurieren"
          description="z.B. Freitag als festen Übergabetag setzen"
          onPress={() => router.push('/modal/config-handover-day')}
        />
        <SettingsItem
          icon="star"
          label="Vollversion kaufen"
          description="Alle Funktionen freischalten"
          onPress={() => router.push('/modal/paywall')}
        />
        <SettingsItem
          icon="file-document-multiple"
          label="Wichtige Dokumente"
          description="z.B. Sorgerechtsbeschluss, Umgangsregelung"
          onPress={() => router.push('/modal/documents')}
        />
        <SettingsItem
          icon="account-edit"
          label="Elternnamen anpassen"
          description="z.B. Mama/Papa statt Elternteil A/B"
          onPress={() => router.push('/modal/edit-parent-labels')}
        />
        <SettingsItem
          icon="help-circle"
          label="Anleitung"
          description="So funktioniert die App"
          onPress={() => router.push('/modal/guide')}
        />
        <SettingsItem
          icon="shield-check"
          label="Datenschutz"
          description="DSGVO-konform in Frankfurt gespeichert"
          onPress={() => AppAlert.alert('Datenschutz', 'Deine Daten werden DSGVO-konform in Frankfurt gespeichert.')}
        />
        <SettingsItem
          icon="download"
          label="Meine Daten exportieren"
          description="Alle Daten als Datei herunterladen"
          onPress={() => AppAlert.alert('Datenexport', 'Diese Funktion wird bald verfuegbar sein.')}
        />
        <SettingsItem
          icon="logout"
          label="Abmelden"
          onPress={handleSignOut}
          danger
        />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function SettingsItem({
  icon,
  label,
  description,
  onPress,
  danger = false,
}: {
  icon: string;
  label: string;
  description?: string;
  onPress: () => void;
  danger?: boolean;
}) {
  return (
    <TouchableOpacity
      onPress={onPress}
      style={styles.settingsItem}
      activeOpacity={0.6}
    >
      <MaterialCommunityIcons
        name={icon as any}
        size={22}
        color={danger ? COLORS.error : COLORS.textSecondary}
      />
      <View style={styles.settingsLabelContainer}>
        <Text style={[styles.settingsLabel, danger && styles.settingsLabelDanger]}>
          {label}
        </Text>
        {description && (
          <Text style={styles.settingsDescription}>{description}</Text>
        )}
      </View>
      <MaterialCommunityIcons name="chevron-right" size={20} color={COLORS.textMuted} />
    </TouchableOpacity>
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
  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  profileRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  avatar: {
    width: 56,
    height: 56,
    backgroundColor: '#EEF2FF',
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#4F46E5',
  },
  profileInfo: {
    flex: 1,
  },
  profileName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111',
  },
  profileFamily: {
    fontSize: 14,
    color: '#6B7280',
  },
  adminTapHint: {
    fontSize: 12,
    color: '#9CA3AF',
    fontStyle: 'italic',
  },
  familyCodeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  familyCodeLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
  },
  familyCode: {
    fontSize: 24,
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
    fontWeight: 'bold',
    color: '#4F46E5',
    letterSpacing: 2,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 12,
    marginTop: 8,
  },
  childRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  childLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  childAvatar: {
    width: 40,
    height: 40,
    backgroundColor: '#FAF5FF',
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  childName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111',
  },
  childBirthdate: {
    fontSize: 12,
    color: '#6B7280',
  },
  settingsItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  settingsLabelContainer: {
    flex: 1,
  },
  settingsLabel: {
    fontSize: 16,
    color: '#111',
  },
  settingsDescription: {
    fontSize: 12,
    color: '#9CA3AF',
    marginTop: 2,
  },
  settingsLabelDanger: {
    color: '#EF4444',
  },
});
