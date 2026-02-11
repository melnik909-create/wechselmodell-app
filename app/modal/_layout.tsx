import { Stack } from 'expo-router';

export default function ModalLayout() {
  return (
    <Stack>
      <Stack.Screen
        name="child-info"
        options={{
          presentation: 'modal',
          headerShown: true,
          headerTitle: 'Kind-Info',
          headerBackTitle: 'Zurück',
        }}
      />
      <Stack.Screen
        name="add-expense"
        options={{
          presentation: 'modal',
          headerShown: true,
          headerTitle: 'Ausgabe hinzufügen',
          headerBackTitle: 'Zurück',
        }}
      />
      <Stack.Screen
        name="add-exception"
        options={{
          presentation: 'modal',
          headerShown: true,
          headerTitle: 'Ausnahme vorschlagen',
          headerBackTitle: 'Zurück',
        }}
      />
    </Stack>
  );
}
