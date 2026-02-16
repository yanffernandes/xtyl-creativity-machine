import { useQuery, keepPreviousData } from '@tanstack/react-query'
import { useWorkspaceId } from '@/features/workspace/stores/workspaceStore'
import { api } from '@/shared/utils/api'
import type { SitemapUrl } from '../types'

export interface UrlsQueryParams {
  projectId?: string
  connectionId?: string
  status?: string
  search?: string
  sitemapId?: string
  page?: number
  limit?: number
}

interface UrlsResponse {
  data: Array<{
    id: string
    sitemap_id: string
    url: string
    path: string
    lastmod: string | null
    article_id: number | null
    indexing_status?: {
      verdict?: string | null
      last_inspected_at?: string | null
      last_submitted_at?: string | null
      indexed_at?: string | null
    } | null
  }>
  total: number
  page: number
  limit: number
}

export function useUrls(params: UrlsQueryParams) {
  const workspaceId = useWorkspaceId()

  return useQuery({
    queryKey: ['search-console-indexing', 'urls', params],
    queryFn: async (): Promise<{ urls: SitemapUrl[]; total: number; page: number; limit: number }> => {
      if (!workspaceId) {
        return { urls: [], total: 0, page: params.page || 1, limit: params.limit || 50 }
      }

      const query = new URLSearchParams()
      if (params.projectId) query.set('projectId', params.projectId)
      if (params.connectionId) query.set('connectionId', params.connectionId)
      if (params.status && params.status !== 'all') query.set('status', params.status)
      if (params.search) query.set('search', params.search)
      if (params.sitemapId) query.set('sitemapId', params.sitemapId)
      if (params.page) query.set('page', params.page.toString())
      if (params.limit) query.set('limit', params.limit.toString())

      const response = await api.get<UrlsResponse>(`/search-console/urls?${query.toString()}`, {
        headers: { 'x-workspace-id': workspaceId },
      })

      const urls: SitemapUrl[] = response.data.map((row) => ({
        id: row.id,
        sitemap_id: row.sitemap_id,
        url: row.url,
        path: row.path,
        lastmod: row.lastmod,
        article_id: row.article_id,
        verdict: row.indexing_status?.verdict || null,
        last_inspected_at: row.indexing_status?.last_inspected_at || null,
        last_submitted_at: row.indexing_status?.last_submitted_at || null,
        indexed_at: row.indexing_status?.indexed_at || null,
      }))

      return {
        urls,
        total: response.total,
        page: response.page,
        limit: response.limit,
      }
    },
    enabled: !!workspaceId,
    placeholderData: keepPreviousData,
  })
}
