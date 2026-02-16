/**
 * Meta Ads Naming Convention Utility
 * Generates standardized names for campaigns, ad sets, and ads
 * Format: Descriptive_Part|Identifier_Part
 *
 * Based on the UTM-FY pattern for Meta Ads tracking
 */

// ========================
// Helper Functions
// ========================

/**
 * Converts text to URL-safe slug
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
// Types
// ========================

export interface MetaCampaignNamingConfig {
  // Article-based (for content campaigns)
  articleSlug?: string
  articleTitle?: string
  projectName?: string

  // Campaign metadata - accepts short codes (TRF, MSG, LED, VND, AWR, ENG, APP) or legacy values
  objective?: string
  templateId?: string

  // Date
  date?: Date
}

export interface MetaAdSetNamingConfig {
  // Base name (from campaign)
  campaignName?: string

  // Index for multiple ad sets
  index: number

  // Total ad sets count
  totalAdSets?: number
}

export interface MetaAdNamingConfig {
  // Base name (from ad set)
  adSetName?: string

  // Index for multiple ads
  index: number

  // Creative type
  creativeType?: 'image' | 'video' | 'carousel'
}

// ========================
// Campaign Naming
// ========================

/**
 * Generates Meta campaign name in hybrid format
 * Format: article-slug_project_OBJ|tID_DATE
 *
 * Examples:
 * - como-fazer-bolo_meublog_TRF|t123_20241220
 * - promocao-natal_loja_MSG|t456_20241220
 */
export function generateMetaCampaignName(config: MetaCampaignNamingConfig): string {
  const {
    articleSlug,
    articleTitle,
    projectName,
    objective = 'OUTCOME_TRAFFIC',
    templateId,
    date = new Date(),
  } = config

  // Objective abbreviations (handles both legacy and ODAX short codes)
  const objectiveAbbr: Record<string, string> = {
    // Legacy values
    TRAFFIC: 'TRF',
    MESSAGES: 'MSG',
    LEADS: 'LED',
    SALES: 'VND',
    // ODAX values
    OUTCOME_AWARENESS: 'AWR',
    OUTCOME_TRAFFIC: 'TRF',
    OUTCOME_ENGAGEMENT: 'ENG',
    OUTCOME_LEADS: 'LED',
    OUTCOME_APP_PROMOTION: 'APP',
    OUTCOME_SALES: 'VND',
  }

  // Descriptive part
  const slug = articleSlug || (articleTitle ? slugify(articleTitle, 20) : 'campanha')
  const project = projectName ? slugify(projectName, 12) : 'projeto'
  // If objective is already a short code (TRF, MSG, etc.), use it directly
  const objCode = objective.length <= 3 ? objective : (objectiveAbbr[objective] || 'TRF')

  const descriptivePart = `${slug}_${project}_${objCode}`

  // Identifier part
  const tId = templateId ? `t${templateId.slice(0, 8)}` : 'tnovo'
  const dateShort = formatDateShort(date)

  const identifierPart = `${tId}_${dateShort}`

  return `${descriptivePart}|${identifierPart}`
}

/**
 * Generates campaign name from article selection (auto-generated)
 */
export function generateCampaignNameFromArticle(
  articleTitle: string,
  projectName: string,
  objective = 'TRF'
): string {
  return generateMetaCampaignName({
    articleTitle,
    projectName,
    objective,
    date: new Date(),
  })
}

// ========================
// Ad Set Naming
// ========================

/**
 * Generates Meta ad set name in hybrid format
 * Format: campaign-base|cj{INDEX}de{TOTAL}
 *
 * Examples:
 * - como-fazer-bolo_meublog|cj1de10
 * - promocao-natal_loja|cj5de10
 */
export function generateMetaAdSetName(config: MetaAdSetNamingConfig): string {
  const { campaignName, index, totalAdSets = 1 } = config

  // Extract descriptive part from campaign name (before |)
  let baseName = 'conjunto'
  if (campaignName) {
    const pipeIndex = campaignName.indexOf('|')
    baseName = pipeIndex > 0 ? campaignName.slice(0, pipeIndex) : slugify(campaignName, 35)
    // Remove objective suffix (_TRF, _MSG, etc) for cleaner ad set name
    baseName = baseName.replace(/_(?:TRF|MSG|LED|VND)$/, '')
  }

  // Identifier part: cj = conjunto, N de M
  const identifierPart = `cj${index}de${totalAdSets}`

  return `${baseName}|${identifierPart}`
}

// ========================
// Ad Naming
// ========================

/**
 * Generates Meta ad name in hybrid format
 * Format: adset-base|an{INDEX}_{TYPE}
 *
 * Examples:
 * - como-fazer-bolo|an1_img
 * - promocao-natal|an3_vid
 */
export function generateMetaAdName(config: MetaAdNamingConfig): string {
  const { adSetName, index, creativeType = 'image' } = config

  // Extract descriptive part from ad set name (before |)
  let baseName = 'anuncio'
  if (adSetName) {
    const pipeIndex = adSetName.indexOf('|')
    baseName = pipeIndex > 0 ? adSetName.slice(0, pipeIndex) : slugify(adSetName, 30)
  }

  // Type abbreviations
  const typeAbbr: Record<string, string> = {
    image: 'img',
    video: 'vid',
    carousel: 'car',
  }
  const typeCode = typeAbbr[creativeType] || 'img'

  // Identifier part: an = anuncio
  const identifierPart = `an${index}_${typeCode}`

  return `${baseName}|${identifierPart}`
}

// ========================
// Parsing Functions
// ========================

/**
 * Parses a Meta campaign name to extract components
 */
export function parseMetaCampaignName(name: string): {
  articleSlug: string
  projectName: string
  objective: string
  templateId: string
  date: string
} | null {
  const pipeIndex = name.indexOf('|')
  if (pipeIndex === -1) return null

  const descriptive = name.slice(0, pipeIndex)
  const identifier = name.slice(pipeIndex + 1)

  // Parse descriptive: article_project_OBJ
  const descriptiveParts = descriptive.split('_')
  const articleSlug = descriptiveParts[0] || ''
  const projectName = descriptiveParts[1] || ''
  const objective = descriptiveParts[2] || ''

  // Parse identifier: tID_DATE
  const identifierParts = identifier.split('_')
  const templateId = identifierParts[0]?.replace('t', '') || ''
  const date = identifierParts[1] || ''

  return {
    articleSlug,
    projectName,
    objective,
    templateId,
    date,
  }
}

/**
 * Parses a Meta ad set name to extract components
 */
export function parseMetaAdSetName(name: string): {
  baseName: string
  index: number
  total: number
} | null {
  const pipeIndex = name.indexOf('|')
  if (pipeIndex === -1) return null

  const baseName = name.slice(0, pipeIndex)
  const identifier = name.slice(pipeIndex + 1)

  // Parse identifier: cjNdeM
  const match = identifier.match(/cj(\d+)de(\d+)/)
  if (!match) return null

  return {
    baseName,
    index: parseInt(match[1], 10),
    total: parseInt(match[2], 10),
  }
}

/**
 * Parses a Meta ad name to extract components
 */
export function parseMetaAdName(name: string): {
  baseName: string
  index: number
  type: string
} | null {
  const pipeIndex = name.indexOf('|')
  if (pipeIndex === -1) return null

  const baseName = name.slice(0, pipeIndex)
  const identifier = name.slice(pipeIndex + 1)

  // Parse identifier: anN_type
  const match = identifier.match(/an(\d+)_(\w+)/)
  if (!match) return null

  return {
    baseName,
    index: parseInt(match[1], 10),
    type: match[2],
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
