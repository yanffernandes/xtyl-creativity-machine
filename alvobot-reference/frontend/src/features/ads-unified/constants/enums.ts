// ============================================================================
// AUTOMATION ENGINE — ENUM CONSTANTS (Frontend)
// Metadata-driven constants for UI dropdowns and form validation.
// All labels in Portuguese (pt-BR).
// ============================================================================

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
] as const

export type EntityLevel = (typeof ENTITY_LEVELS)[number]

export interface EntityLevelOption {
  value: EntityLevel
  label: string
  /** Short label for compact UI (badges, pills) */
  shortLabel: string
}

export const ENTITY_LEVEL_OPTIONS: EntityLevelOption[] = [
  { value: 'campaign', label: 'Campanha', shortLabel: 'Camp.' },
  { value: 'adset', label: 'Conjunto de Anúncios', shortLabel: 'Ad Set' },
  { value: 'ad_group', label: 'Grupo de Anúncios', shortLabel: 'Ad Group' },
  { value: 'ad', label: 'Anúncio', shortLabel: 'Ad' },
  { value: 'keyword', label: 'Palavra-chave', shortLabel: 'Keyword' },
  { value: 'ad_account', label: 'Conta de Anúncios', shortLabel: 'Conta' },
]

/** Levels available per platform */
export const LEVELS_BY_PLATFORM: Record<string, EntityLevel[]> = {
  meta: ['campaign', 'adset', 'ad', 'ad_account'],
  google: ['campaign', 'ad_group', 'ad', 'keyword', 'ad_account'],
}

// ============================================================================
// PLATFORM
// ============================================================================

export const PLATFORMS = ['meta', 'google'] as const
export type Platform = (typeof PLATFORMS)[number]

export interface PlatformOption {
  value: Platform
  label: string
  color: string
}

export const PLATFORM_OPTIONS: PlatformOption[] = [
  { value: 'meta', label: 'Meta Ads', color: '#3b82f6' },
  { value: 'google', label: 'Google Ads', color: '#ea4335' },
]

// ============================================================================
// RULE STATUS
// ============================================================================

export const RULE_STATUSES = ['active', 'paused', 'draft'] as const
export type RuleStatus = (typeof RULE_STATUSES)[number]

export interface RuleStatusOption {
  value: RuleStatus
  label: string
  color: string
}

export const RULE_STATUS_OPTIONS: RuleStatusOption[] = [
  { value: 'active', label: 'Ativa', color: 'var(--color-success)' },
  { value: 'paused', label: 'Pausada', color: 'var(--color-warning)' },
  { value: 'draft', label: 'Rascunho', color: 'var(--color-text-tertiary)' },
]

// ============================================================================
// FILTER OPERATOR
// ============================================================================

export const FILTER_OPERATORS = [
  'EQUAL',
  'NOT_EQUAL',
  'CONTAIN',
  'NOT_CONTAIN',
  'START_WITH',
  'END_WITH',
  'REGEX',
  'IN',
  'NOT_IN',
  'GREATER_THAN',
  'GREATER_THAN_OR_EQUAL',
  'LESS_THAN',
  'LESS_THAN_OR_EQUAL',
  'BETWEEN',
] as const

export type FilterOperator = (typeof FILTER_OPERATORS)[number]

export interface FilterOperatorOption {
  value: FilterOperator
  label: string
  shortLabel: string
  fieldTypes: Array<'string' | 'number' | 'enum'>
}

export const FILTER_OPERATOR_OPTIONS: FilterOperatorOption[] = [
  { value: 'EQUAL', label: 'Igual a', shortLabel: '=', fieldTypes: ['string', 'number', 'enum'] },
  { value: 'NOT_EQUAL', label: 'Diferente de', shortLabel: '≠', fieldTypes: ['string', 'number', 'enum'] },
  { value: 'CONTAIN', label: 'Contém', shortLabel: '∋', fieldTypes: ['string'] },
  { value: 'NOT_CONTAIN', label: 'Não contém', shortLabel: '∌', fieldTypes: ['string'] },
  { value: 'START_WITH', label: 'Começa com', shortLabel: 'A…', fieldTypes: ['string'] },
  { value: 'END_WITH', label: 'Termina com', shortLabel: '…Z', fieldTypes: ['string'] },
  { value: 'REGEX', label: 'Expressão regular', shortLabel: '/./', fieldTypes: ['string'] },
  { value: 'IN', label: 'Está na lista', shortLabel: '∈', fieldTypes: ['enum', 'string'] },
  { value: 'NOT_IN', label: 'Não está na lista', shortLabel: '∉', fieldTypes: ['enum', 'string'] },
  { value: 'GREATER_THAN', label: 'Maior que', shortLabel: '>', fieldTypes: ['number'] },
  { value: 'GREATER_THAN_OR_EQUAL', label: 'Maior ou igual a', shortLabel: '≥', fieldTypes: ['number'] },
  { value: 'LESS_THAN', label: 'Menor que', shortLabel: '<', fieldTypes: ['number'] },
  { value: 'LESS_THAN_OR_EQUAL', label: 'Menor ou igual a', shortLabel: '≤', fieldTypes: ['number'] },
  { value: 'BETWEEN', label: 'Entre', shortLabel: '↔', fieldTypes: ['number'] },
]

// ============================================================================
// CONDITION OPERATOR
// ============================================================================

export const CONDITION_OPERATORS = [
  'GREATER_THAN',
  'GREATER_THAN_OR_EQUAL',
  'LESS_THAN',
  'LESS_THAN_OR_EQUAL',
  'EQUAL',
  'NOT_EQUAL',
  'BETWEEN',
] as const

export type ConditionOperator = (typeof CONDITION_OPERATORS)[number]

export interface ConditionOperatorOption {
  value: ConditionOperator
  label: string
  symbol: string
}

export const CONDITION_OPERATOR_OPTIONS: ConditionOperatorOption[] = [
  { value: 'GREATER_THAN', label: 'Maior que', symbol: '>' },
  { value: 'GREATER_THAN_OR_EQUAL', label: 'Maior ou igual a', symbol: '>=' },
  { value: 'LESS_THAN', label: 'Menor que', symbol: '<' },
  { value: 'LESS_THAN_OR_EQUAL', label: 'Menor ou igual a', symbol: '<=' },
  { value: 'EQUAL', label: 'Igual a', symbol: '=' },
  { value: 'NOT_EQUAL', label: 'Diferente de', symbol: '!=' },
  { value: 'BETWEEN', label: 'Entre', symbol: '↔' },
]

// ============================================================================
// PERIOD — With labels (Portuguese)
// ============================================================================

export const PERIODS = [
  'current_hour',
  'previous_hour',
  'last_2_hours',
  'last_3_hours',
  'last_6_hours',
  'last_12_hours',
  'last_24_hours',
  'today',
  'yesterday',
  'last_2d',
  'last_3d',
  'last_3d_with_today',
  'last_7d',
  'last_7d_with_today',
  'last_14d',
  'last_14d_with_today',
  'last_30d',
  'last_30d_with_today',
  'this_week_mon',
  'this_week_sun',
  'last_week',
  'this_month',
  'last_month',
  'lifetime',
] as const

export type Period = (typeof PERIODS)[number]

export interface PeriodOption {
  value: Period
  label: string
  includesToday: boolean
  /** Group for organizing in dropdown */
  group: 'hours' | 'days' | 'weeks' | 'months' | 'other'
}

export const PERIOD_OPTIONS: PeriodOption[] = [
  // Hours
  { value: 'current_hour', label: 'Hora atual', includesToday: true, group: 'hours' },
  { value: 'previous_hour', label: 'Hora anterior', includesToday: false, group: 'hours' },
  { value: 'last_2_hours', label: 'Últimas 2 horas', includesToday: true, group: 'hours' },
  { value: 'last_3_hours', label: 'Últimas 3 horas', includesToday: true, group: 'hours' },
  { value: 'last_6_hours', label: 'Últimas 6 horas', includesToday: true, group: 'hours' },
  { value: 'last_12_hours', label: 'Últimas 12 horas', includesToday: true, group: 'hours' },
  { value: 'last_24_hours', label: 'Últimas 24 horas', includesToday: true, group: 'hours' },

  // Days
  { value: 'today', label: 'Hoje', includesToday: true, group: 'days' },
  { value: 'yesterday', label: 'Ontem', includesToday: false, group: 'days' },
  { value: 'last_2d', label: 'Últimos 2 dias', includesToday: false, group: 'days' },
  { value: 'last_3d', label: 'Últimos 3 dias', includesToday: false, group: 'days' },
  { value: 'last_3d_with_today', label: 'Últimos 3 dias (incl. hoje)', includesToday: true, group: 'days' },
  { value: 'last_7d', label: 'Últimos 7 dias', includesToday: false, group: 'days' },
  { value: 'last_7d_with_today', label: 'Últimos 7 dias (incl. hoje)', includesToday: true, group: 'days' },
  { value: 'last_14d', label: 'Últimos 14 dias', includesToday: false, group: 'days' },
  { value: 'last_14d_with_today', label: 'Últimos 14 dias (incl. hoje)', includesToday: true, group: 'days' },
  { value: 'last_30d', label: 'Últimos 30 dias', includesToday: false, group: 'days' },
  { value: 'last_30d_with_today', label: 'Últimos 30 dias (incl. hoje)', includesToday: true, group: 'days' },

  // Weeks
  { value: 'this_week_mon', label: 'Esta semana (seg-hoje)', includesToday: true, group: 'weeks' },
  { value: 'this_week_sun', label: 'Esta semana (dom-hoje)', includesToday: true, group: 'weeks' },
  { value: 'last_week', label: 'Semana passada', includesToday: false, group: 'weeks' },

  // Months
  { value: 'this_month', label: 'Este mês', includesToday: true, group: 'months' },
  { value: 'last_month', label: 'Mês passado', includesToday: false, group: 'months' },

  // Other
  { value: 'lifetime', label: 'Todo o período', includesToday: true, group: 'other' },
]

/** Group labels for the period dropdown sections */
export const PERIOD_GROUP_LABELS: Record<PeriodOption['group'], string> = {
  hours: 'Horas',
  days: 'Dias',
  weeks: 'Semanas',
  months: 'Meses',
  other: 'Outros',
}

// ============================================================================
// FREQUENCY CAP — With labels (Portuguese) and minutes equivalent
// ============================================================================

export interface FrequencyCapOption {
  value: string
  label: string
  minutes: number
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
]

export const FREQUENCY_CAP_VALUES = FREQUENCY_CAP_OPTIONS.map((o) => o.value)
export type FrequencyCap = (typeof FREQUENCY_CAP_VALUES)[number]

// ============================================================================
// CHECK INTERVAL — With labels (Portuguese) and minutes
// ============================================================================

export interface CheckIntervalOption {
  value: string
  label: string
  minutes: number
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
]

export const CHECK_INTERVAL_VALUES = CHECK_INTERVAL_OPTIONS.map((o) => o.value)
export type CheckInterval = (typeof CHECK_INTERVAL_VALUES)[number]

// ============================================================================
// GOOGLE CAMPAIGN TYPE — With labels (Portuguese)
// ============================================================================

export interface GoogleCampaignTypeOption {
  value: string
  label: string
  allowedLevels: EntityLevel[]
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
]

export const GOOGLE_CAMPAIGN_TYPES = GOOGLE_CAMPAIGN_TYPE_OPTIONS.map((o) => o.value)
export type GoogleCampaignType = (typeof GOOGLE_CAMPAIGN_TYPES)[number]

// ============================================================================
// CONDITION TYPE
// ============================================================================

export const CONDITION_TYPES = [
  'simple',
  'metric_comparison',
  'ranking',
  'time',
  'lifecycle',
] as const

export type ConditionType = (typeof CONDITION_TYPES)[number]

export interface ConditionTypeOption {
  value: ConditionType
  label: string
  description: string
}

export const CONDITION_TYPE_OPTIONS: ConditionTypeOption[] = [
  { value: 'simple', label: 'Métrica vs Valor', description: 'Compara uma métrica com um valor fixo' },
  { value: 'metric_comparison', label: 'Métrica vs Métrica', description: 'Compara uma métrica com outra métrica em períodos diferentes' },
  { value: 'ranking', label: 'Ranking', description: 'Top/Bottom N entidades ou N% por uma métrica' },
  { value: 'time', label: 'Horário', description: 'Condição baseada no horário do dia' },
  { value: 'lifecycle', label: 'Ciclo de Vida', description: 'Condição baseada na idade da entidade' },
]

// ============================================================================
// META ADS ENUM VALUES (with labels for UI)
// ============================================================================

export interface EnumValueOption {
  value: string
  label: string
}

export const META_EFFECTIVE_STATUS_OPTIONS: EnumValueOption[] = [
  { value: 'ACTIVE', label: 'Ativo' },
  { value: 'PAUSED', label: 'Pausado' },
  { value: 'DELETED', label: 'Excluído' },
  { value: 'ARCHIVED', label: 'Arquivado' },
  { value: 'IN_PROCESS', label: 'Em processamento' },
  { value: 'WITH_ISSUES', label: 'Com problemas' },
  { value: 'PENDING_REVIEW', label: 'Aguardando revisão' },
  { value: 'DISAPPROVED', label: 'Reprovado' },
  { value: 'PREAPPROVED', label: 'Pré-aprovado' },
  { value: 'PENDING_BILLING_INFO', label: 'Aguardando info de pagamento' },
  { value: 'CAMPAIGN_PAUSED', label: 'Pausado por campanha' },
  { value: 'ADSET_PAUSED', label: 'Pausado por ad set' },
]

export const META_STATUS_OPTIONS: EnumValueOption[] = [
  { value: 'ACTIVE', label: 'Ativo' },
  { value: 'PAUSED', label: 'Pausado' },
  { value: 'DELETED', label: 'Excluído' },
  { value: 'ARCHIVED', label: 'Arquivado' },
]

export const META_OBJECTIVE_OPTIONS: EnumValueOption[] = [
  { value: 'OUTCOME_AWARENESS', label: 'Reconhecimento' },
  { value: 'OUTCOME_ENGAGEMENT', label: 'Engajamento' },
  { value: 'OUTCOME_LEADS', label: 'Cadastros/Leads' },
  { value: 'OUTCOME_APP_PROMOTION', label: 'Promoção de App' },
  { value: 'OUTCOME_TRAFFIC', label: 'Tráfego' },
  { value: 'OUTCOME_SALES', label: 'Vendas/Conversões' },
]

export const META_OPTIMIZATION_GOAL_OPTIONS: EnumValueOption[] = [
  { value: 'NONE', label: 'Nenhum' },
  { value: 'APP_INSTALLS', label: 'Instalações de app' },
  { value: 'AD_RECALL_LIFT', label: 'Recall de marca' },
  { value: 'ENGAGED_USERS', label: 'Usuários engajados' },
  { value: 'EVENT_RESPONSES', label: 'Respostas a eventos' },
  { value: 'IMPRESSIONS', label: 'Impressões' },
  { value: 'LEAD_GENERATION', label: 'Geração de leads' },
  { value: 'QUALITY_LEAD', label: 'Leads qualificados' },
  { value: 'LINK_CLICKS', label: 'Cliques no link' },
  { value: 'OFFSITE_CONVERSIONS', label: 'Conversões no site' },
  { value: 'PAGE_LIKES', label: 'Curtidas na página' },
  { value: 'POST_ENGAGEMENT', label: 'Engajamento no post' },
  { value: 'QUALITY_CALL', label: 'Ligações de qualidade' },
  { value: 'REACH', label: 'Alcance' },
  { value: 'LANDING_PAGE_VIEWS', label: 'Views de landing page' },
  { value: 'VISIT_INSTAGRAM_PROFILE', label: 'Visitas ao perfil IG' },
  { value: 'VALUE', label: 'Valor de conversão' },
  { value: 'THRUPLAY', label: 'ThruPlay (vídeo)' },
  { value: 'DERIVED_EVENTS', label: 'Eventos derivados' },
  { value: 'APP_INSTALLS_AND_OFFSITE_CONVERSIONS', label: 'Instalações + conversões' },
  { value: 'CONVERSATIONS', label: 'Conversas' },
  { value: 'IN_APP_VALUE', label: 'Valor in-app' },
  { value: 'MESSAGING_PURCHASE_CONVERSION', label: 'Conversão por mensagem' },
  { value: 'SUBSCRIBERS', label: 'Assinantes' },
  { value: 'REMINDERS_SET', label: 'Lembretes configurados' },
  { value: 'MEANINGFUL_CALL_ATTEMPT', label: 'Ligação significativa' },
  { value: 'PROFILE_VISIT', label: 'Visita ao perfil' },
]

export const META_BID_STRATEGY_OPTIONS: EnumValueOption[] = [
  { value: 'LOWEST_COST_WITHOUT_CAP', label: 'Menor Custo (Highest Volume)' },
  { value: 'LOWEST_COST_WITH_BID_CAP', label: 'Menor Custo com Bid Cap' },
  { value: 'COST_CAP', label: 'Cost Cap' },
  { value: 'LOWEST_COST_WITH_MIN_ROAS', label: 'ROAS Mínimo' },
]

export const META_BUYING_TYPE_OPTIONS: EnumValueOption[] = [
  { value: 'AUCTION', label: 'Leilão' },
  { value: 'RESERVED', label: 'Reserva' },
]

export const META_BILLING_EVENT_OPTIONS: EnumValueOption[] = [
  { value: 'IMPRESSIONS', label: 'Impressões' },
  { value: 'LINK_CLICKS', label: 'Cliques no link' },
  { value: 'POST_ENGAGEMENT', label: 'Engajamento no post' },
  { value: 'PAGE_LIKES', label: 'Curtidas na página' },
  { value: 'OFFER_CLAIMS', label: 'Ofertas resgatadas' },
  { value: 'THRUPLAY', label: 'ThruPlay' },
  { value: 'APP_INSTALLS', label: 'Instalações de app' },
]

export const META_DESTINATION_TYPE_OPTIONS: EnumValueOption[] = [
  { value: 'WEBSITE', label: 'Website' },
  { value: 'APP', label: 'App' },
  { value: 'MESSENGER', label: 'Messenger' },
  { value: 'WHATSAPP', label: 'WhatsApp' },
  { value: 'INSTAGRAM_DIRECT', label: 'Instagram Direct' },
  { value: 'PHONE_CALL', label: 'Ligação telefônica' },
  { value: 'SHOP_AUTOMATIC', label: 'Loja automática' },
  { value: 'ON_AD', label: 'No anúncio' },
  { value: 'ON_POST', label: 'No post' },
  { value: 'ON_PAGE', label: 'Na página' },
  { value: 'ON_EVENT', label: 'No evento' },
  { value: 'ON_VIDEO', label: 'No vídeo' },
]

export const META_CREATIVE_TYPE_OPTIONS: EnumValueOption[] = [
  { value: 'IMAGE', label: 'Imagem' },
  { value: 'VIDEO', label: 'Vídeo' },
  { value: 'CAROUSEL', label: 'Carrossel' },
  { value: 'COLLECTION', label: 'Coleção' },
  { value: 'SLIDESHOW', label: 'Slideshow' },
  { value: 'INSTANT_EXPERIENCE', label: 'Experiência Instantânea' },
]

// ============================================================================
// GOOGLE ADS ENUM VALUES (with labels for UI)
// ============================================================================

export const GOOGLE_STATUS_OPTIONS: EnumValueOption[] = [
  { value: 'ENABLED', label: 'Ativo' },
  { value: 'PAUSED', label: 'Pausado' },
  { value: 'REMOVED', label: 'Removido' },
]

export const GOOGLE_BIDDING_STRATEGY_OPTIONS: EnumValueOption[] = [
  { value: 'MANUAL_CPC', label: 'CPC Manual' },
  { value: 'MANUAL_CPM', label: 'CPM Manual' },
  { value: 'MANUAL_CPV', label: 'CPV Manual' },
  { value: 'MAXIMIZE_CONVERSIONS', label: 'Maximizar Conversões' },
  { value: 'MAXIMIZE_CONVERSION_VALUE', label: 'Maximizar Valor de Conversão' },
  { value: 'TARGET_CPA', label: 'CPA Desejado' },
  { value: 'TARGET_IMPRESSION_SHARE', label: 'Parcela de Impressões' },
  { value: 'TARGET_ROAS', label: 'ROAS Desejado' },
  { value: 'TARGET_SPEND', label: 'Gasto Desejado' },
  { value: 'PERCENT_CPC', label: 'CPC Percentual' },
  { value: 'COMMISSION', label: 'Comissão' },
]

export const GOOGLE_ADVERTISING_CHANNEL_OPTIONS: EnumValueOption[] = [
  { value: 'SEARCH', label: 'Pesquisa' },
  { value: 'DISPLAY', label: 'Display' },
  { value: 'SHOPPING', label: 'Shopping' },
  { value: 'VIDEO', label: 'Vídeo' },
  { value: 'MULTI_CHANNEL', label: 'Multi-Canal' },
  { value: 'LOCAL', label: 'Local' },
  { value: 'SMART', label: 'Smart' },
  { value: 'PERFORMANCE_MAX', label: 'Performance Max' },
  { value: 'DEMAND_GEN', label: 'Demand Gen' },
  { value: 'TRAVEL', label: 'Viagem' },
]

export const GOOGLE_AD_GROUP_TYPE_OPTIONS: EnumValueOption[] = [
  { value: 'SEARCH_STANDARD', label: 'Pesquisa Padrão' },
  { value: 'DISPLAY_STANDARD', label: 'Display Padrão' },
  { value: 'SHOPPING_PRODUCT_ADS', label: 'Shopping - Produto' },
  { value: 'SHOPPING_SHOWCASE_ADS', label: 'Shopping - Showcase' },
  { value: 'HOTEL_ADS', label: 'Hotel' },
  { value: 'VIDEO_TRUE_VIEW_IN_STREAM', label: 'Vídeo TrueView In-Stream' },
  { value: 'VIDEO_BUMPER', label: 'Vídeo Bumper' },
  { value: 'VIDEO_RESPONSIVE', label: 'Vídeo Responsivo' },
]

export const GOOGLE_AD_TYPE_OPTIONS: EnumValueOption[] = [
  { value: 'RESPONSIVE_SEARCH_AD', label: 'Anúncio de Pesquisa Responsivo' },
  { value: 'EXPANDED_TEXT_AD', label: 'Anúncio de Texto Expandido' },
  { value: 'CALL_AD', label: 'Anúncio de Ligação' },
  { value: 'RESPONSIVE_DISPLAY_AD', label: 'Anúncio de Display Responsivo' },
  { value: 'IMAGE_AD', label: 'Anúncio de Imagem' },
  { value: 'VIDEO_AD', label: 'Anúncio de Vídeo' },
  { value: 'SHOPPING_PRODUCT_AD', label: 'Anúncio de Shopping' },
  { value: 'APP_AD', label: 'Anúncio de App' },
  { value: 'SMART_CAMPAIGN_AD', label: 'Anúncio Smart' },
  { value: 'LEGACY_RESPONSIVE_DISPLAY_AD', label: 'Display Responsivo (Legado)' },
  { value: 'HOTEL_AD', label: 'Anúncio de Hotel' },
]

export const GOOGLE_KEYWORD_MATCH_TYPE_OPTIONS: EnumValueOption[] = [
  { value: 'EXACT', label: 'Correspondência Exata' },
  { value: 'PHRASE', label: 'Correspondência de Frase' },
  { value: 'BROAD', label: 'Correspondência Ampla' },
]

// ============================================================================
// EXECUTION LOG STATUS
// ============================================================================

export const EXECUTION_LOG_STATUSES = [
  'completed',
  'partial',
  'failed',
  'skipped',
  'rate_limited',
] as const

export type ExecutionLogStatus = (typeof EXECUTION_LOG_STATUSES)[number]

export interface ExecutionLogStatusOption {
  value: ExecutionLogStatus
  label: string
  color: string
}

export const EXECUTION_LOG_STATUS_OPTIONS: ExecutionLogStatusOption[] = [
  { value: 'completed', label: 'Concluído', color: 'var(--color-success)' },
  { value: 'partial', label: 'Parcial', color: 'var(--color-warning)' },
  { value: 'failed', label: 'Falhou', color: 'var(--color-error)' },
  { value: 'skipped', label: 'Ignorado', color: 'var(--color-text-tertiary)' },
  { value: 'rate_limited', label: 'Rate Limited', color: 'var(--color-warning)' },
]

// ============================================================================
// SCHEDULE TYPE
// ============================================================================

export const SCHEDULE_TYPES = ['frequency', 'custom'] as const
export type ScheduleType = (typeof SCHEDULE_TYPES)[number]

export interface ScheduleTypeOption {
  value: ScheduleType
  label: string
  description: string
}

export const SCHEDULE_TYPE_OPTIONS: ScheduleTypeOption[] = [
  { value: 'frequency', label: 'Frequência fixa', description: 'Executa em intervalo fixo, 24/7' },
  { value: 'custom', label: 'Horários personalizados', description: 'Executa em dias e horários específicos' },
]

// ============================================================================
// WEEKDAYS
// ============================================================================

export const WEEKDAYS = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'] as const
export type Weekday = (typeof WEEKDAYS)[number]

export interface WeekdayOption {
  value: Weekday
  label: string
  shortLabel: string
}

export const WEEKDAY_OPTIONS: WeekdayOption[] = [
  { value: 'mon', label: 'Segunda-feira', shortLabel: 'Seg' },
  { value: 'tue', label: 'Terça-feira', shortLabel: 'Ter' },
  { value: 'wed', label: 'Quarta-feira', shortLabel: 'Qua' },
  { value: 'thu', label: 'Quinta-feira', shortLabel: 'Qui' },
  { value: 'fri', label: 'Sexta-feira', shortLabel: 'Sex' },
  { value: 'sat', label: 'Sábado', shortLabel: 'Sáb' },
  { value: 'sun', label: 'Domingo', shortLabel: 'Dom' },
]

// ============================================================================
// HELPERS
// ============================================================================

/** Get levels available for a given platform */
export function getLevelsForPlatform(platform: string): EntityLevel[] {
  return LEVELS_BY_PLATFORM[platform] ?? []
}

/** Get the label for an entity level */
export function getLevelLabel(level: EntityLevel): string {
  return ENTITY_LEVEL_OPTIONS.find((o) => o.value === level)?.label ?? level
}

/** Get the label for a period */
export function getPeriodLabel(period: Period): string {
  return PERIOD_OPTIONS.find((o) => o.value === period)?.label ?? period
}

/** Get the label for a condition operator */
export function getConditionOperatorLabel(op: ConditionOperator): string {
  return CONDITION_OPERATOR_OPTIONS.find((o) => o.value === op)?.label ?? op
}

/** Get the symbol for a condition operator */
export function getConditionOperatorSymbol(op: ConditionOperator): string {
  return CONDITION_OPERATOR_OPTIONS.find((o) => o.value === op)?.symbol ?? op
}

/** Get the label for a filter operator */
export function getFilterOperatorLabel(op: FilterOperator): string {
  return FILTER_OPERATOR_OPTIONS.find((o) => o.value === op)?.label ?? op
}

/** Get the label for a frequency cap value */
export function getFrequencyCapLabel(cap: string): string {
  return FREQUENCY_CAP_OPTIONS.find((o) => o.value === cap)?.label ?? cap
}

/** Get enum value options for a Meta field */
export function getMetaEnumOptions(fieldName: string): EnumValueOption[] {
  const mapping: Record<string, EnumValueOption[]> = {
    'campaign.status': META_STATUS_OPTIONS,
    'campaign.effective_status': META_EFFECTIVE_STATUS_OPTIONS,
    'campaign.objective': META_OBJECTIVE_OPTIONS,
    'campaign.buying_type': META_BUYING_TYPE_OPTIONS,
    'campaign.bid_strategy': META_BID_STRATEGY_OPTIONS,
    'adset.status': META_STATUS_OPTIONS,
    'adset.effective_status': META_EFFECTIVE_STATUS_OPTIONS,
    'adset.optimization_goal': META_OPTIMIZATION_GOAL_OPTIONS,
    'adset.billing_event': META_BILLING_EVENT_OPTIONS,
    'adset.destination_type': META_DESTINATION_TYPE_OPTIONS,
    'ad.status': META_STATUS_OPTIONS,
    'ad.effective_status': META_EFFECTIVE_STATUS_OPTIONS,
    'ad.creative_type': META_CREATIVE_TYPE_OPTIONS,
  }
  return mapping[fieldName] ?? []
}

/** Get enum value options for a Google field */
export function getGoogleEnumOptions(fieldName: string): EnumValueOption[] {
  const mapping: Record<string, EnumValueOption[]> = {
    'campaign.status': GOOGLE_STATUS_OPTIONS,
    'campaign.advertising_channel_type': GOOGLE_ADVERTISING_CHANNEL_OPTIONS,
    'campaign.bidding_strategy_type': GOOGLE_BIDDING_STRATEGY_OPTIONS,
    'ad_group.status': GOOGLE_STATUS_OPTIONS,
    'ad_group.type': GOOGLE_AD_GROUP_TYPE_OPTIONS,
    'ad.status': GOOGLE_STATUS_OPTIONS,
    'ad.type': GOOGLE_AD_TYPE_OPTIONS,
    'keyword.status': GOOGLE_STATUS_OPTIONS,
    'keyword.match_type': GOOGLE_KEYWORD_MATCH_TYPE_OPTIONS,
  }
  return mapping[fieldName] ?? []
}

/** Get enum value options for a field (any platform) */
export function getEnumOptions(platform: string, fieldName: string): EnumValueOption[] {
  if (platform === 'meta') return getMetaEnumOptions(fieldName)
  if (platform === 'google') return getGoogleEnumOptions(fieldName)
  return []
}
