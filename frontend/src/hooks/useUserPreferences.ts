/**
 * useUserPreferences Hook
 *
 * Provides user AI assistant preferences with caching and optimistic updates.
 * Uses SWR-like pattern for data fetching with local state for immediate feedback.
 */

import { useState, useEffect, useCallback } from 'react';
import {
  UserPreferences,
  UserPreferencesUpdate,
  getPreferences,
  updatePreferences,
} from '@/lib/api/preferences';
import { useToast } from './use-toast';

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

/**
 * Hook to manage user AI assistant preferences
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
      const data = await getPreferences(token);
      setPreferences(data);
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Failed to fetch preferences');
      setError(error);
      console.error('Error fetching preferences:', error);
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
        const updated = await updatePreferences(token, { [key]: value });
        setPreferences(updated);
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
        const updated = await updatePreferences(token, updates);
        setPreferences(updated);
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
