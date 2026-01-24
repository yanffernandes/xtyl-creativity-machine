'use client';

/**
 * EditMode Component
 * Feature 029: fal.ai Migration - Image Editing
 *
 * Two editing modes:
 * 1. Brush Mode - Draw masks for precise inpainting
 * 2. Instruction Mode - Natural language editing
 */

import { useState, useRef, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Paintbrush,
  MessageSquare,
  Wand2,
  Loader2,
  ImageIcon,
  X,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { TooltipProvider } from '@/components/ui/tooltip';
import { toast } from 'sonner';
import { BrushCanvas, type BrushCanvasRef } from './BrushCanvas';
import { BrushToolbar } from './BrushToolbar';
import { useBrushCanvas } from '@/hooks/useBrushCanvas';
import { inpaintImage, editImage, uploadMaskFromDataUrl } from '@/lib/api';
import type { GeneratedImage } from '@/types/image-studio';

type EditModeType = 'brush' | 'instruction';

interface EditModeProps {
  /** Project ID for API calls */
  projectId: string;
  /** Selected image to edit */
  selectedImage: GeneratedImage | null;
  /** Callback to select an image */
  onSelectImage: () => void;
  /** Callback when edit is complete */
  onEditComplete: (result: GeneratedImage) => void;
  /** Whether editing is in progress */
  isLoading?: boolean;
  /** Additional class names */
  className?: string;
}

export function EditMode({
  projectId,
  selectedImage,
  onSelectImage,
  onEditComplete,
  isLoading = false,
  className,
}: EditModeProps) {
  const [mode, setMode] = useState<EditModeType>('brush');
  const [prompt, setPrompt] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [canvasSize, setCanvasSize] = useState({ width: 512, height: 512 });

  const canvasRef = useRef<BrushCanvasRef>(null);

  const brush = useBrushCanvas({
    defaultBrushSize: 20,
    defaultOpacity: 1,
  });

  // Calculate canvas size based on image
  useEffect(() => {
    if (selectedImage?.file_url) {
      const img = new Image();
      img.onload = () => {
        // Scale to fit within max dimensions while maintaining aspect ratio
        const maxSize = 512;
        const scale = Math.min(maxSize / img.width, maxSize / img.height);
        setCanvasSize({
          width: Math.round(img.width * scale),
          height: Math.round(img.height * scale),
        });
      };
      img.src = selectedImage.file_url;
    }
  }, [selectedImage?.file_url]);

  // Handle keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (isProcessing) return;

      // Ctrl+Z for undo
      if (e.ctrlKey && e.key === 'z' && !e.shiftKey) {
        e.preventDefault();
        handleUndo();
      }
      // Ctrl+Y or Ctrl+Shift+Z for redo
      if ((e.ctrlKey && e.key === 'y') || (e.ctrlKey && e.shiftKey && e.key === 'z')) {
        e.preventDefault();
        handleRedo();
      }
      // B for brush mode
      if (e.key === 'b' || e.key === 'B') {
        brush.setBrushMode('brush');
      }
      // E for eraser mode
      if (e.key === 'e' || e.key === 'E') {
        brush.setBrushMode('eraser');
      }
      // [ for decrease brush size
      if (e.key === '[') {
        brush.setBrushSize(brush.brushSize - 5);
      }
      // ] for increase brush size
      if (e.key === ']') {
        brush.setBrushSize(brush.brushSize + 5);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [brush, isProcessing]);

  // Handle undo
  const handleUndo = useCallback(() => {
    const imageData = brush.undo();
    if (imageData && canvasRef.current) {
      canvasRef.current.setImageData(imageData);
    }
  }, [brush]);

  // Handle redo
  const handleRedo = useCallback(() => {
    const imageData = brush.redo();
    if (imageData && canvasRef.current) {
      canvasRef.current.setImageData(imageData);
    }
  }, [brush]);

  // Handle clear
  const handleClear = useCallback(() => {
    canvasRef.current?.clear();
    brush.clear();
  }, [brush]);

  // Capture history before drawing
  const handleHistoryCapture = useCallback(() => {
    const imageData = canvasRef.current?.getImageData();
    if (imageData) {
      brush.pushHistory(imageData);
    }
  }, [brush]);

  // Handle mask change
  const handleMaskChange = useCallback(() => {
    const hasPaint = canvasRef.current?.hasPaint() ?? false;
    brush.setHasMask(hasPaint);
  }, [brush]);

  // Handle inpaint (brush mode)
  const handleInpaint = async () => {
    if (!selectedImage?.file_url || !prompt.trim()) {
      toast.error('Selecione uma imagem e adicione uma instrução');
      return;
    }

    if (!canvasRef.current?.hasPaint()) {
      toast.error('Desenhe a área que deseja editar');
      return;
    }

    setIsProcessing(true);

    try {
      // Export mask
      const maskData = canvasRef.current.exportMask(canvasSize.width, canvasSize.height);

      // Upload mask to storage
      const { url: maskUrl } = await uploadMaskFromDataUrl(maskData.dataUrl, projectId);

      // Call inpaint API
      const result = await inpaintImage({
        image_url: selectedImage.file_url,
        mask_url: maskUrl,
        prompt: prompt.trim(),
        project_id: projectId,
      });

      // Create generated image from result
      const generatedImage: GeneratedImage = {
        success: true,
        index: 0,
        document_id: result.document_id,
        file_url: result.file_url,
        thumbnail_url: result.thumbnail_url,
        title: `Inpaint: ${prompt.substring(0, 30)}...`,
        generatedAt: new Date().toISOString(),
      };

      onEditComplete(generatedImage);
      toast.success('Imagem editada com sucesso');

      // Clear canvas after successful edit
      handleClear();
      setPrompt('');
    } catch (error) {
      console.error('Inpaint error:', error);
      toast.error('Falha ao editar imagem. Tente novamente.');
    } finally {
      setIsProcessing(false);
    }
  };

  // Handle edit (instruction mode)
  const handleEdit = async () => {
    if (!selectedImage?.file_url || !prompt.trim()) {
      toast.error('Selecione uma imagem e adicione uma instrução');
      return;
    }

    setIsProcessing(true);

    try {
      // Call edit API
      const result = await editImage({
        image_url: selectedImage.file_url,
        prompt: prompt.trim(),
        project_id: projectId,
      });

      // Create generated image from result
      const generatedImage: GeneratedImage = {
        success: true,
        index: 0,
        document_id: result.document_id,
        file_url: result.file_url,
        thumbnail_url: result.thumbnail_url,
        title: `Edit: ${prompt.substring(0, 30)}...`,
        generatedAt: new Date().toISOString(),
      };

      onEditComplete(generatedImage);
      toast.success('Imagem editada com sucesso');

      setPrompt('');
    } catch (error) {
      console.error('Edit error:', error);
      toast.error('Falha ao editar imagem. Tente novamente.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleSubmit = mode === 'brush' ? handleInpaint : handleEdit;
  const isDisabled = isLoading || isProcessing;

  return (
    <TooltipProvider>
      <div className={cn('space-y-4', className)}>
        {/* Mode selector */}
        <div className="flex items-center justify-between">
          <Tabs value={mode} onValueChange={(v) => setMode(v as EditModeType)}>
            <TabsList className="grid w-[240px] grid-cols-2">
              <TabsTrigger value="brush" className="gap-2">
                <Paintbrush className="h-4 w-4" />
                Pincel
              </TabsTrigger>
              <TabsTrigger value="instruction" className="gap-2">
                <MessageSquare className="h-4 w-4" />
                Instrução
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </div>

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
              Escolha uma imagem da galeria para editar
            </p>
          </motion.div>
        ) : (
          <div className="space-y-4">
            {/* Selected image with brush canvas */}
            <div className="relative">
              {/* Close button */}
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  handleClear();
                }}
                className="absolute -top-2 -right-2 z-10 h-8 w-8 p-0 rounded-full bg-white dark:bg-gray-800 shadow-md"
              >
                <X className="h-4 w-4" />
              </Button>

              {/* Brush toolbar (only in brush mode) */}
              <AnimatePresence>
                {mode === 'brush' && (
                  <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className="mb-3"
                  >
                    <BrushToolbar
                      brushSize={brush.brushSize}
                      onBrushSizeChange={brush.setBrushSize}
                      brushMode={brush.brushMode}
                      onBrushModeChange={brush.setBrushMode}
                      canUndo={brush.canUndo}
                      canRedo={brush.canRedo}
                      onUndo={handleUndo}
                      onRedo={handleRedo}
                      onClear={handleClear}
                      disabled={isDisabled}
                    />
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Canvas container */}
              <div className="flex justify-center">
                {mode === 'brush' ? (
                  <BrushCanvas
                    ref={canvasRef}
                    imageUrl={selectedImage.file_url || ''}
                    width={canvasSize.width}
                    height={canvasSize.height}
                    brushSize={brush.brushSize}
                    brushMode={brush.brushMode}
                    opacity={brush.opacity}
                    isDrawing={brush.isDrawing}
                    onDrawingChange={brush.setIsDrawing}
                    onMaskChange={handleMaskChange}
                    onHistoryCapture={handleHistoryCapture}
                    disabled={isDisabled}
                    className="shadow-lg"
                  />
                ) : (
                  <div
                    className="relative rounded-lg overflow-hidden shadow-lg"
                    style={{ width: canvasSize.width, height: canvasSize.height }}
                  >
                    <img
                      src={selectedImage.file_url}
                      alt="Image to edit"
                      className="w-full h-full object-contain"
                    />
                  </div>
                )}
              </div>
            </div>

            {/* Prompt input */}
            <div className="space-y-2">
              <Textarea
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder={
                  mode === 'brush'
                    ? 'Descreva o que adicionar na área marcada... Ex: "Adicionar uma rosa vermelha"'
                    : 'Descreva as alterações desejadas... Ex: "Mudar o fundo para uma praia ao pôr do sol"'
                }
                disabled={isDisabled}
                className="min-h-[80px] resize-none"
              />
              <p className="text-xs text-muted-foreground">
                {mode === 'brush'
                  ? 'Pinte as áreas que deseja editar e descreva o que adicionar'
                  : 'A IA irá interpretar sua instrução e aplicar as alterações'}
              </p>
            </div>

            {/* Submit button */}
            <Button
              onClick={handleSubmit}
              disabled={isDisabled || !prompt.trim() || (mode === 'brush' && !brush.hasMask)}
              className="w-full gap-2"
              size="lg"
            >
              {isProcessing ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Processando...
                </>
              ) : (
                <>
                  <Wand2 className="h-4 w-4" />
                  {mode === 'brush' ? 'Aplicar Inpaint' : 'Aplicar Edição'}
                </>
              )}
            </Button>
          </div>
        )}
      </div>
    </TooltipProvider>
  );
}

export default EditMode;
