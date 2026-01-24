'use client';

/**
 * ImageStudio Component
 * Feature 029: Image Studio Evolution - fal.ai Migration
 *
 * Tab-based interface for image operations:
 * - Criar: Generate images (existing functionality)
 * - Editar: Brush inpainting and natural language editing
 * - Ajustar: Quick functions (remove BG, upscale, enhance)
 * - Vídeo: Placeholder for future video generation
 */

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ImageIcon,
  Trash2,
  Wand2,
  Edit3,
  Sliders,
  Video,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { TooltipProvider } from '@/components/ui/tooltip';
import { useImageStudio } from '@/hooks/useImageStudio';
import { CreateMode } from './CreateMode';
import { EditMode } from './EditMode';
import { AdjustMode } from './AdjustMode';
import { VariationGrid } from './VariationGrid';
import { ImageExpandModal } from './ImageExpandModal';
import { AssetPickerModal } from './AssetPickerModal';
import type { AvailableModel, StylePreset, GeneratedImage } from '@/types/image-studio';

interface ImageStudioProps {
  projectId: string;
  imageModels: AvailableModel[];
  visualStylePresets?: StylePreset[];
  layoutPresets?: StylePreset[];
  /** @deprecated Use visualStylePresets instead */
  stylePresets?: StylePreset[];
  defaultModel?: string;
  isLoading?: boolean;
  sourceDocumentId?: string | null;
  className?: string;
}

type TabValue = 'create' | 'edit' | 'adjust' | 'video';

export function ImageStudio({
  projectId,
  imageModels,
  visualStylePresets = [],
  layoutPresets = [],
  stylePresets = [], // deprecated
  defaultModel,
  isLoading = false,
  sourceDocumentId = null,
  className,
}: ImageStudioProps) {
  const [activeTab, setActiveTab] = useState<TabValue>('create');
  const [expandedImage, setExpandedImage] = useState<GeneratedImage | null>(null);
  const [showAssetPicker, setShowAssetPicker] = useState(false);
  const [selectedImageForEdit, setSelectedImageForEdit] = useState<GeneratedImage | null>(null);

  // Use new presets if provided, fall back to deprecated stylePresets
  const effectiveVisualStyles = visualStylePresets.length > 0 ? visualStylePresets : stylePresets;
  const effectiveLayouts = layoutPresets;

  const studio = useImageStudio({
    projectId,
    defaultModel,
    imageModels,
    visualStylePresets: effectiveVisualStyles,
    layoutPresets: effectiveLayouts,
  });

  const handleExpand = (image: GeneratedImage) => {
    setExpandedImage(image);
  };

  const handleCloseExpand = () => {
    setExpandedImage(null);
  };

  const handleAttach = async (image: GeneratedImage) => {
    if (!sourceDocumentId) return;
    await studio.attach(image, sourceDocumentId);
  };

  const handleSelectImageForEdit = () => {
    setShowAssetPicker(true);
  };

  const handleAssetSelect = (asset: any) => {
    // Convert asset to GeneratedImage format
    const generatedImage: GeneratedImage = {
      success: true,
      index: 0,
      document_id: asset.id,
      file_url: asset.file_url,
      thumbnail_url: asset.thumbnail_url,
      title: asset.title || 'Selected image',
    };
    setSelectedImageForEdit(generatedImage);
    setShowAssetPicker(false);
  };

  const handleEditComplete = (result: GeneratedImage) => {
    // Add result to variations
    studio.addVariation(result);
  };

  const handleAdjustComplete = (result: GeneratedImage) => {
    // Add result to variations
    studio.addVariation(result);
  };

  return (
    <TooltipProvider>
      <div className={cn('space-y-6', className)}>
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center">
              <ImageIcon className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                Estúdio Visual
              </h2>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Crie e edite imagens com IA
              </p>
            </div>
          </div>

          {studio.variations.length > 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={studio.clearVariations}
              className="text-gray-500 hover:text-red-500"
            >
              <Trash2 className="h-4 w-4 mr-1" />
              Limpar
            </Button>
          )}
        </div>

        {/* Main controls card */}
        <motion.div
          layout
          className={cn(
            'rounded-2xl overflow-hidden',
            'bg-white/70 dark:bg-gray-900/70',
            'backdrop-blur-2xl',
            'border border-gray-200/50 dark:border-gray-700/50',
            'shadow-xl shadow-black/5'
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

            {/* Visual style presets */}
            <StylePresetGrid
              presets={effectiveVisualStyles}
              selectedPresetSlug={studio.visualStyle}
              onSelectPreset={studio.setVisualStyle}
              isLoading={isLoading}
              title="Estilo Visual"
              icon={<Sparkles className="w-4 h-4" />}
            />

            {/* Layout presets */}
            {effectiveLayouts.length > 0 && (
              <StylePresetGrid
                presets={effectiveLayouts}
                selectedPresetSlug={studio.layout}
                onSelectPreset={studio.setLayout}
                isLoading={isLoading}
                title="Diagramação"
                icon={<LayoutGrid className="w-4 h-4" />}
              />
            )}

            {/* Basic controls row */}
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              <FormatSelector
                value={studio.aspectRatio}
                onChange={studio.setAspectRatio}
                disabled={studio.isGenerating}
              />

              <CreativitySlider
                value={studio.creativity}
                onChange={studio.setCreativity}
                disabled={studio.isGenerating}
                className="col-span-2 md:col-span-1"
              />
            </div>

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
                  <ModelSelector
                    models={imageModels}
                    value={studio.model}
                    onChange={studio.setModel}
                    disabled={studio.isGenerating}
                    isLoading={isLoading}
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

                  {/* Feature 028 (T039): Brand context toggle */}
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

        {/* Generated variations */}
        <AnimatePresence mode="wait">
          {(studio.variations.length > 0 || studio.isGenerating) && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className={cn(
                'rounded-2xl overflow-hidden',
                'bg-white/70 dark:bg-gray-900/70',
                'backdrop-blur-2xl',
                'border border-gray-200/50 dark:border-gray-700/50',
                'shadow-xl shadow-black/5',
                'p-6'
              )}
            >
              <VariationGrid
                variations={studio.variations}
                isGenerating={studio.isGenerating}
                pendingCount={studio.pendingCount}
                onExpand={handleExpand}
                onSave={studio.save}
                onRefine={studio.refine}
                onAttach={handleAttach}
                canAttach={!!sourceDocumentId}
              />
            </motion.div>
          )}
        </AnimatePresence>

        {/* Error display */}
        <AnimatePresence>
          {studio.error && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="p-4 rounded-xl bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800"
            >
              <p className="text-sm text-red-600 dark:text-red-400">
                {studio.error}
              </p>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Expanded image modal */}
        <ImageExpandModal
          image={expandedImage}
          images={studio.variations.filter((v) => v.success)}
          isOpen={!!expandedImage}
          onClose={handleCloseExpand}
          onSave={studio.save}
          onRefine={studio.refine}
        />
      </div>
    </TooltipProvider>
  );
}

export default ImageStudio;
