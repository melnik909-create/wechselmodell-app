import { useState, useEffect } from 'react';
import { View, Text, TextInput, ScrollView, TouchableOpacity, StyleSheet, Alert, KeyboardAvoidingView, Platform } from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { COLORS } from '@/lib/constants';
import type { Child } from '@/types';

export default function EditChildScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const queryClient = useQueryClient();

  const { data: child, isLoading } = useQuery({
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

  const [allergies, setAllergies] = useState('');
  const [bloodType, setBloodType] = useState('');
  const [doctorName, setDoctorName] = useState('');
  const [doctorPhone, setDoctorPhone] = useState('');
  const [doctorAddress, setDoctorAddress] = useState('');
  const [schoolName, setSchoolName] = useState('');
  const [schoolPhone, setSchoolPhone] = useState('');
  const [schoolAddress, setSchoolAddress] = useState('');
  const [daycareName, setDaycareName] = useState('');
  const [daycarePhone, setDaycarePhone] = useState('');
  const [insuranceName, setInsuranceName] = useState('');
  const [insuranceNumber, setInsuranceNumber] = useState('');
  const [notes, setNotes] = useState('');

  useEffect(() => {
    if (child) {
      setAllergies(child.allergies ?? '');
      setBloodType(child.blood_type ?? '');
      setDoctorName(child.doctor_name ?? '');
      setDoctorPhone(child.doctor_phone ?? '');
      setDoctorAddress(child.doctor_address ?? '');
      setSchoolName(child.school_name ?? '');
      setSchoolPhone(child.school_phone ?? '');
      setSchoolAddress(child.school_address ?? '');
      setDaycareName(child.daycare_name ?? '');
      setDaycarePhone(child.daycare_phone ?? '');
      setInsuranceName(child.insurance_name ?? '');
      setInsuranceNumber(child.insurance_number ?? '');
      setNotes(child.notes ?? '');
    }
  }, [child]);

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!id) throw new Error('Keine Kind-ID');
      const { error } = await supabase
        .from('children')
        .update({
          allergies: allergies.trim() || null,
          blood_type: bloodType.trim() || null,
          doctor_name: doctorName.trim() || null,
          doctor_phone: doctorPhone.trim() || null,
          doctor_address: doctorAddress.trim() || null,
          school_name: schoolName.trim() || null,
          school_phone: schoolPhone.trim() || null,
          school_address: schoolAddress.trim() || null,
          daycare_name: daycareName.trim() || null,
          daycare_phone: daycarePhone.trim() || null,
          insurance_name: insuranceName.trim() || null,
          insurance_number: insuranceNumber.trim() || null,
          notes: notes.trim() || null,
        })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['child', id] });
      queryClient.invalidateQueries({ queryKey: ['children'] });
      Alert.alert('Gespeichert', 'Informationen wurden aktualisiert.', [
        { text: 'OK', onPress: () => router.back() }
      ]);
    },
    onError: (error: any) => {
      Alert.alert('Fehler', error.message);
    },
  });

  if (isLoading || !child) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.loading}>
          <Text>Laden...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea} edges={['bottom']}>
      <KeyboardAvoidingView
        style={styles.keyboardView}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
          <SectionHeader icon="heart-pulse" title="Gesundheit" />

          <Input
            label="Allergien"
            placeholder="z.B. Erdnüsse, Laktose..."
            value={allergies}
            onChangeText={setAllergies}
            multiline
          />

          <Input
            label="Blutgruppe"
            placeholder="z.B. A+, 0-, AB+"
            value={bloodType}
            onChangeText={setBloodType}
          />

          <Text style={styles.subsectionTitle}>Kinderarzt</Text>
          <Input
            label="Name"
            placeholder="Dr. Maria Schmidt"
            value={doctorName}
            onChangeText={setDoctorName}
          />
          <Input
            label="Telefon"
            placeholder="+49 30 12345678"
            value={doctorPhone}
            onChangeText={setDoctorPhone}
            keyboardType="phone-pad"
          />
          <Input
            label="Adresse"
            placeholder="Hauptstraße 123, 10115 Berlin"
            value={doctorAddress}
            onChangeText={setDoctorAddress}
            multiline
          />

          <Text style={styles.subsectionTitle}>Krankenversicherung</Text>
          <Input
            label="Krankenkasse"
            placeholder="TK, AOK, Barmer..."
            value={insuranceName}
            onChangeText={setInsuranceName}
          />
          <Input
            label="Versichertennummer"
            placeholder="K123456789"
            value={insuranceNumber}
            onChangeText={setInsuranceNumber}
          />

          <SectionHeader icon="school" title="Bildung" />

          <Text style={styles.subsectionTitle}>Schule</Text>
          <Input
            label="Name"
            placeholder="Grundschule am Stadtpark"
            value={schoolName}
            onChangeText={setSchoolName}
          />
          <Input
            label="Telefon"
            placeholder="+49 30 98765432"
            value={schoolPhone}
            onChangeText={setSchoolPhone}
            keyboardType="phone-pad"
          />
          <Input
            label="Adresse"
            placeholder="Schulweg 5, 10115 Berlin"
            value={schoolAddress}
            onChangeText={setSchoolAddress}
            multiline
          />

          <Text style={styles.subsectionTitle}>Kita / Kindergarten</Text>
          <Input
            label="Name"
            placeholder="Kita Sonnenschein"
            value={daycareName}
            onChangeText={setDaycareName}
          />
          <Input
            label="Telefon"
            placeholder="+49 30 55555555"
            value={daycarePhone}
            onChangeText={setDaycarePhone}
            keyboardType="phone-pad"
          />

          <SectionHeader icon="note-text" title="Notizen" />
          <Input
            label="Besonderheiten"
            placeholder="Sonstige wichtige Infos..."
            value={notes}
            onChangeText={setNotes}
            multiline
            numberOfLines={4}
          />
        </ScrollView>

        <View style={styles.buttonContainer}>
          <TouchableOpacity
            style={[styles.button, saveMutation.isPending && styles.buttonDisabled]}
            onPress={() => saveMutation.mutate()}
            disabled={saveMutation.isPending}
          >
            <Text style={styles.buttonText}>
              {saveMutation.isPending ? 'Speichern...' : 'Speichern'}
            </Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function SectionHeader({ icon, title }: { icon: string; title: string }) {
  return (
    <View style={styles.sectionHeader}>
      <MaterialCommunityIcons name={icon as any} size={22} color={COLORS.primary} />
      <Text style={styles.sectionTitle}>{title}</Text>
    </View>
  );
}

function Input({
  label,
  placeholder,
  value,
  onChangeText,
  multiline = false,
  numberOfLines = 1,
  keyboardType = 'default',
}: {
  label: string;
  placeholder: string;
  value: string;
  onChangeText: (text: string) => void;
  multiline?: boolean;
  numberOfLines?: number;
  keyboardType?: 'default' | 'phone-pad';
}) {
  return (
    <View style={styles.inputGroup}>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        style={[styles.input, multiline && styles.inputMultiline]}
        placeholder={placeholder}
        value={value}
        onChangeText={onChangeText}
        multiline={multiline}
        numberOfLines={numberOfLines}
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
  keyboardView: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingVertical: 16,
    paddingBottom: 32,
  },
  loading: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginTop: 24,
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#111',
  },
  subsectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6B7280',
    marginTop: 16,
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  inputGroup: {
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: '500',
    color: '#374151',
    marginBottom: 6,
  },
  input: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    color: '#111',
  },
  inputMultiline: {
    minHeight: 80,
    textAlignVertical: 'top',
  },
  buttonContainer: {
    padding: 16,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  button: {
    backgroundColor: '#4F46E5',
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
