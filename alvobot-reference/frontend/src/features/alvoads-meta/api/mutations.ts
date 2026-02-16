import { useMutation, useQueryClient } from '@tanstack/react-query'
import { showToast } from '@/shared/components/Toast'
import { useErrorHandler } from '@/shared/hooks'
import { api } from '@/shared/utils/api'
import { metaAdsQueryKeys } from './queries'
import type {
  MetaCampaignTemplate,
  MetaCampaignData,
  AiGeneratedImage,
} from '../types/campaign'

// ========================
// Save Template Mutation
// ========================

interface SaveTemplateInput {
  id?: string
  templateName: string
  campaignData: MetaCampaignData
  workspaceId?: string
  wizardState?: Record<string, unknown>
  lastWizardStep?: string
}

interface SaveTemplateResponse {
  success: boolean
  template: MetaCampaignTemplate
  message: string
  error?: string
}

export function useSaveTemplate() {
  const queryClient = useQueryClient()
  const { handleError } = useErrorHandler()

  return useMutation({
    mutationFn: async (input: SaveTemplateInput): Promise<MetaCampaignTemplate> => {
      // Flatten campaignData into root level as backend expects
      const response = await api.post<SaveTemplateResponse>('/meta/campaigns', {
        id: input.id,
        templateName: input.templateName,
        // Spread campaignData properties to root level
        ...(input.campaignData as unknown as Record<string, unknown>),
        workspace_id: input.workspaceId,
        wizard_state: input.wizardState,
        last_wizard_step: input.lastWizardStep,
      })

      if (!response.success) {
        throw new Error(response.error || 'Erro ao salvar template')
      }

      return response.template
    },
    onSuccess: (template) => {
      // Invalidate templates list
      queryClient.invalidateQueries({ queryKey: metaAdsQueryKeys.templates() })
      // Update specific template cache
      queryClient.setQueryData(metaAdsQueryKeys.template(template.id), template)
      showToast.success('Template salvo com sucesso')
    },
    onError: (error) => {
      handleError(error, 'Erro ao salvar template')
    },
  })
}

// ========================
// Delete Template Mutation
// ========================

interface DeleteTemplateResponse {
  success: boolean
  message: string
  error?: string
}

export function useDeleteTemplate() {
  const queryClient = useQueryClient()
  const { handleError } = useErrorHandler()

  return useMutation({
    mutationFn: async (templateId: string): Promise<void> => {
      const response = await api.delete<DeleteTemplateResponse>(
        `/meta/campaigns/${templateId}`
      )

      if (!response.success) {
        throw new Error(response.error || 'Erro ao excluir template')
      }
    },
    onSuccess: (_, templateId) => {
      // Invalidate templates list
      queryClient.invalidateQueries({ queryKey: metaAdsQueryKeys.templates() })
      // Remove specific template from cache
      queryClient.removeQueries({ queryKey: metaAdsQueryKeys.template(templateId) })
      showToast.success('Template excluído com sucesso')
    },
    onError: (error) => {
      handleError(error, 'Erro ao excluir template')
    },
  })
}

// ========================
// Duplicate Template Mutation
// ========================

interface DuplicateTemplateResponse {
  success: boolean
  template: MetaCampaignTemplate
  message: string
  error?: string
}

export function useDuplicateTemplate() {
  const queryClient = useQueryClient()
  const { handleError } = useErrorHandler()

  return useMutation({
    mutationFn: async (templateId: string): Promise<MetaCampaignTemplate> => {
      const response = await api.post<DuplicateTemplateResponse>(
        `/meta/campaigns/${templateId}/duplicate`,
        {}
      )

      if (!response.success) {
        throw new Error(response.error || 'Erro ao duplicar template')
      }

      return response.template
    },
    onSuccess: () => {
      // Invalidate templates list
      queryClient.invalidateQueries({ queryKey: metaAdsQueryKeys.templates() })
      showToast.success('Template duplicado com sucesso')
    },
    onError: (error) => {
      handleError(error, 'Erro ao duplicar template')
    },
  })
}

// ========================
// Publish Campaign Mutation
// ========================

interface PublishCampaignInput {
  templateId: string
  dryRun?: boolean
}

interface PublishCampaignResponse {
  success: boolean
  platformIds?: {
    campaignId: string
    adSetId: string
    creativeId: string
    adId: string
  }
  error?: string
  errorDetails?: string
}

export function usePublishCampaign() {
  const queryClient = useQueryClient()
  const { handleError } = useErrorHandler()

  return useMutation({
    mutationFn: async (input: PublishCampaignInput): Promise<PublishCampaignResponse> => {
      try {
        const response = await api.post<PublishCampaignResponse>(
          `/meta/campaigns/${input.templateId}/publish`,
          { dryRun: input.dryRun }
        )

        if (!response.success) {
          throw new Error(response.error || 'Erro ao publicar campanha')
        }

        return response
      } catch (error) {
        // Re-throw with the actual error message
        // The api client throws an object with { message, statusCode }
        const errorMessage =
          error instanceof Error
            ? error.message
            : (error as { message?: string })?.message || 'Erro ao publicar campanha'
        throw new Error(errorMessage)
      }
    },
    onSuccess: (_, variables) => {
      // Invalidate templates list and specific template
      queryClient.invalidateQueries({ queryKey: metaAdsQueryKeys.templates() })
      queryClient.invalidateQueries({
        queryKey: metaAdsQueryKeys.template(variables.templateId),
      })
      showToast.success('Campanha publicada com sucesso')
    },
    onError: (error) => {
      handleError(error, 'Erro ao publicar campanha')
    },
  })
}

// ========================
// Generate AI Image Mutation
// ========================

interface GenerateAiImageInput {
  prompt: string
  style?: string
  aspectRatio?: string
  count?: number
}

interface GenerateAiImageResponse {
  success: boolean
  imageUrl: string
  revisedPrompt?: string
  creditsUsed: number
  error?: string
}

export function useGenerateAiImage() {
  const { handleError } = useErrorHandler()

  return useMutation({
    mutationFn: async (input: GenerateAiImageInput): Promise<AiGeneratedImage[]> => {
      const response = await api.post<GenerateAiImageResponse>(
        '/meta/campaigns/ai/image',
        input
      )

      if (!response.success) {
        throw new Error(response.error || 'Erro ao gerar imagem')
      }

      // Transform single image response into array format expected by frontend
      const image: AiGeneratedImage = {
        id: `ai-${Date.now()}`,
        url: response.imageUrl,
        prompt: input.prompt,
        revisedPrompt: response.revisedPrompt,
        createdAt: new Date().toISOString(),
        approved: true,
      }

      return [image]
    },
    onSuccess: () => {
      showToast.success('Imagem gerada com sucesso')
    },
    onError: (error) => {
      handleError(error, 'Erro ao gerar imagem')
    },
  })
}

// ========================
// Generate Ad Copy Mutation
// ========================

interface GenerateAdCopyInput {
  productName: string
  productDescription?: string
  targetAudience?: string
  objective?: string
}

interface GenerateAdCopyResponse {
  success: boolean
  copies: Array<{
    primaryText: string
    headline: string
    description: string
  }>
  creditsUsed: number
  error?: string
}

export function useGenerateAdCopy() {
  const { handleError } = useErrorHandler()

  return useMutation({
    mutationFn: async (input: GenerateAdCopyInput): Promise<GenerateAdCopyResponse['copies']> => {
      const response = await api.post<GenerateAdCopyResponse>(
        '/meta/campaigns/ai/copy',
        input
      )

      if (!response.success) {
        throw new Error(response.error || 'Erro ao gerar textos')
      }

      return response.copies
    },
    onSuccess: () => {
      showToast.success('Textos gerados com sucesso')
    },
    onError: (error) => {
      handleError(error, 'Erro ao gerar textos')
    },
  })
}

// ========================
// Generate Headlines Mutation
// ========================

interface GenerateHeadlinesInput {
  productName: string
  productDescription?: string
  count?: number
}

interface GenerateHeadlinesResponse {
  success: boolean
  headlines: string[]
  creditsUsed: number
  error?: string
}

export function useGenerateHeadlines() {
  const { handleError } = useErrorHandler()

  return useMutation({
    mutationFn: async (input: GenerateHeadlinesInput): Promise<string[]> => {
      const response = await api.post<GenerateHeadlinesResponse>(
        '/meta/campaigns/ai/headlines',
        input
      )

      if (!response.success) {
        throw new Error(response.error || 'Erro ao gerar títulos')
      }

      return response.headlines
    },
    onSuccess: () => {
      showToast.success('Títulos gerados com sucesso')
    },
    onError: (error) => {
      handleError(error, 'Erro ao gerar títulos')
    },
  })
}
