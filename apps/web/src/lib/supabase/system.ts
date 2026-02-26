/**
 * System Service
 *
 * Handles system configuration and messages via Supabase Client.
 * Replaces backend/routers/admin.py system endpoints for read-only operations.
 *
 * Feature: Supabase Direct Migration
 */

import { supabase } from './client'
import type { SystemConfig, SystemMessage } from '@/types/supabase'
import type { ServiceResult } from '@/types/supabase-services'

export const systemService = {
  /**
   * Get active system messages
   * Returns messages that are currently active (within starts_at/ends_at range)
   */
  async getActiveMessages(): Promise<ServiceResult<SystemMessage[]>> {
    try {
      const now = new Date().toISOString()

      const { data, error } = await supabase
        .from('system_messages')
        .select('*')
        .or(`starts_at.is.null,starts_at.lte.${now}`)
        .or(`ends_at.is.null,ends_at.gte.${now}`)
        .order('priority', { ascending: false })

      if (error) throw error
      return { data: data || [], error: null }
    } catch (error) {
      return { data: null, error: error as Error }
    }
  },

  /**
   * Get a specific system configuration by key
   */
  async getConfig(key: string): Promise<ServiceResult<SystemConfig>> {
    try {
      const { data, error } = await supabase
        .from('system_config')
        .select('*')
        .eq('key', key)
        .single()

      if (error) throw error
      return { data, error: null }
    } catch (error) {
      return { data: null, error: error as Error }
    }
  },

  /**
   * Get multiple system configurations by keys
   */
  async getConfigs(keys: string[]): Promise<ServiceResult<SystemConfig[]>> {
    try {
      const { data, error } = await supabase
        .from('system_config')
        .select('*')
        .in('key', keys)

      if (error) throw error
      return { data: data || [], error: null }
    } catch (error) {
      return { data: null, error: error as Error }
    }
  },

  /**
   * Get all system configurations (for admin panel)
   */
  async getAllConfigs(): Promise<ServiceResult<SystemConfig[]>> {
    try {
      const { data, error } = await supabase
        .from('system_config')
        .select('*')
        .order('key', { ascending: true })

      if (error) throw error
      return { data: data || [], error: null }
    } catch (error) {
      return { data: null, error: error as Error }
    }
  },
}

export default systemService
