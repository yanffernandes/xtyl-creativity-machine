import { useRef, useCallback, useEffect } from 'react'
import pLimit from 'p-limit'

/**
 * Hook that provides a concurrency-limited prefetch function.
 *
 * This implements the "Concurrency Limits" pattern from the data fetching checklist:
 * - Limits the number of parallel prefetch requests to avoid flooding the API
 * - Uses p-limit library for proper concurrency control
 * - Prevents excessive requests when user quickly hovers over multiple rows
 *
 * @param concurrency Maximum number of concurrent prefetch operations (default: 3)
 * @returns A function that wraps async operations with concurrency limiting
 */
export function usePrefetchLimiter(concurrency = 3) {
  // Create a stable limiter instance
  const limiterRef = useRef<ReturnType<typeof pLimit> | null>(null)

  // Initialize limiter on first use
  if (!limiterRef.current) {
    limiterRef.current = pLimit(concurrency)
  }

  // Track pending count for debugging/monitoring
  const pendingCountRef = useRef(0)

  // Update concurrency if it changes
  useEffect(() => {
    if (limiterRef.current) {
      limiterRef.current.concurrency = concurrency
    }
  }, [concurrency])

  /**
   * Execute an async function with concurrency limiting.
   * Returns a promise that resolves when the function completes.
   * If concurrency limit is reached, the function is queued.
   */
  const limitedExecute = useCallback(<T>(fn: () => Promise<T>): Promise<T> => {
    if (!limiterRef.current) {
      return fn()
    }

    pendingCountRef.current++

    return limiterRef.current(async () => {
      try {
        return await fn()
      } finally {
        pendingCountRef.current--
      }
    })
  }, [])

  /**
   * Get the current number of pending operations.
   */
  const getPendingCount = useCallback(() => {
    return limiterRef.current?.pendingCount ?? 0
  }, [])

  /**
   * Get the current number of active operations.
   */
  const getActiveCount = useCallback(() => {
    return limiterRef.current?.activeCount ?? 0
  }, [])

  /**
   * Clear all pending operations (active ones will still complete).
   */
  const clearPending = useCallback(() => {
    if (limiterRef.current) {
      limiterRef.current.clearQueue()
    }
  }, [])

  return {
    limitedExecute,
    getPendingCount,
    getActiveCount,
    clearPending,
  }
}
