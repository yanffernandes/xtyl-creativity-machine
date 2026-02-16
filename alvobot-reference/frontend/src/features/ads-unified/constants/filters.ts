// ============================================================================
// AUTOMATION ENGINE — FILTERABLE FIELDS (Frontend)
// All fields available for entity filtering, organized by platform + level.
// Labels in Portuguese (pt-BR).
// ============================================================================

import {
  META_EFFECTIVE_STATUS_OPTIONS,
  META_STATUS_OPTIONS,
  META_OBJECTIVE_OPTIONS,
  META_BUYING_TYPE_OPTIONS,
  META_BID_STRATEGY_OPTIONS,
  META_OPTIMIZATION_GOAL_OPTIONS,
  META_BILLING_EVENT_OPTIONS,
  META_DESTINATION_TYPE_OPTIONS,
  META_CREATIVE_TYPE_OPTIONS,
  GOOGLE_STATUS_OPTIONS,
  GOOGLE_ADVERTISING_CHANNEL_OPTIONS,
  GOOGLE_BIDDING_STRATEGY_OPTIONS,
  GOOGLE_AD_GROUP_TYPE_OPTIONS,
  GOOGLE_AD_TYPE_OPTIONS,
  GOOGLE_KEYWORD_MATCH_TYPE_OPTIONS,
  type EnumValueOption,
} from './enums'

// ============================================================================
// FILTER FIELD DEFINITION
// ============================================================================

export interface FilterFieldDefinition {
  field: string
  label: string
  type: 'string' | 'number' | 'enum'
  operators: string[]
  /** Enum value options with labels (for dropdowns) */
  enumOptions?: EnumValueOption[]
  /** Whether this field supports period (metrics filters only) */
  supportsPeriod?: boolean
  /** Group for organizing in the UI (e.g., "Campanha", "Métricas") */
  group?: string
}

// ============================================================================
// OPERATOR GROUPS (reusable sets)
// ============================================================================

const STRING_OPERATORS = [
  'EQUAL',
  'CONTAIN',
  'NOT_CONTAIN',
  'START_WITH',
  'END_WITH',
  'REGEX',
]

const ID_OPERATORS = ['EQUAL', 'NOT_EQUAL', 'IN', 'NOT_IN']

const ENUM_OPERATORS = ['EQUAL', 'NOT_EQUAL', 'IN', 'NOT_IN']

const NUMBER_OPERATORS = [
  'EQUAL',
  'GREATER_THAN',
  'GREATER_THAN_OR_EQUAL',
  'LESS_THAN',
  'LESS_THAN_OR_EQUAL',
  'BETWEEN',
]

const ENUM_BASIC_OPERATORS = ['EQUAL', 'NOT_EQUAL']

const ENUM_WITH_IN_OPERATORS = ['EQUAL', 'NOT_EQUAL', 'IN']

// ============================================================================
// META ADS — FILTERABLE FIELDS
// ============================================================================

const META_CAMPAIGN_FIELDS: FilterFieldDefinition[] = [
  { field: 'campaign.id', label: 'ID da Campanha', type: 'string', operators: ID_OPERATORS, group: 'Campanha' },
  { field: 'campaign.name', label: 'Nome da Campanha', type: 'string', operators: STRING_OPERATORS, group: 'Campanha' },
  { field: 'campaign.status', label: 'Status', type: 'enum', operators: ENUM_OPERATORS, enumOptions: META_STATUS_OPTIONS, group: 'Campanha' },
  { field: 'campaign.effective_status', label: 'Status Efetivo', type: 'enum', operators: ENUM_OPERATORS, enumOptions: META_EFFECTIVE_STATUS_OPTIONS, group: 'Campanha' },
  { field: 'campaign.objective', label: 'Objetivo', type: 'enum', operators: ENUM_OPERATORS, enumOptions: META_OBJECTIVE_OPTIONS, group: 'Campanha' },
  { field: 'campaign.buying_type', label: 'Tipo de Compra', type: 'enum', operators: ENUM_BASIC_OPERATORS, enumOptions: META_BUYING_TYPE_OPTIONS, group: 'Campanha' },
  { field: 'campaign.bid_strategy', label: 'Estratégia de Lance', type: 'enum', operators: ENUM_WITH_IN_OPERATORS, enumOptions: META_BID_STRATEGY_OPTIONS, group: 'Campanha' },
  { field: 'campaign.daily_budget', label: 'Orçamento Diário', type: 'number', operators: NUMBER_OPERATORS, group: 'Campanha' },
  { field: 'campaign.lifetime_budget', label: 'Orçamento Vitalício', type: 'number', operators: NUMBER_OPERATORS, group: 'Campanha' },
]

const META_ADSET_FIELDS: FilterFieldDefinition[] = [
  { field: 'adset.id', label: 'ID do Ad Set', type: 'string', operators: ID_OPERATORS, group: 'Conjunto de Anúncios' },
  { field: 'adset.name', label: 'Nome do Ad Set', type: 'string', operators: STRING_OPERATORS, group: 'Conjunto de Anúncios' },
  { field: 'adset.status', label: 'Status', type: 'enum', operators: ENUM_OPERATORS, enumOptions: META_STATUS_OPTIONS, group: 'Conjunto de Anúncios' },
  { field: 'adset.effective_status', label: 'Status Efetivo', type: 'enum', operators: ENUM_OPERATORS, enumOptions: META_EFFECTIVE_STATUS_OPTIONS, group: 'Conjunto de Anúncios' },
  { field: 'adset.daily_budget', label: 'Orçamento Diário', type: 'number', operators: NUMBER_OPERATORS, group: 'Conjunto de Anúncios' },
  { field: 'adset.lifetime_budget', label: 'Orçamento Vitalício', type: 'number', operators: NUMBER_OPERATORS, group: 'Conjunto de Anúncios' },
  { field: 'adset.optimization_goal', label: 'Objetivo de Otimização', type: 'enum', operators: ENUM_WITH_IN_OPERATORS, enumOptions: META_OPTIMIZATION_GOAL_OPTIONS, group: 'Conjunto de Anúncios' },
  { field: 'adset.billing_event', label: 'Evento de Cobrança', type: 'enum', operators: ENUM_BASIC_OPERATORS, enumOptions: META_BILLING_EVENT_OPTIONS, group: 'Conjunto de Anúncios' },
  { field: 'adset.destination_type', label: 'Tipo de Destino', type: 'enum', operators: ENUM_WITH_IN_OPERATORS, enumOptions: META_DESTINATION_TYPE_OPTIONS, group: 'Conjunto de Anúncios' },
]

const META_AD_FIELDS: FilterFieldDefinition[] = [
  { field: 'ad.id', label: 'ID do Anúncio', type: 'string', operators: ID_OPERATORS, group: 'Anúncio' },
  { field: 'ad.name', label: 'Nome do Anúncio', type: 'string', operators: STRING_OPERATORS, group: 'Anúncio' },
  { field: 'ad.status', label: 'Status', type: 'enum', operators: ENUM_OPERATORS, enumOptions: META_STATUS_OPTIONS, group: 'Anúncio' },
  { field: 'ad.effective_status', label: 'Status Efetivo', type: 'enum', operators: ENUM_OPERATORS, enumOptions: META_EFFECTIVE_STATUS_OPTIONS, group: 'Anúncio' },
  { field: 'ad.creative_type', label: 'Tipo de Criativo', type: 'enum', operators: ENUM_WITH_IN_OPERATORS, enumOptions: META_CREATIVE_TYPE_OPTIONS, group: 'Anúncio' },
]

const META_METRICS_FIELDS: FilterFieldDefinition[] = [
  { field: 'metrics.impressions', label: 'Impressões', type: 'number', operators: NUMBER_OPERATORS, supportsPeriod: true, group: 'Métricas' },
  { field: 'metrics.spend', label: 'Gasto', type: 'number', operators: NUMBER_OPERATORS, supportsPeriod: true, group: 'Métricas' },
  { field: 'metrics.reach', label: 'Alcance', type: 'number', operators: NUMBER_OPERATORS, supportsPeriod: true, group: 'Métricas' },
]

// ============================================================================
// GOOGLE ADS — FILTERABLE FIELDS
// ============================================================================

const GOOGLE_CAMPAIGN_FIELDS: FilterFieldDefinition[] = [
  { field: 'campaign.id', label: 'ID da Campanha', type: 'string', operators: ID_OPERATORS, group: 'Campanha' },
  { field: 'campaign.name', label: 'Nome da Campanha', type: 'string', operators: STRING_OPERATORS, group: 'Campanha' },
  { field: 'campaign.status', label: 'Status', type: 'enum', operators: ENUM_OPERATORS, enumOptions: GOOGLE_STATUS_OPTIONS, group: 'Campanha' },
  { field: 'campaign.advertising_channel_type', label: 'Tipo de Canal', type: 'enum', operators: ['EQUAL'], enumOptions: GOOGLE_ADVERTISING_CHANNEL_OPTIONS, group: 'Campanha' },
  { field: 'campaign.bidding_strategy_type', label: 'Estratégia de Lance', type: 'enum', operators: ENUM_WITH_IN_OPERATORS, enumOptions: GOOGLE_BIDDING_STRATEGY_OPTIONS, group: 'Campanha' },
  { field: 'campaign.budget_amount', label: 'Valor do Orçamento', type: 'number', operators: NUMBER_OPERATORS, group: 'Campanha' },
]

const GOOGLE_AD_GROUP_FIELDS: FilterFieldDefinition[] = [
  { field: 'ad_group.id', label: 'ID do Grupo de Anúncios', type: 'string', operators: ID_OPERATORS, group: 'Grupo de Anúncios' },
  { field: 'ad_group.name', label: 'Nome do Grupo de Anúncios', type: 'string', operators: STRING_OPERATORS, group: 'Grupo de Anúncios' },
  { field: 'ad_group.status', label: 'Status', type: 'enum', operators: ENUM_OPERATORS, enumOptions: GOOGLE_STATUS_OPTIONS, group: 'Grupo de Anúncios' },
  { field: 'ad_group.type', label: 'Tipo', type: 'enum', operators: ENUM_BASIC_OPERATORS, enumOptions: GOOGLE_AD_GROUP_TYPE_OPTIONS, group: 'Grupo de Anúncios' },
  { field: 'ad_group.cpc_bid', label: 'Lance CPC', type: 'number', operators: NUMBER_OPERATORS, group: 'Grupo de Anúncios' },
]

const GOOGLE_AD_FIELDS: FilterFieldDefinition[] = [
  { field: 'ad.id', label: 'ID do Anúncio', type: 'string', operators: ID_OPERATORS, group: 'Anúncio' },
  { field: 'ad.name', label: 'Nome do Anúncio', type: 'string', operators: ['EQUAL', 'CONTAIN', 'NOT_CONTAIN'], group: 'Anúncio' },
  { field: 'ad.status', label: 'Status', type: 'enum', operators: ENUM_OPERATORS, enumOptions: GOOGLE_STATUS_OPTIONS, group: 'Anúncio' },
  { field: 'ad.type', label: 'Tipo', type: 'enum', operators: ENUM_WITH_IN_OPERATORS, enumOptions: GOOGLE_AD_TYPE_OPTIONS, group: 'Anúncio' },
]

const GOOGLE_KEYWORD_FIELDS: FilterFieldDefinition[] = [
  { field: 'keyword.id', label: 'ID da Palavra-chave', type: 'string', operators: ID_OPERATORS, group: 'Palavra-chave' },
  { field: 'keyword.text', label: 'Texto da Palavra-chave', type: 'string', operators: ['EQUAL', 'CONTAIN', 'NOT_CONTAIN', 'START_WITH', 'END_WITH'], group: 'Palavra-chave' },
  { field: 'keyword.match_type', label: 'Tipo de Correspondência', type: 'enum', operators: ENUM_WITH_IN_OPERATORS, enumOptions: GOOGLE_KEYWORD_MATCH_TYPE_OPTIONS, group: 'Palavra-chave' },
  { field: 'keyword.status', label: 'Status', type: 'enum', operators: ENUM_OPERATORS, enumOptions: GOOGLE_STATUS_OPTIONS, group: 'Palavra-chave' },
  { field: 'keyword.cpc_bid', label: 'Lance CPC', type: 'number', operators: NUMBER_OPERATORS, group: 'Palavra-chave' },
  { field: 'keyword.quality_score', label: 'Quality Score', type: 'number', operators: NUMBER_OPERATORS, group: 'Palavra-chave' },
]

// ============================================================================
// COMBINED EXPORT
// ============================================================================

/**
 * All filterable fields organized by platform → level.
 *
 * Cross-level filtering is supported:
 * - adset level includes campaign.* fields
 * - ad level includes campaign.* + adset.* fields
 * - keyword level includes campaign.* + ad_group.* fields
 */
export const FILTERABLE_FIELDS: Record<string, Record<string, FilterFieldDefinition[]>> = {
  meta: {
    campaign: [...META_CAMPAIGN_FIELDS, ...META_METRICS_FIELDS],
    adset: [...META_CAMPAIGN_FIELDS, ...META_ADSET_FIELDS, ...META_METRICS_FIELDS],
    ad: [...META_CAMPAIGN_FIELDS, ...META_ADSET_FIELDS, ...META_AD_FIELDS, ...META_METRICS_FIELDS],
    ad_account: [...META_METRICS_FIELDS],
  },
  google: {
    campaign: [...GOOGLE_CAMPAIGN_FIELDS],
    ad_group: [...GOOGLE_CAMPAIGN_FIELDS, ...GOOGLE_AD_GROUP_FIELDS],
    ad: [...GOOGLE_CAMPAIGN_FIELDS, ...GOOGLE_AD_GROUP_FIELDS, ...GOOGLE_AD_FIELDS],
    keyword: [...GOOGLE_CAMPAIGN_FIELDS, ...GOOGLE_AD_GROUP_FIELDS, ...GOOGLE_KEYWORD_FIELDS],
    ad_account: [],
  },
}

// ============================================================================
// HELPERS
// ============================================================================

/**
 * Get all filterable fields for a given platform + level.
 */
export function getFilterFieldsForPlatformLevel(
  platform: string,
  level: string,
): FilterFieldDefinition[] {
  return FILTERABLE_FIELDS[platform]?.[level] ?? []
}

/**
 * Get filter fields grouped by their group property for a given platform + level.
 */
export function getFilterFieldsGrouped(
  platform: string,
  level: string,
): Record<string, FilterFieldDefinition[]> {
  const fields = getFilterFieldsForPlatformLevel(platform, level)
  const grouped: Record<string, FilterFieldDefinition[]> = {}

  for (const field of fields) {
    const group = field.group ?? 'Outros'
    if (!grouped[group]) {
      grouped[group] = []
    }
    grouped[group].push(field)
  }

  return grouped
}

/**
 * Find a specific filter field definition.
 */
export function findFilterField(
  platform: string,
  level: string,
  fieldPath: string,
): FilterFieldDefinition | undefined {
  const fields = getFilterFieldsForPlatformLevel(platform, level)
  return fields.find((f) => f.field === fieldPath)
}

/**
 * Get all valid operators for a given field.
 */
export function getOperatorsForField(
  platform: string,
  level: string,
  fieldPath: string,
): string[] {
  const field = findFilterField(platform, level, fieldPath)
  return field?.operators ?? []
}

/**
 * Get enum options for a given field (if it's an enum field).
 */
export function getEnumOptionsForField(
  platform: string,
  level: string,
  fieldPath: string,
): EnumValueOption[] {
  const field = findFilterField(platform, level, fieldPath)
  return field?.enumOptions ?? []
}

/**
 * Check if a field supports period selection (metrics filters).
 */
export function fieldSupportsPeriod(
  platform: string,
  level: string,
  fieldPath: string,
): boolean {
  const field = findFilterField(platform, level, fieldPath)
  return field?.supportsPeriod ?? false
}

/**
 * Get the label for a filter field (or the field path as fallback).
 */
export function getFilterFieldLabel(
  platform: string,
  level: string,
  fieldPath: string,
): string {
  return findFilterField(platform, level, fieldPath)?.label ?? fieldPath
}
