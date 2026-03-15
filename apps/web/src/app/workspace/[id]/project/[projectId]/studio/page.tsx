
/**
 * Visual Generation Studio Page
 * Feature 029: Image Studio Evolution - fal.ai Migration
 *
 * Layout: Sidebar (420px) with tabs + Preview area (flex-1)
 * Tabs: Criar | Editar | Ajustar | Vídeo
 */

import { useState, useEffect, useCallback, useMemo, useRef, lazy, Suspense } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
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
  Zap,
  Video,
  Palette,
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
import { getDocumentById, getImageModels } from '@/lib/api';

// Image Studio Components
import { ConceptSelector } from '@/components/image-studio/ConceptSelector';
import { ModelSelector } from '@/components/image-studio/ModelSelector';
import { VariationGrid } from '@/components/image-studio/VariationGrid';
import { VisualContextPreview } from '@/components/image-studio/VisualContextPreview';
import type { GeneratedImage, AspectRatioId, ImageModel } from '@/types/image-studio';

// Format options for aspect_ratio models
const ASPECT_RATIO_OPTIONS = [
  { value: '1:1', label: '1:1' },
  { value: '16:9', label: '16:9' },
  { value: '9:16', label: '9:16' },
  { value: '4:3', label: '4:3' },
  { value: '3:4', label: '3:4' },
];

// Format options for image_size models (GPT-Image 1.5)
const IMAGE_SIZE_OPTIONS = [
  { value: '1024x1024', label: '1:1' },
  { value: '1536x1024', label: '3:2' },
  { value: '1024x1536', label: '2:3' },
  { value: '1792x1024', label: '16:9' },
  { value: '1024x1792', label: '9:16' },
];

// Format options for Seedream models (use named presets)
const SEEDREAM_IMAGE_SIZE_OPTIONS = [
  { value: 'square', label: '1:1' },
  { value: 'square_hd', label: '1:1 HD' },
  { value: 'landscape_4_3', label: '4:3' },
  { value: 'portrait_4_3', label: '3:4' },
  { value: 'landscape_16_9', label: '16:9' },
  { value: 'portrait_16_9', label: '9:16' },
];

type TabValue = 'criar' | 'video';

const TABS = [
  { id: 'criar' as TabValue, label: 'Criar', icon: Wand2 },
  { id: 'video' as TabValue, label: 'Vídeo', icon: Video, disabled: true },
];

const ImageExpandModal = lazy(() =>
  import('@/components/image-studio/ImageExpandModal').then((mod) => ({ default: mod.ImageExpandModal }))
);

export default function StudioPage() {
  const params = useParams();
  const router = useRouter();
  const workspaceId = params.id as string;
  const projectId = params.projectId as string;

  const { session, isLoading: authLoading } = useAuthStore();
  const [expandedImage, setExpandedImage] = useState<GeneratedImage | null>(null);
  const [activeTab, setActiveTab] = useState<TabValue>('criar');

  // Infinite scroll ref
  const loadMoreRef = useRef<HTMLDivElement>(null);

  // Document prompt source state
  const [selectedDocumentId, setSelectedDocumentId] = useState<string | null>(null);
  const [selectedDocumentContent, setSelectedDocumentContent] = useState<string | null>(null);
  const [isLoadingSelectedDocument, setIsLoadingSelectedDocument] = useState(false);
  const bootstrapOptions = useMemo(
    () => ({
      include_models: false,
      include_memories: false,
      include_visual_context: true,
      include_recent_copies: true,
      include_recent_media: false,
      include_copy_content: false,
      include_creative_concepts: true,
      recent_copies_limit: 20,
      visual_context_limit: 120,
    }),
    []
  );

  // Fetch bootstrap data (models, presets, etc.)
  const { data } = useProjectBootstrap(projectId, bootstrapOptions);
  const bootstrapData = data as BootstrapData | undefined;
  const { data: imageModels = [], isLoading: isLoadingImageModels } = useQuery<ImageModel[]>({
    queryKey: ['image-models', 'text-to-image'],
    queryFn: () => getImageModels('text-to-image'),
    staleTime: 1000 * 60 * 5,
    enabled: !!projectId,
  });

  // Get creative concepts
  const concepts = bootstrapData?.creative_concepts || [];

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
    enabled: !!projectId,
  });

  // Image studio state management (no initialHistory - we use infinite scroll now)
  const defaultImageModel =
    bootstrapData?.models?.default_image_model || imageModels[0]?.id;
  const studio = useImageStudio({
    projectId,
    defaultModel: defaultImageModel,
    imageModels,
    concepts,
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
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authLoading, session]);

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

    if (!selectedDocumentContent) {
      toast.error('A copy selecionada não tem conteúdo');
      return;
    }

    // Find the selected concept object to pass to the generator
    const selectedConcept = studio.concept
      ? concepts.find((c: { slug: string }) => c.slug === studio.concept) || null
      : null;

    await promptGenerator.generateCreativePrompt(selectedDocumentContent, selectedConcept);
  }, [selectedDocumentId, selectedDocumentContent, promptGenerator, studio.concept, concepts]);

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
  const selectedDocumentPreview = selectedDocumentContent ?? selectedDocument?.content ?? null;

  useEffect(() => {
    if (!selectedDocumentId) {
      setSelectedDocumentContent(null);
      setIsLoadingSelectedDocument(false);
      return;
    }

    let isCancelled = false;
    const run = async () => {
      setIsLoadingSelectedDocument(true);
      try {
        const doc = await getDocumentById(selectedDocumentId);
        if (!isCancelled) {
          setSelectedDocumentContent(doc.content || null);
        }
      } catch {
        if (!isCancelled) {
          setSelectedDocumentContent(null);
          toast.error('Falha ao carregar conteúdo da copy');
        }
      } finally {
        if (!isCancelled) {
          setIsLoadingSelectedDocument(false);
        }
      }
    };

    run();
    return () => {
      isCancelled = true;
    };
  }, [selectedDocumentId]);

  // Handlers for edit/adjust operations
  // Loading state
  if (authLoading) {
    return (
      <div className="h-screen w-screen flex items-center justify-center bg-surface-primary">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <span className="text-muted-foreground">Carregando sessão...</span>
        </div>
      </div>
    );
  }

  return (
    <TooltipProvider>
      <div className="h-screen w-screen flex flex-col bg-surface-primary">
        {/* Header */}
        <header className="flex-shrink-0 h-16 border-b border-border/60 bg-surface-secondary">
          <div className="h-full max-w-[1800px] mx-auto px-6 flex items-center justify-between">
            {/* Left side */}
            <div className="flex items-center gap-4">
              <Button
                variant="ghost"
                size="icon"
                onClick={handleBack}
                className="hover:bg-muted/50"
              >
                <ArrowLeft className="h-5 w-5" />
              </Button>

              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center shadow-sm">
                  <ImageIcon className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h1 className="text-lg font-semibold">
                    Estúdio Visual
                  </h1>
                  <p className="text-xs text-muted-foreground">
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
                  className="text-muted-foreground hover:text-destructive"
                >
                  <Trash2 className="h-4 w-4 mr-1" />
                  Limpar
                </Button>
              )}

              {studio.isGenerating && (
                <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary/10 text-primary">
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
            <div className="w-[420px] flex-shrink-0 border-r border-border/60 flex flex-col">
              {/* Tabs */}
              <div className="flex-shrink-0 border-b border-border/60 bg-surface-secondary">
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
                            ? 'border-primary text-primary bg-primary/5'
                            : tab.disabled
                            ? 'border-transparent text-muted-foreground/40 cursor-not-allowed'
                            : 'border-transparent text-muted-foreground hover:text-foreground hover:bg-muted/50'
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
                        <div className="flex items-center gap-2 text-sm font-medium text-foreground">
                          <FileText className="w-4 h-4" />
                          <span>Fonte do Prompt</span>
                        </div>

                        <Select
                          value={selectedDocumentId || ''}
                          onValueChange={(value) => {
                            setSelectedDocumentContent(null);
                            setSelectedDocumentId(value || null);
                          }}
                        >
                          <SelectTrigger className="w-full">
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
                          <div className="p-3 rounded-lg bg-muted/50 border border-border/60">
                            <p className="text-xs text-muted-foreground line-clamp-2">
                              {isLoadingSelectedDocument
                                ? 'Carregando conteúdo...'
                                : selectedDocumentPreview || 'Sem conteúdo'}
                            </p>
                          </div>
                        )}

                        {/* Conceito Criativo + Gerar Prompt */}
                        <ConceptSelector
                          concepts={concepts}
                          selectedConceptSlug={studio.concept}
                          onSelectConcept={studio.setConcept}
                          disabled={studio.isGenerating}
                        />

                        <Button
                          onClick={handleGeneratePrompt}
                          disabled={
                            !selectedDocumentId ||
                            isLoadingSelectedDocument ||
                            promptGenerator.isGenerating ||
                            studio.isGenerating
                          }
                          className="w-full gap-2"
                        >
                          {promptGenerator.isGenerating ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <Wand2 className="h-4 w-4" />
                          )}
                          Gerar Prompt
                        </Button>
                      </div>

                      {/* Divider */}
                      <div className="border-t border-border/60" />

                      {/* 2. PROMPT EDITÁVEL */}
                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-medium text-foreground">
                            Prompt
                          </span>
                          {studio.prompt && (
                            <span className="text-xs text-muted-foreground">
                              {studio.prompt.length} caracteres
                            </span>
                          )}
                        </div>

                        <Textarea
                          value={studio.prompt}
                          onChange={(e) => studio.setPrompt(e.target.value)}
                          placeholder="Descreva a imagem que você quer criar..."
                          className="min-h-[120px] resize-none"
                          disabled={studio.isGenerating}
                        />
                      </div>

                      {/* Divider */}
                      <div className="border-t border-border/60" />

                      {/* 2.5. MODELO - Movido para cima */}
                      <ModelSelector
                        models={imageModels}
                        value={studio.model}
                        onChange={studio.setModel}
                        disabled={studio.isGenerating}
                        isLoading={isLoadingImageModels}
                      />

                      {/* Divider */}
                      <div className="border-t border-border/60" />

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
                      <div className="border-t border-border/60" />

                      {/* 4. BRAND CONTEXT TOGGLE */}
                      {(() => {
                        const settings = bootstrapData?.settings as Record<string, any> | null;
                        const brandIdentity = settings?.brand_identity as Record<string, any> | undefined;
                        const clientName: string = settings?.client_name || '';
                        const colors: string[] = Array.isArray(brandIdentity?.color_palette) ? brandIdentity.color_palette : [];
                        const brandVoice: string = settings?.brand_voice_custom || settings?.brand_voice || '';
                        const hasBrandContext = !!(clientName || colors.length > 0 || brandVoice);

                        if (!hasBrandContext) return null;

                        return (
                          <div className="space-y-2">
                            <button
                              type="button"
                              onClick={() => studio.setApplyBrandContext(!studio.applyBrandContext)}
                              disabled={studio.isGenerating}
                              className={cn(
                                'w-full flex items-center justify-between px-3 py-2.5 rounded-lg border transition-colors text-left',
                                studio.applyBrandContext
                                  ? 'border-primary/40 bg-primary/5'
                                  : 'border-border/60 bg-muted/30 opacity-60'
                              )}
                            >
                              <div className="flex items-center gap-2">
                                <Palette className={cn('h-4 w-4 flex-shrink-0', studio.applyBrandContext ? 'text-primary' : 'text-muted-foreground')} />
                                <div>
                                  <p className="text-xs font-medium text-foreground leading-none">
                                    Identidade de Marca
                                  </p>
                                  {clientName && (
                                    <p className="text-xs text-muted-foreground mt-0.5">{clientName}</p>
                                  )}
                                </div>
                              </div>
                              <div className="flex items-center gap-2 flex-shrink-0">
                                {colors.length > 0 && studio.applyBrandContext && (
                                  <div className="flex gap-1">
                                    {colors.slice(0, 4).map((color, i) => (
                                      <div
                                        key={i}
                                        className="w-3 h-3 rounded-full border border-white/20 ring-1 ring-black/10"
                                        style={{ backgroundColor: color }}
                                      />
                                    ))}
                                  </div>
                                )}
                                <div className={cn(
                                  'w-8 h-4 rounded-full transition-colors relative flex-shrink-0',
                                  studio.applyBrandContext ? 'bg-primary' : 'bg-muted'
                                )}>
                                  <div className={cn(
                                    'absolute top-0.5 w-3 h-3 rounded-full bg-white shadow transition-transform',
                                    studio.applyBrandContext ? 'translate-x-4' : 'translate-x-0.5'
                                  )} />
                                </div>
                              </div>
                            </button>
                          </div>
                        );
                      })()}

                      {/* Divider */}
                      <div className="border-t border-border/60" />

                      {/* 5. CONFIGURAÇÕES INLINE */}
                      <div className="space-y-3">
                        <span className="text-sm font-medium text-foreground">
                          Configurações
                        </span>

                        {/* Format + Variations row */}
                        <div className="grid grid-cols-2 gap-3">
                          {/* Format selector - adapts to model */}
                          <div>
                            <label className="text-xs text-muted-foreground mb-1 block">
                              Formato
                            </label>
                            {(() => {
                              const isSeedream = studio.model.includes('seedream');
                              const isGptImage = studio.model.includes('gpt-image');
                              const hasImageSize = isSeedream || isGptImage;

                              // Use appropriate format options based on model ID
                              const formatOptions = isSeedream
                                ? SEEDREAM_IMAGE_SIZE_OPTIONS
                                : isGptImage
                                ? IMAGE_SIZE_OPTIONS
                                : ASPECT_RATIO_OPTIONS;

                              // Get current format value with model-specific defaults
                              const currentFormat = hasImageSize
                                ? (studio.modelParams.image_size as string) || (isSeedream ? 'square' : '1024x1024')
                                : studio.aspectRatio;

                              const handleFormatChange = (value: string) => {
                                if (hasImageSize) {
                                  studio.setModelParams({ ...studio.modelParams, image_size: value });
                                } else {
                                  studio.setAspectRatio(value as AspectRatioId);
                                }
                              };

                              return (
                                <div className="flex flex-wrap gap-1">
                                  {formatOptions.map((format) => (
                                    <button
                                      key={format.value}
                                      onClick={() => handleFormatChange(format.value)}
                                      disabled={studio.isGenerating}
                                      className={cn(
                                        'px-2 py-1.5 text-xs font-medium rounded-md transition-colors',
                                        currentFormat === format.value
                                          ? 'bg-primary text-primary-foreground'
                                          : 'bg-muted text-muted-foreground hover:bg-muted/80'
                                      )}
                                    >
                                      {format.label}
                                    </button>
                                  ))}
                                </div>
                              );
                            })()}
                          </div>

                          {/* Variation count selector */}
                          <div>
                            <label className="text-xs text-muted-foreground mb-1 block">
                              Variações
                            </label>
                            {(() => {
                              const currentModel = imageModels.find((m) => m.id === studio.model);
                              const maxImages = currentModel?.max_images ?? 4;
                              return (
                                <div className="flex gap-1">
                                  {Array.from({ length: maxImages }, (_, i) => i + 1).map((count) => (
                                    <button
                                      key={count}
                                      onClick={() => studio.setVariationCount(count)}
                                      disabled={studio.isGenerating}
                                      className={cn(
                                        'flex-1 px-3 py-1.5 text-xs font-medium rounded-md transition-colors',
                                        studio.variationCount === count
                                          ? 'bg-primary text-primary-foreground'
                                          : 'bg-muted text-muted-foreground hover:bg-muted/80'
                                      )}
                                    >
                                      {count}
                                    </button>
                                  ))}
                                </div>
                              );
                            })()}
                          </div>
                        </div>
                      </div>

                      {/* Divider */}
                      <div className="border-t border-border/60" />

                      {/* 6. BOTÃO GERAR */}
                      <Button
                        onClick={studio.generate}
                        disabled={!studio.prompt.trim() || studio.isGenerating}
                        className="w-full h-12 gap-2 text-base font-semibold shadow-sm"
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



                  {activeTab === 'video' && (
                    <motion.div
                      key="video"
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: 20 }}
                      transition={{ duration: 0.2 }}
                      className="p-12 flex flex-col items-center justify-center text-center"
                    >
                      <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4">
                        <Video className="w-8 h-8 text-muted-foreground/60" />
                      </div>
                      <h3 className="text-lg font-semibold mb-2">
                        Geração de Vídeo
                      </h3>
                      <p className="text-sm text-muted-foreground max-w-md">
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
                    <Loader2 className="h-8 w-8 animate-spin text-primary mb-4" />
                    <span className="text-muted-foreground">Carregando imagens...</span>
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
                    <div className="w-32 h-32 rounded-full bg-primary/10 flex items-center justify-center mb-6">
                      <Wand2 className="w-12 h-12 text-primary" />
                    </div>
                    <h2 className="text-2xl font-semibold mb-2">
                      Crie imagens incríveis
                    </h2>
                    <p className="text-muted-foreground text-center max-w-md mb-8">
                      {activeTab === 'criar' && 'Selecione uma copy, gere um prompt e clique em "Gerar Imagem".'}
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
                          <div className="flex items-center gap-2 text-muted-foreground">
                            <Loader2 className="h-5 w-5 animate-spin" />
                            <span className="text-sm">Carregando mais...</span>
                          </div>
                        ) : (
                          <button
                            onClick={() => fetchNextPage()}
                            className="text-sm text-primary hover:text-primary/80 font-medium"
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
        <Suspense fallback={null}>
          <ImageExpandModal
            image={expandedImage}
            images={studio.variations.filter((v) => v.success)}
            isOpen={!!expandedImage}
            onClose={handleCloseExpand}
          />
        </Suspense>
      </div>
    </TooltipProvider>
  );
}
