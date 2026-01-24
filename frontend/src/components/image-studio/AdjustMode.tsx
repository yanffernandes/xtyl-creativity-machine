'use client';

/**
 * AdjustMode Component
 * Feature 029: fal.ai Migration - Quick Functions
 *
 * Grid of quick utility functions:
 * - Remove Background
 * - Upscale (2x/4x)
 * - Enhance
 * - Download
 *
 * Each operation has individual loading state (allows parallel operations per FR-042)
 */

import { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Eraser,
  Maximize2,
  Sparkles,
  Download,
  ImageIcon,
  Loader2,
  Check,
  X,
  ArrowLeftRight,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { toast } from 'sonner';
import { removeBackground, upscaleImage, enhanceImage } from '@/lib/api';
import type { GeneratedImage } from '@/types/image-studio';

interface QuickAction {
  id: string;
  label: string;
  description: string;
  icon: React.ReactNode;
  action: () => Promise<void>;
  isLoading: boolean;
  isComplete: boolean;
}

interface AdjustModeProps {
  /** Project ID for API calls */
  projectId: string;
  /** Selected image to adjust */
  selectedImage: GeneratedImage | null;
  /** Callback to select an image */
  onSelectImage: () => void;
  /** Callback when operation is complete */
  onOperationComplete: (result: GeneratedImage) => void;
  /** Additional class names */
  className?: string;
}

export function AdjustMode({
  projectId,
  selectedImage,
  onSelectImage,
  onOperationComplete,
  className,
}: AdjustModeProps) {
  // Individual loading states for each operation (allows parallel operations)
  const [loadingStates, setLoadingStates] = useState<Record<string, boolean>>({
    removeBg: false,
    upscale2x: false,
    upscale4x: false,
    enhance: false,
  });
  const [completedStates, setCompletedStates] = useState<Record<string, boolean>>({});
  const [resultImage, setResultImage] = useState<GeneratedImage | null>(null);
  const [showComparison, setShowComparison] = useState(false);

  const setLoading = (id: string, loading: boolean) => {
    setLoadingStates((prev) => ({ ...prev, [id]: loading }));
  };

  const setComplete = (id: string) => {
    setCompletedStates((prev) => ({ ...prev, [id]: true }));
    // Clear complete state after 2 seconds
    setTimeout(() => {
      setCompletedStates((prev) => ({ ...prev, [id]: false }));
    }, 2000);
  };

  // Remove background
  const handleRemoveBackground = useCallback(async () => {
    if (!selectedImage?.file_url) return;

    setLoading('removeBg', true);
    try {
      const result = await removeBackground({
        image_url: selectedImage.file_url,
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

      setResultImage(generatedImage);
      onOperationComplete(generatedImage);
      setComplete('removeBg');
      toast.success('Fundo removido com sucesso');
    } catch (error) {
      console.error('Remove background error:', error);
      toast.error('Falha ao remover fundo');
    } finally {
      setLoading('removeBg', false);
    }
  }, [selectedImage, projectId, onOperationComplete]);

  // Upscale 2x
  const handleUpscale2x = useCallback(async () => {
    if (!selectedImage?.file_url) return;

    setLoading('upscale2x', true);
    try {
      const result = await upscaleImage({
        image_url: selectedImage.file_url,
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

      setResultImage(generatedImage);
      onOperationComplete(generatedImage);
      setComplete('upscale2x');
      toast.success('Imagem ampliada 2x com sucesso');
    } catch (error) {
      console.error('Upscale 2x error:', error);
      toast.error('Falha ao ampliar imagem');
    } finally {
      setLoading('upscale2x', false);
    }
  }, [selectedImage, projectId, onOperationComplete]);

  // Upscale 4x
  const handleUpscale4x = useCallback(async () => {
    if (!selectedImage?.file_url) return;

    setLoading('upscale4x', true);
    try {
      const result = await upscaleImage({
        image_url: selectedImage.file_url,
        project_id: projectId,
        scale_factor: 4,
      });

      const generatedImage: GeneratedImage = {
        success: true,
        index: 0,
        document_id: result.document_id,
        file_url: result.file_url,
        thumbnail_url: result.thumbnail_url,
        title: 'Upscaled 4x',
        generatedAt: new Date().toISOString(),
      };

      setResultImage(generatedImage);
      onOperationComplete(generatedImage);
      setComplete('upscale4x');
      toast.success('Imagem ampliada 4x com sucesso');
    } catch (error) {
      console.error('Upscale 4x error:', error);
      toast.error('Falha ao ampliar imagem');
    } finally {
      setLoading('upscale4x', false);
    }
  }, [selectedImage, projectId, onOperationComplete]);

  // Enhance
  const handleEnhance = useCallback(async () => {
    if (!selectedImage?.file_url) return;

    setLoading('enhance', true);
    try {
      const result = await enhanceImage({
        image_url: selectedImage.file_url,
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

      setResultImage(generatedImage);
      onOperationComplete(generatedImage);
      setComplete('enhance');
      toast.success('Imagem melhorada com sucesso');
    } catch (error) {
      console.error('Enhance error:', error);
      toast.error('Falha ao melhorar imagem');
    } finally {
      setLoading('enhance', false);
    }
  }, [selectedImage, projectId, onOperationComplete]);

  // Download
  const handleDownload = useCallback(async () => {
    const imageToDownload = resultImage || selectedImage;
    if (!imageToDownload?.file_url) return;

    try {
      const response = await fetch(imageToDownload.file_url);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${imageToDownload.title || 'image'}.png`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      toast.success('Download iniciado');
    } catch (error) {
      console.error('Download error:', error);
      toast.error('Falha ao baixar imagem');
    }
  }, [selectedImage, resultImage]);

  const quickActions: QuickAction[] = [
    {
      id: 'removeBg',
      label: 'Remover Fundo',
      description: 'Remove o fundo da imagem',
      icon: <Eraser className="h-5 w-5" />,
      action: handleRemoveBackground,
      isLoading: loadingStates.removeBg,
      isComplete: completedStates.removeBg || false,
    },
    {
      id: 'upscale2x',
      label: 'Ampliar 2x',
      description: 'Dobra a resolução',
      icon: <Maximize2 className="h-5 w-5" />,
      action: handleUpscale2x,
      isLoading: loadingStates.upscale2x,
      isComplete: completedStates.upscale2x || false,
    },
    {
      id: 'upscale4x',
      label: 'Ampliar 4x',
      description: 'Quadruplica a resolução',
      icon: <Maximize2 className="h-5 w-5" />,
      action: handleUpscale4x,
      isLoading: loadingStates.upscale4x,
      isComplete: completedStates.upscale4x || false,
    },
    {
      id: 'enhance',
      label: 'Melhorar',
      description: 'Melhora qualidade geral',
      icon: <Sparkles className="h-5 w-5" />,
      action: handleEnhance,
      isLoading: loadingStates.enhance,
      isComplete: completedStates.enhance || false,
    },
  ];

  const hasAnyLoading = Object.values(loadingStates).some(Boolean);

  return (
    <div className={cn('space-y-4', className)}>
      {/* Image selection */}
      {!selectedImage ? (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className={cn(
            'flex flex-col items-center justify-center',
            'h-64 rounded-xl',
            'border-2 border-dashed border-gray-300 dark:border-gray-600',
            'bg-gray-50/50 dark:bg-gray-800/50',
            'cursor-pointer hover:border-blue-400 transition-colors'
          )}
          onClick={onSelectImage}
        >
          <ImageIcon className="h-12 w-12 text-gray-400 mb-3" />
          <p className="text-sm font-medium text-gray-600 dark:text-gray-300">
            Clique para selecionar uma imagem
          </p>
          <p className="text-xs text-gray-400 mt-1">
            Escolha uma imagem da galeria para ajustar
          </p>
        </motion.div>
      ) : (
        <div className="space-y-4">
          {/* Image preview with comparison toggle */}
          <div className="relative">
            {/* Comparison toggle button */}
            {resultImage && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowComparison(!showComparison)}
                className="absolute top-2 right-2 z-10 gap-1"
              >
                <ArrowLeftRight className="h-3 w-3" />
                {showComparison ? 'Resultado' : 'Comparar'}
              </Button>
            )}

            {/* Image display */}
            <div className="flex justify-center">
              <div className="relative rounded-xl overflow-hidden shadow-lg max-w-md">
                <AnimatePresence mode="wait">
                  {showComparison && resultImage ? (
                    <motion.div
                      key="comparison"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      className="grid grid-cols-2 gap-1"
                    >
                      <div className="relative">
                        <img
                          src={selectedImage.file_url}
                          alt="Original"
                          className="w-full h-auto object-contain"
                        />
                        <span className="absolute bottom-2 left-2 text-xs bg-black/50 text-white px-2 py-1 rounded">
                          Original
                        </span>
                      </div>
                      <div className="relative">
                        <img
                          src={resultImage.file_url}
                          alt="Result"
                          className="w-full h-auto object-contain"
                        />
                        <span className="absolute bottom-2 right-2 text-xs bg-blue-500/80 text-white px-2 py-1 rounded">
                          Resultado
                        </span>
                      </div>
                    </motion.div>
                  ) : (
                    <motion.img
                      key="single"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      src={(resultImage || selectedImage).file_url}
                      alt="Selected image"
                      className="w-full h-auto object-contain max-h-96"
                    />
                  )}
                </AnimatePresence>
              </div>
            </div>
          </div>

          {/* Quick actions grid */}
          <div className="grid grid-cols-2 gap-3">
            {quickActions.map((action) => (
              <Card
                key={action.id}
                className={cn(
                  'cursor-pointer transition-all hover:shadow-md',
                  action.isLoading && 'ring-2 ring-blue-500 animate-pulse',
                  action.isComplete && 'ring-2 ring-green-500'
                )}
                onClick={() => !action.isLoading && action.action()}
              >
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <div
                      className={cn(
                        'flex items-center justify-center w-10 h-10 rounded-lg',
                        action.isComplete
                          ? 'bg-green-100 dark:bg-green-900/30 text-green-600'
                          : 'bg-blue-100 dark:bg-blue-900/30 text-blue-600'
                      )}
                    >
                      {action.isLoading ? (
                        <Loader2 className="h-5 w-5 animate-spin" />
                      ) : action.isComplete ? (
                        <Check className="h-5 w-5" />
                      ) : (
                        action.icon
                      )}
                    </div>
                    <div>
                      <p className="font-medium text-sm">{action.label}</p>
                      <p className="text-xs text-muted-foreground">{action.description}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Download button */}
          <Button
            onClick={handleDownload}
            variant="outline"
            className="w-full gap-2"
            disabled={hasAnyLoading}
          >
            <Download className="h-4 w-4" />
            Baixar Imagem
          </Button>
        </div>
      )}
    </div>
  );
}

export default AdjustMode;
