// Legacy exports (kept for backward compatibility)
// Exclude useMetaAdAccounts and useMetaPages as they conflict with new wizard API
export {
  useMetaConnection,
  useMetaSubscribers,
  useMetaAdsData,
  useMetaStats,
  formatCurrency,
  formatNumber,
  formatPercentage,
  useMetaAdAccountsForConnection,
  type MetaPage as LegacyMetaPage,
  type MetaConnection,
  type MetaSubscriber,
  type MetaAdsScraper,
  type MetaStats,
  type MetaAdAccount as LegacyMetaAdAccount,
  type MetaConnectionWithAdAccounts,
} from './useMetaAds'

export * from './useMetaAdsConnections'

// Export specific items from useCampaigns to avoid conflicts with new mutations
// NOTE: useGenerateAdCopy is excluded as it conflicts with useCreatives version
export {
  useCampaignTemplates,
  useCampaignTemplate,
  useCreditCosts,
  useCampaignCreditsBalance,
  useGenerateImage,
  useCalculateCredits,
  type CampaignTemplate,
  type AdCopyVariation,
  type GenerateAdCopyParams,
  type GenerateImageParams,
  type CreditCosts,
  type CreditCalculation,
  type UserCredits,
  type CreativeSourceType,
} from './useCampaigns'

// New wizard API (these take precedence)
export * from './queries'

// Export specific items from mutations to avoid conflicts with useCreatives
export {
  useSaveTemplate,
  useDeleteTemplate,
  useDuplicateTemplate,
  usePublishCampaign,
  useGenerateAiImage,
  useGenerateHeadlines,
  // NOTE: useGenerateAdCopy is NOT exported here - use the one from useCreatives instead
} from './mutations'

// Creative AI generation API (useGenerateAdCopy comes from here)
export * from './useCreatives'

// T076: Concept and background fetching API (Andromeda Creative Diversity)
export * from './useConcepts'
