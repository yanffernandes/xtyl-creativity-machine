import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useAuthStore } from '@/features/auth/stores/authStore'
import { useWorkspaceId } from '@/features/workspace/stores/workspaceStore'
import { showToast } from '@/shared/components/Toast'
import { useErrorHandler } from '@/shared/hooks'
import { createKeywordSnapshot, type KeywordData, type KeywordSnapshot } from '@/shared/types'
import { ActivityLogger, logActivity } from '@/shared/utils/activityLogger'
import { api } from '@/shared/utils/api'
import { queryKeys } from '@/shared/utils/queryKeys'
import { searchConsoleApi } from '@/shared/utils/searchConsoleApi'
import { supabase, getCurrentUserId } from '@/shared/utils/supabase'
import type { Article, ArticleType, ArticleStatus } from './useArticles'

// =============================================================================
// Types
// =============================================================================

export interface CreateArrowArticleInput {
  title?: string
  project_id: number
  content?: string
  excerpt?: string
  keyword_used?: string
  date?: string
  language?: string
  country?: string
  keyword_snapshot?: KeywordSnapshot
}

export interface CreateBaseArticleInput {
  title: string
  project_id: number
  content?: string
  excerpt?: string
  keyword_used?: string
  date?: string
  keyword_snapshot?: KeywordSnapshot
}

export interface UpdateArticleInput {
  id: number
  title?: string
  content?: string
  excerpt?: string
  status?: ArticleStatus
  keyword_used?: string
  slug?: string
}

interface GenerateBaseArticleResponse {
  content: string
  excerpt: string
  processingTime: number
}

// =============================================================================
// Helper Functions
// =============================================================================

async function generateBaseArticleContent(
  title: string,
  excerpt?: string
): Promise<GenerateBaseArticleResponse> {
  return api.post<GenerateBaseArticleResponse>('/base-structure/generate-base-article', {
    title,
    excerpt,
  })
}

// =============================================================================
// Arrow Article Functions
// =============================================================================

async function createArrowArticle(
  userId: string,
  input: CreateArrowArticleInput
): Promise<Article> {
  const { data, error } = await supabase
    .from('articles')
    .insert({
      user_id: userId,
      project_id: input.project_id,
      keyword_used: input.keyword_used,
      date: input.date,
      title: input.title || null,
      content: input.content || null,
      excerpt: input.excerpt || null,
      is_approval_article: false,
      status: null, // null = queue, automation picks up
      url_added: false,
      language: input.language,
      keyword_snapshot: input.keyword_snapshot,
    })
    .select()
    .single()

  if (error) throw error
  return data
}

// =============================================================================
// Base Article Functions
// =============================================================================

async function createBaseArticle(
  userId: string,
  input: CreateBaseArticleInput
): Promise<Article> {
  // Generate content via AI if no content provided
  let generatedContent: GenerateBaseArticleResponse | null = null
  if (!input.content && input.title) {
    generatedContent = await generateBaseArticleContent(input.title, input.excerpt)
  }

  const { data, error } = await supabase
    .from('articles')
    .insert({
      user_id: userId,
      project_id: input.project_id,
      title: input.title,
      date: input.date,
      keyword_used: input.keyword_used,
      content: generatedContent?.content || input.content,
      excerpt: generatedContent?.excerpt || input.excerpt,
      is_approval_article: true,
      status: null, // null = queue, automation picks up
      url_added: false,
      keyword_snapshot: input.keyword_snapshot,
    })
    .select()
    .single()

  if (error) throw error
  return data
}

// =============================================================================
// Shared Functions
// =============================================================================

async function updateArticle(input: UpdateArticleInput): Promise<Article> {
  const { id, ...updateData } = input
  const userId = await getCurrentUserId()
  if (!userId) throw new Error('User not authenticated')

  const { data, error } = await supabase
    .from('articles')
    .update({
      ...updateData,
      updated_at: new Date().toISOString(),
    })
    .eq('id', id)
    .eq('user_id', userId)
    .select()
    .single()

  if (error) throw error
  return data
}

async function deleteArticle(articleId: number): Promise<void> {
  const userId = await getCurrentUserId()
  if (!userId) throw new Error('User not authenticated')

  // Soft delete - archive
  const { error } = await supabase
    .from('articles')
    .update({
      deleted_at: new Date().toISOString(),
      status: 'archived',
    })
    .eq('id', articleId)
    .eq('user_id', userId)

  if (error) throw error
}

async function archiveArticle(articleId: number): Promise<void> {
  const userId = await getCurrentUserId()
  if (!userId) throw new Error('User not authenticated')

  const { error } = await supabase
    .from('articles')
    .update({
      status: 'archived',
      updated_at: new Date().toISOString(),
    })
    .eq('id', articleId)
    .eq('user_id', userId)

  if (error) throw error
}

async function sendToQueue(articleId: number): Promise<void> {
  const userId = await getCurrentUserId()
  if (!userId) throw new Error('User not authenticated')

  const { error } = await supabase
    .from('articles')
    .update({
      status: null,
      updated_at: new Date().toISOString(),
    })
    .eq('id', articleId)
    .eq('user_id', userId)

  if (error) throw error
}

async function queueDraftArticles(articleIds: number[]): Promise<number> {
  const userId = await getCurrentUserId()
  if (!userId) throw new Error('User not authenticated')

  const { error, count } = await supabase
    .from('articles')
    .update({
      status: null,
      updated_at: new Date().toISOString(),
    })
    .in('id', articleIds)
    .eq('status', 'draft')
    .eq('user_id', userId)

  if (error) throw error
  return count || 0
}

// =============================================================================
// Mutation Hooks - Arrow Articles
// =============================================================================

export function useCreateArrowArticle() {
  const queryClient = useQueryClient()
  const { user } = useAuthStore()
  const { handleError } = useErrorHandler()

  return useMutation({
    mutationFn: (input: CreateArrowArticleInput) => createArrowArticle(user!.id, input),
    onSuccess: (article) => {
      queryClient.invalidateQueries({ queryKey: [...queryKeys.articles.all, 'arrow'] })
      showToast.success('Artigo Flecha criado com sucesso!')
      logActivity({
        actionType: 'create',
        resourceType: 'article',
        resourceId: article.id,
        title: `Artigo Flecha criado: ${article.title || 'Sem título'}`,
        metadata: { article_title: article.title, keyword: article.keyword_used },
      })
    },
    onError: (error) => {
      handleError(error, 'Erro ao criar Artigo Flecha')
    },
  })
}

// =============================================================================
// Mutation Hooks - Base Articles
// =============================================================================

export function useCreateBaseArticle() {
  const queryClient = useQueryClient()
  const { user } = useAuthStore()
  const { handleError } = useErrorHandler()

  return useMutation({
    mutationFn: (input: CreateBaseArticleInput) => createBaseArticle(user!.id, input),
    onSuccess: (article) => {
      queryClient.invalidateQueries({ queryKey: [...queryKeys.articles.all, 'base'] })
      // Invalidate user plan credits since article count changed
      if (user?.id) {
        queryClient.invalidateQueries({ queryKey: queryKeys.userPlan.current(user.id) })
      }
      showToast.success('Artigo de Base criado com sucesso')
      logActivity({
        actionType: 'create',
        resourceType: 'article',
        resourceId: article.id,
        title: `Artigo de Base criado: ${article.title || 'Sem título'}`,
        metadata: { article_title: article.title },
      })
    },
    onError: (error) => {
      handleError(error, 'Erro ao criar Artigo de Base')
    },
  })
}

// =============================================================================
// Mutation Hooks - Shared
// =============================================================================

export function useUpdateArticle(type: ArticleType) {
  const queryClient = useQueryClient()
  const { handleError } = useErrorHandler()

  return useMutation({
    mutationFn: updateArticle,
    onSuccess: (article) => {
      queryClient.invalidateQueries({ queryKey: [...queryKeys.articles.all, type] })
      queryClient.invalidateQueries({ queryKey: queryKeys.articles.detail(article.id) })
      showToast.success('Artigo atualizado com sucesso')
      ActivityLogger.articleUpdated(article.id, article.title || 'Artigo sem título')
    },
    onError: (error) => {
      handleError(error, 'Erro ao atualizar artigo')
    },
  })
}

export function useDeleteArticle(type: ArticleType) {
  const queryClient = useQueryClient()
  const { handleError } = useErrorHandler()

  return useMutation({
    mutationFn: (params: { id: number; title?: string }) => deleteArticle(params.id),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: [...queryKeys.articles.all, type] })
      showToast.success('Artigo excluído com sucesso')
      ActivityLogger.articleDeleted(variables.id, variables.title || 'Artigo excluído')
    },
    onError: (error) => {
      handleError(error, 'Erro ao excluir artigo')
    },
  })
}

export function useArchiveArticle(type: ArticleType) {
  const queryClient = useQueryClient()
  const { handleError } = useErrorHandler()

  return useMutation({
    mutationFn: archiveArticle,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [...queryKeys.articles.all, type] })
      showToast.success('Artigo arquivado com sucesso')
    },
    onError: (error) => {
      handleError(error, 'Erro ao arquivar artigo')
    },
  })
}

export function useSendToQueue(type: ArticleType) {
  const queryClient = useQueryClient()
  const { handleError } = useErrorHandler()

  return useMutation({
    mutationFn: sendToQueue,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [...queryKeys.articles.all, type] })
      showToast.success('Artigo enviado para fila com sucesso')
    },
    onError: (error) => {
      handleError(error, 'Erro ao enviar artigo para fila')
    },
  })
}

export function useQueueDraftArticles(type: ArticleType) {
  const queryClient = useQueryClient()
  const { handleError } = useErrorHandler()

  return useMutation({
    mutationFn: queueDraftArticles,
    onSuccess: (count) => {
      queryClient.invalidateQueries({ queryKey: [...queryKeys.articles.all, type] })
      if (count > 0) {
        showToast.success(`${count} artigo(s) enviado(s) para a fila com sucesso`)
        logActivity({
          actionType: 'update',
          resourceType: 'article',
          title: `${count} artigo(s) enviado(s) para a fila`,
          metadata: { count },
        })
      }
    },
    onError: (error) => {
      handleError(error, 'Erro ao enviar artigos para fila')
    },
  })
}

// =============================================================================
// Search Console Indexing
// =============================================================================

export function useRequestIndexing() {
  const workspaceId = useWorkspaceId()
  const { handleError } = useErrorHandler()

  return useMutation({
    mutationFn: async (input: { url: string; articleId: number; connectionId: string }) => {
      if (!workspaceId) throw new Error('Workspace not selected')
      return searchConsoleApi.requestIndex(input, workspaceId)
    },
    onSuccess: () => {
      showToast.success('Indexação solicitada com sucesso')
    },
    onError: (error) => {
      handleError(error, 'Erro ao solicitar indexação')
    },
  })
}

export function useRequestIndexingBatch() {
  const workspaceId = useWorkspaceId()
  const { handleError } = useErrorHandler()

  return useMutation({
    mutationFn: async (input: { connectionId: string; items: Array<{ url: string; articleId: number }> }) => {
      if (!workspaceId) throw new Error('Workspace not selected')
      return searchConsoleApi.requestIndexBatch(input, workspaceId)
    },
    onSuccess: () => {
      showToast.success('Indexação em lote solicitada com sucesso')
    },
    onError: (error) => {
      handleError(error, 'Erro ao solicitar indexação em lote')
    },
  })
}

// =============================================================================
// Bulk Operations
// =============================================================================

export interface BulkCreateDraftsInput {
  /** @deprecated Use keywordsWithData instead to include keyword_snapshot */
  keywords?: string[]
  keywordsWithData?: KeywordData[]
  project_id: number
  article_type: ArticleType
  language?: string
}

async function bulkCreateDrafts(input: BulkCreateDraftsInput & { user_id: string }): Promise<Article[]> {
  const isApprovalArticle = input.article_type === 'base'

  const articles = input.keywordsWithData
    ? input.keywordsWithData.map((kw) => ({
        title: null,
        content: '',
        excerpt: '',
        status: 'draft' as const,
        project_id: input.project_id,
        keyword_used: kw.keyword,
        language: kw.language || input.language,
        user_id: input.user_id,
        is_approval_article: isApprovalArticle,
        url_added: false,
        keyword_snapshot: createKeywordSnapshot(kw),
      }))
    : (input.keywords || []).map((keyword) => ({
        title: null,
        content: '',
        excerpt: '',
        status: 'draft' as const,
        project_id: input.project_id,
        keyword_used: keyword,
        language: input.language,
        user_id: input.user_id,
        is_approval_article: isApprovalArticle,
        url_added: false,
      }))

  const { data, error } = await supabase
    .from('articles')
    .insert(articles)
    .select()

  if (error) throw error
  return data
}

export function useBulkCreateDrafts() {
  const queryClient = useQueryClient()
  const { user } = useAuthStore()
  const { handleError } = useErrorHandler()

  return useMutation({
    mutationFn: (input: BulkCreateDraftsInput) =>
      bulkCreateDrafts({ ...input, user_id: user!.id }),
    onSuccess: (articles, variables) => {
      queryClient.invalidateQueries({ queryKey: [...queryKeys.articles.all, variables.article_type] })
      showToast.success(`${articles.length} artigo(s) criado(s) com sucesso`)
    },
    onError: (error) => {
      handleError(error, 'Erro ao criar artigos')
    },
  })
}

// =============================================================================
// WordPress URL Sync
// =============================================================================

interface SyncArticleUrlResponse {
  success: boolean
  url?: string
  slug?: string
  message?: string
}

interface SyncArticleUrlsBatchResponse {
  success: boolean
  results: Array<{
    articleId: number
    success: boolean
    url?: string
    message?: string
  }>
  synced: number
  failed: number
}

/**
 * Sync a single article's URL from WordPress
 * This fetches the current URL from WordPress and saves it to the article
 */
export function useSyncArticleUrl() {
  const queryClient = useQueryClient()
  const { handleError } = useErrorHandler()

  return useMutation({
    mutationFn: async (articleId: number): Promise<SyncArticleUrlResponse> => {
      return api.post<SyncArticleUrlResponse>('/wordpress/sync-article-url', { articleId })
    },
    onSuccess: (data) => {
      if (data.success) {
        // Invalidate articles queries to refresh the list
        queryClient.invalidateQueries({ queryKey: queryKeys.articles.all })
      }
    },
    onError: (error) => {
      handleError(error, 'Erro ao sincronizar URL do artigo')
    },
  })
}

/**
 * Sync multiple articles' URLs from WordPress
 */
export function useSyncArticleUrlsBatch() {
  const queryClient = useQueryClient()
  const { handleError } = useErrorHandler()

  return useMutation({
    mutationFn: async (articleIds: number[]): Promise<SyncArticleUrlsBatchResponse> => {
      return api.post<SyncArticleUrlsBatchResponse>('/wordpress/sync-article-urls-batch', { articleIds })
    },
    onSuccess: (data) => {
      if (data.synced > 0) {
        queryClient.invalidateQueries({ queryKey: queryKeys.articles.all })
        showToast.success(`${data.synced} URL(s) sincronizada(s) com sucesso`)
      }
      if (data.failed > 0) {
        showToast.warning(`${data.failed} artigo(s) não puderam ser sincronizados`)
      }
    },
    onError: (error) => {
      handleError(error, 'Erro ao sincronizar URLs dos artigos')
    },
  })
}
