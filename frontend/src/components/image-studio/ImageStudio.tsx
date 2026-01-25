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
  /** @deprecated Models are now hardcoded - this prop is ignored */
  imageModels?: AvailableModel[];
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

        {/* Tab navigation */}
        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as TabValue)} className="w-full">
          <TabsList className="grid w-full grid-cols-4 h-12">
            <TabsTrigger value="create" className="gap-2">
              <Wand2 className="h-4 w-4" />
              <span className="hidden sm:inline">Criar</span>
            </TabsTrigger>
            <TabsTrigger value="edit" className="gap-2">
              <Edit3 className="h-4 w-4" />
              <span className="hidden sm:inline">Editar</span>
            </TabsTrigger>
            <TabsTrigger value="adjust" className="gap-2">
              <Sliders className="h-4 w-4" />
              <span className="hidden sm:inline">Ajustar</span>
            </TabsTrigger>
            <TabsTrigger value="video" disabled className="gap-2">
              <Video className="h-4 w-4" />
              <span className="hidden sm:inline">Vídeo</span>
            </TabsTrigger>
          </TabsList>

          {/* Create tab content */}
          <TabsContent value="create" className="mt-6">
            <CreateMode
              projectId={projectId}
              studio={studio}
              visualStylePresets={effectiveVisualStyles}
              layoutPresets={effectiveLayouts}
              isLoading={isLoading}
            />
          </TabsContent>

          {/* Edit tab content */}
          <TabsContent value="edit" className="mt-6">
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className={cn(
                'rounded-2xl overflow-hidden',
                'bg-white/70 dark:bg-gray-900/70',
                'backdrop-blur-2xl',
                'border border-gray-200/50 dark:border-gray-700/50',
                'shadow-xl shadow-black/5',
                'p-6'
              )}
            >
              <EditMode
                projectId={projectId}
                selectedImage={selectedImageForEdit}
                onSelectImage={handleSelectImageForEdit}
                onEditComplete={handleEditComplete}
                isLoading={isLoading}
              />
            </motion.div>
          </TabsContent>

          {/* Adjust tab content */}
          <TabsContent value="adjust" className="mt-6">
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className={cn(
                'rounded-2xl overflow-hidden',
                'bg-white/70 dark:bg-gray-900/70',
                'backdrop-blur-2xl',
                'border border-gray-200/50 dark:border-gray-700/50',
                'shadow-xl shadow-black/5',
                'p-6'
              )}
            >
              <AdjustMode
                projectId={projectId}
                selectedImage={selectedImageForEdit}
                onSelectImage={handleSelectImageForEdit}
                onOperationComplete={handleAdjustComplete}
              />
            </motion.div>
          </TabsContent>

          {/* Video tab content (placeholder) */}
          <TabsContent value="video" className="mt-6">
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className={cn(
                'rounded-2xl overflow-hidden',
                'bg-white/70 dark:bg-gray-900/70',
                'backdrop-blur-2xl',
                'border border-gray-200/50 dark:border-gray-700/50',
                'shadow-xl shadow-black/5',
                'p-12'
              )}
            >
              <div className="flex flex-col items-center justify-center text-center space-y-4">
                <div className="w-16 h-16 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center">
                  <Video className="w-8 h-8 text-gray-400" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">
                    Geração de Vídeo
                  </h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400 max-w-md">
                    Em breve você poderá criar vídeos com IA usando modelos como Veo 3.1, Kling 2.6, e LTX-2.
                  </p>
                </div>
              </div>
            </motion.div>
          </TabsContent>
        </Tabs>

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

        {/* Asset picker modal for selecting images to edit/adjust */}
        <AssetPickerModal
          mode="single"
          projectId={projectId}
          isOpen={showAssetPicker}
          onClose={() => setShowAssetPicker(false)}
          onSelect={handleAssetSelect}
          title="Selecione uma imagem"
          description="Escolha uma imagem da galeria para editar ou ajustar"
        />
      </div>
    </TooltipProvider>
  );
}

export default ImageStudio;
