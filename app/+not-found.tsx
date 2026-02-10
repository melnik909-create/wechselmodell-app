import { View, Text } from 'react-native';
import { Link, Stack } from 'expo-router';

export default function NotFoundScreen() {
  return (
    <>
      <Stack.Screen options={{ title: 'Nicht gefunden' }} />
      <View className="flex-1 items-center justify-center p-4">
        <Text className="text-xl font-bold text-gray-900 mb-4">
          Seite nicht gefunden
        </Text>
        <Link href="/" className="text-indigo-600 font-semibold">
          Zur Startseite
        </Link>
      </View>
    </>
  );
}
