import React, { createContext, useContext, useEffect, useState } from 'react';
import { Session, User } from '@supabase/supabase-js';
import { router } from 'expo-router';
import * as Linking from 'expo-linking';
import { Platform } from 'react-native';
import { supabase } from './supabase';
import { registerForPushNotifications } from './notifications';
import { EncryptionService } from './encryption';
import { BiometricAuth } from './biometric-auth';
import type { Profile, Family, FamilyMember } from '@/types';

interface AuthState {
  session: Session | null;
  user: User | null;
  profile: Profile | null;
  family: Family | null;
  familyMember: FamilyMember | null;
  isLoading: boolean;
  isOnboarded: boolean;
}

interface AuthContextType extends AuthState {
  signUp: (email: string, password: string, displayName: string) => Promise<void>;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
  refreshFamily: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

async function extractAndSetSession(url: string) {
  try {
    // Supabase appends tokens as a URL fragment (#access_token=...&refresh_token=...)
    // or as query params (?access_token=...&refresh_token=...)
    const hashIndex = url.indexOf('#');
    const queryIndex = url.indexOf('?');
    const paramString =
      hashIndex !== -1
        ? url.substring(hashIndex + 1)
        : queryIndex !== -1
          ? url.substring(queryIndex + 1)
          : '';

    if (!paramString) return;

    const params = new URLSearchParams(paramString);
    const accessToken = params.get('access_token');
    const refreshToken = params.get('refresh_token');

    if (accessToken && refreshToken) {
      const { error } = await supabase.auth.setSession({
        access_token: accessToken,
        refresh_token: refreshToken,
      });
      if (error) {
        console.error('[Auth] Failed to set session from deep link:', error.message);
      }
    }
  } catch (err) {
    console.error('[Auth] Error processing deep link:', err);
  }
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<AuthState>({
    session: null,
    user: null,
    profile: null,
    family: null,
    familyMember: null,
    isLoading: true,
    isOnboarded: false,
  });

  function clearAuthState() {
    setState({
      session: null,
      user: null,
      profile: null,
      family: null,
      familyMember: null,
      isLoading: false,
      isOnboarded: false,
    });
  }

  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        setState(prev => ({ ...prev, session, user: session.user }));
        EncryptionService.initializeMasterKey().catch((error) => {
          console.error('Failed to initialize encryption key:', error);
        });
        loadUserData(session.user.id);
      } else {
        setState(prev => ({ ...prev, isLoading: false }));
      }
    });

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setState(prev => ({ ...prev, session, user: session?.user ?? null }));
      if (session?.user) {
        loadUserData(session.user.id);
      } else {
        setState(prev => ({
          ...prev,
          profile: null,
          family: null,
          familyMember: null,
          isOnboarded: false,
          isLoading: false,
        }));
      }
    });

    // On native: listen for deep-link redirects that carry auth tokens
    // (e.g. after email confirmation: wechselmodell-planer://login#access_token=...&refresh_token=...)
    if (Platform.OS !== 'web') {
      const handleDeepLink = async (event: { url: string }) => {
        await extractAndSetSession(event.url);
      };

      const linkingSub = Linking.addEventListener('url', handleDeepLink);

      // Also check the URL that opened/resumed the app
      Linking.getInitialURL().then((url) => {
        if (url) extractAndSetSession(url);
      });

      return () => {
        subscription.unsubscribe();
        linkingSub.remove();
      };
    }

    return () => subscription.unsubscribe();
  }, []);

  async function loadUserData(userId: string) {
    try {
      // Load profile
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();

      let profile = profileData;

      // If the user was deleted server-side but the client still has a persisted session,
      // Supabase may return an error or no rows. In that case, force logout on web so the user sees login.
      if (profileError) {
        // If profile row is missing, try to recreate once (can happen if DB triggers weren't deployed).
        if (profileError.code === 'PGRST116') {
          const { data: { user } } = await supabase.auth.getUser();
          const displayName =
            (user?.user_metadata as any)?.display_name ||
            (user?.email ? user.email.split('@')[0] : 'User');

          const { error: insertError } = await supabase
            .from('profiles')
            .insert({ id: userId, display_name: displayName });

          if (!insertError) {
            const retry = await supabase
              .from('profiles')
              .select('*')
              .eq('id', userId)
              .single();

            if (retry.data) {
              profile = retry.data;
            } else {
              await supabase.auth.signOut().catch(() => {});
              clearAuthState();
              router.replace('/(auth)/login');
              return;
            }
          } else {
            await supabase.auth.signOut().catch(() => {});
            clearAuthState();
            router.replace('/(auth)/login');
            return;
          }
        } else {
          await supabase.auth.signOut().catch(() => {});
          clearAuthState();
          router.replace('/(auth)/login');
          return;
        }
      }

      // Load family membership
      const { data: membership, error: membershipError } = await supabase
        .from('family_members')
        .select('*, families(*)')
        .eq('user_id', userId)
        .single();

      // No membership is fine (user not onboarded yet). Other errors should log out to avoid a "ghost session".
      if (membershipError && membershipError.code !== 'PGRST116') {
        await supabase.auth.signOut().catch(() => {});
        clearAuthState();
        router.replace('/(auth)/login');
        return;
      }

      const family = membership?.families as Family | null;
      const familyMember = membership ? {
        id: membership.id,
        family_id: membership.family_id,
        user_id: membership.user_id,
        role: membership.role,
        joined_at: membership.joined_at,
      } as FamilyMember : null;

      const isOnboarded = !!family;

      setState(prev => ({
        ...prev,
        profile,
        family,
        familyMember,
        isOnboarded,
        isLoading: false,
      }));

      // Register for push notifications
      registerForPushNotifications(userId).catch((error) => {
        console.error('Failed to register for push notifications:', error);
      });
    } catch {
      // If something goes wrong while a session exists, don't keep the app in a half-authenticated state.
      await supabase.auth.signOut().catch(() => {});
      clearAuthState();
      router.replace('/(auth)/login');
    }
  }

  async function signUp(email: string, password: string, displayName: string) {
    const siteUrl = (process.env.EXPO_PUBLIC_SITE_URL || '').trim();
    const webBaseUrl =
      siteUrl ||
      (typeof window !== 'undefined' && window.location?.origin ? window.location.origin : '');

    // On native: use the custom scheme so the email confirmation link opens the app directly
    // On web: redirect back to the web app's login page
    const emailRedirectTo =
      Platform.OS === 'web'
        ? (webBaseUrl ? `${webBaseUrl}/login` : undefined)
        : Linking.createURL('/');

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { display_name: displayName },
        ...(emailRedirectTo ? { emailRedirectTo } : {}),
      },
    });
    if (error) throw error;

    if (data.user) {
      await supabase.from('profiles').insert({
        id: data.user.id,
        display_name: displayName,
      });
    }
  }

  async function signIn(email: string, password: string) {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
  }

  async function signOut() {
    EncryptionService.clearMasterKey();
    const rememberMe = await BiometricAuth.getRememberMe();
    if (!rememberMe) {
      await BiometricAuth.clearCredentials();
    }
    await supabase.auth.signOut();
    router.replace('/(auth)/login');
  }

  async function refreshProfile() {
    if (state.user) {
      const { data } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', state.user.id)
        .single();
      setState(prev => ({ ...prev, profile: data }));
    }
  }

  async function refreshFamily() {
    if (state.user) {
      await loadUserData(state.user.id);
    }
  }

  return (
    <AuthContext.Provider value={{
      ...state,
      signUp,
      signIn,
      signOut,
      refreshProfile,
      refreshFamily,
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
