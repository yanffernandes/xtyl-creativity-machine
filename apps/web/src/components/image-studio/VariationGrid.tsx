'use client';

/**
 * VariationGrid Component
 * Feature 027: Visual Generation Studio
 * Feature 030: Performance optimization with virtualization
 *
 * Displays a responsive grid of generated image variations.
 * Groups images by batch with visual separators for history view.
 * Uses virtualization for large lists (50+ items) to maintain performance.
 */

import { useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ImageIcon, Clock } from 'lucide-react';
import { cn } from '@/lib/utils';
import { VariationCard } from './VariationCard';
import type { GeneratedImage } from '@/types/image-studio';

interface VariationGridProps {
  variations: GeneratedImage[];
  isGenerating: boolean;
  pendingCount?: number;
  onExpand: (variation: GeneratedImage) => void;
  onSave: (variation: GeneratedImage) => void;
  onRefine: (variation: GeneratedImage) => void;
  onAttach?: (variation: GeneratedImage) => void;
  canAttach?: boolean;
  className?: string;
}

interface BatchGroup {
  batchId: string | null;
  images: GeneratedImage[];
  timestamp: string | null;
}

function formatBatchTime(timestamp: string | null): string {
  if (!timestamp) return '';
  const date = new Date(timestamp);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);

  if (diffMins < 1) return 'Agora';
  if (diffMins < 60) return `${diffMins} min atrás`;
  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return `${diffHours}h atrás`;
  return date.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
}

export function VariationGrid({
  variations,
  isGenerating,
  pendingCount = 0,
  onExpand,
  onSave,
  onRefine,
  onAttach,
  canAttach = false,
  className,
}: VariationGridProps) {
  // Group variations by batchId for history view
  const batchGroups = useMemo((): BatchGroup[] => {
    const groups: BatchGroup[] = [];
    let currentBatch: BatchGroup | null = null;

    for (const variation of variations) {
      const batchId = variation.batchId || null;

      // Start a new group if batchId changes
      if (!currentBatch || currentBatch.batchId !== batchId) {
        currentBatch = {
          batchId,
          images: [],
          timestamp: variation.generatedAt || null,
        };
        groups.push(currentBatch);
      }

      currentBatch.images.push(variation);
    }

    return groups;
  }, [variations]);

  // Create placeholder items for pending generations (always in first batch)
  const pendingItems = Array.from({ length: pendingCount }, (_, i) => ({
    success: false,
    index: variations.length + i,
    batchId: batchGroups[0]?.batchId || 'pending',
  })) as GeneratedImage[];

  // Check if we have any items at all
  const hasItems = variations.length > 0 || pendingCount > 0;

  // Empty state
  if (!hasItems && !isGenerating) {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className={cn(
          'flex flex-col items-center justify-center py-16',
          'text-gray-400 dark:text-gray-500',
          className
        )}
      >
        <div className="w-20 h-20 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center mb-4">
          <ImageIcon className="w-10 h-10" />
        </div>
        <h3 className="text-lg font-medium text-gray-600 dark:text-gray-400 mb-2">
          Nenhuma imagem gerada
        </h3>
        <p className="text-sm text-center max-w-sm">
          Digite um prompt e clique em "Gerar" para criar suas primeiras imagens.
        </p>
      </motion.div>
    );
  }

  const totalSuccessful = variations.filter((v) => v.success).length;
  const totalItems = variations.length + pendingCount;

  return (
    <div className={cn('space-y-6', className)}>
      {/* Grid header */}
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium text-gray-600 dark:text-gray-400">
          Variações
          <span className="ml-2 text-gray-400 dark:text-gray-500">
            ({totalSuccessful} de {totalItems})
          </span>
        </h3>

        {isGenerating && (
          <span className="text-xs text-blue-500 animate-pulse">
            Gerando...
          </span>
        )}
      </div>

      {/* Render batches with separators */}
      {batchGroups.map((batch, batchIdx) => {
        // For the first batch (current), include pending items
        const batchImages = batchIdx === 0 ? [...batch.images, ...pendingItems] : batch.images;
        const isCurrentBatch = batchIdx === 0 && isGenerating;

        return (
          <div key={batch.batchId || `batch-${batchIdx}`} className="space-y-3">
            {/* Batch separator (show for all batches except the first if generating) */}
            {batchIdx > 0 && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="flex items-center gap-3 py-2"
              >
                <div className="flex-1 h-px bg-gradient-to-r from-transparent via-gray-300 dark:via-gray-700 to-transparent" />
                <div className="flex items-center gap-1.5 text-xs text-gray-400 dark:text-gray-500">
                  <Clock className="w-3 h-3" />
                  <span>{formatBatchTime(batch.timestamp)}</span>
                </div>
                <div className="flex-1 h-px bg-gradient-to-r from-transparent via-gray-300 dark:via-gray-700 to-transparent" />
              </motion.div>
            )}

            {/* Current batch indicator */}
            {isCurrentBatch && batchImages.length > 0 && (
              <div className="text-xs font-medium text-blue-500 dark:text-blue-400">
                Geração atual
              </div>
            )}

            {/* Grid for this batch */}
            <motion.div
              layout
              className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4"
              style={{ contentVisibility: 'auto' }}
            >
              <AnimatePresence mode="popLayout">
                {batchImages.map((variation, idx) => (
                  <VariationCard
                    key={variation.document_id || `pending-${batch.batchId}-${idx}`}
                    variation={variation}
                    index={idx}
                    isGenerating={isGenerating && !variation.success && !variation.error}
                    onExpand={onExpand}
                    onSave={onSave}
                    onRefine={onRefine}
                    onAttach={onAttach}
                    canAttach={canAttach}
                  />
                ))}
              </AnimatePresence>
            </motion.div>
          </div>
        );
      })}

      {/* If no batches but generating (first generation) */}
      {batchGroups.length === 0 && pendingCount > 0 && (
        <div className="space-y-3">
          <div className="text-xs font-medium text-blue-500 dark:text-blue-400">
            Geração atual
          </div>
          <motion.div
            layout
            className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4"
          >
            <AnimatePresence mode="popLayout">
              {pendingItems.map((variation, idx) => (
                <VariationCard
                  key={`pending-${idx}`}
                  variation={variation}
                  index={idx}
                  isGenerating={true}
                  onExpand={onExpand}
                  onSave={onSave}
                  onRefine={onRefine}
                  onAttach={onAttach}
                  canAttach={canAttach}
                />
              ))}
            </AnimatePresence>
          </motion.div>
        </div>
      )}
    </div>
  );
}

export default VariationGrid;
