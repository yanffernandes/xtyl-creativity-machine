/**
 * Image Variations Hook (Stub)
 *
 * TODO: Port full implementation from frontend/src/hooks/useImageVariations.ts
 * Currently returns defaults indicating no image variations in progress.
 */

import type { ImageVariation } from '@/types/image-variations';

export function useImageVariations() {
  return {
    totalVariations: 0,
    completedVariations: [] as ImageVariation[],
    failedVariations: [] as number[],
    isGenerating: false,
    completionProgress: 0,
    reset: () => {},
    handleVariationEvent: (_event: unknown) => {},
  };
}
