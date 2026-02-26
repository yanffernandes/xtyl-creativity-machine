/**
 * User Preferences Service
 *
 * Handles all user preferences operations via Supabase Client.
 * Replaces backend/routers/preferences.py for direct database access.
 *
 * Feature: 007-hybrid-supabase-architecture
 * User Story: US6 - Preferences & Conversations
 */

import { supabase } from './client'
import type {
  UserPreferences,
  UserPreferencesUpdate,
} from '@/types/supabase'
import type { ServiceResult } from '@/types/supabase-services'

export const preferencesService = {
  /**
   * Get current user's preferences
   * Creates default preferences if they don't exist
   */
  async get(): Promise<ServiceResult<UserPreferences>> {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Not authenticated')

      // Try to get existing preferences
      const { data, error } = await supabase
        .from('user_preferences')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle()

      if (error) throw error

      // If no preferences exist, create defaults
      if (!data) {
        const { data: newPrefs, error: createError } = await supabase
          .from('user_preferences')
          .insert({
            user_id: user.id,
            autonomous_mode: false,
            max_iterations: 15,
            default_model: 'openai/gpt-4o',
            use_rag_by_default: true,
            settings: {
              theme: 'system',
              language: 'pt-BR',
              notifications_enabled: true,
              email_notifications: true,
              default_workspace_id: null,
            },
          })
          .select()
          .single()

        if (createError) throw createError
        return { data: newPrefs, error: null }
      }

      return { data, error: null }
    } catch (error) {
      return { data: null, error: error as Error }
    }
  },

  /**
   * Update user preferences
   */
  async update(preferences: UserPreferencesUpdate): Promise<ServiceResult<UserPreferences>> {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Not authenticated')

      const { data, error } = await supabase
        .from('user_preferences')
        .update({
          ...preferences,
          updated_at: new Date().toISOString(),
        })
        .eq('user_id', user.id)
        .select()
        .single()

      if (error) throw error
      return { data, error: null }
    } catch (error) {
      return { data: null, error: error as Error }
    }
  },

  /**
   * Update theme preference (stored in settings JSONB)
   */
  async setTheme(theme: 'light' | 'dark' | 'system'): Promise<ServiceResult<UserPreferences>> {
    return this.updateSettings({ theme })
  },

  /**
   * Update language preference (stored in settings JSONB)
   */
  async setLanguage(language: string): Promise<ServiceResult<UserPreferences>> {
    return this.updateSettings({ language })
  },

  /**
   * Toggle notifications (stored in settings JSONB)
   */
  async setNotifications(enabled: boolean): Promise<ServiceResult<UserPreferences>> {
    return this.updateSettings({ notifications_enabled: enabled })
  },

  /**
   * Toggle email notifications (stored in settings JSONB)
   */
  async setEmailNotifications(enabled: boolean): Promise<ServiceResult<UserPreferences>> {
    return this.updateSettings({ email_notifications: enabled })
  },

  /**
   * Set default workspace (stored in settings JSONB)
   */
  async setDefaultWorkspace(workspaceId: string | null): Promise<ServiceResult<UserPreferences>> {
    return this.updateSettings({ default_workspace_id: workspaceId })
  },

  /**
   * Update settings JSONB field (for extensible settings)
   */
  async updateSettings(newSettings: Record<string, unknown>): Promise<ServiceResult<UserPreferences>> {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Not authenticated')

      // Get existing preferences to merge settings
      const { data: existing } = await supabase
        .from('user_preferences')
        .select('settings')
        .eq('user_id', user.id)
        .single()

      const mergedSettings = {
        ...(existing?.settings || {}),
        ...newSettings,
      }

      const { data, error } = await supabase
        .from('user_preferences')
        .update({
          settings: mergedSettings,
          updated_at: new Date().toISOString(),
        })
        .eq('user_id', user.id)
        .select()
        .single()

      if (error) throw error
      return { data, error: null }
    } catch (error) {
      return { data: null, error: error as Error }
    }
  },
}

export default preferencesService
