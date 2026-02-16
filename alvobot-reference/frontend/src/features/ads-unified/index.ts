// Pages
export { UnifiedAdsDashboard } from './pages'

// Components
export {
  PlatformSelector,
  PlatformBadge,
  ObjectiveBadge,
  MetricCard,
  UnifiedPerformanceView,
  ConfirmActionModal,
  BudgetEditModal,
  UnifiedAutomationView,
  UnifiedHistoryView,
  HistoryFilters,
} from './components'

// Translation Utilities
export {
  CAMPAIGN_OBJECTIVES,
  OPTIMIZATION_GOALS,
  SPECIAL_AD_CATEGORIES,
  BID_STRATEGIES,
  AD_STATUS,
  CALL_TO_ACTIONS,
  getObjectiveInfo,
  getOptimizationGoalInfo,
  getSpecialAdCategoryInfo,
  getStatusInfo,
  getCTALabel,
  getBidStrategyInfo,
} from './utils'

// API Hooks
export {
  useUnifiedAutomations,
  useUnifiedHistory,
  unifiedAdsKeys,
} from './api'

// Store
export {
  useUnifiedAdsStore,
  useSelectedPlatforms,
  useActiveTab,
  useAdsFilters,
} from './stores/unifiedAdsStore'

// Types
export type {
  AdsPlatform,
  DashboardTab,
  DashboardPeriod,
  UnifiedCampaign,
  UnifiedCampaignStatus,
  UnifiedMetrics,
  UnifiedAutomationRule,
  UnifiedActionLog,
  UnifiedAdsFilters,
  PlatformAdapter,
  PlatformFeatures,
  FetchCampaignsParams,
  FetchHistoryParams,
  ActionSource,
  ActionStatus,
  ActionType,
} from './types'
