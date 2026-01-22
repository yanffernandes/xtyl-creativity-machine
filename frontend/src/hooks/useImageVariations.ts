/**
 * useImageVariations Hook - Smart Image Generation (Feature 026)
 *
 * Manages state for image variation generation with progressive delivery.
 * Handles SSE events for real-time updates as each variation completes.
 */

import { useState, useCallback } from "react";
import type {
  ImageVariation,
  VariationState,
  VariationStartedData,
  VariationCompleteData,
  VariationFailedData,
  AllVariationsCompleteData,
} from "@/types/image-variations";

const initialState: VariationState = {
  variationSetId: null,
  totalVariations: 0,
  completedVariations: [],
  failedVariations: [],
  isGenerating: false,
  error: null,
};

export interface UseImageVariationsReturn extends VariationState {
  handleVariationEvent: (event: { type: string; data: unknown }) => void;
  reset: () => void;
  getVariationByIndex: (index: number) => ImageVariation | undefined;
  completionProgress: number;
}

export function useImageVariations(): UseImageVariationsReturn {
  const [state, setState] = useState<VariationState>(initialState);

  /**
   * Handle incoming SSE events for variation progress
   */
  const handleVariationEvent = useCallback((event: { type: string; data: unknown }) => {
    switch (event.type) {
      case "variation_started": {
        const data = event.data as VariationStartedData;
        setState({
          variationSetId: data.variation_set_id,
          totalVariations: data.total_variations,
          completedVariations: [],
          failedVariations: [],
          isGenerating: true,
          error: null,
        });
        break;
      }

      case "variation_complete": {
        const data = event.data as VariationCompleteData;
        const newVariation: ImageVariation = {
          id: data.document_id,
          imageUrl: data.image_url,
          thumbnailUrl: data.thumbnail_url,
          modifier: data.modifier_used,
          index: data.variation_index,
          documentId: data.document_id,
        };

        setState((prev) => ({
          ...prev,
          completedVariations: [...prev.completedVariations, newVariation].sort(
            (a, b) => a.index - b.index
          ),
        }));
        break;
      }

      case "variation_failed": {
        const data = event.data as VariationFailedData;
        console.error(`Variation ${data.variation_index} failed:`, data.error);

        setState((prev) => ({
          ...prev,
          failedVariations: [...prev.failedVariations, data.variation_index],
        }));
        break;
      }

      case "all_variations_complete": {
        const data = event.data as AllVariationsCompleteData;
        setState((prev) => ({
          ...prev,
          isGenerating: false,
          error:
            data.total_failed > 0
              ? `${data.total_failed} variation(s) failed`
              : null,
        }));
        break;
      }
    }
  }, []);

  /**
   * Reset state for a new generation request
   */
  const reset = useCallback(() => {
    setState(initialState);
  }, []);

  /**
   * Get a specific variation by its index
   */
  const getVariationByIndex = useCallback(
    (index: number): ImageVariation | undefined => {
      return state.completedVariations.find((v) => v.index === index);
    },
    [state.completedVariations]
  );

  /**
   * Calculate completion progress (0-100)
   */
  const completionProgress =
    state.totalVariations > 0
      ? Math.round(
          ((state.completedVariations.length + state.failedVariations.length) /
            state.totalVariations) *
            100
        )
      : 0;

  return {
    ...state,
    handleVariationEvent,
    reset,
    getVariationByIndex,
    completionProgress,
  };
}

export default useImageVariations;
