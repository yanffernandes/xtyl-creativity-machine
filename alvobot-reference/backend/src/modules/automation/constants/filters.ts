// ============================================================================
// AUTOMATION ENGINE — FILTERABLE FIELDS
// All fields available for entity filtering, organized by platform + level.
// ============================================================================

import {
  META_EFFECTIVE_STATUS_VALUES,
  META_OBJECTIVE_VALUES,
  META_BID_STRATEGY_VALUES,
  META_BUYING_TYPE_VALUES,
  META_OPTIMIZATION_GOAL_VALUES,
  META_BILLING_EVENT_VALUES,
  META_DESTINATION_TYPE_VALUES,
  META_CREATIVE_TYPE_VALUES,
  META_STATUS_VALUES,
  GOOGLE_STATUS_VALUES,
  GOOGLE_ADVERTISING_CHANNEL_TYPE_VALUES,
  GOOGLE_BIDDING_STRATEGY_TYPE_VALUES,
  GOOGLE_AD_GROUP_TYPE_VALUES,
  GOOGLE_AD_TYPE_VALUES,
  GOOGLE_KEYWORD_MATCH_TYPE_VALUES,
} from './enums';

// ============================================================================
// FILTER FIELD DEFINITION
// ============================================================================

export interface FilterFieldDefinition {
  field: string;
  label: string;
  type: 'string' | 'number' | 'enum';
  operators: string[];
  enumValues?: readonly string[];
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
] as const;

const ID_OPERATORS = ['EQUAL', 'NOT_EQUAL', 'IN', 'NOT_IN'] as const;

const ENUM_OPERATORS = ['EQUAL', 'NOT_EQUAL', 'IN', 'NOT_IN'] as const;

const NUMBER_OPERATORS = [
  'EQUAL',
  'GREATER_THAN',
  'GREATER_THAN_OR_EQUAL',
  'LESS_THAN',
  'LESS_THAN_OR_EQUAL',
  'BETWEEN',
] as const;

const ENUM_BASIC_OPERATORS = ['EQUAL', 'NOT_EQUAL'] as const;

const ENUM_WITH_IN_OPERATORS = ['EQUAL', 'NOT_EQUAL', 'IN'] as const;

// ============================================================================
// META ADS — FILTERABLE FIELDS
// ============================================================================

const META_CAMPAIGN_FIELDS: FilterFieldDefinition[] = [
  { field: 'campaign.id', label: 'ID da Campanha', type: 'string', operators: [...ID_OPERATORS] },
  { field: 'campaign.name', label: 'Nome da Campanha', type: 'string', operators: [...STRING_OPERATORS] },
  { field: 'campaign.status', label: 'Status', type: 'enum', operators: [...ENUM_OPERATORS], enumValues: META_STATUS_VALUES },
  { field: 'campaign.effective_status', label: 'Status Efetivo', type: 'enum', operators: [...ENUM_OPERATORS], enumValues: META_EFFECTIVE_STATUS_VALUES },
  { field: 'campaign.objective', label: 'Objetivo', type: 'enum', operators: [...ENUM_OPERATORS], enumValues: META_OBJECTIVE_VALUES },
  { field: 'campaign.buying_type', label: 'Tipo de Compra', type: 'enum', operators: [...ENUM_BASIC_OPERATORS], enumValues: META_BUYING_TYPE_VALUES },
  { field: 'campaign.bid_strategy', label: 'Estratégia de Lance', type: 'enum', operators: [...ENUM_WITH_IN_OPERATORS], enumValues: META_BID_STRATEGY_VALUES },
  { field: 'campaign.daily_budget', label: 'Orçamento Diário', type: 'number', operators: [...NUMBER_OPERATORS] },
  { field: 'campaign.lifetime_budget', label: 'Orçamento Vitalício', type: 'number', operators: [...NUMBER_OPERATORS] },
];

const META_ADSET_FIELDS: FilterFieldDefinition[] = [
  { field: 'adset.id', label: 'ID do Ad Set', type: 'string', operators: [...ID_OPERATORS] },
  { field: 'adset.name', label: 'Nome do Ad Set', type: 'string', operators: [...STRING_OPERATORS] },
  { field: 'adset.status', label: 'Status', type: 'enum', operators: [...ENUM_OPERATORS], enumValues: META_STATUS_VALUES },
  { field: 'adset.effective_status', label: 'Status Efetivo', type: 'enum', operators: [...ENUM_OPERATORS], enumValues: META_EFFECTIVE_STATUS_VALUES },
  { field: 'adset.daily_budget', label: 'Orçamento Diário', type: 'number', operators: [...NUMBER_OPERATORS] },
  { field: 'adset.lifetime_budget', label: 'Orçamento Vitalício', type: 'number', operators: [...NUMBER_OPERATORS] },
  { field: 'adset.optimization_goal', label: 'Objetivo de Otimização', type: 'enum', operators: [...ENUM_WITH_IN_OPERATORS], enumValues: META_OPTIMIZATION_GOAL_VALUES },
  { field: 'adset.billing_event', label: 'Evento de Cobrança', type: 'enum', operators: [...ENUM_BASIC_OPERATORS], enumValues: META_BILLING_EVENT_VALUES },
  { field: 'adset.destination_type', label: 'Tipo de Destino', type: 'enum', operators: [...ENUM_WITH_IN_OPERATORS], enumValues: META_DESTINATION_TYPE_VALUES },
];

const META_AD_FIELDS: FilterFieldDefinition[] = [
  { field: 'ad.id', label: 'ID do Anúncio', type: 'string', operators: [...ID_OPERATORS] },
  { field: 'ad.name', label: 'Nome do Anúncio', type: 'string', operators: [...STRING_OPERATORS] },
  { field: 'ad.status', label: 'Status', type: 'enum', operators: [...ENUM_OPERATORS], enumValues: META_STATUS_VALUES },
  { field: 'ad.effective_status', label: 'Status Efetivo', type: 'enum', operators: [...ENUM_OPERATORS], enumValues: META_EFFECTIVE_STATUS_VALUES },
  { field: 'ad.creative_type', label: 'Tipo de Criativo', type: 'enum', operators: [...ENUM_WITH_IN_OPERATORS], enumValues: META_CREATIVE_TYPE_VALUES },
];

const META_METRICS_FIELDS: FilterFieldDefinition[] = [
  { field: 'metrics.impressions', label: 'Impressões', type: 'number', operators: [...NUMBER_OPERATORS] },
  { field: 'metrics.spend', label: 'Gasto', type: 'number', operators: [...NUMBER_OPERATORS] },
  { field: 'metrics.reach', label: 'Alcance', type: 'number', operators: [...NUMBER_OPERATORS] },
];

// ============================================================================
// GOOGLE ADS — FILTERABLE FIELDS
// ============================================================================

const GOOGLE_CAMPAIGN_FIELDS: FilterFieldDefinition[] = [
  { field: 'campaign.id', label: 'ID da Campanha', type: 'string', operators: [...ID_OPERATORS] },
  { field: 'campaign.name', label: 'Nome da Campanha', type: 'string', operators: [...STRING_OPERATORS] },
  { field: 'campaign.status', label: 'Status', type: 'enum', operators: [...ENUM_OPERATORS], enumValues: GOOGLE_STATUS_VALUES },
  { field: 'campaign.advertising_channel_type', label: 'Tipo de Canal', type: 'enum', operators: ['EQUAL'], enumValues: GOOGLE_ADVERTISING_CHANNEL_TYPE_VALUES },
  { field: 'campaign.bidding_strategy_type', label: 'Estratégia de Lance', type: 'enum', operators: [...ENUM_WITH_IN_OPERATORS], enumValues: GOOGLE_BIDDING_STRATEGY_TYPE_VALUES },
  { field: 'campaign.budget_amount', label: 'Valor do Orçamento', type: 'number', operators: [...NUMBER_OPERATORS] },
];

const GOOGLE_AD_GROUP_FIELDS: FilterFieldDefinition[] = [
  { field: 'ad_group.id', label: 'ID do Grupo de Anúncios', type: 'string', operators: [...ID_OPERATORS] },
  { field: 'ad_group.name', label: 'Nome do Grupo de Anúncios', type: 'string', operators: [...STRING_OPERATORS] },
  { field: 'ad_group.status', label: 'Status', type: 'enum', operators: [...ENUM_OPERATORS], enumValues: GOOGLE_STATUS_VALUES },
  { field: 'ad_group.type', label: 'Tipo', type: 'enum', operators: [...ENUM_BASIC_OPERATORS], enumValues: GOOGLE_AD_GROUP_TYPE_VALUES },
  { field: 'ad_group.cpc_bid', label: 'Lance CPC', type: 'number', operators: [...NUMBER_OPERATORS] },
];

const GOOGLE_AD_FIELDS: FilterFieldDefinition[] = [
  { field: 'ad.id', label: 'ID do Anúncio', type: 'string', operators: [...ID_OPERATORS] },
  { field: 'ad.name', label: 'Nome do Anúncio', type: 'string', operators: ['EQUAL', 'CONTAIN', 'NOT_CONTAIN'] },
  { field: 'ad.status', label: 'Status', type: 'enum', operators: [...ENUM_OPERATORS], enumValues: GOOGLE_STATUS_VALUES },
  { field: 'ad.type', label: 'Tipo', type: 'enum', operators: [...ENUM_WITH_IN_OPERATORS], enumValues: GOOGLE_AD_TYPE_VALUES },
];

const GOOGLE_KEYWORD_FIELDS: FilterFieldDefinition[] = [
  { field: 'keyword.id', label: 'ID da Palavra-chave', type: 'string', operators: [...ID_OPERATORS] },
  { field: 'keyword.text', label: 'Texto da Palavra-chave', type: 'string', operators: ['EQUAL', 'CONTAIN', 'NOT_CONTAIN', 'START_WITH', 'END_WITH'] },
  { field: 'keyword.match_type', label: 'Tipo de Correspondência', type: 'enum', operators: [...ENUM_WITH_IN_OPERATORS], enumValues: GOOGLE_KEYWORD_MATCH_TYPE_VALUES },
  { field: 'keyword.status', label: 'Status', type: 'enum', operators: [...ENUM_OPERATORS], enumValues: GOOGLE_STATUS_VALUES },
  { field: 'keyword.cpc_bid', label: 'Lance CPC', type: 'number', operators: [...NUMBER_OPERATORS] },
  { field: 'keyword.quality_score', label: 'Quality Score', type: 'number', operators: [...NUMBER_OPERATORS] },
];

// ============================================================================
// COMBINED EXPORT
// ============================================================================

/**
 * All filterable fields organized by platform → level.
 *
 * Each level includes:
 * - Its own entity fields (e.g. campaign.name for campaign level)
 * - Parent entity fields (for cross-level filtering)
 * - Metric fields (for metric-based filters with period support)
 *
 * Cross-level filtering:
 * - adset level includes campaign.* fields
 * - ad level includes campaign.* + adset.* fields
 * - keyword level includes campaign.* + ad_group.* fields
 */
export const FILTERABLE_FIELDS: Record<
  string,
  Record<string, FilterFieldDefinition[]>
> = {
  meta: {
    campaign: [...META_CAMPAIGN_FIELDS, ...META_METRICS_FIELDS],
    adset: [
      ...META_CAMPAIGN_FIELDS,
      ...META_ADSET_FIELDS,
      ...META_METRICS_FIELDS,
    ],
    ad: [
      ...META_CAMPAIGN_FIELDS,
      ...META_ADSET_FIELDS,
      ...META_AD_FIELDS,
      ...META_METRICS_FIELDS,
    ],
    ad_account: [...META_METRICS_FIELDS],
  },
  google: {
    campaign: [...GOOGLE_CAMPAIGN_FIELDS],
    ad_group: [...GOOGLE_CAMPAIGN_FIELDS, ...GOOGLE_AD_GROUP_FIELDS],
    ad: [
      ...GOOGLE_CAMPAIGN_FIELDS,
      ...GOOGLE_AD_GROUP_FIELDS,
      ...GOOGLE_AD_FIELDS,
    ],
    keyword: [
      ...GOOGLE_CAMPAIGN_FIELDS,
      ...GOOGLE_AD_GROUP_FIELDS,
      ...GOOGLE_KEYWORD_FIELDS,
    ],
    ad_account: [],
  },
};

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
  return FILTERABLE_FIELDS[platform]?.[level] ?? [];
}

/**
 * Find a specific filter field definition.
 */
export function findFilterField(
  platform: string,
  level: string,
  fieldPath: string,
): FilterFieldDefinition | undefined {
  const fields = getFilterFieldsForPlatformLevel(platform, level);
  return fields.find((f) => f.field === fieldPath);
}

/**
 * Get all valid operators for a given field.
 */
export function getOperatorsForField(
  platform: string,
  level: string,
  fieldPath: string,
): string[] {
  const field = findFilterField(platform, level, fieldPath);
  return field?.operators ?? [];
}

/**
 * Get enum values for a given field (if it's an enum field).
 */
export function getEnumValuesForField(
  platform: string,
  level: string,
  fieldPath: string,
): readonly string[] | undefined {
  const field = findFilterField(platform, level, fieldPath);
  return field?.enumValues;
}
