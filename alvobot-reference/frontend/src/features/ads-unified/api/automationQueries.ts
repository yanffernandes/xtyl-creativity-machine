/**
 * Automation Engine — React Query Hooks (Queries)
 *
 * TanStack Query v5 hooks for fetching automation rules, execution logs,
 * platform metrics, and preview data.
 *
 * @module ads-unified/api/automationQueries
 */

import { useQuery } from '@tanstack/react-query'
import { api } from '@/shared/utils/api'
import type {
  AutomationRule,
  AutomationRulesListResponse,
  ExecutionLog,
  ExecutionLogsListResponse,
  PlatformEntity,
  Platform,
} from '../types/automation'

// ============================================================================
// QUERY KEY FACTORY
// ============================================================================

export const automationKeys = {
  all: ['automations'] as const,
  rules: () => [...automationKeys.all, 'rules'] as const,
  rulesList: (filters: Record<string, unknown>) =>
    [...automationKeys.rules(), 'list', filters] as const,
  ruleDetail: (id: string) =>
    [...automationKeys.rules(), 'detail', id] as const,
  logs: () => [...automationKeys.all, 'logs'] as const,
  logsList: (filters: Record<string, unknown>) =>
    [...automationKeys.logs(), 'list', filters] as const,
  logDetail: (id: string) =>
    [...automationKeys.logs(), 'detail', id] as const,
  metrics: (platform: Platform) =>
    [...automationKeys.all, 'metrics', platform] as const,
  preview: (ruleId: string) =>
    [...automationKeys.all, 'preview', ruleId] as const,
  customMetrics: () =>
    [...automationKeys.all, 'custom-metrics'] as const,
}

// ============================================================================
// FILTER TYPES
// ============================================================================

export interface AutomationRulesFilters {
  platform?: Platform
  status?: string
  search?: string
  page?: number
  limit?: number
}

export interface AutomationLogsFilters {
  ruleId?: string
  status?: string
  page?: number
  limit?: number
}

// ============================================================================
// QUERY HOOKS
// ============================================================================

/** Fetch a paginated list of automation rules with optional filters. */
export function useAutomationRules(filters?: AutomationRulesFilters) {
  return useQuery({
    queryKey: automationKeys.rulesList(filters ?? {}),
    queryFn: async () => {
      const params = new URLSearchParams()
      if (filters?.platform) params.set('platform', filters.platform)
      if (filters?.status) params.set('status', filters.status)
      if (filters?.search) params.set('search', filters.search)
      if (filters?.page) params.set('page', String(filters.page))
      if (filters?.limit) params.set('limit', String(filters.limit))

      const qs = params.toString()
      return api.get<AutomationRulesListResponse>(
        `/automations/rules${qs ? `?${qs}` : ''}`,
      )
    },
  })
}

/** Fetch a single automation rule by ID. */
export function useAutomationRule(id: string | undefined) {
  return useQuery({
    queryKey: automationKeys.ruleDetail(id!),
    queryFn: () => api.get<AutomationRule>(`/automations/rules/${id}`),
    enabled: !!id,
  })
}

/** Fetch a paginated list of execution logs with optional filters. */
export function useAutomationLogs(filters?: AutomationLogsFilters) {
  return useQuery({
    queryKey: automationKeys.logsList(filters ?? {}),
    queryFn: async () => {
      const params = new URLSearchParams()
      if (filters?.ruleId) params.set('ruleId', filters.ruleId)
      if (filters?.status) params.set('status', filters.status)
      if (filters?.page) params.set('page', String(filters.page))
      if (filters?.limit) params.set('limit', String(filters.limit))

      const qs = params.toString()
      return api.get<ExecutionLogsListResponse>(
        `/automations/logs${qs ? `?${qs}` : ''}`,
      )
    },
  })
}

/** Fetch a single execution log with full details. */
export function useAutomationLogDetail(logId: string | undefined) {
  return useQuery({
    queryKey: automationKeys.logDetail(logId!),
    queryFn: () => api.get<ExecutionLog>(`/automations/logs/${logId}`),
    enabled: !!logId,
  })
}

/** Fetch available platform metrics metadata. Cached for 30 min. */
export function useAutomationMetrics(platform: Platform) {
  return useQuery({
    queryKey: automationKeys.metrics(platform),
    queryFn: () =>
      api.get<Record<string, unknown>>(
        `/automations/metrics?platform=${platform}`,
      ),
    staleTime: 30 * 60 * 1000, // 30 min — metadata rarely changes
  })
}

/** Preview / dry-run: which entities a rule would affect. */
export interface PreviewResult {
  matchingEntities: Array<{
    entityId: string
    entityName: string
    entityType: string
    platform: string
    currentMetrics: Record<string, number>
    wouldExecuteTasks: Array<{
      taskIndex: number
      action: string
      conditionsMet: boolean
      skippedByCap: boolean
    }>
  }>
  summary: {
    totalEvaluated: number
    totalMatchedFilters: number
    totalMatchedConditions: number
    totalWouldBeAffected: number
  }
  previewedAt: string
  warnings?: string[]
}

export function usePreviewRule(ruleId: string | undefined, enabled = false) {
  return useQuery({
    queryKey: automationKeys.preview(ruleId!),
    queryFn: () =>
      api.post<PreviewResult>(
        `/automations/rules/${ruleId}/preview`,
        {},
      ),
    enabled: !!ruleId && enabled,
  })
}

/** Fetch user-defined custom metrics. */
export function useCustomMetrics() {
  return useQuery({
    queryKey: automationKeys.customMetrics(),
    queryFn: () =>
      api.get<Record<string, unknown>>('/automations/custom-metrics'),
  })
}
