import { Stack } from 'expo-router';

export default function OnboardingLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        animation: 'slide_from_right',
      }}
    >
      <Stack.Screen name="welcome" />
      <Stack.Screen name="create-family" />
      <Stack.Screen name="join-family" />
      <Stack.Screen name="add-children" />
      <Stack.Screen name="select-pattern" />
    </Stack>
  );
}
