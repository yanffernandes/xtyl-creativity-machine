import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useWorkspaceStore } from '@/features/workspace/stores/workspaceStore'
import { showToast } from '@/shared/components/Toast'
import { useErrorHandler } from '@/shared/hooks'
import { ActivityLogger } from '@/shared/utils/activityLogger'
import { api } from '@/shared/utils/api'
import { queryKeys } from '@/shared/utils/queryKeys'
import { supabase, getCurrentUserId } from '@/shared/utils/supabase'
import type { Keyword, CreateKeywordInput } from '../types'

// Types for keyword mining
export interface MineKeywordsInput {
  keyword?: string
  country: string
  language: string
}

export interface MiningResult {
  keyword: string
  search_volume: number
  cpc_min: number
  cpc_max: number
  discrepancy: number
  quality: 'high' | 'medium' | 'low'
  trend: number
}

export interface MineKeywordsResponse {
  keywords: MiningResult[]
  total: number
  seed_keyword: string
}

// Database structure:
// keywords: id, word (UNIQUE), search_volume, cpc_min, cpc_max, visibility, competition, language, country
// users_keywords: keyword_id, user_id, created_at (junction table)

interface CreateKeywordResult {
  keyword: Keyword
  isNew: boolean
}

async function createKeyword(input: CreateKeywordInput): Promise<CreateKeywordResult> {
  const userId = await getCurrentUserId()
  if (!userId) throw new Error('User not authenticated')

  // First, try to find if keyword already exists
  const { data: existingKeyword } = await supabase
    .from('keywords')
    .select('*')
    .eq('word', input.word)
    .single()

  let keywordId: number

  if (existingKeyword) {
    keywordId = existingKeyword.id
  } else {
    // Create new keyword
    const { data: newKeyword, error: insertError } = await supabase
      .from('keywords')
      .insert({
        word: input.word,
        search_volume: input.search_volume,
        cpc_min: input.cpc_min,
        cpc_max: input.cpc_max,
        competition: input.competition,
        language: input.language ?? 'pt-BR',
        country: input.country ?? 'BR',
        visibility: input.visibility ?? 'private',
      })
      .select()
      .single()

    if (insertError) throw insertError
    keywordId = newKeyword.id
  }

  // Link keyword to user via legacy junction table
  const { error: linkError } = await supabase.from('users_keywords').upsert(
    {
      keyword_id: keywordId,
      user_id: userId,
    },
    { onConflict: 'keyword_id,user_id' }
  )

  if (linkError) throw linkError

  // Also link to workspace for workspace-scoped visibility
  const workspaceId = useWorkspaceStore.getState().currentWorkspace?.id
  if (workspaceId) {
    const { error: wsLinkError } = await supabase.from('workspace_keywords').upsert(
      {
        keyword_id: keywordId,
        workspace_id: workspaceId,
      },
      { onConflict: 'keyword_id,workspace_id' }
    )
    if (wsLinkError) {
      console.warn('Failed to link keyword to workspace:', wsLinkError)
    }
  }

  // Return the keyword in the expected format
  const keyword: Keyword = {
    id: keywordId,
    keyword: input.word,
    search_volume: input.search_volume ?? 0,
    cpc: input.cpc_min ?? 0,
    cpc_max: input.cpc_max ?? 0,
    competition: input.competition,
    language: input.language ?? 'pt-BR',
    country: input.country ?? 'BR',
    visibility: input.visibility ?? 'private',
    created_at: new Date().toISOString(),
  }

  return { keyword, isNew: !existingKeyword }
}

async function deleteKeyword(keywordId: number): Promise<void> {
  const userId = await getCurrentUserId()
  if (!userId) throw new Error('User not authenticated')

  // Remove the link from users_keywords (don't delete the keyword itself)
  const { error } = await supabase
    .from('users_keywords')
    .delete()
    .eq('keyword_id', keywordId)
    .eq('user_id', userId)

  if (error) throw error

  // Also remove from workspace_keywords
  const workspaceId = useWorkspaceStore.getState().currentWorkspace?.id
  if (workspaceId) {
    await supabase
      .from('workspace_keywords')
      .delete()
      .eq('keyword_id', keywordId)
      .eq('workspace_id', workspaceId)
  }
}

async function bulkCreateKeywords(words: string[]): Promise<Keyword[]> {
  const userId = await getCurrentUserId()
  if (!userId) throw new Error('User not authenticated')

  const results: Keyword[] = []

  for (const word of words) {
    const trimmedWord = word.trim()
    if (!trimmedWord) continue

    try {
      const { keyword } = await createKeyword({ word: trimmedWord })
      results.push(keyword)
    } catch (error) {
      console.error(`Error creating keyword "${trimmedWord}":`, error)
      // Continue with other keywords
    }
  }

  return results
}

async function bulkCreateKeywordsWithData(
  keywords: CreateKeywordInput[]
): Promise<Keyword[]> {
  const userId = await getCurrentUserId()
  if (!userId) throw new Error('User not authenticated')

  const results: Keyword[] = []

  for (const input of keywords) {
    try {
      const { keyword } = await createKeyword(input)
      results.push(keyword)
    } catch (error) {
      console.error(`Error creating keyword "${input.word}":`, error)
      // Continue with other keywords
    }
  }

  return results
}

export function useCreateKeyword() {
  const queryClient = useQueryClient()
  const { handleError } = useErrorHandler()

  return useMutation({
    mutationFn: async (input: { keyword: string }) => {
      const result = await createKeyword({ word: input.keyword })
      return result.keyword
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.keywords.all })
      showToast.success('Palavra-chave adicionada com sucesso!')
    },
    onError: (error) => {
      handleError(error, 'Erro ao adicionar palavra-chave')
    },
  })
}

export function useDeleteKeyword() {
  const queryClient = useQueryClient()
  const { handleError } = useErrorHandler()

  return useMutation({
    mutationFn: (params: { id: number; keyword?: string }) => deleteKeyword(params.id),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.keywords.all })
      showToast.success('Palavra-chave removida com sucesso!')
      // Log activity
      ActivityLogger.keywordDeleted(variables.keyword || 'Palavra-chave')
    },
    onError: (error) => {
      handleError(error, 'Erro ao remover palavra-chave')
    },
  })
}

export function useBulkCreateKeywords() {
  const queryClient = useQueryClient()
  const { handleError } = useErrorHandler()

  return useMutation({
    mutationFn: bulkCreateKeywords,
    onSuccess: (keywords) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.keywords.all })
      showToast.success(`${keywords.length} palavras-chave adicionadas com sucesso!`)
    },
    onError: (error) => {
      handleError(error, 'Erro ao adicionar palavras-chave')
    },
  })
}

export function useBulkCreateKeywordsWithData() {
  const queryClient = useQueryClient()
  const { handleError } = useErrorHandler()

  return useMutation({
    mutationFn: bulkCreateKeywordsWithData,
    onSuccess: (keywords) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.keywords.all })
      showToast.success(`${keywords.length} palavras-chave salvas com sucesso!`)
      // Log activity
      if (keywords.length > 0) {
        ActivityLogger.keywordsSaved(keywords.length)
      }
    },
    onError: (error) => {
      handleError(error, 'Erro ao salvar palavras-chave')
    },
  })
}

/**
 * Hook to mine keywords via the n8n workflow integration
 * Calls the backend /keywords/mine endpoint which proxies to the n8n webhook
 */
export function useMineKeywords() {
  const { handleError } = useErrorHandler()

  return useMutation({
    mutationFn: async (input: MineKeywordsInput): Promise<MineKeywordsResponse> => {
      return api.post<MineKeywordsResponse>('/keywords/mine', input)
    },
    onSuccess: (response, variables) => {
      showToast.success(`${response.keywords.length} palavras-chave mineradas com sucesso!`)
      // Log activity
      ActivityLogger.keywordsMined(response.keywords.length, variables.keyword)
    },
    onError: (error) => {
      handleError(error, 'Erro ao minerar palavras-chave')
    },
  })
}
