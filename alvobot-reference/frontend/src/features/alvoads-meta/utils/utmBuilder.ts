/**
 * Meta Ads UTM Builder Utility
 * Generates UTM parameters following the UTM-FY pattern for Meta Ads
 *
 * Meta dynamic placeholders:
 * - {{campaign.name}} - Campaign name
 * - {{campaign.id}} - Campaign ID
 * - {{adset.name}} - Ad Set name
 * - {{adset.id}} - Ad Set ID
 * - {{ad.name}} - Ad name
 * - {{ad.id}} - Ad ID
 * - {{placement}} - Placement (feed, story, etc)
 */


// ========================
// Types
// ========================

export interface MetaUtmConfig {
  // Campaign info
  campaignName?: string

  // Ad Set info
  adSetName?: string

  // Ad info
  adName?: string

  // Custom xcod prefix (for tracking system)
  xcodPrefix?: string

  // AlvoBot template ID for traceability
  templateId?: string
}

export interface MetaUtmParams {
  utm_source: string
  utm_campaign: string
  utm_medium: string
  utm_content: string
  utm_term: string
  xcod: string
}

// ========================
// Constants
// ========================

// Delimiter for xcod (chosen to avoid conflicts with URL encoding)
const XCOD_DELIMITER = 'hQwK21wXxR'

// Meta dynamic placeholders
const META_PLACEHOLDERS = {
  campaignName: '{{campaign.name}}',
  campaignId: '{{campaign.id}}',
  adSetName: '{{adset.name}}',
  adSetId: '{{adset.id}}',
  adName: '{{ad.name}}',
  adId: '{{ad.id}}',
  placement: '{{placement}}',
} as const

// ========================
// UTM Building Functions
// ========================

/**
 * Builds Meta UTM parameters with dynamic placeholders
 *
 * Format matches the UTM-FY pattern:
 * utm_source=FB
 * utm_campaign={{campaign.name}}|{{campaign.id}}
 * utm_medium={{adset.name}}|{{adset.id}}
 * utm_content={{ad.name}}|{{ad.id}}
 * utm_term={{placement}}
 * xcod=FB{delimiter}...
 */
export function buildMetaUtmParams(config: MetaUtmConfig = {}): MetaUtmParams {
  const { xcodPrefix = 'FB', templateId } = config

  // UTM Campaign: campaign.name|campaign.id
  const utmCampaign = `${META_PLACEHOLDERS.campaignName}|${META_PLACEHOLDERS.campaignId}`

  // UTM Medium: adset.name|adset.id
  const utmMedium = `${META_PLACEHOLDERS.adSetName}|${META_PLACEHOLDERS.adSetId}`

  // UTM Content: ad.name|ad.id
  const utmContent = `${META_PLACEHOLDERS.adName}|${META_PLACEHOLDERS.adId}`

  // UTM Term: placement
  const utmTerm = META_PLACEHOLDERS.placement

  // XCOD: tracking code with template ID + all identifiers
  const xcod = buildXcod(xcodPrefix, templateId)

  return {
    utm_source: 'FB',
    utm_campaign: utmCampaign,
    utm_medium: utmMedium,
    utm_content: utmContent,
    utm_term: utmTerm,
    xcod,
  }
}

/**
 * Builds the xcod tracking parameter
 *
 * Format: {prefix}{d}{templateId}{d}{campaign.name}|{campaign.id}{d}{adset.name}|{adset.id}{d}{ad.name}|{ad.id}{d}{placement}
 * where {d} = XCOD_DELIMITER
 *
 * The templateId allows tracing back to the AlvoBot template used to create the campaign
 */
function buildXcod(prefix: string, templateId?: string): string {
  // Use first 8 chars of template UUID or 'manual' if not provided
  const tplId = templateId ? templateId.substring(0, 8) : 'manual'

  const parts = [
    prefix,
    tplId,
    `${META_PLACEHOLDERS.campaignName}|${META_PLACEHOLDERS.campaignId}`,
    `${META_PLACEHOLDERS.adSetName}|${META_PLACEHOLDERS.adSetId}`,
    `${META_PLACEHOLDERS.adName}|${META_PLACEHOLDERS.adId}`,
    META_PLACEHOLDERS.placement,
  ]

  return parts.join(XCOD_DELIMITER)
}

/**
 * Builds the complete URL suffix for Meta Ads
 * This is the string that goes in the "URL Parameters" field
 */
export function buildMetaUrlSuffix(config: MetaUtmConfig = {}): string {
  const params = buildMetaUtmParams(config)

  const urlParams = [
    `utm_source=${params.utm_source}`,
    `utm_campaign=${params.utm_campaign}`,
    `utm_medium=${params.utm_medium}`,
    `utm_content=${params.utm_content}`,
    `utm_term=${params.utm_term}`,
    `xcod=${params.xcod}`,
  ]

  return urlParams.join('&')
}

/**
 * Builds a complete destination URL with UTM parameters
 */
export function buildMetaDestinationUrl(baseUrl: string, config: MetaUtmConfig = {}): string {
  if (!baseUrl) return ''

  // Remove trailing slash
  const cleanUrl = baseUrl.replace(/\/$/, '')

  // Check if URL already has parameters
  const hasParams = cleanUrl.includes('?')

  // Build UTM suffix
  const suffix = buildMetaUrlSuffix(config)

  // Append to URL
  return `${cleanUrl}${hasParams ? '&' : '?'}${suffix}`
}

// ========================
// Preview Functions
// ========================

/**
 * Generates a preview of UTM parameters with example values
 * Useful for showing users what the final URL will look like
 */
export function previewMetaUtmParams(config: {
  campaignName?: string
  campaignId?: string
  adSetName?: string
  adSetId?: string
  adName?: string
  adId?: string
  placement?: string
  templateId?: string
}): MetaUtmParams {
  const {
    campaignName = 'minha-campanha',
    campaignId = '123456789',
    adSetName = 'conjunto-1',
    adSetId = '987654321',
    adName = 'anuncio-1',
    adId = '111222333',
    placement = 'feed',
    templateId = 'b6f1065b',
  } = config

  return {
    utm_source: 'FB',
    utm_campaign: `${campaignName}|${campaignId}`,
    utm_medium: `${adSetName}|${adSetId}`,
    utm_content: `${adName}|${adId}`,
    utm_term: placement,
    xcod: `FB${XCOD_DELIMITER}${templateId}${XCOD_DELIMITER}${campaignName}|${campaignId}${XCOD_DELIMITER}${adSetName}|${adSetId}${XCOD_DELIMITER}${adName}|${adId}${XCOD_DELIMITER}${placement}`,
  }
}

/**
 * Generates a preview URL with example values
 */
export function previewMetaDestinationUrl(
  baseUrl: string,
  config?: Parameters<typeof previewMetaUtmParams>[0]
): string {
  if (!baseUrl) return ''

  const params = previewMetaUtmParams(config || {})

  const urlParams = [
    `utm_source=${params.utm_source}`,
    `utm_campaign=${encodeURIComponent(params.utm_campaign)}`,
    `utm_medium=${encodeURIComponent(params.utm_medium)}`,
    `utm_content=${encodeURIComponent(params.utm_content)}`,
    `utm_term=${encodeURIComponent(params.utm_term)}`,
    `xcod=${encodeURIComponent(params.xcod)}`,
  ]

  const cleanUrl = baseUrl.replace(/\/$/, '')
  const hasParams = cleanUrl.includes('?')

  return `${cleanUrl}${hasParams ? '&' : '?'}${urlParams.join('&')}`
}

// ========================
// Parsing Functions
// ========================

/**
 * Parses xcod back to components
 *
 * New format: {prefix}{d}{templateId}{d}{campaign}{d}{adset}{d}{ad}{d}{placement}
 */
export function parseXcod(xcod: string): {
  prefix: string
  templateId: string
  campaign: { name: string; id: string }
  adSet: { name: string; id: string }
  ad: { name: string; id: string }
  placement: string
} | null {
  if (!xcod) return null

  const parts = xcod.split(XCOD_DELIMITER)
  if (parts.length < 6) return null

  const parseNameId = (part: string): { name: string; id: string } => {
    const [name, id] = part.split('|')
    return { name: name || '', id: id || '' }
  }

  return {
    prefix: parts[0],
    templateId: parts[1],
    campaign: parseNameId(parts[2]),
    adSet: parseNameId(parts[3]),
    ad: parseNameId(parts[4]),
    placement: parts[5],
  }
}

/**
 * Extracts UTM parameters from a URL
 */
export function extractUtmFromUrl(url: string): Partial<MetaUtmParams> | null {
  if (!url) return null

  try {
    const urlObj = new URL(url)
    const params = urlObj.searchParams

    return {
      utm_source: params.get('utm_source') || undefined,
      utm_campaign: params.get('utm_campaign') || undefined,
      utm_medium: params.get('utm_medium') || undefined,
      utm_content: params.get('utm_content') || undefined,
      utm_term: params.get('utm_term') || undefined,
      xcod: params.get('xcod') || undefined,
    }
  } catch {
    return null
  }
}

// ========================
// Template String
// ========================

/**
 * Returns the raw UTM template string for Meta Ads Manager
 * This can be copied directly into the "URL Parameters" field
 */
export function getMetaUtmTemplate(): string {
  return buildMetaUrlSuffix()
}

/**
 * Returns formatted template for display
 *
 * xcod format: FB{d}{templateId}{d}{campaign}{d}{adset}{d}{ad}{d}{placement}
 * where {templateId} is the first 8 chars of the AlvoBot template UUID
 */
export function getMetaUtmTemplateFormatted(): string {
  return `utm_source=FB
&utm_campaign={{campaign.name}}|{{campaign.id}}
&utm_medium={{adset.name}}|{{adset.id}}
&utm_content={{ad.name}}|{{ad.id}}
&utm_term={{placement}}
&xcod=FB${XCOD_DELIMITER}{templateId}${XCOD_DELIMITER}{{campaign.name}}|{{campaign.id}}${XCOD_DELIMITER}{{adset.name}}|{{adset.id}}${XCOD_DELIMITER}{{ad.name}}|{{ad.id}}${XCOD_DELIMITER}{{placement}}`
}
