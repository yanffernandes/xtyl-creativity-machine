/**
 * React Query hooks for Visual Assets System
 * Provides data fetching, caching, and mutations for visual assets and settings
 *
 * Feature: Supabase Direct Migration
 */

import { useQuery, useMutation, useQueryClient, UseQueryOptions } from '@tanstack/react-query'
import { visualAssetService, VisualAsset, AssetSelectionUpdate } from '@/lib/supabase/visual-assets'
import type { AssistantVisualSettings, AssistantVisualSettingsUpdate, StylePreset } from '@/types/supabase'
import { queryKeys } from '@/lib/query-keys'
import { toast } from 'sonner'

/**
 * Hook to fetch visual assets (reference assets) for a project
 */
export function useVisualAssets(
  projectId: string | undefined,
  filters?: { assetType?: string },
  queryOptions?: Omit<UseQueryOptions<VisualAsset[]>, 'queryKey' | 'queryFn'>
) {
  return useQuery<VisualAsset[]>({
    queryKey: queryKeys.visualAssets.byProject(projectId || ''),
    queryFn: async () => {
      const result = await visualAssetService.listByProject(projectId!, filters)
      if (result.error) throw result.error
      return result.data || []
    },
    enabled: !!projectId,
    staleTime: 30000, // 30 seconds
    ...queryOptions,
  })
}

/**
 * Hook to fetch visual settings for a project
 */
export function useVisualSettings(
  projectId: string | undefined,
  queryOptions?: Omit<UseQueryOptions<AssistantVisualSettings | null>, 'queryKey' | 'queryFn'>
) {
  return useQuery<AssistantVisualSettings | null>({
    queryKey: queryKeys.visualSettings.byProject(projectId || ''),
    queryFn: async () => {
      const result = await visualAssetService.getSettings(projectId!)
      if (result.error) throw result.error
      return result.data
    },
    enabled: !!projectId,
    staleTime: 60000, // 1 minute
    ...queryOptions,
  })
}

/**
 * Hook to update visual settings
 */
export function useUpdateVisualSettings(projectId: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (settings: AssistantVisualSettingsUpdate) => {
      const result = await visualAssetService.upsertSettings(projectId, settings)
      if (result.error) throw result.error
      return result.data
    },
    onSuccess: (data) => {
      queryClient.setQueryData(queryKeys.visualSettings.byProject(projectId), data)
      toast.success('Configurações visuais atualizadas')
    },
    onError: (error: Error) => {
      console.error('Failed to update visual settings:', error)
      toast.error('Falha ao atualizar configurações')
    },
  })
}

/**
 * Hook to fetch asset selections for a project
 */
export function useAssetSelections(
  projectId: string | undefined,
  queryOptions?: Omit<UseQueryOptions<{ asset_id: string; is_enabled: boolean }[]>, 'queryKey' | 'queryFn'>
) {
  return useQuery({
    queryKey: queryKeys.assetSelections.byProject(projectId || ''),
    queryFn: async () => {
      const result = await visualAssetService.getSelections(projectId!)
      if (result.error) throw result.error
      return (result.data || []).map(s => ({
        asset_id: s.asset_id,
        is_enabled: s.is_enabled,
      }))
    },
    enabled: !!projectId,
    staleTime: 30000,
    ...queryOptions,
  })
}

/**
 * Hook to update asset selections
 */
export function useUpdateAssetSelections(projectId: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (selections: AssetSelectionUpdate[]) => {
      const result = await visualAssetService.updateSelections(projectId, selections)
      if (result.error) throw result.error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.assetSelections.byProject(projectId) })
      toast.success('Seleções de assets atualizadas')
    },
    onError: (error: Error) => {
      console.error('Failed to update asset selections:', error)
      toast.error('Falha ao atualizar seleções')
    },
  })
}

/**
 * Hook to record asset usage (for rotation tracking)
 */
export function useRecordAssetUsage() {
  return useMutation({
    mutationFn: async ({ assetId, generationId }: { assetId: string; generationId?: string }) => {
      const result = await visualAssetService.recordUsage(assetId, generationId)
      if (result.error) throw result.error
    },
    onError: (error: Error) => {
      console.error('Failed to record asset usage:', error)
    },
  })
}

/**
 * Hook to fetch active style presets
 */
export function useStylePresets(
  queryOptions?: Omit<UseQueryOptions<StylePreset[]>, 'queryKey' | 'queryFn'>
) {
  return useQuery<StylePreset[]>({
    queryKey: queryKeys.stylePresets.active(),
    queryFn: async () => {
      const result = await visualAssetService.getActiveStylePresets()
      if (result.error) throw result.error
      return result.data || []
    },
    staleTime: 300000, // 5 minutes - style presets rarely change
    ...queryOptions,
  })
}

/**
 * Hook to fetch visual context for AI assistant
 * Returns enabled assets with usage-based rotation
 */
export function useVisualContext(
  projectId: string | undefined,
  limit?: number,
  queryOptions?: Omit<UseQueryOptions<VisualAsset[]>, 'queryKey' | 'queryFn'>
) {
  return useQuery<VisualAsset[]>({
    queryKey: [...queryKeys.visualAssets.byProject(projectId || ''), 'context', limit],
    queryFn: async () => {
      const result = await visualAssetService.getVisualContext(projectId!, limit)
      if (result.error) throw result.error
      return result.data || []
    },
    enabled: !!projectId,
    staleTime: 60000, // 1 minute
    ...queryOptions,
  })
}
