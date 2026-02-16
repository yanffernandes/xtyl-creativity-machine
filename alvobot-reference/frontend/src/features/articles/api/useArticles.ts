import { useQuery } from '@tanstack/react-query'
import { useWorkspaceId } from '@/features/workspace/stores/workspaceStore'
import { queryKeys } from '@/shared/utils/queryKeys'
import { supabase } from '@/shared/utils/supabase'

// Article type: 'arrow' (monetization) or 'base' (AdSense approval)
export type ArticleType = 'arrow' | 'base'

// Status values from database: null (queue), 'draft', 'writing', 'publish', 'published', 'scheduled', 'archived'
export type ArticleStatus = 'draft' | 'writing' | 'publish' | 'published' | 'scheduled' | 'archived'

export interface Article {
  id: number
  user_id: string
  project_id?: number
  title?: string
  content?: string
  excerpt?: string
  status?: ArticleStatus | null
  words?: number
  is_approval_article: boolean // true = base, false = arrow
  keyword_used?: string
  slug?: string
  url?: string
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

export interface ArticleFilters {
  search?: string
  projectId?: number
  status?: ArticleStatus | 'all' | 'queue'
  type?: ArticleType // 'arrow' or 'base'
}

export interface ArticleStats {
  total: number
  queue: number
  draft: number
  writing: number
  published: number
  scheduled: number
  archived: number
}

async function fetchArticles(
  workspaceId: string | undefined,
  filters: ArticleFilters = {}
): Promise<Article[]> {
  if (!workspaceId) return []

  // Determine is_approval_article based on type filter
  // arrow = is_approval_article: false
  // base = is_approval_article: true
  const isApprovalArticle = filters.type === 'base'

  let query = supabase
    .from('articles')
    .select(`
      *,
      project:projects!inner(id, name, domain, status, workspace_id, is_deleted)
    `)
    .eq('project.workspace_id', workspaceId)
    .eq('project.is_deleted', false)
    .eq('is_approval_article', isApprovalArticle)
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

async function fetchArticleById(articleId: number): Promise<Article | null> {
  const { data, error } = await supabase
    .from('articles')
    .select(`
      *,
      project:projects(id, name, domain, status, workspace_id)
    `)
    .eq('id', articleId)
    .single()

  if (error) {
    if (error.code === 'PGRST116') return null
    throw error
  }
  return data
}

async function fetchArticleStats(
  workspaceId: string | undefined,
  type: ArticleType,
  projectId?: number
): Promise<ArticleStats> {
  if (!workspaceId) {
    return { total: 0, queue: 0, draft: 0, writing: 0, published: 0, scheduled: 0, archived: 0 }
  }

  const isApprovalArticle = type === 'base'

  let query = supabase
    .from('articles')
    .select(`
      status,
      project:projects!inner(workspace_id, is_deleted)
    `)
    .eq('project.workspace_id', workspaceId)
    .eq('project.is_deleted', false)
    .eq('is_approval_article', isApprovalArticle)

  if (projectId) {
    query = query.eq('project_id', projectId)
  }

  const { data, error } = await query

  if (error) throw error

  const articles = data || []
  return {
    total: articles.length,
    queue: articles.filter((a) => a.status === null).length,
    draft: articles.filter((a) => a.status === 'draft').length,
    writing: articles.filter((a) => a.status === 'writing').length,
    published: articles.filter((a) => a.status === 'published' || a.status === 'publish').length,
    scheduled: articles.filter((a) => a.status === 'scheduled').length,
    archived: articles.filter((a) => a.status === 'archived').length,
  }
}

// Query hooks

export function useArticles(filters: ArticleFilters = {}) {
  const workspaceId = useWorkspaceId()

  return useQuery({
    queryKey: [...queryKeys.articles.all, filters.type || 'all', filters, workspaceId],
    queryFn: () => fetchArticles(workspaceId, filters),
    enabled: !!workspaceId && !!filters.type,
  })
}

export function useArticle(articleId: number) {
  return useQuery({
    queryKey: queryKeys.articles.detail(articleId),
    queryFn: () => fetchArticleById(articleId),
    enabled: !!articleId,
  })
}

export function useArticleStats(type: ArticleType, projectId?: number) {
  const workspaceId = useWorkspaceId()

  return useQuery({
    queryKey: [...queryKeys.articles.all, type, 'stats', workspaceId, projectId],
    queryFn: () => fetchArticleStats(workspaceId, type, projectId),
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

export function getArticleTypeLabel(type: ArticleType): string {
  return type === 'arrow' ? 'Artigo Flecha' : 'Artigo de Base'
}

export function getArticleTypeDescription(type: ArticleType): string {
  return type === 'arrow'
    ? 'Artigos para monetização com base em palavras-chave que cumprem determinados critérios'
    : 'Artigos de 4 camadas para aumentar a chance de aprovação no AdSense'
}
