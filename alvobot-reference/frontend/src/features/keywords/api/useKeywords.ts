import { useQuery } from '@tanstack/react-query'
import { useWorkspaceId } from '@/features/workspace/stores/workspaceStore'
import { queryKeys } from '@/shared/utils/queryKeys'
import { supabase, getCurrentUserId } from '@/shared/utils/supabase'
import type { Keyword, KeywordFilters, KeywordUsage } from '../types'

// Types for geo targets and languages from Supabase
interface GeoTarget {
  id: string
  name: string
  name_en: string
  country_code: string
  type: string
  status: string
}

interface GoogleLanguage {
  id: string
  code: string
  name: string
  name_en: string
  status: string
}

// Database structure:
// keywords: id, word, search_volume, cpc_min, cpc_max, visibility, competition, language, country
// workspace_keywords: workspace_id, keyword_id, added_by_user_id, created_at (junction table M:N)
// users_keywords: keyword_id, user_id, created_at (legacy junction table, still used for fallback)
// articles: keyword_used (text field with the keyword)

function competitionToDifficulty(competition: string | null): number {
  switch (competition?.toLowerCase()) {
    case 'high':
      return 80
    case 'medium':
      return 50
    case 'low':
      return 20
    default:
      return 0
  }
}

async function fetchKeywords(
  filters: KeywordFilters,
  workspaceId: string | undefined
): Promise<Keyword[]> {
  const userId = await getCurrentUserId()
  if (!workspaceId) return []

  // First, try to get keyword IDs from workspace_keywords table
  let workspaceKeywordsData: Array<{ keyword_id: string; created_at: string }> = []

  const { data: wsKeywords, error: wsError } = await supabase
    .from('workspace_keywords')
    .select('keyword_id, created_at')
    .eq('workspace_id', workspaceId)

  if (!wsError && wsKeywords && wsKeywords.length > 0) {
    workspaceKeywordsData = wsKeywords
  } else if (userId) {
    // Fallback to users_keywords if workspace_keywords is empty or errors
    const { data: userKeywords, error: junctionError } = await supabase
      .from('users_keywords')
      .select('keyword_id, created_at')
      .eq('user_id', userId)

    if (junctionError) throw junctionError
    if (!userKeywords || userKeywords.length === 0) return []
    workspaceKeywordsData = userKeywords
  } else {
    return []
  }

  if (workspaceKeywordsData.length === 0) return []

  // Extract keyword IDs
  const keywordIds = workspaceKeywordsData.map((uk) => uk.keyword_id)

  // Create a map of keyword_id to user_added_at
  const userAddedMap = new Map(workspaceKeywordsData.map((uk) => [uk.keyword_id, uk.created_at]))

  // Then, fetch the keywords from the keywords table
  const { data: keywordsData, error: keywordsError } = await supabase
    .from('keywords')
    .select('*')
    .in('id', keywordIds)

  if (keywordsError) throw keywordsError

  // Fetch articles with keyword_used to find usages (filter by workspace via projects)
  const articlesQuery = supabase
    .from('articles')
    .select(`
      id,
      title,
      keyword_used,
      created_at,
      project_id,
      project:projects!inner(id, name, workspace_id)
    `)
    .not('keyword_used', 'is', null)

  // Filter articles by workspace (through the projects relationship)
  const { data: articlesData } = await articlesQuery

  // Build a map of keyword (lowercase) -> usages
  const keywordUsagesMap = new Map<string, KeywordUsage[]>()
  if (articlesData) {
    for (const article of articlesData) {
      if (!article.keyword_used) continue
      // Check if the article's project belongs to this workspace
      const projectData = Array.isArray(article.project) ? article.project[0] : article.project
      if (projectData && (projectData as { workspace_id?: string }).workspace_id !== workspaceId) {
        continue
      }
      const keywordLower = article.keyword_used.toLowerCase().trim()
      const usage: KeywordUsage = {
        articleId: article.id,
        articleTitle: article.title || undefined,
        projectId: (projectData as { id: number; name: string } | null)?.id,
        projectName: (projectData as { id: number; name: string } | null)?.name,
        createdAt: article.created_at,
      }
      if (!keywordUsagesMap.has(keywordLower)) {
        keywordUsagesMap.set(keywordLower, [])
      }
      keywordUsagesMap.get(keywordLower)!.push(usage)
    }
  }

  // Transform the data to Keyword objects
  const keywords: Keyword[] = (keywordsData || []).map((kw) => {
    const keywordLower = kw.word?.toLowerCase().trim() || ''
    const usages = keywordUsagesMap.get(keywordLower) || []
    return {
      id: kw.id,
      keyword: kw.word,
      search_volume: kw.search_volume ?? 0,
      cpc: kw.cpc_min ?? 0,
      cpc_max: kw.cpc_max ?? 0,
      difficulty: competitionToDifficulty(kw.competition),
      competition: kw.competition ?? undefined,
      language: kw.language ?? undefined,
      country: kw.country ?? undefined,
      visibility: kw.visibility ?? undefined,
      created_at: kw.created_at,
      updated_at: kw.updated_at ?? undefined,
      user_added_at: userAddedMap.get(kw.id),
      usages,
      articles_count: usages.length,
    }
  })

  // Apply client-side filters
  let filtered = keywords

  if (filters.search) {
    const searchLower = filters.search.toLowerCase()
    filtered = filtered.filter((kw) => kw.keyword.toLowerCase().includes(searchLower))
  }

  if (filters.minVolume) {
    filtered = filtered.filter((kw) => (kw.search_volume ?? 0) >= filters.minVolume!)
  }

  if (filters.maxDifficulty) {
    filtered = filtered.filter((kw) => (kw.difficulty ?? 0) <= filters.maxDifficulty!)
  }

  if (filters.language) {
    filtered = filtered.filter((kw) => kw.language === filters.language)
  }

  if (filters.country) {
    filtered = filtered.filter((kw) => kw.country === filters.country)
  }

  // Sort by search volume descending
  filtered.sort((a, b) => (b.search_volume ?? 0) - (a.search_volume ?? 0))

  return filtered
}

export function useKeywords(filters: KeywordFilters = {}) {
  const workspaceId = useWorkspaceId()

  return useQuery({
    queryKey: queryKeys.keywords.list(filters, workspaceId),
    queryFn: () => fetchKeywords(filters, workspaceId),
    enabled: !!workspaceId,
  })
}

/**
 * Hook to fetch countries from google_geo_targets table
 * Returns countries in { value, label } format for SearchableSelect
 */
export function useGeoTargetCountries() {
  return useQuery({
    queryKey: ['google', 'geo-targets', 'countries'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('google_geo_targets')
        .select('id, name, name_en, country_code, type, status')
        .eq('type', 'country')
        .eq('status', 'active')
        .order('name', { ascending: true })

      if (error) throw error

      // Transform to { value, label } format for SearchableSelect
      return (data as GeoTarget[]).map((country) => ({
        value: country.country_code,
        label: country.name,
      }))
    },
    staleTime: 1000 * 60 * 60, // Cache for 1 hour (static data)
  })
}

/**
 * Hook to fetch languages from google_languages table
 * Returns languages in { value, label } format for SearchableSelect
 */
export function useGoogleLanguages() {
  return useQuery({
    queryKey: ['google', 'languages'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('google_languages')
        .select('id, code, name, name_en, status')
        .eq('status', 'active')
        .order('name', { ascending: true })

      if (error) throw error

      // Transform to { value, label } format for SearchableSelect
      return (data as GoogleLanguage[]).map((lang) => ({
        value: lang.code,
        label: lang.name,
      }))
    },
    staleTime: 1000 * 60 * 60, // Cache for 1 hour (static data)
  })
}
