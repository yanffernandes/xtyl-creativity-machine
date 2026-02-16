import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { showToast } from '@/shared/components/Toast'
import { useErrorHandler } from '@/shared/hooks'
import { ActivityLogger } from '@/shared/utils/activityLogger'
import { api } from '@/shared/utils/api'
import { queryKeys } from '@/shared/utils/queryKeys'
import { supabase } from '@/shared/utils/supabase'
import type {
  BaseStructureCategory,
  BaseStructureAuthor,
  CreateCategoryInput,
  UpdateCategoryInput,
  CreateAuthorInput,
  UpdateAuthorInput,
} from '../types'
import type {
  GenerateNichesRequest,
  GenerateNichesResponse,
  GenerateCategoriesRequest,
  GenerateCategoriesResponse,
  GenerateTitlesRequest,
  GenerateTitlesResponse,
  SaveStructureRequest,
  SaveStructureResponse,
} from './types'

// ============ CATEGORIES (Layers 1, 2, 3) ============

async function createCategory(input: CreateCategoryInput): Promise<BaseStructureCategory> {
  // Get max order for this layer in project
  const { data: existing } = await supabase
    .from('base_structure_categories')
    .select('order')
    .eq('project_id', input.project_id)
    .eq('layer', input.layer)
    .order('order', { ascending: false })
    .limit(1)

  const nextOrder = (existing?.[0]?.order || 0) + 1

  const { data, error } = await supabase
    .from('base_structure_categories')
    .insert({
      ...input,
      order: nextOrder,
      slug: input.slug || input.name.toLowerCase().replace(/\s+/g, '-'),
    })
    .select()
    .single()

  if (error) throw error
  return data
}

async function updateCategory(id: string, input: UpdateCategoryInput): Promise<BaseStructureCategory> {
  const { data, error } = await supabase
    .from('base_structure_categories')
    .update({
      ...input,
      updated_at: new Date().toISOString(),
    })
    .eq('id', id)
    .select()
    .single()

  if (error) throw error
  return data
}

async function deleteCategory(id: string): Promise<void> {
  const { error } = await supabase
    .from('base_structure_categories')
    .delete()
    .eq('id', id)

  if (error) throw error
}

async function reorderCategories(_projectId: number, _layer: 1 | 2 | 3, orderedIds: string[]): Promise<void> {
  const updates = orderedIds.map((id, index) => ({
    id,
    order: index + 1,
    updated_at: new Date().toISOString(),
  }))

  for (const update of updates) {
    const { error } = await supabase
      .from('base_structure_categories')
      .update({ order: update.order, updated_at: update.updated_at })
      .eq('id', update.id)

    if (error) throw error
  }
}

// ============ AUTHORS (Layer 4) ============

async function createAuthor(input: CreateAuthorInput): Promise<BaseStructureAuthor> {
  // Get max order for authors in project
  const { data: existing } = await supabase
    .from('base_structure_authors')
    .select('order')
    .eq('project_id', input.project_id)
    .order('order', { ascending: false })
    .limit(1)

  const nextOrder = (existing?.[0]?.order || 0) + 1

  const { data, error } = await supabase
    .from('base_structure_authors')
    .insert({
      ...input,
      order: nextOrder,
    })
    .select()
    .single()

  if (error) throw error
  return data
}

async function updateAuthor(id: string, input: UpdateAuthorInput): Promise<BaseStructureAuthor> {
  const { data, error } = await supabase
    .from('base_structure_authors')
    .update({
      ...input,
      updated_at: new Date().toISOString(),
    })
    .eq('id', id)
    .select()
    .single()

  if (error) throw error
  return data
}

async function deleteAuthor(id: string): Promise<void> {
  const { error } = await supabase
    .from('base_structure_authors')
    .delete()
    .eq('id', id)

  if (error) throw error
}

// ============ APPROVAL WORKFLOW ============

async function submitForApproval(projectId: number): Promise<void> {
  const { error } = await supabase
    .from('projects')
    .update({
      approval_status: 'pending',
      submitted_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq('id', projectId)

  if (error) throw error
}

// ============ MUTATION HOOKS ============

export function useCreateCategory() {
  const queryClient = useQueryClient()
  const { handleError } = useErrorHandler()

  return useMutation({
    mutationFn: createCategory,
    onSuccess: (data) => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.baseStructure.categories(data.project_id)
      })
      queryClient.invalidateQueries({
        queryKey: queryKeys.baseStructure.detail(data.project_id)
      })
      showToast.success('Categoria criada com sucesso')
    },
    onError: (error) => {
      handleError(error, 'Erro ao criar categoria')
    },
  })
}

export function useUpdateCategory() {
  const queryClient = useQueryClient()
  const { handleError } = useErrorHandler()

  return useMutation({
    mutationFn: (variables: UpdateCategoryInput & { id: string; projectId: number }) => {
      const { id, projectId, ...input } = variables
      void projectId
      return updateCategory(id, input)
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.baseStructure.categories(variables.projectId)
      })
      queryClient.invalidateQueries({
        queryKey: queryKeys.baseStructure.detail(variables.projectId)
      })
      showToast.success('Categoria atualizada com sucesso')
    },
    onError: (error) => {
      handleError(error, 'Erro ao atualizar categoria')
    },
  })
}

export function useDeleteCategory() {
  const queryClient = useQueryClient()
  const { handleError } = useErrorHandler()

  return useMutation({
    mutationFn: (variables: { id: string; projectId: number }) => deleteCategory(variables.id),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.baseStructure.categories(variables.projectId)
      })
      queryClient.invalidateQueries({
        queryKey: queryKeys.baseStructure.detail(variables.projectId)
      })
      showToast.success('Categoria excluída com sucesso')
    },
    onError: (error) => {
      handleError(error, 'Erro ao excluir categoria')
    },
  })
}

export function useReorderCategories() {
  const queryClient = useQueryClient()
  const { handleError } = useErrorHandler()

  return useMutation({
    mutationFn: ({ projectId, layer, orderedIds }: { projectId: number; layer: 1 | 2 | 3; orderedIds: string[] }) =>
      reorderCategories(projectId, layer, orderedIds),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.baseStructure.categories(variables.projectId)
      })
      showToast.success('Categorias reordenadas com sucesso')
    },
    onError: (error) => {
      handleError(error, 'Erro ao reordenar categorias')
    },
  })
}

export function useCreateAuthor() {
  const queryClient = useQueryClient()
  const { handleError } = useErrorHandler()

  return useMutation({
    mutationFn: createAuthor,
    onSuccess: (data) => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.baseStructure.authors(data.project_id)
      })
      queryClient.invalidateQueries({
        queryKey: queryKeys.baseStructure.detail(data.project_id)
      })
      showToast.success('Autor criado com sucesso')
    },
    onError: (error) => {
      handleError(error, 'Erro ao criar autor')
    },
  })
}

export function useUpdateAuthor() {
  const queryClient = useQueryClient()
  const { handleError } = useErrorHandler()

  return useMutation({
    mutationFn: (variables: UpdateAuthorInput & { id: string; projectId: number }) => {
      const { id, projectId, ...input } = variables
      void projectId
      return updateAuthor(id, input)
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.baseStructure.authors(variables.projectId)
      })
      queryClient.invalidateQueries({
        queryKey: queryKeys.baseStructure.detail(variables.projectId)
      })
      showToast.success('Autor atualizado com sucesso')
    },
    onError: (error) => {
      handleError(error, 'Erro ao atualizar autor')
    },
  })
}

export function useDeleteAuthor() {
  const queryClient = useQueryClient()
  const { handleError } = useErrorHandler()

  return useMutation({
    mutationFn: (variables: { id: string; projectId: number }) => deleteAuthor(variables.id),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.baseStructure.authors(variables.projectId)
      })
      queryClient.invalidateQueries({
        queryKey: queryKeys.baseStructure.detail(variables.projectId)
      })
      showToast.success('Autor excluído com sucesso')
    },
    onError: (error) => {
      handleError(error, 'Erro ao excluir autor')
    },
  })
}

export function useSubmitForApproval() {
  const queryClient = useQueryClient()
  const { handleError } = useErrorHandler()

  return useMutation({
    mutationFn: submitForApproval,
    onSuccess: (_, projectId) => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.baseStructure.detail(projectId)
      })
      queryClient.invalidateQueries({
        queryKey: queryKeys.projects.detail(projectId)
      })
      showToast.success('Estrutura enviada para aprovação com sucesso')
    },
    onError: (error) => {
      handleError(error, 'Erro ao enviar estrutura para aprovação')
    },
  })
}

// ============ WORDPRESS INTEGRATION (Backend API) ============

export function useWordPressCategories(projectId: number | null) {
  return useQuery({
    queryKey: ['wordpress-categories', projectId],
    queryFn: async (): Promise<Array<{ name: string; slug: string }>> => {
      if (!projectId) return []
      const response = await api.get<{ categories: Array<{ name: string; slug: string }> }>(
        `/base-structure/wordpress-categories?projectId=${projectId}`
      )
      return response.categories
    },
    enabled: !!projectId,
    staleTime: 5 * 60 * 1000, // 5 minutes
  })
}

// ============ AI GENERATION (Backend API) ============

export function useGenerateNiches() {
  const { handleError } = useErrorHandler()

  return useMutation({
    mutationFn: async (request: GenerateNichesRequest): Promise<GenerateNichesResponse> => {
      return api.post<GenerateNichesResponse>('/base-structure/generate-niches', request)
    },
    onError: (error) => {
      handleError(error, 'Erro ao gerar nichos')
    },
  })
}

export function useGenerateCategories() {
  const { handleError } = useErrorHandler()

  return useMutation({
    mutationFn: async (request: GenerateCategoriesRequest): Promise<GenerateCategoriesResponse> => {
      return api.post<GenerateCategoriesResponse>('/base-structure/generate-categories', request)
    },
    onError: (error) => {
      handleError(error, 'Erro ao gerar categorias')
    },
  })
}

export function useGenerateTitles() {
  const { handleError } = useErrorHandler()

  return useMutation({
    mutationFn: async (request: GenerateTitlesRequest): Promise<GenerateTitlesResponse> => {
      return api.post<GenerateTitlesResponse>('/base-structure/generate-titles', request)
    },
    onError: (error) => {
      handleError(error, 'Erro ao gerar títulos')
    },
  })
}

export function useSaveStructure() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (request: SaveStructureRequest): Promise<SaveStructureResponse> => {
      return api.post<SaveStructureResponse>('/base-structure/save', request)
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.baseStructure.detail(variables.projectId)
      })
      queryClient.invalidateQueries({
        queryKey: queryKeys.projects.detail(variables.projectId)
      })
      // Log activity for base structure generation
      const categoriesCount = variables.categories?.length || 0
      ActivityLogger.baseStructureGenerated(
        variables.projectId,
        variables.niche || 'Projeto',
        categoriesCount
      )
    },
  })
}
