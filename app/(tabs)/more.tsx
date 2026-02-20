import { useState, useRef, useEffect, useCallback } from 'react';
import { View, Text, ScrollView, TouchableOpacity, Share, StyleSheet, Platform } from 'react-native';
import { AppAlert } from '@/lib/alert';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useAuth } from '@/lib/auth';
import { useChildren } from '@/hooks/useFamily';
import { useEntitlements } from '@/hooks/useEntitlements';
import { supabase } from '@/lib/supabase';
import * as Linking from 'expo-linking';
import { COLORS, APK_DOWNLOAD_URL } from '@/lib/constants';
import { useResponsive } from '@/hooks/useResponsive';

export default function MoreScreen() {
  const { profile, family, signOut } = useAuth();
  const { contentMaxWidth } = useResponsive();
  const { data: children } = useChildren();
  const { data: entitlements } = useEntitlements();
  
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

  const cloudPlusDescription = entitlements?.isCloudPlusActive
    ? entitlements.cloudUntil
      ? `Aktiv bis ${new Date(entitlements.cloudUntil).toLocaleDateString('de-DE')}`
      : 'Aktiv'
    : 'Nicht aktiv';

  async function handleManageCloudPlus() {
    if (!entitlements) return;

    if (!entitlements.isCloudPlusActive) {
      router.push('/modal/cloud-plus');
      return;
    }

    // Active: open platform-specific management
    if (Platform.OS === 'android') {
      await Linking.openURL('https://play.google.com/store/account/subscriptions');
      return;
    }

    if (Platform.OS === 'ios') {
      await Linking.openURL('https://apps.apple.com/account/subscriptions');
      return;
    }

    // Web (PWA): Stripe customer portal (if available)
    try {
      const origin = typeof window !== 'undefined' ? window.location.origin : '';
      const returnUrl = origin ? `${origin}/more` : undefined;

      const { data, error } = await supabase.functions.invoke('stripe-portal', {
        body: { return_url: returnUrl },
      });

      if (error) {
        throw new Error(error.message);
      }

      if (!data?.url) {
        throw new Error('Kein Portal-Link erhalten');
      }

      window.location.href = data.url;
    } catch (e: any) {
      AppAlert.alert(
        'Abo verwalten',
        e?.message ||
          'Abo-Verwaltung ist aktuell nicht verfuegbar. Bitte kontaktiere den Support.'
      );
    }
  }

  async function handleDeleteAccount() {
    AppAlert.alert(
      'Konto loeschen',
      'Willst du dein Konto wirklich dauerhaft loeschen?\n\nDas entfernt deinen Zugang und loescht deine Daten. Das kann nicht rueckgaengig gemacht werden.',
      [
        { text: 'Abbrechen', style: 'cancel' },
        {
          text: 'Konto loeschen',
          style: 'destructive',
          onPress: async () => {
            try {
              const { error } = await supabase.rpc('delete_my_account');
              if (error) throw new Error(error.message);
            } catch (e: any) {
              AppAlert.alert('Fehler', e?.message || 'Konto konnte nicht geloescht werden.');
              return;
            }

            try {
              await signOut();
            } catch {}
          },
        },
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

        {Platform.OS === 'web' && (
          <TouchableOpacity
            style={styles.apkTopBanner}
            onPress={() => {
              if (typeof window !== 'undefined') {
                window.open(APK_DOWNLOAD_URL, '_blank');
              }
            }}
            activeOpacity={0.8}
          >
            <Text style={{ fontSize: 20 }}>📱</Text>
            <View style={{ flex: 1 }}>
              <Text style={styles.apkTopBannerText}>Android App herunterladen</Text>
              <Text style={{ fontSize: 11, color: '#A5D6A7' }}>APK installieren & offline nutzen</Text>
            </View>
            <Text style={{ fontSize: 16, color: '#A5D6A7' }}>→</Text>
          </TouchableOpacity>
        )}

        {/* Children */}
        <Text style={styles.sectionTitle}>Kinder</Text>
        <SettingsItem
          icon="account-child-outline"
          label="Kind hinzufuegen"
          description="Neues Kind zur Familie hinzufuegen"
          onPress={() => router.push('/(onboarding)/add-children')}
        />
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
        {entitlements && !entitlements.isLifetime && !entitlements.isCloudPlusActive && (
          <SettingsItem
            icon="star"
            label="Vollversion kaufen"
            description="Alle Funktionen freischalten"
            onPress={() => router.push('/modal/paywall')}
          />
        )}
        {entitlements && !entitlements.canUpload && (
          <SettingsItem
            icon="cloud"
            label="Cloud Plus Abo"
            description={cloudPlusDescription}
            onPress={handleManageCloudPlus}
          />
        )}
        <SettingsItem
          icon="badge-account"
          label="Upgrade & Status"
          description={entitlements?.isLifetime
            ? (entitlements.canUpload ? 'Lifetime + Cloud Plus aktiv' : 'Lifetime aktiv')
            : 'Dein aktueller Plan und Features'}
          onPress={() => router.push('/more/upgrade')}
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
          onPress={() => AppAlert.alert(
            'Datenschutz',
            'Deine Daten werden DSGVO-konform in Frankfurt (EU) gespeichert.\n\n• Kein Handel mit deinen Daten\n• AES-256-Verschlüsselung für sensible Daten\n• Dein Recht auf Löschung wird respektiert\n• Schlüssel bleibt auf deinem Gerät'
          )}
        />
        <SettingsItem
          icon="download"
          label="Meine Daten exportieren"
          description="Alle Daten als Datei herunterladen"
          onPress={() => AppAlert.alert('Datenexport', 'Diese Funktion wird bald verfuegbar sein.')}
        />
        <SettingsItem
          icon="delete-forever"
          label="Konto loeschen"
          description="Konto und Daten dauerhaft entfernen"
          onPress={handleDeleteAccount}
          danger
        />

        <SettingsItem
          icon="logout"
          label="Abmelden"
          onPress={handleSignOut}
          danger
        />

        {/* Version + verstecktes Impressum */}
        <View style={styles.versionFooter}>
          <Text style={styles.versionText}>Wechselmodell-Planer v1.0.2</Text>
          <TouchableOpacity
            onPress={() => AppAlert.alert(
              'Impressum',
              'Dima Schwabauer\nAm Dreiderfeld 54\n33719 Bielefeld\n\nKontakt: über die App-Einstellungen'
            )}
            activeOpacity={0.5}
          >
            <Text style={styles.impressumLink}>Impressum</Text>
          </TouchableOpacity>
        </View>
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
  apkTopBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    marginBottom: 12,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    backgroundColor: '#1B5E20',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 4,
  },
  apkTopBannerText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#fff',
    flex: 1,
  },
  versionFooter: {
    alignItems: 'center',
    marginTop: 32,
    marginBottom: 16,
    paddingTop: 16,
  },
  versionText: {
    fontSize: 11,
    color: '#D1D5DB',
    marginBottom: 4,
  },
  impressumLink: {
    fontSize: 10,
    color: '#D1D5DB',
    textDecorationLine: 'underline',
  },
});
