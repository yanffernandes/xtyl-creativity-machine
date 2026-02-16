// ============================================================================
// AUTOMATION ENGINE — ENUM CONSTANTS
// Metadata-driven constants for UI dropdowns and backend validation.
// ============================================================================

// Re-export types already defined in DTOs for convenience
export { FILTER_OPERATORS } from '../dto/filter.dto';
export type { FilterOperator } from '../dto/filter.dto';
export { CONDITION_OPERATORS, PERIODS, CONDITION_TYPES } from '../dto/condition.dto';
export type { ConditionOperator, Period, ConditionType } from '../dto/condition.dto';

// ============================================================================
// ENTITY LEVEL
// ============================================================================

export const ENTITY_LEVELS = [
  'campaign',
  'adset',
  'ad_group',
  'ad',
  'keyword',
  'ad_account',
] as const;

export type EntityLevel = (typeof ENTITY_LEVELS)[number];

/** Levels available per platform */
export const LEVELS_BY_PLATFORM: Record<string, EntityLevel[]> = {
  meta: ['campaign', 'adset', 'ad', 'ad_account'],
  google: ['campaign', 'ad_group', 'ad', 'keyword', 'ad_account'],
};

// ============================================================================
// PLATFORM
// ============================================================================

export const PLATFORMS = ['meta', 'google'] as const;
export type Platform = (typeof PLATFORMS)[number];

// ============================================================================
// RULE STATUS
// ============================================================================

export const RULE_STATUSES = ['active', 'paused', 'draft'] as const;
export type RuleStatus = (typeof RULE_STATUSES)[number];

// ============================================================================
// PERIOD — With labels (Portuguese)
// ============================================================================

export interface PeriodOption {
  value: string;
  label: string;
  includesToday: boolean;
}

export const PERIOD_OPTIONS: PeriodOption[] = [
  { value: 'current_hour', label: 'Hora atual', includesToday: true },
  { value: 'previous_hour', label: 'Hora anterior', includesToday: false },
  { value: 'last_2_hours', label: 'Últimas 2 horas', includesToday: true },
  { value: 'last_3_hours', label: 'Últimas 3 horas', includesToday: true },
  { value: 'last_6_hours', label: 'Últimas 6 horas', includesToday: true },
  { value: 'last_12_hours', label: 'Últimas 12 horas', includesToday: true },
  { value: 'last_24_hours', label: 'Últimas 24 horas', includesToday: true },
  { value: 'today', label: 'Hoje', includesToday: true },
  { value: 'yesterday', label: 'Ontem', includesToday: false },
  { value: 'last_2d', label: 'Últimos 2 dias', includesToday: false },
  { value: 'last_3d', label: 'Últimos 3 dias', includesToday: false },
  { value: 'last_3d_with_today', label: 'Últimos 3 dias (incl. hoje)', includesToday: true },
  { value: 'last_7d', label: 'Últimos 7 dias', includesToday: false },
  { value: 'last_7d_with_today', label: 'Últimos 7 dias (incl. hoje)', includesToday: true },
  { value: 'last_14d', label: 'Últimos 14 dias', includesToday: false },
  { value: 'last_14d_with_today', label: 'Últimos 14 dias (incl. hoje)', includesToday: true },
  { value: 'last_30d', label: 'Últimos 30 dias', includesToday: false },
  { value: 'last_30d_with_today', label: 'Últimos 30 dias (incl. hoje)', includesToday: true },
  { value: 'this_week_mon', label: 'Esta semana (seg-hoje)', includesToday: true },
  { value: 'this_week_sun', label: 'Esta semana (dom-hoje)', includesToday: true },
  { value: 'last_week', label: 'Semana passada', includesToday: false },
  { value: 'this_month', label: 'Este mês', includesToday: true },
  { value: 'last_month', label: 'Mês passado', includesToday: false },
  { value: 'lifetime', label: 'Todo o período', includesToday: true },
];

// ============================================================================
// FREQUENCY CAP — With labels (Portuguese) and minutes equivalent
// ============================================================================

export interface FrequencyCapOption {
  value: string;
  label: string;
  minutes: number;
}

export const FREQUENCY_CAP_OPTIONS: FrequencyCapOption[] = [
  { value: 'no_limit', label: 'Sem limite', minutes: 0 },
  { value: 'once_per_hour', label: '1x por hora', minutes: 60 },
  { value: 'once_per_2_hours', label: '1x a cada 2 horas', minutes: 120 },
  { value: 'once_per_4_hours', label: '1x a cada 4 horas', minutes: 240 },
  { value: 'once_per_6_hours', label: '1x a cada 6 horas', minutes: 360 },
  { value: 'once_per_8_hours', label: '1x a cada 8 horas', minutes: 480 },
  { value: 'once_per_12_hours', label: '1x a cada 12 horas', minutes: 720 },
  { value: 'once_per_day', label: '1x por dia', minutes: 1440 },
  { value: 'once_per_2_days', label: '1x a cada 2 dias', minutes: 2880 },
  { value: 'once_per_3_days', label: '1x a cada 3 dias', minutes: 4320 },
  { value: 'once_per_week', label: '1x por semana', minutes: 10080 },
  { value: 'once_in_lifetime', label: '1x na vida (nunca mais)', minutes: Infinity },
];

export const FREQUENCY_CAP_VALUES = FREQUENCY_CAP_OPTIONS.map((o) => o.value);
export type FrequencyCap = (typeof FREQUENCY_CAP_VALUES)[number];

// ============================================================================
// CHECK INTERVAL — With labels (Portuguese) and minutes
// ============================================================================

export interface CheckIntervalOption {
  value: string;
  label: string;
  minutes: number;
}

export const CHECK_INTERVAL_OPTIONS: CheckIntervalOption[] = [
  { value: '15_minutes', label: 'A cada 15 minutos', minutes: 15 },
  { value: '30_minutes', label: 'A cada 30 minutos', minutes: 30 },
  { value: '1_hour', label: 'A cada hora', minutes: 60 },
  { value: '2_hours', label: 'A cada 2 horas', minutes: 120 },
  { value: '3_hours', label: 'A cada 3 horas', minutes: 180 },
  { value: '4_hours', label: 'A cada 4 horas', minutes: 240 },
  { value: '6_hours', label: 'A cada 6 horas', minutes: 360 },
  { value: '8_hours', label: 'A cada 8 horas', minutes: 480 },
  { value: '12_hours', label: 'A cada 12 horas', minutes: 720 },
  { value: '24_hours', label: '1x por dia', minutes: 1440 },
  { value: '48_hours', label: 'A cada 2 dias', minutes: 2880 },
  { value: '72_hours', label: 'A cada 3 dias', minutes: 4320 },
];

export const CHECK_INTERVAL_VALUES = CHECK_INTERVAL_OPTIONS.map((o) => o.value);
export type CheckInterval = (typeof CHECK_INTERVAL_VALUES)[number];

// ============================================================================
// GOOGLE CAMPAIGN TYPE — With labels (Portuguese)
// ============================================================================

export interface GoogleCampaignTypeOption {
  value: string;
  label: string;
  /** Levels that can be targeted when this campaign type is selected */
  allowedLevels: EntityLevel[];
}

export const GOOGLE_CAMPAIGN_TYPE_OPTIONS: GoogleCampaignTypeOption[] = [
  {
    value: 'search',
    label: 'Pesquisa (Search)',
    allowedLevels: ['campaign', 'ad_group', 'ad', 'keyword', 'ad_account'],
  },
  {
    value: 'display',
    label: 'Display',
    allowedLevels: ['campaign', 'ad_group', 'ad', 'keyword', 'ad_account'],
  },
  {
    value: 'shopping',
    label: 'Shopping',
    allowedLevels: ['campaign', 'ad_group', 'ad', 'keyword', 'ad_account'],
  },
  {
    value: 'app',
    label: 'App',
    allowedLevels: ['campaign', 'ad_group', 'ad', 'keyword', 'ad_account'],
  },
  {
    value: 'performance_max',
    label: 'Performance Max',
    allowedLevels: ['campaign', 'ad_account'],
  },
  {
    value: 'demand_gen',
    label: 'Demand Gen',
    allowedLevels: ['campaign', 'ad_group', 'ad', 'keyword', 'ad_account'],
  },
];

export const GOOGLE_CAMPAIGN_TYPES = GOOGLE_CAMPAIGN_TYPE_OPTIONS.map(
  (o) => o.value,
);
export type GoogleCampaignType = (typeof GOOGLE_CAMPAIGN_TYPES)[number];

// ============================================================================
// CONDITION OPERATOR — With labels (Portuguese)
// ============================================================================

export interface ConditionOperatorOption {
  value: string;
  label: string;
  symbol: string;
}

export const CONDITION_OPERATOR_OPTIONS: ConditionOperatorOption[] = [
  { value: 'GREATER_THAN', label: 'Maior que', symbol: '>' },
  { value: 'GREATER_THAN_OR_EQUAL', label: 'Maior ou igual a', symbol: '>=' },
  { value: 'LESS_THAN', label: 'Menor que', symbol: '<' },
  { value: 'LESS_THAN_OR_EQUAL', label: 'Menor ou igual a', symbol: '<=' },
  { value: 'EQUAL', label: 'Igual a', symbol: '=' },
  { value: 'NOT_EQUAL', label: 'Diferente de', symbol: '!=' },
  { value: 'BETWEEN', label: 'Entre', symbol: '↔' },
];

// ============================================================================
// FILTER OPERATOR — With labels (Portuguese)
// ============================================================================

export interface FilterOperatorOption {
  value: string;
  label: string;
  fieldTypes: Array<'string' | 'number' | 'enum'>;
}

export const FILTER_OPERATOR_OPTIONS: FilterOperatorOption[] = [
  { value: 'EQUAL', label: 'Igual a', fieldTypes: ['string', 'number', 'enum'] },
  { value: 'NOT_EQUAL', label: 'Diferente de', fieldTypes: ['string', 'number', 'enum'] },
  { value: 'CONTAIN', label: 'Contém', fieldTypes: ['string'] },
  { value: 'NOT_CONTAIN', label: 'Não contém', fieldTypes: ['string'] },
  { value: 'START_WITH', label: 'Começa com', fieldTypes: ['string'] },
  { value: 'END_WITH', label: 'Termina com', fieldTypes: ['string'] },
  { value: 'REGEX', label: 'Expressão regular', fieldTypes: ['string'] },
  { value: 'IN', label: 'Está na lista', fieldTypes: ['enum', 'string'] },
  { value: 'NOT_IN', label: 'Não está na lista', fieldTypes: ['enum', 'string'] },
  { value: 'GREATER_THAN', label: 'Maior que', fieldTypes: ['number'] },
  { value: 'GREATER_THAN_OR_EQUAL', label: 'Maior ou igual a', fieldTypes: ['number'] },
  { value: 'LESS_THAN', label: 'Menor que', fieldTypes: ['number'] },
  { value: 'LESS_THAN_OR_EQUAL', label: 'Menor ou igual a', fieldTypes: ['number'] },
  { value: 'BETWEEN', label: 'Entre', fieldTypes: ['number'] },
];

// ============================================================================
// META ADS ENUM VALUES
// ============================================================================

export const META_EFFECTIVE_STATUS_VALUES = [
  'ACTIVE',
  'PAUSED',
  'DELETED',
  'ARCHIVED',
  'IN_PROCESS',
  'WITH_ISSUES',
  'PENDING_REVIEW',
  'DISAPPROVED',
  'PREAPPROVED',
  'PENDING_BILLING_INFO',
  'CAMPAIGN_PAUSED',
  'ADSET_PAUSED',
] as const;

export const META_OBJECTIVE_VALUES = [
  'OUTCOME_AWARENESS',
  'OUTCOME_ENGAGEMENT',
  'OUTCOME_LEADS',
  'OUTCOME_APP_PROMOTION',
  'OUTCOME_TRAFFIC',
  'OUTCOME_SALES',
] as const;

export const META_OPTIMIZATION_GOAL_VALUES = [
  'NONE',
  'APP_INSTALLS',
  'AD_RECALL_LIFT',
  'ENGAGED_USERS',
  'EVENT_RESPONSES',
  'IMPRESSIONS',
  'LEAD_GENERATION',
  'QUALITY_LEAD',
  'LINK_CLICKS',
  'OFFSITE_CONVERSIONS',
  'PAGE_LIKES',
  'POST_ENGAGEMENT',
  'QUALITY_CALL',
  'REACH',
  'LANDING_PAGE_VIEWS',
  'VISIT_INSTAGRAM_PROFILE',
  'VALUE',
  'THRUPLAY',
  'DERIVED_EVENTS',
  'APP_INSTALLS_AND_OFFSITE_CONVERSIONS',
  'CONVERSATIONS',
  'IN_APP_VALUE',
  'MESSAGING_PURCHASE_CONVERSION',
  'SUBSCRIBERS',
  'REMINDERS_SET',
  'MEANINGFUL_CALL_ATTEMPT',
  'PROFILE_VISIT',
] as const;

export const META_BID_STRATEGY_VALUES = [
  'LOWEST_COST_WITHOUT_CAP',
  'LOWEST_COST_WITH_BID_CAP',
  'COST_CAP',
  'LOWEST_COST_WITH_MIN_ROAS',
] as const;

export const META_BUYING_TYPE_VALUES = ['AUCTION', 'RESERVED'] as const;

export const META_BILLING_EVENT_VALUES = [
  'IMPRESSIONS',
  'LINK_CLICKS',
  'POST_ENGAGEMENT',
  'PAGE_LIKES',
  'OFFER_CLAIMS',
  'THRUPLAY',
  'APP_INSTALLS',
] as const;

export const META_DESTINATION_TYPE_VALUES = [
  'WEBSITE',
  'APP',
  'MESSENGER',
  'WHATSAPP',
  'INSTAGRAM_DIRECT',
  'PHONE_CALL',
  'SHOP_AUTOMATIC',
  'ON_AD',
  'ON_POST',
  'ON_PAGE',
  'ON_EVENT',
  'ON_VIDEO',
] as const;

export const META_CREATIVE_TYPE_VALUES = [
  'IMAGE',
  'VIDEO',
  'CAROUSEL',
  'COLLECTION',
  'SLIDESHOW',
  'INSTANT_EXPERIENCE',
] as const;

export const META_STATUS_VALUES = ['ACTIVE', 'PAUSED', 'DELETED', 'ARCHIVED'] as const;

// ============================================================================
// GOOGLE ADS ENUM VALUES
// ============================================================================

export const GOOGLE_STATUS_VALUES = ['ENABLED', 'PAUSED', 'REMOVED'] as const;

export const GOOGLE_BIDDING_STRATEGY_TYPE_VALUES = [
  'MANUAL_CPC',
  'MANUAL_CPM',
  'MANUAL_CPV',
  'MAXIMIZE_CONVERSIONS',
  'MAXIMIZE_CONVERSION_VALUE',
  'TARGET_CPA',
  'TARGET_IMPRESSION_SHARE',
  'TARGET_ROAS',
  'TARGET_SPEND',
  'PERCENT_CPC',
  'COMMISSION',
] as const;

export const GOOGLE_ADVERTISING_CHANNEL_TYPE_VALUES = [
  'SEARCH',
  'DISPLAY',
  'SHOPPING',
  'VIDEO',
  'MULTI_CHANNEL',
  'LOCAL',
  'SMART',
  'PERFORMANCE_MAX',
  'DEMAND_GEN',
  'TRAVEL',
] as const;

export const GOOGLE_AD_GROUP_TYPE_VALUES = [
  'SEARCH_STANDARD',
  'DISPLAY_STANDARD',
  'SHOPPING_PRODUCT_ADS',
  'SHOPPING_SHOWCASE_ADS',
  'HOTEL_ADS',
  'VIDEO_TRUE_VIEW_IN_STREAM',
  'VIDEO_BUMPER',
  'VIDEO_RESPONSIVE',
] as const;

export const GOOGLE_AD_TYPE_VALUES = [
  'RESPONSIVE_SEARCH_AD',
  'EXPANDED_TEXT_AD',
  'CALL_AD',
  'RESPONSIVE_DISPLAY_AD',
  'IMAGE_AD',
  'VIDEO_AD',
  'SHOPPING_PRODUCT_AD',
  'APP_AD',
  'SMART_CAMPAIGN_AD',
  'LEGACY_RESPONSIVE_DISPLAY_AD',
  'HOTEL_AD',
] as const;

export const GOOGLE_KEYWORD_MATCH_TYPE_VALUES = [
  'EXACT',
  'PHRASE',
  'BROAD',
] as const;

// ============================================================================
// EXECUTION LOG STATUS
// ============================================================================

export const EXECUTION_LOG_STATUSES = [
  'completed',
  'partial',
  'failed',
  'skipped',
  'rate_limited',
] as const;

export type ExecutionLogStatus = (typeof EXECUTION_LOG_STATUSES)[number];

// ============================================================================
// SCHEDULE TYPE
// ============================================================================

export const SCHEDULE_TYPES = ['frequency', 'custom'] as const;
export type ScheduleType = (typeof SCHEDULE_TYPES)[number];

// ============================================================================
// WEEKDAYS
// ============================================================================

export const WEEKDAYS = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'] as const;
export type Weekday = (typeof WEEKDAYS)[number];

export interface WeekdayOption {
  value: Weekday;
  label: string;
  shortLabel: string;
}

export const WEEKDAY_OPTIONS: WeekdayOption[] = [
  { value: 'mon', label: 'Segunda-feira', shortLabel: 'Seg' },
  { value: 'tue', label: 'Terça-feira', shortLabel: 'Ter' },
  { value: 'wed', label: 'Quarta-feira', shortLabel: 'Qua' },
  { value: 'thu', label: 'Quinta-feira', shortLabel: 'Qui' },
  { value: 'fri', label: 'Sexta-feira', shortLabel: 'Sex' },
  { value: 'sat', label: 'Sábado', shortLabel: 'Sáb' },
  { value: 'sun', label: 'Domingo', shortLabel: 'Dom' },
];
