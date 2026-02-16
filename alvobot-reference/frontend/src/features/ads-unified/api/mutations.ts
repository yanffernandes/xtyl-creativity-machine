/**
 * Unified Ads Dashboard - Types & Utilities
 *
 * Legacy mutation hooks have been removed in favor of the unified hooks:
 * - useUnifiedAdsPause (queries.ts) - replaces usePauseAdGroup, usePauseAd, usePauseMetaCampaign
 * - useUnifiedAdsEnable (queries.ts) - replaces useEnableAdGroup, useEnableAd, useEnableMetaCampaign
 * - useUnifiedAdsBudgetUpdate (queries.ts) - replaces useUpdateMetaBudget
 */

import { api } from '@/shared/utils/api'

// ============================================
// Meta Ad Types (used by UnifiedCampaignPerformanceTable)
// ============================================

export interface MetaAdMetrics {
  impressions: number
  clicks: number
  ctr: number
  spend: number
  conversions: number
  cpa: number
}

export interface MetaAd {
  id: string
  name: string
  status: 'ACTIVE' | 'PAUSED' | 'DELETED' | 'ARCHIVED'
  creativeId?: string
  previewUrl?: string
  thumbnailUrl?: string
  effectiveStatus?: string
  metrics: MetaAdMetrics
  creative?: {
    title?: string
    body?: string
    callToAction?: string
    linkUrl?: string
    imageUrl?: string
    videoUrl?: string
  }
}

// ============================================
// Creative Details
// ============================================

export interface MetaCreativeDetails {
  name?: string
  status?: string
  body?: string
  title?: string
  link_url?: string
  call_to_action_type?: string
  image_url?: string
  video_id?: string
  url_tags?: string
  instagram_permalink_url?: string
  /** Best-effort high-res media URL derived from instagram_permalink_url */
  instagramMediaUrlLarge?: string
  effective_object_story_id?: string
  image_hash?: string
  object_url?: string
  object_type?: string
  thumbnail_url?: string
  highResImageUrl?: string
  videoEmbedUrl?: string
  /** Direct MP4 URL from Meta (preferred for non-cropped playback) */
  videoSourceUrl?: string
  /** Poster/thumbnail returned by the video object */
  videoPictureUrl?: string
  videoWidth?: number
  videoHeight?: number
  imageUrls?: {
    url_128?: string
    url_256?: string
    url_512?: string
    url_1024?: string
  }
  object_story_spec?: {
    video_data?: {
      video_id?: string
      image_url?: string
      call_to_action?: {
        type?: string
        value?: {
          link?: string
          link_caption?: string
          app_destination?: string
        }
      }
      title?: string
      videoEmbedUrl?: string
      videoSourceUrl?: string
      videoPictureUrl?: string
      videoWidth?: number
      videoHeight?: number
      page_welcome_message?: string | PageWelcomeMessage
    }
    link_data?: {
      call_to_action?: {
        type?: string
        value?: {
          link?: string
          app_destination?: string
        }
      }
      link?: string
      message?: string
      name?: string
      description?: string
      page_welcome_message?: string | PageWelcomeMessage
    }
  }
}

/** Parsed page_welcome_message structure (conversation configurator) */
export interface PageWelcomeMessage {
  type?: string
  version?: number
  landing_screen_type?: string
  media_type?: string
  text_format?: {
    customer_action_type?: string
    message?: {
      ice_breakers?: Array<{
        title: string
        response: string
      }>
      quick_replies?: Array<{
        content_type?: string
        title?: string
        payload?: string
      }>
      text?: string
    }
  }
  user_edit?: boolean
  surface?: string
}

/**
 * Fetch full creative details for a Meta ad
 * This provides high-resolution images and video embed data
 */
export async function fetchMetaCreativeDetails(
  adId: string,
  connectionId: string,
): Promise<MetaCreativeDetails> {
  const response = await api.get<{ success: boolean; data: MetaCreativeDetails; error?: string }>(
    `/meta/dashboard/ads/${adId}/creative-details?connectionId=${encodeURIComponent(connectionId)}`,
  )
  
  if (!response.success) {
    throw new Error(response.error || 'Falha ao buscar detalhes do criativo')
  }
  
  return response.data
}
