'use client';

/**
 * QuickActionsBar Component
 * Feature 029: fal.ai Migration - Quick Functions
 *
 * Compact action bar for quick image operations.
 * Used in gallery view for individual images.
 *
 * Each button has its own loading state (allows parallel operations per FR-042)
 */

import { useState, useCallback } from 'react';
import {
  Eraser,
  Maximize2,
  Sparkles,
  Download,
  Loader2,
  Check,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from '@/components/ui/tooltip';
import { toast } from 'sonner';
import { removeBackground, upscaleImage, enhanceImage } from '@/lib/api';
import type { GeneratedImage } from '@/types/image-studio';

interface QuickActionsBarProps {
  /** Project ID for API calls */
  projectId: string;
  /** Image to perform actions on */
  image: GeneratedImage;
  /** Callback when operation is complete */
  onOperationComplete?: (result: GeneratedImage) => void;
  /** Size variant */
  size?: 'sm' | 'default';
  /** Additional class names */
  className?: string;
}

export function QuickActionsBar({
  projectId,
  image,
  onOperationComplete,
  size = 'default',
  className,
}: QuickActionsBarProps) {
  // Individual loading states for each action
  const [loadingStates, setLoadingStates] = useState<Record<string, boolean>>({
    removeBg: false,
    upscale: false,
    enhance: false,
    download: false,
  });
  const [completedStates, setCompletedStates] = useState<Record<string, boolean>>({});

  const setLoading = (id: string, loading: boolean) => {
    setLoadingStates((prev) => ({ ...prev, [id]: loading }));
  };

  const setComplete = (id: string) => {
    setCompletedStates((prev) => ({ ...prev, [id]: true }));
    setTimeout(() => {
      setCompletedStates((prev) => ({ ...prev, [id]: false }));
    }, 2000);
  };

  // Remove background
  const handleRemoveBackground = useCallback(async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!image.file_url) return;

    setLoading('removeBg', true);
    try {
      const result = await removeBackground({
        image_url: image.file_url,
        project_id: projectId,
        output_format: 'png',
      });

      const generatedImage: GeneratedImage = {
        success: true,
        index: 0,
        document_id: result.document_id,
        file_url: result.file_url,
        thumbnail_url: result.thumbnail_url,
        title: 'Background Removed',
        generatedAt: new Date().toISOString(),
      };

      onOperationComplete?.(generatedImage);
      setComplete('removeBg');
      toast.success('Fundo removido');
    } catch (error) {
      console.error('Remove background error:', error);
      toast.error('Falha ao remover fundo');
    } finally {
      setLoading('removeBg', false);
    }
  }, [image, projectId, onOperationComplete]);

  // Upscale 2x
  const handleUpscale = useCallback(async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!image.file_url) return;

    setLoading('upscale', true);
    try {
      const result = await upscaleImage({
        image_url: image.file_url,
        project_id: projectId,
        scale_factor: 2,
      });

      const generatedImage: GeneratedImage = {
        success: true,
        index: 0,
        document_id: result.document_id,
        file_url: result.file_url,
        thumbnail_url: result.thumbnail_url,
        title: 'Upscaled 2x',
        generatedAt: new Date().toISOString(),
      };

      onOperationComplete?.(generatedImage);
      setComplete('upscale');
      toast.success('Imagem ampliada 2x');
    } catch (error) {
      console.error('Upscale error:', error);
      toast.error('Falha ao ampliar');
    } finally {
      setLoading('upscale', false);
    }
  }, [image, projectId, onOperationComplete]);

  // Enhance
  const handleEnhance = useCallback(async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!image.file_url) return;

    setLoading('enhance', true);
    try {
      const result = await enhanceImage({
        image_url: image.file_url,
        project_id: projectId,
        enhancement_type: 'auto',
      });

      const generatedImage: GeneratedImage = {
        success: true,
        index: 0,
        document_id: result.document_id,
        file_url: result.file_url,
        thumbnail_url: result.thumbnail_url,
        title: 'Enhanced',
        generatedAt: new Date().toISOString(),
      };

      onOperationComplete?.(generatedImage);
      setComplete('enhance');
      toast.success('Imagem melhorada');
    } catch (error) {
      console.error('Enhance error:', error);
      toast.error('Falha ao melhorar');
    } finally {
      setLoading('enhance', false);
    }
  }, [image, projectId, onOperationComplete]);

  // Download
  const handleDownload = useCallback(async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!image.file_url) return;

    setLoading('download', true);
    try {
      const response = await fetch(image.file_url);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${image.title || 'image'}.png`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      setComplete('download');
    } catch (error) {
      console.error('Download error:', error);
      toast.error('Falha ao baixar');
    } finally {
      setLoading('download', false);
    }
  }, [image]);

  const buttonSize = size === 'sm' ? 'h-7 w-7' : 'h-8 w-8';
  const iconSize = size === 'sm' ? 'h-3.5 w-3.5' : 'h-4 w-4';

  const ActionButton = ({
    id,
    icon: Icon,
    tooltip,
    onClick,
  }: {
    id: string;
    icon: typeof Eraser;
    tooltip: string;
    onClick: (e: React.MouseEvent) => void;
  }) => {
    const isLoading = loadingStates[id];
    const isComplete = completedStates[id];

    return (
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="ghost"
            size="sm"
            onClick={onClick}
            disabled={isLoading}
            className={cn(
              buttonSize,
              'p-0',
              isComplete && 'text-green-500 hover:text-green-600'
            )}
          >
            {isLoading ? (
              <Loader2 className={cn(iconSize, 'animate-spin')} />
            ) : isComplete ? (
              <Check className={iconSize} />
            ) : (
              <Icon className={iconSize} />
            )}
          </Button>
        </TooltipTrigger>
        <TooltipContent side="bottom">
          <p>{tooltip}</p>
        </TooltipContent>
      </Tooltip>
    );
  };

  return (
    <TooltipProvider>
      <div
        className={cn(
          'flex items-center gap-1 p-1',
          'bg-black/50 backdrop-blur-sm rounded-lg',
          className
        )}
        onClick={(e) => e.stopPropagation()}
      >
        <ActionButton
          id="removeBg"
          icon={Eraser}
          tooltip="Remover fundo"
          onClick={handleRemoveBackground}
        />
        <ActionButton
          id="upscale"
          icon={Maximize2}
          tooltip="Ampliar 2x"
          onClick={handleUpscale}
        />
        <ActionButton
          id="enhance"
          icon={Sparkles}
          tooltip="Melhorar"
          onClick={handleEnhance}
        />
        <ActionButton
          id="download"
          icon={Download}
          tooltip="Baixar"
          onClick={handleDownload}
        />
      </div>
    </TooltipProvider>
  );
}

export default QuickActionsBar;
