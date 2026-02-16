import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { workspaceDependentRegistry } from '@/shared/hooks/useWorkspaceChangeGuard'
import type { AdsPlatform, DashboardTab, DashboardPeriod, UnifiedAdsFilters } from '../types'

interface UnifiedAdsState {
  // Platform selection
  selectedPlatforms: AdsPlatform[]
  setSelectedPlatforms: (platforms: AdsPlatform[]) => void
  togglePlatform: (platform: AdsPlatform) => void

  // Active tab
  activeTab: DashboardTab
  setActiveTab: (tab: DashboardTab) => void

  // Filters
  filters: UnifiedAdsFilters
  setPeriod: (period: DashboardPeriod) => void
  setDateRange: (startDate: string, endDate: string) => void
  setConnectionIds: (ids: string[]) => void
  setSearch: (search: string) => void
  resetFilters: () => void
  /** Full reset for workspace change (resets everything including platforms) */
  reset: () => void
}

const DEFAULT_FILTERS: UnifiedAdsFilters = {
  platforms: ['google'],
  period: 'last_7d',
  startDate: undefined,
  endDate: undefined,
  connectionIds: [],
  search: '',
}

export const useUnifiedAdsStore = create<UnifiedAdsState>()(
  persist(
    (set, get) => ({
      // Platform selection - default to Google only
      selectedPlatforms: ['google'],
      setSelectedPlatforms: (platforms) => {
        set({ selectedPlatforms: platforms })
        // Also update filters.platforms for consistency
        set((state) => ({
          filters: { ...state.filters, platforms },
        }))
      },
      togglePlatform: (platform) => {
        const current = get().selectedPlatforms
        let next: AdsPlatform[]

        if (current.includes(platform)) {
          // Don't allow removing last platform
          if (current.length === 1) return
          next = current.filter((p) => p !== platform)
        } else {
          next = [...current, platform]
        }

        set({ selectedPlatforms: next })
        set((state) => ({
          filters: { ...state.filters, platforms: next },
        }))
      },

      // Active tab
      activeTab: 'performance',
      setActiveTab: (tab) => set({ activeTab: tab }),

      // Filters
      filters: DEFAULT_FILTERS,
      setPeriod: (period) =>
        set((state) => ({
          filters: { ...state.filters, period },
        })),
      setDateRange: (startDate, endDate) =>
        set((state) => ({
          filters: { ...state.filters, startDate, endDate, period: 'custom' },
        })),
      setConnectionIds: (connectionIds) =>
        set((state) => ({
          filters: { ...state.filters, connectionIds },
        })),
      setSearch: (search) =>
        set((state) => ({
          filters: { ...state.filters, search },
        })),
      resetFilters: () =>
        set((state) => ({
          filters: { ...DEFAULT_FILTERS, platforms: state.selectedPlatforms },
        })),
      reset: () =>
        set({
          selectedPlatforms: ['google'],
          activeTab: 'performance',
          filters: DEFAULT_FILTERS,
        }),
    }),
    {
      name: 'unified-ads-store',
      // Only persist these fields
      partialize: (state) => ({
        selectedPlatforms: state.selectedPlatforms,
        activeTab: state.activeTab,
        filters: {
          platforms: state.filters.platforms,
          period: state.filters.period,
          startDate: state.filters.startDate,
          endDate: state.filters.endDate,
          connectionIds: state.filters.connectionIds,
          search: state.filters.search,
        },
      }),
    }
  )
)

// Selector hooks for convenience
export const useSelectedPlatforms = () => useUnifiedAdsStore((state) => state.selectedPlatforms)
export const useActiveTab = () => useUnifiedAdsStore((state) => state.activeTab)
export const useAdsFilters = () => useUnifiedAdsStore((state) => state.filters)

// Register as workspace-dependent (filters contain workspace-specific connectionIds)
workspaceDependentRegistry.register('unifiedAds', {
  reset: () => useUnifiedAdsStore.getState().reset(),
})
