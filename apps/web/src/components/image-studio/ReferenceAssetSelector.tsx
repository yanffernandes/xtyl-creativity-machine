
/**
 * ReferenceAssetSelector Component
 * Feature 028: Agency Studio Flow
 *
 * Allows users to manually select visual assets as reference for batch generation.
 * Users can select up to 5 assets and choose how they should be used (style, compose, base).
 */

import { useState, useEffect } from 'react';
import NextImage from 'next/image';
import { Check, Image, Loader2, X, Palette, Layers, ImagePlus } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { getVisualAssets, type VisualAsset } from '@/lib/api';

export type AssetMode = 'style' | 'compose' | 'base';

export interface SelectedAsset {
  id: string;
  thumbnail_url?: string;
  title?: string;
}

interface ReferenceAssetSelectorProps {
  projectId: string;
  selectedAssets: SelectedAsset[];
  assetMode: AssetMode;
  onAssetsChange: (assets: SelectedAsset[]) => void;
  onAssetModeChange: (mode: AssetMode) => void;
  disabled?: boolean;
  maxAssets?: number;
  className?: string;
}

const ASSET_MODE_OPTIONS = [
  { value: 'style', label: 'Estilo', icon: Palette, description: 'Usar o estilo visual das imagens' },
  { value: 'compose', label: 'Compor', icon: Layers, description: 'Incorporar elementos das imagens' },
  { value: 'base', label: 'Base', icon: ImagePlus, description: 'Usar como imagem base' },
] as const;

export function ReferenceAssetSelector({
  projectId,
  selectedAssets,
  assetMode,
  onAssetsChange,
  onAssetModeChange,
  disabled = false,
  maxAssets = 5,
  className,
}: ReferenceAssetSelectorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [assets, setAssets] = useState<VisualAsset[]>([]);

  // Load visual assets when popover opens
  useEffect(() => {
    if (isOpen && assets.length === 0) {
      loadAssets();
    }
  }, [isOpen]);

  const loadAssets = async () => {
    if (!projectId) return;

    setIsLoading(true);
    try {
      const response = await getVisualAssets(projectId);
      setAssets(response.assets || []);
    } catch (err) {
      console.error('Failed to load visual assets:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const toggleAsset = (asset: VisualAsset) => {
    const isSelected = selectedAssets.some((a) => a.id === asset.id);

    if (isSelected) {
      onAssetsChange(selectedAssets.filter((a) => a.id !== asset.id));
    } else if (selectedAssets.length < maxAssets) {
      onAssetsChange([
        ...selectedAssets,
        {
          id: asset.id,
          thumbnail_url: asset.thumbnail_url,
          title: asset.title,
        },
      ]);
    }
  };

  const removeAsset = (assetId: string) => {
    onAssetsChange(selectedAssets.filter((a) => a.id !== assetId));
  };

  const clearAll = () => {
    onAssetsChange([]);
  };

  const currentModeOption = ASSET_MODE_OPTIONS.find((o) => o.value === assetMode);

  return (
    <div className={cn('space-y-3', className)}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Image className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm font-medium">Assets de Referência</span>
          {selectedAssets.length > 0 && (
            <Badge variant="secondary" className="text-xs">
              {selectedAssets.length}/{maxAssets}
            </Badge>
          )}
        </div>
        {selectedAssets.length > 0 && (
          <Button
            variant="ghost"
            size="sm"
            onClick={clearAll}
            disabled={disabled}
            className="h-6 px-2 text-xs text-muted-foreground hover:text-destructive"
          >
            Limpar
          </Button>
        )}
      </div>

      {/* Selected assets preview */}
      {selectedAssets.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {selectedAssets.map((asset) => (
            <div
              key={asset.id}
              className="relative group rounded-lg overflow-hidden border border-border"
            >
              {asset.thumbnail_url ? (
                <NextImage
                  src={asset.thumbnail_url}
                  alt={asset.title || 'Asset'}
                  width={48}
                  height={48}
                  className="object-cover"
                  loading="lazy"
                  unoptimized
                />
              ) : (
                <div className="w-12 h-12 bg-muted flex items-center justify-center">
                  <Image className="h-4 w-4 text-muted-foreground" />
                </div>
              )}
              {!disabled && (
                <button
                  onClick={() => removeAsset(asset.id)}
                  className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center"
                >
                  <X className="h-4 w-4 text-white" />
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Controls row */}
      <div className="flex items-center gap-2">
        {/* Asset selector popover */}
        <Popover open={isOpen} onOpenChange={setIsOpen}>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              size="sm"
              disabled={disabled}
              className="flex-1"
            >
              <ImagePlus className="h-4 w-4 mr-2" />
              {selectedAssets.length === 0
                ? 'Selecionar Assets'
                : 'Adicionar Mais'}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-80 p-0" align="start">
            <div className="p-3 border-b">
              <p className="text-sm font-medium">
                Selecione até {maxAssets} assets
              </p>
              <p className="text-xs text-muted-foreground">
                Clique nos assets para selecionar/deselecionar
              </p>
            </div>
            <ScrollArea className="h-64">
              {isLoading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                </div>
              ) : assets.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-8 text-center px-4">
                  <Image className="h-8 w-8 text-muted-foreground/50 mb-2" />
                  <p className="text-sm text-muted-foreground">
                    Nenhum asset visual no projeto
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Faça upload de imagens na aba Assets
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-4 gap-1 p-2">
                  {assets.map((asset) => {
                    const isSelected = selectedAssets.some(
                      (a) => a.id === asset.id
                    );
                    const isDisabled =
                      !isSelected && selectedAssets.length >= maxAssets;

                    return (
                      <button
                        key={asset.id}
                        onClick={() => !isDisabled && toggleAsset(asset)}
                        disabled={isDisabled}
                        className={cn(
                          'relative aspect-square rounded-md overflow-hidden border-2 transition-all',
                          isSelected
                            ? 'border-primary ring-2 ring-primary/20'
                            : 'border-transparent hover:border-muted-foreground/30',
                          isDisabled && 'opacity-50 cursor-not-allowed'
                        )}
                      >
                        {asset.thumbnail_url ? (
                          <NextImage
                            src={asset.thumbnail_url}
                            alt={asset.title || 'Asset'}
                            fill
                            className="object-cover"
                            loading="lazy"
                            unoptimized
                          />
                        ) : (
                          <div className="w-full h-full bg-muted flex items-center justify-center">
                            <Image className="h-4 w-4 text-muted-foreground" />
                          </div>
                        )}
                        {isSelected && (
                          <div className="absolute inset-0 bg-primary/20 flex items-center justify-center">
                            <Check className="h-5 w-5 text-primary" />
                          </div>
                        )}
                      </button>
                    );
                  })}
                </div>
              )}
            </ScrollArea>
          </PopoverContent>
        </Popover>

        {/* Asset mode selector */}
        {selectedAssets.length > 0 && (
          <Select
            value={assetMode}
            onValueChange={(value) => onAssetModeChange(value as AssetMode)}
            disabled={disabled}
          >
            <SelectTrigger className="w-32">
              <SelectValue>
                {currentModeOption && (
                  <span className="flex items-center gap-1.5">
                    <currentModeOption.icon className="h-3.5 w-3.5" />
                    {currentModeOption.label}
                  </span>
                )}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              {ASSET_MODE_OPTIONS.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  <div className="flex items-center gap-2">
                    <option.icon className="h-4 w-4" />
                    <div>
                      <div className="font-medium">{option.label}</div>
                      <div className="text-xs text-muted-foreground">
                        {option.description}
                      </div>
                    </div>
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
      </div>

      {/* Helper text */}
      {selectedAssets.length > 0 && currentModeOption && (
        <p className="text-xs text-muted-foreground">
          {currentModeOption.description}
        </p>
      )}
    </div>
  );
}

export default ReferenceAssetSelector;
