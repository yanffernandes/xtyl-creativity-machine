// ============================================================================
// AUTOMATION ENGINE — METRIC DEFINITIONS
// All available metrics for conditions/triggers, organized by platform.
// ============================================================================

export interface MetricDefinition {
  slug: string;
  label: string;
  category: string;
  type: 'number' | 'percentage' | 'currency';
  description?: string;
}

// ============================================================================
// META ADS METRICS (~50)
// ============================================================================

const META_METRICS: MetricDefinition[] = [
  // ── Financeiro ──
  { slug: 'spend', label: 'Gasto', category: 'Financeiro', type: 'currency', description: 'Valor gasto no período' },
  { slug: 'budget_remaining', label: 'Orçamento Restante', category: 'Financeiro', type: 'currency', description: 'Budget - Spend' },
  { slug: 'daily_budget', label: 'Orçamento Diário', category: 'Financeiro', type: 'currency', description: 'Budget diário configurado' },
  { slug: 'lifetime_budget', label: 'Orçamento Vitalício', category: 'Financeiro', type: 'currency', description: 'Budget lifetime configurado' },

  // ── Entrega ──
  { slug: 'impressions', label: 'Impressões', category: 'Entrega', type: 'number', description: 'Total de impressões' },
  { slug: 'reach', label: 'Alcance', category: 'Entrega', type: 'number', description: 'Pessoas únicas alcançadas' },
  { slug: 'frequency', label: 'Frequência', category: 'Entrega', type: 'number', description: 'Impressões / Reach' },

  // ── Custo ──
  { slug: 'cpm', label: 'CPM', category: 'Custo', type: 'currency', description: 'Custo por mil impressões' },
  { slug: 'cpc', label: 'CPC', category: 'Custo', type: 'currency', description: 'Custo por clique' },
  { slug: 'cost_per_landing_page_view', label: 'Custo por Landing Page View', category: 'Custo', type: 'currency', description: 'Spend / LPV' },

  // ── Tráfego ──
  { slug: 'link_clicks', label: 'Cliques no Link', category: 'Tráfego', type: 'number', description: 'Cliques no link de destino' },
  { slug: 'landing_page_views', label: 'Visualizações de Landing Page', category: 'Tráfego', type: 'number', description: 'Views na página de destino' },

  // ── Engajamento ──
  { slug: 'ctr', label: 'CTR', category: 'Engajamento', type: 'percentage', description: 'Click-through rate (%)' },
  { slug: 'outbound_ctr', label: 'CTR de Saída', category: 'Engajamento', type: 'percentage', description: 'CTR de cliques de saída (%)' },
  { slug: 'reactions', label: 'Reações', category: 'Engajamento', type: 'number', description: 'Likes, loves, etc.' },
  { slug: 'comments', label: 'Comentários', category: 'Engajamento', type: 'number', description: 'Total de comentários' },
  { slug: 'shares', label: 'Compartilhamentos', category: 'Engajamento', type: 'number', description: 'Total de shares' },
  { slug: 'saves', label: 'Salvamentos', category: 'Engajamento', type: 'number', description: 'Total de saves' },

  // ── Conversão ──
  { slug: 'purchases', label: 'Compras', category: 'Conversão', type: 'number', description: 'Total de compras' },
  { slug: 'purchase_value', label: 'Valor de Compra', category: 'Conversão', type: 'currency', description: 'Receita total de compras' },
  { slug: 'purchase_roas', label: 'ROAS de Compra', category: 'Conversão', type: 'number', description: 'Purchase Value / Spend' },
  { slug: 'cost_per_purchase', label: 'Custo por Compra', category: 'Conversão', type: 'currency', description: 'Spend / Purchases' },
  { slug: 'add_to_cart', label: 'Adicionar ao Carrinho', category: 'Conversão', type: 'number', description: 'Total de ATC' },
  { slug: 'cost_per_add_to_cart', label: 'Custo por ATC', category: 'Conversão', type: 'currency', description: 'Spend / ATC' },
  { slug: 'initiate_checkout', label: 'Iniciar Checkout', category: 'Conversão', type: 'number', description: 'Total de checkouts iniciados' },
  { slug: 'cost_per_initiate_checkout', label: 'Custo por Checkout', category: 'Conversão', type: 'currency', description: 'Spend / Initiate Checkout' },
  { slug: 'leads', label: 'Leads', category: 'Conversão', type: 'number', description: 'Total de leads' },
  { slug: 'cost_per_lead', label: 'Custo por Lead', category: 'Conversão', type: 'currency', description: 'Spend / Leads' },
  { slug: 'complete_registration', label: 'Registros Completos', category: 'Conversão', type: 'number', description: 'Total de cadastros' },
  { slug: 'cost_per_complete_registration', label: 'Custo por Registro', category: 'Conversão', type: 'currency', description: 'Spend / Registros' },
  { slug: 'conversion_rate', label: 'Taxa de Conversão', category: 'Conversão', type: 'percentage', description: 'Purchases / Link Clicks × 100' },

  // ── Vídeo ──
  { slug: 'video_views', label: 'Video Views', category: 'Vídeo', type: 'number', description: 'Visualizações de vídeo (3s+)' },
  { slug: 'video_p25', label: 'Vídeo 25%', category: 'Vídeo', type: 'number', description: 'Assistiu 25%' },
  { slug: 'video_p50', label: 'Vídeo 50%', category: 'Vídeo', type: 'number', description: 'Assistiu 50%' },
  { slug: 'video_p75', label: 'Vídeo 75%', category: 'Vídeo', type: 'number', description: 'Assistiu 75%' },
  { slug: 'video_p95', label: 'Vídeo 95%', category: 'Vídeo', type: 'number', description: 'Assistiu 95%' },
  { slug: 'video_p100', label: 'Vídeo 100%', category: 'Vídeo', type: 'number', description: 'Assistiu 100%' },
  { slug: 'thruplay', label: 'ThruPlay', category: 'Vídeo', type: 'number', description: '15s ou completo' },
  { slug: 'cost_per_thruplay', label: 'Custo por ThruPlay', category: 'Vídeo', type: 'currency', description: 'Spend / ThruPlay' },
  { slug: 'hook_rate', label: 'Hook Rate', category: 'Vídeo', type: 'percentage', description: 'Video 3s / Impressions × 100' },
  { slug: 'hold_rate', label: 'Hold Rate', category: 'Vídeo', type: 'percentage', description: 'ThruPlay / Video 3s × 100' },

  // ── App ──
  { slug: 'app_installs', label: 'Instalações de App', category: 'App', type: 'number', description: 'Instalações de aplicativo' },
  { slug: 'cost_per_app_install', label: 'Custo por App Install', category: 'App', type: 'currency', description: 'Spend / Installs' },
  { slug: 'app_events', label: 'Eventos de App', category: 'App', type: 'number', description: 'Eventos customizados de app' },

  // ── Mensagens ──
  { slug: 'messaging_conversations_started', label: 'Mensagens Iniciadas', category: 'Mensagens', type: 'number', description: 'Conversas iniciadas' },

  // ── Ciclo de Vida ──
  { slug: 'hours_since_creation', label: 'Horas Desde Criação', category: 'Ciclo de Vida', type: 'number', description: 'Idade em horas' },
  { slug: 'days_since_creation', label: 'Dias Desde Criação', category: 'Ciclo de Vida', type: 'number', description: 'Idade em dias' },
];

// ============================================================================
// GOOGLE ADS METRICS (~30)
// ============================================================================

const GOOGLE_METRICS: MetricDefinition[] = [
  // ── Financeiro ──
  { slug: 'cost', label: 'Custo', category: 'Financeiro', type: 'currency', description: 'Valor gasto' },
  { slug: 'budget', label: 'Orçamento', category: 'Financeiro', type: 'currency', description: 'Budget da campanha' },

  // ── Entrega ──
  { slug: 'impressions', label: 'Impressões', category: 'Entrega', type: 'number', description: 'Total de impressões' },
  { slug: 'clicks', label: 'Cliques', category: 'Entrega', type: 'number', description: 'Total de cliques' },

  // ── Engajamento ──
  { slug: 'ctr', label: 'CTR', category: 'Engajamento', type: 'percentage', description: 'Clicks / Impressions × 100' },
  { slug: 'interactions', label: 'Interações', category: 'Engajamento', type: 'number', description: 'Cliques + outras interações' },
  { slug: 'interaction_rate', label: 'Taxa de Interação', category: 'Engajamento', type: 'percentage', description: 'Interactions / Impressions' },

  // ── Custo ──
  { slug: 'average_cpc', label: 'CPC Médio', category: 'Custo', type: 'currency', description: 'Cost / Clicks' },
  { slug: 'cpm', label: 'CPM', category: 'Custo', type: 'currency', description: 'Cost / 1000 Impressions' },
  { slug: 'cost_per_conversion', label: 'Custo por Conversão', category: 'Custo', type: 'currency', description: 'Cost / Conversions' },
  { slug: 'cost_per_interaction', label: 'Custo por Interação', category: 'Custo', type: 'currency', description: 'Cost / Interactions' },

  // ── Conversão ──
  { slug: 'conversions', label: 'Conversões', category: 'Conversão', type: 'number', description: 'Total de conversões' },
  { slug: 'conversion_value', label: 'Valor de Conversão', category: 'Conversão', type: 'currency', description: 'Receita total' },
  { slug: 'conversion_rate', label: 'Taxa de Conversão', category: 'Conversão', type: 'percentage', description: 'Conversions / Clicks × 100' },
  { slug: 'roas', label: 'ROAS', category: 'Conversão', type: 'number', description: 'Conversion Value / Cost' },
  { slug: 'view_through_conversions', label: 'View-Through Conversions', category: 'Conversão', type: 'number', description: 'Conversões por visualização' },

  // ── Competitividade ──
  { slug: 'search_impression_share', label: 'Parcela de Impressões', category: 'Competitividade', type: 'percentage', description: '% de impressões ganhas' },
  { slug: 'search_budget_lost_is', label: 'Parcela Perdida (Budget)', category: 'Competitividade', type: 'percentage', description: '% perdida por budget' },
  { slug: 'search_rank_lost_is', label: 'Parcela Perdida (Rank)', category: 'Competitividade', type: 'percentage', description: '% perdida por rank' },
  { slug: 'average_position', label: 'Posição Média', category: 'Competitividade', type: 'number', description: 'Posição média nos leilões' },

  // ── Qualidade ──
  { slug: 'quality_score', label: 'Quality Score', category: 'Qualidade', type: 'number', description: 'Índice de qualidade (1-10)' },
  { slug: 'expected_ctr', label: 'CTR Esperado', category: 'Qualidade', type: 'number', description: 'Componente CTR do QS' },
  { slug: 'ad_relevance', label: 'Relevância do Anúncio', category: 'Qualidade', type: 'number', description: 'Componente de relevância' },
  { slug: 'landing_page_experience', label: 'Experiência da LP', category: 'Qualidade', type: 'number', description: 'Componente da landing page' },

  // ── Fraude ──
  { slug: 'invalid_click_rate', label: 'Taxa de Cliques Inválidos', category: 'Fraude', type: 'percentage', description: '% de cliques inválidos' },

  // ── Vídeo ──
  { slug: 'video_views', label: 'Video Views', category: 'Vídeo', type: 'number', description: 'Visualizações de vídeo' },
  { slug: 'video_view_rate', label: 'Video View Rate', category: 'Vídeo', type: 'percentage', description: 'Views / Impressions × 100' },
  { slug: 'video_quartile_25', label: 'Vídeo 25%', category: 'Vídeo', type: 'number', description: 'Assistiu 25%' },
  { slug: 'video_quartile_50', label: 'Vídeo 50%', category: 'Vídeo', type: 'number', description: 'Assistiu 50%' },
  { slug: 'video_quartile_75', label: 'Vídeo 75%', category: 'Vídeo', type: 'number', description: 'Assistiu 75%' },
  { slug: 'video_quartile_100', label: 'Vídeo 100%', category: 'Vídeo', type: 'number', description: 'Assistiu 100%' },

  // ── Ciclo de Vida ──
  { slug: 'hours_since_creation', label: 'Horas Desde Criação', category: 'Ciclo de Vida', type: 'number', description: 'Idade em horas' },
  { slug: 'days_since_creation', label: 'Dias Desde Criação', category: 'Ciclo de Vida', type: 'number', description: 'Idade em dias' },
];

// ============================================================================
// COMBINED EXPORT
// ============================================================================

export const METRICS_BY_PLATFORM: Record<'meta' | 'google', MetricDefinition[]> = {
  meta: META_METRICS,
  google: GOOGLE_METRICS,
};

/** All unique metric categories across both platforms */
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
] as const;

export type MetricCategory = (typeof METRIC_CATEGORIES)[number];

/**
 * Helper: Get all metric slugs for a platform.
 */
export function getMetricSlugsForPlatform(
  platform: 'meta' | 'google',
): string[] {
  return METRICS_BY_PLATFORM[platform].map((m) => m.slug);
}

/**
 * Helper: Find a metric definition by slug and platform.
 */
export function findMetric(
  platform: 'meta' | 'google',
  slug: string,
): MetricDefinition | undefined {
  return METRICS_BY_PLATFORM[platform].find((m) => m.slug === slug);
}
