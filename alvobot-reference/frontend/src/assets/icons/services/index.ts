// Service icons - official brand-inspired SVGs
import googleAdManager from './google-ad-manager.svg'
import googleAds from './google-ads.svg'
import googleAdSense from './google-adsense.svg'
import googleAnalytics from './google-analytics.svg'
import googleSearchConsole from './google-search-console.svg'
import metaAds from './meta-ads.svg'
import metaMessages from './meta-messages.svg'
import meta from './meta.svg'

export const serviceIcons = {
  // Google services
  analytics: googleAnalytics,
  search_console: googleSearchConsole,
  adsense: googleAdSense,
  ad_manager: googleAdManager,
  ads: googleAds,
  // Meta services
  meta,
  meta_ads: metaAds,
  messages: metaMessages,
} as const

export type ServiceIconKey = keyof typeof serviceIcons
