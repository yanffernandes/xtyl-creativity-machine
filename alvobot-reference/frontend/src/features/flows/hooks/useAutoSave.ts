import { useEffect, useRef, useCallback } from 'react'
import { useUpdateFlow, useCreateFlow } from '../api/mutations'
import { useFlowEditorStore } from '../stores/flowEditorStore'
import { validateFlow, formatValidationErrors } from '../utils/validateFlow'

interface UseAutoSaveOptions {
  debounceMs?: number
  enabled?: boolean
  projectId?: number
  onSaveSuccess?: (flowId: string) => void
}

export function useAutoSave({
  debounceMs = 2000,
  enabled = true,
  projectId,
  onSaveSuccess,
}: UseAutoSaveOptions = {}) {
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const updateMutation = useUpdateFlow()
  const createMutation = useCreateFlow()

  const {
    flowId,
    flowName,
    nodes,
    edges,
    isActive,
    utmEnabled,
    saveStatus,
    hasUnsavedChanges,
    startSaving,
    savingComplete,
    savingFailed,
    setValidationErrors,
    clearValidationErrors,
  } = useFlowEditorStore()

  // Clear timeout on unmount
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
      }
    }
  }, [])

  // Perform the actual save
  const performSave = useCallback(async () => {
    if (!enabled) return

    // Don't save if no name
    if (!flowName.trim()) {
      savingFailed('Nome do fluxo é obrigatório')
      return
    }

    // For new flows, require a project_id
    if (!flowId && !projectId) {
      // Don't auto-save new flows without project_id
      return
    }

    // Validate flow before saving
    const validationResult = validateFlow(nodes)
    if (!validationResult.isValid) {
      setValidationErrors(validationResult.errors)
      const errorMessage = formatValidationErrors(validationResult.errors)
      savingFailed(`Erros de validacao:\n${errorMessage}`)
      return
    }

    // Clear validation errors on successful validation
    clearValidationErrors()
    startSaving()

    try {
      if (flowId) {
        // Update existing flow
        await updateMutation.mutateAsync({
          id: flowId,
          name: flowName,
          nodes,
          edges,
          is_active: isActive,
          utm_enabled: utmEnabled,
        })
        savingComplete(new Date())
      } else if (projectId) {
        // Create new flow
        const newFlow = await createMutation.mutateAsync({
          name: flowName,
          nodes,
          edges,
          project_id: projectId,
          utm_enabled: utmEnabled,
        })
        savingComplete(new Date())
        onSaveSuccess?.(newFlow.id)
      }
    } catch (error) {
      savingFailed(error instanceof Error ? error.message : 'Erro ao salvar')
    }
  }, [
    enabled,
    flowId,
    flowName,
    nodes,
    edges,
    isActive,
    utmEnabled,
    projectId,
    startSaving,
    savingComplete,
    savingFailed,
    setValidationErrors,
    clearValidationErrors,
    updateMutation,
    createMutation,
    onSaveSuccess,
  ])

  // Debounced auto-save effect
  useEffect(() => {
    if (!enabled || !hasUnsavedChanges || saveStatus === 'saving') {
      return
    }

    // Clear previous timeout
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current)
    }

    // Set new timeout
    timeoutRef.current = setTimeout(() => {
      performSave()
    }, debounceMs)

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
      }
    }
  }, [enabled, hasUnsavedChanges, saveStatus, debounceMs, performSave])

  // Manual save (immediate, no debounce)
  const saveNow = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current)
    }
    performSave()
  }, [performSave])

  return {
    saveNow,
    isSaving: saveStatus === 'saving',
    isPending: updateMutation.isPending || createMutation.isPending,
  }
}
