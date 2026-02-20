import { useEffect } from 'react';
import { Stack } from 'expo-router';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider } from '@/lib/auth';
import { View, Platform, StyleSheet, ActivityIndicator } from 'react-native';
import { useFonts } from 'expo-font';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import * as React from 'react';

// Workaround (web): Flatten style arrays before they reach the DOM.
// React DOM crashes with "Indexed property setter is not supported" when style is an array.
if (Platform.OS === 'web') {
  try {
    const ReactAny = React as any;
    const normalizeStyle = (props: any) => {
      if (!props) return props;
      if (props.style != null) {
        if (Array.isArray(props.style) || typeof props.style === 'number') {
          try {
            const flattened = StyleSheet.flatten(props.style);
            return { ...props, style: flattened ?? {} };
          } catch {
            return { ...props, style: {} };
          }
        }
      }
      // Recursively normalize children props if they exist
      if (props.children && typeof props.children === 'object' && !Array.isArray(props.children)) {
        return { ...props, children: normalizeStyle(props.children) };
      }
      return props;
    };
    
    // Patch createElement
    if (typeof ReactAny.createElement === 'function' && !ReactAny.__styleFlattenPatched) {
      const originalCreateElement = ReactAny.createElement;
      ReactAny.createElement = (type: any, props: any, ...children: any[]) => {
        return originalCreateElement(type, normalizeStyle(props ?? {}), ...children);
      };
      ReactAny.__styleFlattenPatched = true;
    }
    
    // Patch jsx runtime (React 17+)
    let JsxRuntime: any;
    try {
      JsxRuntime = require('react/jsx-runtime');
    } catch {
      JsxRuntime = null;
    }
    if (JsxRuntime && !JsxRuntime.__styleFlattenPatched) {
      const origJsx = JsxRuntime.jsx;
      const origJsxs = JsxRuntime.jsxs;
      JsxRuntime.jsx = (type: any, props: any, key?: any) => {
        return origJsx(type, normalizeStyle(props ?? {}), key);
      };
      if (origJsxs) {
        JsxRuntime.jsxs = (type: any, props: any, key?: any) => {
          return origJsxs(type, normalizeStyle(props ?? {}), key);
        };
      }
      JsxRuntime.__styleFlattenPatched = true;
    }
    
    // Also patch react-native-web's View component directly as a fallback
    try {
      const RNWeb = require('react-native-web');
      if (RNWeb && RNWeb.View) {
        const OriginalView = RNWeb.View;
        if (!OriginalView.__styleFlattenPatched) {
          RNWeb.View = React.forwardRef((props: any, ref: any) => {
            const normalizedProps = normalizeStyle(props);
            return React.createElement(OriginalView, { ...normalizedProps, ref });
          });
          RNWeb.View.__styleFlattenPatched = true;
        }
      }
    } catch {
      // ignore
    }
  } catch {
    // ignore
  }
}

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 minutes
      retry: 2,
    },
  },
});

export default function RootLayout() {
  const [fontsLoaded] = useFonts({
    ...MaterialCommunityIcons.font,
  });

  useEffect(() => {
    if (Platform.OS === 'web' && 'serviceWorker' in navigator) {
      navigator.serviceWorker.register('/service-worker.js').catch(() => {});
    }
  }, []);

  if (!fontsLoaded) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#fff' }}>
        <ActivityIndicator size="large" color="#4F46E5" />
      </View>
    );
  }

  return (
    <View style={{ flex: 1 }}>
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <Stack screenOptions={{ headerShown: false }}>
            <Stack.Screen name="(auth)" />
            <Stack.Screen name="(onboarding)" />
            <Stack.Screen name="(tabs)" />
            <Stack.Screen
              name="modal"
              options={{ presentation: 'modal', headerShown: false }}
            />
          </Stack>
        </AuthProvider>
      </QueryClientProvider>
    </View>
  );
}
