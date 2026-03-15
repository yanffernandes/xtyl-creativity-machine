
/**
 * EditMode Component
 * Feature 029: fal.ai Migration - Image Editing
 *
 * Unified editing interface with:
 * - Base image selection from gallery
 * - Additional reference images (visual context)
 * - Brush/mask support for GPT-Image 1.5/edit
 * - Model selector, format, and variations
 */

import { useState, useRef, useCallback, useEffect, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import Image from 'next/image';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Paintbrush,
  Wand2,
  Loader2,
  ImageIcon,
  X,
  ImagePlus,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { TooltipProvider } from '@/components/ui/tooltip';
import { toast } from 'sonner';
import { BrushCanvas, type BrushCanvasRef } from './BrushCanvas';
import { BrushToolbar } from './BrushToolbar';
import { ModelSelector } from './ModelSelector';
import { ModelParameters } from './ModelParameters';
import { VariationsSelector } from './VariationsSelector';
import { ReferenceAssetSelector, type SelectedAsset, type AssetMode } from './ReferenceAssetSelector';
import { useBrushCanvas } from '@/hooks/useBrushCanvas';
import { uploadMaskFromDataUrl, generateImageUnified, getImageModels } from '@/lib/api';
import type { GeneratedImage } from '@/types/image-studio';

interface EditModeProps {
  projectId: string;
  selectedImage: GeneratedImage | null;
  onSelectImage: () => void;
  onEditComplete: (result: GeneratedImage) => void;
  isLoading?: boolean;
  className?: string;
}

// Format options for aspect_ratio models
const ASPECT_RATIO_OPTIONS = [
  { value: '1:1', label: '1:1' },
  { value: '16:9', label: '16:9' },
  { value: '9:16', label: '9:16' },
  { value: '4:3', label: '4:3' },
  { value: '3:4', label: '3:4' },
];

// Format options for image_size models
const IMAGE_SIZE_OPTIONS = [
  { value: '1024x1024', label: '1:1' },
  { value: '1536x1024', label: '3:2' },
  { value: '1024x1536', label: '2:3' },
  { value: '1792x1024', label: '16:9' },
  { value: '1024x1792', label: '9:16' },
];

export function EditMode({
  projectId,
  selectedImage,
  onSelectImage,
  onEditComplete,
  isLoading = false,
  className,
}: EditModeProps) {
  const [prompt, setPrompt] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [canvasSize, setCanvasSize] = useState({ width: 512, height: 512 });
  const [originalImageSize, setOriginalImageSize] = useState({ width: 512, height: 512 });

  // Model selection state
  const [selectedModel, setSelectedModel] = useState<string>('fal-ai/gpt-image-1.5/edit');
  const [modelParams, setModelParams] = useState<Record<string, unknown>>({});

  // Visual context (additional reference images)
  const [contextAssets, setContextAssets] = useState<SelectedAsset[]>([]);
  const [assetMode, setAssetMode] = useState<AssetMode>('compose');

  // Fetch visible image-to-image models from API (admin-filtered)
  const { data: apiModels = [] } = useQuery({
    queryKey: ['image-models', 'image-to-image'],
    queryFn: () => getImageModels('image-to-image'),
    staleTime: 1000 * 60 * 5,
  });

  // Build the model list from API response (visibility + parameters)
  const availableModels = useMemo(
    () =>
      apiModels.map((m: any) => ({
        id: m.id,
        name: m.name,
        description: m.description,
        top_provider: m.top_provider,
        model_type: m.model_type,
        supports_mask: m.supports_mask,
        max_images: m.max_images,
      })),
    [apiModels],
  );

  // Get model config from API data
  const currentApiModel = apiModels.find((m: any) => m.id === selectedModel);
  const supportsMask = currentApiModel?.supports_mask ?? false;
  const maxImages = currentApiModel?.max_images ?? 4;
  const modelParameters = currentApiModel?.parameters ?? [];

  // Format type based on model
  const hasAspectRatio = modelParameters.some((p: any) => p.name === 'aspect_ratio');
  const hasImageSize = modelParameters.some((p: any) => p.name === 'image_size');

  // Current values
  const currentFormat = hasAspectRatio
    ? (modelParams.aspect_ratio as string) || '1:1'
    : hasImageSize
      ? (modelParams.image_size as string) || '1024x1024'
      : '1:1';
  const numImages = (modelParams.num_images as number) || 1;
  const formatOptions = hasImageSize ? IMAGE_SIZE_OPTIONS : ASPECT_RATIO_OPTIONS;

  const canvasRef = useRef<BrushCanvasRef>(null);
  const brush = useBrushCanvas({
    defaultBrushSize: 20,
    defaultOpacity: 1,
  });

  // Reset params when model changes
  useEffect(() => {
    const model = apiModels.find((m: any) => m.id === selectedModel);
    if (model?.parameters?.length) {
      const defaults = model.parameters.reduce((acc: Record<string, unknown>, param: any) => {
        acc[param.name] = param.default;
        return acc;
      }, {});
      setModelParams(defaults);
    }
  }, [selectedModel, apiModels]);

  // Calculate canvas size based on image
  useEffect(() => {
    if (selectedImage?.file_url) {
      const img = new window.Image();
      img.onload = () => {
        setOriginalImageSize({ width: img.width, height: img.height });
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

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (isProcessing || !supportsMask) return;
      if (e.ctrlKey && e.key === 'z' && !e.shiftKey) {
        e.preventDefault();
        handleUndo();
      }
      if ((e.ctrlKey && e.key === 'y') || (e.ctrlKey && e.shiftKey && e.key === 'z')) {
        e.preventDefault();
        handleRedo();
      }
      if (e.key === 'b' || e.key === 'B') brush.setBrushMode('brush');
      if (e.key === 'e' || e.key === 'E') brush.setBrushMode('eraser');
      if (e.key === '[') brush.setBrushSize(brush.brushSize - 5);
      if (e.key === ']') brush.setBrushSize(brush.brushSize + 5);
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [brush, isProcessing, supportsMask]);

  const handleUndo = useCallback(() => {
    const imageData = brush.undo();
    if (imageData && canvasRef.current) canvasRef.current.setImageData(imageData);
  }, [brush]);

  const handleRedo = useCallback(() => {
    const imageData = brush.redo();
    if (imageData && canvasRef.current) canvasRef.current.setImageData(imageData);
  }, [brush]);

  const handleClear = useCallback(() => {
    canvasRef.current?.clear();
    brush.clear();
  }, [brush]);

  const handleHistoryCapture = useCallback(() => {
    const imageData = canvasRef.current?.getImageData();
    if (imageData) brush.pushHistory(imageData);
  }, [brush]);

  const handleMaskChange = useCallback(() => {
    const hasPaint = canvasRef.current?.hasPaint() ?? false;
    brush.setHasMask(hasPaint);
  }, [brush]);

  const handleFormatChange = (value: string) => {
    if (hasAspectRatio) {
      setModelParams({ ...modelParams, aspect_ratio: value });
    } else if (hasImageSize) {
      setModelParams({ ...modelParams, image_size: value });
    }
  };

  const handleVariationsChange = (value: number) => {
    setModelParams({ ...modelParams, num_images: value });
  };

  const handleEdit = async () => {
    if (!selectedImage?.file_url || !prompt.trim()) {
      toast.error('Selecione uma imagem e adicione uma instrução');
      return;
    }

    const hasMask = supportsMask && canvasRef.current?.hasPaint();
    if (supportsMask && !hasMask) {
      toast.error('Desenhe a área que deseja editar ou escolha outro modelo');
      return;
    }

    setIsProcessing(true);

    try {
      let maskUrl: string | undefined;

      if (hasMask && canvasRef.current) {
        const maskData = canvasRef.current.exportMask(originalImageSize.width, originalImageSize.height);
        const { url } = await uploadMaskFromDataUrl(maskData.dataUrl, projectId);
        maskUrl = url;
      }

      // Build image URLs: base image + context images
      const imageUrls = [selectedImage.file_url];
      contextAssets.forEach((asset) => {
        if (asset.thumbnail_url) {
          imageUrls.push(asset.thumbnail_url);
        }
      });

      const result = await generateImageUnified({
        prompt: prompt.trim(),
        project_id: projectId,
        model: selectedModel,
        image_urls: imageUrls,
        mask_url: maskUrl,
        params: modelParams,
      });

      const generatedImage: GeneratedImage = {
        success: true,
        index: 0,
        document_id: result.document_id,
        file_url: result.file_url,
        thumbnail_url: result.thumbnail_url,
        title: result.title,
        generatedAt: new Date().toISOString(),
      };

      onEditComplete(generatedImage);
      toast.success('Imagem editada com sucesso');

      if (supportsMask) handleClear();
      setPrompt('');
    } catch (error) {
      console.error('Edit error:', error);
      toast.error('Falha ao editar imagem. Tente novamente.');
    } finally {
      setIsProcessing(false);
    }
  };

  const isDisabled = isLoading || isProcessing;

  // Parameters to exclude (handled separately)
  const excludedParams = ['num_images', 'aspect_ratio', 'image_size'];

  return (
    <TooltipProvider>
      <div className={cn('space-y-4', className)}>
        {/* Model selector */}
        <ModelSelector
          models={availableModels}
          value={selectedModel}
          onChange={setSelectedModel}
          disabled={isProcessing}
          isLoading={false}
        />

        {/* Mask support indicator */}
        {supportsMask && (
          <div className="flex items-center gap-2 p-2 rounded-lg bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800">
            <Paintbrush className="h-4 w-4 text-blue-600 dark:text-blue-400" />
            <span className="text-xs text-blue-700 dark:text-blue-300">
              Este modelo suporta pincel (máscara). Pinte a área que deseja editar.
            </span>
          </div>
        )}

        {/* Format + Variations row */}
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-600 dark:text-gray-400">
              Formato
            </label>
            <div className="flex flex-wrap gap-1">
              {formatOptions.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => handleFormatChange(option.value)}
                  disabled={isDisabled}
                  className={cn(
                    'px-3 h-9 rounded-lg text-sm font-medium transition-all border',
                    currentFormat === option.value
                      ? 'bg-blue-500 text-white border-blue-500 shadow-sm'
                      : 'bg-white/50 dark:bg-gray-900/50 text-gray-700 dark:text-gray-300 border-gray-200/50 dark:border-gray-700/50 hover:border-blue-300',
                    isDisabled && 'opacity-50 cursor-not-allowed'
                  )}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>

          <VariationsSelector
            value={numImages}
            onChange={handleVariationsChange}
            max={maxImages}
            disabled={isDisabled}
          />
        </div>

        {/* Other model parameters */}
        <ModelParameters
          parameters={modelParameters}
          modelName={currentApiModel?.name}
          values={modelParams}
          onChange={setModelParams}
          disabled={isProcessing}
          excludeParams={excludedParams}
          showHeader={false}
        />

        {/* Image selection area */}
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
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleClear()}
                className="absolute -top-2 -right-2 z-10 h-8 w-8 p-0 rounded-full bg-white dark:bg-gray-800 shadow-md"
              >
                <X className="h-4 w-4" />
              </Button>

              {/* Change image button */}
              <Button
                variant="ghost"
                size="sm"
                onClick={onSelectImage}
                className="absolute -top-2 left-0 z-10 h-8 px-2 rounded-full bg-white dark:bg-gray-800 shadow-md text-xs"
              >
                <ImagePlus className="h-3 w-3 mr-1" />
                Trocar
              </Button>

              {/* Brush toolbar (only when model supports mask) */}
              <AnimatePresence>
                {supportsMask && (
                  <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className="mb-3 mt-6"
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
              <div className={cn('flex justify-center', !supportsMask && 'mt-6')}>
                {supportsMask ? (
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
                    <Image
                      src={selectedImage.file_url || ''}
                      alt="Image to edit"
                      fill
                      className="object-contain"
                      loading="lazy"
                      unoptimized
                    />
                  </div>
                )}
              </div>
            </div>

            {/* Visual context (additional reference images) */}
            <ReferenceAssetSelector
              projectId={projectId}
              selectedAssets={contextAssets}
              assetMode={assetMode}
              onAssetsChange={setContextAssets}
              onAssetModeChange={setAssetMode}
              disabled={isDisabled}
              maxAssets={5}
            />

            {/* Prompt input */}
            <div className="space-y-2">
              <Textarea
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder={
                  supportsMask
                    ? 'Descreva o que adicionar na área marcada... Ex: "Adicionar uma rosa vermelha"'
                    : 'Descreva as alterações desejadas... Ex: "Mudar o fundo para uma praia ao pôr do sol"'
                }
                disabled={isDisabled}
                className="min-h-[80px] resize-none"
              />
              <p className="text-xs text-muted-foreground">
                {supportsMask
                  ? 'Pinte as áreas que deseja editar e descreva o que adicionar'
                  : 'A IA irá interpretar sua instrução e aplicar as alterações'}
              </p>
            </div>

            {/* Submit button */}
            <Button
              onClick={handleEdit}
              disabled={isDisabled || !prompt.trim() || (supportsMask && !brush.hasMask)}
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
                  Aplicar Edição
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
