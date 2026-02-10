import { Stack } from 'expo-router';

export default function ModalLayout() {
  return (
    <Stack screenOptions={{ headerShown: false, presentation: 'modal' }}>
      <Stack.Screen name="add-expense" />
      <Stack.Screen name="add-exception" />
      <Stack.Screen name="child-info" />
    </Stack>
  );
}
