/**
 * Visual Assets Service
 *
 * Handles visual asset settings, selections, and usage tracking via Supabase Client.
 * Replaces backend/routers/projects.py visual asset endpoints for CRUD operations.
 * Keeps upload/processing/classification in backend.
 *
 * Feature: Supabase Direct Migration
 */

import { supabase } from './client'
import type {
  Document,
  AssistantVisualSettings,
  AssistantVisualSettingsInsert,
  AssistantVisualSettingsUpdate,
  AssistantAssetSelection,
  CreativeConcept,
} from '@/types/supabase'
import type { ServiceResult } from '@/types/supabase-services'

export interface VisualAsset extends Document {
  asset_type: string
  asset_metadata: Record<string, unknown> | null
}

export interface AssetSelectionUpdate {
  asset_id: string
  is_enabled: boolean
}

export const visualAssetService = {
  // ============================================================================
  // VISUAL ASSETS (Reference Assets)
  // ============================================================================

  /**
   * List all visual assets (reference assets) for a project
   */
  async listByProject(
    projectId: string,
    filters?: { assetType?: string }
  ): Promise<ServiceResult<VisualAsset[]>> {
    try {
      let query = supabase
        .from('documents')
        .select('*')
        .eq('project_id', projectId)
        .eq('is_reference_asset', true)
        .is('deleted_at', null)
        .order('created_at', { ascending: false })

      if (filters?.assetType) {
        query = query.eq('asset_type', filters.assetType)
      }

      const { data, error } = await query

      if (error) throw error
      return { data: data as VisualAsset[], error: null }
    } catch (error) {
      return { data: null, error: error as Error }
    }
  },

  /**
   * Get a single visual asset by ID
   */
  async get(id: string): Promise<ServiceResult<VisualAsset>> {
    try {
      const { data, error } = await supabase
        .from('documents')
        .select('*')
        .eq('id', id)
        .eq('is_reference_asset', true)
        .single()

      if (error) throw error
      return { data: data as VisualAsset, error: null }
    } catch (error) {
      return { data: null, error: error as Error }
    }
  },

  // ============================================================================
  // ASSISTANT VISUAL SETTINGS
  // ============================================================================

  /**
   * Get visual settings for a project
   */
  async getSettings(projectId: string): Promise<ServiceResult<AssistantVisualSettings | null>> {
    try {
      const { data, error } = await supabase
        .from('assistant_visual_settings')
        .select('*')
        .eq('project_id', projectId)
        .maybeSingle()

      if (error) throw error
      return { data, error: null }
    } catch (error) {
      return { data: null, error: error as Error }
    }
  },

  /**
   * Create or update visual settings for a project
   */
  async upsertSettings(
    projectId: string,
    settings: AssistantVisualSettingsUpdate
  ): Promise<ServiceResult<AssistantVisualSettings>> {
    try {
      // Check if settings exist
      const { data: existing } = await supabase
        .from('assistant_visual_settings')
        .select('id')
        .eq('project_id', projectId)
        .maybeSingle()

      if (existing) {
        // Update existing
        const { data, error } = await supabase
          .from('assistant_visual_settings')
          .update({
            ...settings,
            updated_at: new Date().toISOString(),
          })
          .eq('project_id', projectId)
          .select()
          .single()

        if (error) throw error
        return { data, error: null }
      } else {
        // Create new
        const insertData: AssistantVisualSettingsInsert = {
          project_id: projectId,
          ...settings,
        }

        const { data, error } = await supabase
          .from('assistant_visual_settings')
          .insert(insertData)
          .select()
          .single()

        if (error) throw error
        return { data, error: null }
      }
    } catch (error) {
      return { data: null, error: error as Error }
    }
  },

  // ============================================================================
  // ASSET SELECTIONS
  // ============================================================================

  /**
   * Get all asset selections for a project's settings
   */
  async getSelections(projectId: string): Promise<ServiceResult<AssistantAssetSelection[]>> {
    try {
      // First get the settings ID
      const { data: settings, error: settingsError } = await supabase
        .from('assistant_visual_settings')
        .select('id')
        .eq('project_id', projectId)
        .maybeSingle()

      if (settingsError) throw settingsError
      if (!settings) return { data: [], error: null }

      const { data, error } = await supabase
        .from('assistant_asset_selection')
        .select('*')
        .eq('settings_id', settings.id)

      if (error) throw error
      return { data: data || [], error: null }
    } catch (error) {
      return { data: null, error: error as Error }
    }
  },

  /**
   * Update asset selections (batch upsert)
   */
  async updateSelections(
    projectId: string,
    selections: AssetSelectionUpdate[]
  ): Promise<ServiceResult<void>> {
    try {
      // Get or create settings
      let { data: settings } = await supabase
        .from('assistant_visual_settings')
        .select('id')
        .eq('project_id', projectId)
        .maybeSingle()

      if (!settings) {
        // Create default settings
        const { data: newSettings, error: createError } = await supabase
          .from('assistant_visual_settings')
          .insert({ project_id: projectId })
          .select('id')
          .single()

        if (createError) throw createError
        settings = newSettings
      }

      // Upsert selections
      const upsertData = selections.map(s => ({
        settings_id: settings!.id,
        asset_id: s.asset_id,
        is_enabled: s.is_enabled,
      }))

      const { error } = await supabase
        .from('assistant_asset_selection')
        .upsert(upsertData, {
          onConflict: 'settings_id,asset_id',
        })

      if (error) throw error
      return { data: null, error: null }
    } catch (error) {
      return { data: null, error: error as Error }
    }
  },

  // ============================================================================
  // ASSET USAGE HISTORY
  // ============================================================================

  /**
   * Record asset usage for rotation tracking
   */
  async recordUsage(
    assetId: string,
    generationId?: string
  ): Promise<ServiceResult<void>> {
    try {
      const { error } = await supabase
        .from('asset_usage_history')
        .insert({
          asset_id: assetId,
          generation_id: generationId || null,
        })

      if (error) throw error
      return { data: null, error: null }
    } catch (error) {
      return { data: null, error: error as Error }
    }
  },

  /**
   * Get usage history for assets
   */
  async getUsageHistory(
    assetIds: string[],
    limit = 100
  ): Promise<ServiceResult<{ asset_id: string; used_at: string }[]>> {
    try {
      const { data, error } = await supabase
        .from('asset_usage_history')
        .select('asset_id, used_at')
        .in('asset_id', assetIds)
        .order('used_at', { ascending: false })
        .limit(limit)

      if (error) throw error
      return { data: data || [], error: null }
    } catch (error) {
      return { data: null, error: error as Error }
    }
  },

  // ============================================================================
  // STYLE PRESETS
  // ============================================================================

  /**
   * Get all active creative concepts
   */
  async getActiveCreativeConcepts(): Promise<ServiceResult<CreativeConcept[]>> {
    try {
      const { data, error } = await supabase
        .from('creative_concepts')
        .select('*')
        .eq('is_active', true)
        .order('sort_order', { ascending: true })

      if (error) throw error
      return { data: data || [], error: null }
    } catch (error) {
      return { data: null, error: error as Error }
    }
  },

  // ============================================================================
  // VISUAL CONTEXT (for AI assistant)
  // ============================================================================

  /**
   * Get visual context for AI assistant
   * Returns enabled assets with usage-based rotation
   */
  async getVisualContext(
    projectId: string,
    limit = 5
  ): Promise<ServiceResult<VisualAsset[]>> {
    try {
      // Get settings
      const { data: settings } = await supabase
        .from('assistant_visual_settings')
        .select('id, is_enabled, mode, assets_per_category')
        .eq('project_id', projectId)
        .maybeSingle()

      if (!settings?.is_enabled) {
        return { data: [], error: null }
      }

      // Get enabled selections
      const { data: selections } = await supabase
        .from('assistant_asset_selection')
        .select('asset_id')
        .eq('settings_id', settings.id)
        .eq('is_enabled', true)

      if (!selections?.length) {
        return { data: [], error: null }
      }

      const assetIds = selections.map(s => s.asset_id)

      // Get assets with least recent usage (rotation)
      const { data: usageHistory } = await supabase
        .from('asset_usage_history')
        .select('asset_id')
        .in('asset_id', assetIds)
        .order('used_at', { ascending: false })

      // Count usage per asset
      const usageCount: Record<string, number> = {}
      for (const usage of usageHistory || []) {
        usageCount[usage.asset_id] = (usageCount[usage.asset_id] || 0) + 1
      }

      // Sort asset IDs by usage (least used first)
      const sortedAssetIds = assetIds.sort((a, b) => {
        return (usageCount[a] || 0) - (usageCount[b] || 0)
      })

      // Get actual assets
      const { data: assets, error } = await supabase
        .from('documents')
        .select('*')
        .in('id', sortedAssetIds.slice(0, limit))
        .eq('is_reference_asset', true)

      if (error) throw error
      return { data: assets as VisualAsset[], error: null }
    } catch (error) {
      return { data: null, error: error as Error }
    }
  },
}

export default visualAssetService
