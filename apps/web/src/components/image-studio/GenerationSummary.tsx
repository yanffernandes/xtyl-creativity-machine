import { useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  FileText,
  Palette,
  LayoutGrid,
  Image as ImageIcon,
  Sparkles,
  Info,
  ChevronDown,
  ChevronUp,
  Eye,
  Layers,
  Brush,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type { CreativeConcept } from '@repo/shared';

const ASSET_MODE_CONFIG = {
  style: { icon: Brush, label: 'Estilo', color: 'text-purple-500' },
  compose: { icon: Layers, label: 'Composição', color: 'text-blue-500' },
  base: { icon: ImageIcon, label: 'Base', color: 'text-green-500' },
} as const;

interface ReferenceAsset {
  id: string;
  thumbnail_url?: string;
  title?: string;
  mode?: 'style' | 'compose' | 'base';
}

interface GenerationSummaryProps {
  prompt: string;
  selectedConcept: CreativeConcept | null;
  referenceAssets: ReferenceAsset[];
  model: string;
  modelName?: string;
  aspectRatio: string;
  creativity: number;
  applyBrandContext: boolean;
  projectContext?: string | null;
  isExpanded: boolean;
  onToggleExpanded: () => void;
  className?: string;
}

export function GenerationSummary({
  prompt,
  selectedConcept,
  referenceAssets,
  model,
  modelName,
  aspectRatio,
  creativity,
  applyBrandContext,
  projectContext,
  isExpanded,
  onToggleExpanded,
  className,
}: GenerationSummaryProps) {
  const finalPromptPreview = useMemo(() => {
    const parts: string[] = [];
    if (selectedConcept) parts.push(`[Conceito: ${selectedConcept.name_pt}]`);
    if (prompt) parts.push(prompt);
    return parts.join(' + ');
  }, [prompt, selectedConcept]);

  if (!prompt && !selectedConcept && referenceAssets.length === 0) return null;

  return (
    <div
      className={cn(
        'rounded-xl border border-gray-200/50 dark:border-gray-700/50 bg-gradient-to-br from-gray-50/80 to-white/80 dark:from-gray-900/80 dark:to-gray-800/80 backdrop-blur-sm overflow-hidden',
        className
      )}
    >
      <button
        onClick={onToggleExpanded}
        className="w-full flex items-center justify-between p-3 hover:bg-gray-100/50 dark:hover:bg-gray-800/50 transition-colors"
      >
        <div className="flex items-center gap-2">
          <Eye className="h-4 w-4 text-blue-500" />
          <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
            Resumo da Geração
          </span>
        </div>
        {isExpanded ? (
          <ChevronUp className="h-4 w-4 text-gray-400" />
        ) : (
          <ChevronDown className="h-4 w-4 text-gray-400" />
        )}
      </button>

      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <div className="p-3 pt-0 space-y-3">
              {prompt && (
                <div className="space-y-1.5">
                  <div className="flex items-center gap-1.5 text-xs font-medium text-gray-500">
                    <FileText className="h-3 w-3" />
                    <span>Prompt Final</span>
                  </div>
                  <div className="p-2 rounded-lg bg-white/60 dark:bg-gray-800/60 border border-gray-200/50 dark:border-gray-700/50">
                    <p className="text-sm text-gray-700 dark:text-gray-300 line-clamp-3">
                      {finalPromptPreview}
                    </p>
                  </div>
                </div>
              )}

              {selectedConcept && (
                <div className="p-2 rounded-lg bg-purple-50/60 dark:bg-purple-900/20 border border-purple-200/50 dark:border-purple-800/50">
                  <div className="flex items-center gap-1.5 text-xs font-medium text-purple-600 dark:text-purple-400 mb-1">
                    <Sparkles className="h-3 w-3" />
                    <span>Conceito</span>
                  </div>
                  <p className="text-sm text-purple-700 dark:text-purple-300 font-medium">
                    {selectedConcept.name_pt}
                  </p>
                </div>
              )}

              {referenceAssets.length > 0 && (
                <div className="space-y-1.5">
                  <div className="flex items-center gap-1.5 text-xs font-medium text-gray-500">
                    <ImageIcon className="h-3 w-3" />
                    <span>Assets ({referenceAssets.length})</span>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {referenceAssets.map((asset) => {
                      const mode = asset.mode || 'style';
                      const config = ASSET_MODE_CONFIG[mode];
                      const Icon = config.icon;
                      return (
                        <div
                          key={asset.id}
                          className="flex items-center gap-1.5 px-2 py-1 rounded-md bg-gray-100/60 dark:bg-gray-800/60 border border-gray-200/50"
                        >
                          {asset.thumbnail_url && (
                            <img
                              src={asset.thumbnail_url}
                              alt=""
                              className="w-6 h-6 rounded object-cover"
                              loading="lazy"
                            />
                          )}
                          <Icon className={cn('h-3 w-3', config.color)} />
                          <span className="text-xs text-gray-600">
                            {config.label}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              <div className="flex flex-wrap gap-2 pt-1">
                <div className="flex items-center gap-1 px-2 py-1 rounded-md bg-gray-100/60 text-xs text-gray-600">
                  <Sparkles className="h-3 w-3" />
                  <span>{modelName || model.split('/').pop()}</span>
                </div>
                <div className="flex items-center gap-1 px-2 py-1 rounded-md bg-gray-100/60 text-xs text-gray-600">
                  <LayoutGrid className="h-3 w-3" />
                  <span>{aspectRatio}</span>
                </div>
                <div className="flex items-center gap-1 px-2 py-1 rounded-md bg-gray-100/60 text-xs text-gray-600">
                  <Palette className="h-3 w-3" />
                  <span>Criatividade: {creativity}%</span>
                </div>
                {applyBrandContext && projectContext && (
                  <div className="flex items-center gap-1 px-2 py-1 rounded-md bg-green-100/60 text-xs text-green-600">
                    <Info className="h-3 w-3" />
                    <span>Contexto da marca</span>
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
