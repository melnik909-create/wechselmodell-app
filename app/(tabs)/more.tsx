import { View, Text, ScrollView, TouchableOpacity, Alert, Share, StyleSheet, Platform } from 'react-native';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useAuth } from '@/lib/auth';
import { useChildren } from '@/hooks/useFamily';
import { COLORS } from '@/lib/constants';

export default function MoreScreen() {
  const { profile, family, signOut } = useAuth();
  const { data: children } = useChildren();

  async function handleShare() {
    if (!family) return;
    try {
      await Share.share({
        message: `Tritt unserer Familie im WechselPlaner bei! Code: ${family.invite_code}`,
      });
    } catch {}
  }

  async function handleSignOut() {
    Alert.alert(
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
        {/* Profile Card */}
        <View style={styles.card}>
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
          </View>
        </View>

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
          icon="shield-check"
          label="Datenschutz"
          onPress={() => Alert.alert('Datenschutz', 'Deine Daten werden DSGVO-konform in Frankfurt gespeichert.')}
        />
        <SettingsItem
          icon="download"
          label="Meine Daten exportieren"
          onPress={() => Alert.alert('Datenexport', 'Diese Funktion wird bald verfuegbar sein.')}
        />
        <SettingsItem
          icon="logout"
          label="Abmelden"
          onPress={handleSignOut}
          danger
        />
      </ScrollView>
    </SafeAreaView>
  );
}

function SettingsItem({
  icon,
  label,
  onPress,
  danger = false,
}: {
  icon: string;
  label: string;
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
      <Text style={[styles.settingsLabel, danger && styles.settingsLabelDanger]}>
        {label}
      </Text>
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
  settingsLabel: {
    fontSize: 16,
    flex: 1,
    color: '#111',
  },
  settingsLabelDanger: {
    color: '#EF4444',
  },
});
