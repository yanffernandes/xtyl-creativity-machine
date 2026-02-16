/**
 * Advanced Metric Filters - Type Definitions
 *
 * Sistema de filtros avançados por métricas para a página de Ads.
 * Permite filtrar campanhas por Impressões, Cliques, Gasto, CTR, etc.
 */

/** Operadores disponíveis para filtros numéricos */
export type FilterOperator = 'gt' | 'lt' | 'eq' | 'between'

/** Métricas filtráveis */
export type FilterableMetric =
  | 'impressions'
  | 'clicks'
  | 'conversions'
  | 'cost'
  | 'cpc'
  | 'cpa'
  | 'ctr'
  | 'conversionRate'
  | 'roas'

/** Um filtro de métrica ativo */
export interface MetricFilter {
  /** UUID único para identificar o filtro (permite múltiplos da mesma métrica) */
  id: string
  /** A métrica sendo filtrada */
  metric: FilterableMetric
  /** O operador de comparação */
  operator: FilterOperator
  /** Valor principal (ou min para 'between') */
  value: number
  /** Segundo valor (max para 'between') */
  value2?: number
}

/** Configuração de uma métrica filtrável */
export interface MetricConfig {
  /** Chave da métrica */
  key: FilterableMetric
  /** Label em português */
  label: string
  /** Grupo para organização no dropdown */
  group: 'volume' | 'cost' | 'performance'
  /** Tipo de formatação */
  format: 'number' | 'currency' | 'percent' | 'multiplier'
  /** Símbolo para exibição (R$, %, x) */
  symbol?: string
  /** Posição do símbolo */
  symbolPosition?: 'before' | 'after'
}

/** Configuração de um operador */
export interface OperatorConfig {
  /** Chave do operador */
  key: FilterOperator
  /** Label em português */
  label: string
  /** Label curta para exibição no chip */
  shortLabel: string
  /** Requer segundo valor? */
  requiresSecondValue: boolean
}
