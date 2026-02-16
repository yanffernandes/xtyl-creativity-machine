// ============================================================================
// AUTOMATION ENGINE — METRIC DEFINITIONS (Frontend)
// All available metrics for conditions/triggers, organized by platform.
// Labels in Portuguese (pt-BR).
// ============================================================================

// ============================================================================
// METRIC DEFINITION INTERFACE
// ============================================================================

export interface MetricDefinition {
  slug: string
  label: string
  category: MetricCategory
  type: 'number' | 'percentage' | 'currency'
  description?: string
  /** Format hint for displaying values in the UI */
  format?: {
    prefix?: string
    suffix?: string
    decimals?: number
  }
}

// ============================================================================
// METRIC CATEGORIES
// ============================================================================

export const METRIC_CATEGORIES = [
  'Financeiro',
  'Entrega',
  'Custo',
  'Tráfego',
  'Engajamento',
  'Conversão',
  'Vídeo',
  'App',
  'Mensagens',
  'Competitividade',
  'Qualidade',
  'Fraude',
  'Ciclo de Vida',
] as const

export type MetricCategory = (typeof METRIC_CATEGORIES)[number]

// ============================================================================
// META ADS METRICS (~50)
// ============================================================================

const META_METRICS: MetricDefinition[] = [
  // ── Financeiro ──
  { slug: 'spend', label: 'Gasto', category: 'Financeiro', type: 'currency', description: 'Valor gasto no período', format: { prefix: 'R$', decimals: 2 } },
  { slug: 'budget_remaining', label: 'Orçamento Restante', category: 'Financeiro', type: 'currency', description: 'Budget - Spend', format: { prefix: 'R$', decimals: 2 } },
  { slug: 'daily_budget', label: 'Orçamento Diário', category: 'Financeiro', type: 'currency', description: 'Budget diário configurado', format: { prefix: 'R$', decimals: 2 } },
  { slug: 'lifetime_budget', label: 'Orçamento Vitalício', category: 'Financeiro', type: 'currency', description: 'Budget lifetime configurado', format: { prefix: 'R$', decimals: 2 } },

  // ── Entrega ──
  { slug: 'impressions', label: 'Impressões', category: 'Entrega', type: 'number', description: 'Total de impressões', format: { decimals: 0 } },
  { slug: 'reach', label: 'Alcance', category: 'Entrega', type: 'number', description: 'Pessoas únicas alcançadas', format: { decimals: 0 } },
  { slug: 'frequency', label: 'Frequência', category: 'Entrega', type: 'number', description: 'Impressões / Reach', format: { decimals: 2 } },

  // ── Custo ──
  { slug: 'cpm', label: 'CPM', category: 'Custo', type: 'currency', description: 'Custo por mil impressões', format: { prefix: 'R$', decimals: 2 } },
  { slug: 'cpc', label: 'CPC', category: 'Custo', type: 'currency', description: 'Custo por clique', format: { prefix: 'R$', decimals: 2 } },
  { slug: 'cost_per_landing_page_view', label: 'Custo por Landing Page View', category: 'Custo', type: 'currency', description: 'Spend / LPV', format: { prefix: 'R$', decimals: 2 } },

  // ── Tráfego ──
  { slug: 'link_clicks', label: 'Cliques no Link', category: 'Tráfego', type: 'number', description: 'Cliques no link de destino', format: { decimals: 0 } },
  { slug: 'landing_page_views', label: 'Visualizações de Landing Page', category: 'Tráfego', type: 'number', description: 'Views na página de destino', format: { decimals: 0 } },

  // ── Engajamento ──
  { slug: 'ctr', label: 'CTR', category: 'Engajamento', type: 'percentage', description: 'Click-through rate (%)', format: { suffix: '%', decimals: 2 } },
  { slug: 'outbound_ctr', label: 'CTR de Saída', category: 'Engajamento', type: 'percentage', description: 'CTR de cliques de saída (%)', format: { suffix: '%', decimals: 2 } },
  { slug: 'reactions', label: 'Reações', category: 'Engajamento', type: 'number', description: 'Likes, loves, etc.', format: { decimals: 0 } },
  { slug: 'comments', label: 'Comentários', category: 'Engajamento', type: 'number', description: 'Total de comentários', format: { decimals: 0 } },
  { slug: 'shares', label: 'Compartilhamentos', category: 'Engajamento', type: 'number', description: 'Total de shares', format: { decimals: 0 } },
  { slug: 'saves', label: 'Salvamentos', category: 'Engajamento', type: 'number', description: 'Total de saves', format: { decimals: 0 } },

  // ── Conversão ──
  { slug: 'purchases', label: 'Compras', category: 'Conversão', type: 'number', description: 'Total de compras', format: { decimals: 0 } },
  { slug: 'purchase_value', label: 'Valor de Compra', category: 'Conversão', type: 'currency', description: 'Receita total de compras', format: { prefix: 'R$', decimals: 2 } },
  { slug: 'purchase_roas', label: 'ROAS de Compra', category: 'Conversão', type: 'number', description: 'Purchase Value / Spend', format: { suffix: 'x', decimals: 2 } },
  { slug: 'cost_per_purchase', label: 'Custo por Compra', category: 'Conversão', type: 'currency', description: 'Spend / Purchases', format: { prefix: 'R$', decimals: 2 } },
  { slug: 'add_to_cart', label: 'Adicionar ao Carrinho', category: 'Conversão', type: 'number', description: 'Total de ATC', format: { decimals: 0 } },
  { slug: 'cost_per_add_to_cart', label: 'Custo por ATC', category: 'Conversão', type: 'currency', description: 'Spend / ATC', format: { prefix: 'R$', decimals: 2 } },
  { slug: 'initiate_checkout', label: 'Iniciar Checkout', category: 'Conversão', type: 'number', description: 'Total de checkouts iniciados', format: { decimals: 0 } },
  { slug: 'cost_per_initiate_checkout', label: 'Custo por Checkout', category: 'Conversão', type: 'currency', description: 'Spend / Initiate Checkout', format: { prefix: 'R$', decimals: 2 } },
  { slug: 'leads', label: 'Leads', category: 'Conversão', type: 'number', description: 'Total de leads', format: { decimals: 0 } },
  { slug: 'cost_per_lead', label: 'Custo por Lead', category: 'Conversão', type: 'currency', description: 'Spend / Leads', format: { prefix: 'R$', decimals: 2 } },
  { slug: 'complete_registration', label: 'Registros Completos', category: 'Conversão', type: 'number', description: 'Total de cadastros', format: { decimals: 0 } },
  { slug: 'cost_per_complete_registration', label: 'Custo por Registro', category: 'Conversão', type: 'currency', description: 'Spend / Registros', format: { prefix: 'R$', decimals: 2 } },
  { slug: 'conversion_rate', label: 'Taxa de Conversão', category: 'Conversão', type: 'percentage', description: 'Purchases / Link Clicks × 100', format: { suffix: '%', decimals: 2 } },

  // ── Vídeo ──
  { slug: 'video_views', label: 'Video Views', category: 'Vídeo', type: 'number', description: 'Visualizações de vídeo (3s+)', format: { decimals: 0 } },
  { slug: 'video_p25', label: 'Vídeo 25%', category: 'Vídeo', type: 'number', description: 'Assistiu 25%', format: { decimals: 0 } },
  { slug: 'video_p50', label: 'Vídeo 50%', category: 'Vídeo', type: 'number', description: 'Assistiu 50%', format: { decimals: 0 } },
  { slug: 'video_p75', label: 'Vídeo 75%', category: 'Vídeo', type: 'number', description: 'Assistiu 75%', format: { decimals: 0 } },
  { slug: 'video_p95', label: 'Vídeo 95%', category: 'Vídeo', type: 'number', description: 'Assistiu 95%', format: { decimals: 0 } },
  { slug: 'video_p100', label: 'Vídeo 100%', category: 'Vídeo', type: 'number', description: 'Assistiu 100%', format: { decimals: 0 } },
  { slug: 'thruplay', label: 'ThruPlay', category: 'Vídeo', type: 'number', description: '15s ou completo', format: { decimals: 0 } },
  { slug: 'cost_per_thruplay', label: 'Custo por ThruPlay', category: 'Vídeo', type: 'currency', description: 'Spend / ThruPlay', format: { prefix: 'R$', decimals: 2 } },
  { slug: 'hook_rate', label: 'Hook Rate', category: 'Vídeo', type: 'percentage', description: 'Video 3s / Impressions × 100', format: { suffix: '%', decimals: 2 } },
  { slug: 'hold_rate', label: 'Hold Rate', category: 'Vídeo', type: 'percentage', description: 'ThruPlay / Video 3s × 100', format: { suffix: '%', decimals: 2 } },

  // ── App ──
  { slug: 'app_installs', label: 'Instalações de App', category: 'App', type: 'number', description: 'Instalações de aplicativo', format: { decimals: 0 } },
  { slug: 'cost_per_app_install', label: 'Custo por App Install', category: 'App', type: 'currency', description: 'Spend / Installs', format: { prefix: 'R$', decimals: 2 } },
  { slug: 'app_events', label: 'Eventos de App', category: 'App', type: 'number', description: 'Eventos customizados de app', format: { decimals: 0 } },

  // ── Mensagens ──
  { slug: 'messaging_conversations_started', label: 'Mensagens Iniciadas', category: 'Mensagens', type: 'number', description: 'Conversas iniciadas', format: { decimals: 0 } },

  // ── Ciclo de Vida ──
  { slug: 'hours_since_creation', label: 'Horas Desde Criação', category: 'Ciclo de Vida', type: 'number', description: 'Idade em horas', format: { suffix: 'h', decimals: 0 } },
  { slug: 'days_since_creation', label: 'Dias Desde Criação', category: 'Ciclo de Vida', type: 'number', description: 'Idade em dias', format: { suffix: 'd', decimals: 0 } },
]

// ============================================================================
// GOOGLE ADS METRICS (~30)
// ============================================================================

const GOOGLE_METRICS: MetricDefinition[] = [
  // ── Financeiro ──
  { slug: 'cost', label: 'Custo', category: 'Financeiro', type: 'currency', description: 'Valor gasto', format: { prefix: 'R$', decimals: 2 } },
  { slug: 'budget', label: 'Orçamento', category: 'Financeiro', type: 'currency', description: 'Budget da campanha', format: { prefix: 'R$', decimals: 2 } },

  // ── Entrega ──
  { slug: 'impressions', label: 'Impressões', category: 'Entrega', type: 'number', description: 'Total de impressões', format: { decimals: 0 } },
  { slug: 'clicks', label: 'Cliques', category: 'Entrega', type: 'number', description: 'Total de cliques', format: { decimals: 0 } },

  // ── Engajamento ──
  { slug: 'ctr', label: 'CTR', category: 'Engajamento', type: 'percentage', description: 'Clicks / Impressions × 100', format: { suffix: '%', decimals: 2 } },
  { slug: 'interactions', label: 'Interações', category: 'Engajamento', type: 'number', description: 'Cliques + outras interações', format: { decimals: 0 } },
  { slug: 'interaction_rate', label: 'Taxa de Interação', category: 'Engajamento', type: 'percentage', description: 'Interactions / Impressions', format: { suffix: '%', decimals: 2 } },

  // ── Custo ──
  { slug: 'average_cpc', label: 'CPC Médio', category: 'Custo', type: 'currency', description: 'Cost / Clicks', format: { prefix: 'R$', decimals: 2 } },
  { slug: 'cpm', label: 'CPM', category: 'Custo', type: 'currency', description: 'Cost / 1000 Impressions', format: { prefix: 'R$', decimals: 2 } },
  { slug: 'cost_per_conversion', label: 'Custo por Conversão', category: 'Custo', type: 'currency', description: 'Cost / Conversions', format: { prefix: 'R$', decimals: 2 } },
  { slug: 'cost_per_interaction', label: 'Custo por Interação', category: 'Custo', type: 'currency', description: 'Cost / Interactions', format: { prefix: 'R$', decimals: 2 } },

  // ── Conversão ──
  { slug: 'conversions', label: 'Conversões', category: 'Conversão', type: 'number', description: 'Total de conversões', format: { decimals: 0 } },
  { slug: 'conversion_value', label: 'Valor de Conversão', category: 'Conversão', type: 'currency', description: 'Receita total', format: { prefix: 'R$', decimals: 2 } },
  { slug: 'conversion_rate', label: 'Taxa de Conversão', category: 'Conversão', type: 'percentage', description: 'Conversions / Clicks × 100', format: { suffix: '%', decimals: 2 } },
  { slug: 'roas', label: 'ROAS', category: 'Conversão', type: 'number', description: 'Conversion Value / Cost', format: { suffix: 'x', decimals: 2 } },
  { slug: 'view_through_conversions', label: 'View-Through Conversions', category: 'Conversão', type: 'number', description: 'Conversões por visualização', format: { decimals: 0 } },

  // ── Competitividade ──
  { slug: 'search_impression_share', label: 'Parcela de Impressões', category: 'Competitividade', type: 'percentage', description: '% de impressões ganhas', format: { suffix: '%', decimals: 1 } },
  { slug: 'search_budget_lost_is', label: 'Parcela Perdida (Budget)', category: 'Competitividade', type: 'percentage', description: '% perdida por budget', format: { suffix: '%', decimals: 1 } },
  { slug: 'search_rank_lost_is', label: 'Parcela Perdida (Rank)', category: 'Competitividade', type: 'percentage', description: '% perdida por rank', format: { suffix: '%', decimals: 1 } },
  { slug: 'average_position', label: 'Posição Média', category: 'Competitividade', type: 'number', description: 'Posição média nos leilões', format: { decimals: 1 } },

  // ── Qualidade ──
  { slug: 'quality_score', label: 'Quality Score', category: 'Qualidade', type: 'number', description: 'Índice de qualidade (1-10)', format: { decimals: 0 } },
  { slug: 'expected_ctr', label: 'CTR Esperado', category: 'Qualidade', type: 'number', description: 'Componente CTR do QS', format: { decimals: 0 } },
  { slug: 'ad_relevance', label: 'Relevância do Anúncio', category: 'Qualidade', type: 'number', description: 'Componente de relevância', format: { decimals: 0 } },
  { slug: 'landing_page_experience', label: 'Experiência da LP', category: 'Qualidade', type: 'number', description: 'Componente da landing page', format: { decimals: 0 } },

  // ── Fraude ──
  { slug: 'invalid_click_rate', label: 'Taxa de Cliques Inválidos', category: 'Fraude', type: 'percentage', description: '% de cliques inválidos', format: { suffix: '%', decimals: 2 } },

  // ── Vídeo ──
  { slug: 'video_views', label: 'Video Views', category: 'Vídeo', type: 'number', description: 'Visualizações de vídeo', format: { decimals: 0 } },
  { slug: 'video_view_rate', label: 'Video View Rate', category: 'Vídeo', type: 'percentage', description: 'Views / Impressions × 100', format: { suffix: '%', decimals: 2 } },
  { slug: 'video_quartile_25', label: 'Vídeo 25%', category: 'Vídeo', type: 'number', description: 'Assistiu 25%', format: { decimals: 0 } },
  { slug: 'video_quartile_50', label: 'Vídeo 50%', category: 'Vídeo', type: 'number', description: 'Assistiu 50%', format: { decimals: 0 } },
  { slug: 'video_quartile_75', label: 'Vídeo 75%', category: 'Vídeo', type: 'number', description: 'Assistiu 75%', format: { decimals: 0 } },
  { slug: 'video_quartile_100', label: 'Vídeo 100%', category: 'Vídeo', type: 'number', description: 'Assistiu 100%', format: { decimals: 0 } },

  // ── Ciclo de Vida ──
  { slug: 'hours_since_creation', label: 'Horas Desde Criação', category: 'Ciclo de Vida', type: 'number', description: 'Idade em horas', format: { suffix: 'h', decimals: 0 } },
  { slug: 'days_since_creation', label: 'Dias Desde Criação', category: 'Ciclo de Vida', type: 'number', description: 'Idade em dias', format: { suffix: 'd', decimals: 0 } },
]

// ============================================================================
// COMBINED EXPORT
// ============================================================================

export const METRICS_BY_PLATFORM: Record<'meta' | 'google', MetricDefinition[]> = {
  meta: META_METRICS,
  google: GOOGLE_METRICS,
}

// ============================================================================
// HELPERS
// ============================================================================

/**
 * Get all metrics for a given platform.
 */
export function getMetricsForPlatform(platform: 'meta' | 'google'): MetricDefinition[] {
  return METRICS_BY_PLATFORM[platform] ?? []
}

/**
 * Get metrics grouped by category for a given platform.
 */
export function getMetricsGroupedByCategory(
  platform: 'meta' | 'google',
): Record<string, MetricDefinition[]> {
  const metrics = getMetricsForPlatform(platform)
  const grouped: Record<string, MetricDefinition[]> = {}

  for (const metric of metrics) {
    if (!grouped[metric.category]) {
      grouped[metric.category] = []
    }
    grouped[metric.category].push(metric)
  }

  return grouped
}

/**
 * Get all metric slugs for a platform.
 */
export function getMetricSlugsForPlatform(platform: 'meta' | 'google'): string[] {
  return getMetricsForPlatform(platform).map((m) => m.slug)
}

/**
 * Find a metric definition by slug and platform.
 */
export function findMetric(
  platform: 'meta' | 'google',
  slug: string,
): MetricDefinition | undefined {
  return getMetricsForPlatform(platform).find((m) => m.slug === slug)
}

/**
 * Get the label for a metric (or the slug itself as fallback).
 */
export function getMetricLabel(platform: 'meta' | 'google', slug: string): string {
  return findMetric(platform, slug)?.label ?? slug
}

/**
 * Check if a metric slug is valid for a given platform.
 */
export function isValidMetric(platform: 'meta' | 'google', slug: string): boolean {
  return getMetricSlugsForPlatform(platform).includes(slug)
}
