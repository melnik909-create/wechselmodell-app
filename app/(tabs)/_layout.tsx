import { Tabs, router } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { COLORS } from '@/lib/constants';
import { useEffect } from 'react';
import { useAuth } from '@/lib/auth';
import { useChildren, useCustodyPattern } from '@/hooks/useFamily';

export default function TabLayout() {
  const { family, isLoading: authLoading } = useAuth();
  const { data: pattern, isLoading: patternLoading, isFetching: patternFetching } = useCustodyPattern();
  const { data: children, isLoading: childrenLoading, isFetching: childrenFetching } = useChildren();

  useEffect(() => {
    if (authLoading) return;
    if (!family?.id) return;
    if (patternLoading || childrenLoading) return;
    if (patternFetching || childrenFetching) return;

    // Wenn kein Pattern vorhanden ist, zu select-pattern navigieren
    // Dies verhindert, dass der User in /(tabs) bleibt, wenn kein Pattern existiert
    if (!pattern) {
      router.replace('/(onboarding)/select-pattern');
      return;
    }

    // Wenn keine Children vorhanden sind, zu add-children navigieren
    if (!children || children.length === 0) {
      router.replace('/(onboarding)/add-children');
      return;
    }
  }, [authLoading, family?.id, patternLoading, childrenLoading, patternFetching, childrenFetching, pattern, children?.length]);

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: COLORS.primary,
        tabBarInactiveTintColor: COLORS.textMuted,
        tabBarStyle: {
          backgroundColor: COLORS.surface,
          borderTopColor: COLORS.border,
        },
        headerStyle: {
          backgroundColor: COLORS.surface,
        },
        headerTintColor: COLORS.text,
        headerTitleStyle: {
          fontWeight: '600',
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Home',
          tabBarIcon: ({ color, size }) => (
            <MaterialCommunityIcons name="home" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="actions"
        options={{
          title: 'Aktionen',
          tabBarIcon: ({ color, size }) => (
            <MaterialCommunityIcons name="lightning-bolt" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="calendar"
        options={{
          title: 'Kalender',
          tabBarIcon: ({ color, size }) => (
            <MaterialCommunityIcons name="calendar-month" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="handover"
        options={{
          href: null,
        }}
      />
      <Tabs.Screen
        name="handover-old-backup"
        options={{
          href: null,
        }}
      />
      <Tabs.Screen
        name="expenses"
        options={{
          title: 'Ausgaben',
          tabBarIcon: ({ color, size }) => (
            <MaterialCommunityIcons name="currency-eur" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="more"
        options={{
          title: 'Mehr',
          tabBarIcon: ({ color, size }) => (
            <MaterialCommunityIcons name="dots-horizontal" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="more/upgrade"
        options={{
          href: null,
        }}
      />
    </Tabs>
  );
}
