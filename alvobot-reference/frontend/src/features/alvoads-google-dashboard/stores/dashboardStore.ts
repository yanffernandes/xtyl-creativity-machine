import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { workspaceDependentRegistry } from '@/shared/hooks/useWorkspaceChangeGuard'
import type { DashboardPeriod, CampaignStatus, SortConfig } from '../types'

export interface DashboardFilters {
  period: DashboardPeriod
  startDate?: string
  endDate?: string
  status: CampaignStatus | 'all'
  search: string
  connectionId?: string
}

export interface DashboardState {
  // Filters
  filters: DashboardFilters

  // Sorting
  sortConfig: SortConfig

  // UI State
  selectedCampaignIds: string[]
  isRefreshing: boolean

  // Computed getters
  period: DashboardPeriod

  // Actions
  setFilters: (filters: Partial<DashboardFilters>) => void
  setPeriod: (period: DashboardPeriod) => void
  setDateRange: (startDate: string, endDate: string) => void
  setStatusFilter: (status: CampaignStatus | 'all') => void
  setSearch: (search: string) => void
  setConnectionId: (connectionId: string) => void
  setSortConfig: (config: SortConfig) => void
  toggleCampaignSelection: (campaignId: string) => void
  selectAllCampaigns: (campaignIds: string[]) => void
  clearSelection: () => void
  setIsRefreshing: (isRefreshing: boolean) => void
  resetFilters: () => void
  /** Full reset for workspace change */
  reset: () => void
}

const defaultFilters: DashboardFilters = {
  period: 'last_7d',
  status: 'all',
  search: '',
}

const defaultSortConfig: SortConfig = {
  key: 'cost',
  direction: 'desc',
}

export const useDashboardStore = create<DashboardState>()(
  persist(
    (set, get) => ({
      // Initial state
      filters: defaultFilters,
      sortConfig: defaultSortConfig,
      selectedCampaignIds: [],
      isRefreshing: false,

      // Computed getters
      get period() {
        return get().filters.period
      },

      // Actions
      setFilters: (newFilters) =>
        set((state) => ({
          filters: { ...state.filters, ...newFilters },
        })),

      setPeriod: (period) =>
        set((state) => ({
          filters: {
            ...state.filters,
            period,
            // Clear custom dates if not custom period
            startDate: period === 'custom' ? state.filters.startDate : undefined,
            endDate: period === 'custom' ? state.filters.endDate : undefined,
          },
        })),

      setDateRange: (startDate, endDate) =>
        set((state) => ({
          filters: {
            ...state.filters,
            period: 'custom',
            startDate,
            endDate,
          },
        })),

      setStatusFilter: (status) =>
        set((state) => ({
          filters: { ...state.filters, status },
        })),

      setSearch: (search) =>
        set((state) => ({
          filters: { ...state.filters, search },
        })),

      setConnectionId: (connectionId) =>
        set((state) => ({
          filters: { ...state.filters, connectionId },
          // Clear selection when changing connection
          selectedCampaignIds: [],
        })),

      setSortConfig: (sortConfig) => set({ sortConfig }),

      toggleCampaignSelection: (campaignId) =>
        set((state) => {
          const isSelected = state.selectedCampaignIds.includes(campaignId)
          return {
            selectedCampaignIds: isSelected
              ? state.selectedCampaignIds.filter((id) => id !== campaignId)
              : [...state.selectedCampaignIds, campaignId],
          }
        }),

      selectAllCampaigns: (campaignIds) =>
        set({ selectedCampaignIds: campaignIds }),

      clearSelection: () => set({ selectedCampaignIds: [] }),

      setIsRefreshing: (isRefreshing) => set({ isRefreshing }),

      resetFilters: () =>
        set({
          filters: {
            ...defaultFilters,
            connectionId: get().filters.connectionId, // Keep connection
          },
          sortConfig: defaultSortConfig,
          selectedCampaignIds: [],
        }),

      reset: () =>
        set({
          filters: defaultFilters,
          sortConfig: defaultSortConfig,
          selectedCampaignIds: [],
          isRefreshing: false,
        }),
    }),
    {
      name: 'google-ads-dashboard-store',
      // Only persist filters and sort config, not transient state
      partialize: (state) => ({
        filters: state.filters,
        sortConfig: state.sortConfig,
      }),
    }
  )
)

// Register as workspace-dependent (filters contain workspace-specific connectionId)
workspaceDependentRegistry.register('googleAdsDashboard', {
  reset: () => useDashboardStore.getState().reset(),
})
