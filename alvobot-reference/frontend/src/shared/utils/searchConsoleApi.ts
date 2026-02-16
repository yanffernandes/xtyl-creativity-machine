import { api } from './api'

export interface InspectUrlPayload {
  url: string
  connectionId: string
  propertyId?: string
  forceRefresh?: boolean
}

export interface IndexUrlPayload {
  url: string
  articleId: number
  connectionId: string
  requestType?: 'URL_UPDATED' | 'URL_DELETED'
}

export interface BatchIndexPayload {
  connectionId: string
  items: Array<{ url: string; articleId: number }>
}

export interface AutoRunPayload {
  connectionId: string
}

export interface SearchConsoleStatus {
  id?: string
  workspace_id: string
  connection_id: string
  article_id?: number | null
  url: string
  property_id?: string | null
  verdict: string
  coverage_state?: string | null
  last_inspected_at?: string | null
  last_inspection_result?: Record<string, unknown> | null
  last_error?: string | null
  created_at?: string
  updated_at?: string
}

export interface SearchConsoleQuotaUsage {
  id?: string
  connection_id: string
  date: string
  publish_quota_limit: number
  publish_quota_used: number
  inspection_quota_limit: number
  inspection_quota_used: number
  updated_at?: string
}

export const searchConsoleApi = {
  inspectUrl: (payload: InspectUrlPayload, workspaceId: string) =>
    api.post<{ status: SearchConsoleStatus }>('/search-console/inspect', payload, {
      headers: {
        'x-workspace-id': workspaceId,
      },
    }),
  inspectBatch: (
    payload: { urls: string[]; connectionId: string; propertyId?: string; forceRefresh?: boolean },
    workspaceId: string
  ) =>
    api.post<{ statuses: Record<string, SearchConsoleStatus | null> }>(
      '/search-console/inspect/batch',
      payload,
      {
        headers: {
          'x-workspace-id': workspaceId,
        },
      }
    ),
  requestIndex: (payload: IndexUrlPayload, workspaceId: string) =>
    api.post<{ status: string; reason?: string; message?: string; id?: string }>(
      '/search-console/index',
      payload,
      {
        headers: {
          'x-workspace-id': workspaceId,
        },
      }
    ),
  requestIndexBatch: (payload: BatchIndexPayload, workspaceId: string) =>
    api.post<{ queued: number }>('/search-console/index/batch', payload, {
      headers: {
        'x-workspace-id': workspaceId,
      },
    }),
  getQuota: (connectionId: string, workspaceId: string) =>
    api.get<{ quota: SearchConsoleQuotaUsage }>(
      `/search-console/quota?connectionId=${connectionId}`,
      {
        headers: {
          'x-workspace-id': workspaceId,
        },
      }
    ),
  autoRun: (payload: AutoRunPayload, workspaceId: string) =>
    api.post<{ queued: number }>('/search-console/auto-run', payload, {
      headers: {
        'x-workspace-id': workspaceId,
      },
    }),
}
