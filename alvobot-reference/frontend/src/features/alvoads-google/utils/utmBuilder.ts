/**
 * UTM Builder Utility
 * Generates UTM parameters following the UTMify pattern for Google Ads
 * Format: Name|ID (hybrid approach for readability + automation)
 */

// ========================
// Types
// ========================

export interface UtmConfig {
  // Campaign info (name|id format)
  campaignName: string
  campaignId?: string // Will use {campaignid} placeholder if not provided

  // Ad Group info (name|id format)
  adGroupName?: string
  adGroupId?: string // Will use {adgroupid} placeholder if not provided

  // Content identifier
  contentType: 'ad' | 'sitelink' | 'callout' | 'image' | 'video'
  contentName?: string // e.g., "principal", "contato", "sobre"
  contentId?: string // Will use {creative} placeholder if not provided

  // Use Google Ads dynamic placeholders
  useDynamicPlaceholders?: boolean
}

export interface UtmParams {
  utm_source: string
  utm_campaign: string
  utm_medium: string
  utm_content: string
  utm_term?: string
  keyword?: string
  device?: string
  network?: string
}

// ========================
// Helper Functions
// ========================

/**
 * Converts text to URL-safe slug
 * - Lowercase
 * - Replace spaces with hyphens
 * - Remove special characters
 * - Max 50 chars
 */
export function slugify(text: string, maxLength = 50): string {
  if (!text) return ''

  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // Remove accents
    .replace(/[^a-z0-9\s-]/g, '') // Remove special chars
    .replace(/\s+/g, '-') // Replace spaces with hyphens
    .replace(/-+/g, '-') // Replace multiple hyphens with single
    .replace(/^-|-$/g, '') // Remove leading/trailing hyphens
    .slice(0, maxLength)
}

/**
 * Creates the hybrid Name|ID format
 */
export function createHybridIdentifier(name: string, id: string): string {
  const slugName = slugify(name, 30)
  return `${slugName}|${id}`
}

/**
 * Parses a hybrid identifier back to name and id
 */
export function parseHybridIdentifier(hybrid: string): { name: string; id: string } {
  const [name, id] = hybrid.split('|')
  return { name: name || '', id: id || '' }
}

// ========================
// UTM Building Functions
// ========================

/**
 * Builds UTM parameters object
 */
export function buildUtmParams(config: UtmConfig): UtmParams {
  const {
    campaignName,
    campaignId,
    adGroupName,
    adGroupId,
    contentType,
    contentName,
    contentId,
    useDynamicPlaceholders = true,
  } = config

  // Campaign: name|id or name|{campaignid}
  const campaignSlug = slugify(campaignName, 30)
  const campaignIdPart = useDynamicPlaceholders ? '{campaignid}' : (campaignId || 'unknown')
  const utmCampaign = `${campaignSlug}|${campaignIdPart}`

  // Medium (Ad Group): name|id or name|{adgroupid}
  const adGroupSlug = adGroupName ? slugify(adGroupName, 25) : 'default'
  const adGroupIdPart = useDynamicPlaceholders ? '{adgroupid}' : (adGroupId || 'unknown')
  const utmMedium = `${adGroupSlug}|${adGroupIdPart}`

  // Content: type_name|id or type_name|{creative}
  const contentSlug = contentName ? slugify(contentName, 20) : 'main'
  const contentIdPart = useDynamicPlaceholders ? '{creative}' : (contentId || 'unknown')
  const utmContent = `${contentType}_${contentSlug}|${contentIdPart}`

  const params: UtmParams = {
    utm_source: 'google',
    utm_campaign: utmCampaign,
    utm_medium: utmMedium,
    utm_content: utmContent,
  }

  // Add dynamic placeholders for keyword tracking
  if (useDynamicPlaceholders) {
    params.utm_term = '{placement}::{keyword}' // UTMify format: placement::keyword
    params.keyword = '{keyword}'
    params.device = '{device}'
    params.network = '{network}'
  }

  return params
}

/**
 * Converts UTM params object to query string
 */
export function utmParamsToString(params: UtmParams): string {
  const entries = Object.entries(params)
    .filter(([, value]) => value !== undefined && value !== '')
    .map(([key, value]) => `${key}=${encodeURIComponent(value as string)}`)

  return entries.join('&')
}

/**
 * Removes existing UTM parameters from a URL
 */
export function stripUtmParams(url: string): string {
  if (!url) return url

  try {
    const urlObj = new URL(url)
    const paramsToRemove = [
      'utm_source', 'utm_campaign', 'utm_medium', 'utm_content', 'utm_term',
      'keyword', 'device', 'network'
    ]
    paramsToRemove.forEach(param => urlObj.searchParams.delete(param))

    // Return URL without trailing ? if no params left
    const result = urlObj.toString()
    return result.endsWith('?') ? result.slice(0, -1) : result
  } catch {
    // If URL parsing fails, try to remove params manually
    const [base] = url.split('?')
    return base
  }
}

/**
 * Appends UTM parameters to a URL
 * Always strips existing UTM params first to prevent duplication
 */
export function appendUtmToUrl(url: string, config: UtmConfig): string {
  if (!url) return url

  // First, strip any existing UTM parameters to prevent duplication
  const cleanUrl = stripUtmParams(url)

  const params = buildUtmParams(config)
  const queryString = utmParamsToString(params)

  // Check if URL already has query params
  const separator = cleanUrl.includes('?') ? '&' : '?'

  return `${cleanUrl}${separator}${queryString}`
}

/**
 * Builds a Google Ads tracking template (for account/campaign level)
 * This uses {lpurl} to preserve the landing page URL
 */
export function buildGoogleAdsTrackingTemplate(campaignName: string, adGroupName?: string): string {
  const campaignSlug = slugify(campaignName, 30)
  const adGroupSlug = adGroupName ? slugify(adGroupName, 25) : 'default'

  const params = [
    'utm_source=google',
    `utm_campaign=${campaignSlug}|{campaignid}`,
    `utm_medium=${adGroupSlug}|{adgroupid}`,
    'utm_content=ad|{creative}',
    'utm_term={placement}::{keyword}', // UTMify format
    'keyword={keyword}',
    'device={device}',
    'network={network}',
  ].join('&')

  return `{lpurl}?${params}`
}

/**
 * Builds a Final URL Suffix (alternative to tracking template)
 * This is appended directly to the final URL
 */
export function buildFinalUrlSuffix(campaignName: string, adGroupName?: string): string {
  const campaignSlug = slugify(campaignName, 30)
  const adGroupSlug = adGroupName ? slugify(adGroupName, 25) : 'default'

  return [
    'utm_source=google',
    `utm_campaign=${campaignSlug}|{campaignid}`,
    `utm_medium=${adGroupSlug}|{adgroupid}`,
    'utm_content=ad|{creative}',
    'utm_term={placement}::{keyword}', // UTMify format
    'keyword={keyword}',
    'device={device}',
    'network={network}',
  ].join('&')
}

// ========================
// Specialized URL Builders
// ========================

/**
 * Adds UTM to an ad's final URL
 */
export function buildAdFinalUrl(
  baseUrl: string,
  campaignName: string,
  adGroupName: string,
  adName?: string
): string {
  return appendUtmToUrl(baseUrl, {
    campaignName,
    adGroupName,
    contentType: 'ad',
    contentName: adName || 'principal',
    useDynamicPlaceholders: true,
  })
}

/**
 * Adds UTM to a sitelink URL
 */
export function buildSitelinkUrl(
  baseUrl: string,
  campaignName: string,
  adGroupName: string,
  sitelinkText: string
): string {
  return appendUtmToUrl(baseUrl, {
    campaignName,
    adGroupName,
    contentType: 'sitelink',
    contentName: sitelinkText,
    useDynamicPlaceholders: true,
  })
}

/**
 * Preview UTM string with Google Ads dynamic placeholders (for display purposes)
 * Shows the actual variables that Google will replace at runtime
 */
export function previewUtmString(config: Omit<UtmConfig, 'useDynamicPlaceholders'>): string {
  const params = buildUtmParams({
    ...config,
    useDynamicPlaceholders: true, // Always show Google's dynamic placeholders
  })

  return utmParamsToString(params)
}

// ========================
// Pre-Article URL Builder
// ========================

/**
 * Converts a normal article URL to a pre-article URL format
 * Normal: https://example.com/slug-do-artigo/
 * Pre-article: https://example.com/pre/slug-do-artigo/
 */
export function toPreArticleUrl(url: string): string {
  if (!url) return url

  try {
    const urlObj = new URL(url)
    // Extract the pathname and add /pre/ before the slug
    // e.g., /meu-artigo/ becomes /pre/meu-artigo/
    const pathname = urlObj.pathname
    // Remove leading slash, get the slug, and rebuild
    const parts = pathname.split('/').filter(Boolean)
    if (parts.length > 0) {
      urlObj.pathname = `/pre/${  parts.join('/')}`
      // Preserve trailing slash if original had one
      if (pathname.endsWith('/') && !urlObj.pathname.endsWith('/')) {
        urlObj.pathname += '/'
      }
    }
    return urlObj.toString()
  } catch {
    // Fallback: simple string replacement for the last path segment
    return url.replace(/\/([^/]+)\/?$/, '/pre/$1')
  }
}

/**
 * Gets the final article URL based on the usePreArticleUrl flag
 */
export function getArticleFinalUrl(articleUrl: string | undefined, usePreArticleUrl: boolean | undefined): string {
  if (!articleUrl) return ''
  if (usePreArticleUrl) {
    return toPreArticleUrl(articleUrl)
  }
  return articleUrl
}
