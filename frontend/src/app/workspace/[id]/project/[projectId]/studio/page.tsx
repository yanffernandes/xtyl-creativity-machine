'use client';

/**
 * Visual Generation Studio Page
 * Feature 027: Visual Generation Studio
 *
 * Full-screen dedicated page for AI image generation with:
 * - Style presets selection
 * - Prompt input with suggestions
 * - Format/aspect ratio selection
 * - Model selection
 * - Creativity slider
 * - Real-time batch generation with SSE
 */

import { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';
import {
  ArrowLeft,
  ImageIcon,
  Sparkles,
  Trash2,
  Loader2,
  Wand2,
  LayoutGrid,
} from 'lucide-react';
import { useAuthStore } from '@/lib/store';
import { useProjectBootstrap } from '@/hooks/useProjectBootstrap';
import { useImageStudio } from '@/hooks/useImageStudio';
import { useCreativePromptGenerator } from '@/hooks/useCreativePromptGenerator';
import { Button } from '@/components/ui/button';
import { TooltipProvider } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';

// Image Studio Components
import { PromptInput } from '@/components/image-studio/PromptInput';
import { StylePresetGrid } from '@/components/image-studio/StylePresetGrid';
import { FormatSelector } from '@/components/image-studio/FormatSelector';
import { ModelSelector } from '@/components/image-studio/ModelSelector';
import { CreativitySlider } from '@/components/image-studio/CreativitySlider';
import { VariationGrid } from '@/components/image-studio/VariationGrid';
import { ImageExpandModal } from '@/components/image-studio/ImageExpandModal';
import { DocumentPromptSource } from '@/components/image-studio/DocumentPromptSource';
import { VisualContextPreview } from '@/components/image-studio/VisualContextPreview';
import { GenerationSummary } from '@/components/image-studio/GenerationSummary';
import type { GeneratedImage } from '@/types/image-studio';

export default function StudioPage() {
  const params = useParams();
  const router = useRouter();
  const workspaceId = params.id as string;
  const projectId = params.projectId as string;

  const { session, isLoading: authLoading } = useAuthStore();
  const [expandedImage, setExpandedImage] = useState<GeneratedImage | null>(null);

  // Document prompt source state
  const [selectedDocumentId, setSelectedDocumentId] = useState<string | null>(null);
  const [useAgent, setUseAgent] = useState(false);

  // Generation summary expanded state
  const [showGenerationSummary, setShowGenerationSummary] = useState(true);

  // Fetch bootstrap data (models, presets, etc.)
  const { data: bootstrapData, isLoading: bootstrapLoading } = useProjectBootstrap(projectId);

  // Filter presets by type
  const allPresets = bootstrapData?.style_presets || [];
  const visualStylePresets = allPresets.filter(p => p.preset_type === 'visual_style');
  const layoutPresets = allPresets.filter(p => p.preset_type === 'layout');

  // Image studio state management
  // Use default_image_model from system config, fallback to first available
  const defaultImageModel = bootstrapData?.models?.default_image_model || bootstrapData?.models?.image?.[0]?.id;
  const studio = useImageStudio({
    projectId,
    defaultModel: defaultImageModel,
    imageModels: bootstrapData?.models?.image || [],
    visualStylePresets,
    layoutPresets,
  });

  // Creative prompt generator
  const promptGenerator = useCreativePromptGenerator({
    projectId,
    onPromptGenerated: (prompt) => {
      studio.setPrompt(prompt);
      toast.success('Prompt criativo gerado');
    },
  });

  // Redirect if not authenticated
  useEffect(() => {
    if (!authLoading && !session) {
      router.push('/login');
    }
  }, [authLoading, session, router]);

  const handleBack = () => {
    router.push(`/workspace/${workspaceId}/project/${projectId}`);
  };

  const handleExpand = (image: GeneratedImage) => {
    setExpandedImage(image);
  };

  const handleCloseExpand = () => {
    setExpandedImage(null);
  };

  // Handler for document content
  const handleUseDocumentContent = useCallback(
    (content: string) => {
      studio.setPrompt(content);
    },
    [studio]
  );

  // Handler for creative prompt generation
  const handleGenerateCreativePrompt = useCallback(async () => {
    const doc = bootstrapData?.recent_documents?.find(
      (d) => d.id === selectedDocumentId
    );
    const content = doc?.content || studio.prompt;

    if (!content.trim()) {
      toast.error('Selecione um documento ou insira um texto para gerar o prompt');
      return;
    }

    await promptGenerator.generateCreativePrompt(content);
  }, [bootstrapData?.recent_documents, selectedDocumentId, studio.prompt, promptGenerator]);

  // Handler for attaching image to selected document
  const handleAttachImage = useCallback(
    async (image: GeneratedImage) => {
      if (!selectedDocumentId) {
        toast.error('Selecione um documento para anexar a imagem');
        return;
      }
      await studio.attach(image, selectedDocumentId);
    },
    [selectedDocumentId, studio]
  );

  // Loading state
  if (authLoading || bootstrapLoading) {
    return (
      <div className="h-screen w-screen flex items-center justify-center bg-gradient-to-br from-gray-50 via-blue-50/30 to-purple-50/20 dark:from-gray-950 dark:via-blue-950/20 dark:to-purple-950/10">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
          <span className="text-gray-500 dark:text-gray-400">Carregando estúdio...</span>
        </div>
      </div>
    );
  }

  return (
    <TooltipProvider>
      <div className="h-screen w-screen flex flex-col bg-gradient-to-br from-gray-50 via-blue-50/30 to-purple-50/20 dark:from-gray-950 dark:via-blue-950/20 dark:to-purple-950/10">
        {/* Header */}
        <header className="flex-shrink-0 h-16 border-b border-gray-200/50 dark:border-gray-800/50 backdrop-blur-xl bg-white/70 dark:bg-gray-900/70">
          <div className="h-full max-w-[1800px] mx-auto px-6 flex items-center justify-between">
            {/* Left side */}
            <div className="flex items-center gap-4">
              <Button
                variant="ghost"
                size="icon"
                onClick={handleBack}
                className="hover:bg-gray-100 dark:hover:bg-gray-800"
              >
                <ArrowLeft className="h-5 w-5" />
              </Button>

              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center shadow-lg shadow-blue-500/25">
                  <ImageIcon className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h1 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                    Estúdio Visual
                  </h1>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    {bootstrapData?.project?.name || 'Projeto'}
                  </p>
                </div>
              </div>
            </div>

            {/* Right side */}
            <div className="flex items-center gap-3">
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

              {studio.isGenerating && (
                <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-blue-500/10 text-blue-600 dark:text-blue-400">
                  <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                  >
                    <Sparkles className="h-4 w-4" />
                  </motion.div>
                  <span className="text-sm font-medium">Gerando...</span>
                </div>
              )}
            </div>
          </div>
        </header>

        {/* Main content */}
        <main className="flex-1 overflow-hidden">
          <div className="h-full max-w-[1800px] mx-auto flex">
            {/* Left panel - Controls */}
            <div className="w-[400px] flex-shrink-0 border-r border-gray-200/50 dark:border-gray-800/50 overflow-y-auto">
              <div className="p-6 space-y-6">
                {/* Prompt input */}
                <PromptInput
                  value={studio.prompt}
                  onChange={studio.setPrompt}
                  onGenerate={studio.generate}
                  isGenerating={studio.isGenerating}
                />

                {/* Document prompt source */}
                <DocumentPromptSource
                  documents={bootstrapData?.recent_documents || []}
                  selectedDocumentId={selectedDocumentId}
                  onSelectDocument={setSelectedDocumentId}
                  onUseDocumentContent={handleUseDocumentContent}
                  useAgent={useAgent}
                  onToggleAgent={setUseAgent}
                  onGenerateCreativePrompt={handleGenerateCreativePrompt}
                  isGeneratingPrompt={promptGenerator.isGenerating}
                  disabled={studio.isGenerating}
                />

                {/* Visual context preview with per-asset mode selection */}
                <VisualContextPreview
                  visualAssets={bootstrapData?.visual_context || []}
                  selectedAssets={studio.selectedAssetsWithModes}
                  onUpdateAssets={studio.updateSelectedAssets}
                  onSetReferenceImage={studio.setReferenceImage}
                  referenceImageUrl={studio.referenceImageUrl}
                  disabled={studio.isGenerating}
                />

                {/* Visual style presets */}
                <StylePresetGrid
                  presets={visualStylePresets}
                  selectedPresetSlug={studio.visualStyle}
                  onSelectPreset={studio.setVisualStyle}
                  isLoading={bootstrapLoading}
                  title="Estilo Visual"
                  icon={<Sparkles className="w-4 h-4" />}
                />

                {/* Layout presets */}
                <StylePresetGrid
                  presets={layoutPresets}
                  selectedPresetSlug={studio.layout}
                  onSelectPreset={studio.setLayout}
                  isLoading={bootstrapLoading}
                  title="Diagramação"
                  icon={<LayoutGrid className="w-4 h-4" />}
                />

                {/* Model selector */}
                <ModelSelector
                  models={bootstrapData?.models?.image || []}
                  value={studio.model}
                  onChange={studio.setModel}
                  disabled={studio.isGenerating}
                  isLoading={bootstrapLoading}
                />

                {/* Format selector */}
                <FormatSelector
                  value={studio.aspectRatio}
                  onChange={studio.setAspectRatio}
                  disabled={studio.isGenerating}
                />

                {/* Creativity slider */}
                <CreativitySlider
                  value={studio.creativity}
                  onChange={studio.setCreativity}
                  disabled={studio.isGenerating}
                />

                {/* Reference image indicator */}
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

                {/* Generation Summary - shows what will be sent to the API */}
                <GenerationSummary
                  prompt={studio.prompt}
                  selectedVisualStyle={studio.selectedVisualStyle}
                  selectedLayout={studio.selectedLayout}
                  referenceAssets={studio.selectedAssetsWithModes}
                  model={studio.model}
                  modelName={bootstrapData?.models?.image?.find(m => m.id === studio.model)?.name}
                  aspectRatio={studio.aspectRatio}
                  creativity={studio.creativity}
                  applyBrandContext={studio.applyBrandContext}
                  projectContext={bootstrapData?.settings?.client_name ? 'Projeto configurado' : null}
                  isExpanded={showGenerationSummary}
                  onToggleExpanded={() => setShowGenerationSummary(!showGenerationSummary)}
                />
              </div>
            </div>

            {/* Right panel - Generated images */}
            <div className="flex-1 overflow-y-auto p-6">
              <AnimatePresence mode="wait">
                {studio.variations.length === 0 && !studio.isGenerating ? (
                  // Empty state
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="h-full flex flex-col items-center justify-center"
                  >
                    <div className="w-32 h-32 rounded-full bg-gradient-to-br from-blue-100 to-purple-100 dark:from-blue-900/30 dark:to-purple-900/30 flex items-center justify-center mb-6">
                      <Wand2 className="w-12 h-12 text-blue-500" />
                    </div>
                    <h2 className="text-2xl font-semibold text-gray-900 dark:text-gray-100 mb-2">
                      Crie imagens incríveis
                    </h2>
                    <p className="text-gray-500 dark:text-gray-400 text-center max-w-md mb-8">
                      Digite um prompt descrevendo a imagem que você quer criar,
                      escolha um estilo e clique em &ldquo;Gerar&rdquo;.
                    </p>
                    <div className="flex flex-wrap gap-2 justify-center max-w-lg">
                      {['Fotográfico', 'Aquarela', 'Render 3D', 'Ilustração', 'Minimalista'].map(
                        (style) => (
                          <span
                            key={style}
                            className="px-3 py-1.5 rounded-full bg-gray-100 dark:bg-gray-800 text-sm text-gray-600 dark:text-gray-400"
                          >
                            {style}
                          </span>
                        )
                      )}
                    </div>
                  </motion.div>
                ) : (
                  // Variations grid
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -20 }}
                  >
                    <VariationGrid
                      variations={studio.variations}
                      isGenerating={studio.isGenerating}
                      pendingCount={studio.pendingCount}
                      onExpand={handleExpand}
                      onSave={studio.save}
                      onRefine={studio.refine}
                      onAttach={handleAttachImage}
                      canAttach={!!selectedDocumentId}
                    />
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </main>

        {/* Error display */}
        <AnimatePresence>
          {studio.error && (
            <motion.div
              initial={{ opacity: 0, y: 50 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 50 }}
              className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50"
            >
              <div className="px-6 py-3 rounded-xl bg-red-500 text-white shadow-xl shadow-red-500/25">
                <p className="text-sm font-medium">{studio.error}</p>
              </div>
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
