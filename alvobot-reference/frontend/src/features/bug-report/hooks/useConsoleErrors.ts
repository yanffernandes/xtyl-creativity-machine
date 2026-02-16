import { useEffect, useRef, useCallback, useState } from 'react'
import type { ConsoleError } from '../types'

const MAX_ERRORS = 50

/**
 * Hook to capture console errors and warnings
 * Maintains a circular buffer of the last 50 errors
 */
export function useConsoleErrors() {
  const [errors, setErrors] = useState<ConsoleError[]>([])
  const originalErrorRef = useRef<typeof console.error | null>(null)
  const originalWarnRef = useRef<typeof console.warn | null>(null)
  const isInitializedRef = useRef(false)

  const addError = useCallback((error: ConsoleError) => {
    setErrors((prev) => {
      const newErrors = [...prev, error]
      // Keep only the last MAX_ERRORS entries
      if (newErrors.length > MAX_ERRORS) {
        return newErrors.slice(-MAX_ERRORS)
      }
      return newErrors
    })
  }, [])

  const captureConsoleArgs = useCallback(
    (type: 'error' | 'warn', args: unknown[]) => {
      const message = args
        .map((arg) => {
          if (arg instanceof Error) {
            return arg.message
          }
          if (typeof arg === 'object') {
            try {
              return JSON.stringify(arg)
            } catch {
              return String(arg)
            }
          }
          return String(arg)
        })
        .join(' ')

      // Extract stack from Error objects
      let stack: string | undefined
      for (const arg of args) {
        if (arg instanceof Error && arg.stack) {
          stack = arg.stack
          break
        }
      }

      addError({
        type,
        message,
        stack,
        timestamp: Date.now(),
        url: window.location.href,
      })
    },
    [addError]
  )

  useEffect(() => {
    // Prevent multiple initializations
    if (isInitializedRef.current) return
    isInitializedRef.current = true

    // Store original console methods
    originalErrorRef.current = console.error
    originalWarnRef.current = console.warn

    // Override console.error
    console.error = (...args: unknown[]) => {
      captureConsoleArgs('error', args)
      originalErrorRef.current?.apply(console, args)
    }

    // Override console.warn
    console.warn = (...args: unknown[]) => {
      captureConsoleArgs('warn', args)
      originalWarnRef.current?.apply(console, args)
    }

    // Global error handler for uncaught errors
    const handleGlobalError = (event: ErrorEvent) => {
      addError({
        type: 'error',
        message: event.message,
        stack: event.error?.stack,
        timestamp: Date.now(),
        url: event.filename || window.location.href,
      })
    }

    // Global handler for unhandled promise rejections
    const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
      const reason = event.reason
      const message =
        reason instanceof Error
          ? reason.message
          : typeof reason === 'string'
            ? reason
            : 'Unhandled Promise Rejection'

      addError({
        type: 'error',
        message: `Unhandled Promise Rejection: ${message}`,
        stack: reason?.stack,
        timestamp: Date.now(),
        url: window.location.href,
      })
    }

    window.addEventListener('error', handleGlobalError)
    window.addEventListener('unhandledrejection', handleUnhandledRejection)

    // Cleanup function
    return () => {
      // Restore original console methods
      if (originalErrorRef.current) {
        console.error = originalErrorRef.current
      }
      if (originalWarnRef.current) {
        console.warn = originalWarnRef.current
      }

      window.removeEventListener('error', handleGlobalError)
      window.removeEventListener('unhandledrejection', handleUnhandledRejection)

      isInitializedRef.current = false
    }
  }, [addError, captureConsoleArgs])

  const clearErrors = useCallback(() => {
    setErrors([])
  }, [])

  const getErrors = useCallback(() => {
    return [...errors]
  }, [errors])

  return {
    errors,
    getErrors,
    clearErrors,
    errorCount: errors.length,
  }
}
