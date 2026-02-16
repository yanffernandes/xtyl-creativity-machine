// ========================
// Meta Ads Campaign Types
// ========================

// Wizard Steps
export type MetaWizardStep =
  | 'articles' // NOVO: Seleção de artigos (primeiro)
  | 'adsets_config' // NOVO: Configuração de conjuntos
  | 'account'
  | 'pixel'
  | 'page'
  | 'instagram'
  | 'objective'
  | 'targeting'
  | 'budget'
  | 'creative' // Legacy (Google Drive images)
  | 'creative_ai' // AI image generation config
  | 'creative_approval' // AI image approval grid
  | 'ad_copy'
  | 'review'

export const META_WIZARD_STEPS: MetaWizardStep[] = [
  'articles', // 1. Selecionar artigos
  'adsets_config', // 2. Configurar conjuntos/duplicação
  'account', // 3. Conta de anúncios
  'pixel', // 4. Pixel (opcional)
  'page', // 5. Página Facebook
  'instagram', // 6. Instagram (opcional)
  'objective', // 7. Objetivo da campanha
  'targeting', // 8. Público-alvo
  'budget', // 9. Orçamento
  'creative_ai', // 10. Gerar criativos por IA
  'creative_approval', // 11. Aprovar criativos
  'ad_copy', // 12. Textos do anúncio
  'review', // 13. Revisão final
]

export const META_STEP_LABELS: Record<MetaWizardStep, string> = {
  articles: 'Artigos',
  adsets_config: 'Conjuntos',
  account: 'Conta',
  pixel: 'Pixel',
  page: 'Página',
  instagram: 'Instagram',
  objective: 'Objetivo',
  targeting: 'Público',
  budget: 'Orçamento',
  creative: 'Criativos',
  creative_ai: 'Gerar IA',
  creative_approval: 'Aprovar',
  ad_copy: 'Textos',
  review: 'Revisão',
}

// ========================
// Objectives (ODAX Framework - v22.0+)
// ========================

/**
 * ODAX (Outcome-Driven Ad Experiences) objectives - the 6 standard Meta objectives.
 * These are the actual API values sent to the Meta Marketing API.
 * Legacy objectives (BRAND_AWARENESS, REACH, LINK_CLICKS, etc.) are no longer accepted.
 */
export type MetaObjective =
  | 'OUTCOME_AWARENESS'
  | 'OUTCOME_TRAFFIC'
  | 'OUTCOME_ENGAGEMENT'
  | 'OUTCOME_LEADS'
  | 'OUTCOME_APP_PROMOTION'
  | 'OUTCOME_SALES'

export const META_OBJECTIVES = [
  {
    value: 'OUTCOME_AWARENESS' as const,
    label: 'Reconhecimento',
    description: 'Maximizar alcance e lembrança de marca',
    icon: 'eye',
  },
  {
    value: 'OUTCOME_TRAFFIC' as const,
    label: 'Tráfego',
    description: 'Direcionar pessoas para site, app ou experiência',
    icon: 'mouse-pointer',
  },
  {
    value: 'OUTCOME_ENGAGEMENT' as const,
    label: 'Engajamento',
    description: 'Curtidas, comentários, compartilhamentos, mensagens',
    icon: 'heart',
  },
  {
    value: 'OUTCOME_LEADS' as const,
    label: 'Leads / Cadastros',
    description: 'Capturar leads via formulários ou mensagens',
    icon: 'user-plus',
  },
  {
    value: 'OUTCOME_APP_PROMOTION' as const,
    label: 'Promoção de App',
    description: 'Instalações e eventos in-app',
    icon: 'smartphone',
  },
  {
    value: 'OUTCOME_SALES' as const,
    label: 'Vendas',
    description: 'Conversões, compras, catálogo de produtos',
    icon: 'shopping-cart',
  },
] as const

// ========================
// Destination Type (Local de Conversão)
// ========================

/**
 * Defines WHERE the conversion happens. Set on the Ad Set level.
 * Maps to `destination_type` in the Meta API.
 */
export type MetaDestinationType =
  | 'WEBSITE'
  | 'APP'
  | 'MESSENGER'
  | 'WHATSAPP'
  | 'INSTAGRAM_DIRECT'
  | 'PHONE_CALL'
  | 'ON_AD'
  | 'ON_POST'
  | 'ON_VIDEO'
  | 'ON_EVENT'
  | 'SHOP_AUTOMATIC'
  | 'UNDEFINED'

export interface MetaDestinationOption {
  value: MetaDestinationType
  label: string
  description: string
  icon: string
}

/**
 * Available destination types per objective.
 * Not all destinations are valid for all objectives.
 */
export const META_DESTINATION_BY_OBJECTIVE: Record<MetaObjective, MetaDestinationOption[]> = {
  OUTCOME_AWARENESS: [
    { value: 'UNDEFINED', label: 'Automático', description: 'Meta seleciona o melhor posicionamento', icon: 'sparkles' },
    { value: 'ON_VIDEO', label: 'No vídeo', description: 'Maximizar visualizações de vídeo', icon: 'play-circle' },
  ],
  OUTCOME_TRAFFIC: [
    { value: 'WEBSITE', label: 'Site', description: 'Enviar tráfego para seu site ou landing page', icon: 'globe' },
    { value: 'APP', label: 'Aplicativo', description: 'Direcionar para seu aplicativo', icon: 'smartphone' },
    { value: 'MESSENGER', label: 'Messenger', description: 'Iniciar conversas no Messenger', icon: 'message-square' },
    { value: 'WHATSAPP', label: 'WhatsApp', description: 'Direcionar para WhatsApp Business', icon: 'message-circle' },
    { value: 'INSTAGRAM_DIRECT', label: 'Instagram Direct', description: 'Iniciar conversas no Instagram', icon: 'instagram' },
    { value: 'PHONE_CALL', label: 'Ligações', description: 'Gerar cliques para ligar', icon: 'phone' },
  ],
  OUTCOME_ENGAGEMENT: [
    { value: 'ON_POST', label: 'Na publicação', description: 'Engajamento em publicações', icon: 'thumbs-up' },
    { value: 'ON_VIDEO', label: 'No vídeo', description: 'Maximizar visualizações de vídeo', icon: 'play-circle' },
    { value: 'ON_EVENT', label: 'No evento', description: 'Respostas a eventos do Facebook', icon: 'calendar' },
    { value: 'MESSENGER', label: 'Messenger', description: 'Iniciar conversas no Messenger', icon: 'message-square' },
    { value: 'WHATSAPP', label: 'WhatsApp', description: 'Iniciar conversas no WhatsApp', icon: 'message-circle' },
    { value: 'INSTAGRAM_DIRECT', label: 'Instagram Direct', description: 'Iniciar conversas no Instagram', icon: 'instagram' },
  ],
  OUTCOME_LEADS: [
    { value: 'WEBSITE', label: 'Site', description: 'Capturar leads no seu site via formulário', icon: 'globe' },
    { value: 'ON_AD', label: 'Formulário instantâneo', description: 'Lead Ads - formulário sem sair do Meta', icon: 'file-text' },
    { value: 'MESSENGER', label: 'Messenger', description: 'Capturar leads via Messenger', icon: 'message-square' },
    { value: 'WHATSAPP', label: 'WhatsApp', description: 'Capturar leads via WhatsApp', icon: 'message-circle' },
    { value: 'INSTAGRAM_DIRECT', label: 'Instagram Direct', description: 'Capturar leads via Instagram', icon: 'instagram' },
    { value: 'PHONE_CALL', label: 'Ligações', description: 'Gerar ligações de leads qualificados', icon: 'phone' },
  ],
  OUTCOME_APP_PROMOTION: [
    { value: 'APP', label: 'Aplicativo', description: 'Instalações e eventos in-app', icon: 'smartphone' },
  ],
  OUTCOME_SALES: [
    { value: 'WEBSITE', label: 'Site', description: 'Conversões no site via Pixel/CAPI', icon: 'globe' },
    { value: 'APP', label: 'Aplicativo', description: 'Conversões dentro do app', icon: 'smartphone' },
    { value: 'MESSENGER', label: 'Messenger', description: 'Vendas via conversas no Messenger', icon: 'message-square' },
    { value: 'WHATSAPP', label: 'WhatsApp', description: 'Vendas via conversas no WhatsApp', icon: 'message-circle' },
    { value: 'INSTAGRAM_DIRECT', label: 'Instagram Direct', description: 'Vendas via Instagram Direct', icon: 'instagram' },
    { value: 'PHONE_CALL', label: 'Ligações', description: 'Vendas via ligação', icon: 'phone' },
    { value: 'SHOP_AUTOMATIC', label: 'Loja Meta', description: 'Compras via Meta Shop', icon: 'shopping-bag' },
  ],
}

// ========================
// Optimization Goal (Meta de Desempenho)
// ========================

/**
 * Defines WHAT the algorithm optimizes for. Set on the Ad Set level.
 * Maps to `optimization_goal` in the Meta API.
 */
export type MetaOptimizationGoal =
  | 'OFFSITE_CONVERSIONS'
  | 'CONVERSATIONS'
  | 'VALUE'
  | 'LINK_CLICKS'
  | 'LANDING_PAGE_VIEWS'
  | 'IMPRESSIONS'
  | 'REACH'
  | 'AD_RECALL_LIFT'
  | 'ENGAGED_USERS'
  | 'POST_ENGAGEMENT'
  | 'PAGE_LIKES'
  | 'EVENT_RESPONSES'
  | 'LEAD_GENERATION'
  | 'QUALITY_LEAD'
  | 'QUALITY_CALL'
  | 'APP_INSTALLS'
  | 'THRUPLAY'
  | 'TWO_SECOND_CONTINUOUS_VIDEO_VIEWS'
  | 'VISIT_INSTAGRAM_PROFILE'

export interface MetaOptimizationOption {
  value: MetaOptimizationGoal
  label: string
  description: string
}

/**
 * Available optimization goals based on objective + destination_type combination.
 * Key format: "OBJECTIVE::DESTINATION_TYPE"
 */
export const META_OPTIMIZATION_BY_CONTEXT: Record<string, MetaOptimizationOption[]> = {
  // AWARENESS
  'OUTCOME_AWARENESS::UNDEFINED': [
    { value: 'REACH', label: 'Maximizar alcance', description: 'Mostrar para o máximo de pessoas únicas' },
    { value: 'IMPRESSIONS', label: 'Maximizar impressões', description: 'Maximizar número de exibições' },
    { value: 'AD_RECALL_LIFT', label: 'Lembrança de anúncio', description: 'Estimativa de recall da marca' },
  ],
  'OUTCOME_AWARENESS::ON_VIDEO': [
    { value: 'THRUPLAY', label: 'ThruPlay', description: 'Vídeos assistidos até o final (ou 15s)' },
    { value: 'TWO_SECOND_CONTINUOUS_VIDEO_VIEWS', label: 'Reproduções de 2s', description: 'Vídeos com 2s de visualização contínua' },
    { value: 'REACH', label: 'Maximizar alcance', description: 'Mostrar para o máximo de pessoas únicas' },
  ],

  // TRAFFIC
  'OUTCOME_TRAFFIC::WEBSITE': [
    { value: 'LINK_CLICKS', label: 'Cliques no link', description: 'Maximizar cliques para o site' },
    { value: 'LANDING_PAGE_VIEWS', label: 'Visualizações da página', description: 'Maximizar visualizações reais da landing page' },
  ],
  'OUTCOME_TRAFFIC::APP': [
    { value: 'APP_INSTALLS', label: 'Instalações do app', description: 'Maximizar instalações do aplicativo' },
    { value: 'LINK_CLICKS', label: 'Cliques no link', description: 'Maximizar cliques para o app' },
  ],
  'OUTCOME_TRAFFIC::MESSENGER': [
    { value: 'CONVERSATIONS', label: 'Conversas', description: 'Maximizar conversas no Messenger' },
    { value: 'LINK_CLICKS', label: 'Cliques no link', description: 'Maximizar cliques' },
  ],
  'OUTCOME_TRAFFIC::WHATSAPP': [
    { value: 'CONVERSATIONS', label: 'Conversas', description: 'Maximizar conversas no WhatsApp' },
    { value: 'LINK_CLICKS', label: 'Cliques no link', description: 'Maximizar cliques' },
  ],
  'OUTCOME_TRAFFIC::INSTAGRAM_DIRECT': [
    { value: 'CONVERSATIONS', label: 'Conversas', description: 'Maximizar conversas no Instagram' },
    { value: 'LINK_CLICKS', label: 'Cliques no link', description: 'Maximizar cliques' },
  ],
  'OUTCOME_TRAFFIC::PHONE_CALL': [
    { value: 'QUALITY_CALL', label: 'Ligações de qualidade', description: 'Chamadas com duração mínima' },
    { value: 'LINK_CLICKS', label: 'Cliques no link', description: 'Maximizar cliques para ligar' },
  ],

  // ENGAGEMENT
  'OUTCOME_ENGAGEMENT::ON_POST': [
    { value: 'POST_ENGAGEMENT', label: 'Engajamento na publicação', description: 'Curtidas, comentários e compartilhamentos' },
    { value: 'ENGAGED_USERS', label: 'Pessoas engajadas', description: 'Maximizar número de pessoas engajadas' },
    { value: 'PAGE_LIKES', label: 'Curtidas na página', description: 'Curtidas na Fan Page' },
  ],
  'OUTCOME_ENGAGEMENT::ON_VIDEO': [
    { value: 'THRUPLAY', label: 'ThruPlay', description: 'Vídeos assistidos até o final (ou 15s)' },
    { value: 'TWO_SECOND_CONTINUOUS_VIDEO_VIEWS', label: 'Reproduções de 2s', description: 'Vídeos com 2s contínua' },
  ],
  'OUTCOME_ENGAGEMENT::ON_EVENT': [
    { value: 'EVENT_RESPONSES', label: 'Respostas ao evento', description: 'Maximizar respostas ao evento' },
  ],
  'OUTCOME_ENGAGEMENT::MESSENGER': [
    { value: 'CONVERSATIONS', label: 'Conversas', description: 'Maximizar conversas no Messenger' },
  ],
  'OUTCOME_ENGAGEMENT::WHATSAPP': [
    { value: 'CONVERSATIONS', label: 'Conversas', description: 'Maximizar conversas no WhatsApp' },
  ],
  'OUTCOME_ENGAGEMENT::INSTAGRAM_DIRECT': [
    { value: 'CONVERSATIONS', label: 'Conversas', description: 'Maximizar conversas no Instagram' },
  ],

  // LEADS
  'OUTCOME_LEADS::WEBSITE': [
    { value: 'OFFSITE_CONVERSIONS', label: 'Maximizar nº de conversões', description: 'Leads capturados no seu site via Pixel' },
    { value: 'LINK_CLICKS', label: 'Cliques no link', description: 'Maximizar cliques para o formulário' },
  ],
  'OUTCOME_LEADS::ON_AD': [
    { value: 'LEAD_GENERATION', label: 'Leads', description: 'Maximizar leads via formulário instantâneo' },
    { value: 'QUALITY_LEAD', label: 'Leads de qualidade', description: 'Leads otimizados por qualidade (requer Conversion Leads)' },
  ],
  'OUTCOME_LEADS::MESSENGER': [
    { value: 'CONVERSATIONS', label: 'Maximizar nº de conversas', description: 'Maximizar leads via Messenger' },
    { value: 'LEAD_GENERATION', label: 'Leads', description: 'Leads qualificados via Messenger' },
    { value: 'OFFSITE_CONVERSIONS', label: 'Maximizar nº de conversões', description: 'Leads rastreados via Pixel/CAPI após conversa no Messenger' },
  ],
  'OUTCOME_LEADS::WHATSAPP': [
    { value: 'CONVERSATIONS', label: 'Maximizar nº de conversas', description: 'Maximizar leads via WhatsApp' },
    { value: 'LEAD_GENERATION', label: 'Leads', description: 'Leads qualificados via WhatsApp' },
    { value: 'OFFSITE_CONVERSIONS', label: 'Maximizar nº de conversões', description: 'Leads rastreados via Pixel/CAPI após conversa no WhatsApp' },
  ],
  'OUTCOME_LEADS::INSTAGRAM_DIRECT': [
    { value: 'CONVERSATIONS', label: 'Maximizar nº de conversas', description: 'Maximizar leads via Instagram' },
    { value: 'LEAD_GENERATION', label: 'Leads', description: 'Leads qualificados via Instagram' },
    { value: 'OFFSITE_CONVERSIONS', label: 'Maximizar nº de conversões', description: 'Leads rastreados via Pixel/CAPI após conversa no Instagram' },
  ],
  'OUTCOME_LEADS::PHONE_CALL': [
    { value: 'QUALITY_CALL', label: 'Ligações de qualidade', description: 'Chamadas de leads qualificados' },
  ],

  // APP PROMOTION
  'OUTCOME_APP_PROMOTION::APP': [
    { value: 'APP_INSTALLS', label: 'Instalações do app', description: 'Maximizar instalações' },
    { value: 'OFFSITE_CONVERSIONS', label: 'Eventos in-app', description: 'Otimizar para eventos dentro do app' },
  ],

  // SALES
  'OUTCOME_SALES::WEBSITE': [
    { value: 'OFFSITE_CONVERSIONS', label: 'Maximizar nº de conversões', description: 'Maximizar conversões (Purchase, Lead, etc.) via Pixel' },
    { value: 'VALUE', label: 'Maximizar valor das conversões', description: 'Otimizar por ROAS - valor total de compras' },
  ],
  'OUTCOME_SALES::APP': [
    { value: 'APP_INSTALLS', label: 'Instalações do app', description: 'Instalações com foco em compra' },
    { value: 'OFFSITE_CONVERSIONS', label: 'Eventos in-app', description: 'Conversões dentro do app' },
  ],
  'OUTCOME_SALES::MESSENGER': [
    { value: 'CONVERSATIONS', label: 'Maximizar nº de conversas', description: 'Maximizar conversas de vendas no Messenger' },
    { value: 'OFFSITE_CONVERSIONS', label: 'Maximizar nº de conversões', description: 'Conversões rastreadas via Pixel/CAPI após conversa no Messenger' },
  ],
  'OUTCOME_SALES::WHATSAPP': [
    { value: 'CONVERSATIONS', label: 'Maximizar nº de conversas', description: 'Maximizar conversas de vendas no WhatsApp' },
    { value: 'OFFSITE_CONVERSIONS', label: 'Maximizar nº de conversões', description: 'Conversões rastreadas via Pixel/CAPI após conversa no WhatsApp' },
  ],
  'OUTCOME_SALES::INSTAGRAM_DIRECT': [
    { value: 'CONVERSATIONS', label: 'Maximizar nº de conversas', description: 'Maximizar conversas de vendas no Instagram' },
    { value: 'OFFSITE_CONVERSIONS', label: 'Maximizar nº de conversões', description: 'Conversões rastreadas via Pixel/CAPI após conversa no Instagram' },
  ],
  'OUTCOME_SALES::PHONE_CALL': [
    { value: 'QUALITY_CALL', label: 'Ligações de qualidade', description: 'Vendas via ligação qualificada' },
  ],
  'OUTCOME_SALES::SHOP_AUTOMATIC': [
    { value: 'OFFSITE_CONVERSIONS', label: 'Conversões na Loja', description: 'Compras via Meta Shop' },
  ],
}

/**
 * Get optimization options for a given objective + destination combination.
 * Falls back to a default set if no specific combo exists.
 */
export function getOptimizationOptions(
  objective: MetaObjective,
  destinationType: MetaDestinationType,
): MetaOptimizationOption[] {
  const key = `${objective}::${destinationType}`
  return META_OPTIMIZATION_BY_CONTEXT[key] || [
    { value: 'LINK_CLICKS', label: 'Cliques no link', description: 'Otimização padrão' },
  ]
}

/**
 * Get the default optimization goal for a given objective + destination.
 */
export function getDefaultOptimizationGoal(
  objective: MetaObjective,
  destinationType: MetaDestinationType,
): MetaOptimizationGoal {
  const options = getOptimizationOptions(objective, destinationType)
  return options[0]?.value || 'LINK_CLICKS'
}

// ========================
// Conversion Events (custom_event_type)
// ========================

/**
 * Standard Meta Pixel events for the promoted_object.custom_event_type field.
 * Used when destination_type is WEBSITE and a pixel is selected.
 */
export type MetaConversionEvent =
  | 'ADD_PAYMENT_INFO'
  | 'ADD_TO_CART'
  | 'ADD_TO_WISHLIST'
  | 'COMPLETE_REGISTRATION'
  | 'CONTACT'
  | 'CUSTOMIZE_PRODUCT'
  | 'DONATE'
  | 'FIND_LOCATION'
  | 'INITIATED_CHECKOUT'
  | 'LEAD'
  | 'PURCHASE'
  | 'SCHEDULE'
  | 'SEARCH'
  | 'START_TRIAL'
  | 'SUBMIT_APPLICATION'
  | 'SUBSCRIBE'
  | 'VIEW_CONTENT'
  | 'OTHER'

export interface MetaConversionEventOption {
  value: MetaConversionEvent
  label: string
  pixelCode: string
}

export const META_CONVERSION_EVENTS: MetaConversionEventOption[] = [
  { value: 'PURCHASE', label: 'Compra', pixelCode: "fbq('track', 'Purchase')" },
  { value: 'COMPLETE_REGISTRATION', label: 'Concluir inscrição', pixelCode: "fbq('track', 'CompleteRegistration')" },
  { value: 'LEAD', label: 'Lead / Cadastro', pixelCode: "fbq('track', 'Lead')" },
  { value: 'ADD_TO_CART', label: 'Adicionar ao carrinho', pixelCode: "fbq('track', 'AddToCart')" },
  { value: 'INITIATED_CHECKOUT', label: 'Iniciar checkout', pixelCode: "fbq('track', 'InitiateCheckout')" },
  { value: 'ADD_PAYMENT_INFO', label: 'Adicionar pagamento', pixelCode: "fbq('track', 'AddPaymentInfo')" },
  { value: 'ADD_TO_WISHLIST', label: 'Lista de desejos', pixelCode: "fbq('track', 'AddToWishlist')" },
  { value: 'CONTACT', label: 'Contato', pixelCode: "fbq('track', 'Contact')" },
  { value: 'SUBSCRIBE', label: 'Assinar', pixelCode: "fbq('track', 'Subscribe')" },
  { value: 'START_TRIAL', label: 'Iniciar período de teste', pixelCode: "fbq('track', 'StartTrial')" },
  { value: 'SUBMIT_APPLICATION', label: 'Enviar solicitação', pixelCode: "fbq('track', 'SubmitApplication')" },
  { value: 'SCHEDULE', label: 'Agendamento', pixelCode: "fbq('track', 'Schedule')" },
  { value: 'VIEW_CONTENT', label: 'Visualizar conteúdo', pixelCode: "fbq('track', 'ViewContent')" },
  { value: 'SEARCH', label: 'Pesquisa', pixelCode: "fbq('track', 'Search')" },
  { value: 'CUSTOMIZE_PRODUCT', label: 'Personalizar produto', pixelCode: "fbq('track', 'CustomizeProduct')" },
  { value: 'DONATE', label: 'Doação', pixelCode: "fbq('track', 'Donate')" },
  { value: 'FIND_LOCATION', label: 'Encontrar localização', pixelCode: "fbq('track', 'FindLocation')" },
  { value: 'OTHER', label: 'Outro (evento customizado)', pixelCode: "fbq('trackCustom', 'MeuEvento')" },
]

/**
 * Recommended event order for eCommerce campaigns
 */
export const ECOMMERCE_EVENT_PRIORITY: MetaConversionEvent[] = [
  'PURCHASE', 'INITIATED_CHECKOUT', 'ADD_TO_CART', 'VIEW_CONTENT',
  'COMPLETE_REGISTRATION', 'LEAD', 'CONTACT', 'SEARCH',
]

/**
 * Recommended event order for Lead Gen campaigns
 */
export const LEADGEN_EVENT_PRIORITY: MetaConversionEvent[] = [
  'LEAD', 'COMPLETE_REGISTRATION', 'SUBMIT_APPLICATION', 'CONTACT',
  'VIEW_CONTENT', 'SCHEDULE', 'SEARCH',
]

// ========================
// Messages Configuration (legacy compat + new unified flow)
// ========================

/**
 * @deprecated Use MetaDestinationType instead. Kept for backward compatibility.
 */
export type MetaMessageDestination = 'WHATSAPP' | 'MESSENGER' | 'INSTAGRAM_DIRECT'

export const META_MESSAGE_DESTINATIONS = [
  {
    value: 'WHATSAPP' as const,
    label: 'WhatsApp',
    description: 'Direcionar para WhatsApp Business',
    icon: 'message-circle',
  },
  {
    value: 'MESSENGER' as const,
    label: 'Messenger',
    description: 'Direcionar para Facebook Messenger',
    icon: 'message-square',
  },
  {
    value: 'INSTAGRAM_DIRECT' as const,
    label: 'Instagram Direct',
    description: 'Direcionar para mensagens do Instagram',
    icon: 'instagram',
  },
] as const

/**
 * @deprecated Use MetaOptimizationGoal instead. Kept for backward compatibility.
 */
export type MetaMessageOptimization = 'CONVERSATIONS' | 'LINK_CLICKS' | 'LEAD_GENERATION'

export const META_MESSAGE_OPTIMIZATIONS = [
  {
    value: 'CONVERSATIONS' as const,
    label: 'Conversas',
    description: 'Maximizar número de conversas iniciadas',
  },
  {
    value: 'LINK_CLICKS' as const,
    label: 'Cliques no Link',
    description: 'Otimizar para cliques (menos comum para mensagens)',
  },
  {
    value: 'LEAD_GENERATION' as const,
    label: 'Leads',
    description: 'Otimizar para leads qualificados via mensagem',
  },
] as const

// Configuração completa de mensagens (kept for backward compat)
export interface MetaMessageConfig {
  destination: MetaMessageDestination
  optimization: MetaMessageOptimization
  whatsappNumber?: string
  greetingMessage?: string
}

/**
 * Check if a destination type is a messaging destination
 */
export function isMessagingDestination(dest: MetaDestinationType): boolean {
  return ['MESSENGER', 'WHATSAPP', 'INSTAGRAM_DIRECT'].includes(dest)
}

// ========================
// Special Ad Categories
// ========================

/**
 * Meta Special Ad Categories (updated January 2025)
 * Reference: https://www.data-axle.com/resources/blog/meta-special-ad-categories-rules/
 *
 * IMPORTANT: 'CREDIT' was deprecated and replaced by 'FINANCIAL_PRODUCTS_SERVICES'
 */
export type MetaSpecialAdCategory = 'FINANCIAL_PRODUCTS_SERVICES' | 'EMPLOYMENT' | 'HOUSING' | 'ISSUES_ELECTIONS_POLITICS'

export const META_SPECIAL_AD_CATEGORIES = [
  {
    value: 'FINANCIAL_PRODUCTS_SERVICES' as const,
    label: 'Produtos e Serviços Financeiros',
    description: 'Cartões de crédito, financiamentos, contas bancárias, investimentos, seguros',
    icon: 'credit-card',
  },
  {
    value: 'EMPLOYMENT' as const,
    label: 'Emprego',
    description: 'Vagas de emprego, estágios, feiras de emprego, certificações profissionais',
    icon: 'briefcase',
  },
  {
    value: 'HOUSING' as const,
    label: 'Habitação',
    description: 'Venda, aluguel, hipoteca, seguro residencial, serviços imobiliários',
    icon: 'home',
  },
  {
    value: 'ISSUES_ELECTIONS_POLITICS' as const,
    label: 'Questões Sociais, Eleições e Política',
    description: 'Questões sociais, eleições, política e assuntos governamentais',
    icon: 'landmark',
  },
] as const

/**
 * Restrições automáticas aplicadas pela Meta ao usar Special Ad Categories:
 * - Idade: somente 18-65+ (range completo, sem segmentação específica)
 * - Gênero: não pode segmentar por gênero
 * - Localização: raio mínimo de 25 km, sem CEP
 * - Interesses: várias opções de detailed targeting indisponíveis
 * - Exclusão de público: não permitido
 * - Lookalike Audiences: não disponível
 */
export const SPECIAL_AD_CATEGORY_RESTRICTIONS = {
  ageMin: 18,
  ageMax: 65,
  genders: [0] as MetaGender[], // All genders only
  disableGenderSelection: true,
  disableAgeSelection: true,
  disableDetailedTargeting: true,
  disableAudienceExclusion: true,
} as const

// ========================
// Publish Status
// ========================

export type MetaPublishStatus = 'ACTIVE' | 'PAUSED'

// ========================
// Account Status
// ========================

export type MetaAccountStatus =
  | 'ACTIVE'
  | 'DISABLED'
  | 'PENDING_REVIEW'
  | 'IN_GRACE_PERIOD'
  | 'UNSETTLED'

// ========================
// Core Entities
// ========================

export interface MetaAdAccount {
  id: string // ID da conta (act_XXXXXXXXX)
  name: string // Nome da conta
  accountId: string // ID numérico
  connectionId: string // ID da conexão OAuth
  currency: string // Moeda (BRL, USD, etc)
  timezone: string // Timezone (America/Sao_Paulo)
  status: MetaAccountStatus // Status da conta
  businessName?: string // Nome do negócio
  amountSpent?: number // Valor gasto total
}

export interface MetaPage {
  id: string // ID da página
  name: string // Nome da página
  accessToken: string // Page access token
  category?: string // Categoria da página
  pictureUrl?: string // URL da foto de perfil
  instagramBusinessAccount?: MetaInstagramAccount
}

export interface MetaInstagramAccount {
  id: string // ID da conta Instagram
  username: string // @username
  name?: string // Nome de exibição
  profilePictureUrl?: string // URL da foto de perfil
  followersCount?: number // Número de seguidores
}

export interface MetaPixel {
  id: string // ID do pixel
  name: string // Nome do pixel
  lastFiredTime?: string // Último disparo
  isActive?: boolean // Se está ativo
  isUnavailable?: boolean
}

// ========================
// Targeting
// ========================

export type MetaGender = 0 | 1 | 2 // 0=all, 1=male, 2=female

export interface MetaLanguage {
  key: string // Código do idioma (pt, en, es)
  name: string // Nome de exibição
}

export interface MetaCountry {
  key: string // Código do país (BR, US, PT)
  name: string // Nome do país
}

export interface MetaTargeting {
  ageMin: number // 18-65
  ageMax: number // 18-65
  genders: MetaGender[] // [0] = all, [1] = male, [2] = female
  countries: string[] // Códigos de país (BR, US, PT)
  languages: MetaLanguage[] // Idiomas selecionados
  customAudiences?: string[] // IDs de públicos personalizados
}

// ========================
// Budget
// ========================

/**
 * Meta API bid strategies. These are the actual API values.
 * Reference: Meta Marketing API > Bid Strategy
 */
export type MetaBidStrategy =
  | 'LOWEST_COST_WITHOUT_CAP'  // Menor custo (sem limite) - recomendado
  | 'COST_CAP'                 // Custo por resultado (define custo-alvo por conversão)
  | 'LOWEST_COST_WITH_BID_CAP' // Limite de lance (define teto para lance no leilão)
  | 'LOWEST_COST_WITH_MIN_ROAS' // ROAS mínimo (retorno mínimo sobre investimento)

export const META_BID_STRATEGIES = [
  {
    value: 'LOWEST_COST_WITHOUT_CAP' as const,
    label: 'Menor custo',
    description: 'Meta busca o maior volume pelo menor custo (recomendado)',
  },
  {
    value: 'COST_CAP' as const,
    label: 'Custo por resultado',
    description: 'Define um custo-alvo por conversão',
  },
  {
    value: 'LOWEST_COST_WITH_BID_CAP' as const,
    label: 'Limite de lance',
    description: 'Define um teto para o lance em cada leilão',
  },
  {
    value: 'LOWEST_COST_WITH_MIN_ROAS' as const,
    label: 'ROAS mínimo',
    description: 'Define um retorno mínimo sobre investimento em anúncios',
  },
] as const

export interface MetaBudget {
  type: 'daily' | 'lifetime'
  amount: number // Valor em centavos (600 = R$6)
  bidStrategy: MetaBidStrategy
  costPerResult?: number // Custo por resultado (para COST_CAP)
  bidCap?: number // Lance máximo por leilão (para LOWEST_COST_WITH_BID_CAP)
  minRoas?: number // ROAS mínimo (para LOWEST_COST_WITH_MIN_ROAS) - ex: 2.0 = 200%
}

// ========================
// Schedule
// ========================

export interface MetaSchedule {
  type: 'continuous' | 'scheduled'
  startTime?: string // ISO 8601 datetime
  endTime?: string // ISO 8601 datetime
  timezone: string // America/Sao_Paulo
}

// ========================
// Creative
// ========================

export type CreativeSourceType = 'google_drive' | 'ai_generated' | 'upload'

export interface MetaCreativeImage {
  id: string
  url: string // URL da imagem
  thumbnailUrl?: string // Thumbnail para preview
  hash?: string // Image hash (após upload ao Meta)
  source: CreativeSourceType
  prompt?: string // Prompt usado (se AI)
  width?: number
  height?: number
}

export interface MetaCreative {
  sourceType: CreativeSourceType
  images: MetaCreativeImage[]
}

export interface DriveFile {
  id: string
  name: string
  mimeType?: string // image/jpeg, image/png
  thumbnailLink?: string
  webContentLink?: string
  thumbnailUrl?: string // Alternative thumbnail property
  url?: string // URL for display
  size?: number
  createdTime?: string
}

export interface AiGeneratedImage {
  id: string
  url: string
  prompt: string
  revisedPrompt?: string // Prompt revisado pela IA
  createdAt: string
  approved: boolean
}

// ========================
// Ad Copy
// ========================

/**
 * Official Meta CTA values from Marketing API
 * Source: https://github.com/facebook/facebook-business-sdk-codegen/blob/main/api_specs/specs/enum_types.json
 */
export type MetaCTA =
  // Most common for traffic/conversion campaigns
  | 'LEARN_MORE'
  | 'SHOP_NOW'
  | 'BUY_NOW'
  | 'ORDER_NOW'
  | 'SIGN_UP'
  | 'SUBSCRIBE'
  | 'CONTACT_US'
  | 'GET_OFFER'
  | 'GET_QUOTE'
  | 'BOOK_NOW'
  | 'APPLY_NOW'
  | 'DOWNLOAD'
  // Messaging CTAs
  | 'MESSAGE_PAGE' // Official name for "Send Message"
  | 'WHATSAPP_MESSAGE'
  | 'CALL_NOW'
  | 'CALL'
  // Additional CTAs
  | 'GET_DIRECTIONS'
  | 'GET_STARTED'
  | 'WATCH_MORE'
  | 'WATCH_VIDEO'
  | 'LISTEN_NOW'
  | 'INSTALL_APP'
  | 'USE_APP'
  | 'DONATE_NOW'
  | 'DONATE'
  | 'SEND_MESSAGE' // Legacy alias for MESSAGE_PAGE (backward compatibility)

export const META_CTA_OPTIONS = [
  // Traffic & Engagement
  { value: 'LEARN_MORE' as const, label: 'Saiba mais' },
  { value: 'SHOP_NOW' as const, label: 'Comprar agora' },
  { value: 'BUY_NOW' as const, label: 'Comprar' },
  { value: 'ORDER_NOW' as const, label: 'Pedir agora' },
  { value: 'GET_OFFER' as const, label: 'Obter oferta' },
  { value: 'GET_QUOTE' as const, label: 'Solicitar orçamento' },
  // Lead Generation
  { value: 'SIGN_UP' as const, label: 'Cadastre-se' },
  { value: 'SUBSCRIBE' as const, label: 'Inscreva-se' },
  { value: 'APPLY_NOW' as const, label: 'Inscrever-se agora' },
  { value: 'BOOK_NOW' as const, label: 'Reservar agora' },
  { value: 'GET_STARTED' as const, label: 'Começar' },
  // Contact & Messaging
  { value: 'MESSAGE_PAGE' as const, label: 'Enviar mensagem' },
  { value: 'WHATSAPP_MESSAGE' as const, label: 'Enviar WhatsApp' },
  { value: 'CONTACT_US' as const, label: 'Fale conosco' },
  { value: 'CALL_NOW' as const, label: 'Ligar agora' },
  // App & Downloads
  { value: 'DOWNLOAD' as const, label: 'Baixar' },
  { value: 'INSTALL_APP' as const, label: 'Instalar app' },
  { value: 'USE_APP' as const, label: 'Usar app' },
  // Video & Audio
  { value: 'WATCH_MORE' as const, label: 'Assistir mais' },
  { value: 'WATCH_VIDEO' as const, label: 'Assistir vídeo' },
  { value: 'LISTEN_NOW' as const, label: 'Ouvir agora' },
  // Location
  { value: 'GET_DIRECTIONS' as const, label: 'Como chegar' },
  // Donations
  { value: 'DONATE_NOW' as const, label: 'Doar agora' },
] as const

export interface MetaAdCopy {
  primaryText: string // Texto principal (max 125 chars)
  headline: string // Título (max 27 chars)
  description: string // Descrição (max 27 chars)
  callToAction: MetaCTA // CTA selecionado
  destinationUrl: string // URL de destino
  displayUrl?: string // URL de exibição (opcional)
}

// ========================
// Messenger
// ========================

export interface MetaQuickReply {
  id: string
  title: string // Texto do botão (max 20 chars)
  payload?: string // Payload para bot
}

export interface MetaIceBreaker {
  id: string
  question: string // Pergunta exibida
  payload: string // Payload quando clicado
}

export interface MetaMessengerConfig {
  welcomeMessage: string // Mensagem de boas-vindas
  quickReplies: MetaQuickReply[]
  iceBreakers?: MetaIceBreaker[]
}

// ========================
// Campaign Template
// ========================

export type CampaignTemplateStatus =
  | 'draft'
  | 'ready'
  | 'publishing'
  | 'published'
  | 'failed'

export interface MetaPlatformIds {
  campaignId?: string
  adSetId?: string
  creativeId?: string
  adId?: string
}

export interface MetaCampaignData {
  // Account & Page
  adAccountId: string
  pageId: string
  instagramAccountId?: string

  // Campaign Config
  name: string
  objective: MetaObjective
  specialAdCategories: string[]
  status: 'ACTIVE' | 'PAUSED'

  // Targeting
  targeting: MetaTargeting

  // Budget
  budget: MetaBudget

  // Schedule
  schedule: MetaSchedule

  // Creative
  creative: MetaCreative

  // Ad Copy
  adCopy: MetaAdCopy

  // Messenger (optional)
  messenger?: MetaMessengerConfig
}

export interface MetaCampaignTemplate {
  id: string
  userId: string
  workspaceId?: string
  platform: 'meta_ads'
  name: string
  status: CampaignTemplateStatus
  campaignData: MetaCampaignData
  /** Full Zustand store snapshot for wizard resume */
  wizard_state?: Record<string, unknown>
  /** Last wizard step visited */
  last_wizard_step?: string
  platformIds?: MetaPlatformIds
  creditsConsumed: number
  errorMessage?: string
  createdAt: string
  updatedAt: string
  publishedAt?: string
  deletedAt?: string
}

// ========================
// Publish Progress
// ========================

export type MetaPublishStep =
  | 'validating'
  | 'creating_campaign'
  | 'creating_adset'
  | 'uploading_images'
  | 'creating_creative'
  | 'creating_ad'
  | 'done'
  | 'error'

export const META_PUBLISH_STEP_LABELS: Record<MetaPublishStep, string> = {
  validating: 'Validando dados...',
  creating_campaign: 'Criando campanha...',
  creating_adset: 'Criando conjunto de anúncios...',
  uploading_images: 'Enviando imagens...',
  creating_creative: 'Criando criativos...',
  creating_ad: 'Criando anúncio...',
  done: 'Publicado com sucesso!',
  error: 'Erro na publicação',
}

// ========================
// Credit Costs
// ========================

export const META_ADS_CREDIT_COSTS = {
  TEMPLATE_SAVE: 0,
  CAMPAIGN_PUBLISH: 3,
  CREATIVE_AI_GENERATED: 5,
  CREATIVE_GOOGLE_DRIVE: 1,
  AD_COPY_GENERATION: 2,
  HEADLINE_GENERATION: 1,
} as const

// ========================
// Validation Limits
// ========================

export const META_AD_LIMITS = {
  primaryText: 125, // Texto principal
  headline: 27, // Título
  description: 27, // Descrição
  quickReplyTitle: 20, // Botão resposta rápida
} as const

export const META_TARGETING_RULES = {
  ageMin: 18,
  ageMax: 65,
  budgetMin: 600, // R$6 em centavos
} as const

// ========================
// Article Selection (for campaigns)
// ========================

/**
 * Keyword snapshot stored with article at creation time
 * Contains localization info (language, country) from when keyword was mined
 */
export interface KeywordSnapshot {
  id?: number
  word?: string
  search_volume?: number
  cpc_min?: number
  cpc_max?: number
  language?: string // ISO 639-1 language code (e.g., 'pt', 'en')
  country?: string // ISO 3166-1 alpha-2 country code (e.g., 'BR', 'US')
}

export interface MetaSelectedArticle {
  id: number
  title: string | null
  keyword_used: string | null
  excerpt: string | null
  url: string | null
  project_id: number
  project_name?: string
  status: string | null
  language?: string
  keyword_snapshot?: KeywordSnapshot | string | null // JSON field from DB
}

// ========================
// AdSets Configuration
// ========================

export type CreativeDuplication = 1 | 2 | 3

export interface MetaAdSetsConfig {
  adSetsPerCampaign: number // Quantos conjuntos por campanha (default: 10)
  creativeDuplication: CreativeDuplication // Duplicar criativos 1x, 2x ou 3x no mesmo conjunto
}

export const DEFAULT_ADSETS_CONFIG: MetaAdSetsConfig = {
  adSetsPerCampaign: 10,
  creativeDuplication: 1,
}
