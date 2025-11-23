import { create } from 'zustand';
import api from './api';

interface User {
    id: string;
    email: string;
    full_name: string;
}

interface AuthState {
    user: User | null;
    token: string | null;
    refreshToken: string | null;
    login: (token: string, refreshToken?: string) => void;
    logout: () => void;
    fetchUser: () => Promise<void>;
    setRefreshToken: (refreshToken: string) => void;
}

export const useAuthStore = create<AuthState>((set) => ({
    user: null,
    token: typeof window !== 'undefined' ? localStorage.getItem('token') : null,
    refreshToken: typeof window !== 'undefined' ? localStorage.getItem('refresh_token') : null,
    login: (token, refreshToken) => {
        localStorage.setItem('token', token);
        if (refreshToken) {
            localStorage.setItem('refresh_token', refreshToken);
        }
        set({ token, refreshToken: refreshToken || null });
    },
    logout: () => {
        localStorage.removeItem('token');
        localStorage.removeItem('refresh_token');
        set({ token: null, refreshToken: null, user: null });
    },
    setRefreshToken: (refreshToken) => {
        localStorage.setItem('refresh_token', refreshToken);
        set({ refreshToken });
    },
    fetchUser: async () => {
        try {
            const response = await api.get('/auth/me')
            set({ user: response.data })
        } catch (error) {
            console.error('Failed to fetch user:', error)
            set({ user: null })
        }
    },
}));
