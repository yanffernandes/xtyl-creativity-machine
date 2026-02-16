import { useState, useCallback, useMemo, useRef, useEffect } from 'react'
import type { GoogleAdsFilters } from '../types'

const DEFAULT_FILTERS: GoogleAdsFilters = {
  search: '',
  advertiserId: null,
  format: null,
  isRandomOrder: false,
}

const DEBOUNCE_DELAY = 300

export function useAdFilters() {
  const [filters, setFilters] = useState<GoogleAdsFilters>(DEFAULT_FILTERS)
  const [debouncedFilters, setDebouncedFilters] = useState<GoogleAdsFilters>(DEFAULT_FILTERS)
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Debounce the search filter
  useEffect(() => {
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current)
    }

    debounceTimerRef.current = setTimeout(() => {
      setDebouncedFilters(filters)
    }, DEBOUNCE_DELAY)

    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current)
      }
    }
  }, [filters])

  const updateFilters = useCallback((updates: Partial<GoogleAdsFilters>) => {
    setFilters((prev) => ({ ...prev, ...updates }))
  }, [])

  const clearFilters = useCallback(() => {
    setFilters(DEFAULT_FILTERS)
    setDebouncedFilters(DEFAULT_FILTERS)
  }, [])

  const hasActiveFilters = useMemo(() => {
    return (
      filters.search !== '' ||
      filters.advertiserId !== null ||
      filters.format !== null ||
      filters.isRandomOrder
    )
  }, [filters])

  return {
    filters,
    debouncedFilters,
    updateFilters,
    clearFilters,
    hasActiveFilters,
  }
}
