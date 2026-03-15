
/**
 * VisualContextPreview Component
 * Feature 027: Visual Generation Studio
 * Feature 028: Enhanced with asset mode selection (style/compose/base)
 *              + Auto-selection by category
 *              + Modal for browsing all assets
 *
 * Displays automatic visual context from project assets
 * and allows selecting reference images for generation.
 */

import { useState, useCallback, useEffect, useMemo } from 'react';
import Image from 'next/image';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Eye,
  ImageIcon,
  Check,
  X,
  ChevronDown,
  Brush,
  Layers,
  Image as ImageBase,
  Sparkles,
  Grid3X3,
  Loader2,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { AssetPickerModal } from './AssetPickerModal';
import type { VisualAsset } from '@/types/image-studio';

export type AssetMode = 'style' | 'compose' | 'base';

export interface SelectedAssetWithMode {
  id: string;
  mode: AssetMode;
  thumbnail_url?: string;
  title?: string;
}

// Asset mode configuration
const ASSET_MODES = {
  style: {
    icon: Brush,
    label: 'Estilo',
    description: 'Usar como referência de estilo visual',
    color: 'purple',
    bgClass: 'bg-purple-500',
    textClass: 'text-purple-500',
    ringClass: 'ring-purple-500',
  },
  compose: {
    icon: Layers,
    label: 'Composição',
    description: 'Usar elementos na composição',
    color: 'blue',
    bgClass: 'bg-blue-500',
    textClass: 'text-blue-500',
    ringClass: 'ring-blue-500',
  },
  base: {
    icon: ImageBase,
    label: 'Base',
    description: 'Usar como imagem base para refinar',
    color: 'green',
    bgClass: 'bg-green-500',
    textClass: 'text-green-500',
    ringClass: 'ring-green-500',
  },
} as const;

// Category to default mode mapping (matches backend categories - Portuguese with capital letters)
const CATEGORY_DEFAULT_MODES: Record<string, AssetMode> = {
  Logo: 'compose',
  Pessoa: 'style',
  Background: 'base',
  Produto: 'compose',
  Referência: 'style',
  Outro: 'style',
  // Lowercase fallbacks for safety
  logo: 'compose',
  pessoa: 'style',
  background: 'base',
  produto: 'compose',
  referência: 'style',
  outro: 'style',
};

interface VisualContextPreviewProps {
  visualAssets: VisualAsset[];
  selectedAssets: SelectedAssetWithMode[];
  onUpdateAssets: (assets: SelectedAssetWithMode[]) => void;
  onSetReferenceImage: (url: string | null) => void;
  referenceImageUrl: string | null;
  disabled?: boolean;
  className?: string;
  /** Enable auto-selection on mount */
  autoSelect?: boolean;
  /** Prompt for AI-based suggestions */
  prompt?: string;
  /** Callback for AI suggestion */
  onSuggestAssets?: (prompt: string) => Promise<SelectedAssetWithMode[]>;
  /** @deprecated Use selectedAssets instead */
  selectedAssetIds?: string[];
  /** @deprecated Use onUpdateAssets instead */
  onToggleAsset?: (assetId: string) => void;
}

export function VisualContextPreview({
  visualAssets,
  selectedAssets = [],
  onUpdateAssets,
  onSetReferenceImage,
  referenceImageUrl,
  disabled = false,
  className,
  autoSelect = true,
  prompt = '',
  onSuggestAssets,
  // Deprecated props for backwards compatibility
  selectedAssetIds = [],
  onToggleAsset,
}: VisualContextPreviewProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSuggesting, setIsSuggesting] = useState(false);
  const [hasAutoSelected, setHasAutoSelected] = useState(false);

  // Use new props if available, fallback to deprecated
  const effectiveSelectedAssets =
    selectedAssets.length > 0
      ? selectedAssets
      : selectedAssetIds.map((id) => ({ id, mode: 'style' as AssetMode }));

  // Auto-select assets on mount: ALWAYS include logo, then random from other categories
  useEffect(() => {
    if (!autoSelect || hasAutoSelected || effectiveSelectedAssets.length > 0) {
      return;
    }

    if (visualAssets.length === 0) {
      return;
    }

    // Group assets by category
    const byCategory = new Map<string, VisualAsset[]>();
    visualAssets.forEach((asset) => {
      const cat = asset.category || 'other';
      if (!byCategory.has(cat)) {
        byCategory.set(cat, []);
      }
      byCategory.get(cat)!.push(asset);
    });

    // Select assets: ALWAYS include logo, then random selection from other categories
    const autoSelected: SelectedAssetWithMode[] = [];

    // Priority 1: ALWAYS select a logo if available (case-insensitive check)
    const logoKey = Array.from(byCategory.keys()).find(
      (k) => k.toLowerCase() === 'logo'
    );
    if (logoKey) {
      const logos = byCategory.get(logoKey)!;
      const randomLogo = logos[Math.floor(Math.random() * logos.length)];
      autoSelected.push({
        id: randomLogo.id,
        mode: 'compose',
        thumbnail_url: randomLogo.thumbnail_url || randomLogo.file_url || undefined,
        title: randomLogo.name,
      });
    }

    // Priority 2: Random selection from OTHER categories (not all - just pick 2-3 random ones)
    const otherCategories = Array.from(byCategory.keys()).filter(
      (k) => k.toLowerCase() !== 'logo'
    );

    // Shuffle and pick up to 3 random categories
    const shuffledCategories = otherCategories.sort(() => Math.random() - 0.5).slice(0, 3);

    shuffledCategories.forEach((category) => {
      const assets = byCategory.get(category)!;
      const randomAsset = assets[Math.floor(Math.random() * assets.length)];
      const mode = CATEGORY_DEFAULT_MODES[category] || 'style';
      autoSelected.push({
        id: randomAsset.id,
        mode,
        thumbnail_url: randomAsset.thumbnail_url || randomAsset.file_url || undefined,
        title: randomAsset.name,
      });
    });

    if (autoSelected.length > 0) {
      onUpdateAssets?.(autoSelected);
      setHasAutoSelected(true);
    }
  }, [visualAssets, autoSelect, hasAutoSelected, effectiveSelectedAssets.length, onUpdateAssets]);

  // Handler to add/remove asset with mode
  const handleToggleAsset = useCallback(
    (asset: VisualAsset, mode: AssetMode) => {
      const existing = effectiveSelectedAssets.find((a) => a.id === asset.id);

      if (existing) {
        // If same mode, remove; if different mode, update
        if (existing.mode === mode) {
          onUpdateAssets?.(effectiveSelectedAssets.filter((a) => a.id !== asset.id));
          // Fallback to deprecated handler
          onToggleAsset?.(asset.id);
        } else {
          onUpdateAssets?.(
            effectiveSelectedAssets.map((a) => (a.id === asset.id ? { ...a, mode } : a))
          );
        }
      } else {
        // Add new asset with mode
        onUpdateAssets?.([
          ...effectiveSelectedAssets,
          {
            id: asset.id,
            mode,
            thumbnail_url: asset.thumbnail_url || asset.file_url || undefined,
            title: asset.name,
          },
        ]);
        // Fallback to deprecated handler
        onToggleAsset?.(asset.id);
      }
    },
    [effectiveSelectedAssets, onUpdateAssets, onToggleAsset]
  );

  // Get asset mode
  const getAssetMode = useCallback(
    (assetId: string): AssetMode | null => {
      const selected = effectiveSelectedAssets.find((a) => a.id === assetId);
      return selected?.mode || null;
    },
    [effectiveSelectedAssets]
  );

  // Handle AI suggestion
  const handleSuggest = useCallback(async () => {
    if (!onSuggestAssets || !prompt.trim()) {
      return;
    }

    setIsSuggesting(true);
    try {
      const suggested = await onSuggestAssets(prompt);
      if (suggested.length > 0) {
        onUpdateAssets?.(suggested);
      }
    } catch (error) {
      console.error('Failed to get AI suggestions:', error);
    } finally {
      setIsSuggesting(false);
    }
  }, [onSuggestAssets, prompt, onUpdateAssets]);

  // Clear all selections
  const handleClearAll = useCallback(() => {
    onUpdateAssets?.([]);
  }, [onUpdateAssets]);

  // Get unique categories
  const categories = useMemo(() => {
    const cats = new Set<string>();
    visualAssets.forEach((asset) => {
      if (asset.category) {
        cats.add(asset.category);
      }
    });
    return Array.from(cats);
  }, [visualAssets]);

  if (visualAssets.length === 0) {
    return null;
  }

  const selectedCount = effectiveSelectedAssets.length;
  const referenceAsset = visualAssets.find((a) => a.file_url === referenceImageUrl);
  const hasMoreAssets = visualAssets.length > 5;
  const hasAnyAssets = visualAssets.length > 0;

  return (
    <div className={cn('space-y-3', className)}>
      {/* Header */}
      <button
        type="button"
        onClick={() => setIsExpanded(!isExpanded)}
        className="flex items-center gap-2 text-sm font-medium text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200 transition-colors"
      >
        <Eye className="w-4 h-4" />
        Contexto Visual
        {selectedCount > 0 && (
          <span className="px-1.5 py-0.5 rounded-full bg-blue-500/10 text-blue-600 dark:text-blue-400 text-xs">
            {selectedCount}
          </span>
        )}
        <ChevronDown className={cn('w-4 h-4 transition-transform', isExpanded && 'rotate-180')} />
      </button>

      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="space-y-4"
          >
            {/* Action buttons */}
            <div className="flex items-center gap-2">
              {/* AI Suggest button */}
              {onSuggestAssets && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleSuggest}
                  disabled={disabled || isSuggesting || !prompt.trim()}
                  className="gap-1.5 text-xs"
                >
                  {isSuggesting ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Sparkles className="w-3.5 h-3.5" />
                  )}
                  Sugerir
                </Button>
              )}

              {/* View all button */}
              {hasAnyAssets && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setIsModalOpen(true)}
                  disabled={disabled}
                  className="gap-1.5 text-xs"
                >
                  <Grid3X3 className="w-3.5 h-3.5" />
                  Ver todos ({visualAssets.length})
                </Button>
              )}

              {/* Clear button */}
              {selectedCount > 0 && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleClearAll}
                  disabled={disabled}
                  className="gap-1 text-xs text-gray-500 hover:text-red-500"
                >
                  <X className="w-3.5 h-3.5" />
                  Limpar
                </Button>
              )}
            </div>

            {/* Automatic context section */}
            <div className="space-y-2">
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Assets do projeto ({visualAssets.length} disponíveis):
              </p>

              <div className="grid grid-cols-5 gap-2">
                {visualAssets.slice(0, 5).map((asset) => {
                  const assetMode = getAssetMode(asset.id);
                  const isSelected = assetMode !== null;
                  const modeConfig = assetMode ? ASSET_MODES[assetMode] : null;

                  return (
                    <div key={asset.id} className="relative group">
                      {/* Asset thumbnail with mode selection dropdown */}
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild disabled={disabled}>
                          <button
                            type="button"
                            className={cn(
                              'relative w-full aspect-square rounded-lg overflow-hidden',
                              'ring-2 transition-all duration-200',
                              isSelected && modeConfig
                                ? modeConfig.ringClass
                                : 'ring-transparent hover:ring-gray-300 dark:hover:ring-gray-600',
                              disabled && 'opacity-50 cursor-not-allowed'
                            )}
                          >
                            {asset.thumbnail_url || asset.file_url ? (
                              <Image
                                src={asset.thumbnail_url || asset.file_url || ''}
                                alt={asset.name}
                                fill
                                className="object-cover"
                                sizes="64px"
                              />
                            ) : (
                              <div className="w-full h-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center">
                                <ImageIcon className="w-4 h-4 text-gray-400" />
                              </div>
                            )}

                            {/* Mode indicator badge */}
                            {isSelected && modeConfig && (
                              <>
                                <div
                                  className={cn('absolute inset-0 opacity-20', modeConfig.bgClass)}
                                />
                                <div
                                  className={cn(
                                    'absolute top-0.5 right-0.5 w-5 h-5 rounded-full flex items-center justify-center',
                                    modeConfig.bgClass
                                  )}
                                >
                                  {(() => {
                                    const Icon = modeConfig.icon;
                                    return <Icon className="w-3 h-3 text-white" />;
                                  })()}
                                </div>
                              </>
                            )}
                          </button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="center" className="w-48">
                          {Object.entries(ASSET_MODES).map(([mode, config]) => {
                            const Icon = config.icon;
                            const isCurrentMode = assetMode === mode;
                            return (
                              <DropdownMenuItem
                                key={mode}
                                onClick={() => handleToggleAsset(asset, mode as AssetMode)}
                                className={cn(
                                  'flex items-center gap-2 cursor-pointer',
                                  isCurrentMode && 'bg-gray-100 dark:bg-gray-800'
                                )}
                              >
                                <Icon className={cn('w-4 h-4', config.textClass)} />
                                <div className="flex-1">
                                  <div className="text-sm font-medium">{config.label}</div>
                                  <div className="text-xs text-gray-500">{config.description}</div>
                                </div>
                                {isCurrentMode && <Check className="w-4 h-4 text-green-500" />}
                              </DropdownMenuItem>
                            );
                          })}
                          {isSelected && (
                            <>
                              <div className="h-px bg-gray-200 dark:bg-gray-700 my-1" />
                              <DropdownMenuItem
                                onClick={() => {
                                  onUpdateAssets?.(
                                    effectiveSelectedAssets.filter((a) => a.id !== asset.id)
                                  );
                                  onToggleAsset?.(asset.id);
                                }}
                                className="flex items-center gap-2 cursor-pointer text-red-500"
                              >
                                <X className="w-4 h-4" />
                                <span>Remover seleção</span>
                              </DropdownMenuItem>
                            </>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>

                      {/* Category label */}
                      {asset.category && (
                        <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity">
                          <span className="px-1.5 py-0.5 rounded text-[9px] font-medium bg-gray-800/80 text-white whitespace-nowrap">
                            {asset.category}
                          </span>
                        </div>
                      )}
                    </div>
                  );
                })}

                {/* More assets indicator */}
                {hasMoreAssets && (
                  <button
                    type="button"
                    onClick={() => setIsModalOpen(true)}
                    disabled={disabled}
                    className="relative w-full aspect-square rounded-lg overflow-hidden bg-gray-100 dark:bg-gray-800 flex flex-col items-center justify-center hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
                  >
                    <span className="text-lg font-semibold text-gray-600 dark:text-gray-400">
                      +{visualAssets.length - 5}
                    </span>
                    <span className="text-[10px] text-gray-500">mais</span>
                  </button>
                )}
              </div>
            </div>

            {/* Reference image indicator */}
            {referenceImageUrl && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex items-center gap-3 p-3 rounded-lg bg-purple-50 dark:bg-purple-900/20 border border-purple-200/50 dark:border-purple-800/50"
              >
                <div className="relative w-12 h-12 rounded-lg overflow-hidden flex-shrink-0">
                  <Image
                    src={referenceImageUrl}
                    alt="Referência"
                    fill
                    className="object-cover"
                    sizes="48px"
                  />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-purple-700 dark:text-purple-300">
                    Imagem de referência selecionada
                  </p>
                  <p className="text-xs text-purple-600 dark:text-purple-400 truncate">
                    {referenceAsset?.name || 'Imagem externa'}
                  </p>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onSetReferenceImage(null)}
                  disabled={disabled}
                  className="text-purple-600 hover:text-purple-800 dark:text-purple-400 flex-shrink-0"
                >
                  <X className="w-4 h-4" />
                </Button>
              </motion.div>
            )}

            {/* Legend */}
            <div className="flex items-center gap-3 text-[10px] text-gray-400">
              {Object.entries(ASSET_MODES).map(([mode, config]) => {
                const Icon = config.icon;
                return (
                  <div key={mode} className="flex items-center gap-1">
                    <Icon className={cn('w-3 h-3', config.textClass)} />
                    <span>{config.label}</span>
                  </div>
                );
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Compact preview when collapsed */}
      {!isExpanded && (
        <div className="flex items-center gap-2">
          {/* Selected thumbnails with mode indicators */}
          {selectedCount > 0 && (
            <div className="flex -space-x-2">
              {effectiveSelectedAssets.slice(0, 4).map((selected) => {
                const asset = visualAssets.find((a) => a.id === selected.id);
                const modeConfig = ASSET_MODES[selected.mode];
                if (!asset) return null;
                return (
                  <div
                    key={asset.id}
                    className={cn(
                      'relative w-8 h-8 rounded-lg overflow-hidden ring-2',
                      modeConfig.ringClass
                    )}
                  >
                    <Image
                      src={asset.thumbnail_url || asset.file_url || ''}
                      alt={asset.name}
                      fill
                      className="object-cover"
                      sizes="32px"
                    />
                  </div>
                );
              })}
              {selectedCount > 4 && (
                <div className="w-8 h-8 rounded-lg bg-gray-100 dark:bg-gray-800 ring-2 ring-white dark:ring-gray-900 flex items-center justify-center">
                  <span className="text-xs text-gray-500">+{selectedCount - 4}</span>
                </div>
              )}
            </div>
          )}

          {/* Reference indicator */}
          {referenceImageUrl && (
            <div className="flex items-center gap-1.5 px-2 py-1 rounded-full bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400">
              <div className="relative w-5 h-5 rounded overflow-hidden">
                <Image
                  src={referenceImageUrl}
                  alt="Ref"
                  fill
                  className="object-cover"
                  sizes="20px"
                />
              </div>
              <span className="text-xs font-medium">Ref</span>
            </div>
          )}

          {/* Ver todos button - always visible when collapsed */}
          {hasAnyAssets && (
            <Button
              variant="ghost"
              size="sm"
              onClick={(e) => {
                e.stopPropagation();
                setIsModalOpen(true);
              }}
              disabled={disabled}
              className="gap-1 text-xs text-gray-500 hover:text-blue-500 h-8 px-2"
            >
              <Grid3X3 className="w-3.5 h-3.5" />
              <span>Ver todos ({visualAssets.length})</span>
            </Button>
          )}
        </div>
      )}

      {/* Asset picker modal */}
      <AssetPickerModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        visualAssets={visualAssets}
        selectedAssets={effectiveSelectedAssets}
        onUpdateAssets={onUpdateAssets}
      />
    </div>
  );
}

export default VisualContextPreview;
