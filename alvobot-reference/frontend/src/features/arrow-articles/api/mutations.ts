import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useAuthStore } from '@/features/auth/stores/authStore'
import type { KeywordSnapshot } from '@/shared/types'
import { ActivityLogger, logActivity } from '@/shared/utils/activityLogger'
import { queryKeys } from '@/shared/utils/queryKeys'
import { supabase } from '@/shared/utils/supabase'
import type { ArrowArticle, ArticleStatus } from './useArrowArticles'

// Re-export for backward compatibility
export type { KeywordSnapshot } from '@/shared/types'

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

export interface UpdateArrowArticleInput {
  title?: string
  content?: string
  excerpt?: string
  status?: ArticleStatus
  keyword_used?: string
  slug?: string
}

/**
 * Creates an arrow article entry in the database.
 * Content generation is NOT done here - the automation will generate content later.
 * This makes article creation instant (~200ms) instead of waiting 3-15s for AI.
 */
async function createArrowArticle(
  userId: string,
  input: CreateArrowArticleInput
): Promise<ArrowArticle> {
  const { data, error } = await supabase
    .from('articles')
    .insert({
      user_id: userId,
      project_id: input.project_id,
      keyword_used: input.keyword_used,
      date: input.date,
      // Title is optional - if not provided, automation will generate from keyword
      title: input.title || null,
      content: input.content || null,
      excerpt: input.excerpt || null,
      is_approval_article: false,
      status: null, // Status null so automation can pick up the article
      url_added: false,
      language: input.language,
      keyword_snapshot: input.keyword_snapshot,
    })
    .select()
    .single()

  if (error) throw error
  return data
}

async function updateArrowArticle(
  articleId: number,
  input: UpdateArrowArticleInput
): Promise<ArrowArticle> {
  const { data, error } = await supabase
    .from('articles')
    .update({
      ...input,
      updated_at: new Date().toISOString(),
    })
    .eq('id', articleId)
    .select()
    .single()

  if (error) throw error
  return data
}

async function deleteArrowArticle(articleId: number): Promise<void> {
  // Soft delete
  const { error } = await supabase
    .from('articles')
    .update({
      deleted_at: new Date().toISOString(),
      status: 'archived',
    })
    .eq('id', articleId)

  if (error) throw error
}

async function publishToWordPress(articleId: number): Promise<ArrowArticle> {
  // This would typically call an Edge Function to publish to WordPress
  // For now, we just update the status
  const { data, error } = await supabase
    .from('articles')
    .update({
      status: 'published',
      updated_at: new Date().toISOString(),
    })
    .eq('id', articleId)
    .select()
    .single()

  if (error) throw error
  return data
}

async function queueDraftArticles(articleIds: number[]): Promise<number> {
  // Remove draft status from articles so they enter the automation queue
  const { error, count } = await supabase
    .from('articles')
    .update({
      status: null,
      updated_at: new Date().toISOString(),
    })
    .in('id', articleIds)
    .eq('status', 'draft') // Only update articles that are drafts

  if (error) throw error
  return count || 0
}

// Mutation hooks

export function useCreateArrowArticle() {
  const queryClient = useQueryClient()
  const { user } = useAuthStore()

  return useMutation({
    mutationFn: (input: CreateArrowArticleInput) => createArrowArticle(user!.id, input),
    onSuccess: (article) => {
      queryClient.invalidateQueries({ queryKey: [...queryKeys.articles.all, 'arrow'] })
      // Log activity without credit consumption (credit_transactions requires service_role)
      logActivity({
        actionType: 'create',
        resourceType: 'article',
        resourceId: article.id,
        title: `Artigo Flecha criado: ${article.title || 'Sem título'}`,
        metadata: { article_title: article.title, keyword: article.keyword_used },
      })
    },
  })
}

export function useUpdateArrowArticle() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ id, ...input }: UpdateArrowArticleInput & { id: number }) =>
      updateArrowArticle(id, input),
    onSuccess: (article, variables) => {
      queryClient.invalidateQueries({ queryKey: [...queryKeys.articles.all, 'arrow'] })
      queryClient.invalidateQueries({
        queryKey: [...queryKeys.articles.detail(variables.id), 'arrow'],
      })
      // Log activity
      ActivityLogger.articleUpdated(article.id, article.title || 'Artigo sem título')
    },
  })
}

export function useDeleteArrowArticle() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (params: { id: number; title?: string }) => deleteArrowArticle(params.id),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: [...queryKeys.articles.all, 'arrow'] })
      // Log activity
      ActivityLogger.articleDeleted(variables.id, variables.title || 'Artigo excluído')
    },
  })
}

export function usePublishArrowToWordPress() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: publishToWordPress,
    onSuccess: (article, articleId) => {
      queryClient.invalidateQueries({ queryKey: [...queryKeys.articles.all, 'arrow'] })
      queryClient.invalidateQueries({
        queryKey: [...queryKeys.articles.detail(articleId), 'arrow'],
      })
      // Log activity
      ActivityLogger.articlePublished(article.id, article.title || 'Artigo publicado')
    },
  })
}

export function useQueueDraftArticles() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (articleIds: number[]) => queueDraftArticles(articleIds),
    onSuccess: (count) => {
      queryClient.invalidateQueries({ queryKey: [...queryKeys.articles.all, 'arrow'] })
      // Log activity
      if (count > 0) {
        logActivity({
          actionType: 'update',
          resourceType: 'article',
          title: `${count} artigo(s) enviado(s) para a fila`,
          metadata: { count },
        })
      }
    },
  })
}
