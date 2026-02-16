/**
 * Advanced Metric Filters - Utilities
 *
 * Helpers para formatação, validação e aplicação de filtros de métricas.
 */

import type {
  FilterableMetric,
  FilterOperator,
  MetricConfig,
  MetricFilter,
  OperatorConfig,
} from '../types/filters'

/** Configuração de todas as métricas filtráveis */
export const METRIC_CONFIGS: MetricConfig[] = [
  // Volume
  { key: 'impressions', label: 'Impressões', group: 'volume', format: 'number' },
  { key: 'clicks', label: 'Cliques', group: 'volume', format: 'number' },
  { key: 'conversions', label: 'Conversões', group: 'volume', format: 'number' },
  // Cost
  { key: 'cost', label: 'Gasto', group: 'cost', format: 'currency', symbol: 'R$', symbolPosition: 'before' },
  { key: 'cpc', label: 'CPC', group: 'cost', format: 'currency', symbol: 'R$', symbolPosition: 'before' },
  { key: 'cpa', label: 'CPA', group: 'cost', format: 'currency', symbol: 'R$', symbolPosition: 'before' },
  // Performance
  { key: 'ctr', label: 'CTR', group: 'performance', format: 'percent', symbol: '%', symbolPosition: 'after' },
  { key: 'conversionRate', label: 'Taxa Conv.', group: 'performance', format: 'percent', symbol: '%', symbolPosition: 'after' },
  { key: 'roas', label: 'ROAS', group: 'performance', format: 'multiplier', symbol: 'x', symbolPosition: 'after' },
]

/** Configuração de operadores */
export const OPERATOR_CONFIGS: OperatorConfig[] = [
  { key: 'gt', label: 'maior que', shortLabel: '>', requiresSecondValue: false },
  { key: 'lt', label: 'menor que', shortLabel: '<', requiresSecondValue: false },
  { key: 'eq', label: 'igual a', shortLabel: '=', requiresSecondValue: false },
  { key: 'between', label: 'entre', shortLabel: 'entre', requiresSecondValue: true },
]

/** Labels dos grupos de métricas */
export const GROUP_LABELS: Record<MetricConfig['group'], string> = {
  volume: 'Volume',
  cost: 'Custo',
  performance: 'Performance',
}

/** Obtém a configuração de uma métrica */
export function getMetricConfig(metric: FilterableMetric): MetricConfig | undefined {
  return METRIC_CONFIGS.find(c => c.key === metric)
}

/** Obtém a configuração de um operador */
export function getOperatorConfig(operator: FilterOperator): OperatorConfig | undefined {
  return OPERATOR_CONFIGS.find(c => c.key === operator)
}

/** Formata um valor numérico de acordo com o tipo da métrica */
export function formatMetricValue(value: number, metric: FilterableMetric): string {
  const config = getMetricConfig(metric)
  if (!config) return value.toLocaleString('pt-BR')

  switch (config.format) {
    case 'currency':
      return `R$ ${value.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
    case 'percent':
      return `${value.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}%`
    case 'multiplier':
      return `${value.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}x`
    case 'number':
    default:
      return value.toLocaleString('pt-BR')
  }
}

/** Gera o texto descritivo de um filtro para exibição no chip */
export function formatFilterLabel(filter: MetricFilter): string {
  const metricConfig = getMetricConfig(filter.metric)
  const operatorConfig = getOperatorConfig(filter.operator)

  if (!metricConfig || !operatorConfig) return ''

  const metricLabel = metricConfig.label
  const operatorLabel = operatorConfig.shortLabel

  if (filter.operator === 'between' && filter.value2 !== undefined) {
    const val1 = formatMetricValue(filter.value, filter.metric)
    const val2 = formatMetricValue(filter.value2, filter.metric)
    return `${metricLabel} entre ${val1} e ${val2}`
  }

  const formattedValue = formatMetricValue(filter.value, filter.metric)
  return `${metricLabel} ${operatorLabel} ${formattedValue}`
}

/** Gera um ID único para um novo filtro */
export function generateFilterId(): string {
  return crypto.randomUUID()
}

/** Valida se um filtro é válido */
export function isValidFilter(filter: Partial<MetricFilter>): filter is MetricFilter {
  if (!filter.id || !filter.metric || !filter.operator) return false
  if (typeof filter.value !== 'number' || isNaN(filter.value)) return false
  if (filter.operator === 'between') {
    if (typeof filter.value2 !== 'number' || isNaN(filter.value2)) return false
    if (filter.value >= filter.value2) return false
  }
  return true
}

/** Tipo para uma linha de campanha (subset das propriedades necessárias) */
interface CampaignMetrics {
  impressions?: number
  clicks?: number
  conversions?: number
  cost?: number
  cpc?: number
  cpa?: number
  ctr?: number
  conversionRate?: number
  roas?: number
}

/** Obtém o valor de uma métrica de uma campanha */
export function getCampaignMetricValue(campaign: CampaignMetrics, metric: FilterableMetric): number | undefined {
  switch (metric) {
    case 'impressions': return campaign.impressions
    case 'clicks': return campaign.clicks
    case 'conversions': return campaign.conversions
    case 'cost': return campaign.cost
    case 'cpc': return campaign.cpc
    case 'cpa': return campaign.cpa
    case 'ctr': return campaign.ctr
    case 'conversionRate': return campaign.conversionRate
    case 'roas': return campaign.roas
    default: return undefined
  }
}

/** Aplica um filtro a uma campanha - retorna true se a campanha passa no filtro */
export function applyMetricFilter(campaign: CampaignMetrics, filter: MetricFilter): boolean {
  const value = getCampaignMetricValue(campaign, filter.metric)

  // Se a métrica não existe na campanha, não passa no filtro
  if (value === undefined || value === null) return false

  switch (filter.operator) {
    case 'gt':
      return value > filter.value
    case 'lt':
      return value < filter.value
    case 'eq':
      return value === filter.value
    case 'between':
      if (filter.value2 === undefined) return false
      return value >= filter.value && value <= filter.value2
    default:
      return true
  }
}

/** Aplica múltiplos filtros a uma campanha (AND lógico) */
export function applyMetricFilters(campaign: CampaignMetrics, filters: MetricFilter[]): boolean {
  if (!filters.length) return true
  return filters.every(filter => applyMetricFilter(campaign, filter))
}

/** Agrupa as métricas por categoria */
export function getGroupedMetrics(): Array<{ group: MetricConfig['group']; label: string; metrics: MetricConfig[] }> {
  const groups: Array<MetricConfig['group']> = ['volume', 'cost', 'performance']

  return groups.map(group => ({
    group,
    label: GROUP_LABELS[group],
    metrics: METRIC_CONFIGS.filter(m => m.group === group),
  }))
}
