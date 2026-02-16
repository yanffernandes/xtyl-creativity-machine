/**
 * usePendingGenerationsPolling Hook
 *
 * Polls the backend for pending image generation statuses.
 * When the backend cron job completes a pending generation,
 * this hook detects the status change and updates the UI.
 *
 * Polling is automatically enabled when there are pending slots
 * and disabled when all slots are resolved.
 */

import { useEffect, useMemo, useCallback, useRef } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from '@/shared/utils/api'
import { creativeQueryKeys } from '../api/useCreatives'
import type { CreativeSlot } from '../types/creative'

interface PendingStatus {
  id: string
  status: string
  error_message: string | null
  image_url: string | null
  storage_path: string | null
  creative?: {
    id: string
    imageUrl: string
    storagePath: string
  }
}

interface UsePendingGenerationsPollingOptions {
  /** Polling interval in ms (default: 5000) */
  pollingInterval?: number
  /** Callback when a pending generation completes */
  onComplete?: (pendingId: string, creative: { id: string; imageUrl: string; storagePath: string }) => void
  /** Callback when a pending generation fails */
  onFailed?: (pendingId: string, error: string) => void
}

export function usePendingGenerationsPolling(
  slots: CreativeSlot[],
  options: UsePendingGenerationsPollingOptions = {},
) {
  const { pollingInterval = 5000, onComplete, onFailed } = options
  const queryClient = useQueryClient()

  // Stable refs for callbacks to avoid triggering effect re-runs
  const onCompleteRef = useRef(onComplete)
  const onFailedRef = useRef(onFailed)
  onCompleteRef.current = onComplete
  onFailedRef.current = onFailed

  // Track which IDs we've already processed to avoid duplicate callbacks
  const processedIdsRef = useRef<Set<string>>(new Set())

  // Extract pending IDs from slots
  const pendingIds = useMemo(
    () =>
      slots
        .filter((s) => s.isPending && s.pendingId)
        .map((s) => s.pendingId!)
        .filter((id) => !processedIdsRef.current.has(id)),
    [slots],
  )

  const hasPending = pendingIds.length > 0

  // Batch query for pending statuses
  const { data: pendingStatuses } = useQuery({
    queryKey: ['pending-generations', 'batch', pendingIds],
    queryFn: async (): Promise<PendingStatus[]> => {
      if (pendingIds.length === 0) return []
      return api.get<PendingStatus[]>(
        `/meta/creatives/pending/batch?ids=${pendingIds.join(',')}`,
      )
    },
    refetchInterval: hasPending ? pollingInterval : false,
    enabled: hasPending,
    staleTime: 0, // Always refetch to get latest status
  })

  // Process status changes
  const processStatusChanges = useCallback(
    (statuses: PendingStatus[]) => {
      for (const item of statuses) {
        // Skip already processed
        if (processedIdsRef.current.has(item.id)) continue

        if (item.status === 'completed' && item.creative) {
          processedIdsRef.current.add(item.id)
          onCompleteRef.current?.(item.id, item.creative)

          // Invalidate creative library to show new images
          queryClient.invalidateQueries({ queryKey: creativeQueryKeys.all })
        } else if (item.status === 'failed' || item.status === 'expired') {
          processedIdsRef.current.add(item.id)
          onFailedRef.current?.(
            item.id,
            item.error_message || 'Geração falhou',
          )
        }
        // 'pending' status: keep polling
      }
    },
    [queryClient],
  )

  // React to data changes
  useEffect(() => {
    if (pendingStatuses && pendingStatuses.length > 0) {
      processStatusChanges(pendingStatuses)
    }
  }, [pendingStatuses, processStatusChanges])

  // Reset processed IDs when slots change significantly (new generation session)
  useEffect(() => {
    const currentPendingIds = new Set(
      slots.filter((s) => s.isPending && s.pendingId).map((s) => s.pendingId!),
    )

    // Remove IDs from processed that are no longer in slots
    for (const processedId of processedIdsRef.current) {
      if (!currentPendingIds.has(processedId)) {
        processedIdsRef.current.delete(processedId)
      }
    }
  }, [slots])

  return {
    pendingCount: pendingIds.length,
    isPolling: hasPending,
    pendingStatuses: pendingStatuses || [],
  }
}
