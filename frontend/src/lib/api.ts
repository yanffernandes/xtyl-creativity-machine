import axios from 'axios';
import { supabase } from './supabase';

const api = axios.create({
    baseURL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000',
    headers: {
        'Content-Type': 'application/json',
    },
});

// Request interceptor to add Supabase access token
api.interceptors.request.use(
    async (config) => {
        // Get current session from Supabase
        const { data: { session }, error } = await supabase.auth.getSession();

        if (error) {
            console.error('[API] Error getting session:', error);
        }

        if (session?.access_token) {
            config.headers.Authorization = `Bearer ${session.access_token}`;
        } else {
            console.warn('[API] No access token available for request:', config.url);
        }

        return config;
    },
    (error) => {
        return Promise.reject(error);
    }
);

// Response interceptor to handle 401 errors
api.interceptors.response.use(
    (response) => response,
    async (error) => {
        const originalRequest = error.config;

        // If error is 401 and we haven't tried to refresh yet
        if (error.response?.status === 401 && !originalRequest._retry) {
            originalRequest._retry = true;

            try {
                // Try to refresh the Supabase session
                const { data: { session }, error: refreshError } = await supabase.auth.refreshSession();

                if (refreshError || !session) {
                    // Refresh failed, redirect to login
                    console.error('Session refresh failed - redirecting to login');
                    await supabase.auth.signOut();

                    if (typeof window !== 'undefined') {
                        window.location.href = '/login';
                    }

                    return Promise.reject(error);
                }

                // Update the authorization header and retry
                originalRequest.headers.Authorization = `Bearer ${session.access_token}`;
                return api(originalRequest);
            } catch (refreshError) {
                console.error('Failed to refresh session:', refreshError);

                if (typeof window !== 'undefined') {
                    window.location.href = '/login';
                }

                return Promise.reject(refreshError);
            }
        }

        return Promise.reject(error);
    }
);

// Project Settings API
export interface ProjectSettings {
    client_name: string;
    description?: string | null;
    target_audience?: string | null;
    brand_voice?: string | null;
    brand_voice_custom?: string | null;
    key_messages?: string[] | null;
    competitors?: string[] | null;
    custom_notes?: string | null;
}

export interface ProjectContext {
    formatted_context: string;
    has_settings: boolean;
    missing_fields: string[];
}

export async function getProjectSettings(projectId: string): Promise<ProjectSettings | null> {
    try {
        const response = await api.get(`/projects/${projectId}/settings`);
        // Return null if empty object (no settings configured)
        if (!response.data || Object.keys(response.data).length === 0) {
            return null;
        }
        return response.data;
    } catch (error: any) {
        if (error.response?.status === 404) {
            return null;
        }
        throw error;
    }
}

export async function updateProjectSettings(projectId: string, settings: ProjectSettings): Promise<ProjectSettings> {
    const response = await api.put(`/projects/${projectId}/settings`, settings);
    return response.data;
}

export async function getProjectContext(projectId: string): Promise<ProjectContext> {
    const response = await api.get(`/projects/${projectId}/settings/context`);
    return response.data;
}

export default api;
