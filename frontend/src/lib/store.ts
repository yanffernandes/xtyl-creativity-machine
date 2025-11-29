import { create } from 'zustand';
import { supabase } from './supabase';
import { Session, User as SupabaseUser } from '@supabase/supabase-js';
import api from './api';

interface User {
    id: string;
    email: string;
    full_name: string;
}

interface AuthState {
    user: User | null;
    session: Session | null;
    token: string | null; // Derived from session for backwards compatibility
    isLoading: boolean;
    login: (email: string, password: string) => Promise<{ error: string | null }>;
    register: (email: string, password: string, fullName: string) => Promise<{ error: string | null }>;
    logout: () => Promise<void>;
    resetPassword: (email: string) => Promise<{ error: string | null }>;
    fetchUser: () => Promise<void>;
    setSession: (session: Session | null) => void;
    initializeAuth: () => Promise<void>;
    getAccessToken: () => Promise<string | null>;
}

// Helper to convert Supabase user to our User format
const mapSupabaseUser = (supabaseUser: SupabaseUser | null): User | null => {
    if (!supabaseUser) return null;
    return {
        id: supabaseUser.id,
        email: supabaseUser.email || '',
        full_name: supabaseUser.user_metadata?.full_name || '',
    };
};

export const useAuthStore = create<AuthState>((set, get) => ({
    user: null,
    session: null,
    token: null, // Derived from session for backwards compatibility
    isLoading: true,

    login: async (email: string, password: string) => {
        const { data, error } = await supabase.auth.signInWithPassword({
            email,
            password,
        });

        if (error) {
            return { error: error.message };
        }

        set({
            session: data.session,
            token: data.session?.access_token || null,
            user: mapSupabaseUser(data.user),
        });

        return { error: null };
    },

    register: async (email: string, password: string, fullName: string) => {
        const { data, error } = await supabase.auth.signUp({
            email,
            password,
            options: {
                data: {
                    full_name: fullName,
                },
            },
        });

        if (error) {
            return { error: error.message };
        }

        // Since email verification is disabled, user should be logged in immediately
        if (data.session) {
            set({
                session: data.session,
                token: data.session?.access_token || null,
                user: mapSupabaseUser(data.user),
            });
        }

        return { error: null };
    },

    logout: async () => {
        await supabase.auth.signOut();
        set({ session: null, token: null, user: null });
    },

    resetPassword: async (email: string) => {
        const { error } = await supabase.auth.resetPasswordForEmail(email, {
            redirectTo: `${window.location.origin}/reset-password`,
        });

        if (error) {
            return { error: error.message };
        }

        return { error: null };
    },

    fetchUser: async () => {
        try {
            const response = await api.get('/auth/me');
            set({ user: response.data });
        } catch (error) {
            console.error('Failed to fetch user:', error);
            // Don't clear user here - let the session handle auth state
        }
    },

    setSession: (session: Session | null) => {
        set({
            session,
            token: session?.access_token || null,
            user: mapSupabaseUser(session?.user || null),
            isLoading: false,
        });
    },

    getAccessToken: async () => {
        const { data } = await supabase.auth.getSession();
        return data.session?.access_token || null;
    },

    initializeAuth: async () => {
        set({ isLoading: true });

        // Get initial session
        const { data: { session } } = await supabase.auth.getSession();

        set({
            session,
            token: session?.access_token || null,
            user: mapSupabaseUser(session?.user || null),
            isLoading: false,
        });

        // Set up auth state change listener
        supabase.auth.onAuthStateChange((_event, session) => {
            set({
                session,
                token: session?.access_token || null,
                user: mapSupabaseUser(session?.user || null),
            });
        });
    },
}));

// Initialize auth on module load (client-side only)
if (typeof window !== 'undefined') {
    useAuthStore.getState().initializeAuth();
}
