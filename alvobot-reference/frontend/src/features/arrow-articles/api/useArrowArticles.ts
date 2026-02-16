import { useQuery } from '@tanstack/react-query'
import { useWorkspaceId } from '@/features/workspace/stores/workspaceStore'
import { queryKeys } from '@/shared/utils/queryKeys'
import { supabase } from '@/shared/utils/supabase'

// Status values from database: null (queue), 'draft', 'writing', 'publish', 'published', 'scheduled', 'archived'
export type ArticleStatus = 'draft' | 'writing' | 'publish' | 'published' | 'scheduled' | 'archived'

export interface ArrowArticle {
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
    status?: boolean
    workspace_id?: string
  }
}

export interface ArrowArticleFilters {
  search?: string
  projectId?: number
  status?: ArticleStatus | 'all' | 'queue'
}

export interface ArrowArticleStats {
  total: number
  draft: number
  published: number
  archived: number
}

async function fetchArrowArticles(
  workspaceId: string | undefined,
  filters: ArrowArticleFilters = {}
): Promise<ArrowArticle[]> {
  if (!workspaceId) return []

  let query = supabase
    .from('articles')
    .select(`
      *,
      project:projects!inner(id, name, domain, status, workspace_id, is_deleted)
    `)
    .eq('project.workspace_id', workspaceId)
    .eq('project.is_deleted', false)
    .eq('is_approval_article', false)
    .order('created_at', { ascending: false })

  // Project filter
  if (filters.projectId) {
    query = query.eq('project_id', filters.projectId)
  }

  // Status filter
  if (filters.status && filters.status !== 'all') {
    if (filters.status === 'queue') {
      query = query.is('status', null)
    } else if (filters.status === 'published') {
      // 'publish' and 'published' are equivalent
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

async function fetchArrowArticleById(articleId: number, workspaceId: string): Promise<ArrowArticle | null> {
  const { data, error } = await supabase
    .from('articles')
    .select(`
      *,
      project:projects!inner(id, name, domain, status, workspace_id)
    `)
    .eq('id', articleId)
    .eq('is_approval_article', false)
    .eq('project.workspace_id', workspaceId)
    .single()

  if (error) {
    if (error.code === 'PGRST116') return null
    throw error
  }
  return data
}

async function fetchArrowArticleStats(
  workspaceId: string | undefined,
  projectId?: number
): Promise<ArrowArticleStats> {
  if (!workspaceId) {
    return { total: 0, draft: 0, published: 0, archived: 0 }
  }

  let query = supabase
    .from('articles')
    .select(`
      status,
      project:projects!inner(workspace_id, is_deleted)
    `)
    .eq('project.workspace_id', workspaceId)
    .eq('project.is_deleted', false)
    .eq('is_approval_article', false)

  if (projectId) {
    query = query.eq('project_id', projectId)
  }

  const { data, error } = await query

  if (error) throw error

  const articles = data || []
  return {
    total: articles.length,
    draft: articles.filter((a) => a.status === 'draft').length,
    published: articles.filter((a) => a.status === 'published').length,
    archived: articles.filter((a) => a.status === 'archived').length,
  }
}

// Query hooks

export function useArrowArticles(filters: ArrowArticleFilters = {}) {
  const workspaceId = useWorkspaceId()

  return useQuery({
    queryKey: [...queryKeys.articles.all, 'arrow', filters, workspaceId],
    queryFn: () => fetchArrowArticles(workspaceId, filters),
    enabled: !!workspaceId,
  })
}

export function useArrowArticle(articleId: number) {
  const workspaceId = useWorkspaceId()

  return useQuery({
    queryKey: [...queryKeys.articles.detail(articleId), 'arrow', workspaceId],
    queryFn: () => fetchArrowArticleById(articleId, workspaceId!),
    enabled: !!articleId && !!workspaceId,
  })
}

export function useArrowArticleStats(projectId?: number) {
  const workspaceId = useWorkspaceId()

  return useQuery({
    queryKey: [...queryKeys.articles.all, 'arrow', 'stats', workspaceId, projectId],
    queryFn: () => fetchArrowArticleStats(workspaceId, projectId),
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
