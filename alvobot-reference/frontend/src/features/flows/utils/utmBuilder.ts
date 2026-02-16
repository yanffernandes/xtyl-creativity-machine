/**
 * Flow UTM Builder Utility
 * Generates UTM parameters following the AlvoBot pattern for Message Flows
 *
 * Flow dynamic placeholders (replaced at runtime by message.s3.alvobot.com):
 * - {{flow.name}} - Flow name
 * - {{flow.id}} - Flow ID
 * - {{trigger.name}} - Trigger name
 * - {{trigger.id}} - Trigger ID
 * - {{node.name}} - Node label
 * - {{node.id}} - Node ID
 * - {{run.id}} - Trigger run ID
 */

import { MESSENGER_LIMITS } from '../types'

// ========================
// Types
// ========================

export interface FlowUtmConfig {
  // Flow info
  flowId: string
  flowName: string

  // Trigger info (optional - may not be known at edit time)
  triggerId?: string
  triggerName?: string

  // Node info
  nodeId: string
  nodeName?: string

  // Run ID (only available at runtime)
  runId?: string

  // Custom xcod prefix
  xcodPrefix?: string
}

export interface FlowUtmParams {
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

// Delimiter for xcod (same as Google Ads for consistency)
const XCOD_DELIMITER = 'xABx'

// Flow dynamic placeholders
const FLOW_PLACEHOLDERS = {
  flowName: '{{flow.name}}',
  flowId: '{{flow.id}}',
  triggerName: '{{trigger.name}}',
  triggerId: '{{trigger.id}}',
  nodeName: '{{node.name}}',
  nodeId: '{{node.id}}',
  runId: '{{run.id}}',
} as const

// UTM params to strip from existing URLs
const UTM_PARAMS = [
  'utm_source',
  'utm_campaign',
  'utm_medium',
  'utm_content',
  'utm_term',
  'xcod',
]

// ========================
// Helper Functions
// ========================

/**
 * Slugify text for URL-safe names
 * - Lowercase
 * - Remove accents
 * - Replace spaces with hyphens
 * - Remove special characters
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
 * Strip existing UTM parameters from a URL
 */
export function stripExistingUtm(url: string): string {
  if (!url) return url

  try {
    const urlObj = new URL(url)
    UTM_PARAMS.forEach((param) => urlObj.searchParams.delete(param))

    // Return URL without trailing ? if no params left
    const result = urlObj.toString()
    return result.endsWith('?') ? result.slice(0, -1) : result
  } catch {
    // If URL parsing fails, return original
    return url
  }
}

// ========================
// UTM Building Functions
// ========================

/**
 * Builds Flow UTM parameters with dynamic placeholders
 *
 * Format matches the AlvoBot pattern:
 * utm_source=alvobot
 * utm_campaign={{flow.name}}|{{flow.id}}
 * utm_medium={{trigger.name}}|{{trigger.id}}
 * utm_content={{node.name}}|{{node.id}}
 * utm_term={{run.id}}
 * xcod=FL{delimiter}...
 */
export function buildFlowUtmParams(config: FlowUtmConfig): FlowUtmParams {
  const { xcodPrefix = 'FL' } = config

  // UTM Campaign: flow.name|flow.id (use real values if available for preview)
  const flowNamePart = config.flowName
    ? slugify(config.flowName, 30)
    : FLOW_PLACEHOLDERS.flowName
  const flowIdPart = config.flowId || FLOW_PLACEHOLDERS.flowId
  const utmCampaign = `${flowNamePart}|${flowIdPart}`

  // UTM Medium: trigger.name|trigger.id
  const triggerNamePart = config.triggerName
    ? slugify(config.triggerName, 25)
    : FLOW_PLACEHOLDERS.triggerName
  const triggerIdPart = config.triggerId || FLOW_PLACEHOLDERS.triggerId
  const utmMedium = `${triggerNamePart}|${triggerIdPart}`

  // UTM Content: node.name|node.id
  const nodeNamePart = config.nodeName
    ? slugify(config.nodeName, 20)
    : FLOW_PLACEHOLDERS.nodeName
  const nodeIdPart = config.nodeId || FLOW_PLACEHOLDERS.nodeId
  const utmContent = `${nodeNamePart}|${nodeIdPart}`

  // UTM Term: run.id (always placeholder for preview, replaced at runtime)
  const utmTerm = config.runId || FLOW_PLACEHOLDERS.runId

  // XCOD: tracking code with all identifiers
  const xcod = buildXcod(xcodPrefix, flowIdPart, triggerIdPart, nodeIdPart, utmTerm)

  return {
    utm_source: 'alvobot',
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
 * Format: FL{d}{flowId}{d}{triggerId}{d}{nodeId}{d}{runId}
 * where {d} = XCOD_DELIMITER
 */
function buildXcod(
  prefix: string,
  flowId: string,
  triggerId: string,
  nodeId: string,
  runId: string
): string {
  const parts = [prefix, flowId, triggerId, nodeId, runId]
  return parts.join(XCOD_DELIMITER)
}

/**
 * Converts UTM params to query string
 */
export function utmParamsToQueryString(params: FlowUtmParams): string {
  const urlParams = [
    `utm_source=${params.utm_source}`,
    `utm_campaign=${encodeURIComponent(params.utm_campaign)}`,
    `utm_medium=${encodeURIComponent(params.utm_medium)}`,
    `utm_content=${encodeURIComponent(params.utm_content)}`,
    `utm_term=${encodeURIComponent(params.utm_term)}`,
    `xcod=${encodeURIComponent(params.xcod)}`,
  ]

  return urlParams.join('&')
}

/**
 * Builds a complete destination URL with UTM parameters
 * Always strips existing UTMs first to prevent duplication
 */
export function appendFlowUtmToUrl(url: string, config: FlowUtmConfig): string {
  if (!url) return ''

  // Strip existing UTM parameters
  const cleanUrl = stripExistingUtm(url)

  // Remove trailing slash
  const normalizedUrl = cleanUrl.replace(/\/$/, '')

  // Build UTM query string
  const params = buildFlowUtmParams(config)
  const queryString = utmParamsToQueryString(params)

  // Check if URL already has parameters
  const hasParams = normalizedUrl.includes('?')

  return `${normalizedUrl}${hasParams ? '&' : '?'}${queryString}`
}

// ========================
// Preview Functions
// ========================

/**
 * Generates a preview URL with example/real values
 * Used in the editor to show what the final URL will look like
 */
export function previewFlowUrl(
  baseUrl: string,
  config: {
    flowId: string
    flowName: string
    nodeId: string
    nodeName?: string
  }
): string {
  if (!baseUrl) return ''

  return appendFlowUtmToUrl(baseUrl, {
    flowId: config.flowId,
    flowName: config.flowName,
    nodeId: config.nodeId,
    nodeName: config.nodeName || 'button',
    // Use placeholders for trigger and run (not known at edit time)
    triggerId: undefined,
    triggerName: undefined,
    runId: undefined,
  })
}

/**
 * Generates a preview with all example values (for documentation/tooltip)
 */
export function previewFlowUrlWithExamples(baseUrl: string): string {
  if (!baseUrl) return ''

  return appendFlowUtmToUrl(baseUrl, {
    flowId: 'abc12345',
    flowName: 'meu-fluxo',
    triggerId: 'tr-789',
    triggerName: 'boas-vindas',
    nodeId: 'node-123',
    nodeName: 'botao-comprar',
    runId: '999888777',
  })
}

// ========================
// Validation Functions
// ========================

/**
 * Check if adding UTMs would exceed URL limit
 */
export function wouldExceedUrlLimit(url: string, config: FlowUtmConfig): boolean {
  if (!url) return false

  const finalUrl = appendFlowUtmToUrl(url, config)
  return finalUrl.length > MESSENGER_LIMITS.BUTTON_URL
}

/**
 * Calculate final URL length with UTMs
 */
export function calculateUrlLengthWithUtm(url: string, config: FlowUtmConfig): number {
  if (!url) return 0

  const finalUrl = appendFlowUtmToUrl(url, config)
  return finalUrl.length
}

/**
 * Get URL length status for UI feedback
 */
export function getUrlLengthStatus(
  url: string,
  config: FlowUtmConfig
): 'ok' | 'warning' | 'error' {
  const length = calculateUrlLengthWithUtm(url, config)

  if (length > MESSENGER_LIMITS.BUTTON_URL) return 'error'
  if (length > 1800) return 'warning' // Warn when approaching limit
  return 'ok'
}

// ========================
// Parsing Functions
// ========================

/**
 * Parses xcod back to components
 */
export function parseXcod(xcod: string): {
  prefix: string
  flowId: string
  triggerId: string
  nodeId: string
  runId: string
} | null {
  if (!xcod) return null

  const parts = xcod.split(XCOD_DELIMITER)
  if (parts.length < 5) return null

  return {
    prefix: parts[0],
    flowId: parts[1],
    triggerId: parts[2],
    nodeId: parts[3],
    runId: parts[4],
  }
}

/**
 * Extracts UTM parameters from a URL
 */
export function extractUtmFromUrl(url: string): Partial<FlowUtmParams> | null {
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
 * Returns the raw UTM template string with placeholders
 * This shows the format that will be used at runtime
 */
export function getFlowUtmTemplate(): string {
  const params = [
    'utm_source=alvobot',
    `utm_campaign=${FLOW_PLACEHOLDERS.flowName}|${FLOW_PLACEHOLDERS.flowId}`,
    `utm_medium=${FLOW_PLACEHOLDERS.triggerName}|${FLOW_PLACEHOLDERS.triggerId}`,
    `utm_content=${FLOW_PLACEHOLDERS.nodeName}|${FLOW_PLACEHOLDERS.nodeId}`,
    `utm_term=${FLOW_PLACEHOLDERS.runId}`,
    `xcod=FL${XCOD_DELIMITER}${FLOW_PLACEHOLDERS.flowId}${XCOD_DELIMITER}${FLOW_PLACEHOLDERS.triggerId}${XCOD_DELIMITER}${FLOW_PLACEHOLDERS.nodeId}${XCOD_DELIMITER}${FLOW_PLACEHOLDERS.runId}`,
  ]

  return params.join('&')
}

// ========================
// Runtime Processing (when creating message_run)
// ========================

export interface RuntimeUtmContext {
  runId: string | number
  triggerId?: string | number
  triggerName?: string
}

/**
 * Replaces UTM placeholders in a URL with actual runtime values
 * Used when creating a message_run to generate final URLs
 */
export function replaceUtmPlaceholders(
  url: string,
  context: RuntimeUtmContext
): string {
  if (!url) return url

  let result = url

  // Replace run.id placeholder
  result = result.replace(
    new RegExp(escapeRegex(FLOW_PLACEHOLDERS.runId), 'g'),
    String(context.runId)
  )
  result = result.replace(
    new RegExp(escapeRegex(encodeURIComponent(FLOW_PLACEHOLDERS.runId)), 'g'),
    String(context.runId)
  )

  // Replace trigger.id placeholder
  if (context.triggerId !== undefined) {
    result = result.replace(
      new RegExp(escapeRegex(FLOW_PLACEHOLDERS.triggerId), 'g'),
      String(context.triggerId)
    )
    result = result.replace(
      new RegExp(escapeRegex(encodeURIComponent(FLOW_PLACEHOLDERS.triggerId)), 'g'),
      String(context.triggerId)
    )
  } else {
    // If no trigger, use "disparo-manual|0"
    result = result.replace(
      new RegExp(escapeRegex(FLOW_PLACEHOLDERS.triggerId), 'g'),
      '0'
    )
    result = result.replace(
      new RegExp(escapeRegex(encodeURIComponent(FLOW_PLACEHOLDERS.triggerId)), 'g'),
      '0'
    )
  }

  // Replace trigger.name placeholder
  if (context.triggerName) {
    const sluggedName = slugify(context.triggerName, 25)
    result = result.replace(
      new RegExp(escapeRegex(FLOW_PLACEHOLDERS.triggerName), 'g'),
      sluggedName
    )
    result = result.replace(
      new RegExp(escapeRegex(encodeURIComponent(FLOW_PLACEHOLDERS.triggerName)), 'g'),
      sluggedName
    )
  } else {
    // If no trigger name, use "disparo-manual"
    result = result.replace(
      new RegExp(escapeRegex(FLOW_PLACEHOLDERS.triggerName), 'g'),
      'disparo-manual'
    )
    result = result.replace(
      new RegExp(escapeRegex(encodeURIComponent(FLOW_PLACEHOLDERS.triggerName)), 'g'),
      'disparo-manual'
    )
  }

  return result
}

/**
 * Escape special regex characters in a string
 */
function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

/**
 * Process all nodes in a flow to replace UTM placeholders with runtime values
 * Returns a new nodes array with processed URLs (does not mutate original)
 */
export function processFlowNodesForRun<T extends { data?: Record<string, unknown> }>(
  nodes: T[],
  context: RuntimeUtmContext
): T[] {
  return nodes.map((node) => {
    if (!node.data) return node

    const processedData = processNodeData(node.data, context)
    return {
      ...node,
      data: processedData,
    }
  })
}

/**
 * Recursively process node data to find and replace URLs with placeholders
 */
function processNodeData(
  data: Record<string, unknown>,
  context: RuntimeUtmContext
): Record<string, unknown> {
  const result: Record<string, unknown> = {}

  for (const [key, value] of Object.entries(data)) {
    if (typeof value === 'string') {
      // Check if this looks like a URL with UTM placeholders
      if (value.includes('utm_') || value.includes('{{')) {
        result[key] = replaceUtmPlaceholders(value, context)
      } else {
        result[key] = value
      }
    } else if (Array.isArray(value)) {
      // Process arrays (e.g., buttons array)
      result[key] = value.map((item) => {
        if (typeof item === 'object' && item !== null) {
          return processNodeData(item as Record<string, unknown>, context)
        }
        return item
      })
    } else if (typeof value === 'object' && value !== null) {
      // Process nested objects
      result[key] = processNodeData(value as Record<string, unknown>, context)
    } else {
      result[key] = value
    }
  }

  return result
}
