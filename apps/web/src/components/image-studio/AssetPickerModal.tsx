
/**
 * AssetPickerModal Component
 * Feature 028: Visual Context Enhancement
 * Feature 029: fal.ai Migration - Added single-select mode
 *
 * Modal for selecting visual assets with category filters.
 * Supports two modes:
 * - multi: Select multiple assets with modes (style, compose, base)
 * - single: Select one asset for editing/adjusting
 */

import { useState, useMemo, useCallback } from 'react';
import Image from 'next/image';
import {
  X,
  ImageIcon,
  Check,
  Brush,
  Layers,
  Image as ImageBase,
  Search,
  Filter,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { useProjectMedia } from '@/hooks/useProjectMedia';
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
    description: 'Referência de estilo visual',
    color: 'purple',
    bgClass: 'bg-purple-500',
    textClass: 'text-purple-500',
    ringClass: 'ring-purple-500',
  },
  compose: {
    icon: Layers,
    label: 'Composição',
    description: 'Usar na composição',
    color: 'blue',
    bgClass: 'bg-blue-500',
    textClass: 'text-blue-500',
    ringClass: 'ring-blue-500',
  },
  base: {
    icon: ImageBase,
    label: 'Base',
    description: 'Imagem base para refinar',
    color: 'green',
    bgClass: 'bg-green-500',
    textClass: 'text-green-500',
    ringClass: 'ring-green-500',
  },
} as const;

// Category configuration (matches backend categories - Portuguese with capital letters)
const CATEGORY_CONFIG: Record<string, { label: string; defaultMode: AssetMode }> = {
  // Backend categories (Portuguese, capitalized)
  Logo: { label: 'Logo', defaultMode: 'compose' },
  Pessoa: { label: 'Pessoa', defaultMode: 'style' },
  Background: { label: 'Background', defaultMode: 'base' },
  Produto: { label: 'Produto', defaultMode: 'compose' },
  Referência: { label: 'Referência', defaultMode: 'style' },
  Outro: { label: 'Outro', defaultMode: 'style' },
  // Lowercase fallbacks
  logo: { label: 'Logo', defaultMode: 'compose' },
  pessoa: { label: 'Pessoa', defaultMode: 'style' },
  background: { label: 'Background', defaultMode: 'base' },
  produto: { label: 'Produto', defaultMode: 'compose' },
  referência: { label: 'Referência', defaultMode: 'style' },
  outro: { label: 'Outro', defaultMode: 'style' },
  other: { label: 'Outro', defaultMode: 'style' },
};

// Multi-select props (Feature 028)
interface MultiSelectProps {
  mode?: 'multi';
  visualAssets: VisualAsset[];
  selectedAssets: SelectedAssetWithMode[];
  onUpdateAssets: (assets: SelectedAssetWithMode[]) => void;
  projectId?: never;
  onSelect?: never;
  title?: never;
  description?: never;
}

// Single-select props (Feature 029)
interface SingleSelectProps {
  mode: 'single';
  projectId: string;
  onSelect: (asset: VisualAsset) => void;
  title?: string;
  description?: string;
  visualAssets?: never;
  selectedAssets?: never;
  onUpdateAssets?: never;
}

type AssetPickerModalProps = {
  isOpen: boolean;
  onClose: () => void;
} & (MultiSelectProps | SingleSelectProps);

export function AssetPickerModal(props: AssetPickerModalProps) {
  const { isOpen, onClose } = props;
  const mode = props.mode ?? 'multi';
  const isSingleMode = mode === 'single';
  const isMultiMode = mode === 'multi';

  // Extract props based on mode (type narrowing)
  const singleProps = isSingleMode ? (props as SingleSelectProps) : null;
  const multiProps = isMultiMode ? (props as MultiSelectProps) : null;

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

  // Fetch images from API for single-select mode
  const { media: fetchedMedia } = useProjectMedia({
    projectId: singleProps?.projectId ?? '',
    limit: 100,
    enabled: isOpen && isSingleMode,
  });

  // Convert fetched media to VisualAsset format for single-select
  const visualAssetsFromAPI = useMemo((): VisualAsset[] => {
    if (!isSingleMode) return [];
    return fetchedMedia.map((m) => ({
      id: m.document_id ?? '',
      project_id: singleProps?.projectId ?? '',
      name: m.title || 'Untitled',
      file_url: m.file_url ?? null,
      thumbnail_url: m.thumbnail_url ?? null,
      category: null,
      tags: null,
      ai_description: null,
      is_classified: false,
      created_at: new Date().toISOString(),
      updated_at: null,
    }));
  }, [isSingleMode, fetchedMedia, singleProps?.projectId]);

  // Get visualAssets based on mode
  const visualAssets: VisualAsset[] = isMultiMode
    ? (multiProps?.visualAssets ?? [])
    : visualAssetsFromAPI;

  // Multi-select state
  const [localSelection, setLocalSelection] = useState<SelectedAssetWithMode[]>(
    multiProps?.selectedAssets ?? []
  );

  // Sync local selection when modal opens (multi-select only)
  useMemo(() => {
    if (isOpen && isMultiMode && multiProps?.selectedAssets) {
      setLocalSelection(multiProps.selectedAssets);
    }
  }, [isOpen, isMultiMode, multiProps?.selectedAssets]);

  // Get unique categories from assets
  const categories = useMemo(() => {
    const cats = new Set<string>();
    visualAssets.forEach((asset) => {
      if (asset.category) {
        cats.add(asset.category);
      }
    });
    return Array.from(cats);
  }, [visualAssets]);

  // Filter assets based on search and category
  const filteredAssets = useMemo(() => {
    return visualAssets.filter((asset) => {
      const matchesSearch =
        !searchQuery ||
        asset.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        asset.category?.toLowerCase().includes(searchQuery.toLowerCase());

      const matchesCategory = !selectedCategory || asset.category === selectedCategory;

      return matchesSearch && matchesCategory;
    });
  }, [visualAssets, searchQuery, selectedCategory]);

  // Check if asset is selected and get its mode
  const getAssetMode = useCallback(
    (assetId: string): AssetMode | null => {
      const selected = localSelection.find((a) => a.id === assetId);
      return selected?.mode || null;
    },
    [localSelection]
  );

  // Toggle asset selection with mode
  const handleToggleAsset = useCallback(
    (asset: VisualAsset, assetMode: AssetMode) => {
      const existing = localSelection.find((a) => a.id === asset.id);

      if (existing) {
        if (existing.mode === assetMode) {
          // Remove if same mode clicked
          setLocalSelection(localSelection.filter((a) => a.id !== asset.id));
        } else {
          // Update mode
          setLocalSelection(
            localSelection.map((a) => (a.id === asset.id ? { ...a, mode: assetMode } : a))
          );
        }
      } else {
        // Add new selection
        setLocalSelection([
          ...localSelection,
          {
            id: asset.id,
            mode: assetMode,
            thumbnail_url: asset.thumbnail_url || asset.file_url || undefined,
            title: asset.name,
          },
        ]);
      }
    },
    [localSelection]
  );

  // Quick select with default mode based on category (multi-select)
  // Or single-select click handler
  const handleQuickSelect = useCallback(
    (asset: VisualAsset) => {
      if (isSingleMode && singleProps?.onSelect) {
        // Single-select: immediate selection and close
        singleProps.onSelect(asset);
        onClose();
      } else {
        // Multi-select: toggle with default mode
        const categoryConfig = CATEGORY_CONFIG[asset.category || 'other'];
        const defaultMode = categoryConfig?.defaultMode || 'style';
        handleToggleAsset(asset, defaultMode);
      }
    },
    [isSingleMode, singleProps, onClose, handleToggleAsset]
  );

  // Remove asset from selection
  const handleRemove = useCallback(
    (assetId: string) => {
      setLocalSelection(localSelection.filter((a) => a.id !== assetId));
    },
    [localSelection]
  );

  // Confirm selection (multi-select only)
  const handleConfirm = useCallback(() => {
    if (isMultiMode && multiProps?.onUpdateAssets) {
      multiProps.onUpdateAssets(localSelection);
    }
    onClose();
  }, [isMultiMode, multiProps, localSelection, onClose]);

  // Cancel and reset
  const handleCancel = useCallback(() => {
    if (isMultiMode && multiProps?.selectedAssets) {
      setLocalSelection(multiProps.selectedAssets);
    }
    onClose();
  }, [isMultiMode, multiProps, onClose]);

  return (
    <Dialog open={isOpen} onOpenChange={handleCancel}>
      <DialogContent className="max-w-3xl max-h-[85vh] flex flex-col p-0 gap-0">
        <DialogHeader className="px-6 py-4 border-b border-gray-200 dark:border-gray-800">
          <DialogTitle className="flex items-center gap-2">
            <ImageIcon className="w-5 h-5 text-blue-500" />
            {isSingleMode && singleProps?.title
              ? singleProps.title
              : 'Selecionar Contexto Visual'}
          </DialogTitle>
          {isSingleMode && singleProps?.description && (
            <DialogDescription className="text-sm text-gray-500 dark:text-gray-400">
              {singleProps.description}
            </DialogDescription>
          )}
        </DialogHeader>

        {/* Search and Filters */}
        <div className="px-6 py-3 border-b border-gray-200 dark:border-gray-800 space-y-3">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Buscar assets..."
              className="pl-9"
            />
          </div>

          {/* Category filters */}
          <div className="flex items-center gap-2 flex-wrap">
            <Filter className="w-4 h-4 text-gray-400" />
            <button
              onClick={() => setSelectedCategory(null)}
              className={cn(
                'px-3 py-1 rounded-full text-xs font-medium transition-colors',
                selectedCategory === null
                  ? 'bg-blue-500 text-white'
                  : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700'
              )}
            >
              Todos
            </button>
            {categories.map((cat) => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat === selectedCategory ? null : cat)}
                className={cn(
                  'px-3 py-1 rounded-full text-xs font-medium transition-colors capitalize',
                  selectedCategory === cat
                    ? 'bg-blue-500 text-white'
                    : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700'
                )}
              >
                {CATEGORY_CONFIG[cat]?.label || cat}
              </button>
            ))}
          </div>
        </div>

        {/* Assets Grid */}
        <div className="flex-1 overflow-y-auto p-6">
          {filteredAssets.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-gray-500">
              <ImageIcon className="w-12 h-12 mb-3 opacity-50" />
              <p className="text-sm">Nenhum asset encontrado</p>
            </div>
          ) : (
            <div className="grid grid-cols-5 gap-3">
              {filteredAssets.map((asset) => {
                const assetMode = getAssetMode(asset.id);
                const isSelected = assetMode !== null;
                const modeConfig = assetMode ? ASSET_MODES[assetMode] : null;

                return (
                  <div key={asset.id} className="relative group">
                    <div
                      role="button"
                      tabIndex={0}
                      onClick={() => handleQuickSelect(asset)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault();
                          handleQuickSelect(asset);
                        }
                      }}
                      className={cn(
                        'relative w-full aspect-square rounded-lg overflow-hidden cursor-pointer',
                        'ring-2 transition-all duration-200',
                        isSelected && modeConfig
                          ? modeConfig.ringClass
                          : 'ring-transparent hover:ring-gray-300 dark:hover:ring-gray-600'
                      )}
                    >
                      {asset.thumbnail_url || asset.file_url ? (
                        <Image
                          src={asset.thumbnail_url || asset.file_url || ''}
                          alt={asset.name}
                          fill
                          className="object-cover"
                          sizes="120px"
                        />
                      ) : (
                        <div className="w-full h-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center">
                          <ImageIcon className="w-6 h-6 text-gray-400" />
                        </div>
                      )}

                      {/* Mode overlay */}
                      {isSelected && modeConfig && (
                        <>
                          <div
                            className={cn('absolute inset-0 opacity-20', modeConfig.bgClass)}
                          />
                          <div
                            className={cn(
                              'absolute top-1 right-1 w-6 h-6 rounded-full flex items-center justify-center',
                              modeConfig.bgClass
                            )}
                          >
                            {(() => {
                              const Icon = modeConfig.icon;
                              return <Icon className="w-3.5 h-3.5 text-white" />;
                            })()}
                          </div>
                        </>
                      )}

                      {/* Hover overlay with mode options (multi-select only) */}
                      {isMultiMode && (
                        <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-1">
                          {Object.entries(ASSET_MODES).map(([modeKey, config]) => {
                            const Icon = config.icon;
                            const isCurrentMode = assetMode === modeKey;
                            return (
                              <button
                                key={modeKey}
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleToggleAsset(asset, modeKey as AssetMode);
                                }}
                                className={cn(
                                  'w-8 h-8 rounded-full flex items-center justify-center transition-all',
                                  isCurrentMode
                                    ? cn(config.bgClass, 'text-white')
                                    : 'bg-white/20 text-white hover:bg-white/40'
                                )}
                                title={config.label}
                              >
                                <Icon className="w-4 h-4" />
                              </button>
                            );
                          })}
                        </div>
                      )}
                    </div>

                    {/* Asset name */}
                    <p className="mt-1 text-xs text-gray-500 dark:text-gray-400 truncate text-center">
                      {asset.name}
                    </p>

                    {/* Category badge */}
                    {asset.category && (
                      <span className="absolute -bottom-0.5 left-1/2 -translate-x-1/2 px-1.5 py-0.5 rounded text-[9px] font-medium bg-gray-800/80 text-white opacity-0 group-hover:opacity-100 transition-opacity">
                        {CATEGORY_CONFIG[asset.category]?.label || asset.category}
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Selected assets preview and actions (multi-select only) */}
        {isMultiMode && (
          <div className="px-6 py-4 border-t border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-900/50">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                {/* Selected count */}
                <span className="text-sm text-gray-600 dark:text-gray-400">
                  {localSelection.length} selecionado{localSelection.length !== 1 && 's'}
                </span>

                {/* Selected thumbnails */}
                {localSelection.length > 0 && (
                  <div className="flex -space-x-2">
                    {localSelection.slice(0, 5).map((selected) => {
                      const asset = visualAssets.find((a) => a.id === selected.id);
                      const selectedModeConfig = ASSET_MODES[selected.mode];
                      if (!asset) return null;
                      return (
                        <div
                          key={asset.id}
                          className={cn(
                            'relative w-8 h-8 rounded-lg overflow-hidden ring-2 ring-white dark:ring-gray-900',
                            selectedModeConfig.ringClass
                          )}
                        >
                          <Image
                            src={asset.thumbnail_url || asset.file_url || ''}
                            alt={asset.name}
                            fill
                            className="object-cover"
                            sizes="32px"
                          />
                          <button
                            onClick={() => handleRemove(asset.id)}
                            className="absolute inset-0 bg-black/50 opacity-0 hover:opacity-100 transition-opacity flex items-center justify-center"
                          >
                            <X className="w-4 h-4 text-white" />
                          </button>
                        </div>
                      );
                    })}
                    {localSelection.length > 5 && (
                      <div className="w-8 h-8 rounded-lg bg-gray-200 dark:bg-gray-700 ring-2 ring-white dark:ring-gray-900 flex items-center justify-center">
                        <span className="text-xs text-gray-600 dark:text-gray-400">
                          +{localSelection.length - 5}
                        </span>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Actions */}
              <div className="flex items-center gap-2">
                <Button variant="outline" onClick={handleCancel}>
                  Cancelar
                </Button>
                <Button onClick={handleConfirm} className="gap-2">
                  <Check className="w-4 h-4" />
                  Confirmar
                </Button>
              </div>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

export default AssetPickerModal;
