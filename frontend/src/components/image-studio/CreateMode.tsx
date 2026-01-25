'use client';

/**
 * CreateMode Component
 * Feature 029: fal.ai Migration - Image Generation
 *
 * Extracted from ImageStudio - handles image generation (Criar tab).
 */

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  Settings2,
  ChevronDown,
  ChevronUp,
  Sparkles,
  LayoutGrid,
  Palette,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { PromptInput } from './PromptInput';
import { StylePresetGrid } from './StylePresetGrid';
import { ModelSelector } from './ModelSelector';
import { ModelParameters } from './ModelParameters';
import { VariationsSelector } from './VariationsSelector';
import { CreativitySlider } from './CreativitySlider';
import { ReferenceAssetSelector } from './ReferenceAssetSelector';
import type { StylePreset, AspectRatioId } from '@/types/image-studio';
import type { SelectedAsset, AssetMode } from '@/hooks/useImageStudio';
import {
  TEXT_TO_IMAGE_MODELS,
  IMAGE_TO_IMAGE_MODELS,
  getModelById,
} from '@/lib/modelConfig';

export interface CreateModeStudio {
  prompt: string;
  setPrompt: (prompt: string) => void;
  visualStyle: string | null;
  setVisualStyle: (style: string | null) => void;
  layout: string | null;
  setLayout: (layout: string | null) => void;
  aspectRatio: AspectRatioId;
  setAspectRatio: (ratio: AspectRatioId) => void;
  model: string;
  setModel: (model: string) => void;
  modelParams: Record<string, unknown>;
  setModelParams: (params: Record<string, unknown>) => void;
  creativity: number;
  setCreativity: (value: number) => void;
  referenceAssets: SelectedAsset[];
  setReferenceAssets: (assets: SelectedAsset[]) => void;
  assetMode: AssetMode;
  setAssetMode: (mode: AssetMode) => void;
  applyBrandContext: boolean;
  setApplyBrandContext: (apply: boolean) => void;
  referenceImageUrl: string | null;
  setReferenceImage: (url: string | null) => void;
  isGenerating: boolean;
  generate: () => Promise<void>;
}

interface CreateModeProps {
  projectId: string;
  studio: CreateModeStudio;
  visualStylePresets?: StylePreset[];
  layoutPresets?: StylePreset[];
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

export function CreateMode({
  projectId,
  studio,
  visualStylePresets = [],
  layoutPresets = [],
  isLoading = false,
  className,
}: CreateModeProps) {
  const [showAdvanced, setShowAdvanced] = useState(false);

  // Determine if we have reference images (switches to edit models)
  const hasReferenceImage = !!studio.referenceImageUrl || studio.referenceAssets.length > 0;

  // Select appropriate models based on whether reference image is present
  const availableModels = hasReferenceImage
    ? IMAGE_TO_IMAGE_MODELS.map((m) => ({
        id: m.id,
        name: m.name,
        description: m.description,
        top_provider: m.provider,
        model_type: m.type,
        supports_mask: m.supportsMask,
        max_images: m.maxImages,
      }))
    : TEXT_TO_IMAGE_MODELS.map((m) => ({
        id: m.id,
        name: m.name,
        description: m.description,
        top_provider: m.provider,
        model_type: m.type,
        supports_mask: m.supportsMask,
        max_images: m.maxImages,
      }));

  // Get current model config
  const currentModel = getModelById(studio.model);
  const maxImages = currentModel?.maxImages ?? 4;

  // Determine format type based on model parameters
  const hasAspectRatio = currentModel?.parameters.some((p) => p.name === 'aspect_ratio');
  const hasImageSize = currentModel?.parameters.some((p) => p.name === 'image_size');

  // Get current format value
  const currentFormat = hasAspectRatio
    ? (studio.modelParams.aspect_ratio as string) || '1:1'
    : hasImageSize
      ? (studio.modelParams.image_size as string) || '1024x1024'
      : '1:1';

  // Get current variations
  const numImages = (studio.modelParams.num_images as number) || 1;

  // Handle format change
  const handleFormatChange = (value: string) => {
    if (hasAspectRatio) {
      studio.setModelParams({ ...studio.modelParams, aspect_ratio: value });
    } else if (hasImageSize) {
      studio.setModelParams({ ...studio.modelParams, image_size: value });
    }
  };

  // Handle variations change
  const handleVariationsChange = (value: number) => {
    studio.setModelParams({ ...studio.modelParams, num_images: value });
  };

  // Format options based on model
  const formatOptions = hasImageSize ? IMAGE_SIZE_OPTIONS : ASPECT_RATIO_OPTIONS;

  // Sync model when reference changes
  useEffect(() => {
    const isCurrentModelValid = availableModels.some((m) => m.id === studio.model);
    if (!isCurrentModelValid && availableModels.length > 0) {
      studio.setModel(availableModels[0].id);
    }
  }, [hasReferenceImage, availableModels, studio.model]);

  // Parameters to exclude from ModelParameters (we handle them separately)
  const excludedParams = ['num_images', 'aspect_ratio', 'image_size'];

  return (
    <motion.div
      layout
      className={cn(
        'rounded-2xl overflow-hidden',
        'bg-white/70 dark:bg-gray-900/70',
        'backdrop-blur-2xl',
        'border border-gray-200/50 dark:border-gray-700/50',
        'shadow-xl shadow-black/5',
        className
      )}
    >
      <div className="p-6 space-y-6">
        {/* Prompt input */}
        <PromptInput
          value={studio.prompt}
          onChange={studio.setPrompt}
          onGenerate={studio.generate}
          isGenerating={studio.isGenerating}
        />

        {/* Model selector - visible at top */}
        <ModelSelector
          models={availableModels}
          value={studio.model}
          onChange={studio.setModel}
          disabled={studio.isGenerating}
          isLoading={isLoading}
        />

        {/* Visual style presets */}
        {visualStylePresets.length > 0 && (
          <StylePresetGrid
            presets={visualStylePresets}
            selectedPresetSlug={studio.visualStyle}
            onSelectPreset={studio.setVisualStyle}
            isLoading={isLoading}
            title="Estilo Visual"
            icon={<Sparkles className="w-4 h-4" />}
          />
        )}

        {/* Layout presets */}
        {layoutPresets.length > 0 && (
          <StylePresetGrid
            presets={layoutPresets}
            selectedPresetSlug={studio.layout}
            onSelectPreset={studio.setLayout}
            isLoading={isLoading}
            title="Diagramação"
            icon={<LayoutGrid className="w-4 h-4" />}
          />
        )}

        {/* Format + Variations row */}
        <div className="grid grid-cols-2 gap-4">
          {/* Format selector */}
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
                  disabled={studio.isGenerating}
                  className={cn(
                    'px-3 h-9 rounded-lg text-sm font-medium transition-all',
                    'border',
                    currentFormat === option.value
                      ? 'bg-blue-500 text-white border-blue-500 shadow-sm'
                      : 'bg-white/50 dark:bg-gray-900/50 text-gray-700 dark:text-gray-300 border-gray-200/50 dark:border-gray-700/50 hover:border-blue-300 dark:hover:border-blue-600',
                    studio.isGenerating && 'opacity-50 cursor-not-allowed'
                  )}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>

          {/* Variations selector */}
          <VariationsSelector
            value={numImages}
            onChange={handleVariationsChange}
            max={maxImages}
            disabled={studio.isGenerating}
          />
        </div>

        {/* Creativity slider */}
        <CreativitySlider
          value={studio.creativity}
          onChange={studio.setCreativity}
          disabled={studio.isGenerating}
        />

        {/* Advanced settings (collapsible) */}
        <Collapsible open={showAdvanced} onOpenChange={setShowAdvanced}>
          <CollapsibleTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              className="w-full justify-center gap-2 text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
            >
              <Settings2 className="h-4 w-4" />
              Configurações avançadas
              {showAdvanced ? (
                <ChevronUp className="h-4 w-4" />
              ) : (
                <ChevronDown className="h-4 w-4" />
              )}
            </Button>
          </CollapsibleTrigger>

          <CollapsibleContent>
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="pt-4 space-y-4"
            >
              {/* Model-specific parameters (excluding handled ones) */}
              <ModelParameters
                modelId={studio.model}
                values={studio.modelParams}
                onChange={studio.setModelParams}
                disabled={studio.isGenerating}
                excludeParams={excludedParams}
                showHeader={false}
              />

              {/* Feature 028: Reference asset selector */}
              <ReferenceAssetSelector
                projectId={projectId}
                selectedAssets={studio.referenceAssets}
                assetMode={studio.assetMode}
                onAssetsChange={studio.setReferenceAssets}
                onAssetModeChange={studio.setAssetMode}
                disabled={studio.isGenerating}
              />

              {/* Feature 028: Brand context toggle */}
              <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                <div className="flex items-center gap-2">
                  <Palette className="h-4 w-4 text-muted-foreground" />
                  <Label htmlFor="brand-context" className="text-sm font-medium cursor-pointer">
                    Aplicar Brand Context
                  </Label>
                </div>
                <Switch
                  id="brand-context"
                  checked={studio.applyBrandContext}
                  onCheckedChange={studio.setApplyBrandContext}
                  disabled={studio.isGenerating}
                />
              </div>
              <p className="text-xs text-muted-foreground -mt-2 px-1">
                Enriquece o prompt com cores e tipografia da marca definidas nas configurações do projeto.
              </p>

              {/* Reference image section */}
              {studio.referenceImageUrl && (
                <div className="p-3 rounded-lg bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-blue-700 dark:text-blue-300">
                      Imagem de referência ativa
                    </span>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => studio.setReferenceImage(null)}
                      className="text-blue-600 hover:text-blue-800 dark:text-blue-400"
                    >
                      Remover
                    </Button>
                  </div>
                </div>
              )}
            </motion.div>
          </CollapsibleContent>
        </Collapsible>
      </div>
    </motion.div>
  );
}

export default CreateMode;
