import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useWorkspaceId } from '@/features/workspace/stores/workspaceStore'
import { api } from '@/shared/utils/api'
import { queryKeys } from '@/shared/utils/queryKeys'

// ============================================
// Types
// ============================================

export type CreativeSourceType = 'upload' | 'google_drive' | 'ai_generated'

// Legacy CampaignTemplate type - used by AlvoAdsMetaPage for listing templates
// This is different from the new MetaCampaignTemplate used by the wizard
export interface CampaignTemplate {
  id: string
  user_id: string
  template_name: string
  status: 'draft' | 'ready' | 'published' | 'failed'
  upload_data?: Record<string, unknown>
  campaign_data?: Record<string, unknown>
  ad_set_data?: Record<string, unknown>
  ads_data?: Record<string, unknown>
  ai_generated_content?: {
    copies?: AdCopyVariation[]
    headlines?: string[]
    imageUrls?: string[]
  }
  /** Full Zustand store snapshot for wizard resume */
  wizard_state?: Record<string, unknown>
  /** Last wizard step visited */
  last_wizard_step?: string
  meta_page_id?: string
  meta_ad_account_id?: string
  published_campaign_id?: string
  published_ad_set_id?: string
  published_ad_id?: string
  publish_error?: string
  published_at?: string
  total_credits_cost: number
  credits_consumed: boolean
  created_at: string
  updated_at: string
}

export interface AdCopyVariation {
  primaryText: string
  headline: string
  description?: string
}

export interface GenerateAdCopyParams {
  productName: string
  productDescription?: string
  targetAudience?: string
  tone?: 'professional' | 'casual' | 'friendly' | 'urgent' | 'luxury'
  count?: number
}

export interface GenerateImageParams {
  prompt: string
  productName?: string
  style?: 'realistic' | 'artistic' | 'minimalist' | 'vibrant'
  count?: number
}

export interface CreditCosts {
  CAMPAIGN_BASIC: number
  CREATIVE_UPLOAD: number
  CREATIVE_GOOGLE_DRIVE: number
  CREATIVE_AI_GENERATED: number
  AD_COPY_GENERATION: number
  HEADLINE_GENERATION: number
  CAMPAIGN_PUBLISH: number
  METRICS_SYNC: number
}

export interface CreditCalculation {
  total: number
  breakdown: {
    creatives: number
    publishing: number
    aiGeneration: number
  }
}

export interface UserCredits {
  available: number
  used: number
  total: number
  cycle_start: string
  cycle_end: string
}

// ============================================
// API Functions
// ============================================

// Templates
async function fetchTemplates(params?: {
  status?: string
  search?: string
  limit?: number
  offset?: number
  workspaceId?: string
}) {
  const searchParams = new URLSearchParams()
  if (params?.status) searchParams.set('status', params.status)
  if (params?.search) searchParams.set('search', params.search)
  if (params?.limit) searchParams.set('limit', params.limit.toString())
  if (params?.offset) searchParams.set('offset', params.offset.toString())
  if (params?.workspaceId) searchParams.set('workspace_id', params.workspaceId)

  const query = searchParams.toString()
  const endpoint = `/meta/campaigns${query ? `?${query}` : ''}`

  return api.get<{
    success: boolean
    templates: CampaignTemplate[]
    total: number
  }>(endpoint)
}

async function fetchTemplate(id: string) {
  return api.get<{
    success: boolean
    template: CampaignTemplate
  }>(`/meta/campaigns/${id}`)
}

async function saveTemplate(data: {
  id?: string
  templateName: string
  upload?: Record<string, unknown>
  campaign?: Record<string, unknown>
  adSet?: Record<string, unknown>
  ads?: Record<string, unknown>
  metaPageId?: string
  metaAdAccountId?: string
  workspace_id?: string
}) {
  return api.post<{
    success: boolean
    template: CampaignTemplate
    message: string
  }>('/meta/campaigns', data)
}

async function deleteTemplate(id: string) {
  return api.delete<{
    success: boolean
    message: string
  }>(`/meta/campaigns/${id}`)
}

async function duplicateTemplate(id: string) {
  return api.post<{
    success: boolean
    template: CampaignTemplate
    message: string
  }>(`/meta/campaigns/${id}/duplicate`, {})
}

async function publishCampaign(id: string, dryRun?: boolean) {
  return api.post<{
    success: boolean
    campaignId?: string
    adSetId?: string
    adId?: string
    creditsUsed?: number
    error?: string
  }>(`/meta/campaigns/${id}/publish`, { dryRun })
}

// AI Generation
async function generateAdCopy(params: GenerateAdCopyParams) {
  return api.post<{
    success: boolean
    copies: AdCopyVariation[]
    creditsUsed: number
  }>('/meta/campaigns/ai/copy', params)
}

async function generateImage(params: GenerateImageParams) {
  return api.post<{
    success: boolean
    images: Array<{ url: string; prompt: string }>
    creditsUsed: number
  }>('/meta/campaigns/ai/image', params)
}

async function generateHeadlines(params: {
  productName: string
  productDescription?: string
  count?: number
}) {
  return api.post<{
    success: boolean
    headlines: string[]
    creditsUsed: number
  }>('/meta/campaigns/ai/headlines', params)
}

// Credits
async function fetchCreditCosts() {
  return api.get<{
    success: boolean
    costs: CreditCosts
  }>('/meta/campaigns/credits/costs')
}

async function calculateCredits(params: {
  creativeSources: CreativeSourceType[]
  publishImmediately?: boolean
  generateAdCopy?: boolean
  generateHeadlines?: boolean
}) {
  return api.post<{
    success: boolean
    total: number
    breakdown: CreditCalculation['breakdown']
  }>('/meta/campaigns/credits/calculate', params)
}

async function fetchCreditsBalance() {
  return api.get<{
    success: boolean
    credits: UserCredits
  }>('/meta/campaigns/credits/balance')
}

// ============================================
// Query Hooks
// ============================================

export function useCampaignTemplates(params?: {
  status?: string
  search?: string
  limit?: number
  offset?: number
}) {
  const workspaceId = useWorkspaceId()

  return useQuery({
    queryKey: [...queryKeys.metaAds.all, 'templates', workspaceId, params],
    queryFn: () => fetchTemplates({ ...params, workspaceId: workspaceId || undefined }),
    enabled: !!workspaceId,
  })
}

export function useCampaignTemplate(id: string | undefined) {
  return useQuery({
    queryKey: [...queryKeys.metaAds.all, 'template', id],
    queryFn: () => fetchTemplate(id!),
    enabled: !!id,
  })
}

export function useCreditCosts() {
  return useQuery({
    queryKey: [...queryKeys.metaAds.all, 'credit-costs'],
    queryFn: fetchCreditCosts,
    staleTime: 1000 * 60 * 60, // 1 hour
  })
}

export function useCampaignCreditsBalance() {
  return useQuery({
    queryKey: [...queryKeys.metaAds.all, 'credits-balance'],
    queryFn: fetchCreditsBalance,
    staleTime: 1000 * 60 * 5, // 5 minutes
  })
}

// ============================================
// Mutation Hooks
// ============================================

export function useSaveTemplate() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: saveTemplate,
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: [...queryKeys.metaAds.all, 'templates'],
      })
    },
  })
}

export function useDeleteTemplate() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: deleteTemplate,
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: [...queryKeys.metaAds.all, 'templates'],
      })
    },
  })
}

export function useDuplicateTemplate() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: duplicateTemplate,
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: [...queryKeys.metaAds.all, 'templates'],
      })
    },
  })
}

export function usePublishCampaign() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ id, dryRun }: { id: string; dryRun?: boolean }) =>
      publishCampaign(id, dryRun),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: [...queryKeys.metaAds.all, 'templates'],
      })
      queryClient.invalidateQueries({
        queryKey: [...queryKeys.metaAds.all, 'credits-balance'],
      })
    },
  })
}

export function useGenerateAdCopy() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: generateAdCopy,
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: [...queryKeys.metaAds.all, 'credits-balance'],
      })
    },
  })
}

export function useGenerateImage() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: generateImage,
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: [...queryKeys.metaAds.all, 'credits-balance'],
      })
    },
  })
}

export function useGenerateHeadlines() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: generateHeadlines,
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: [...queryKeys.metaAds.all, 'credits-balance'],
      })
    },
  })
}

export function useCalculateCredits() {
  return useMutation({
    mutationFn: calculateCredits,
  })
}
