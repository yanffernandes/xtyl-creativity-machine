/**
 * API Contract: Detect Niche
 *
 * Endpoint: POST /meta/creatives/detect-niche
 * Feature: Andromeda Creative Diversity System
 * Version: 1.0.0
 *
 * This contract defines the API for detecting the niche of articles
 * to determine which creative concepts and templates to use.
 */

// ============================================
// Request DTOs
// ============================================

/**
 * Article context for niche detection
 */
export interface ArticleForDetectionDto {
  id: number
  title: string
  keyword: string
  excerpt?: string
  category?: string
}

/**
 * Request body for niche detection
 */
export interface DetectNicheRequestDto {
  /**
   * Articles to analyze for niche detection
   * @minItems 1
   * @maxItems 20
   */
  articles: ArticleForDetectionDto[]
}

// ============================================
// Response DTOs
// ============================================

/**
 * Keyword match found during detection
 */
export interface KeywordMatchDto {
  keyword: string
  niche: string
  confidence: number
  source: 'title' | 'keyword' | 'excerpt' | 'category'
}

/**
 * Detection result for a single article
 */
export interface ArticleNicheResultDto {
  articleId: number
  detectedNiche: string
  confidence: number // 0.00 to 1.00
  matchedKeywords: KeywordMatchDto[]
}

/**
 * Response from niche detection
 */
export interface DetectNicheResponseDto {
  /**
   * Overall detected niche for the batch
   */
  detectedNiche: 'generic' | 'financial' | 'jobs' | 'health' | 'ecommerce'

  /**
   * Overall confidence score
   */
  confidence: number // 0.00 to 1.00

  /**
   * Whether to apply specialized template
   */
  applySpecializedTemplate: boolean

  /**
   * Per-article detection results
   */
  articleResults: ArticleNicheResultDto[]

  /**
   * Keywords that triggered detection
   */
  triggerKeywords: string[]

  /**
   * Recommended generation settings
   */
  recommendations: {
    useMasterTemplate: boolean
    suggestedConcepts: string[] // Concept slugs
    suggestedVisualGroups?: string[] // Group codes (A-H)
  }
}

// ============================================
// Niche Detection Rules
// ============================================

/**
 * Niche detection keywords (used by backend)
 *
 * FINANCIAL NICHE (95% confidence threshold per SC-006):
 * - Primary: empréstimo, crédito, financiamento, dinheiro, bank, loan
 * - Secondary: cartão, conta, juros, parcela, aprovação
 * - Categories: finanças, banking, fintech
 *
 * JOBS NICHE:
 * - Primary: emprego, trabalho, vaga, curriculum, contratação
 * - Secondary: salário, carreira, profissional, home office
 * - Categories: empregos, carreiras, trabalho
 *
 * HEALTH NICHE:
 * - Primary: saúde, médico, hospital, tratamento, doença
 * - Secondary: bem-estar, fitness, nutrição, dieta
 * - Categories: saúde, medicina, wellness
 *
 * ECOMMERCE NICHE:
 * - Primary: comprar, vender, loja, produto, oferta
 * - Secondary: desconto, promoção, frete, entrega
 * - Categories: ecommerce, loja, shopping
 */

// ============================================
// Example Usage
// ============================================

/**
 * Example: Financial Niche Detection
 *
 * POST /meta/creatives/detect-niche
 * Authorization: Bearer <token>
 * Content-Type: application/json
 *
 * {
 *   "articles": [
 *     {
 *       "id": 1,
 *       "title": "Como conseguir empréstimo pessoal com as melhores taxas",
 *       "keyword": "empréstimo pessoal",
 *       "excerpt": "Guia completo para solicitar crédito pessoal online"
 *     },
 *     {
 *       "id": 2,
 *       "title": "Simulador de financiamento: descubra quanto você pode pegar",
 *       "keyword": "simulador financiamento",
 *       "excerpt": "Use nosso simulador para calcular suas parcelas"
 *     }
 *   ]
 * }
 *
 * Response:
 * {
 *   "detectedNiche": "financial",
 *   "confidence": 0.97,
 *   "applySpecializedTemplate": true,
 *   "articleResults": [
 *     {
 *       "articleId": 1,
 *       "detectedNiche": "financial",
 *       "confidence": 0.98,
 *       "matchedKeywords": [
 *         { "keyword": "empréstimo", "niche": "financial", "confidence": 0.99, "source": "title" },
 *         { "keyword": "empréstimo pessoal", "niche": "financial", "confidence": 0.99, "source": "keyword" },
 *         { "keyword": "crédito", "niche": "financial", "confidence": 0.95, "source": "excerpt" }
 *       ]
 *     },
 *     {
 *       "articleId": 2,
 *       "detectedNiche": "financial",
 *       "confidence": 0.96,
 *       "matchedKeywords": [
 *         { "keyword": "simulador", "niche": "financial", "confidence": 0.85, "source": "title" },
 *         { "keyword": "financiamento", "niche": "financial", "confidence": 0.99, "source": "title" }
 *       ]
 *     }
 *   ],
 *   "triggerKeywords": ["empréstimo", "financiamento", "crédito", "simulador"],
 *   "recommendations": {
 *     "useMasterTemplate": true,
 *     "suggestedConcepts": ["simulator-ui", "testimonial", "comparison", "question-hook"],
 *     "suggestedVisualGroups": ["A", "B", "F"]
 *   }
 * }
 */

/**
 * Example: Generic Niche Detection
 *
 * POST /meta/creatives/detect-niche
 *
 * {
 *   "articles": [
 *     {
 *       "id": 1,
 *       "title": "Melhores práticas para SEO em 2026",
 *       "keyword": "SEO 2026"
 *     }
 *   ]
 * }
 *
 * Response:
 * {
 *   "detectedNiche": "generic",
 *   "confidence": 0.65,
 *   "applySpecializedTemplate": false,
 *   "articleResults": [
 *     {
 *       "articleId": 1,
 *       "detectedNiche": "generic",
 *       "confidence": 0.65,
 *       "matchedKeywords": []
 *     }
 *   ],
 *   "triggerKeywords": [],
 *   "recommendations": {
 *     "useMasterTemplate": false,
 *     "suggestedConcepts": ["typography", "question-hook", "comparison", "native-ugc"]
 *   }
 * }
 */
