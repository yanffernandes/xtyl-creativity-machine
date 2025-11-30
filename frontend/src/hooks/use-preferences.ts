/**
 * User Preferences Hooks
 *
 * React Query hooks for user preferences via Supabase Client.
 * Provides caching and optimistic updates for settings.
 *
 * Feature: 007-hybrid-supabase-architecture
 * User Story: US6 - Preferences & Conversations
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { preferencesService } from '@/lib/supabase/preferences'
import { useToast } from './use-toast'
import type { UserPreferencesUpdate, UserPreferences } from '@/types/supabase'

// Query keys
export const preferencesKeys = {
  all: ['preferences'] as const,
  user: () => [...preferencesKeys.all, 'user'] as const,
}

/**
 * Hook to fetch current user's preferences
 */
export function usePreferences() {
  return useQuery({
    queryKey: preferencesKeys.user(),
    queryFn: async () => {
      const { data, error } = await preferencesService.get()
      if (error) throw error
      return data
    },
    staleTime: 300000, // Preferences don't change often, 5 minutes
  })
}

/**
 * Hook to update user preferences with optimistic update
 */
export function useUpdatePreferences() {
  const queryClient = useQueryClient()
  const { toast } = useToast()

  return useMutation({
    mutationFn: async (preferences: UserPreferencesUpdate) => {
      const { data, error } = await preferencesService.update(preferences)
      if (error) throw error
      return data
    },
    onMutate: async (newPreferences) => {
      await queryClient.cancelQueries({ queryKey: preferencesKeys.user() })

      const previousPreferences = queryClient.getQueryData<UserPreferences>(
        preferencesKeys.user()
      )

      if (previousPreferences) {
        queryClient.setQueryData<UserPreferences>(preferencesKeys.user(), {
          ...previousPreferences,
          ...newPreferences,
          updated_at: new Date().toISOString(),
        })
      }

      return { previousPreferences }
    },
    onError: (error, _, context) => {
      if (context?.previousPreferences) {
        queryClient.setQueryData(preferencesKeys.user(), context.previousPreferences)
      }
      toast({
        title: 'Erro ao salvar preferências',
        description: error.message,
        variant: 'destructive',
      })
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: preferencesKeys.user() })
    },
  })
}

/**
 * Hook to update theme preference
 */
export function useSetTheme() {
  const queryClient = useQueryClient()
  const { toast } = useToast()

  return useMutation({
    mutationFn: async (theme: 'light' | 'dark' | 'system') => {
      const { data, error } = await preferencesService.setTheme(theme)
      if (error) throw error
      return data
    },
    onMutate: async (theme) => {
      await queryClient.cancelQueries({ queryKey: preferencesKeys.user() })

      const previousPreferences = queryClient.getQueryData<UserPreferences>(
        preferencesKeys.user()
      )

      if (previousPreferences) {
        queryClient.setQueryData<UserPreferences>(preferencesKeys.user(), {
          ...previousPreferences,
          theme,
        })
      }

      return { previousPreferences }
    },
    onError: (error, _, context) => {
      if (context?.previousPreferences) {
        queryClient.setQueryData(preferencesKeys.user(), context.previousPreferences)
      }
      toast({
        title: 'Erro ao alterar tema',
        description: error.message,
        variant: 'destructive',
      })
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: preferencesKeys.user() })
    },
  })
}

/**
 * Hook to update language preference
 */
export function useSetLanguage() {
  const queryClient = useQueryClient()
  const { toast } = useToast()

  return useMutation({
    mutationFn: async (language: string) => {
      const { data, error } = await preferencesService.setLanguage(language)
      if (error) throw error
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: preferencesKeys.user() })
      toast({
        title: 'Idioma alterado',
        description: 'Suas preferências de idioma foram atualizadas.',
      })
    },
    onError: (error) => {
      toast({
        title: 'Erro ao alterar idioma',
        description: error.message,
        variant: 'destructive',
      })
    },
  })
}

/**
 * Hook to toggle notifications
 */
export function useSetNotifications() {
  const queryClient = useQueryClient()
  const { toast } = useToast()

  return useMutation({
    mutationFn: async (enabled: boolean) => {
      const { data, error } = await preferencesService.setNotifications(enabled)
      if (error) throw error
      return data
    },
    onMutate: async (enabled) => {
      await queryClient.cancelQueries({ queryKey: preferencesKeys.user() })

      const previousPreferences = queryClient.getQueryData<UserPreferences>(
        preferencesKeys.user()
      )

      if (previousPreferences) {
        queryClient.setQueryData<UserPreferences>(preferencesKeys.user(), {
          ...previousPreferences,
          notifications_enabled: enabled,
        })
      }

      return { previousPreferences }
    },
    onError: (error, _, context) => {
      if (context?.previousPreferences) {
        queryClient.setQueryData(preferencesKeys.user(), context.previousPreferences)
      }
      toast({
        title: 'Erro ao alterar notificações',
        description: error.message,
        variant: 'destructive',
      })
    },
    onSuccess: (_, enabled) => {
      queryClient.invalidateQueries({ queryKey: preferencesKeys.user() })
      toast({
        title: enabled ? 'Notificações ativadas' : 'Notificações desativadas',
      })
    },
  })
}

/**
 * Hook to toggle email notifications
 */
export function useSetEmailNotifications() {
  const queryClient = useQueryClient()
  const { toast } = useToast()

  return useMutation({
    mutationFn: async (enabled: boolean) => {
      const { data, error } = await preferencesService.setEmailNotifications(enabled)
      if (error) throw error
      return data
    },
    onMutate: async (enabled) => {
      await queryClient.cancelQueries({ queryKey: preferencesKeys.user() })

      const previousPreferences = queryClient.getQueryData<UserPreferences>(
        preferencesKeys.user()
      )

      if (previousPreferences) {
        queryClient.setQueryData<UserPreferences>(preferencesKeys.user(), {
          ...previousPreferences,
          email_notifications: enabled,
        })
      }

      return { previousPreferences }
    },
    onError: (error, _, context) => {
      if (context?.previousPreferences) {
        queryClient.setQueryData(preferencesKeys.user(), context.previousPreferences)
      }
      toast({
        title: 'Erro ao alterar notificações por email',
        description: error.message,
        variant: 'destructive',
      })
    },
    onSuccess: (_, enabled) => {
      queryClient.invalidateQueries({ queryKey: preferencesKeys.user() })
      toast({
        title: enabled ? 'Emails ativados' : 'Emails desativados',
      })
    },
  })
}

/**
 * Hook to set default workspace
 */
export function useSetDefaultWorkspace() {
  const queryClient = useQueryClient()
  const { toast } = useToast()

  return useMutation({
    mutationFn: async (workspaceId: string | null) => {
      const { data, error } = await preferencesService.setDefaultWorkspace(workspaceId)
      if (error) throw error
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: preferencesKeys.user() })
      toast({
        title: 'Workspace padrão definido',
      })
    },
    onError: (error) => {
      toast({
        title: 'Erro ao definir workspace padrão',
        description: error.message,
        variant: 'destructive',
      })
    },
  })
}

/**
 * Hook to update custom preferences JSON
 */
export function useUpdateCustomPreferences() {
  const queryClient = useQueryClient()
  const { toast } = useToast()

  return useMutation({
    mutationFn: async (customPrefs: Record<string, unknown>) => {
      const { data, error } = await preferencesService.updateCustomPreferences(customPrefs)
      if (error) throw error
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: preferencesKeys.user() })
    },
    onError: (error) => {
      toast({
        title: 'Erro ao salvar configurações',
        description: error.message,
        variant: 'destructive',
      })
    },
  })
}
