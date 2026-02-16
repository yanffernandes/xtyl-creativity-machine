// Query hooks
export {
  useUnifiedAutomations,
  useUnifiedHistory,
  useMetaAdAccounts,
  useMetaCreativeDetails,
  unifiedAdsKeys,
  // Unified search hooks
  useUnifiedAdsSearch,
  useProgressiveAdsSearch,
  useUnifiedAdsExpand,
  useUnifiedAdsPause,
  useUnifiedAdsEnable,
  useUnifiedAdsBudgetUpdate,
  usePrefetchCampaignHierarchy,
  usePrefetchAdSetHierarchy,
  useExpandCache,
  // Backfill
  useBackfillCampaignNames,
} from './queries'

// Types
export type { ProgressInfo } from './queries'
export type { MetaCampaignMetrics, MetaDashboardResponse } from './queries'

// Mutation hooks & utilities
export { fetchMetaCreativeDetails } from './mutations'

// Mutation types
export type { MetaAd, MetaAdMetrics, MetaCreativeDetails } from './mutations'

// AlvoBot campaign identification
export { useAlvobotCampaignIds } from './useAlvobotCampaignIds'
