import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useAuthStore } from '@/features/auth/stores/authStore'
import type { KeywordSnapshot } from '@/shared/types'
import { api } from '@/shared/utils/api'
import { queryKeys } from '@/shared/utils/queryKeys'
import { supabase } from '@/shared/utils/supabase'
import type { BaseArticle, ArticleStatus } from './useBaseArticles'

// Re-export for backward compatibility
export type { KeywordSnapshot } from '@/shared/types'

interface GenerateBaseArticleResponse {
  content: string
  excerpt: string
  processingTime: number
}

export interface CreateBaseArticleInput {
  title: string
  project_id: number
  content?: string
  excerpt?: string
  keyword_used?: string
  date?: string // Scheduled publication date
  keyword_snapshot?: KeywordSnapshot
}

export interface UpdateBaseArticleInput {
  title?: string
  content?: string
  excerpt?: string
  status?: ArticleStatus
  keyword_used?: string
  slug?: string
}

async function generateBaseArticleContent(
  title: string,
  excerpt?: string
): Promise<GenerateBaseArticleResponse> {
  return api.post<GenerateBaseArticleResponse>('/base-structure/generate-base-article', {
    title,
    excerpt,
  })
}

async function createBaseArticle(
  userId: string,
  input: CreateBaseArticleInput
): Promise<BaseArticle> {
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
      // Use generated content if available, otherwise use input
      content: generatedContent?.content || input.content,
      excerpt: generatedContent?.excerpt || input.excerpt,
      is_approval_article: true,
      status: null, // null = "Na Fila" - ready for automation to pick up
      url_added: false,
      keyword_snapshot: input.keyword_snapshot,
    })
    .select()
    .single()

  if (error) throw error
  return data
}

async function updateBaseArticle(
  articleId: number,
  input: UpdateBaseArticleInput
): Promise<BaseArticle> {
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

async function deleteBaseArticle(articleId: number): Promise<void> {
  // Hard delete - remove from database
  const { error } = await supabase
    .from('articles')
    .delete()
    .eq('id', articleId)

  if (error) throw error
}

async function archiveBaseArticle(articleId: number): Promise<void> {
  // Soft archive - just change status
  const { error } = await supabase
    .from('articles')
    .update({
      status: 'archived',
      updated_at: new Date().toISOString(),
    })
    .eq('id', articleId)

  if (error) throw error
}

async function sendToQueueBaseArticle(articleId: number): Promise<void> {
  // Set status to null to put in queue
  const { error } = await supabase
    .from('articles')
    .update({
      status: null,
      updated_at: new Date().toISOString(),
    })
    .eq('id', articleId)

  if (error) throw error
}

async function duplicateBaseArticle(
  userId: string,
  originalArticle: BaseArticle
): Promise<BaseArticle> {
  const { data, error } = await supabase
    .from('articles')
    .insert({
      user_id: userId,
      project_id: originalArticle.project_id,
      title: `${originalArticle.title} (cópia)`,
      content: originalArticle.content,
      excerpt: originalArticle.excerpt,
      keyword_used: originalArticle.keyword_used,
      is_approval_article: true,
      status: 'draft',
      url_added: false,
    })
    .select()
    .single()

  if (error) throw error
  return data
}

async function publishToWordPress(articleId: number): Promise<BaseArticle> {
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

// Mutation hooks

export function useCreateBaseArticle() {
  const queryClient = useQueryClient()
  const { user } = useAuthStore()

  return useMutation({
    mutationFn: (input: CreateBaseArticleInput) => createBaseArticle(user!.id, input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [...queryKeys.articles.all, 'base'] })
      // Invalidate user plan credits since article count changed
      if (user?.id) {
        queryClient.invalidateQueries({ queryKey: queryKeys.userPlan.current(user.id) })
      }
    },
  })
}

export function useUpdateBaseArticle() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ id, ...input }: UpdateBaseArticleInput & { id: number }) =>
      updateBaseArticle(id, input),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: [...queryKeys.articles.all, 'base'] })
      queryClient.invalidateQueries({
        queryKey: [...queryKeys.articles.detail(variables.id), 'base'],
      })
    },
  })
}

export function useDeleteBaseArticle() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: deleteBaseArticle,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [...queryKeys.articles.all, 'base'] })
    },
  })
}

export function useArchiveBaseArticle() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: archiveBaseArticle,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [...queryKeys.articles.all, 'base'] })
    },
  })
}

export function useSendToQueueBaseArticle() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: sendToQueueBaseArticle,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [...queryKeys.articles.all, 'base'] })
    },
  })
}

export function useDuplicateBaseArticle() {
  const queryClient = useQueryClient()
  const { user } = useAuthStore()

  return useMutation({
    mutationFn: (originalArticle: BaseArticle) => duplicateBaseArticle(user!.id, originalArticle),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [...queryKeys.articles.all, 'base'] })
    },
  })
}

export function usePublishToWordPress() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: publishToWordPress,
    onSuccess: (_, articleId) => {
      queryClient.invalidateQueries({ queryKey: [...queryKeys.articles.all, 'base'] })
      queryClient.invalidateQueries({
        queryKey: [...queryKeys.articles.detail(articleId), 'base'],
      })
    },
  })
}
