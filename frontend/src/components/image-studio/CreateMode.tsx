'use client';

/**
 * CreateMode Component
 * Feature 029: fal.ai Migration - Image Generation
 *
 * Extracted from ImageStudio - handles image generation (Criar tab).
 * Maintains existing generation functionality from Feature 027/028.
 */

import { useState } from 'react';
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
import { FormatSelector } from './FormatSelector';
import { ModelSelector } from './ModelSelector';
import { CreativitySlider } from './CreativitySlider';
import { ReferenceAssetSelector } from './ReferenceAssetSelector';
import type { AvailableModel, StylePreset } from '@/types/image-studio';

export interface CreateModeStudio {
  prompt: string;
  setPrompt: (prompt: string) => void;
  visualStyle: string | null;
  setVisualStyle: (style: string | null) => void;
  layout: string | null;
  setLayout: (layout: string | null) => void;
  aspectRatio: string;
  setAspectRatio: (ratio: string) => void;
  model: string;
  setModel: (model: string) => void;
  creativity: number;
  setCreativity: (value: number) => void;
  referenceAssets: string[];
  setReferenceAssets: (assets: string[]) => void;
  assetMode: 'style' | 'compose' | 'base';
  setAssetMode: (mode: 'style' | 'compose' | 'base') => void;
  applyBrandContext: boolean;
  setApplyBrandContext: (apply: boolean) => void;
  referenceImageUrl: string | null;
  setReferenceImage: (url: string | null) => void;
  isGenerating: boolean;
  generate: () => Promise<void>;
}

interface CreateModeProps {
  /** Project ID */
  projectId: string;
  /** Studio state and actions */
  studio: CreateModeStudio;
  /** Available image models */
  imageModels: AvailableModel[];
  /** Visual style presets */
  visualStylePresets?: StylePreset[];
  /** Layout presets */
  layoutPresets?: StylePreset[];
  /** Whether data is loading */
  isLoading?: boolean;
  /** Additional class names */
  className?: string;
}

export function CreateMode({
  projectId,
  studio,
  imageModels,
  visualStylePresets = [],
  layoutPresets = [],
  isLoading = false,
  className,
}: CreateModeProps) {
  const [showAdvanced, setShowAdvanced] = useState(false);

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
  );
}

export default CreateMode;
