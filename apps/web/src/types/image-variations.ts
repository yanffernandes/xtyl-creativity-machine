/**
 * Image Variation Types - Smart Image Generation (Feature 026)
 *
 * TypeScript types for the image variation system that generates
 * multiple image options per request.
 *
 * Ported from: frontend/src/types/image-variations.ts
 */

/**
 * Single image variation data
 */
export interface ImageVariation {
  id: string;
  imageUrl: string;
  thumbnailUrl: string | null;
  modifier: string;
  index: number;
  documentId: string;
}

/**
 * SSE event types for variation progress
 */
export type VariationEventType =
  | 'variation_started'
  | 'variation_complete'
  | 'variation_failed'
  | 'all_variations_complete';

/**
 * Base SSE event structure
 */
export interface VariationSSEEvent {
  type: VariationEventType;
  data: VariationEventData;
}

/**
 * Event data for variation_started
 */
export interface VariationStartedData {
  variation_set_id: string;
  total_variations: number;
  project_id: string;
}

/**
 * Event data for variation_complete
 */
export interface VariationCompleteData {
  variation_set_id: string;
  variation_index: number;
  total_variations: number;
  document_id: string;
  image_url: string;
  thumbnail_url: string | null;
  modifier_used: string;
  title?: string;
}

/**
 * Event data for variation_failed
 */
export interface VariationFailedData {
  variation_set_id: string;
  variation_index: number;
  error: string;
}

/**
 * Event data for all_variations_complete
 */
export interface AllVariationsCompleteData {
  variation_set_id: string;
  total_completed: number;
  total_failed: number;
  documents: Array<{
    document_id: string;
    image_url: string;
    thumbnail_url: string | null;
    variation_index: number;
    modifier: string;
  }>;
}

/**
 * Union type for all event data types
 */
export type VariationEventData =
  | VariationStartedData
  | VariationCompleteData
  | VariationFailedData
  | AllVariationsCompleteData;

/**
 * Image generation configuration from admin
 */
export interface ImageGenerationConfig {
  count: number;
  modifiers: string[];
  enabled: boolean;
}

/**
 * Update configuration request
 */
export interface ImageGenerationConfigUpdate {
  count?: number;
  modifiers?: string[];
  enabled?: boolean;
}

/**
 * Variation state for UI
 */
export interface VariationState {
  variationSetId: string | null;
  totalVariations: number;
  completedVariations: ImageVariation[];
  failedVariations: number[];
  isGenerating: boolean;
  error: string | null;
}

/**
 * Default modifiers (matches backend)
 */
export const DEFAULT_VARIATION_MODIFIERS = [
  "minimalist and clean version, with white space, elegant typography",
  "vibrant and impactful version, saturated colors, dynamic elements",
  "sophisticated and premium version, neutral tones, balanced composition",
];

/**
 * Variation count options for admin settings
 */
export const VARIATION_COUNT_OPTIONS = [
  { value: 1, label: '1 variation (fastest)' },
  { value: 2, label: '2 variations (recommended)' },
  { value: 3, label: '3 variations (more options)' },
] as const;
