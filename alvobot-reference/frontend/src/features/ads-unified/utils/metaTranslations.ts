/**
 * Meta Ads Translation Utility
 *
 * Translates Meta API enum values to Portuguese display labels
 * for better UX in the unified ads dashboard.
 */

// ============================================
// Campaign Objectives (ODAX - Outcome-Driven Ad Experiences)
// ============================================

export const CAMPAIGN_OBJECTIVES: Record<string, { label: string; color: string; description: string }> = {
  // New ODAX objectives (used since 2023+)
  OUTCOME_AWARENESS: {
    label: 'Reconhecimento',
    color: '#8B5CF6', // Purple
    description: 'Alcançar pessoas com maior probabilidade de lembrar do seu anúncio',
  },
  OUTCOME_ENGAGEMENT: {
    label: 'Engajamento',
    color: '#EC4899', // Pink
    description: 'Obter mais curtidas, comentários, compartilhamentos ou respostas a eventos',
  },
  OUTCOME_LEADS: {
    label: 'Leads',
    color: '#10B981', // Green
    description: 'Coletar informações de contato de pessoas interessadas',
  },
  OUTCOME_SALES: {
    label: 'Vendas',
    color: '#F59E0B', // Amber
    description: 'Encontrar pessoas com maior probabilidade de comprar seus produtos ou serviços',
  },
  OUTCOME_TRAFFIC: {
    label: 'Tráfego',
    color: '#3B82F6', // Blue
    description: 'Enviar pessoas para um destino, como site ou app',
  },
  OUTCOME_APP_PROMOTION: {
    label: 'App',
    color: '#6366F1', // Indigo
    description: 'Promover instalações ou ações específicas no seu app',
  },

  // Legacy objectives (may still appear in older campaigns)
  BRAND_AWARENESS: {
    label: 'Reconhecimento',
    color: '#8B5CF6',
    description: 'Aumentar o reconhecimento da sua marca',
  },
  REACH: {
    label: 'Alcance',
    color: '#8B5CF6',
    description: 'Mostrar seu anúncio para o máximo de pessoas',
  },
  LINK_CLICKS: {
    label: 'Tráfego',
    color: '#3B82F6',
    description: 'Enviar pessoas para um site ou app',
  },
  POST_ENGAGEMENT: {
    label: 'Engajamento',
    color: '#EC4899',
    description: 'Obter mais engajamento em publicações',
  },
  PAGE_LIKES: {
    label: 'Curtidas',
    color: '#EC4899',
    description: 'Aumentar curtidas na página',
  },
  EVENT_RESPONSES: {
    label: 'Eventos',
    color: '#EC4899',
    description: 'Promover eventos',
  },
  CONVERSIONS: {
    label: 'Conversões',
    color: '#F59E0B',
    description: 'Gerar conversões no site ou app',
  },
  PRODUCT_CATALOG_SALES: {
    label: 'Catálogo',
    color: '#F59E0B',
    description: 'Vendas de catálogo de produtos',
  },
  STORE_VISITS: {
    label: 'Visitas',
    color: '#F59E0B',
    description: 'Visitas à loja física',
  },
  VIDEO_VIEWS: {
    label: 'Vídeo',
    color: '#EC4899',
    description: 'Obter mais visualizações de vídeo',
  },
  LEAD_GENERATION: {
    label: 'Leads',
    color: '#10B981',
    description: 'Coletar leads através de formulários',
  },
  MESSAGES: {
    label: 'Mensagens',
    color: '#10B981',
    description: 'Iniciar conversas no Messenger, WhatsApp ou Instagram',
  },
  APP_INSTALLS: {
    label: 'App',
    color: '#6366F1',
    description: 'Instalações de aplicativo',
  },
}

// ============================================
// Optimization Goals
// ============================================

export const OPTIMIZATION_GOALS: Record<string, { label: string; description: string }> = {
  // Conversions
  OFFSITE_CONVERSIONS: {
    label: 'Conversões Offsite',
    description: 'Otimizar para conversões fora do Facebook',
  },
  CONVERSIONS: {
    label: 'Conversões',
    description: 'Otimizar para conversões',
  },
  VALUE: {
    label: 'Valor',
    description: 'Otimizar para valor de conversão',
  },

  // Traffic & Clicks
  LINK_CLICKS: {
    label: 'Cliques no Link',
    description: 'Otimizar para cliques no link',
  },
  LANDING_PAGE_VIEWS: {
    label: 'Visualizações da Página',
    description: 'Otimizar para visualizações da página de destino',
  },

  // Engagement
  POST_ENGAGEMENT: {
    label: 'Engajamento',
    description: 'Otimizar para engajamento na publicação',
  },
  THRUPLAY: {
    label: 'ThruPlay',
    description: 'Otimizar para visualizações de vídeo completas',
  },
  TWO_SECOND_CONTINUOUS_VIDEO_VIEWS: {
    label: 'Visualizações 2s',
    description: 'Otimizar para visualizações de 2 segundos',
  },

  // Reach & Awareness
  REACH: {
    label: 'Alcance',
    description: 'Otimizar para alcance máximo',
  },
  IMPRESSIONS: {
    label: 'Impressões',
    description: 'Otimizar para número de impressões',
  },
  AD_RECALL_LIFT: {
    label: 'Lembrança',
    description: 'Otimizar para lembrança do anúncio',
  },

  // Leads & Messages
  LEAD_GENERATION: {
    label: 'Geração de Leads',
    description: 'Otimizar para leads',
  },
  QUALITY_LEAD: {
    label: 'Leads Qualificados',
    description: 'Otimizar para leads de qualidade',
  },
  CONVERSATIONS: {
    label: 'Conversas',
    description: 'Otimizar para iniciar conversas',
  },
  REPLIES: {
    label: 'Respostas',
    description: 'Otimizar para respostas em mensagens',
  },

  // App
  APP_INSTALLS: {
    label: 'Instalações',
    description: 'Otimizar para instalações de app',
  },
  APP_EVENTS: {
    label: 'Eventos no App',
    description: 'Otimizar para eventos dentro do app',
  },

  // Other
  NONE: {
    label: 'Nenhum',
    description: 'Sem otimização específica',
  },
}

// ============================================
// Special Ad Categories
// ============================================

export const SPECIAL_AD_CATEGORIES: Record<string, { label: string; color: string; description: string }> = {
  HOUSING: {
    label: 'Imóveis',
    color: '#78716C', // Stone
    description: 'Anúncios relacionados a venda ou aluguel de imóveis',
  },
  EMPLOYMENT: {
    label: 'Emprego',
    color: '#78716C',
    description: 'Anúncios de vagas de emprego',
  },
  CREDIT: {
    label: 'Crédito',
    color: '#78716C',
    description: 'Anúncios de produtos financeiros ou crédito',
  },
  ISSUES_ELECTIONS_POLITICS: {
    label: 'Política',
    color: '#78716C',
    description: 'Anúncios sobre política ou questões sociais',
  },
  ONLINE_GAMBLING_AND_GAMING: {
    label: 'Jogos',
    color: '#78716C',
    description: 'Anúncios de jogos de azar ou apostas online',
  },
}

// ============================================
// Bid Strategies
// ============================================

export const BID_STRATEGIES: Record<string, { label: string; description: string }> = {
  LOWEST_COST_WITHOUT_CAP: {
    label: 'Menor Custo',
    description: 'Obter o maior número de resultados pelo menor custo',
  },
  LOWEST_COST_WITH_BID_CAP: {
    label: 'Limite de Lance',
    description: 'Limitar o lance máximo por resultado',
  },
  COST_CAP: {
    label: 'Custo Alvo',
    description: 'Manter o custo médio próximo ao valor definido',
  },
  LOWEST_COST_WITH_MIN_ROAS: {
    label: 'ROAS Mínimo',
    description: 'Otimizar para retorno mínimo sobre investimento',
  },
}

// ============================================
// Ad Status
// ============================================

export const AD_STATUS: Record<string, { label: string; color: string }> = {
  ACTIVE: {
    label: 'Ativo',
    color: '#10B981', // Green
  },
  PAUSED: {
    label: 'Pausado',
    color: '#F59E0B', // Amber
  },
  DELETED: {
    label: 'Excluído',
    color: '#EF4444', // Red
  },
  ARCHIVED: {
    label: 'Arquivado',
    color: '#6B7280', // Gray
  },
  PENDING_REVIEW: {
    label: 'Em Análise',
    color: '#3B82F6', // Blue
  },
  DISAPPROVED: {
    label: 'Reprovado',
    color: '#EF4444', // Red
  },
  PREAPPROVED: {
    label: 'Pré-aprovado',
    color: '#10B981', // Green
  },
  PENDING_BILLING_INFO: {
    label: 'Aguardando Pagamento',
    color: '#F59E0B', // Amber
  },
  CAMPAIGN_PAUSED: {
    label: 'Campanha Pausada',
    color: '#F59E0B', // Amber
  },
  ADSET_PAUSED: {
    label: 'Conjunto Pausado',
    color: '#F59E0B', // Amber
  },
  IN_PROCESS: {
    label: 'Processando',
    color: '#3B82F6', // Blue
  },
  WITH_ISSUES: {
    label: 'Com Problemas',
    color: '#EF4444', // Red
  },
}

// ============================================
// Call to Action (CTA)
// ============================================

export const CALL_TO_ACTIONS: Record<string, string> = {
  APPLY_NOW: 'Candidate-se',
  BOOK_TRAVEL: 'Reserve Viagem',
  BUY_NOW: 'Comprar',
  BUY_TICKETS: 'Comprar Ingressos',
  CALL_NOW: 'Ligar Agora',
  CONTACT_US: 'Fale Conosco',
  DONATE_NOW: 'Doar Agora',
  DOWNLOAD: 'Baixar',
  GET_DIRECTIONS: 'Obter Direções',
  GET_OFFER: 'Ver Oferta',
  GET_QUOTE: 'Obter Orçamento',
  GET_SHOWTIMES: 'Ver Horários',
  INSTALL_APP: 'Instalar App',
  INSTALL_MOBILE_APP: 'Instalar App',
  LEARN_MORE: 'Saiba Mais',
  LIKE_PAGE: 'Curtir Página',
  LISTEN_MUSIC: 'Ouvir Música',
  LISTEN_NOW: 'Ouvir Agora',
  MESSAGE_PAGE: 'Enviar Mensagem',
  NO_BUTTON: 'Sem Botão',
  OPEN_LINK: 'Abrir Link',
  ORDER_NOW: 'Pedir Agora',
  PLAY_GAME: 'Jogar',
  RECORD_NOW: 'Gravar Agora',
  REQUEST_TIME: 'Agendar',
  SAY_THANKS: 'Agradecer',
  SEE_MENU: 'Ver Cardápio',
  SELL_NOW: 'Vender Agora',
  SEND_TIP: 'Enviar Gorjeta',
  SHOP_NOW: 'Comprar Agora',
  SIGN_UP: 'Cadastrar',
  SUBSCRIBE: 'Assinar',
  USE_APP: 'Usar App',
  USE_MOBILE_APP: 'Usar App',
  VIDEO_CALL: 'Videochamada',
  VISIT_PAGES_FEED: 'Ver Feed',
  WATCH_MORE: 'Ver Mais',
  WATCH_VIDEO: 'Assistir Vídeo',
  WHATSAPP_MESSAGE: 'WhatsApp',
  SEND_WHATSAPP_MESSAGE: 'WhatsApp',
}

// ============================================
// Ad/Creative Object Types (Meta & Google)
// ============================================

export const OBJECT_TYPES: Record<string, { label: string; icon?: string }> = {
  // Meta object types
  VIDEO: { label: 'Vídeo' },
  SHARE: { label: 'Imagem' },
  PHOTO: { label: 'Foto' },
  LINK: { label: 'Link' },
  STATUS: { label: 'Status' },
  OFFER: { label: 'Oferta' },
  EVENT: { label: 'Evento' },
  MULTI_SHARE: { label: 'Carrossel' },
  
  // Google Ads types
  EXPANDED_TEXT_AD: { label: 'Texto Expandido' },
  RESPONSIVE_SEARCH_AD: { label: 'Pesquisa Responsivo' },
  RESPONSIVE_DISPLAY_AD: { label: 'Display Responsivo' },
  EXPANDED_DYNAMIC_SEARCH_AD: { label: 'Pesquisa Dinâmica' },
  HOTEL_AD: { label: 'Hotel' },
  SHOPPING_COMPARISON_LISTING_AD: { label: 'Comparação Shopping' },
  SHOPPING_PRODUCT_AD: { label: 'Produto Shopping' },
  SHOPPING_SMART_AD: { label: 'Shopping Inteligente' },
  VIDEO_AD: { label: 'Vídeo' },
  VIDEO_RESPONSIVE_AD: { label: 'Vídeo Responsivo' },
  CALL_AD: { label: 'Chamada' },
  APP_AD: { label: 'App' },
  APP_ENGAGEMENT_AD: { label: 'Engajamento App' },
  APP_PRE_REGISTRATION_AD: { label: 'Pré-registro App' },
  DISCOVERY_CAROUSEL_AD: { label: 'Discovery Carrossel' },
  DISCOVERY_MULTI_ASSET_AD: { label: 'Discovery Multi-asset' },
  DISCOVERY_VIDEO_RESPONSIVE_AD: { label: 'Discovery Vídeo' },
  LOCAL_AD: { label: 'Local' },
  SMART_CAMPAIGN_AD: { label: 'Campanha Inteligente' },
  PERFORMANCE_MAX_AD: { label: 'Performance Max' },
  DEMAND_GEN_CAROUSEL_AD: { label: 'Demand Gen Carrossel' },
  DEMAND_GEN_MULTI_ASSET_AD: { label: 'Demand Gen Multi-asset' },
  DEMAND_GEN_PRODUCT_AD: { label: 'Demand Gen Produto' },
  DEMAND_GEN_VIDEO_RESPONSIVE_AD: { label: 'Demand Gen Vídeo' },
  TRAVEL_AD: { label: 'Viagem' },
  
  // Fallback
  UNKNOWN: { label: 'Desconhecido' },
  
  // Google Ads - Ad Group Types
  SEARCH_STANDARD: { label: 'Pesquisa Padrão' },
  SEARCH_DYNAMIC_ADS: { label: 'Pesquisa Dinâmica' },
  DISPLAY_STANDARD: { label: 'Display Padrão' },
  SHOPPING_PRODUCT_ADS: { label: 'Shopping Produto' },
  SHOPPING_SHOWCASE_ADS: { label: 'Shopping Vitrine' },
  SHOPPING_SMART_ADS: { label: 'Shopping Inteligente' },
  SHOPPING_COMPARISON_LISTING_ADS: { label: 'Shopping Comparação' },
  VIDEO_BUMPER: { label: 'Vídeo Bumper' },
  VIDEO_TRUE_VIEW_IN_DISPLAY: { label: 'TrueView Display' },
  VIDEO_TRUE_VIEW_IN_STREAM: { label: 'TrueView In-Stream' },
  VIDEO_NON_SKIPPABLE_IN_STREAM: { label: 'Vídeo Não-Pulável' },
  VIDEO_OUTSTREAM: { label: 'Vídeo Outstream' },
  VIDEO_RESPONSIVE: { label: 'Vídeo Responsivo' },
  HOTEL_ADS: { label: 'Anúncio Hotel' },
  SMART_CAMPAIGN_ADS: { label: 'Campanha Inteligente' },
  PROMOTED_HOTEL_ADS: { label: 'Hotel Promovido' },
  
  // Google Ads - Campaign Types
  SEARCH: { label: 'Pesquisa' },
  DISPLAY: { label: 'Display' },
  SHOPPING: { label: 'Shopping' },
  HOTEL: { label: 'Hotel' },
  // VIDEO already defined above in Meta object types
  MULTI_CHANNEL: { label: 'Multicanal' },
  LOCAL: { label: 'Local' },
  SMART: { label: 'Smart' },
  PERFORMANCE_MAX: { label: 'Performance Max' },
  LOCAL_SERVICES: { label: 'Serviços Locais' },
  DISCOVERY: { label: 'Discovery' },
  TRAVEL: { label: 'Viagem' },
  DEMAND_GEN: { label: 'Demand Gen' },
}

// ============================================
// Helper Functions
// ============================================

/**
 * Get translated ad/creative object type
 */
export function getObjectTypeLabel(objectType: string | undefined | null): string {
  if (!objectType) return ''
  const info = OBJECT_TYPES[objectType]
  if (info) return info.label
  // Fallback: convert SNAKE_CASE to Title Case
  return objectType.replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, (l) => l.toUpperCase())
}

/**
 * Get translated objective with color
 */
export function getObjectiveInfo(objective: string | undefined | null) {
  if (!objective) return null
  return CAMPAIGN_OBJECTIVES[objective] || {
    label: objective.replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, (l) => l.toUpperCase()),
    color: '#6B7280',
    description: objective,
  }
}

/**
 * Get translated optimization goal
 */
export function getOptimizationGoalInfo(goal: string | undefined | null) {
  if (!goal) return null
  return OPTIMIZATION_GOALS[goal] || {
    label: goal.replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, (l) => l.toUpperCase()),
    description: goal,
  }
}

/**
 * Get translated special ad category
 */
export function getSpecialAdCategoryInfo(category: string | undefined | null) {
  if (!category) return null
  return SPECIAL_AD_CATEGORIES[category] || {
    label: category.replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, (l) => l.toUpperCase()),
    color: '#78716C',
    description: category,
  }
}

/**
 * Get translated status with color
 */
export function getStatusInfo(status: string | undefined | null) {
  if (!status) return null
  return AD_STATUS[status] || {
    label: status.replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, (l) => l.toUpperCase()),
    color: '#6B7280',
  }
}

/**
 * Get translated CTA
 */
export function getCTALabel(cta: string | undefined | null) {
  if (!cta) return null
  return CALL_TO_ACTIONS[cta] || cta.replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, (l) => l.toUpperCase())
}

/**
 * Get translated bid strategy
 */
export function getBidStrategyInfo(strategy: string | undefined | null) {
  if (!strategy) return null
  return BID_STRATEGIES[strategy] || {
    label: strategy.replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, (l) => l.toUpperCase()),
    description: strategy,
  }
}
