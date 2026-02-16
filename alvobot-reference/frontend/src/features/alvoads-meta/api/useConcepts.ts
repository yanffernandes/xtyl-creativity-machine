/**
 * useConcepts - Hook for fetching creative concepts from Supabase
 * T018: Created for Andromeda Creative Diversity System
 */

import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/shared/utils/supabase'
import type {
  CreativeConcept,
  VisualGroup,
  CreativeBackground,
  ConceptsResponse,
  CreativeNiche,
} from '../types/creative'

// ============================================
// Query Keys
// ============================================

export const conceptsQueryKeys = {
  all: ['concepts'] as const,
  byNiche: (niche: string) => ['concepts', 'niche', niche] as const,
  universal: () => ['concepts', 'universal'] as const,
  visualGroups: (niche: string) => ['concepts', 'visual-groups', niche] as const,
  backgrounds: (niche: string) => ['concepts', 'backgrounds', niche] as const,
}

// ============================================
// Fetch Functions
// ============================================

/**
 * Fetch all active concepts for a niche
 */
async function fetchConceptsByNiche(niche: string): Promise<CreativeConcept[]> {
  const { data, error } = await supabase
    .from('creative_concepts')
    .select('*')
    .eq('is_active', true)
    .contains('works_for_niches', [niche])
    .order('sort_order')

  if (error) {
    throw new Error(`Failed to fetch concepts: ${error.message}`)
  }

  // Transform snake_case to camelCase
  return (data || []).map(transformConcept)
}

/**
 * Fetch universal concepts (work for all niches)
 */
async function fetchUniversalConcepts(): Promise<CreativeConcept[]> {
  const { data, error } = await supabase
    .from('creative_concepts')
    .select('*')
    .eq('is_active', true)
    .eq('category', 'universal')
    .order('sort_order')

  if (error) {
    throw new Error(`Failed to fetch universal concepts: ${error.message}`)
  }

  return (data || []).map(transformConcept)
}

/**
 * Fetch visual groups for a niche
 */
async function fetchVisualGroups(niche: string): Promise<VisualGroup[]> {
  const { data, error } = await supabase
    .from('visual_groups')
    .select('*')
    .eq('is_active', true)
    .eq('niche', niche)
    .order('sort_order')

  if (error) {
    throw new Error(`Failed to fetch visual groups: ${error.message}`)
  }

  return (data || []).map(transformVisualGroup)
}

/**
 * Fetch backgrounds for a niche
 */
async function fetchBackgrounds(niche: string): Promise<CreativeBackground[]> {
  const { data, error } = await supabase
    .from('creative_backgrounds')
    .select('*')
    .eq('is_active', true)
    .contains('works_for_niches', [niche])
    .order('sort_order')

  if (error) {
    throw new Error(`Failed to fetch backgrounds: ${error.message}`)
  }

  return (data || []).map(transformBackground)
}

/**
 * Fetch all concepts organized by category for a niche
 */
async function fetchConceptsResponse(niche: CreativeNiche): Promise<ConceptsResponse> {
  // Fetch universal concepts
  const universal = await fetchUniversalConcepts()

  // Fetch niche-specific concepts
  const allConcepts = await fetchConceptsByNiche(niche)

  // Filter out universal concepts from niche-specific
  const nicheSpecificConcepts = allConcepts.filter(
    (c) => c.category !== 'universal'
  )

  // Organize by category
  const nicheSpecific = nicheSpecificConcepts.length > 0
    ? {
        narrativa: nicheSpecificConcepts.filter((c) => c.category === 'narrativa'),
        provaSocial: nicheSpecificConcepts.filter((c) => c.category === 'prova_social'),
        produto: nicheSpecificConcepts.filter((c) => c.category === 'produto'),
        curiosidade: nicheSpecificConcepts.filter((c) => c.category === 'curiosidade'),
        estiloVisual: nicheSpecificConcepts.filter((c) => c.category === 'estilo_visual'),
      }
    : undefined

  // Fetch visual groups for financial niche
  let visualGroups: VisualGroup[] | undefined
  if (niche === 'financial') {
    visualGroups = await fetchVisualGroups(niche)
  }

  return {
    universal,
    nicheSpecific,
    visualGroups,
    niche,
    totalConcepts: universal.length + nicheSpecificConcepts.length,
  }
}

// ============================================
// Transform Functions (snake_case -> camelCase)
// ============================================

function transformConcept(raw: Record<string, unknown>): CreativeConcept {
  return {
    id: raw.id as string,
    slug: raw.slug as string,
    name: raw.name as string,
    description: raw.description as string | null,
    promptTemplate: raw.prompt_template as string,
    promptTemplateJson: raw.prompt_template_json as Record<string, unknown> | undefined,
    icon: raw.icon as string | null,
    category: raw.category as string,
    niche: raw.niche as string,
    worksForNiches: raw.works_for_niches as string[],
    exampleImages: raw.example_images as string[],
    sortOrder: raw.sort_order as number,
    isActive: raw.is_active as boolean,
  }
}

function transformVisualGroup(raw: Record<string, unknown>): VisualGroup {
  return {
    id: raw.id as string,
    code: raw.code as string,
    name: raw.name as string,
    description: raw.description as string | null,
    variations: raw.variations as VisualGroup['variations'],
    niche: raw.niche as string,
    sortOrder: raw.sort_order as number,
    isActive: raw.is_active as boolean,
  }
}

function transformBackground(raw: Record<string, unknown>): CreativeBackground {
  return {
    id: raw.id as string,
    slug: raw.slug as string,
    name: raw.name as string,
    description: raw.description as string | null,
    cssValue: raw.css_value as string,
    backgroundType: raw.background_type as 'solid' | 'gradient' | 'pattern',
    niche: raw.niche as string,
    worksForNiches: raw.works_for_niches as string[],
    category: raw.category as string | null,
    sortOrder: raw.sort_order as number,
    isActive: raw.is_active as boolean,
  }
}

// ============================================
// React Query Hooks
// ============================================

/**
 * Hook to fetch concepts for a niche with organized response
 */
export function useConcepts(niche: CreativeNiche = 'generic') {
  return useQuery({
    queryKey: conceptsQueryKeys.byNiche(niche),
    queryFn: () => fetchConceptsResponse(niche),
    staleTime: 1000 * 60 * 15, // 15 minutes (concepts rarely change)
    gcTime: 1000 * 60 * 60, // 1 hour
  })
}

/**
 * Hook to fetch only universal concepts
 */
export function useUniversalConcepts() {
  return useQuery({
    queryKey: conceptsQueryKeys.universal(),
    queryFn: fetchUniversalConcepts,
    staleTime: 1000 * 60 * 15,
    gcTime: 1000 * 60 * 60,
  })
}

/**
 * Hook to fetch visual groups for a niche
 */
export function useVisualGroups(niche: string) {
  return useQuery({
    queryKey: conceptsQueryKeys.visualGroups(niche),
    queryFn: () => fetchVisualGroups(niche),
    staleTime: 1000 * 60 * 15,
    gcTime: 1000 * 60 * 60,
    enabled: niche === 'financial', // Only fetch for financial niche
  })
}

/**
 * Hook to fetch backgrounds for a niche
 */
export function useBackgrounds(niche: string) {
  return useQuery({
    queryKey: conceptsQueryKeys.backgrounds(niche),
    queryFn: () => fetchBackgrounds(niche),
    staleTime: 1000 * 60 * 15,
    gcTime: 1000 * 60 * 60,
  })
}
