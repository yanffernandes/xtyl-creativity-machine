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
            theme: 'system',
            language: 'pt-BR',
            notifications_enabled: true,
            email_notifications: true,
            default_workspace_id: null,
            preferences_json: {},
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
   * Update theme preference
   */
  async setTheme(theme: 'light' | 'dark' | 'system'): Promise<ServiceResult<UserPreferences>> {
    return this.update({ theme })
  },

  /**
   * Update language preference
   */
  async setLanguage(language: string): Promise<ServiceResult<UserPreferences>> {
    return this.update({ language })
  },

  /**
   * Toggle notifications
   */
  async setNotifications(enabled: boolean): Promise<ServiceResult<UserPreferences>> {
    return this.update({ notifications_enabled: enabled })
  },

  /**
   * Toggle email notifications
   */
  async setEmailNotifications(enabled: boolean): Promise<ServiceResult<UserPreferences>> {
    return this.update({ email_notifications: enabled })
  },

  /**
   * Set default workspace
   */
  async setDefaultWorkspace(workspaceId: string | null): Promise<ServiceResult<UserPreferences>> {
    return this.update({ default_workspace_id: workspaceId })
  },

  /**
   * Update custom preferences JSON (for extensible settings)
   */
  async updateCustomPreferences(customPrefs: Record<string, unknown>): Promise<ServiceResult<UserPreferences>> {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Not authenticated')

      // Get existing preferences to merge
      const { data: existing } = await supabase
        .from('user_preferences')
        .select('preferences_json')
        .eq('user_id', user.id)
        .single()

      const mergedPrefs = {
        ...(existing?.preferences_json || {}),
        ...customPrefs,
      }

      const { data, error } = await supabase
        .from('user_preferences')
        .update({
          preferences_json: mergedPrefs,
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
