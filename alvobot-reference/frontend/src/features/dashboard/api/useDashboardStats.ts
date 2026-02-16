import { useQuery } from '@tanstack/react-query'
import { useWorkspaceId, useCurrentWorkspace } from '@/features/workspace/stores/workspaceStore'
import { queryKeys } from '@/shared/utils/queryKeys'
import { supabase } from '@/shared/utils/supabase'

export interface DashboardStats {
  projects: {
    count: number
    limit: number
    percentage: number
  }
  articles: {
    count: number
    goal: number
    percentage: number
  }
  keywords: {
    count: number
    limit: number
    percentage: number
  }
}

export interface RecentActivity {
  id: string
  type: 'article' | 'project' | 'task' | 'run'
  title: string
  description: string
  timestamp: string
  projectName?: string
}

async function fetchDashboardStats(workspaceId: string, maxProjects: number): Promise<DashboardStats> {
  // Fetch projects count for workspace
  const { count: projectsCount, error: projectsError } = await supabase
    .from('projects')
    .select('*', { count: 'exact', head: true })
    .eq('workspace_id', workspaceId)
    .eq('is_deleted', false)

  if (projectsError) throw projectsError

  // Fetch articles count through projects in workspace
  const { data: articlesData, error: articlesError } = await supabase
    .from('articles')
    .select(`
      id,
      project:projects!inner(workspace_id)
    `)
    .eq('project.workspace_id', workspaceId)

  if (articlesError) throw articlesError

  // Fetch keywords count - first try workspace_keywords, fallback to count 0
  const { count: keywordsCount, error: keywordsError } = await supabase
    .from('workspace_keywords')
    .select('*', { count: 'exact', head: true })
    .eq('workspace_id', workspaceId)

  // Default limits/goals (from workspace settings)
  const projectsLimit = maxProjects
  const articlesGoal = 120
  const keywordsLimit = 30

  return {
    projects: {
      count: projectsCount || 0,
      limit: projectsLimit,
      percentage: Math.min(((projectsCount || 0) / projectsLimit) * 100, 100),
    },
    articles: {
      count: articlesData?.length || 0,
      goal: articlesGoal,
      percentage: Math.min(((articlesData?.length || 0) / articlesGoal) * 100, 100),
    },
    keywords: {
      count: keywordsError ? 0 : (keywordsCount || 0),
      limit: keywordsLimit,
      percentage: Math.min(((keywordsError ? 0 : (keywordsCount || 0)) / keywordsLimit) * 100, 100),
    },
  }
}

async function fetchRecentActivity(workspaceId: string): Promise<RecentActivity[]> {
  const activities: RecentActivity[] = []

  // Fetch recent articles through projects in workspace
  const { data: recentArticles } = await supabase
    .from('articles')
    .select(`
      id,
      title,
      created_at,
      project:projects!inner(name, workspace_id)
    `)
    .eq('project.workspace_id', workspaceId)
    .order('created_at', { ascending: false })
    .limit(3)

  if (recentArticles) {
    for (const article of recentArticles) {
      // projects can be an object or array depending on the relationship
      const projectData = article.project as { name: string } | Array<{ name: string }> | null
      const projectName = Array.isArray(projectData)
        ? projectData[0]?.name
        : projectData?.name
      activities.push({
        id: `article-${article.id}`,
        type: 'article',
        title: 'Artigo criado',
        description: article.title || 'Sem título',
        timestamp: article.created_at,
        projectName,
      })
    }
  }

  // Fetch recent projects in workspace
  const { data: recentProjects } = await supabase
    .from('projects')
    .select('id, name, created_at')
    .eq('workspace_id', workspaceId)
    .eq('is_deleted', false)
    .order('created_at', { ascending: false })
    .limit(2)

  if (recentProjects) {
    for (const project of recentProjects) {
      activities.push({
        id: `project-${project.id}`,
        type: 'project',
        title: 'Projeto criado',
        description: project.name,
        timestamp: project.created_at,
      })
    }
  }

  // Sort by timestamp (most recent first)
  activities.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())

  return activities.slice(0, 5)
}

export function useDashboardStats() {
  const workspaceId = useWorkspaceId()
  const workspace = useCurrentWorkspace()

  return useQuery({
    queryKey: queryKeys.dashboard.stats(workspaceId || ''),
    queryFn: () => fetchDashboardStats(workspaceId!, workspace?.max_projects || 7),
    enabled: !!workspaceId,
    staleTime: 1000 * 60 * 5, // 5 minutes
  })
}

export function useRecentActivity() {
  const workspaceId = useWorkspaceId()

  return useQuery({
    queryKey: queryKeys.dashboard.activity(workspaceId || ''),
    queryFn: () => fetchRecentActivity(workspaceId!),
    enabled: !!workspaceId,
    staleTime: 1000 * 60 * 2, // 2 minutes
  })
}

// Helper function to get time-based greeting
export function getGreeting(): string {
  const hour = new Date().getHours()
  if (hour < 12) return 'Bom dia'
  if (hour < 18) return 'Boa tarde'
  return 'Boa noite'
}

// Helper function to format relative time
export function formatRelativeTime(timestamp: string): string {
  const now = new Date()
  const date = new Date(timestamp)
  const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000)

  if (diffInSeconds < 60) return 'Agora mesmo'
  if (diffInSeconds < 3600) return `Há ${Math.floor(diffInSeconds / 60)} minutos`
  if (diffInSeconds < 86400) return `Há ${Math.floor(diffInSeconds / 3600)} horas`
  if (diffInSeconds < 172800) return 'Ontem'
  return `Há ${Math.floor(diffInSeconds / 86400)} dias`
}
