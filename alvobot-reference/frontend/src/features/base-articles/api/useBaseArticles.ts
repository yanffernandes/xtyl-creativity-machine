import { useQuery } from '@tanstack/react-query'
import { useWorkspaceId } from '@/features/workspace/stores/workspaceStore'
import { queryKeys } from '@/shared/utils/queryKeys'
import { supabase } from '@/shared/utils/supabase'

// Status values from database: null (queue), 'draft', 'writing', 'publish', 'published', 'scheduled', 'archived'
export type ArticleStatus = 'draft' | 'writing' | 'publish' | 'published' | 'scheduled' | 'archived'

export interface BaseArticle {
  id: number
  user_id: string
  project_id?: number
  title?: string
  content?: string
  excerpt?: string
  status?: ArticleStatus | null
  words?: number
  is_approval_article: boolean
  keyword_used?: string
  slug?: string
  wpPost_id?: number
  url_added: boolean
  created_at: string
  updated_at?: string
  // Joined relations
  project?: {
    id: number
    name: string
    domain?: string
    status: boolean // true = online, false = offline
    workspace_id?: string
  }
}

export interface BaseArticleFilters {
  search?: string
  projectId?: number
  status?: ArticleStatus | 'all' | 'queue'
}

export interface BaseArticleStats {
  total: number
  draft: number
  published: number
  archived: number
  queue: number
  writing: number
}

async function fetchBaseArticles(
  workspaceId: string | undefined,
  filters: BaseArticleFilters = {}
): Promise<BaseArticle[]> {
  if (!workspaceId) return []

  let query = supabase
    .from('articles')
    .select(`
      *,
      project:projects!inner(id, name, domain, status, workspace_id)
    `)
    .eq('project.workspace_id', workspaceId)
    .eq('is_approval_article', true)
    .order('created_at', { ascending: false })

  // Project filter
  if (filters.projectId) {
    query = query.eq('project_id', filters.projectId)
  }

  // Status filter
  if (filters.status && filters.status !== 'all') {
    if (filters.status === 'queue') {
      // Queue means null status
      query = query.is('status', null)
    } else if (filters.status === 'published') {
      // Published includes both 'publish' and 'published'
      query = query.in('status', ['publish', 'published'])
    } else {
      query = query.eq('status', filters.status)
    }
  }

  const { data, error } = await query

  if (error) throw error

  // Client-side search filter
  let articles = data || []
  if (filters.search) {
    const searchLower = filters.search.toLowerCase()
    articles = articles.filter(
      (article) =>
        article.title?.toLowerCase().includes(searchLower) ||
        article.keyword_used?.toLowerCase().includes(searchLower)
    )
  }

  return articles
}

async function fetchBaseArticleById(articleId: number, workspaceId: string): Promise<BaseArticle | null> {
  const { data, error } = await supabase
    .from('articles')
    .select(`
      *,
      project:projects!inner(id, name, domain, status, workspace_id)
    `)
    .eq('id', articleId)
    .eq('is_approval_article', true)
    .eq('project.workspace_id', workspaceId)
    .single()

  if (error) {
    if (error.code === 'PGRST116') return null
    throw error
  }
  return data
}

async function fetchBaseArticleStats(
  workspaceId: string | undefined,
  projectId?: number
): Promise<BaseArticleStats> {
  if (!workspaceId) {
    return { total: 0, draft: 0, published: 0, archived: 0, queue: 0, writing: 0 }
  }

  let query = supabase
    .from('articles')
    .select(`
      status,
      project:projects!inner(workspace_id)
    `)
    .eq('project.workspace_id', workspaceId)
    .eq('is_approval_article', true)

  if (projectId) {
    query = query.eq('project_id', projectId)
  }

  const { data, error } = await query

  if (error) throw error

  const articles = data || []
  return {
    total: articles.length,
    draft: articles.filter((a) => a.status === 'draft').length,
    published: articles.filter((a) => a.status === 'published' || a.status === 'publish').length,
    archived: articles.filter((a) => a.status === 'archived').length,
    queue: articles.filter((a) => a.status === null).length,
    writing: articles.filter((a) => a.status === 'writing').length,
  }
}

// Query hooks

export function useBaseArticles(filters: BaseArticleFilters = {}) {
  const workspaceId = useWorkspaceId()

  return useQuery({
    queryKey: [...queryKeys.articles.all, 'base', filters, workspaceId],
    queryFn: () => fetchBaseArticles(workspaceId, filters),
    enabled: !!workspaceId,
  })
}

export function useBaseArticle(articleId: number) {
  const workspaceId = useWorkspaceId()

  return useQuery({
    queryKey: [...queryKeys.articles.detail(articleId), 'base', workspaceId],
    queryFn: () => fetchBaseArticleById(articleId, workspaceId!),
    enabled: !!articleId && !!workspaceId,
  })
}

export function useBaseArticleStats(projectId?: number) {
  const workspaceId = useWorkspaceId()

  return useQuery({
    queryKey: [...queryKeys.articles.all, 'base', 'stats', workspaceId, projectId],
    queryFn: () => fetchBaseArticleStats(workspaceId, projectId),
    enabled: !!workspaceId,
    staleTime: 1000 * 60, // 1 minute
  })
}

// Helper functions

export function getStatusLabel(status?: ArticleStatus | null): string {
  if (!status) return 'Na Fila'
  const labels: Record<ArticleStatus, string> = {
    draft: 'Rascunho',
    writing: 'Escrevendo',
    publish: 'Publicado',
    published: 'Publicado',
    scheduled: 'Agendado',
    archived: 'Arquivado',
  }
  return labels[status] || status
}

export function formatDate(dateString?: string): string {
  if (!dateString) return '-'
  const date = new Date(dateString)
  return date.toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  })
}
