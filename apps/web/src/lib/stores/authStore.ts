import { create } from 'zustand';
import type { Session, User } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';

interface AuthState {
  user: User | null;
  session: Session | null;
  loading: boolean;

  /** Initialize auth state by reading the current Supabase session */
  initialize: () => Promise<void>;

  /** Sign in with email and password */
  login: (email: string, password: string) => Promise<void>;

  /** Sign out and clear state */
  logout: () => Promise<void>;

  /** Update session (called by auth state change listener) */
  setSession: (session: Session | null) => void;

  /** Get current access token */
  getAccessToken: () => Promise<string | null>;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  session: null,
  loading: true,

  initialize: async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      set({
        session,
        user: session?.user ?? null,
        loading: false,
      });

      // Listen for auth state changes
      supabase.auth.onAuthStateChange((_event, session) => {
        set({
          session,
          user: session?.user ?? null,
        });
      });
    } catch (error) {
      console.error('Failed to initialize auth:', error);
      set({ loading: false });
    }
  },

  login: async (email: string, password: string) => {
    set({ loading: true });
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      if (error) throw error;
      set({
        session: data.session,
        user: data.user,
        loading: false,
      });
    } catch (error) {
      set({ loading: false });
      throw error;
    }
  },

  logout: async () => {
    set({ loading: true });
    try {
      await supabase.auth.signOut();
      set({
        session: null,
        user: null,
        loading: false,
      });
    } catch (error) {
      set({ loading: false });
      throw error;
    }
  },

  setSession: (session) => {
    set({
      session,
      user: session?.user ?? null,
    });
  },

  getAccessToken: async () => {
    const { data: { session } } = await supabase.auth.getSession();
    return session?.access_token ?? null;
  },
}));
