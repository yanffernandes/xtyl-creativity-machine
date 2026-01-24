'use client';

/**
 * Visual Generation Studio Page
 * Feature 029: Image Studio Evolution - fal.ai Migration
 *
 * Layout: Sidebar (420px) with tabs + Preview area (flex-1)
 * Tabs: Criar | Editar | Ajustar | Vídeo
 */

import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
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
  FileText,
  ChevronDown,
  ChevronUp,
  Zap,
  Edit3,
  Sliders,
  Video,
} from 'lucide-react';
import { useAuthStore } from '@/lib/store';
import { useProjectBootstrap } from '@/hooks/useProjectBootstrap';
import type { BootstrapData } from '@/types/image-studio';
import { useImageStudio } from '@/hooks/useImageStudio';
import { useCreativePromptGenerator } from '@/hooks/useCreativePromptGenerator';
import { useProjectMedia } from '@/hooks/useProjectMedia';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { TooltipProvider } from '@/components/ui/tooltip';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { cn } from '@/lib/utils';

// Image Studio Components
import { StylePresetGrid } from '@/components/image-studio/StylePresetGrid';
import { VariationGrid } from '@/components/image-studio/VariationGrid';
import { ImageExpandModal } from '@/components/image-studio/ImageExpandModal';
import { VisualContextPreview } from '@/components/image-studio/VisualContextPreview';
import { EditMode } from '@/components/image-studio/EditMode';
import { AdjustMode } from '@/components/image-studio/AdjustMode';
import type { GeneratedImage, AspectRatioId } from '@/types/image-studio';

// Format options
const FORMAT_OPTIONS: { value: AspectRatioId; label: string }[] = [
  { value: '1:1', label: '1:1' },
  { value: '16:9', label: '16:9' },
  { value: '9:16', label: '9:16' },
  { value: '4:3', label: '4:3' },
];

type TabValue = 'criar' | 'editar' | 'ajustar' | 'video';

const TABS = [
  { id: 'criar' as TabValue, label: 'Criar', icon: Wand2 },
  { id: 'editar' as TabValue, label: 'Editar', icon: Edit3 },
  { id: 'ajustar' as TabValue, label: 'Ajustar', icon: Sliders },
  { id: 'video' as TabValue, label: 'Vídeo', icon: Video, disabled: true },
];

export default function StudioPage() {
  const params = useParams();
  const router = useRouter();
  const workspaceId = params.id as string;
  const projectId = params.projectId as string;

  const { session, isLoading: authLoading } = useAuthStore();
  const [expandedImage, setExpandedImage] = useState<GeneratedImage | null>(null);
  const [activeTab, setActiveTab] = useState<TabValue>('criar');
  const [selectedImageForEdit, setSelectedImageForEdit] = useState<GeneratedImage | null>(null);

  // Infinite scroll ref
  const loadMoreRef = useRef<HTMLDivElement>(null);

  // Document prompt source state
  const [selectedDocumentId, setSelectedDocumentId] = useState<string | null>(null);

  // Prompt style selection
  const [selectedPromptStyle, setSelectedPromptStyle] = useState<string>('direct-response');

  // Style section collapsed state
  const [isStyleExpanded, setIsStyleExpanded] = useState(false);

  // Fetch bootstrap data (models, presets, etc.)
  const { data, isLoading: bootstrapLoading } = useProjectBootstrap(projectId);
  const bootstrapData = data as BootstrapData | undefined;

  // Filter presets by type
  const allPresets = bootstrapData?.style_presets || [];
  const visualStylePresets = allPresets.filter((p) => p.preset_type === 'visual_style');

  // Infinite scroll media history
  const {
    media: historyMedia,
    hasNextPage,
    fetchNextPage,
    isFetchingNextPage,
    isLoading: isLoadingHistory,
  } = useProjectMedia({
    projectId,
    limit: 20,
    enabled: !bootstrapLoading,
  });

  // Image studio state management (no initialHistory - we use infinite scroll now)
  const defaultImageModel = bootstrapData?.models?.default_image_model || bootstrapData?.models?.image?.[0]?.id;
  const studio = useImageStudio({
    projectId,
    defaultModel: defaultImageModel,
    imageModels: bootstrapData?.models?.image || [],
    visualStylePresets,
    layoutPresets: [],
  });

  // Combine current session variations with history from infinite scroll
  // Session variations appear first (top), then history below
  const allVariations = useMemo(() => {
    // Get IDs of session variations to avoid duplicates
    const sessionIds = new Set(studio.variations.map((v) => v.document_id));
    // Filter history to exclude any that are already in session
    const filteredHistory = historyMedia.filter((h) => !sessionIds.has(h.document_id));
    return [...studio.variations, ...filteredHistory];
  }, [studio.variations, historyMedia]);

  // Creative prompt generator
  const promptGenerator = useCreativePromptGenerator({
    projectId,
    onPromptGenerated: (prompt) => {
      studio.setPrompt(prompt);
      toast.success('Prompt criativo gerado!');
    },
  });

  // Redirect if not authenticated
  useEffect(() => {
    if (!authLoading && !session) {
      router.push('/login');
    }
  }, [authLoading, session, router]);

  // Infinite scroll - auto-load more when scrolling to bottom
  useEffect(() => {
    if (!loadMoreRef.current || !hasNextPage) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && !isFetchingNextPage) {
          fetchNextPage();
        }
      },
      { threshold: 0.1 }
    );

    observer.observe(loadMoreRef.current);
    return () => observer.disconnect();
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

  const handleBack = () => {
    router.push(`/workspace/${workspaceId}/project/${projectId}`);
  };

  const handleExpand = (image: GeneratedImage) => {
    setExpandedImage(image);
  };

  const handleCloseExpand = () => {
    setExpandedImage(null);
  };

  // Handler for creative prompt generation from selected document
  const handleGeneratePrompt = useCallback(async () => {
    if (!selectedDocumentId) {
      toast.error('Selecione uma copy primeiro');
      return;
    }

    const doc = bootstrapData?.recent_copies?.find(
      (d: { id: string }) => d.id === selectedDocumentId
    );

    if (!doc?.content) {
      toast.error('A copy selecionada não tem conteúdo');
      return;
    }

    await promptGenerator.generateCreativePrompt(doc.content, selectedPromptStyle);
  }, [bootstrapData?.recent_copies, selectedDocumentId, promptGenerator, selectedPromptStyle]);

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

  // Get selected copy (text document)
  const selectedDocument = selectedDocumentId
    ? bootstrapData?.recent_copies?.find((d: { id: string }) => d.id === selectedDocumentId)
    : null;

  // Handlers for edit/adjust operations
  const handleEditComplete = (result: GeneratedImage) => {
    studio.addVariation(result);
    toast.success('Edição concluída!');
  };

  const handleAdjustComplete = (result: GeneratedImage) => {
    studio.addVariation(result);
    toast.success('Ajuste concluído!');
  };

  // Handler for "Refinar" button - goes to Edit tab with image pre-selected
  const handleRefine = useCallback((image: GeneratedImage) => {
    setSelectedImageForEdit(image);
    setActiveTab('editar');
    toast.info('Imagem selecionada para edição');
  }, []);

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
            {/* Left panel - Controls with tabs */}
            <div className="w-[420px] flex-shrink-0 border-r border-gray-200/50 dark:border-gray-800/50 flex flex-col">
              {/* Tabs */}
              <div className="flex-shrink-0 border-b border-gray-200/50 dark:border-gray-800/50 bg-white/50 dark:bg-gray-900/50">
                <div className="flex">
                  {TABS.map((tab) => {
                    const Icon = tab.icon;
                    return (
                      <button
                        key={tab.id}
                        onClick={() => !tab.disabled && setActiveTab(tab.id)}
                        disabled={tab.disabled}
                        className={cn(
                          'flex-1 flex items-center justify-center gap-2 px-4 py-3 text-sm font-medium transition-colors border-b-2',
                          activeTab === tab.id
                            ? 'border-blue-500 text-blue-600 dark:text-blue-400 bg-blue-50/50 dark:bg-blue-900/10'
                            : tab.disabled
                            ? 'border-transparent text-gray-400 cursor-not-allowed'
                            : 'border-transparent text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 hover:bg-gray-50 dark:hover:bg-gray-800/50'
                        )}
                      >
                        <Icon className="h-4 w-4" />
                        <span className="hidden sm:inline">{tab.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Tab content */}
              <div className="flex-1 overflow-y-auto">
                <AnimatePresence mode="wait">
                  {activeTab === 'criar' && (
                    <motion.div
                      key="criar"
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: 20 }}
                      transition={{ duration: 0.2 }}
                      className="p-6 space-y-5"
                    >
                      {/* 1. FONTE DO PROMPT */}
                      <div className="space-y-3">
                        <div className="flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-300">
                          <FileText className="w-4 h-4" />
                          <span>Fonte do Prompt</span>
                        </div>

                        <Select
                          value={selectedDocumentId || ''}
                          onValueChange={(value) => setSelectedDocumentId(value || null)}
                        >
                          <SelectTrigger className="w-full bg-white dark:bg-gray-800">
                            <SelectValue placeholder="Selecione uma copy..." />
                          </SelectTrigger>
                          <SelectContent>
                            {(bootstrapData?.recent_copies || []).map((doc) => (
                              <SelectItem key={doc.id} value={doc.id}>
                                <span className="truncate">{doc.title || 'Sem título'}</span>
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>

                        {selectedDocument && (
                          <div className="p-3 rounded-lg bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700">
                            <p className="text-xs text-gray-500 dark:text-gray-400 line-clamp-2">
                              {selectedDocument.content || 'Sem conteúdo'}
                            </p>
                          </div>
                        )}

                        {/* Seletor de estilo de prompt - Dropdown compacto */}
                        <div className="flex gap-2">
                          <div className="flex-1">
                            <Select
                              value={selectedPromptStyle}
                              onValueChange={setSelectedPromptStyle}
                              disabled={promptGenerator.isGenerating}
                            >
                              <SelectTrigger className="w-full bg-white dark:bg-gray-800">
                                <SelectValue placeholder="Estilo do criativo..." />
                              </SelectTrigger>
                              <SelectContent>
                                {promptGenerator.promptStyles.map((style) => (
                                  <SelectItem key={style.id} value={style.id}>
                                    <div className="flex items-center gap-2">
                                      <span className="font-medium">{style.name}</span>
                                      <span className="text-xs text-gray-400">• {style.expert}</span>
                                    </div>
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                          <Button
                            onClick={handleGeneratePrompt}
                            disabled={!selectedDocumentId || promptGenerator.isGenerating || studio.isGenerating}
                            className="shrink-0 gap-2 bg-gradient-to-r from-purple-500 to-blue-500 hover:from-purple-600 hover:to-blue-600"
                          >
                            {promptGenerator.isGenerating ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <Wand2 className="h-4 w-4" />
                            )}
                            Gerar
                          </Button>
                        </div>
                      </div>

                      {/* Divider */}
                      <div className="border-t border-gray-200 dark:border-gray-700" />

                      {/* 2. PROMPT EDITÁVEL */}
                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                            Prompt
                          </span>
                          {studio.prompt && (
                            <span className="text-xs text-gray-400">
                              {studio.prompt.length} caracteres
                            </span>
                          )}
                        </div>

                        <Textarea
                          value={studio.prompt}
                          onChange={(e) => studio.setPrompt(e.target.value)}
                          placeholder="Descreva a imagem que você quer criar..."
                          className="min-h-[120px] resize-none bg-white dark:bg-gray-800"
                          disabled={studio.isGenerating}
                        />
                      </div>

                      {/* Divider */}
                      <div className="border-t border-gray-200 dark:border-gray-700" />

                      {/* 3. REFERÊNCIAS VISUAIS */}
                      <VisualContextPreview
                        visualAssets={bootstrapData?.visual_context || []}
                        selectedAssets={studio.selectedAssetsWithModes}
                        onUpdateAssets={studio.updateSelectedAssets}
                        onSetReferenceImage={studio.setReferenceImage}
                        referenceImageUrl={studio.referenceImageUrl}
                        disabled={studio.isGenerating}
                        autoSelect={true}
                        prompt={studio.prompt}
                      />

                      {/* Divider */}
                      <div className="border-t border-gray-200 dark:border-gray-700" />

                      {/* 4. ESTILO (colapsável) */}
                      <div className="space-y-3">
                        <button
                          onClick={() => setIsStyleExpanded(!isStyleExpanded)}
                          className="w-full flex items-center justify-between text-sm font-medium text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-gray-100"
                        >
                          <div className="flex items-center gap-2">
                            <Sparkles className="w-4 h-4" />
                            <span>Estilo Visual</span>
                            {studio.visualStyle && (
                              <span className="text-xs px-2 py-0.5 rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400">
                                {visualStylePresets.find((p: { slug: string }) => p.slug === studio.visualStyle)?.name || studio.visualStyle}
                              </span>
                            )}
                          </div>
                          {isStyleExpanded ? (
                            <ChevronUp className="w-4 h-4" />
                          ) : (
                            <ChevronDown className="w-4 h-4" />
                          )}
                        </button>

                        <AnimatePresence>
                          {isStyleExpanded && (
                            <motion.div
                              initial={{ height: 0, opacity: 0 }}
                              animate={{ height: 'auto', opacity: 1 }}
                              exit={{ height: 0, opacity: 0 }}
                              transition={{ duration: 0.2 }}
                              className="overflow-hidden"
                            >
                              <StylePresetGrid
                                presets={visualStylePresets}
                                selectedPresetSlug={studio.visualStyle}
                                onSelectPreset={studio.setVisualStyle}
                                isLoading={bootstrapLoading}
                                title=""
                              />
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>

                      {/* Divider */}
                      <div className="border-t border-gray-200 dark:border-gray-700" />

                      {/* 5. CONFIGURAÇÕES INLINE */}
                      <div className="space-y-3">
                        <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                          Configurações
                        </span>

                        <div className="flex gap-3">
                          {/* Format selector inline */}
                          <div className="flex-1">
                            <label className="text-xs text-gray-500 dark:text-gray-400 mb-1 block">
                              Formato
                            </label>
                            <div className="flex gap-1">
                              {FORMAT_OPTIONS.map((format) => (
                                <button
                                  key={format.value}
                                  onClick={() => studio.setAspectRatio(format.value)}
                                  disabled={studio.isGenerating}
                                  className={cn(
                                    'flex-1 px-2 py-1.5 text-xs font-medium rounded-md transition-colors',
                                    studio.aspectRatio === format.value
                                      ? 'bg-blue-500 text-white'
                                      : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700'
                                  )}
                                >
                                  {format.label}
                                </button>
                              ))}
                            </div>
                          </div>

                          {/* Model selector inline */}
                          <div className="w-[140px]">
                            <label className="text-xs text-gray-500 dark:text-gray-400 mb-1 block">
                              Modelo
                            </label>
                            <Select
                              value={studio.model}
                              onValueChange={studio.setModel}
                              disabled={studio.isGenerating}
                            >
                              <SelectTrigger className="h-[34px] text-xs bg-white dark:bg-gray-800">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                {(bootstrapData?.models?.image || []).map((model: { id: string; name: string }) => (
                                  <SelectItem key={model.id} value={model.id}>
                                    {model.name}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                        </div>

                        {/* Variation count selector */}
                        <div>
                          <label className="text-xs text-gray-500 dark:text-gray-400 mb-1 block">
                            Variações
                          </label>
                          <div className="flex gap-1">
                            {[1, 2, 3, 4].map((count) => (
                              <button
                                key={count}
                                onClick={() => studio.setVariationCount(count)}
                                disabled={studio.isGenerating}
                                className={cn(
                                  'flex-1 px-3 py-1.5 text-xs font-medium rounded-md transition-colors',
                                  studio.variationCount === count
                                    ? 'bg-blue-500 text-white'
                                    : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700'
                                )}
                              >
                                {count}
                              </button>
                            ))}
                          </div>
                        </div>
                      </div>

                      {/* Divider */}
                      <div className="border-t border-gray-200 dark:border-gray-700" />

                      {/* 6. BOTÃO GERAR */}
                      <Button
                        onClick={studio.generate}
                        disabled={!studio.prompt.trim() || studio.isGenerating}
                        className="w-full h-12 gap-2 text-base font-semibold bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600 shadow-lg shadow-blue-500/25"
                      >
                        {studio.isGenerating ? (
                          <>
                            <Loader2 className="h-5 w-5 animate-spin" />
                            Gerando...
                          </>
                        ) : (
                          <>
                            <Zap className="h-5 w-5" />
                            Gerar Imagem
                          </>
                        )}
                      </Button>
                    </motion.div>
                  )}

                  {activeTab === 'editar' && (
                    <motion.div
                      key="editar"
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: 20 }}
                      transition={{ duration: 0.2 }}
                      className="p-6"
                    >
                      <EditMode
                        projectId={projectId}
                        selectedImage={selectedImageForEdit}
                        onSelectImage={() => {
                          // Open asset picker modal
                          toast.info('Asset picker será integrado');
                        }}
                        onEditComplete={handleEditComplete}
                        isLoading={bootstrapLoading}
                      />
                    </motion.div>
                  )}

                  {activeTab === 'ajustar' && (
                    <motion.div
                      key="ajustar"
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: 20 }}
                      transition={{ duration: 0.2 }}
                      className="p-6"
                    >
                      <AdjustMode
                        projectId={projectId}
                        selectedImage={selectedImageForEdit}
                        onSelectImage={() => {
                          // Open asset picker modal
                          toast.info('Asset picker será integrado');
                        }}
                        onOperationComplete={handleAdjustComplete}
                      />
                    </motion.div>
                  )}

                  {activeTab === 'video' && (
                    <motion.div
                      key="video"
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: 20 }}
                      transition={{ duration: 0.2 }}
                      className="p-12 flex flex-col items-center justify-center text-center"
                    >
                      <div className="w-16 h-16 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center mb-4">
                        <Video className="w-8 h-8 text-gray-400" />
                      </div>
                      <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">
                        Geração de Vídeo
                      </h3>
                      <p className="text-sm text-gray-500 dark:text-gray-400 max-w-md">
                        Em breve você poderá criar vídeos com IA usando modelos como Veo 3.1, Kling 2.6, e LTX-2.
                      </p>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>

            {/* Right panel - Generated images */}
            <div className="flex-1 overflow-y-auto p-6">
              <AnimatePresence mode="wait">
                {isLoadingHistory ? (
                  // Loading history state
                  <motion.div
                    key="loading"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="h-full flex flex-col items-center justify-center"
                  >
                    <Loader2 className="h-8 w-8 animate-spin text-blue-500 mb-4" />
                    <span className="text-gray-500 dark:text-gray-400">Carregando imagens...</span>
                  </motion.div>
                ) : allVariations.length === 0 && !studio.isGenerating ? (
                  // Empty state
                  <motion.div
                    key="empty"
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
                      {activeTab === 'criar' && 'Selecione uma copy, gere um prompt e clique em "Gerar Imagem".'}
                      {activeTab === 'editar' && 'Selecione uma imagem e use o pincel ou instruções para editá-la.'}
                      {activeTab === 'ajustar' && 'Selecione uma imagem e aplique ajustes rápidos.'}
                    </p>
                  </motion.div>
                ) : (
                  // Variations grid
                  <motion.div
                    key="variations"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -20 }}
                  >
                    <VariationGrid
                      variations={allVariations}
                      isGenerating={studio.isGenerating}
                      pendingCount={studio.pendingCount}
                      onExpand={handleExpand}
                      onSave={studio.save}
                      onRefine={handleRefine}
                      onAttach={handleAttachImage}
                      canAttach={!!selectedDocumentId}
                    />

                    {/* Infinite scroll trigger */}
                    {hasNextPage && (
                      <div
                        ref={loadMoreRef}
                        className="flex justify-center py-8"
                      >
                        {isFetchingNextPage ? (
                          <div className="flex items-center gap-2 text-gray-500">
                            <Loader2 className="h-5 w-5 animate-spin" />
                            <span className="text-sm">Carregando mais...</span>
                          </div>
                        ) : (
                          <button
                            onClick={() => fetchNextPage()}
                            className="text-sm text-blue-500 hover:text-blue-600 font-medium"
                          >
                            Carregar mais imagens
                          </button>
                        )}
                      </div>
                    )}
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
