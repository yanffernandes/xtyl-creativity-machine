import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useWorkspaceId } from '@/features/workspace/stores/workspaceStore'
import { api } from '@/shared/utils/api'
import type {
  GoogleCampaignData,
  GoogleAdGroupData,
  GoogleExtensionsData,
  GoogleAccountData,
} from '../types/campaign'

// ========================
// Types
// ========================

// Matches the new ad_campaign_templates table structure
export interface GoogleCampaignTemplate {
  id: string
  user_id: string
  connection_id?: string
  platform: 'google_ads' | 'meta_ads'
  name: string
  status: 'draft' | 'ready' | 'publishing' | 'published' | 'failed' | 'paused'
  bulk_operation_id?: string
  source_article_id?: number
  source_template_id?: string
  campaign_data: GoogleCampaignData & { account?: GoogleAccountData }
  ad_groups_data: GoogleAdGroupData[]
  extensions_data: GoogleExtensionsData
  platform_ids: {
    campaignId?: string
    adGroupIds?: string[]
    customerId?: string
    loginCustomerId?: string
  }
  publish_attempts: number
  last_error?: string
  published_at?: string
  created_at: string
  updated_at: string
}

// Helper to get network type from campaign_data
export function getNetworkType(template: GoogleCampaignTemplate): string {
  return template.campaign_data?.networkType || 'search'
}

// Helper to get budget from campaign_data
export function getBudget(template: GoogleCampaignTemplate): number {
  return template.campaign_data?.budget || 0
}

interface SaveTemplateInput {
  id?: string
  templateName: string
  account: GoogleAccountData
  campaign: GoogleCampaignData
  adGroups: GoogleAdGroupData[]
  extensions: GoogleExtensionsData
  workspace_id?: string
  source_article_id?: number
}

interface PublishCampaignInput {
  id: string
  dryRun?: boolean
}

interface PublishCampaignResult {
  success: boolean
  campaignId?: string
  adGroupIds?: string[]
  errors?: string[]
  partialSuccess?: boolean
  warnings?: string[]
}

interface GenerateKeywordsInput {
  seedKeywords: string[]
  productName?: string
  count?: number
  language: string // Required - no default allowed
}

interface GenerateKeywordsResult {
  success: boolean
  keywords: Array<{
    text: string
    matchType: string
    volume?: number
    competition?: string
  }>
  creditsUsed: number
}

interface GenerateAdCopyInput {
  productName: string
  productDescription?: string
  keywords?: string[]
  headlineCount?: number
  descriptionCount?: number
  tone?: string
  language: string // Required - no default allowed
}

interface GenerateAdCopyResult {
  success: boolean
  headlines: string[]
  descriptions: string[]
  creditsUsed: number
}

interface CreditCosts {
  costs: {
    CAMPAIGN_BASIC: number
    AD_GROUP_BASIC: number
    KEYWORD_RESEARCH: number
    AI_HEADLINE_GENERATION: number
    AI_DESCRIPTION_GENERATION: number
    AI_IMAGE_GENERATION: number
    CAMPAIGN_PUBLISH: number
  }
}

// ========================
// Query Keys
// ========================

export const googleCampaignKeys = {
  all: ['google-campaigns'] as const,
  lists: () => [...googleCampaignKeys.all, 'list'] as const,
  list: (filters: Record<string, unknown>) => [...googleCampaignKeys.lists(), filters] as const,
  details: () => [...googleCampaignKeys.all, 'detail'] as const,
  detail: (id: string) => [...googleCampaignKeys.details(), id] as const,
  templates: () => [...googleCampaignKeys.all, 'templates'] as const,
  template: (id: string) => [...googleCampaignKeys.templates(), id] as const,
  credits: () => [...googleCampaignKeys.all, 'credits'] as const,
  geoTargets: (search?: string, type?: string) => [...googleCampaignKeys.all, 'geo-targets', search, type] as const,
  languages: (search?: string) => [...googleCampaignKeys.all, 'languages', search] as const,
  accounts: (connectionId: string) => [...googleCampaignKeys.all, 'accounts', connectionId] as const,
}

// ========================
// Queries
// ========================

export function useGoogleCampaigns(filters?: { status?: string; network?: string }) {
  const workspaceId = useWorkspaceId()

  return useQuery({
    queryKey: googleCampaignKeys.list({ ...filters, workspace_id: workspaceId }),
    queryFn: async () => {
      // Build query string from filters
      const params = new URLSearchParams()
      if (filters?.status) params.set('status', filters.status)
      if (filters?.network) params.set('network', filters.network)
      if (workspaceId) params.set('workspace_id', workspaceId)

      const queryString = params.toString()
      const endpoint = `/google/campaigns/templates${queryString ? `?${queryString}` : ''}`

      const response = await api.get<{ success: boolean; templates: GoogleCampaignTemplate[] }>(endpoint)
      return response.templates || []
    },
    enabled: !!workspaceId,
  })
}

export function useGoogleCampaignTemplate(id: string | undefined) {
  return useQuery({
    queryKey: googleCampaignKeys.template(id || ''),
    queryFn: async () => {
      if (!id) return null
      const response = await api.get<{ success: boolean; template: GoogleCampaignTemplate }>(
        `/google/campaigns/templates/${id}`
      )
      return response.template
    },
    enabled: !!id,
  })
}

export function useGoogleAdsCreditCosts() {
  return useQuery({
    queryKey: googleCampaignKeys.credits(),
    queryFn: async () => {
      const response = await api.get<CreditCosts>('/google/campaigns/credits/costs')
      return response
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
  })
}

// Types for geo targets and languages (exported for reuse in other modules)
export interface GeoTarget {
  id: string
  name: string
  type: string
  parent_id?: string
}

export interface GoogleLanguage {
  id: string
  code: string
  name: string
}

/**
 * Hook to fetch available geo targets from Google Ads
 */
export function useGoogleGeoTargets(search?: string, type?: 'state' | 'city') {
  return useQuery({
    queryKey: googleCampaignKeys.geoTargets(search, type),
    queryFn: async () => {
      const params = new URLSearchParams()
      if (search) params.append('search', search)
      if (type) params.append('type', type)

      const queryString = params.toString()
      const url = `/google/bulk/geo-targets${queryString ? `?${queryString}` : ''}`

      const response = await api.get<{ success: boolean; data: GeoTarget[] }>(url)
      return response.data || []
    },
    staleTime: 10 * 60 * 1000, // 10 minutes cache
  })
}

/**
 * Hook to fetch available languages for Google Ads targeting
 */
export function useGoogleLanguages(search?: string) {
  return useQuery({
    queryKey: googleCampaignKeys.languages(search),
    queryFn: async () => {
      const params = new URLSearchParams()
      if (search) params.append('search', search)

      const queryString = params.toString()
      const url = `/google/bulk/languages${queryString ? `?${queryString}` : ''}`

      const response = await api.get<{ success: boolean; data: GoogleLanguage[] }>(url)
      return response.data || []
    },
    staleTime: 30 * 60 * 1000, // 30 minutes cache (languages don't change often)
  })
}

// Types for Google Ads accounts
export interface GoogleAdsAccount {
  customerId: string
  name: string
  currency: string
  timezone: string
  isManager: boolean
  loginCustomerId?: string // ID da conta MCC pai (apenas para contas gerenciadas por MCC)
}

/**
 * Hook to fetch Google Ads accounts accessible through a connection
 */
export function useGoogleAdsAccounts(connectionId: string | undefined) {
  return useQuery({
    queryKey: googleCampaignKeys.accounts(connectionId || ''),
    queryFn: async () => {
      if (!connectionId) return []
      const response = await api.get<{ success: boolean; accounts: GoogleAdsAccount[]; error?: string }>(
        `/google/campaigns/accounts/${connectionId}`
      )
      if (!response.success) {
        throw new Error(response.error || 'Falha ao buscar contas Google Ads')
      }
      return response.accounts || []
    },
    enabled: !!connectionId,
    staleTime: 5 * 60 * 1000, // 5 minutes cache
  })
}

/**
 * Hook to fetch client accounts managed by an MCC (Manager) account
 * Supports nested MCCs via mccPath parameter
 *
 * @param connectionId - The connection ID
 * @param mccCustomerId - The current MCC to query
 * @param mccPath - Optional array of parent MCC IDs for nested MCCs.
 *                  For example, if querying MCC C which is inside MCC B which is inside MCC A:
 *                  mccPath should be ['A', 'B'] and mccCustomerId should be 'C'
 */
export function useManagedAccounts(
  connectionId: string | undefined,
  mccCustomerId: string | undefined,
  mccPath?: string[]
) {
  return useQuery({
    queryKey: [...googleCampaignKeys.accounts(connectionId || ''), 'managed', mccCustomerId, mccPath],
    queryFn: async () => {
      if (!connectionId || !mccCustomerId) return []

      // Build URL with optional mccPath query parameter for nested MCCs
      let url = `/google/campaigns/accounts/${connectionId}/managed/${mccCustomerId}`
      if (mccPath && mccPath.length > 0) {
        url += `?mccPath=${mccPath.join(',')}`
      }

      const response = await api.get<{
        success: boolean
        accounts: GoogleAdsAccount[]
        mccCustomerId: string
        mccPath?: string[]
        loginCustomerId?: string
        error?: string
      }>(url)

      if (!response.success) {
        console.warn('Failed to fetch managed accounts:', response.error)
        return []
      }
      return response.accounts || []
    },
    enabled: !!connectionId && !!mccCustomerId,
    staleTime: 5 * 60 * 1000, // 5 minutes cache
  })
}

// ========================
// Mutations
// ========================

export function useSaveGoogleTemplate() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (input: SaveTemplateInput) => {
      const response = await api.post<{ success: boolean; template: GoogleCampaignTemplate }>(
        '/google/campaigns/templates',
        input
      )
      return response
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: googleCampaignKeys.templates() })
      // Invalidate articles query to update the Google Ads counter in article list
      queryClient.invalidateQueries({ queryKey: ['articles-for-campaign'] })
    },
  })
}

export function usePublishGoogleCampaign() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (input: PublishCampaignInput) => {
      const response = await api.post<PublishCampaignResult>(
        `/google/campaigns/${input.id}/publish`,
        { dryRun: input.dryRun }
      )
      return response
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: googleCampaignKeys.all })
    },
  })
}

export function useGenerateKeywords() {
  return useMutation({
    mutationFn: async (input: GenerateKeywordsInput) => {
      const response = await api.post<GenerateKeywordsResult>(
        '/google/campaigns/ai/keywords',
        input
      )
      return response
    },
  })
}

export function useGenerateGoogleAdCopy() {
  return useMutation({
    mutationFn: async (input: GenerateAdCopyInput) => {
      const response = await api.post<GenerateAdCopyResult>(
        '/google/campaigns/ai/ad-copy',
        input
      )
      return response
    },
  })
}

// Generate from Article types
interface GenerateFromArticleInput {
  articleId: number
  keywords?: string[] // Keywords from RapidAPI mining - used for generating coherent content
  headlineCount?: number
  descriptionCount?: number
  tone?: string
  articleUrl?: string
  language: string // Required - no default allowed
}

// Generated extensions from article
interface GeneratedSitelink {
  text: string
  description1: string
  description2: string
  finalUrl: string
}

interface GeneratedStructuredSnippet {
  header: string
  values: string[]
}

interface GeneratedExtensions {
  sitelinks: GeneratedSitelink[]
  callouts: string[]
  structuredSnippets: GeneratedStructuredSnippet[]
}

interface GenerateFromArticleResult {
  success: boolean
  headlines: string[]
  descriptions: string[]
  suggestedCampaignName: string
  extensions?: GeneratedExtensions
  creditsUsed: number
  articleId: number
  articleTitle: string
  error?: string
}

export function useGenerateFromArticle() {
  return useMutation({
    mutationFn: async (input: GenerateFromArticleInput) => {
      const response = await api.post<GenerateFromArticleResult>(
        '/google/campaigns/ai/from-article',
        input
      )
      return response
    },
  })
}

export function usePauseGoogleCampaign() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (campaignId: string) => {
      const response = await api.post<{ success: boolean }>(
        `/google/campaigns/${campaignId}/pause`,
        {}
      )
      return response
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: googleCampaignKeys.all })
    },
  })
}

export function useResumeGoogleCampaign() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (campaignId: string) => {
      const response = await api.post<{ success: boolean }>(
        `/google/campaigns/${campaignId}/resume`,
        {}
      )
      return response
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: googleCampaignKeys.all })
    },
  })
}

export function useDeleteGoogleCampaign() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (campaignId: string) => {
      const response = await api.delete<{ success: boolean }>(
        `/google/campaigns/${campaignId}`
      )
      return response
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: googleCampaignKeys.all })
    },
  })
}

// ========================
// WordPress Post URL
// ========================

interface GetPostUrlResult {
  success: boolean
  url?: string
  message?: string
  status?: 'trashed' | 'draft' | 'pending' | 'private' | 'publish' | string
}

export async function fetchWordPressPostUrl(projectId: number, wpPostId: number): Promise<GetPostUrlResult> {
  try {
    const response = await api.get<GetPostUrlResult>(
      `/wordpress/post-url/${projectId}/${wpPostId}`
    )
    return response
  } catch (error) {
    console.error('Erro ao buscar URL do artigo:', error)
    return { success: false, message: 'Erro ao buscar URL do artigo' }
  }
}

// ========================
// Keyword Planner (Metrics & Ideas)
// ========================

export interface KeywordMetrics {
  keyword: string
  avgMonthlySearches: number | null
  competition: 'LOW' | 'MEDIUM' | 'HIGH' | 'UNSPECIFIED' | null
  competitionIndex: number | null
  lowTopOfPageBidMicros: number | null
  highTopOfPageBidMicros: number | null
}

export interface KeywordIdea {
  keyword: string
  avgMonthlySearches: number | null
  competition: 'LOW' | 'MEDIUM' | 'HIGH' | 'UNSPECIFIED' | null
  competitionIndex: number | null
  lowTopOfPageBidMicros: number | null
  highTopOfPageBidMicros: number | null
}

interface GetKeywordMetricsInput {
  connectionId: string
  keywords: string[]
  customerId?: string
  loginCustomerId?: string
  geoTargetConstants?: string[]
  languageId?: string
}

interface GetKeywordMetricsResult {
  success: boolean
  keywords?: KeywordMetrics[]
  error?: string
}

interface GenerateKeywordIdeasInput {
  connectionId: string
  seedKeywords?: string[]
  url?: string
  customerId?: string
  loginCustomerId?: string
  geoTargetConstants?: string[]
  languageId?: string
}

interface GenerateKeywordIdeasResult {
  success: boolean
  ideas?: KeywordIdea[]
  error?: string
}

/**
 * Hook to get keyword metrics (volume, competition, CPC) for a list of keywords
 * Uses Google Ads Keyword Planner API
 */
export function useGetKeywordMetrics() {
  return useMutation({
    mutationFn: async (input: GetKeywordMetricsInput) => {
      const response = await api.post<GetKeywordMetricsResult>(
        '/google/campaigns/keywords/metrics',
        input
      )
      return response
    },
  })
}

/**
 * Hook to generate keyword ideas from seed keywords or URL
 * Uses Google Ads Keyword Planner API
 */
export function useGenerateKeywordIdeas() {
  return useMutation({
    mutationFn: async (input: GenerateKeywordIdeasInput) => {
      const response = await api.post<GenerateKeywordIdeasResult>(
        '/google/campaigns/keywords/ideas',
        input
      )
      return response
    },
  })
}

// Complete mapping of ISO country codes to Google Ads geo target constant IDs
// Kept in sync with backend - used for fast lookup without API call
export const GEO_TARGET_MAP: Record<string, string> = {
  // Americas
  AR: '2032', BO: '2068', BR: '2076', CA: '2124', CL: '2152', CO: '2170',
  CR: '2188', CU: '2192', DO: '2214', EC: '2218', SV: '2222', GT: '2320',
  HN: '2340', MX: '2484', NI: '2558', PA: '2591', PY: '2600', PE: '2604',
  PR: '2630', US: '2840', UY: '2858', VE: '2862',
  // Europe
  AT: '2040', BE: '2056', CH: '2756', CZ: '2203', DE: '2276', DK: '2208',
  ES: '2724', FI: '2246', FR: '2250', GB: '2826', GR: '2300', HU: '2348',
  IE: '2372', IT: '2380', NL: '2528', NO: '2578', PL: '2616', PT: '2620',
  RO: '2642', RU: '2643', SE: '2752', UA: '2804',
  // Asia & Pacific
  AU: '2036', CN: '2156', HK: '2344', ID: '2360', IN: '2356', JP: '2392',
  KR: '2410', MY: '2458', NZ: '2554', PH: '2608', SG: '2702', TH: '2764',
  TW: '2158', VN: '2704',
  // Middle East & Africa
  AE: '2784', EG: '2818', IL: '2376', SA: '2682', TR: '2792', ZA: '2710',
}

// Complete mapping of ISO language codes to Google Ads language constant IDs
export const LANGUAGE_MAP: Record<string, string> = {
  ar: '1019', bg: '1020', ca: '1038', cs: '1021', da: '1009', de: '1001',
  el: '1022', en: '1000', es: '1003', et: '1043', fi: '1011', fr: '1002',
  he: '1027', hi: '1023', hr: '1039', hu: '1024', id: '1025', it: '1004',
  ja: '1005', ko: '1012', lt: '1041', lv: '1040', ms: '1034', nl: '1010',
  no: '1013', pl: '1030', pt: '1014', ro: '1032', ru: '1031', sk: '1033',
  sl: '1035', sr: '1036', sv: '1015', th: '1044', tl: '1042', tr: '1037',
  uk: '1045', vi: '1040', zh: '1017', 'zh-TW': '1018',
}

/**
 * Get geo target ID from country code (local lookup)
 * Returns the ID or null if not found
 */
export function getGeoTargetId(countryCode: string): string | null {
  const normalized = countryCode.toUpperCase().trim()
  return GEO_TARGET_MAP[normalized] || null
}

/**
 * Get language ID from language code (local lookup)
 * Returns the ID or null if not found
 */
export function getLanguageId(languageCode: string): string | null {
  const normalized = languageCode.toLowerCase().trim()
  return LANGUAGE_MAP[normalized] || null
}

/**
 * Helper to format CPC from micros to currency
 * @param micros - Value in micros (e.g., 1000000 = R$1.00)
 * @param currency - Currency code (default: BRL)
 */
export function formatCpcFromMicros(micros: number | null, currency = 'BRL'): string {
  if (micros === null) return '-'
  const value = micros / 1_000_000
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value)
}

/**
 * Helper to format search volume
 * @param volume - Monthly search volume
 */
export function formatSearchVolume(volume: number | null): string {
  if (volume === null) return '-'
  if (volume >= 1_000_000) {
    return `${(volume / 1_000_000).toFixed(1)}M`
  }
  if (volume >= 1_000) {
    return `${(volume / 1_000).toFixed(1)}K`
  }
  return volume.toString()
}

/**
 * Helper to get competition level color
 */
export function getCompetitionColor(competition: KeywordMetrics['competition']): string {
  switch (competition) {
    case 'LOW':
      return 'var(--color-success)'
    case 'MEDIUM':
      return 'var(--color-warning)'
    case 'HIGH':
      return 'var(--color-error)'
    default:
      return 'var(--color-text-tertiary)'
  }
}

/**
 * Helper to get competition label in Portuguese
 */
export function getCompetitionLabel(competition: KeywordMetrics['competition']): string {
  switch (competition) {
    case 'LOW':
      return 'Baixa'
    case 'MEDIUM':
      return 'Média'
    case 'HIGH':
      return 'Alta'
    default:
      return '-'
  }
}

// ========================
// Keyword Expansion (Fallback for specific keywords)
// ========================

interface ExpandKeywordInput {
  originalKeyword: string
  currentCount: number
  articleTitle?: string
  articleExcerpt?: string
  language: string // Required - no default allowed
}

interface ExpandKeywordResult {
  success: boolean
  alternativeKeywords: string[]
  reasoning?: string
  error?: string
}

/**
 * Hook to expand a specific keyword into broader alternatives using LLM
 * Used when Google Keyword Planner returns too few results (< 50 keywords)
 */
export function useExpandKeyword() {
  return useMutation({
    mutationFn: async (input: ExpandKeywordInput) => {
      const response = await api.post<ExpandKeywordResult>(
        '/google/campaigns/ai/expand-keyword',
        input
      )
      return response
    },
  })
}

// Minimum number of keywords required for a campaign
export const MIN_KEYWORDS_REQUIRED = 50
