/**
 * Automation Engine — React Query Hooks (Mutations)
 *
 * TanStack Query v5 mutation hooks for creating, updating, deleting,
 * toggling and executing automation rules.
 *
 * @module ads-unified/api/automationMutations
 */

import { useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '@/shared/utils/api'
import { automationKeys } from './automationQueries'
import type {
  AutomationRule,
  CreateAutomationRuleInput,
  UpdateAutomationRuleInput,
} from '../types/automation'

// ============================================================================
// MUTATION HOOKS
// ============================================================================

/** Create a new automation rule. */
export function useCreateRule() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (input: CreateAutomationRuleInput) =>
      api.post<AutomationRule>('/automations/rules', input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: automationKeys.rules() })
    },
  })
}

/** Update an existing automation rule. */
export function useUpdateRule() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateAutomationRuleInput }) =>
      api.patch<AutomationRule>(`/automations/rules/${id}`, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: automationKeys.rules() })
      queryClient.invalidateQueries({
        queryKey: automationKeys.ruleDetail(variables.id),
      })
    },
  })
}

/** Delete an automation rule. */
export function useDeleteRule() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (id: string) => api.delete(`/automations/rules/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: automationKeys.rules() })
    },
  })
}

/** Toggle a rule's status between active and paused. */
export function useToggleRule() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ id, status }: { id: string; status: 'active' | 'paused' }) =>
      api.post<AutomationRule>(`/automations/rules/${id}/toggle`, { status }),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: automationKeys.rules() })
      queryClient.invalidateQueries({
        queryKey: automationKeys.ruleDetail(variables.id),
      })
    },
  })
}

/** Manually execute a rule (on-demand). */
export function useExecuteRule() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (id: string) =>
      api.post<Record<string, unknown>>(
        `/automations/rules/${id}/execute`,
        {},
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: automationKeys.logs() })
    },
  })
}
