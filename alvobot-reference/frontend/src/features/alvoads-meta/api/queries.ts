import { useQuery } from '@tanstack/react-query'
import { api } from '@/shared/utils/api'
import type {
  MetaAdAccount,
  MetaInstagramAccount,
  MetaPixel,
  MetaCountry,
  MetaLanguage,
  DriveFile,
  MetaCampaignTemplate,
} from '../types/campaign'

// ========================
// Query Keys
// ========================

export const metaAdsQueryKeys = {
  all: ['meta-ads'] as const,
  connections: () => [...metaAdsQueryKeys.all, 'connections'] as const,
  adAccounts: (connectionId: string) => [...metaAdsQueryKeys.all, 'ad-accounts', connectionId] as const,
  pages: (connectionId: string) => [...metaAdsQueryKeys.all, 'pages', connectionId] as const,
  instagram: (pageId: string) => [...metaAdsQueryKeys.all, 'instagram', pageId] as const,
  pixels: (adAccountId: string) => [...metaAdsQueryKeys.all, 'pixels', adAccountId] as const,
  countries: (search?: string) => [...metaAdsQueryKeys.all, 'countries', search] as const,
  languages: (search?: string) => [...metaAdsQueryKeys.all, 'languages', search] as const,
  driveFiles: (folderUrl: string) => [...metaAdsQueryKeys.all, 'drive-files', folderUrl] as const,
  templates: (workspaceId?: string) => [...metaAdsQueryKeys.all, 'templates', workspaceId] as const,
  template: (id: string) => [...metaAdsQueryKeys.all, 'template', id] as const,
}

// ========================
// Ad Accounts Query
// ========================

interface AdAccountsResponse {
  success: boolean
  adAccounts: MetaAdAccount[]
  error?: string
}

export function useMetaAdAccounts(connectionId: string | undefined) {
  return useQuery({
    queryKey: metaAdsQueryKeys.adAccounts(connectionId || ''),
    queryFn: async (): Promise<MetaAdAccount[]> => {
      if (!connectionId) return []

      const response = await api.get<AdAccountsResponse>(
        `/meta/campaigns/accounts/${connectionId}`
      )

      if (!response.success) {
        throw new Error(response.error || 'Erro ao buscar contas de anúncios')
      }

      // Ensure we always return an array, never undefined
      return response.adAccounts || []
    },
    enabled: !!connectionId,
    staleTime: 5 * 60 * 1000, // 5 minutes
  })
}

// ========================
// Pages Query
// ========================

// Page info returned by the campaigns/pages endpoint (simplified for wizard)
interface PageInfo {
  id: string
  name: string
  isActive: boolean
  category?: string
  pictureUrl?: string
}

interface PagesResponse {
  success: boolean
  pages: PageInfo[]
  error?: string
}

export function useMetaPages(connectionId: string | undefined) {
  return useQuery({
    queryKey: metaAdsQueryKeys.pages(connectionId || ''),
    queryFn: async (): Promise<PageInfo[]> => {
      if (!connectionId) return []

      const response = await api.get<PagesResponse>(
        `/meta/campaigns/pages/${connectionId}`
      )

      if (!response.success) {
        throw new Error(response.error || 'Erro ao buscar páginas')
      }

      return response.pages
    },
    enabled: !!connectionId,
    staleTime: 5 * 60 * 1000,
  })
}

// ========================
// Instagram Account Query
// ========================

interface InstagramResponse {
  success: boolean
  instagramAccount: MetaInstagramAccount | null
  error?: string
}

export function useMetaInstagramAccounts(pageId: string | undefined) {
  return useQuery({
    queryKey: metaAdsQueryKeys.instagram(pageId || ''),
    queryFn: async (): Promise<MetaInstagramAccount | null> => {
      if (!pageId) return null

      const response = await api.get<InstagramResponse>(
        `/meta/campaigns/instagram/${pageId}`
      )

      if (!response.success) {
        throw new Error(response.error || 'Erro ao buscar conta Instagram')
      }

      // Return null instead of undefined to satisfy TanStack Query
      return response.instagramAccount ?? null
    },
    enabled: !!pageId,
    staleTime: 5 * 60 * 1000,
  })
}

// ========================
// Pixels Query
// ========================

interface PixelsResponse {
  success: boolean
  pixels: MetaPixel[]
  error?: string
}

export function useMetaPixels(adAccountId: string | undefined) {
  return useQuery({
    queryKey: metaAdsQueryKeys.pixels(adAccountId || ''),
    queryFn: async (): Promise<MetaPixel[]> => {
      if (!adAccountId) return []

      const response = await api.get<PixelsResponse>(
        `/meta/campaigns/pixels/${adAccountId}`
      )

      if (!response.success) {
        throw new Error(response.error || 'Erro ao buscar pixels')
      }

      return response.pixels
    },
    enabled: !!adAccountId,
    staleTime: 5 * 60 * 1000,
  })
}

// ========================
// Countries Query
// ========================

interface CountriesResponse {
  success: boolean
  countries: MetaCountry[]
  error?: string
}

export function useMetaCountries(search?: string) {
  return useQuery({
    queryKey: metaAdsQueryKeys.countries(search),
    queryFn: async (): Promise<MetaCountry[]> => {
      const params = new URLSearchParams()
      if (search) params.set('search', search)

      const response = await api.get<CountriesResponse>(
        `/meta/targeting/countries?${params.toString()}`
      )

      if (!response.success) {
        throw new Error(response.error || 'Erro ao buscar países')
      }

      return response.countries
    },
    staleTime: 30 * 60 * 1000, // 30 minutes (rarely changes)
  })
}

// ========================
// Languages Query
// ========================

interface LanguagesResponse {
  success: boolean
  languages: MetaLanguage[]
  error?: string
}

export function useMetaLanguages(search?: string) {
  return useQuery({
    queryKey: metaAdsQueryKeys.languages(search),
    queryFn: async (): Promise<MetaLanguage[]> => {
      const params = new URLSearchParams()
      if (search) params.set('search', search)

      const response = await api.get<LanguagesResponse>(
        `/meta/targeting/languages?${params.toString()}`
      )

      if (!response.success) {
        throw new Error(response.error || 'Erro ao buscar idiomas')
      }

      return response.languages
    },
    staleTime: 30 * 60 * 1000, // 30 minutes
  })
}

// ========================
// Drive Files Query
// ========================

interface DriveFilesResponse {
  success: boolean
  files: DriveFile[]
  error?: string
}

export function useDriveFiles(folderUrl: string | undefined) {
  return useQuery({
    queryKey: metaAdsQueryKeys.driveFiles(folderUrl || ''),
    queryFn: async (): Promise<DriveFile[]> => {
      if (!folderUrl) return []

      const params = new URLSearchParams({ folderUrl })
      const response = await api.get<DriveFilesResponse>(
        `/meta/campaigns/drive-files?${params.toString()}`
      )

      if (!response.success) {
        throw new Error(response.error || 'Erro ao buscar arquivos do Drive')
      }

      return response.files
    },
    enabled: !!folderUrl && folderUrl.length > 0,
    staleTime: 1 * 60 * 1000, // 1 minute
    retry: 1,
  })
}

// ========================
// Templates Query
// ========================

interface TemplatesResponse {
  success: boolean
  templates: MetaCampaignTemplate[]
  total: number
  error?: string
}

export function useMetaTemplates(workspaceId?: string) {
  return useQuery({
    queryKey: metaAdsQueryKeys.templates(workspaceId),
    queryFn: async (): Promise<MetaCampaignTemplate[]> => {
      const params = new URLSearchParams()
      if (workspaceId) params.set('workspace_id', workspaceId)

      const response = await api.get<TemplatesResponse>(
        `/meta/campaigns?${params.toString()}`
      )

      if (!response.success) {
        throw new Error(response.error || 'Erro ao buscar templates')
      }

      return response.templates
    },
    staleTime: 1 * 60 * 1000,
  })
}

// ========================
// Single Template Query
// ========================

interface TemplateResponse {
  success: boolean
  template: MetaCampaignTemplate
  error?: string
}

export function useMetaTemplate(templateId: string | undefined) {
  return useQuery({
    queryKey: metaAdsQueryKeys.template(templateId || ''),
    queryFn: async (): Promise<MetaCampaignTemplate | null> => {
      if (!templateId) return null

      const response = await api.get<TemplateResponse>(
        `/meta/campaigns/${templateId}`
      )

      if (!response.success) {
        throw new Error(response.error || 'Erro ao buscar template')
      }

      return response.template
    },
    enabled: !!templateId,
    staleTime: 30 * 1000, // 30 seconds
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

/**
 * Fetches the real WordPress URL for an article
 * This calls the same endpoint used by Google Ads to ensure consistency
 * and proper handling of trashed/unpublished posts
 */
export async function fetchWordPressPostUrl(
  projectId: number,
  wpPostId: number
): Promise<GetPostUrlResult> {
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
