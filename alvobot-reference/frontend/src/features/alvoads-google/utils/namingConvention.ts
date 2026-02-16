/**
 * Naming Convention Utility
 * Generates standardized names for campaigns and ad groups
 * Format: Descriptive_Part|Identifier_Part
 */

import { slugify } from './utmBuilder'

// Re-export slugify for convenience
export { slugify }

// ========================
// Types
// ========================

export interface CampaignNamingConfig {
  // Article-based (optional)
  articleSlug?: string
  articleTitle?: string
  projectName?: string
  language?: string

  // IDs for tracking
  templateId?: string
  wpPostId?: string | number

  // Date
  date?: Date
}

export interface AdGroupNamingConfig {
  // Main keyword or theme
  mainKeyword?: string
  theme?: string

  // Index for multiple ad groups
  index: number

  // Ad count
  adCount?: number
}

// ========================
// Date Formatting
// ========================

/**
 * Formats date as YYYYMMDD
 */
export function formatDateShort(date: Date = new Date()): string {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}${month}${day}`
}

/**
 * Formats date as DD/MM/YYYY (for display)
 */
export function formatDateDisplay(date: Date = new Date()): string {
  return date.toLocaleDateString('pt-BR')
}

// ========================
// Campaign Naming
// ========================

/**
 * Generates campaign name in hybrid format
 * Format: article-slug_project|tID_wpID_DATE
 *
 * Example: como-fazer-bolo_MeuBlog|t123_wp456_20241220
 */
export function generateCampaignName(config: CampaignNamingConfig): string {
  const {
    articleSlug,
    articleTitle,
    projectName,
    templateId,
    wpPostId,
    date = new Date(),
  } = config

  // Descriptive part
  const slug = articleSlug || (articleTitle ? slugify(articleTitle, 25) : 'sem-artigo')
  const project = projectName ? slugify(projectName, 15) : 'projeto'

  const descriptivePart = `${slug}_${project}`

  // Identifier part
  const tId = templateId ? `t${templateId}` : 'tnovo'
  const wpId = wpPostId ? `wp${wpPostId}` : 'wpNA'
  const dateShort = formatDateShort(date)

  const identifierPart = `${tId}_${wpId}_${dateShort}`

  return `${descriptivePart}|${identifierPart}`
}

/**
 * Generates campaign name template with placeholders
 * For use in the wizard store
 */
export function getCampaignNameTemplate(): string {
  return '{{article_slug}}_{{project_name}}|t{{template_id}}_wp{{wp_post_id}}_{{date_short}}'
}

/**
 * Replaces placeholders in campaign name template
 */
export function replaceCampaignNamePlaceholders(
  template: string,
  config: CampaignNamingConfig
): string {
  const {
    articleSlug,
    articleTitle,
    projectName,
    templateId,
    wpPostId,
    date = new Date(),
  } = config

  const slug = articleSlug || (articleTitle ? slugify(articleTitle, 25) : 'sem-artigo')

  return template
    .replace('{{article_slug}}', slug)
    .replace('{{project_name}}', projectName ? slugify(projectName, 15) : 'projeto')
    .replace('{{template_id}}', templateId || 'novo')
    .replace('{{wp_post_id}}', wpPostId?.toString() || 'NA')
    .replace('{{date_short}}', formatDateShort(date))
    .replace('{{current_date}}', formatDateDisplay(date))
}

// ========================
// Ad Group Naming
// ========================

/**
 * Generates ad group name in hybrid format
 * Format: keyword-slug|agINDEX_Nads
 *
 * Example: receita-bolo-chocolate|ag1_3ads
 */
export function generateAdGroupName(config: AdGroupNamingConfig): string {
  const { mainKeyword, theme, index, adCount = 0 } = config

  // Descriptive part
  const descriptive = mainKeyword
    ? slugify(mainKeyword, 30)
    : theme
      ? slugify(theme, 30)
      : 'grupo-anuncios'

  // Identifier part
  const adsLabel = adCount > 0 ? `${adCount}ads` : '0ads'
  const identifierPart = `ag${index}_${adsLabel}`

  return `${descriptive}|${identifierPart}`
}

/**
 * Updates ad group name with new ad count
 */
export function updateAdGroupNameWithAdCount(currentName: string, newAdCount: number): string {
  // Parse current name
  const pipeIndex = currentName.indexOf('|')

  if (pipeIndex === -1) {
    // No pipe, add identifier
    return `${slugify(currentName, 30)}|ag1_${newAdCount}ads`
  }

  const descriptive = currentName.slice(0, pipeIndex)
  const identifier = currentName.slice(pipeIndex + 1)

  // Update ad count in identifier
  const updatedIdentifier = identifier.replace(/\d+ads/, `${newAdCount}ads`)

  return `${descriptive}|${updatedIdentifier}`
}

// ========================
// Parsing Functions
// ========================

/**
 * Parses a campaign name to extract components
 */
export function parseCampaignName(name: string): {
  articleSlug: string
  projectName: string
  templateId: string
  wpPostId: string
  date: string
} | null {
  const pipeIndex = name.indexOf('|')
  if (pipeIndex === -1) return null

  const descriptive = name.slice(0, pipeIndex)
  const identifier = name.slice(pipeIndex + 1)

  const [articleSlug, projectName] = descriptive.split('_')
  const identifierParts = identifier.split('_')

  return {
    articleSlug: articleSlug || '',
    projectName: projectName || '',
    templateId: identifierParts[0]?.replace('t', '') || '',
    wpPostId: identifierParts[1]?.replace('wp', '') || '',
    date: identifierParts[2] || '',
  }
}

/**
 * Parses an ad group name to extract components
 */
export function parseAdGroupName(name: string): {
  keyword: string
  index: number
  adCount: number
} | null {
  const pipeIndex = name.indexOf('|')
  if (pipeIndex === -1) return null

  const descriptive = name.slice(0, pipeIndex)
  const identifier = name.slice(pipeIndex + 1)

  // Extract index from "agN"
  const indexMatch = identifier.match(/ag(\d+)/)
  const index = indexMatch ? parseInt(indexMatch[1], 10) : 1

  // Extract ad count from "Nads"
  const adCountMatch = identifier.match(/(\d+)ads/)
  const adCount = adCountMatch ? parseInt(adCountMatch[1], 10) : 0

  return {
    keyword: descriptive,
    index,
    adCount,
  }
}

// ========================
// Validation
// ========================

/**
 * Validates if a name follows the hybrid format
 */
export function isValidHybridName(name: string): boolean {
  if (!name || typeof name !== 'string') return false

  const pipeIndex = name.indexOf('|')
  if (pipeIndex === -1) return false

  const descriptive = name.slice(0, pipeIndex)
  const identifier = name.slice(pipeIndex + 1)

  return descriptive.length > 0 && identifier.length > 0
}

/**
 * Converts legacy name to hybrid format
 */
export function convertToHybridFormat(
  legacyName: string,
  config: { type: 'campaign' | 'adgroup'; index?: number }
): string {
  if (isValidHybridName(legacyName)) {
    return legacyName
  }

  const slug = slugify(legacyName, 30)

  if (config.type === 'campaign') {
    const date = formatDateShort(new Date())
    return `${slug}|tnovo_wpNA_${date}`
  }

  const index = config.index || 1
  return `${slug}|ag${index}_0ads`
}
