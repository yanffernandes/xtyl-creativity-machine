import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from '@/shared/utils/api'
import type {
  GenerateImagesRequest,
  GenerateImagesResponse,
  RegenerateImageRequest,
  GeneratedImage,
  GenerateAdCopyRequest,
  GenerateAdCopyResponse,
  CreditsPreviewRequest,
  CreditsPreviewResponse,
  LibraryQueryParams,
  LibraryResponse,
  GenerateCreativesRequest,
  GenerateCreativesResponse,
  DetectNicheRequest,
  DetectNicheResponse,
  LibraryFilterOptions,
} from '../types/creative'

// ========================
// Query Keys
// ========================

export const creativeQueryKeys = {
  all: ['meta-creatives'] as const,
  library: (params?: LibraryQueryParams) => [...creativeQueryKeys.all, 'library', params] as const,
  creditsPreview: (params: CreditsPreviewRequest) =>
    [...creativeQueryKeys.all, 'credits-preview', params] as const,
}

// ========================
// Image Generation Mutations
// ========================

/**
 * Generate AI images for articles
 */
export function useGenerateImages() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (data: GenerateImagesRequest): Promise<GenerateImagesResponse> => {
      const response = await api.post<GenerateImagesResponse>('/meta/creatives/generate-images', data)
      return response
    },
    onSuccess: () => {
      // Invalidate library to show new images
      queryClient.invalidateQueries({ queryKey: creativeQueryKeys.all })
    },
  })
}

/**
 * Regenerate a single image
 */
export function useRegenerateImage() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (data: RegenerateImageRequest): Promise<GeneratedImage> => {
      const response = await api.post<GeneratedImage>('/meta/creatives/regenerate-image', data)
      return response
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: creativeQueryKeys.all })
    },
  })
}

/**
 * Generate ad copy for an image
 */
export function useGenerateAdCopy() {
  return useMutation({
    mutationFn: async (data: GenerateAdCopyRequest): Promise<GenerateAdCopyResponse> => {
      const response = await api.post<GenerateAdCopyResponse>('/meta/creatives/generate-ad-copy', data)
      return response
    },
  })
}

// ========================
// Ice Breakers Generation
// ========================

export interface GenerateIceBreakersRequest {
  primaryText: string
  headline: string
  description?: string
}

export interface GenerateIceBreakersResponse {
  success: boolean
  data: {
    greeting: string
    iceBreakers: Array<{ title: string; response: string }>
  }
}

/**
 * Generate greeting + ice breakers for message ads
 */
export function useGenerateIceBreakers() {
  return useMutation({
    mutationFn: async (data: GenerateIceBreakersRequest): Promise<GenerateIceBreakersResponse['data']> => {
      const response = await api.post<GenerateIceBreakersResponse>('/meta/creatives/generate-ice-breakers', data)
      return response.data
    },
  })
}

// ========================
// Credits Queries
// ========================

/**
 * Preview credits cost before generation
 */
export function useCreditsPreview(params: CreditsPreviewRequest, enabled = true) {
  return useQuery({
    queryKey: creativeQueryKeys.creditsPreview(params),
    queryFn: async (): Promise<CreditsPreviewResponse> => {
      const response = await api.post<CreditsPreviewResponse>('/meta/creatives/credits/preview', params)
      return response
    },
    enabled,
    staleTime: 30 * 1000, // 30 seconds
  })
}

// ========================
// Library Queries
// ========================

/**
 * List creatives from library with filters
 */
export function useLibraryCreatives(params?: LibraryQueryParams) {
  return useQuery({
    queryKey: creativeQueryKeys.library(params),
    queryFn: async (): Promise<LibraryResponse> => {
      const queryParams = new URLSearchParams()
      if (params?.page) queryParams.set('page', String(params.page))
      if (params?.limit) queryParams.set('limit', String(params.limit))
      if (params?.workspaceId) queryParams.set('workspaceId', params.workspaceId)
      if (params?.articleId) queryParams.set('articleId', String(params.articleId))
      if (params?.model) queryParams.set('model', params.model)
      if (params?.style) queryParams.set('style', params.style)
      if (params?.format) queryParams.set('format', params.format)
      if (params?.niche) queryParams.set('niche', params.niche)
      if (params?.language) queryParams.set('language', params.language)

      const queryString = queryParams.toString()
      const url = `/meta/creatives/library${queryString ? `?${queryString}` : ''}`
      const response = await api.get<LibraryResponse>(url)
      return response
    },
  })
}

/**
 * Get filter options for library dropdowns
 */
export function useLibraryFilterOptions(workspaceId?: string) {
  return useQuery({
    queryKey: [...creativeQueryKeys.all, 'library-filters', workspaceId],
    queryFn: async (): Promise<LibraryFilterOptions> => {
      const url = workspaceId
        ? `/meta/creatives/library-filters?workspaceId=${workspaceId}`
        : '/meta/creatives/library-filters'
      return api.get<LibraryFilterOptions>(url)
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
  })
}

/**
 * Get library statistics
 */
export function useLibraryStats(workspaceId?: string) {
  return useQuery({
    queryKey: [...creativeQueryKeys.all, 'library-stats', workspaceId],
    queryFn: async () => {
      const url = workspaceId
        ? `/meta/creatives/library-stats?workspaceId=${workspaceId}`
        : '/meta/creatives/library-stats'
      return api.get<{
        totalCreatives: number
        byModel: Record<string, number>
        byFormat: Record<string, number>
      }>(url)
    },
  })
}

/**
 * Delete a creative from library
 */
export function useDeleteLibraryCreative() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (id: string): Promise<void> => {
      await api.delete(`/meta/creatives/library/${id}`)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: creativeQueryKeys.library() })
    },
  })
}

// ========================
// T026: Concept-Based Generation (Andromeda)
// ========================

/**
 * Generate diverse creatives using concept-based prompts
 * Supports both preset mode (user selects concepts) and free mode (AI selects)
 */
export function useGenerateCreatives() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (data: GenerateCreativesRequest): Promise<GenerateCreativesResponse> => {
      const response = await api.post<GenerateCreativesResponse>('/meta/creatives/generate', data)
      return response
    },
    onSuccess: () => {
      // Invalidate library to show new images
      queryClient.invalidateQueries({ queryKey: creativeQueryKeys.all })
    },
  })
}

/**
 * Detect niche from articles for preview
 * Used to show users what template will be applied before generation
 */
export function useDetectNiche() {
  return useMutation({
    mutationFn: async (data: DetectNicheRequest): Promise<DetectNicheResponse> => {
      const response = await api.post<DetectNicheResponse>('/meta/creatives/detect-niche', data)
      return response
    },
  })
}
