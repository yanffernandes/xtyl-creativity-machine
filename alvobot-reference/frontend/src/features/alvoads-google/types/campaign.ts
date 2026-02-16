// ========================
// Google Ads Campaign Types
// ========================

// Network types
export type GoogleNetworkType = 'search' | 'display' | 'shopping' | 'video' | 'performance_max'

// Bidding Strategies (Search)
export const GOOGLE_BIDDING_STRATEGIES = [
  { value: 'MAXIMIZE_CONVERSIONS', label: 'Maximizar conversões', description: 'Obter o máximo de conversões dentro do orçamento' },
  { value: 'MAXIMIZE_CONVERSION_VALUE', label: 'Maximizar valor de conversão', description: 'Obter o maior valor de conversão dentro do orçamento' },
  { value: 'TARGET_CPA', label: 'CPA desejado', description: 'Obter conversões ao CPA definido' },
  { value: 'TARGET_ROAS', label: 'ROAS desejado', description: 'Obter retorno sobre investimento em anúncios' },
  { value: 'MAXIMIZE_CLICKS', label: 'Maximizar cliques', description: 'Obter o máximo de cliques dentro do orçamento' },
  { value: 'MANUAL_CPC', label: 'CPC manual', description: 'Definir lances manualmente para cliques' },
  { value: 'ENHANCED_CPC', label: 'CPC otimizado', description: 'CPC manual com ajustes automáticos' },
] as const

export type GoogleBiddingStrategy = typeof GOOGLE_BIDDING_STRATEGIES[number]['value']

// Keyword Match Types
export const KEYWORD_MATCH_TYPES = [
  { value: 'BROAD', label: 'Ampla', symbol: '', description: 'Alcança buscas relacionadas' },
  { value: 'PHRASE', label: 'Frase', symbol: '"', description: 'Alcança buscas que incluem o significado' },
  { value: 'EXACT', label: 'Exata', symbol: '[]', description: 'Alcança buscas com mesmo significado' },
] as const

export type KeywordMatchType = typeof KEYWORD_MATCH_TYPES[number]['value']

// Ad Types (Search)
export const SEARCH_AD_TYPES = [
  { value: 'RESPONSIVE_SEARCH', label: 'Anúncio responsivo de pesquisa', description: 'Combina títulos e descrições automaticamente' },
  { value: 'CALL_ONLY', label: 'Apenas ligação', description: 'Incentiva ligações telefônicas' },
] as const

export type SearchAdType = typeof SEARCH_AD_TYPES[number]['value']

// Ad Types (Display)
export const DISPLAY_AD_TYPES = [
  { value: 'RESPONSIVE_DISPLAY', label: 'Anúncio responsivo de display', description: 'Adapta-se a qualquer espaço de anúncio' },
  { value: 'IMAGE', label: 'Anúncio de imagem', description: 'Imagem estática ou animada' },
] as const

export type DisplayAdType = typeof DISPLAY_AD_TYPES[number]['value']

// Display Targeting Types
export const DISPLAY_TARGETING_TYPES = [
  { value: 'AUDIENCE', label: 'Públicos', description: 'Alcance pessoas com base em interesses e comportamentos' },
  { value: 'CONTENT', label: 'Conteúdo', description: 'Apareça em sites e conteúdos específicos' },
  { value: 'DEMOGRAPHIC', label: 'Dados demográficos', description: 'Segmente por idade, gênero, etc.' },
  { value: 'REMARKETING', label: 'Remarketing', description: 'Alcance visitantes anteriores do site' },
] as const

export type DisplayTargetingType = typeof DISPLAY_TARGETING_TYPES[number]['value']

// Audience Types (Display)
export const GOOGLE_AUDIENCE_TYPES = [
  { value: 'AFFINITY', label: 'Afinidade', description: 'Pessoas com interesses específicos' },
  { value: 'IN_MARKET', label: 'No mercado', description: 'Pessoas pesquisando produtos/serviços' },
  { value: 'CUSTOM_INTENT', label: 'Intenção personalizada', description: 'Baseado em palavras-chave e URLs' },
  { value: 'SIMILAR', label: 'Públicos semelhantes', description: 'Similar aos seus clientes' },
  { value: 'REMARKETING_LIST', label: 'Lista de remarketing', description: 'Visitantes do seu site' },
  { value: 'CUSTOMER_MATCH', label: 'Segmentação por lista', description: 'Sua lista de clientes' },
] as const

export type GoogleAudienceType = typeof GOOGLE_AUDIENCE_TYPES[number]['value']

// Languages
export const GOOGLE_LANGUAGES = [
  { value: 'pt', label: 'Português' },
  { value: 'en', label: 'Inglês' },
  { value: 'es', label: 'Espanhol' },
  { value: 'de', label: 'Alemão' },
  { value: 'fr', label: 'Francês' },
  { value: 'it', label: 'Italiano' },
] as const

// Ad Extensions
export const AD_EXTENSIONS = [
  { value: 'SITELINK', label: 'Sitelinks', description: 'Links adicionais para seu site' },
  { value: 'CALLOUT', label: 'Frases de destaque', description: 'Texto adicional descritivo' },
  { value: 'STRUCTURED_SNIPPET', label: 'Snippets estruturados', description: 'Destaque aspectos específicos' },
  { value: 'CALL', label: 'Extensão de chamada', description: 'Número de telefone' },
  { value: 'LOCATION', label: 'Extensão de local', description: 'Endereço da empresa' },
  { value: 'PRICE', label: 'Extensão de preço', description: 'Mostrar preços de produtos/serviços' },
  { value: 'PROMOTION', label: 'Extensão de promoção', description: 'Destacar ofertas e descontos' },
] as const

export type AdExtensionType = typeof AD_EXTENSIONS[number]['value']

// ========================
// Data Interfaces
// ========================

export interface GoogleKeyword {
  id: string
  text: string
  matchType: KeywordMatchType
  status: 'ENABLED' | 'PAUSED' | 'REMOVED'
  maxCpc?: number
  qualityScore?: number
  estimatedBid?: number
  // Keyword Planner metrics
  avgMonthlySearches?: number | null
  competition?: 'LOW' | 'MEDIUM' | 'HIGH' | 'UNSPECIFIED' | null
  competitionIndex?: number | null
  lowTopOfPageBidMicros?: number | null
  highTopOfPageBidMicros?: number | null
}

export interface NegativeKeyword {
  id: string
  text: string
  matchType: 'BROAD' | 'PHRASE' | 'EXACT'
  level: 'campaign' | 'ad_group'
}

export interface ResponsiveSearchAd {
  id: string
  headlines: string[] // 3-15 headlines (max 30 chars each)
  descriptions: string[] // 2-4 descriptions (max 90 chars each)
  finalUrl: string
  path1?: string // max 15 chars
  path2?: string // max 15 chars
}

export interface ResponsiveDisplayAd {
  id: string
  headlines: string[] // 1-5 headlines (max 30 chars each)
  longHeadline: string // max 90 chars
  descriptions: string[] // 1-5 descriptions (max 90 chars each)
  businessName: string
  finalUrl: string
  images: DisplayImage[]
  logos: DisplayImage[]
  videos?: string[] // YouTube video URLs
}

export interface DisplayImage {
  id: string
  url: string
  type: 'MARKETING' | 'SQUARE_MARKETING' | 'LOGO' | 'LANDSCAPE_LOGO'
  width: number
  height: number
}

export interface Sitelink {
  id: string
  text: string // max 25 chars
  description1?: string // max 35 chars
  description2?: string // max 35 chars
  finalUrl: string
}

export interface Callout {
  id: string
  text: string // max 25 chars
}

export interface StructuredSnippet {
  id: string
  header: string
  values: string[] // 3-10 values
}

// ========================
// Source Article Data (for auto-generation)
// ========================

// Keyword snapshot stored with the article (contains full keyword data)
export interface KeywordSnapshot {
  id: number
  word: string
  search_volume?: number
  cpc_min?: number
  cpc_max?: number
  visibility?: string
  created_at?: string
  updated_at?: string
  competition?: string
  language: string
  country: string
}

export interface SourceArticleData {
  articleId: number
  wpPostId?: number // WordPress post ID for fetching URL
  title: string
  excerpt?: string
  content?: string // First 1000 chars for context
  keywordUsed?: string
  keywordSnapshot?: KeywordSnapshot // Full keyword data with language and country
  language?: string // Deprecated: use keywordSnapshot.language instead
  words?: number
  projectId?: number
  projectName?: string
  articleUrl?: string // URL of the article (fetched from WordPress)
  usePreArticleUrl?: boolean // If true, use /pre/{slug} format instead of normal URL
}

// Generated sitelink from article
export interface GeneratedSitelink {
  text: string
  description1: string
  description2: string
  finalUrl: string
}

// Generated structured snippet from article
export interface GeneratedStructuredSnippet {
  header: string
  values: string[]
}

// Generated extensions from article
export interface GeneratedExtensions {
  sitelinks: GeneratedSitelink[]
  callouts: string[]
  structuredSnippets: GeneratedStructuredSnippet[]
}

// Generated content from article
export interface GeneratedFromArticleData {
  keywords: Array<{
    text: string
    matchType: 'BROAD' | 'PHRASE' | 'EXACT'
    relevance?: number
  }>
  headlines: string[]
  descriptions: string[]
  suggestedCampaignName: string
  extensions?: GeneratedExtensions
}

// ========================
// Wizard Step Data
// ========================

export interface GoogleAccountData {
  connectionId: string // ID da conexão OAuth
  customerId: string // ID da conta Google Ads (10 dígitos)
  customerName?: string
  currency: string
  timezone: string
  isManager?: boolean // Se é uma conta MCC (Manager)
  loginCustomerId?: string // ID da conta MCC pai (usado quando a conta é gerenciada por uma MCC)
}

export type GoogleCampaignStatus = 'ENABLED' | 'PAUSED'

export interface GoogleCampaignData {
  name: string
  networkType: GoogleNetworkType
  budget: number
  budgetType: 'daily' | 'total'
  biddingStrategy: GoogleBiddingStrategy
  targetCpa?: number
  targetRoas?: number
  maxCpc?: number
  locations: string[] // Country/City codes
  languages: string[]
  startDate?: string
  endDate?: string
  // Search specific
  searchPartners?: boolean
  displayNetwork?: boolean
  // Display specific
  targetingExpansion?: boolean
  // Campaign status on publish
  status?: GoogleCampaignStatus
}

export interface GoogleAdGroupData {
  name: string
  // Search specific
  keywords: GoogleKeyword[]
  negativeKeywords: NegativeKeyword[]
  // Display specific
  targetingType?: DisplayTargetingType
  audiences?: GoogleAudienceType[]
  topics?: string[]
  placements?: string[]
  demographics?: {
    ageRanges?: string[]
    genders?: string[]
    parentalStatus?: string[]
    householdIncome?: string[]
  }
  // Common
  defaultBid?: number
  ads: Array<ResponsiveSearchAd | ResponsiveDisplayAd>
}

export interface GoogleExtensionsData {
  sitelinks: Sitelink[]
  callouts: Callout[]
  structuredSnippets: StructuredSnippet[]
  callExtension?: {
    phoneNumber: string
    countryCode: string
  }
  locationExtension?: boolean
}

export interface GoogleAdsWizardState {
  // Meta
  templateName: string
  networkType: GoogleNetworkType
  currentStep: GoogleWizardStep
  completedSteps: GoogleWizardStep[]

  // Step Data
  account: GoogleAccountData
  campaign: GoogleCampaignData
  adGroups: GoogleAdGroupData[]
  extensions: GoogleExtensionsData

  // Actions
  setNetworkType: (type: GoogleNetworkType) => void
  setCurrentStep: (step: GoogleWizardStep) => void
  setTemplateName: (name: string) => void
  setAccountData: (data: Partial<GoogleAccountData>) => void
  setCampaignData: (data: Partial<GoogleCampaignData>) => void
  addAdGroup: () => void
  updateAdGroup: (index: number, data: Partial<GoogleAdGroupData>) => void
  removeAdGroup: (index: number) => void
  setExtensionsData: (data: Partial<GoogleExtensionsData>) => void
  markStepCompleted: (step: GoogleWizardStep) => void
  markStepIncomplete: (step: GoogleWizardStep) => void
  goToNextStep: () => void
  goToPreviousStep: () => void
  reset: () => void
}

// Wizard Steps - different for Search vs Display
export type GoogleWizardStep =
  // Common
  | 'account'
  | 'article_source' // NEW: Select article as content source
  | 'campaign'
  // Search specific
  | 'keywords'
  | 'search_ads'
  // Display specific
  | 'targeting'
  | 'display_ads'
  // Common
  | 'extensions'
  | 'review'

export const SEARCH_WIZARD_STEPS: GoogleWizardStep[] = [
  'account',
  'article_source', // NEW: Select article as content source
  'campaign',
  'keywords',
  'search_ads',
  'extensions',
  'review',
]

export const DISPLAY_WIZARD_STEPS: GoogleWizardStep[] = [
  'account',
  'article_source', // NEW: Select article as content source
  'campaign',
  'targeting',
  'display_ads',
  'extensions',
  'review',
]

export const STEP_LABELS: Record<GoogleWizardStep, string> = {
  account: 'Conta',
  article_source: 'Artigo',
  campaign: 'Campanha',
  keywords: 'Palavras-chave',
  search_ads: 'Anúncios',
  targeting: 'Segmentação',
  display_ads: 'Criativos',
  extensions: 'Extensões',
  review: 'Revisão',
}

// Credit costs for Google Ads
export const GOOGLE_ADS_CREDIT_COSTS = {
  CAMPAIGN_BASIC: 1,
  AD_GROUP_BASIC: 1,
  KEYWORD_RESEARCH: 2,
  AI_HEADLINE_GENERATION: 2,
  AI_DESCRIPTION_GENERATION: 2,
  AI_IMAGE_GENERATION: 5,
  CAMPAIGN_PUBLISH: 3,
} as const

// ========================
// Campaign Creation Modes
// ========================

export type CampaignCreationMode =
  | 'single'           // Single campaign (wizard)
  | 'bulk_location'    // Multiple campaigns by location (countries)
  | 'spreadsheet'      // Import from spreadsheet
  | 'duplicate'        // Duplicate existing campaign

export const CAMPAIGN_CREATION_MODES = [
  {
    value: 'single' as const,
    label: 'Criar Campanha',
    description: 'Crie uma ou várias campanhas ao mesmo tempo usando o assistente',
    icon: 'Plus',
    recommended: true,
  },
  {
    value: 'spreadsheet' as const,
    label: 'Importar Planilha',
    description: 'Importe campanhas em massa a partir de uma planilha CSV/Excel',
    icon: 'FileSpreadsheet',
    badge: 'Em breve',
    disabled: true,
  },
  {
    value: 'duplicate' as const,
    label: 'Duplicar Campanha',
    description: 'Duplique uma campanha existente e faça ajustes em lote',
    icon: 'Copy',
    badge: 'Em breve',
    disabled: true,
  },
] as const

// Bulk Location Config
export interface BulkLocationConfig {
  baseTemplate: {
    campaign: Partial<GoogleCampaignData>
    adGroups: Array<Partial<GoogleAdGroupData>>
    extensions: Partial<GoogleExtensionsData>
  }
  locations: Array<{
    code: string
    name: string
    customKeywords?: string[]
    customBudget?: number
  }>
  variations: {
    includeLocationInName: boolean
    includeLocationInKeywords: boolean
    includeLocationInAds: boolean
    keywordTemplate?: string // e.g., "{{keyword}} em {{location}}"
    headlineTemplate?: string // e.g., "{{headline}} - {{location}}"
  }
}

// Bulk Product Config
export interface BulkProductConfig {
  products: Array<{
    name: string
    description?: string
    url: string
    price?: number
    category?: string
  }>
  aiSettings: {
    generateKeywords: boolean
    generateHeadlines: boolean
    generateDescriptions: boolean
    keywordsPerProduct: number
    headlinesPerProduct: number
    descriptionsPerProduct: number
  }
  campaignDefaults: Partial<GoogleCampaignData>
}

// Spreadsheet Import Config
export interface SpreadsheetImportConfig {
  fileUrl?: string
  mapping: {
    campaignName: string
    budget: string
    keywords: string
    headlines: string
    descriptions: string
    finalUrl: string
    locations?: string
  }
  defaults: Partial<GoogleCampaignData>
}

// Duplicate Config
export interface DuplicateConfig {
  sourceTemplateId: string
  copies: number
  variations: {
    appendSuffix: boolean
    suffixTemplate?: string // e.g., " - Cópia {{n}}"
    modifyBudget?: {
      type: 'fixed' | 'percentage'
      value: number
    }
  }
}

// ========================
// Google Connection Types
// ========================

export interface GoogleConnection {
  id: string
  user_id: string
  customer_id: string
  customer_name: string | null
  login_customer_id: string | null
  currency_code: string
  timezone: string
  account_type: 'standard' | 'manager'
  is_active: boolean
  last_used_at: string | null
  error_message: string | null
  created_at: string
  updated_at: string
}

export interface GoogleCustomer {
  customer_id: string
  name: string
  currency: string
  timezone: string
  is_manager: boolean
}

// ========================
// Bulk Operation Types
// ========================

export type BulkOperationType = 'bulk_location' | 'bulk_product' | 'spreadsheet' | 'duplicate'

export type BulkOperationStatus =
  | 'pending'
  | 'processing'
  | 'completed'
  | 'failed'
  | 'cancelled'
  | 'partial'

export type BulkItemStatus =
  | 'pending'
  | 'processing'
  | 'completed'
  | 'failed'
  | 'skipped'

export interface BulkOperationJob {
  id: string
  user_id: string
  type: BulkOperationType
  status: BulkOperationStatus
  config: BulkLocationConfig | BulkProductConfig | SpreadsheetImportConfig | DuplicateConfig
  total_items: number
  completed_items: number
  failed_items: number
  estimated_credits: number
  consumed_credits: number
  error_log: BulkErrorLogEntry[]
  created_at: string
  started_at: string | null
  completed_at: string | null
}

export interface BulkErrorLogEntry {
  item_index: number
  template_id?: string
  error: string
  code: string
  timestamp?: string
}

export interface BulkOperationItem {
  id: string
  job_id: string
  template_id: string | null
  item_index: number
  item_name: string | null
  status: BulkItemStatus
  input_data: Record<string, unknown>
  google_campaign_id: string | null
  google_ad_group_id: string | null
  google_ad_id: string | null
  error_message: string | null
  error_code: string | null
  retry_count: number
  credits_cost: number
  created_at: string
  processed_at: string | null
}

// Progress tracking for SSE
export interface BulkJobProgress {
  jobId: string
  type: BulkOperationType
  status: BulkOperationStatus
  totalItems: number
  completedItems: number
  failedItems: number
  progressPercentage: number
  currentItemName?: string
  estimatedTimeRemaining?: number // in seconds
  errors?: BulkErrorLogEntry[]
}

// Preview types
export interface BulkLocationPreview {
  campaigns: Array<{
    name: string
    location: {
      code: string
      name: string
    }
    budget: number
    keywords: string[]
    headlines: string[]
    descriptions: string[]
  }>
  totalCampaigns: number
  estimatedCredits: number
}

export interface BulkProductPreview {
  campaigns: Array<{
    name: string
    product: {
      name: string
      url: string
      price?: number
    }
    generatedKeywords?: string[]
    generatedHeadlines?: string[]
    generatedDescriptions?: string[]
  }>
  totalCampaigns: number
  estimatedCredits: number
}

// Geo Targets for location search
export interface GoogleGeoTarget {
  id: number
  canonical_name: string
  name: string
  country_code: string
  target_type: 'Country' | 'Region' | 'City'
  parent_id: number | null
}

// ========================
// Bulk Credit Costs
// ========================

export const BULK_CREDIT_COSTS = {
  BULK_LOCATION_CAMPAIGN: 2,
  BULK_PRODUCT_CAMPAIGN: 3,
  SPREADSHEET_IMPORT_CAMPAIGN: 2,
  DUPLICATE_CAMPAIGN: 1,
} as const
