/**
 * useUserPreferences Hook
 *
 * Provides user AI assistant preferences with caching and optimistic updates.
 * Uses Supabase directly instead of backend API.
 *
 * Feature: 007-hybrid-supabase-architecture
 */

import { useState, useEffect, useCallback } from 'react';
import { useToast } from './use-toast';
import { preferencesService } from '@/lib/supabase/preferences';

export interface UserPreferences {
  id?: string;
  user_id?: string;
  autonomous_mode: boolean;
  max_autonomous_iterations: number;
  require_approval_for: string[];
  auto_apply_edits: boolean;
  default_text_model?: string;
  default_image_model?: string;
  theme?: string;
  language?: string;
  created_at?: string;
  updated_at?: string;
}

export interface UserPreferencesUpdate {
  autonomous_mode?: boolean;
  max_autonomous_iterations?: number;
  require_approval_for?: string[];
  auto_apply_edits?: boolean;
  default_text_model?: string;
  default_image_model?: string;
  theme?: string;
  language?: string;
}

interface UseUserPreferencesReturn {
  preferences: UserPreferences | null;
  isLoading: boolean;
  error: Error | null;
  updatePreference: <K extends keyof UserPreferencesUpdate>(
    key: K,
    value: UserPreferencesUpdate[K]
  ) => Promise<void>;
  updatePreferences: (updates: UserPreferencesUpdate) => Promise<void>;
  refetch: () => Promise<void>;
}

// Default preferences
const defaultPreferences: UserPreferences = {
  autonomous_mode: false,
  max_autonomous_iterations: 5,
  require_approval_for: ['document_edit', 'file_upload', 'delete'],
  auto_apply_edits: false,
  default_text_model: 'openai/gpt-4o',
  default_image_model: 'openai/dall-e-3',
  theme: 'system',
  language: 'pt-BR',
};

/**
 * Hook to manage user AI assistant preferences via Supabase
 */
export function useUserPreferences(token: string | null): UseUserPreferencesReturn {
  const [preferences, setPreferences] = useState<UserPreferences | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const { toast } = useToast();

  // Fetch preferences on mount
  const fetchPreferences = useCallback(async () => {
    if (!token) {
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const { data, error: fetchError } = await preferencesService.get();

      if (fetchError) {
        // If not found, return defaults
        if (fetchError.message?.includes('No rows')) {
          setPreferences(defaultPreferences);
        } else {
          throw fetchError;
        }
      } else if (data) {
        setPreferences({
          ...defaultPreferences,
          ...data,
        } as UserPreferences);
      } else {
        setPreferences(defaultPreferences);
      }
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Failed to fetch preferences');
      setError(error);
      console.error('Error fetching preferences:', error);
      // Use defaults on error
      setPreferences(defaultPreferences);
    } finally {
      setIsLoading(false);
    }
  }, [token]);

  useEffect(() => {
    fetchPreferences();
  }, [fetchPreferences]);

  // Update a single preference field
  const updatePreference = useCallback(
    async <K extends keyof UserPreferencesUpdate>(
      key: K,
      value: UserPreferencesUpdate[K]
    ) => {
      if (!token || !preferences) return;

      // Optimistic update
      const previousPreferences = preferences;
      setPreferences((prev) =>
        prev ? { ...prev, [key]: value } : prev
      );

      try {
        const { data, error: updateError } = await preferencesService.update({ [key]: value } as any);
        if (updateError) throw updateError;
        if (data) {
          setPreferences({ ...defaultPreferences, ...data } as UserPreferences);
        }
      } catch (err) {
        // Revert on error
        setPreferences(previousPreferences);
        const error = err instanceof Error ? err : new Error('Failed to update preference');
        toast({
          title: 'Erro ao atualizar preferência',
          description: error.message,
          variant: 'destructive',
        });
        throw error;
      }
    },
    [token, preferences, toast]
  );

  // Update multiple preferences at once
  const updatePreferencesHandler = useCallback(
    async (updates: UserPreferencesUpdate) => {
      if (!token || !preferences) return;

      // Optimistic update
      const previousPreferences = preferences;
      setPreferences((prev) =>
        prev ? { ...prev, ...updates } : prev
      );

      try {
        const { data, error: updateError } = await preferencesService.update(updates as any);
        if (updateError) throw updateError;
        if (data) {
          setPreferences({ ...defaultPreferences, ...data } as UserPreferences);
        }
      } catch (err) {
        // Revert on error
        setPreferences(previousPreferences);
        const error = err instanceof Error ? err : new Error('Failed to update preferences');
        toast({
          title: 'Erro ao atualizar preferências',
          description: error.message,
          variant: 'destructive',
        });
        throw error;
      }
    },
    [token, preferences, toast]
  );

  return {
    preferences,
    isLoading,
    error,
    updatePreference,
    updatePreferences: updatePreferencesHandler,
    refetch: fetchPreferences,
  };
}
