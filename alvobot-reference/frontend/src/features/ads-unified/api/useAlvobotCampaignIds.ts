/**
 * Hook to fetch IDs of campaigns created by AlvoBot
 *
 * Fetches from:
 * - campaign_templates.published_campaign_id (Meta)
 * - ad_campaign_templates.platform_ids->>'campaignId' (Google)
 *
 * Returns a Set for O(1) lookup performance
 */

import { useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useWorkspaceId } from '@/features/workspace/stores/workspaceStore'
import { supabase } from '@/shared/utils/supabase'

interface AlvobotCampaignIdsResult {
  /** Set of campaign IDs created by AlvoBot (for O(1) lookup) */
  alvobotCampaignIds: Set<string>
  /** Whether data is loading */
  isLoading: boolean
  /** Whether there was an error */
  isError: boolean
  /** Error message if any */
  error: Error | null
}

export function useAlvobotCampaignIds(): AlvobotCampaignIdsResult {
  const workspaceId = useWorkspaceId()

  const query = useQuery({
    queryKey: ['alvobot-campaign-ids', workspaceId],
    queryFn: async (): Promise<string[]> => {
      const ids: string[] = []

      console.debug('[useAlvobotCampaignIds] Fetching with workspaceId:', workspaceId)

      // Fetch Meta campaign IDs from campaign_templates
      let metaQuery = supabase
        .from('campaign_templates')
        .select('published_campaign_id')
        .eq('status', 'published')
        .not('published_campaign_id', 'is', null)
        .is('deleted_at', null) // Exclude soft-deleted

      if (workspaceId) {
        metaQuery = metaQuery.or(`workspace_id.eq.${workspaceId},workspace_id.is.null`)
      }

      const { data: metaTemplates, error: metaError } = await metaQuery

      console.debug('[useAlvobotCampaignIds] Meta templates:', metaTemplates, 'Error:', metaError)

      if (metaError) {
        console.error('Error fetching Meta AlvoBot campaigns:', metaError)
      } else if (metaTemplates) {
        metaTemplates.forEach(t => {
          if (t.published_campaign_id) {
            ids.push(t.published_campaign_id)
          }
        })
      }

      // Fetch Google campaign IDs from ad_campaign_templates
      let googleQuery = supabase
        .from('ad_campaign_templates')
        .select('platform_ids')
        .eq('platform', 'google_ads')
        .eq('status', 'published')
        .not('platform_ids', 'is', null)

      if (workspaceId) {
        googleQuery = googleQuery.or(`workspace_id.eq.${workspaceId},workspace_id.is.null`)
      }

      const { data: googleTemplates, error: googleError } = await googleQuery

      console.debug('[useAlvobotCampaignIds] Google templates:', googleTemplates, 'Error:', googleError)

      if (googleError) {
        console.error('Error fetching Google AlvoBot campaigns:', googleError)
      } else if (googleTemplates) {
        googleTemplates.forEach(t => {
          const platformIds = t.platform_ids as { campaignId?: string } | null
          if (platformIds?.campaignId) {
            ids.push(platformIds.campaignId)
          }
        })
      }

      console.debug('[useAlvobotCampaignIds] Final IDs:', ids)
      return ids
    },
    enabled: true,
    staleTime: 5 * 60 * 1000, // 5 minutes
    refetchOnWindowFocus: false,
  })

  // Memoize the Set to prevent unnecessary re-renders
  const alvobotCampaignIds = useMemo(
    () => new Set(query.data || []),
    [query.data]
  )

  return {
    alvobotCampaignIds,
    isLoading: query.isLoading,
    isError: query.isError,
    error: query.error,
  }
}
