import { useState, useEffect } from 'react';
import {
  Check,
  Image as ImageIcon,
  Loader2,
  X,
  Palette,
  Layers,
  ImagePlus,
} from 'lucide-react';
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
import api from '@/lib/api';
import type { VisualAsset } from '@/types/image-studio';

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

const MODES = [
  {
    value: 'style' as const,
    label: 'Estilo',
    icon: Palette,
    description: 'Usar o estilo visual das imagens',
  },
  {
    value: 'compose' as const,
    label: 'Compor',
    icon: Layers,
    description: 'Incorporar elementos das imagens',
  },
  {
    value: 'base' as const,
    label: 'Base',
    icon: ImagePlus,
    description: 'Usar como imagem base',
  },
];

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

  useEffect(() => {
    if (isOpen && assets.length === 0) {
      setIsLoading(true);
      api
        .get(`/api/visual-assets?project_id=${projectId}`)
        .then((r) => setAssets(r.data?.assets || []))
        .catch(() => {})
        .finally(() => setIsLoading(false));
    }
  }, [isOpen, projectId, assets.length]);

  const toggleAsset = (asset: VisualAsset) => {
    const isSelected = selectedAssets.some((a) => a.id === asset.id);
    if (isSelected) {
      onAssetsChange(selectedAssets.filter((a) => a.id !== asset.id));
    } else if (selectedAssets.length < maxAssets) {
      onAssetsChange([
        ...selectedAssets,
        {
          id: asset.id,
          thumbnail_url: asset.thumbnail_url ?? undefined,
          title: asset.name,
        },
      ]);
    }
  };

  const currentMode = MODES.find((o) => o.value === assetMode);

  return (
    <div className={cn('space-y-3', className)}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <ImageIcon className="h-4 w-4 text-muted-foreground" />
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
            onClick={() => onAssetsChange([])}
            disabled={disabled}
            className="h-6 px-2 text-xs text-muted-foreground hover:text-destructive"
          >
            Limpar
          </Button>
        )}
      </div>

      {selectedAssets.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {selectedAssets.map((asset) => (
            <div
              key={asset.id}
              className="relative group rounded-lg overflow-hidden border border-border"
            >
              {asset.thumbnail_url ? (
                <img
                  src={asset.thumbnail_url}
                  alt={asset.title || 'Asset'}
                  className="w-12 h-12 object-cover"
                  loading="lazy"
                />
              ) : (
                <div className="w-12 h-12 bg-muted flex items-center justify-center">
                  <ImageIcon className="h-4 w-4 text-muted-foreground" />
                </div>
              )}
              {!disabled && (
                <button
                  onClick={() =>
                    onAssetsChange(
                      selectedAssets.filter((a) => a.id !== asset.id)
                    )
                  }
                  className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center"
                >
                  <X className="h-4 w-4 text-white" />
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      <div className="flex items-center gap-2">
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
            </div>
            <ScrollArea className="h-64">
              {isLoading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                </div>
              ) : assets.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-8 text-center px-4">
                  <p className="text-sm text-muted-foreground">
                    Nenhum asset visual no projeto
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
                          <img
                            src={asset.thumbnail_url}
                            alt={asset.name}
                            className="w-full h-full object-cover"
                            loading="lazy"
                          />
                        ) : (
                          <div className="w-full h-full bg-muted flex items-center justify-center">
                            <ImageIcon className="h-4 w-4 text-muted-foreground" />
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

        {selectedAssets.length > 0 && (
          <Select
            value={assetMode}
            onValueChange={(v) => onAssetModeChange(v as AssetMode)}
            disabled={disabled}
          >
            <SelectTrigger className="w-32">
              <SelectValue>
                {currentMode && (
                  <span className="flex items-center gap-1.5">
                    <currentMode.icon className="h-3.5 w-3.5" />
                    {currentMode.label}
                  </span>
                )}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              {MODES.map((o) => (
                <SelectItem key={o.value} value={o.value}>
                  <div className="flex items-center gap-2">
                    <o.icon className="h-4 w-4" />
                    <div>
                      <div className="font-medium">{o.label}</div>
                      <div className="text-xs text-muted-foreground">
                        {o.description}
                      </div>
                    </div>
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
      </div>

      {selectedAssets.length > 0 && currentMode && (
        <p className="text-xs text-muted-foreground">
          {currentMode.description}
        </p>
      )}
    </div>
  );
}
