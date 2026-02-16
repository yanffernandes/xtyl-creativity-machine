/**
 * useAutomationForm Hook
 *
 * Manages the complete state for the AutomationWizard multi-step form.
 * Provides step navigation, field updates, task management,
 * per-step validation, and conversion to API input.
 *
 * @module ads-unified/hooks/useAutomationForm
 */

import { useState, useCallback, useMemo } from 'react'
import type {
  CreateAutomationRuleInput,
  Platform,
  EntityLevel,
  GoogleCampaignType,
  FilterGroup,
  Task,
  Schedule,
  NotificationConfig,
  AttributionConfig,
  AutomationActionType,
  FrequencyCap,
  CheckInterval,
} from '../types/automation'

// ============================================================================
// TYPES
// ============================================================================

export interface AutomationFormState {
  // Step 1: Platform & Scope
  name: string
  description: string
  platform: Platform
  connectionIds: string[]
  adAccountIds: string[]
  googleCampaignType: GoogleCampaignType | ''
  level: EntityLevel

  // Step 2: Filters
  filters: FilterGroup[]

  // Step 3: Tasks
  tasks: Task[]

  // Step 4: Schedule
  schedule: Schedule
  timezone: string

  // Step 5: Notifications
  notifications: NotificationConfig

  // Optional
  attribution: AttributionConfig
}

export interface StepValidation {
  valid: boolean
  errors: string[]
}

export interface UseAutomationFormReturn {
  state: AutomationFormState
  setState: React.Dispatch<React.SetStateAction<AutomationFormState>>
  currentStep: number
  goToStep: (step: number) => void
  nextStep: () => void
  prevStep: () => void
  updateField: <K extends keyof AutomationFormState>(
    field: K,
    value: AutomationFormState[K],
  ) => void
  addTask: () => void
  duplicateTask: (index: number) => void
  removeTask: (index: number) => void
  updateTask: (index: number, updates: Partial<Task>) => void
  validateStep: (step: number) => StepValidation
  toCreateInput: () => CreateAutomationRuleInput
  isValid: boolean
}

// ============================================================================
// DEFAULTS
// ============================================================================

const TOTAL_STEPS = 5

function createDefaultTask(): Task {
  return {
    action: 'pause' as AutomationActionType,
    params: {} as Record<string, never>,
    frequencyCap: 'once_per_day' as FrequencyCap,
    conditions: {
      operator: 'AND',
      conditions: [],
    },
  }
}

function getInitialState(
  initialData?: Partial<AutomationFormState>,
): AutomationFormState {
  return {
    // Step 1
    name: initialData?.name ?? '',
    description: initialData?.description ?? '',
    platform: initialData?.platform ?? 'meta',
    connectionIds: initialData?.connectionIds ?? [],
    adAccountIds: initialData?.adAccountIds ?? [],
    googleCampaignType: initialData?.googleCampaignType ?? '',
    level: initialData?.level ?? 'campaign',

    // Step 2
    filters: initialData?.filters ?? [],

    // Step 3
    tasks: initialData?.tasks ?? [createDefaultTask()],

    // Step 4
    schedule: initialData?.schedule ?? {
      type: 'frequency',
      checkInterval: '1_hour' as CheckInterval,
    },
    timezone: initialData?.timezone ?? 'America/Sao_Paulo',

    // Step 5
    notifications: initialData?.notifications ?? {
      emails: [],
      notifyOnAction: true,
      notifyOnError: true,
      notifyOnNoMatch: false,
      includeSummary: true,
      includeEntityDetails: false,
      includeMetricsSnapshot: false,
    },

    // Optional
    attribution: initialData?.attribution ?? {
      useEntitySetting: true,
    },
  }
}

// ============================================================================
// HOOK
// ============================================================================

export function useAutomationForm(
  initialData?: Partial<AutomationFormState>,
): UseAutomationFormReturn {
  const [state, setState] = useState<AutomationFormState>(() =>
    getInitialState(initialData),
  )
  const [currentStep, setCurrentStep] = useState(0)

  // ── Step Navigation ──

  const goToStep = useCallback((step: number) => {
    setCurrentStep(Math.max(0, Math.min(step, TOTAL_STEPS - 1)))
  }, [])

  const nextStep = useCallback(() => {
    setCurrentStep((s) => Math.min(s + 1, TOTAL_STEPS - 1))
  }, [])

  const prevStep = useCallback(() => {
    setCurrentStep((s) => Math.max(s - 1, 0))
  }, [])

  // ── Field Updaters ──

  const updateField = useCallback(
    <K extends keyof AutomationFormState>(
      field: K,
      value: AutomationFormState[K],
    ) => {
      setState((prev) => ({ ...prev, [field]: value }))
    },
    [],
  )

  // ── Task Management ──

  const addTask = useCallback(() => {
    setState((prev) => ({
      ...prev,
      tasks: [...prev.tasks, createDefaultTask()],
    }))
  }, [])

  const duplicateTask = useCallback((index: number) => {
    setState((prev) => {
      const source = prev.tasks[index]
      if (!source) return prev
      // Deep clone to avoid shared references
      const clone = JSON.parse(JSON.stringify(source)) as Task
      const newTasks = [...prev.tasks]
      newTasks.splice(index + 1, 0, clone)
      return { ...prev, tasks: newTasks }
    })
  }, [])

  const removeTask = useCallback((index: number) => {
    setState((prev) => ({
      ...prev,
      tasks: prev.tasks.filter((_, i) => i !== index),
    }))
  }, [])

  const updateTask = useCallback((index: number, updates: Partial<Task>) => {
    setState((prev) => ({
      ...prev,
      tasks: prev.tasks.map((task, i) =>
        i === index ? { ...task, ...updates } : task,
      ),
    }))
  }, [])

  // ── Step Validation ──

  const validateStep = useCallback(
    (step: number): StepValidation => {
      const errors: string[] = []

      switch (step) {
        case 0: {
          // Platform & Scope
          if (!state.name.trim()) {
            errors.push('Nome da regra é obrigatório')
          }
          if (!state.platform) {
            errors.push('Selecione uma plataforma')
          }
          if (state.adAccountIds.length === 0) {
            errors.push('Selecione pelo menos uma conta de anúncio')
          }
          if (!state.level) {
            errors.push('Selecione um nível de entidade')
          }
          if (
            state.platform === 'google' &&
            !state.googleCampaignType
          ) {
            errors.push('Selecione o tipo de campanha')
          }
          break
        }
        case 1: {
          // Filters - optional, always valid
          break
        }
        case 2: {
          // Tasks
          if (state.tasks.length === 0) {
            errors.push('Adicione pelo menos uma task')
          }
          for (let i = 0; i < state.tasks.length; i++) {
            const task = state.tasks[i]
            if (!task.action) {
              errors.push(`Task ${i + 1}: selecione uma ação`)
            }
            if (
              task.conditions.conditions.length === 0
            ) {
              errors.push(`Task ${i + 1}: adicione pelo menos uma condição`)
            }
          }
          break
        }
        case 3: {
          // Schedule
          if (state.schedule.type === 'frequency' && !state.schedule.checkInterval) {
            errors.push('Selecione um intervalo de verificação')
          }
          if (
            state.schedule.type === 'custom' &&
            (!state.schedule.customSlots || state.schedule.customSlots.length === 0)
          ) {
            errors.push('Selecione pelo menos um horário')
          }
          if (!state.timezone) {
            errors.push('Selecione um fuso horário')
          }
          break
        }
        case 4: {
          // Notifications - optional, always valid
          break
        }
      }

      return { valid: errors.length === 0, errors }
    },
    [state],
  )

  // ── Convert to API Input ──

  const toCreateInput = useCallback((): CreateAutomationRuleInput => {
    return {
      name: state.name,
      description: state.description || undefined,
      platform: state.platform,
      connectionIds: state.connectionIds,
      adAccountIds: state.adAccountIds,
      googleCampaignType:
        (state.googleCampaignType as GoogleCampaignType) || undefined,
      level: state.level,
      filters: state.filters,
      tasks: state.tasks,
      schedule: state.schedule,
      timezone: state.timezone,
      attribution: state.attribution,
      notifications: state.notifications,
    }
  }, [state])

  // ── Computed ──

  const isValid = useMemo(() => {
    return Array.from({ length: TOTAL_STEPS }, (_, i) => i).every(
      (s) => validateStep(s).valid,
    )
  }, [validateStep])

  return {
    state,
    setState,
    currentStep,
    goToStep,
    nextStep,
    prevStep,
    updateField,
    addTask,
    duplicateTask,
    removeTask,
    updateTask,
    validateStep,
    toCreateInput,
    isValid,
  }
}
