/**
 * useStreamingCreatives Hook
 * Manages real-time creative generation with SSE streaming
 */

import { useState, useCallback, useRef, useEffect } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '@/shared/utils/api'
import { supabase } from '@/shared/utils/supabase'
import { usePendingGenerationsPolling } from './usePendingGenerationsPolling'
import { creativeQueryKeys } from '../api/useCreatives'
import type {
  InitCreativeGenerationRequest,
  InitCreativeGenerationResponse,
  CreativeSlot,
  CreativeStreamEvent,
} from '../types/creative'

interface UseStreamingCreativesOptions {
  onSlotUpdate?: (slot: CreativeSlot) => void
  onComplete?: (results: { totalGenerated: number; totalFailed: number }) => void
  onError?: (error: Error) => void
}

interface StreamingState {
  isConnected: boolean
  sessionId: string | null
  workspaceId: string | null
  slots: CreativeSlot[]
  totalGenerated: number
  totalFailed: number
  totalPending: number
  isComplete: boolean
  diversity?: {
    uniqueConcepts: number
    uniqueBackgrounds: number
    uniqueModels: number
    diversityScore: number
  }
}

export function useStreamingCreatives(options: UseStreamingCreativesOptions = {}) {
  const queryClient = useQueryClient()
  const eventSourceRef = useRef<EventSource | null>(null)
  const [state, setState] = useState<StreamingState>({
    isConnected: false,
    sessionId: null,
    workspaceId: null,
    slots: [],
    totalGenerated: 0,
    totalFailed: 0,
    totalPending: 0,
    isComplete: false,
  })

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (eventSourceRef.current) {
        eventSourceRef.current.close()
      }
    }
  }, [])

  // Handle SSE events
  const handleEvent = useCallback(
    (event: CreativeStreamEvent) => {
      setState((prev) => {
        const newSlots = [...prev.slots]

        switch (event.type) {
          case 'started':
            return { ...prev, isConnected: true }

          case 'queued': {
            const queuedIdx = newSlots.findIndex((s) => s.imageId === event.imageId)
            if (queuedIdx >= 0) {
              newSlots[queuedIdx] = {
                ...newSlots[queuedIdx],
                status: 'queued',
                conceptName: event.conceptName,
              }
            }
            return { ...prev, slots: newSlots }
          }

          case 'generating': {
            const genIdx = newSlots.findIndex((s) => s.imageId === event.imageId)
            if (genIdx >= 0) {
              newSlots[genIdx] = {
                ...newSlots[genIdx],
                status: 'generating',
                modelUsed: event.model,
              }
              options.onSlotUpdate?.(newSlots[genIdx])
            }
            return { ...prev, slots: newSlots }
          }

          case 'completed': {
            const compIdx = newSlots.findIndex((s) => s.imageId === event.imageId)
            if (compIdx >= 0) {
              newSlots[compIdx] = {
                ...newSlots[compIdx],
                status: 'completed',
                imageUrl: event.imageUrl,
                storagePath: event.storagePath,
                modelUsed: event.modelUsed,
                backgroundStyle: event.backgroundStyle,
                libraryId: event.libraryId,
                promptUsed: event.promptUsed,
                conceptName: event.conceptUsed?.name,
                conceptSlug: event.conceptUsed?.slug,
              }
              options.onSlotUpdate?.(newSlots[compIdx])
            }
            return {
              ...prev,
              slots: newSlots,
              totalGenerated: prev.totalGenerated + 1,
            }
          }

          case 'failed': {
            const failIdx = newSlots.findIndex((s) => s.imageId === event.imageId)
            if (failIdx >= 0) {
              newSlots[failIdx] = {
                ...newSlots[failIdx],
                status: 'failed',
                error: event.error,
                canRetry: event.canRetry,
                isPending: event.isPending,
                pendingId: event.pendingId,
              }
              options.onSlotUpdate?.(newSlots[failIdx])
            }
            return {
              ...prev,
              slots: newSlots,
              totalFailed: event.isPending ? prev.totalFailed : prev.totalFailed + 1,
              totalPending: event.isPending ? prev.totalPending + 1 : prev.totalPending,
            }
          }

          case 'retrying': {
            const retryIdx = newSlots.findIndex((s) => s.imageId === event.imageId)
            if (retryIdx >= 0) {
              newSlots[retryIdx] = {
                ...newSlots[retryIdx],
                status: 'retrying',
                retryAttempt: event.attempt,
                maxRetryAttempts: event.maxAttempts,
              }
              options.onSlotUpdate?.(newSlots[retryIdx])
            }
            return { ...prev, slots: newSlots }
          }

          case 'done':
            options.onComplete?.({
              totalGenerated: event.totalGenerated,
              totalFailed: event.totalFailed,
            })
            return {
              ...prev,
              isComplete: true,
              isConnected: false,
              totalGenerated: event.totalGenerated,
              totalFailed: event.totalFailed,
              totalPending: event.totalPending,
              diversity: event.diversity,
            }

          default:
            return prev
        }
      })
    },
    [options],
  )

  // Connect to SSE stream
  const connectToStream = useCallback(
    async (sessionId: string) => {
      if (eventSourceRef.current) {
        eventSourceRef.current.close()
      }

      const baseUrl = import.meta.env.VITE_API_URL || ''

      // Get token from Supabase session (EventSource doesn't support custom headers)
      const {
        data: { session },
      } = await supabase.auth.getSession()
      const token = session?.access_token || ''

      // Note: EventSource doesn't support custom headers, so we pass token in query
      const url = `${baseUrl}/meta/creatives/generate/stream?sessionId=${sessionId}&token=${token}`

      const eventSource = new EventSource(url, { withCredentials: true })
      // eslint-disable-next-line require-atomic-updates
      eventSourceRef.current = eventSource

      eventSource.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data)

          // Handle sync event (initial state on reconnection)
          if (data.type === 'sync') {
            setState((prev) => ({
              ...prev,
              slots: data.slots,
              isConnected: true,
            }))
            return
          }

          handleEvent(data as CreativeStreamEvent)
        } catch (error) {
          console.error('Failed to parse SSE event:', error)
        }
      }

      eventSource.onerror = (error) => {
        console.error('SSE connection error:', error)
        setState((prev) => ({ ...prev, isConnected: false }))
        options.onError?.(new Error('Conexão perdida com o servidor'))
      }
    },
    [handleEvent, options],
  )

  // Initialize generation mutation
  const initMutation = useMutation({
    mutationFn: async (
      data: InitCreativeGenerationRequest,
    ): Promise<InitCreativeGenerationResponse> => {
      return api.post<InitCreativeGenerationResponse>('/meta/creatives/generate/init', data)
    },
    onSuccess: (response, variables) => {
      setState({
        isConnected: false,
        sessionId: response.sessionId,
        workspaceId: variables.workspaceId || null,
        slots: response.images,
        totalGenerated: 0,
        totalFailed: 0,
        totalPending: 0,
        isComplete: false,
      })

      // Connect to SSE stream
      connectToStream(response.sessionId)
    },
    onError: (error) => {
      options.onError?.(error instanceof Error ? error : new Error('Erro ao iniciar geração'))
    },
  })

  // Retry a failed image
  const retryMutation = useMutation({
    mutationFn: async ({ sessionId, imageId, workspaceId }: { sessionId: string; imageId: string; workspaceId?: string }) => {
      return api.post('/meta/creatives/generate/retry', { sessionId, imageId, workspaceId })
    },
  })

  // Check pending image status (legacy - kept for manual check)
  const checkPendingMutation = useMutation({
    mutationFn: async (pendingId: string) => {
      return api.post<{
        status: 'pending' | 'completed' | 'failed' | 'expired'
        message: string
        creative?: { id: string; imageUrl: string; storagePath: string }
      }>(`/meta/creatives/pending/${pendingId}/check`, {})
    },
    onSuccess: (result, pendingId) => {
      if (result.status === 'completed' && result.creative) {
        // Update the slot with completed data
        setState((prev) => {
          const newSlots = prev.slots.map((slot) => {
            if (slot.pendingId === pendingId) {
              return {
                ...slot,
                status: 'completed' as const,
                imageUrl: result.creative!.imageUrl,
                storagePath: result.creative!.storagePath,
                libraryId: result.creative!.id,
                isPending: false,
                pendingId: undefined,
              }
            }
            return slot
          })
          return {
            ...prev,
            slots: newSlots,
            totalGenerated: prev.totalGenerated + 1,
            totalPending: prev.totalPending - 1,
          }
        })

        // Invalidate library
        queryClient.invalidateQueries({ queryKey: creativeQueryKeys.all })
      }
    },
  })

  // Automatic polling for pending generations (backend cron completes them)
  const handlePendingComplete = useCallback(
    (pendingId: string, creative: { id: string; imageUrl: string; storagePath: string }) => {
      setState((prev) => {
        const newSlots = prev.slots.map((slot) => {
          if (slot.pendingId === pendingId) {
            return {
              ...slot,
              status: 'completed' as const,
              imageUrl: creative.imageUrl,
              storagePath: creative.storagePath,
              libraryId: creative.id,
              isPending: false,
              pendingId: undefined,
            }
          }
          return slot
        })

        // Only update counts if we actually changed a slot
        const changed = newSlots.some(
          (s, i) => s.status !== prev.slots[i]?.status,
        )

        return changed
          ? {
              ...prev,
              slots: newSlots,
              totalGenerated: prev.totalGenerated + 1,
              totalPending: Math.max(0, prev.totalPending - 1),
            }
          : prev
      })
    },
    [],
  )

  const handlePendingFailed = useCallback(
    (pendingId: string, error: string) => {
      setState((prev) => {
        const newSlots = prev.slots.map((slot) => {
          if (slot.pendingId === pendingId) {
            return {
              ...slot,
              status: 'failed' as const,
              error,
              isPending: false,
              pendingId: undefined,
              canRetry: false,
            }
          }
          return slot
        })

        const changed = newSlots.some(
          (s, i) => s.status !== prev.slots[i]?.status,
        )

        return changed
          ? {
              ...prev,
              slots: newSlots,
              totalFailed: prev.totalFailed + 1,
              totalPending: Math.max(0, prev.totalPending - 1),
            }
          : prev
      })
    },
    [],
  )

  const { pendingCount, isPolling } = usePendingGenerationsPolling(
    state.slots,
    {
      pollingInterval: 5000,
      onComplete: handlePendingComplete,
      onFailed: handlePendingFailed,
    },
  )

  // Cancel generation
  const cancel = useCallback(() => {
    if (eventSourceRef.current) {
      eventSourceRef.current.close()
      eventSourceRef.current = null
    }
    setState((prev) => ({
      ...prev,
      isConnected: false,
    }))
  }, [])

  // Reset state
  const reset = useCallback(() => {
    cancel()
    setState({
      isConnected: false,
      sessionId: null,
      workspaceId: null,
      slots: [],
      totalGenerated: 0,
      totalFailed: 0,
      totalPending: 0,
      isComplete: false,
    })
  }, [cancel])

  // Retry wrapper with session ID and workspace ID
  const retryImage = useCallback(
    (imageId: string) => {
      if (state.sessionId) {
        retryMutation.mutate({ sessionId: state.sessionId, imageId, workspaceId: state.workspaceId || undefined })
      }
    },
    [state.sessionId, state.workspaceId, retryMutation],
  )

  return {
    // State
    ...state,
    isGenerating: initMutation.isPending || state.isConnected,

    // Actions
    startGeneration: initMutation.mutate,
    retryImage,
    checkPending: checkPendingMutation.mutate,
    cancel,
    reset,

    // Loading states
    isInitializing: initMutation.isPending,
    isRetrying: retryMutation.isPending,
    isCheckingPending: checkPendingMutation.isPending,

    // Polling state
    pendingCount,
    isPolling,

    // Error
    initError: initMutation.error,
  }
}
