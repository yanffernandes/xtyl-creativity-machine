/**
 * API Contract: Get Creative Concepts
 *
 * Endpoint: GET /meta/creatives/concepts
 * Feature: Andromeda Creative Diversity System
 * Version: 1.0.0
 *
 * This contract defines the API for retrieving available creative concepts
 * for the preset mode selection UI.
 */

// ============================================
// Request (Query Parameters)
// ============================================

/**
 * Query parameters for filtering concepts
 *
 * GET /meta/creatives/concepts?niche=generic&category=universal
 */
export interface GetConceptsQueryDto {
  /**
   * Filter by primary niche
   * @default 'generic'
   */
  niche?: 'generic' | 'financial' | 'jobs'

  /**
   * Filter by category
   */
  category?: 'universal' | 'narrativa' | 'prova_social' | 'produto' | 'curiosidade' | 'estilo_visual'

  /**
   * Include inactive concepts (admin only)
   * @default false
   */
  includeInactive?: boolean
}

// ============================================
// Response DTOs
// ============================================

/**
 * A creative concept
 */
export interface ConceptDto {
  id: string
  slug: string
  name: string
  description: string
  icon: string
  category: string
  niche: string
  worksForNiches: string[]
  exampleImages: string[]
  sortOrder: number
}

/**
 * A visual group (for financial niche)
 */
export interface VisualGroupDto {
  id: string
  code: string
  name: string
  description: string
  variationsCount: number
  niche: string
}

/**
 * Response with concepts organized by category
 */
export interface GetConceptsResponseDto {
  /**
   * Universal concepts (8 total)
   * Always included regardless of niche filter
   */
  universal: ConceptDto[]

  /**
   * Niche-specific concepts (28 for financial)
   * Organized by category
   */
  nicheSpecific?: {
    narrativa?: ConceptDto[]
    provaSocial?: ConceptDto[]
    produto?: ConceptDto[]
    curiosidade?: ConceptDto[]
    estiloVisual?: ConceptDto[]
  }

  /**
   * Visual groups (A-H for financial)
   * Only included for financial niche
   */
  visualGroups?: VisualGroupDto[]

  /**
   * Detected/requested niche
   */
  niche: string

  /**
   * Total concepts available
   */
  totalConcepts: number
}

// ============================================
// Example Usage
// ============================================

/**
 * Example: Get Generic Niche Concepts
 *
 * GET /meta/creatives/concepts?niche=generic
 * Authorization: Bearer <token>
 *
 * Response:
 * {
 *   "universal": [
 *     {
 *       "id": "uuid-1",
 *       "slug": "simulator-ui",
 *       "name": "Simulador / Calculadora UI",
 *       "description": "Interface de app com sliders, botões, campos",
 *       "icon": "📱",
 *       "category": "universal",
 *       "niche": "generic",
 *       "worksForNiches": ["generic", "financial", "jobs", "health", "ecommerce"],
 *       "exampleImages": ["https://...example1.png", "https://...example2.png"],
 *       "sortOrder": 1
 *     },
 *     // ... 7 more universal concepts
 *   ],
 *   "niche": "generic",
 *   "totalConcepts": 8
 * }
 */

/**
 * Example: Get Financial Niche Concepts
 *
 * GET /meta/creatives/concepts?niche=financial
 * Authorization: Bearer <token>
 *
 * Response:
 * {
 *   "universal": [...], // 8 universal concepts
 *   "nicheSpecific": {
 *     "narrativa": [
 *       {
 *         "id": "uuid-financial-1",
 *         "slug": "problem-solution",
 *         "name": "Problema → Solução",
 *         "description": "Visual story showing problem resolved by product",
 *         "icon": "📖",
 *         "category": "narrativa",
 *         "niche": "financial",
 *         "worksForNiches": ["financial"],
 *         "exampleImages": [],
 *         "sortOrder": 1
 *       },
 *       // ... 3 more narrativa concepts + "random" option
 *     ],
 *     "provaSocial": [...], // 4 + random
 *     "produto": [...],     // 5 + random
 *     "curiosidade": [...], // 6 + random
 *     "estiloVisual": [...]  // 9 + random
 *   },
 *   "visualGroups": [
 *     {
 *       "id": "uuid-group-a",
 *       "code": "A",
 *       "name": "UI / Fintech",
 *       "description": "Clean fintech app interfaces",
 *       "variationsCount": 10,
 *       "niche": "financial"
 *     },
 *     // ... 7 more visual groups (B-H)
 *   ],
 *   "niche": "financial",
 *   "totalConcepts": 36
 * }
 */

// ============================================
// Supabase Direct Query (Frontend)
// ============================================

/**
 * For frontend direct access, concepts can be fetched via Supabase RLS:
 *
 * const { data: concepts } = await supabase
 *   .from('creative_concepts')
 *   .select('*')
 *   .eq('is_active', true)
 *   .in('niche', ['generic', detectedNiche])
 *   .order('sort_order')
 *
 * const { data: visualGroups } = await supabase
 *   .from('visual_groups')
 *   .select('*')
 *   .eq('is_active', true)
 *   .eq('niche', detectedNiche)
 *   .order('sort_order')
 */
