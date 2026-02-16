// ========================
// Creative Types for AI Image Generation
// ========================

/**
 * Available AI image generation models
 */
export type ImageModel = 'dall-e-3' | 'imagen-3'

/**
 * Image aspect ratios supported by Meta Ads
 */
export type ImageFormat = '1:1' | '9:16' | '16:9'

/**
 * Visual styles for AI image generation
 */
export type ImageStyle =
  | 'photorealistic'
  | 'illustration'
  | 'minimalist'
  | 'cinematic'
  | 'watercolor'

export const IMAGE_STYLES: Array<{ value: ImageStyle; label: string; description: string }> = [
  {
    value: 'photorealistic',
    label: 'Fotorrealista',
    description: 'Estilo de fotografia profissional ultra-realista',
  },
  {
    value: 'illustration',
    label: 'Ilustração',
    description: 'Ilustração digital moderna com linhas limpas',
  },
  {
    value: 'minimalist',
    label: 'Minimalista',
    description: 'Design simples e limpo focado em elementos essenciais',
  },
  {
    value: 'cinematic',
    label: 'Cinematográfico',
    description: 'Estilo de pôster de cinema com iluminação dramática',
  },
  {
    value: 'watercolor',
    label: 'Aquarela',
    description: 'Pintura artística com tons suaves de aquarela',
  },
]

/**
 * Status of a generated creative
 */
export type CreativeStatus =
  | 'pending'
  | 'generating'
  | 'completed'
  | 'failed'
  | 'approved'
  | 'rejected'

/**
 * Status of a creative linked to a campaign
 */
export type CampaignCreativeStatus = 'pending' | 'approved' | 'published'

/**
 * Supported call-to-action types for Meta Ads
 */
export type MetaCreativeCTA =
  | 'LEARN_MORE'
  | 'SHOP_NOW'
  | 'SIGN_UP'
  | 'CONTACT_US'
  | 'GET_OFFER'
  | 'DOWNLOAD'

export const META_CREATIVE_CTA_OPTIONS: Array<{ value: MetaCreativeCTA; label: string }> = [
  { value: 'LEARN_MORE', label: 'Saiba Mais' },
  { value: 'SHOP_NOW', label: 'Comprar Agora' },
  { value: 'SIGN_UP', label: 'Cadastre-se' },
  { value: 'CONTACT_US', label: 'Fale Conosco' },
  { value: 'GET_OFFER', label: 'Obter Oferta' },
  { value: 'DOWNLOAD', label: 'Baixar' },
]

// ========================
// Generated Image Interfaces
// ========================

/**
 * A generated image from AI
 */
export interface GeneratedImage {
  id: string
  articleId: number
  imageUrl: string
  storagePath: string
  model: string
  style: ImageStyle
  promptUsed: string
  format: ImageFormat
  status: CreativeStatus
  error?: string
  adsetIndex: number
  libraryId?: string // If saved to library
  createdAt?: string
}

/**
 * Article context for image generation
 */
export interface ArticleContext {
  id: number
  title: string
  keyword: string
  excerpt?: string
  language?: string // Source language code (e.g., 'pt', 'en')
  country?: string // Country code (e.g., 'BR', 'US') for localization
}

/**
 * Configuration for image generation
 */
export interface ImageGenerationConfig {
  model: ImageModel
  format: ImageFormat
  userDirections?: string
}

// ========================
// Ad Copy Interfaces
// ========================

/**
 * Generated ad copy for a creative
 */
export interface GeneratedAdCopy {
  imageId: string
  primaryText: string
  headline: string
  description: string
  cta: MetaCreativeCTA
  status: 'pending' | 'approved'
  /** Conversation configurator for message ads (MESSENGER/WHATSAPP/INSTAGRAM_DIRECT) */
  greetingConfig?: GreetingConfig
}

// ========================
// Greeting / Ice Breakers (Message Ads)
// ========================

/** Mode for applying ad copy or greeting across creatives */
export type AdCopyApplyMode = 'shared' | 'individual'

/** Single ice breaker entry */
export interface IceBreakerEntry {
  title: string
  response: string
}

/** Conversation configurator config (greeting + ice breakers) */
export interface GreetingConfig {
  greeting: string
  iceBreakers: IceBreakerEntry[]
  status: 'pending' | 'approved'
}

// ========================
// Library Interfaces
// ========================

/**
 * Concept info from Andromeda system
 */
export interface ConceptInfo {
  id: string
  slug: string
  name: string
}

/**
 * A creative stored in the user's library
 * T043: model field now accepts full model identifiers like "openrouter/google/gemini-3-flash-001"
 */
export interface LibraryCreative {
  id: string
  imageUrl: string
  articleId?: number
  articleTitle?: string
  model: string // Full model identifier: provider/model or legacy short names
  style?: ImageStyle
  format: ImageFormat
  promptUsed?: string
  createdAt: string
  niche?: string
  language?: string
  // Andromeda concept tracking
  conceptId?: string
  conceptInfo?: ConceptInfo
}

/**
 * Filter options for creative library dropdowns
 */
export interface LibraryFilterOptions {
  articles: Array<{ id: number; title: string }>
  niches: string[]
  languages: string[]
  models: string[]
}

// ========================
// API Request/Response Types
// ========================

/**
 * Request to generate images
 */
export interface GenerateImagesRequest {
  articles: ArticleContext[]
  count: number
  model: ImageModel
  format: ImageFormat
  userDirections?: string
  workspaceId?: string
}

/**
 * Response from image generation
 */
export interface GenerateImagesResponse {
  images: GeneratedImage[]
  creditsConsumed: number
  totalGenerated: number
  totalFailed: number
}

/**
 * Request to regenerate a single image
 *
 * Two modes:
 * 1. Reuse original (originalPrompt + originalModel provided) - same prompt, same model
 * 2. Generate new (userDirections provided or empty) - new prompt based on article
 */
export interface RegenerateImageRequest {
  articleId: number
  adsetIndex: number
  model: ImageModel
  format: ImageFormat
  userDirections?: string
  workspaceId?: string
  /** Original prompt to reuse (for "regenerate same" option) */
  originalPrompt?: string
  /** Original model used (provider/model format) */
  originalModel?: string
}

/**
 * Request to generate ad copy for an image
 */
export interface GenerateAdCopyRequest {
  libraryId: string
  articleId: number
}

/**
 * Response from ad copy generation
 */
export interface GenerateAdCopyResponse {
  primaryText: string
  headline: string
  description: string
  suggestedCta: MetaCreativeCTA
  creditsConsumed: number
}

/**
 * Credits preview request
 */
export interface CreditsPreviewRequest {
  imageCount: number
  generateAdCopy?: boolean
  workspaceId?: string
}

/**
 * Credits preview response
 */
export interface CreditsPreviewResponse {
  imageCredits: number
  textCredits: number
  totalCredits: number
  userBalance: number
  hasSufficientCredits: boolean
}

/**
 * Library query parameters
 */
export interface LibraryQueryParams {
  page?: number
  limit?: number
  workspaceId?: string
  articleId?: number
  model?: string
  style?: ImageStyle
  format?: ImageFormat
  niche?: string
  language?: string
}

/**
 * Paginated library response
 */
export interface LibraryResponse {
  data: LibraryCreative[]
  pagination: {
    page: number
    limit: number
    total: number
    totalPages: number
  }
}

// ========================
// Credit Costs
// ========================

export const CREATIVE_CREDIT_COSTS = {
  AI_IMAGE: 5, // Per AI-generated image
  AD_COPY: 2, // Per text set
  LIBRARY_REUSE: 0, // Free to reuse from library
} as const

// ========================
// Andromeda Creative Diversity Types
// ========================

/**
 * Generation mode for creative diversity
 * - preset: User selects concepts and quantities
 * - free: AI decides concepts automatically
 */
export type GenerationMode = 'preset' | 'free'

/**
 * Supported niches for specialized templates
 */
export type CreativeNiche = 'generic' | 'financial' | 'jobs' | 'health' | 'ecommerce'

/**
 * Concept category for financial niche
 */
export type FinancialConceptCategory =
  | 'universal'
  | 'narrativa'
  | 'prova_social'
  | 'produto'
  | 'curiosidade'
  | 'estilo_visual'

/**
 * A creative concept from the database
 */
export interface CreativeConcept {
  id: string
  slug: string
  name: string
  description: string | null
  promptTemplate: string
  promptTemplateJson?: Record<string, unknown>
  icon: string | null
  category: string
  niche: string
  worksForNiches: string[]
  exampleImages: string[]
  sortOrder: number
  isActive: boolean
}

/**
 * Visual group variation for financial niche
 */
export interface VisualGroupVariation {
  index: number
  name: string
  prompt: string
}

/**
 * Visual group for financial niche (A-H)
 */
export interface VisualGroup {
  id: string
  code: string
  name: string
  description: string | null
  variations: VisualGroupVariation[]
  niche: string
  sortOrder: number
  isActive: boolean
}

/**
 * Background style from the database
 */
export interface CreativeBackground {
  id: string
  slug: string
  name: string
  description: string | null
  cssValue: string
  backgroundType: 'solid' | 'gradient' | 'pattern'
  niche: string
  worksForNiches: string[]
  category: string | null
  sortOrder: number
  isActive: boolean
}

/**
 * Niche template with Andromeda compliance rules
 */
export interface NicheTemplate {
  id: string
  niche: string
  name: string
  description: string | null
  template: string
  prohibitedWords: string[]
  requiredElements: string[]
  formatRequirements?: Record<string, unknown>
  localizationRules?: Record<string, {
    currency: string
    currencyPosition: 'before' | 'after'
    values: string[]
    language: string
  }>
  isActive: boolean
}

/**
 * Concept selection for preset mode
 */
export interface ConceptSelection {
  conceptId: string
  conceptSlug: string
  quantity: number
}

/**
 * Diversity metrics for a generation session
 */
export interface DiversityMetrics {
  uniqueConcepts: number
  uniqueBackgrounds: number
  uniqueModels: number
  totalGenerated: number
  diversityScore: number // 0 to 100
  meetsThreshold: boolean // Score >= 70
}

/**
 * Generation session for diversity tracking
 */
export interface GenerationSession {
  id: string
  userId: string
  workspaceId: string | null
  wizardSessionId: string | null
  generationMode: GenerationMode
  detectedNiche: string | null
  userDirections: string | null
  conceptSelections: ConceptSelection[]
  usedConcepts: string[]
  usedBackgrounds: string[]
  usedModels: string[]
  imagesGenerated: number
  imagesFailed: number
  diversityScore: number | null
  startedAt: string
  completedAt: string | null
}

/**
 * Extended generated image with concept tracking
 */
export interface GeneratedImageWithConcept extends GeneratedImage {
  conceptUsed?: {
    id: string
    slug: string
    name: string
  }
  visualGroup?: {
    code: string
    name: string
    variationIndex: number
  }
  backgroundStyle?: string
}

/**
 * Extended image generation config with diversity options
 */
export interface ImageGenerationConfigWithDiversity extends ImageGenerationConfig {
  generationMode: GenerationMode
  conceptSelections: ConceptSelection[]
}

/**
 * Response from diverse creative generation
 */
export interface GenerateCreativesResponse {
  creatives: GeneratedImageWithConcept[]
  sessionId: string
  diversity: DiversityMetrics
  creditsConsumed: number
  stats: {
    totalRequested: number
    totalGenerated: number
    totalFailed: number
    averageGenerationTime: number
  }
  detectedNiche?: string
}

/**
 * Concepts response organized by category
 */
export interface ConceptsResponse {
  universal: CreativeConcept[]
  nicheSpecific?: {
    narrativa?: CreativeConcept[]
    provaSocial?: CreativeConcept[]
    produto?: CreativeConcept[]
    curiosidade?: CreativeConcept[]
    estiloVisual?: CreativeConcept[]
  }
  visualGroups?: VisualGroup[]
  niche: string
  totalConcepts: number
}

/**
 * Niche detection result
 */
export interface NicheDetectionResult {
  detectedNiche: CreativeNiche
  confidence: number
  applySpecializedTemplate: boolean
  triggerKeywords: string[]
  recommendations: {
    useMasterTemplate: boolean
    suggestedConcepts: string[]
    suggestedVisualGroups?: string[]
  }
}

// ========================
// Andromeda API Request/Response Types
// ========================

/**
 * Targeting info for localization
 */
export interface TargetingInfo {
  countries: string[]
  languages?: Array<{ key: string; name: string }>
}

/**
 * Request for concept-based creative generation
 */
export interface GenerateCreativesRequest {
  articles: ArticleContext[]
  count: number
  mode: GenerationMode
  conceptSelections?: ConceptSelection[]
  format: ImageFormat
  userDirections?: string
  targeting?: TargetingInfo
  workspaceId?: string
  sessionId?: string
}

/**
 * Request for niche detection
 */
export interface DetectNicheRequest {
  articles: ArticleContext[]
}

/**
 * Response from niche detection
 */
export interface DetectNicheResponse {
  detectedNiche: CreativeNiche
  confidence: number
  applySpecializedTemplate: boolean
  articleResults: Array<{
    articleId: number
    detectedNiche: string
    confidence: number
    matchedKeywords: Array<{
      keyword: string
      niche: string
      confidence: number
      source: 'title' | 'keyword' | 'excerpt' | 'category'
    }>
  }>
  triggerKeywords: string[]
  recommendations: {
    useMasterTemplate: boolean
    suggestedConcepts: string[]
    suggestedVisualGroups?: string[]
  }
}

// ========================
// SSE Streaming Types
// ========================

/**
 * Status of an individual image slot during streaming generation
 */
export type CreativeSlotStatus = 'queued' | 'generating' | 'completed' | 'failed' | 'retrying'

/**
 * Individual creative slot in a streaming session
 */
export interface CreativeSlot {
  imageId: string
  index: number
  status: CreativeSlotStatus
  articleId: number
  conceptName?: string
  conceptSlug?: string
  // Populated when generating
  modelUsed?: string
  // Populated when completed
  imageUrl?: string
  storagePath?: string
  backgroundStyle?: string
  promptUsed?: string
  libraryId?: string
  conceptUsed?: {
    id: string
    slug: string
    name: string
  }
  // Error info
  error?: string
  canRetry?: boolean
  isPending?: boolean
  pendingId?: string
  // Retry tracking
  retryAttempt?: number
  maxRetryAttempts?: number
}

/**
 * Request to initialize streaming generation session
 */
export interface InitCreativeGenerationRequest {
  articles: Array<{
    id: number
    title: string
    keyword: string
    excerpt?: string
    language?: string // Source language of the article (e.g., 'english', 'portugues', 'pt', 'en')
    country?: string // Country code (ISO 3166-1 alpha-2) for localization (e.g., 'BR', 'US', 'SA')
  }>
  count: number
  mode: GenerationMode
  conceptSelections?: ConceptSelection[]
  format: ImageFormat
  userDirections?: string
  targeting?: TargetingInfo
  workspaceId?: string
}

/**
 * Response from streaming generation init endpoint
 */
export interface InitCreativeGenerationResponse {
  sessionId: string
  totalImages: number
  estimatedTimeSeconds: number
  images: CreativeSlot[]
}

/**
 * SSE Event types union
 */
export type CreativeStreamEvent =
  | { type: 'sync'; sessionId: string; slots: CreativeSlot[] }
  | { type: 'started'; sessionId: string; totalImages: number }
  | { type: 'queued'; imageId: string; index: number; articleId: number; conceptName?: string; conceptSlug?: string }
  | { type: 'generating'; imageId: string; index: number; model: string }
  | {
      type: 'completed'
      imageId: string
      index: number
      imageUrl: string
      storagePath: string
      modelUsed: string
      conceptUsed?: { id: string; slug: string; name: string }
      backgroundStyle?: string
      promptUsed: string
      libraryId: string
    }
  | { type: 'failed'; imageId: string; index: number; error: string; canRetry: boolean; isPending: boolean; pendingId?: string }
  | { type: 'retrying'; imageId: string; index: number; attempt: number; maxAttempts: number }
  | {
      type: 'done'
      totalGenerated: number
      totalFailed: number
      totalPending: number
      creditsConsumed: number
      diversity?: {
        uniqueConcepts: number
        uniqueBackgrounds: number
        uniqueModels: number
        diversityScore: number
      }
    }
