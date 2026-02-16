/**
 * ImageVariationGrid Component - Smart Image Generation (Feature 026)
 *
 * Displays multiple image variations in a responsive grid with:
 * - Skeleton loading states for pending variations
 * - Animated fade-in for completed variations
 * - Click-to-select functionality
 * - Modifier labels for each variation
 * - Error handling for failed image loads
 */

import { useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

export interface ImageVariation {
  id: string;
  imageUrl: string;
  thumbnailUrl: string | null;
  modifier: string;
  index: number;
  documentId: string;
}

interface ImageVariationGridProps {
  totalVariations: number;
  completedVariations: ImageVariation[];
  failedVariations?: number[];
  isGenerating?: boolean;
  onSelect?: (variation: ImageVariation) => void;
  selectedId?: string;
  className?: string;
}

export function ImageVariationGrid({
  totalVariations,
  completedVariations,
  failedVariations = [],
  isGenerating = false,
  onSelect,
  selectedId,
  className,
}: ImageVariationGridProps) {
  // Track images that failed to load
  const [imageLoadErrors, setImageLoadErrors] = useState<Set<string>>(new Set());

  const handleImageError = useCallback((variationId: string) => {
    setImageLoadErrors((prev) => new Set(prev).add(variationId));
  }, []);

  // Don't render if no variations
  if (totalVariations === 0) {
    return null;
  }

  // Determine grid columns based on variation count
  const gridCols =
    totalVariations === 1
      ? "grid-cols-1 max-w-md"
      : totalVariations === 2
      ? "grid-cols-2 max-w-2xl"
      : "grid-cols-2 md:grid-cols-3 max-w-3xl";

  return (
    <div className={cn("grid gap-4", gridCols, className)}>
      {Array.from({ length: totalVariations }).map((_, index) => {
        const variation = completedVariations.find((v) => v.index === index);
        const hasFailed = failedVariations.includes(index);
        const hasImageLoadError = variation && imageLoadErrors.has(variation.id);
        const isSelected = variation && variation.id === selectedId;

        return (
          <div
            key={index}
            className={cn(
              "aspect-square relative rounded-lg overflow-hidden",
              "border-2 transition-all duration-200",
              isSelected
                ? "border-primary ring-2 ring-primary/20"
                : "border-border/50",
              variation && onSelect && "cursor-pointer hover:border-primary/50"
            )}
            onClick={() => variation && onSelect?.(variation)}
          >
            <AnimatePresence mode="wait">
              {variation && !hasImageLoadError ? (
                <motion.div
                  key={variation.id}
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  transition={{ duration: 0.3 }}
                  className="w-full h-full"
                >
                  <img
                    src={variation.thumbnailUrl || variation.imageUrl}
                    alt={`Variation ${index + 1}`}
                    className="w-full h-full object-cover"
                    loading="lazy"
                    onError={() => handleImageError(variation.id)}
                  />
                </motion.div>
              ) : hasFailed || hasImageLoadError ? (
                <motion.div
                  key={`failed-${index}`}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="w-full h-full flex items-center justify-center bg-destructive/10"
                >
                  <div className="text-center p-4">
                    <svg
                      className="w-8 h-8 mx-auto mb-2 text-destructive"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                      />
                    </svg>
                    <p className="text-xs text-destructive">
                      Failed
                    </p>
                  </div>
                </motion.div>
              ) : (
                <motion.div
                  key={`skeleton-${index}`}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="w-full h-full"
                >
                  <Skeleton className="w-full h-full" />
                  {isGenerating && (
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div className="text-center">
                        <div className="animate-spin w-8 h-8 border-2 border-primary border-t-transparent rounded-full mx-auto mb-2" />
                        <p className="text-xs text-muted-foreground">
                          Generating...
                        </p>
                      </div>
                    </div>
                  )}
                </motion.div>
              )}
            </AnimatePresence>

            {/* Modifier label */}
            <div
              className={cn(
                "absolute bottom-0 left-0 right-0 px-2 py-1.5",
                "bg-gradient-to-t from-black/70 to-transparent",
                "text-white text-xs truncate"
              )}
            >
              {variation && !hasImageLoadError ? (
                <>
                  <span className="font-medium">
                    Variation {index + 1}
                  </span>
                  <span className="hidden sm:inline text-white/70">
                    {" "}
                    - {variation.modifier.split(",")[0]}
                  </span>
                </>
              ) : hasFailed || hasImageLoadError ? (
                <span className="text-destructive-foreground">
                  {hasImageLoadError ? "Failed to load image" : `Error in variation ${index + 1}`}
                </span>
              ) : (
                <span className="text-white/70">
                  Generating {index + 1}/{totalVariations}...
                </span>
              )}
            </div>

            {/* Selection indicator */}
            {isSelected && (
              <div className="absolute top-2 right-2">
                <div className="w-6 h-6 rounded-full bg-primary flex items-center justify-center">
                  <svg
                    className="w-4 h-4 text-primary-foreground"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M5 13l4 4L19 7"
                    />
                  </svg>
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

export default ImageVariationGrid;
