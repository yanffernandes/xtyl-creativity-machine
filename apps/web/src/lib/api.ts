import axios from 'axios';
import { supabase } from './supabase';

/**
 * Axios API Client
 *
 * Configured with:
 * - Base URL from VITE_API_URL environment variable
 * - Auth interceptor that injects Supabase session Bearer token
 * - Response error handler with automatic session refresh on 401
 */
const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:8000',
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor: attach Supabase access token
api.interceptors.request.use(
  async (config) => {
    const { data: { session } } = await supabase.auth.getSession();

    if (session?.access_token) {
      config.headers.Authorization = `Bearer ${session.access_token}`;
    }

    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor: handle 401 with session refresh
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    // If 401 and we haven't retried yet, attempt session refresh
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      try {
        const { data: { session }, error: refreshError } =
          await supabase.auth.refreshSession();

        if (refreshError || !session) {
          console.error('Session refresh failed, redirecting to login');
          await supabase.auth.signOut();
          window.location.href = '/';
          return Promise.reject(error);
        }

        // Retry the original request with the new token
        originalRequest.headers.Authorization = `Bearer ${session.access_token}`;
        return api(originalRequest);
      } catch (refreshError) {
        console.error('Failed to refresh session:', refreshError);
        window.location.href = '/';
        return Promise.reject(refreshError);
      }
    }

    return Promise.reject(error);
  }
);

export default api;

// ============================================================================
// Chat Templates API (Feature 019)
// ============================================================================

export interface StartChatFromTemplateRequest {
  template_id: string;
  variables: Record<string, string>;
  project_id?: string;
  title?: string;
}

export interface StartChatFromTemplateResponse {
  conversation_id: string;
  title: string;
  first_message: string | null;
}

/**
 * Start a new chat conversation from a template
 */
export async function startChatFromTemplate(
  request: StartChatFromTemplateRequest
): Promise<StartChatFromTemplateResponse> {
  const response = await api.post('/api/templates/start-chat', request);
  return response.data;
}

// ============================================================================
// Audio Transcription API (Feature 021 - Voice Input)
// ============================================================================

export interface TranscriptionResponse {
  text: string;
  duration_seconds: number;
  language: string;
  processing_time_ms: number;
}

/**
 * Transcribe audio file to text using backend audio transcription.
 */
export async function transcribeAudio(
  audioBlob: Blob,
  languageHint?: string
): Promise<TranscriptionResponse> {
  const formData = new FormData();

  const mimeType = audioBlob.type || 'audio/webm';
  const extension = mimeType.includes('webm')
    ? 'webm'
    : mimeType.includes('mp4')
      ? 'mp4'
      : mimeType.includes('ogg')
        ? 'ogg'
        : 'webm';

  formData.append('audio', audioBlob, `recording.${extension}`);

  if (languageHint) {
    formData.append('language_hint', languageHint);
  }

  const response = await api.post('/api/chat/transcribe', formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  });

  return response.data;
}
