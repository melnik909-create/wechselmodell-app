import { useState, useEffect, useCallback } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Switch, ScrollView, KeyboardAvoidingView, Platform, Linking, Modal, Image } from 'react-native';
import { AppAlert } from '@/lib/alert';
import { Link, router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useAuth } from '@/lib/auth';
import { useResponsive } from '@/hooks/useResponsive';
import { BiometricAuth } from '@/lib/biometric-auth';
import { APK_DOWNLOAD_URL } from '@/lib/constants';

const IOS_WEB_APP_ANLEITUNG = require('../../assets/ios-web-app-anleitung.png');

export default function LoginScreen() {
  const { signIn } = useAuth();
  const { contentMaxWidth, isLandscape } = useResponsive();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(true);
  const [loading, setLoading] = useState(false);
  const [biometricAvailable, setBiometricAvailable] = useState(false);
  const [hasSavedCreds, setHasSavedCreds] = useState(false);
  const [iosAnleitungVisible, setIosAnleitungVisible] = useState(false);

  useEffect(() => {
    (async () => {
      const available = await BiometricAuth.isAvailable();
      setBiometricAvailable(available);
      const creds = await BiometricAuth.getCredentials();
      setHasSavedCreds(!!creds);
      const rm = await BiometricAuth.getRememberMe();
      setRememberMe(rm);
    })();
  }, []);

  const handleBiometricLogin = useCallback(async () => {
    const creds = await BiometricAuth.getCredentials();
    if (!creds) {
      AppAlert.alert('Hinweis', 'Keine gespeicherten Anmeldedaten. Bitte melde dich zuerst manuell an.');
      return;
    }
    const success = await BiometricAuth.authenticate('Anmelden mit Biometrie');
    if (!success) return;

    setLoading(true);
    try {
      await signIn(creds.email, creds.password);
      router.replace('/');
    } catch (error: any) {
      AppAlert.alert('Anmeldung fehlgeschlagen', error.message || 'Gespeicherte Daten ungültig. Bitte manuell anmelden.');
      await BiometricAuth.clearCredentials();
      setHasSavedCreds(false);
    } finally {
      setLoading(false);
    }
  }, [signIn]);

  async function handleLogin() {
    if (!email.trim() || !password.trim()) {
      AppAlert.alert('Fehler', 'Bitte E-Mail und Passwort eingeben.');
      return;
    }

    setLoading(true);
    try {
      await signIn(email.trim(), password);
      await BiometricAuth.setRememberMe(rememberMe);
      if (rememberMe) {
        await BiometricAuth.saveCredentials(email.trim(), password);
        setHasSavedCreds(true);
      } else {
        await BiometricAuth.clearCredentials();
      }
      router.replace('/');
    } catch (error: any) {
      AppAlert.alert('Anmeldung fehlgeschlagen', error.message || 'Bitte versuche es erneut.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
        >
          <View style={[styles.container, { maxWidth: contentMaxWidth, alignSelf: 'center', width: '100%' }]}>
            {/* Logo */}
            <View style={[styles.logoContainer, isLandscape && { marginBottom: 24 }]}>
              <MaterialCommunityIcons name="calendar-sync" size={isLandscape ? 40 : 60} color="#4F46E5" />
              <Text style={styles.appName}>Wechselmodell-Planer</Text>
              {!isLandscape && (
                <>
                  <Text style={styles.tagline}>Gemeinsam organisiert – Fair gelöst.</Text>
                  <Text style={styles.subtagline}>So geht Co-Parenting ohne Kopfschmerzen.</Text>
                </>
              )}
            </View>

            <View style={styles.form}>
              <Text style={styles.fieldLabel}>E-Mail</Text>
              <TextInput
                style={styles.input}
                placeholder="deine@email.de"
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
              />
              <Text style={styles.fieldLabel}>Passwort</Text>
              <TextInput
                style={styles.input}
                placeholder="Dein Passwort"
                value={password}
                onChangeText={setPassword}
                secureTextEntry
              />

              <View style={styles.rememberMeContainer}>
                <Switch
                  value={rememberMe}
                  onValueChange={setRememberMe}
                  trackColor={{ false: '#D1D5DB', true: '#818CF8' }}
                  thumbColor={rememberMe ? '#4F46E5' : '#F3F4F6'}
                />
                <Text style={styles.rememberMeText}>Anmeldung merken</Text>
              </View>

              <TouchableOpacity
                style={[styles.button, loading && styles.buttonDisabled]}
                onPress={handleLogin}
                disabled={loading}
              >
                <Text style={styles.buttonText}>
                  {loading ? 'Laden...' : 'Anmelden'}
                </Text>
              </TouchableOpacity>

              {biometricAvailable && hasSavedCreds && (
                <TouchableOpacity
                  style={styles.biometricButton}
                  onPress={handleBiometricLogin}
                  disabled={loading}
                  activeOpacity={0.7}
                >
                  <MaterialCommunityIcons name="fingerprint" size={24} color="#4F46E5" />
                  <Text style={styles.biometricButtonText}>Schnell-Login mit Biometrie</Text>
                </TouchableOpacity>
              )}

              <View style={styles.footer}>
                <Text>Noch kein Konto? </Text>
                <Link href="/(auth)/register">
                  <Text style={styles.link}>Registrieren</Text>
                </Link>
              </View>


              {/* App Description – oben */}
              <View style={styles.descriptionBox}>
                <Text style={styles.descriptionTitle}>Organisation im Wechselmodell – ohne Drama.</Text>
                <Text style={styles.descriptionText}>
                  Wechselmodell-Planer ist die App für getrennte Eltern, die den Alltag verlässlich planen und gemeinsame Ausgaben transparent abrechnen wollen. Statt endlosen Chats, unendlichen Erinnerungen behaltet ihr Übergaben und Kosten im Auge. Trackt die Sachen, die bei der Übergabe hin und her wandern, und habt alle wichtigen Daten und Kontakte der Kinder in einem klaren System zur Hand. Die ausgeklügelten Tools helfen bei der Kommunikation und sind genau an die Bedürfnisse im Wechselmodell angepasst.
                </Text>
              </View>

              {/* App Download: Android + iOS Web-App Anleitung (nur Web) */}
              {Platform.OS === 'web' && (
                <View style={styles.downloadSection}>
                  <TouchableOpacity
                    style={styles.downloadBanner}
                    onPress={() => typeof window !== 'undefined' && window.open(APK_DOWNLOAD_URL, '_blank')}
                    activeOpacity={0.8}
                  >
                    <MaterialCommunityIcons name="android" size={32} color="#374151" />
                    <View style={styles.downloadBannerTextWrap}>
                      <Text style={styles.downloadBannerTitle}>App Download</Text>
                      <Text style={styles.downloadBannerSub}>Android-App herunterladen · APK installieren & offline nutzen</Text>
                    </View>
                    <MaterialCommunityIcons name="open-in-new" size={20} color="#6B7280" />
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.iosAnleitungButton}
                    onPress={() => setIosAnleitungVisible(true)}
                    activeOpacity={0.8}
                  >
                    <MaterialCommunityIcons name="apple" size={32} color="#374151" />
                    <Text style={styles.iosAnleitungLabel}>iOS Web-App installieren</Text>
                    <Text style={styles.iosAnleitungHint}>Anleitung anzeigen</Text>
                  </TouchableOpacity>
                </View>
              )}

              {/* Trial & Pricing Info – darunter */}
              <View style={styles.trialInfo}>
                <Text style={styles.trialText}>
                  14 Tage kostenlos testen mit voller Nutzung – damit ihr sicher seid, dass es für euer Wechselmodell passt.
                </Text>
                <Text style={styles.trialText}>
                  Danach einmalig 14,99 € – fair & ohne Abo.{'\n'}
                  Belege/Fotos hochladen optional mit Cloud Pro 1,99 €/Monat (nur für Serverkosten).
                </Text>
              </View>

              {/* Feature-Übersicht als 3x2 Grid */}
              <View style={styles.featuresSection}>
                <View style={styles.featuresGrid}>
                  <View style={styles.featureCell}>
                    <MaterialCommunityIcons name="calendar-sync" size={28} color="#4F46E5" />
                    <Text style={styles.featureCellTitle}>Wechselplan</Text>
                    <Text style={styles.featureCellDesc}>Rhythmus, Ausnahmen & Sondertage</Text>
                  </View>
                  <View style={styles.featureCell}>
                    <MaterialCommunityIcons name="clipboard-check-outline" size={28} color="#4F46E5" />
                    <Text style={styles.featureCellTitle}>Übergaben</Text>
                    <Text style={styles.featureCellDesc}>Checklisten & Notizen</Text>
                  </View>
                  <View style={styles.featureCell}>
                    <MaterialCommunityIcons name="cash-multiple" size={28} color="#4F46E5" />
                    <Text style={styles.featureCellTitle}>Ausgaben</Text>
                    <Text style={styles.featureCellDesc}>Erfassen, Kategorien & Saldo</Text>
                  </View>
                </View>
                <View style={styles.featuresGrid}>
                  <View style={styles.featureCell}>
                    <MaterialCommunityIcons name="calculator-variant" size={28} color="#4F46E5" />
                    <Text style={styles.featureCellTitle}>Abrechnung</Text>
                    <Text style={styles.featureCellDesc}>Quitt werden & neu starten</Text>
                  </View>
                  <View style={styles.featureCell}>
                    <MaterialCommunityIcons name="calendar-star" size={28} color="#4F46E5" />
                    <Text style={styles.featureCellTitle}>Schule</Text>
                    <Text style={styles.featureCellDesc}>Termine, Reminder & To-Dos</Text>
                  </View>
                  <View style={styles.featureCell}>
                    <MaterialCommunityIcons name="file-export-outline" size={28} color="#4F46E5" />
                    <Text style={styles.featureCellTitle}>Export</Text>
                    <Text style={styles.featureCellDesc}>Übersicht & Dokumentation</Text>
                  </View>
                </View>
              </View>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Modal: iOS Web-App Install-Anleitung */}
      <Modal
        visible={iosAnleitungVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setIosAnleitungVisible(false)}
      >
        <TouchableOpacity
          style={styles.modalBackdrop}
          activeOpacity={1}
          onPress={() => setIosAnleitungVisible(false)}
        >
          <View style={styles.modalContent}>
            <TouchableOpacity
              style={styles.modalClose}
              onPress={() => setIosAnleitungVisible(false)}
              hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
            >
              <MaterialCommunityIcons name="close" size={28} color="#374151" />
            </TouchableOpacity>
            <Image
              source={IOS_WEB_APP_ANLEITUNG}
              style={styles.anleitungImage}
              resizeMode="contain"
            />
            <Text style={styles.modalCaption}>iOS Web-App auf dem iPhone installieren</Text>
          </View>
        </TouchableOpacity>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#fff',
  },
  keyboardView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
  },
  container: {
    flex: 1,
    backgroundColor: '#fff',
    justifyContent: 'center',
    padding: 24,
  },
  logoContainer: {
    alignItems: 'center',
    marginBottom: 48,
  },
  appName: {
    fontSize: 28,
    fontWeight: '700',
    color: '#4F46E5',
    marginTop: 12,
    marginBottom: 8,
  },
  tagline: {
    fontSize: 16,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 4,
  },
  subtagline: {
    fontSize: 14,
    color: '#6B7280',
    fontStyle: 'italic',
  },
  form: {
    width: '100%',
  },
  fieldLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 6,
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
    fontSize: 16,
  },
  rememberMeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  rememberMeText: {
    fontSize: 14,
    color: '#374151',
    marginLeft: 8,
  },
  button: {
    backgroundColor: '#4F46E5',
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 8,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  biometricButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 12,
    paddingVertical: 14,
    borderRadius: 8,
    borderWidth: 1.5,
    borderColor: '#4F46E5',
    backgroundColor: '#EEF2FF',
  },
  biometricButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#4F46E5',
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 24,
  },
  link: {
    color: '#4F46E5',
    fontWeight: '600',
  },
  downloadSection: {
    flexDirection: 'row',
    alignItems: 'stretch',
    gap: 12,
    marginTop: 16,
    marginBottom: 8,
  },
  downloadBanner: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 12,
    backgroundColor: '#F3F4F6',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  downloadBannerTextWrap: {
    flex: 1,
  },
  downloadBannerTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#374151',
  },
  downloadBannerSub: {
    fontSize: 11,
    color: '#6B7280',
    marginTop: 2,
  },
  iosAnleitungButton: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 12,
    backgroundColor: '#F3F4F6',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    minWidth: 120,
  },
  iosAnleitungLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#374151',
    marginTop: 6,
    textAlign: 'center',
  },
  iosAnleitungHint: {
    fontSize: 10,
    color: '#9CA3AF',
    marginTop: 2,
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  modalContent: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    maxWidth: 400,
    width: '100%',
    alignItems: 'center',
  },
  modalClose: {
    alignSelf: 'flex-end',
    marginBottom: 8,
  },
  anleitungImage: {
    width: '100%',
    aspectRatio: 1,
    maxHeight: 360,
    borderRadius: 8,
  },
  modalCaption: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 12,
    textAlign: 'center',
  },
  descriptionBox: {
    marginTop: 32,
    paddingTop: 20,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  descriptionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#374151',
    textAlign: 'center',
    marginBottom: 12,
  },
  descriptionText: {
    fontSize: 13,
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 20,
  },
  trialInfo: {
    marginTop: 24,
    paddingTop: 20,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  trialText: {
    fontSize: 12,
    color: '#9CA3AF',
    textAlign: 'center',
    lineHeight: 18,
    marginBottom: 8,
  },
  featuresSection: {
    marginTop: 28,
    paddingTop: 20,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  featuresGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
    gap: 8,
  },
  featureCell: {
    flex: 1,
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 6,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  featureCellTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: '#374151',
    marginTop: 6,
    textAlign: 'center',
  },
  featureCellDesc: {
    fontSize: 10,
    color: '#6B7280',
    textAlign: 'center',
    marginTop: 2,
    lineHeight: 14,
  },
});
