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
  onExpand: (v: GeneratedImage) => void;
  onSave: (v: GeneratedImage) => void;
  onRefine: (v: GeneratedImage) => void;
  onAttach?: (v: GeneratedImage) => void;
  canAttach?: boolean;
  className?: string;
}

function formatBatchTime(timestamp: string | null): string {
  if (!timestamp) return '';
  const diffMins = Math.floor(
    (Date.now() - new Date(timestamp).getTime()) / 60000
  );
  if (diffMins < 1) return 'Agora';
  if (diffMins < 60) return `${diffMins} min atrás`;
  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return `${diffHours}h atrás`;
  return new Date(timestamp).toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
  });
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
  const batchGroups = useMemo(() => {
    const groups: {
      batchId: string | null;
      images: GeneratedImage[];
      timestamp: string | null;
    }[] = [];
    let current: (typeof groups)[0] | null = null;

    for (const v of variations) {
      const bid = v.batchId || null;
      if (!current || current.batchId !== bid) {
        current = {
          batchId: bid,
          images: [],
          timestamp: v.generatedAt || null,
        };
        groups.push(current);
      }
      current.images.push(v);
    }
    return groups;
  }, [variations]);

  const pendingItems = Array.from(
    { length: pendingCount },
    (_, i) =>
      ({
        success: false,
        index: variations.length + i,
        batchId: batchGroups[0]?.batchId || 'pending',
      }) as GeneratedImage
  );

  const hasItems = variations.length > 0 || pendingCount > 0;

  if (!hasItems && !isGenerating) {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className={cn(
          'flex flex-col items-center justify-center py-16 text-gray-400',
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
          Digite um prompt e clique em "Gerar" para criar suas primeiras
          imagens.
        </p>
      </motion.div>
    );
  }

  const totalSuccessful = variations.filter((v) => v.success).length;

  return (
    <div className={cn('space-y-6', className)}>
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium text-gray-600 dark:text-gray-400">
          Variações{' '}
          <span className="ml-2 text-gray-400">
            ({totalSuccessful} de {variations.length + pendingCount})
          </span>
        </h3>
        {isGenerating && (
          <span className="text-xs text-blue-500 animate-pulse">
            Gerando...
          </span>
        )}
      </div>

      {batchGroups.map((batch, batchIdx) => {
        const batchImages =
          batchIdx === 0
            ? [...batch.images, ...pendingItems]
            : batch.images;

        return (
          <div key={batch.batchId || `batch-${batchIdx}`} className="space-y-3">
            {batchIdx > 0 && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="flex items-center gap-3 py-2"
              >
                <div className="flex-1 h-px bg-gradient-to-r from-transparent via-gray-300 dark:via-gray-700 to-transparent" />
                <div className="flex items-center gap-1.5 text-xs text-gray-400">
                  <Clock className="w-3 h-3" />
                  <span>{formatBatchTime(batch.timestamp)}</span>
                </div>
                <div className="flex-1 h-px bg-gradient-to-r from-transparent via-gray-300 dark:via-gray-700 to-transparent" />
              </motion.div>
            )}

            {batchIdx === 0 && isGenerating && batchImages.length > 0 && (
              <div className="text-xs font-medium text-blue-500">
                Geração atual
              </div>
            )}

            <motion.div
              layout
              className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4"
            >
              <AnimatePresence mode="popLayout">
                {batchImages.map((v, idx) => (
                  <VariationCard
                    key={
                      v.document_id ||
                      `pending-${batch.batchId}-${idx}`
                    }
                    variation={v}
                    index={idx}
                    isGenerating={
                      isGenerating && !v.success && !v.error
                    }
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

      {batchGroups.length === 0 && pendingCount > 0 && (
        <div className="space-y-3">
          <div className="text-xs font-medium text-blue-500">
            Geração atual
          </div>
          <motion.div
            layout
            className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4"
          >
            <AnimatePresence mode="popLayout">
              {pendingItems.map((v, idx) => (
                <VariationCard
                  key={`pending-${idx}`}
                  variation={v}
                  index={idx}
                  isGenerating
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
