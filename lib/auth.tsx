import React, { createContext, useContext, useEffect, useState } from 'react';
import { Session, User } from '@supabase/supabase-js';
import { supabase } from './supabase';
import { registerForPushNotifications } from './notifications';
import { EncryptionService } from './encryption';
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

  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        setState(prev => ({ ...prev, session, user: session.user }));
        // Initialize encryption master key
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

    return () => subscription.unsubscribe();
  }, []);

  async function loadUserData(userId: string) {
    try {
      // Load profile
      const { data: profile } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();

      // Load family membership
      const { data: membership } = await supabase
        .from('family_members')
        .select('*, families(*)')
        .eq('user_id', userId)
        .single();

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
      setState(prev => ({ ...prev, isLoading: false }));
    }
  }

  async function signUp(email: string, password: string, displayName: string) {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { display_name: displayName } },
    });
    if (error) throw error;

    // Create profile
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
    // Clear encryption key from memory for security
    EncryptionService.clearMasterKey();
    await supabase.auth.signOut();
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
