import { useState, useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity, Alert } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Card } from '@/components/ui/Card';
import { supabase } from '@/lib/supabase';
import { COLORS } from '@/lib/constants';
import type { Child } from '@/types';

export default function ChildInfoModal() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const queryClient = useQueryClient();

  const { data: child } = useQuery({
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
  const [doctorName, setDoctorName] = useState('');
  const [doctorPhone, setDoctorPhone] = useState('');
  const [schoolName, setSchoolName] = useState('');
  const [schoolPhone, setSchoolPhone] = useState('');
  const [insuranceName, setInsuranceName] = useState('');
  const [insuranceNumber, setInsuranceNumber] = useState('');
  const [notes, setNotes] = useState('');

  useEffect(() => {
    if (child) {
      setAllergies(child.allergies ?? '');
      setDoctorName(child.doctor_name ?? '');
      setDoctorPhone(child.doctor_phone ?? '');
      setSchoolName(child.school_name ?? '');
      setSchoolPhone(child.school_phone ?? '');
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
          doctor_name: doctorName.trim() || null,
          doctor_phone: doctorPhone.trim() || null,
          school_name: schoolName.trim() || null,
          school_phone: schoolPhone.trim() || null,
          insurance_name: insuranceName.trim() || null,
          insurance_number: insuranceNumber.trim() || null,
          notes: notes.trim() || null,
          updated_at: new Date().toISOString(),
        })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['child', id] });
      queryClient.invalidateQueries({ queryKey: ['children'] });
      Alert.alert('Gespeichert', 'Informationen wurden aktualisiert.');
    },
    onError: (error: any) => {
      Alert.alert('Fehler', error.message);
    },
  });

  return (
    <SafeAreaView className="flex-1 bg-white">
      {/* Header */}
      <View className="flex-row items-center justify-between px-4 py-3 border-b border-gray-100">
        <TouchableOpacity onPress={() => router.back()}>
          <MaterialCommunityIcons name="close" size={24} color={COLORS.text} />
        </TouchableOpacity>
        <Text className="text-lg font-semibold text-gray-900">
          {child?.name ?? 'Kind-Info'}
        </Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView className="flex-1 px-4 py-4" keyboardShouldPersistTaps="handled">
        {/* Health */}
        <SectionHeader icon="hospital-box" title="Gesundheit" />
        <Input
          label="Allergien"
          placeholder="z.B. Erdnuesse, Laktose..."
          value={allergies}
          onChangeText={setAllergies}
          multiline
        />
        <Input
          label="Kinderarzt"
          placeholder="Name des Arztes"
          value={doctorName}
          onChangeText={setDoctorName}
        />
        <Input
          label="Arzt Telefon"
          placeholder="Telefonnummer"
          value={doctorPhone}
          onChangeText={setDoctorPhone}
          keyboardType="phone-pad"
        />

        {/* School */}
        <SectionHeader icon="school" title="Schule / Kita" />
        <Input
          label="Schule / Kita Name"
          placeholder="Name der Einrichtung"
          value={schoolName}
          onChangeText={setSchoolName}
        />
        <Input
          label="Schule / Kita Telefon"
          placeholder="Telefonnummer"
          value={schoolPhone}
          onChangeText={setSchoolPhone}
          keyboardType="phone-pad"
        />

        {/* Insurance */}
        <SectionHeader icon="shield-check" title="Versicherung" />
        <Input
          label="Krankenkasse"
          placeholder="Name der Krankenkasse"
          value={insuranceName}
          onChangeText={setInsuranceName}
        />
        <Input
          label="Versichertennummer"
          placeholder="Versichertennummer"
          value={insuranceNumber}
          onChangeText={setInsuranceNumber}
        />

        {/* Notes */}
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

      <View className="px-4 pb-6">
        <Button
          title="Speichern"
          onPress={() => saveMutation.mutate()}
          loading={saveMutation.isPending}
        />
      </View>
    </SafeAreaView>
  );
}

function SectionHeader({ icon, title }: { icon: string; title: string }) {
  return (
    <View className="flex-row items-center gap-2 mb-2 mt-4">
      <MaterialCommunityIcons name={icon as any} size={20} color={COLORS.primary} />
      <Text className="text-base font-semibold text-gray-900">{title}</Text>
    </View>
  );
}
