import { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useAuth } from '@/lib/auth';
import { DataMigrationService } from '@/lib/migration';
import { COLORS } from '@/lib/constants';

type MigrationStatus = 'pending' | 'running' | 'completed' | 'failed';

export default function MigrationScreen() {
  const { family } = useAuth();
  const [progress, setProgress] = useState(0);
  const [status, setStatus] = useState<MigrationStatus>('pending');
  const [currentStep, setCurrentStep] = useState('');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function runMigration() {
      if (!family) {
        setError('Keine Familie gefunden');
        setStatus('failed');
        return;
      }

      setStatus('running');
      setProgress(10);

      try {
        // Step 1: Migrate children data
        setCurrentStep('Verschlüssele Kinder-Daten...');
        setProgress(20);
        await DataMigrationService.migrateChildren(family.id);
        setProgress(50);

        // Step 2: Migrate emergency contacts
        setCurrentStep('Verschlüssele Notfallkontakte...');
        setProgress(60);
        await DataMigrationService.migrateEmergencyContacts(family.id);
        setProgress(75);

        // Step 3: Migrate contacts
        setCurrentStep('Verschlüssele Kontakte...');
        setProgress(85);
        await DataMigrationService.migrateContacts(family.id);
        setProgress(100);

        setCurrentStep('Fertig!');
        setStatus('completed');

        // Navigate to main app after 2 seconds
        setTimeout(() => {
          router.replace('/(tabs)');
        }, 2000);
      } catch (error: any) {
        console.error('[Migration] Migration failed:', error);
        setError(error.message || 'Migration fehlgeschlagen');
        setStatus('failed');
      }
    }

    runMigration();
  }, [family]);

  const getStatusIcon = () => {
    switch (status) {
      case 'running':
        return <ActivityIndicator size={80} color="#A855F7" />;
      case 'completed':
        return <MaterialCommunityIcons name="check-circle" size={80} color="#10B981" />;
      case 'failed':
        return <MaterialCommunityIcons name="alert-circle" size={80} color="#EF4444" />;
      default:
        return <MaterialCommunityIcons name="shield-lock" size={80} color="#A855F7" />;
    }
  };

  const getStatusColor = () => {
    switch (status) {
      case 'completed':
        return '#10B981';
      case 'failed':
        return '#EF4444';
      default:
        return '#A855F7';
    }
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
      <View style={styles.container}>
        {/* Icon */}
        <View style={styles.iconContainer}>{getStatusIcon()}</View>

        {/* Title */}
        <Text style={styles.title}>
          {status === 'completed'
            ? 'Verschlüsselung abgeschlossen!'
            : status === 'failed'
            ? 'Fehler bei der Verschlüsselung'
            : 'Daten werden verschlüsselt...'}
        </Text>

        {/* Progress Bar */}
        {status === 'running' && (
          <View style={styles.progressContainer}>
            <View style={styles.progressBarBackground}>
              <View
                style={[
                  styles.progressBarFill,
                  { width: `${progress}%`, backgroundColor: getStatusColor() },
                ]}
              />
            </View>
            <Text style={styles.progressText}>{Math.round(progress)}%</Text>
          </View>
        )}

        {/* Current Step */}
        {status === 'running' && currentStep && (
          <Text style={styles.currentStep}>{currentStep}</Text>
        )}

        {/* Description */}
        {status === 'running' && (
          <Text style={styles.description}>
            Deine sensiblen Daten werden jetzt mit AES-256 verschlüsselt für maximale Sicherheit.
            Dies dauert nur wenige Sekunden.
          </Text>
        )}

        {status === 'completed' && (
          <View style={styles.successContainer}>
            <Text style={styles.successText}>
              ✓ Alle sensiblen Daten sind jetzt verschlüsselt
            </Text>
            <Text style={styles.successText}>
              ✓ Nur du hast Zugriff auf deine Daten
            </Text>
            <Text style={styles.successSubtext}>
              Du wirst automatisch zur App weitergeleitet...
            </Text>
          </View>
        )}

        {status === 'failed' && error && (
          <View style={styles.errorContainer}>
            <Text style={styles.errorText}>
              Es ist ein Fehler aufgetreten:
            </Text>
            <Text style={styles.errorDetails}>{error}</Text>
            <Text style={styles.errorSubtext}>
              Bitte starte die App neu und versuche es erneut.
            </Text>
          </View>
        )}

        {/* Security Info */}
        {status === 'running' && (
          <View style={styles.infoBox}>
            <MaterialCommunityIcons name="information" size={16} color="#6366F1" />
            <Text style={styles.infoText}>
              Dein Verschlüsselungsschlüssel wird nur auf diesem Gerät gespeichert und niemals an
              unsere Server übertragen.
            </Text>
          </View>
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  iconContainer: {
    marginBottom: 32,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: '#111',
    textAlign: 'center',
    marginBottom: 24,
  },
  progressContainer: {
    width: '100%',
    alignItems: 'center',
    marginBottom: 16,
  },
  progressBarBackground: {
    width: '100%',
    height: 8,
    backgroundColor: '#E5E7EB',
    borderRadius: 4,
    overflow: 'hidden',
    marginBottom: 8,
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 4,
    transition: 'width 0.3s ease',
  },
  progressText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6B7280',
  },
  currentStep: {
    fontSize: 16,
    fontWeight: '500',
    color: '#374151',
    textAlign: 'center',
    marginBottom: 16,
  },
  description: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 32,
  },
  successContainer: {
    alignItems: 'center',
    gap: 8,
  },
  successText: {
    fontSize: 16,
    color: '#10B981',
    fontWeight: '500',
    textAlign: 'center',
  },
  successSubtext: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
    marginTop: 16,
  },
  errorContainer: {
    alignItems: 'center',
    gap: 8,
  },
  errorText: {
    fontSize: 16,
    color: '#EF4444',
    fontWeight: '600',
    textAlign: 'center',
  },
  errorDetails: {
    fontSize: 14,
    color: '#DC2626',
    textAlign: 'center',
    marginVertical: 8,
  },
  errorSubtext: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
    marginTop: 16,
  },
  infoBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    backgroundColor: '#EEF2FF',
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#C7D2FE',
    marginTop: 32,
  },
  infoText: {
    flex: 1,
    fontSize: 12,
    color: '#4338CA',
    lineHeight: 16,
  },
});
