/**
 * API Contract: Generate Creatives
 *
 * Endpoint: POST /meta/creatives/generate
 * Feature: Andromeda Creative Diversity System
 * Version: 1.0.0
 *
 * This contract defines the API for generating diverse creatives
 * for Meta Ads campaigns with support for preset/free modes,
 * concept-based prompts, and model rotation.
 */

// ============================================
// Request DTOs
// ============================================

/**
 * Article context for creative generation
 */
export interface ArticleContextDto {
  id: number
  title: string
  keyword: string
  excerpt?: string
}

/**
 * Concept selection for preset mode
 */
export interface ConceptSelectionDto {
  conceptId: string
  quantity: number
}

/**
 * Targeting info for localization
 */
export interface TargetingInfoDto {
  countries: string[]
  languages: Array<{ key: string; name: string }>
}

/**
 * Request body for generating creatives
 */
export interface GenerateCreativesRequestDto {
  /**
   * Articles to generate creatives for
   * @minItems 1
   * @maxItems 20
   */
  articles: ArticleContextDto[]

  /**
   * Total number of creatives to generate
   * @minimum 1
   * @maximum 50
   */
  count: number

  /**
   * Generation mode: 'preset' (user selects concepts) or 'free' (AI decides)
   */
  mode: 'preset' | 'free'

  /**
   * Concept selections (required for preset mode)
   * Sum of quantities must equal count
   */
  conceptSelections?: ConceptSelectionDto[]

  /**
   * Image format
   */
  format: '1:1' | '9:16' | '16:9'

  /**
   * User directions (priority 1 in prompt composition)
   * @maxLength 500
   */
  userDirections?: string

  /**
   * Targeting info for localization (currency, language)
   */
  targeting?: TargetingInfoDto

  /**
   * Workspace ID for multi-tenant support
   */
  workspaceId?: string

  /**
   * Optional: existing session ID to continue
   */
  sessionId?: string
}

// ============================================
// Response DTOs
// ============================================

/**
 * A single generated creative
 */
export interface GeneratedCreativeDto {
  id: string
  articleId: number
  imageUrl: string
  storagePath: string
  modelUsed: string
  conceptUsed: {
    id: string
    slug: string
    name: string
  }
  visualGroup?: {
    code: string
    name: string
    variationIndex: number
  }
  backgroundStyle: string
  promptUsed: string
  format: '1:1' | '9:16' | '16:9'
  status: 'completed' | 'failed'
  error?: string
  adsetIndex: number
  libraryId: string
  createdAt: string
}

/**
 * Diversity metrics for the session
 */
export interface DiversityMetricsDto {
  uniqueConcepts: number
  uniqueBackgrounds: number
  uniqueModels: number
  totalGenerated: number
  diversityScore: number // 0.00 to 1.00
  meetsThreshold: boolean // Score >= 0.70
}

/**
 * Response from creative generation
 */
export interface GenerateCreativesResponseDto {
  /**
   * Generated creatives
   */
  creatives: GeneratedCreativeDto[]

  /**
   * Session ID for tracking
   */
  sessionId: string

  /**
   * Diversity metrics
   */
  diversity: DiversityMetricsDto

  /**
   * Credits consumed
   */
  creditsConsumed: number

  /**
   * Generation statistics
   */
  stats: {
    totalRequested: number
    totalGenerated: number
    totalFailed: number
    averageGenerationTime: number // milliseconds
  }

  /**
   * Detected niche (if auto-detected)
   */
  detectedNiche?: string
}

// ============================================
// Error Responses
// ============================================

/**
 * Validation error response
 */
export interface ValidationErrorDto {
  statusCode: 400
  message: string
  errors: Array<{
    field: string
    message: string
  }>
}

/**
 * Insufficient credits error
 */
export interface InsufficientCreditsErrorDto {
  statusCode: 402
  message: 'Créditos insuficientes'
  required: number
  available: number
}

/**
 * Generation error response
 */
export interface GenerationErrorDto {
  statusCode: 500
  message: string
  failedArticles: number[]
}

// ============================================
// Example Usage
// ============================================

/**
 * Example: Preset Mode Request
 *
 * POST /meta/creatives/generate
 * Authorization: Bearer <token>
 * Content-Type: application/json
 *
 * {
 *   "articles": [
 *     { "id": 1, "title": "Como conseguir empréstimo", "keyword": "empréstimo pessoal" }
 *   ],
 *   "count": 5,
 *   "mode": "preset",
 *   "conceptSelections": [
 *     { "conceptId": "uuid-simulator", "quantity": 2 },
 *     { "conceptId": "uuid-testimonial", "quantity": 2 },
 *     { "conceptId": "uuid-before-after", "quantity": 1 }
 *   ],
 *   "format": "1:1",
 *   "userDirections": "Usar tons de azul escuro, evitar vermelho",
 *   "targeting": {
 *     "countries": ["BR"],
 *     "languages": [{ "key": "pt", "name": "Português" }]
 *   },
 *   "workspaceId": "workspace-uuid"
 * }
 */

/**
 * Example: Free Mode Request (AI decides)
 *
 * POST /meta/creatives/generate
 * Authorization: Bearer <token>
 * Content-Type: application/json
 *
 * {
 *   "articles": [
 *     { "id": 1, "title": "Como conseguir empréstimo", "keyword": "empréstimo pessoal" }
 *   ],
 *   "count": 5,
 *   "mode": "free",
 *   "format": "1:1",
 *   "userDirections": "Pessoas sorrindo, estilo moderno",
 *   "targeting": {
 *     "countries": ["BR"],
 *     "languages": [{ "key": "pt", "name": "Português" }]
 *   }
 * }
 */

/**
 * Example: Success Response
 *
 * HTTP/1.1 200 OK
 * Content-Type: application/json
 *
 * {
 *   "creatives": [
 *     {
 *       "id": "creative-uuid-1",
 *       "articleId": 1,
 *       "imageUrl": "https://storage.../creative_1.png",
 *       "storagePath": "user-id/creative_1.png",
 *       "modelUsed": "openrouter/google/gemini-3.0-pro",
 *       "conceptUsed": {
 *         "id": "concept-uuid",
 *         "slug": "simulator-ui",
 *         "name": "Simulador / Calculadora UI"
 *       },
 *       "visualGroup": {
 *         "code": "A",
 *         "name": "UI / Fintech",
 *         "variationIndex": 3
 *       },
 *       "backgroundStyle": "gradient-dark",
 *       "promptUsed": "...",
 *       "format": "1:1",
 *       "status": "completed",
 *       "adsetIndex": 0,
 *       "libraryId": "library-uuid-1",
 *       "createdAt": "2026-02-03T10:00:00Z"
 *     }
 *   ],
 *   "sessionId": "session-uuid",
 *   "diversity": {
 *     "uniqueConcepts": 4,
 *     "uniqueBackgrounds": 4,
 *     "uniqueModels": 2,
 *     "totalGenerated": 5,
 *     "diversityScore": 0.85,
 *     "meetsThreshold": true
 *   },
 *   "creditsConsumed": 25,
 *   "stats": {
 *     "totalRequested": 5,
 *     "totalGenerated": 5,
 *     "totalFailed": 0,
 *     "averageGenerationTime": 18500
 *   },
 *   "detectedNiche": "financial"
 * }
 */
