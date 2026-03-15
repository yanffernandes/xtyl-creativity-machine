
/**
 * useImageStudio Hook
 * Feature 031: Creative Concepts Migration
 *
 * Manages the complete state for image generation including:
 * - Form state (prompt, concept, format, model, creativity)
 * - SSE connection for real-time progress
 * - Generated variations
 * - Save/download actions
 */

import { useState, useCallback, useRef, useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { generateImageBatch, getBatchStreamUrl, attachImageToDocument } from '@/lib/api';
import { queryKeys, documentKeys } from '@/lib/query-keys';
import { useAuthStore } from '@/lib/store';
import type {
  ImageStudioState,
  GeneratedImage,
  AvailableModel,
  CreativeConcept,
  AspectRatioId,
} from '@/types/image-studio';

// Feature 028: Reference asset types with per-asset modes
export type AssetMode = 'style' | 'compose' | 'base';

export interface SelectedAsset {
  id: string;
  thumbnail_url?: string;
  title?: string;
}

// Feature 028: Asset with individual mode selection
export interface SelectedAssetWithMode {
  id: string;
  mode: AssetMode;
  thumbnail_url?: string;
  title?: string;
}

interface UseImageStudioOptions {
  projectId: string;
  defaultModel?: string;
  imageModels?: AvailableModel[];
  concepts?: CreativeConcept[];
  /** Initial history of generated images from the project */
  initialHistory?: GeneratedImage[];
}

interface UseImageStudioReturn extends ImageStudioState {
  // Setters
  setPrompt: (prompt: string) => void;
  setConcept: (slug: string | null) => void;
  setAspectRatio: (ratio: AspectRatioId) => void;
  setModel: (model: string) => void;
  // Feature 029: Model-specific parameters
  modelParams: Record<string, unknown>;
  setModelParams: (params: Record<string, unknown>) => void;
  setCreativity: (value: number) => void;
  setVariationCount: (count: number) => void;
  setReferenceImage: (url: string | null) => void;
  // Feature 028: Reference assets with per-asset modes
  /** @deprecated Use selectedAssetsWithModes and updateSelectedAssets instead */
  setReferenceAssets: (assets: SelectedAsset[]) => void;
  /** @deprecated Use updateSelectedAssets instead */
  setAssetMode: (mode: AssetMode) => void;
  // Feature 028: New per-asset mode API
  updateSelectedAssets: (assets: SelectedAssetWithMode[]) => void;
  // Feature 028: Brand context toggle
  setApplyBrandContext: (apply: boolean) => void;

  // Actions
  generate: () => Promise<void>;
  refine: (image: GeneratedImage) => void;
  save: (image: GeneratedImage, folderId?: string) => Promise<void>;
  attach: (image: GeneratedImage, documentId: string) => Promise<void>;
  reset: () => void;
  clearVariations: () => void;
  addVariation: (variation: GeneratedImage) => void;

  // Helpers
  selectedConcept: CreativeConcept | null;
  pendingCount: number;
  variationCount: number;
  // Feature 028
  /** @deprecated Use selectedAssetsWithModes instead */
  referenceAssets: SelectedAsset[];
  /** @deprecated Use selectedAssetsWithModes instead */
  assetMode: AssetMode;
  // Feature 028: New per-asset mode state
  selectedAssetsWithModes: SelectedAssetWithMode[];
  applyBrandContext: boolean;
}

const DEFAULT_MODEL = 'google/gemini-2.5-flash-image';
const DEFAULT_VARIATIONS = 2;

export function useImageStudio({
  projectId,
  defaultModel,
  imageModels = [],
  concepts = [],
  initialHistory = [],
}: UseImageStudioOptions): UseImageStudioReturn {
  const queryClient = useQueryClient();
  const { getAccessToken } = useAuthStore();
  const eventSourceRef = useRef<EventSource | null>(null);
  const [pendingCount, setPendingCount] = useState(0);

  // State
  const [prompt, setPrompt] = useState('');
  const [conceptSlug, setConcept] = useState<string | null>(null);
  const [aspectRatio, setAspectRatio] = useState<AspectRatioId>('1:1');
  const [model, setModel] = useState(defaultModel || DEFAULT_MODEL);
  // Feature 029: Model-specific parameters
  const [modelParams, setModelParams] = useState<Record<string, unknown>>({});
  const [creativity, setCreativity] = useState(50);
  const [variationCount, setVariationCount] = useState(DEFAULT_VARIATIONS);
  const [referenceImageUrl, setReferenceImage] = useState<string | null>(null);
  // Feature 028: Reference assets state (deprecated - kept for backwards compatibility)
  const [referenceAssets, setReferenceAssets] = useState<SelectedAsset[]>([]);
  const [assetMode, setAssetMode] = useState<AssetMode>('style');
  // Feature 028: New per-asset mode state
  const [selectedAssetsWithModes, setSelectedAssetsWithModes] = useState<SelectedAssetWithMode[]>([]);
  const updateSelectedAssets = useCallback((assets: SelectedAssetWithMode[]) => {
    setSelectedAssetsWithModes(assets);
    // Also update legacy state for backwards compatibility
    setReferenceAssets(assets.map(a => ({ id: a.id, thumbnail_url: a.thumbnail_url, title: a.title })));
  }, []);
  // Feature 028: Brand context toggle (default enabled)
  const [applyBrandContext, setApplyBrandContext] = useState(true);
  const [variations, setVariations] = useState<GeneratedImage[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [batchId, setBatchId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Track current batch variations separately (for prepending to history)
  const [currentBatchVariations, setCurrentBatchVariations] = useState<GeneratedImage[]>([]);
  const currentBatchIdRef = useRef<string | null>(null);

  useEffect(() => {
    if (!defaultModel) {
      return;
    }

    setModel((currentModel) => {
      if (currentModel === defaultModel) {
        return currentModel;
      }

      const currentModelExists =
        imageModels.length === 0 ||
        imageModels.some((availableModel) => availableModel.id === currentModel);

      if (currentModel !== DEFAULT_MODEL && currentModelExists) {
        return currentModel;
      }

      return defaultModel;
    });
  }, [defaultModel, imageModels]);

  // Cleanup SSE on unmount
  useEffect(() => {
    return () => {
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
      }
    };
  }, []);

  // Load initial history from project (only once when initialHistory becomes available)
  const initialHistoryLoadedRef = useRef(false);
  useEffect(() => {
    if (initialHistory.length > 0 && !initialHistoryLoadedRef.current) {
      initialHistoryLoadedRef.current = true;
      setVariations(initialHistory);
    }
  }, [initialHistory]);

  // Get selected concept
  const selectedConcept = conceptSlug
    ? concepts.find((c) => c.slug === conceptSlug) || null
    : null;

  // Setup SSE connection
  const setupSSE = useCallback(
    (batchId: string, token: string) => {
      // Close existing connection
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
      }

      const streamUrl = getBatchStreamUrl(batchId, token);
      const eventSource = new EventSource(streamUrl);
      eventSourceRef.current = eventSource;

      eventSource.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          const currentBatch = currentBatchIdRef.current;

          switch (data.type) {
            case 'variation_started':
              break;

            case 'variation_complete':
              setPendingCount((prev) => Math.max(0, prev - 1));
              const completedImage: GeneratedImage = {
                success: true,
                index: data.data.index,
                document_id: data.data.document_id,
                file_url: data.data.file_url,
                thumbnail_url: data.data.thumbnail_url,
                title: data.data.title,
                modifier: data.data.modifier,
                batchId: currentBatch || undefined,
                generatedAt: new Date().toISOString(),
              };
              setCurrentBatchVariations((prev) => [...prev, completedImage]);
              break;

            case 'variation_failed':
              setPendingCount((prev) => Math.max(0, prev - 1));
              const failedImage: GeneratedImage = {
                success: false,
                index: data.data.index,
                error: data.data.error,
                batchId: currentBatch || undefined,
                generatedAt: new Date().toISOString(),
              };
              setCurrentBatchVariations((prev) => [...prev, failedImage]);
              break;

            case 'batch_complete':
              setCurrentBatchVariations([]);
              setVariations((history) => {
                const currentImages = data.data.images || [];
                const newImages: GeneratedImage[] = currentImages.map((img: { document_id: string; file_url: string; thumbnail_url: string; title: string; modifier: string; index: number }) => ({
                  success: true,
                  index: img.index,
                  document_id: img.document_id,
                  file_url: img.file_url,
                  thumbnail_url: img.thumbnail_url,
                  title: img.title,
                  modifier: img.modifier,
                  batchId: currentBatch || undefined,
                  generatedAt: new Date().toISOString(),
                }));

                const existingIds = new Set(newImages.map(i => i.document_id));
                const filteredHistory = history.filter(h => !existingIds.has(h.document_id));

                return [...newImages, ...filteredHistory];
              });
              setIsGenerating(false);
              setPendingCount(0);
              eventSource.close();

              queryClient.invalidateQueries({
                queryKey: documentKeys.list(projectId),
              });

              const successCount = data.data.completed || 0;
              const failCount = data.data.failed || 0;

              if (successCount > 0) {
                toast.success(`${successCount} imagens geradas com sucesso`);
              }
              if (failCount > 0) {
                toast.error(`${failCount} imagens falharam`);
              }
              break;

            case 'error':
              setCurrentBatchVariations((currentBatch) => {
                if (currentBatch.length > 0) {
                  setVariations((history) => [...currentBatch, ...history]);
                }
                return [];
              });
              setError(data.data.error || 'Erro desconhecido');
              setIsGenerating(false);
              setPendingCount(0);
              eventSource.close();
              toast.error(data.data.error || 'Erro na geração de imagens');
              break;
          }
        } catch (err) {
          console.error('Failed to parse SSE event:', err);
        }
      };

      eventSource.onerror = (err) => {
        console.error('SSE connection error:', err);
        setIsGenerating(false);
        setPendingCount(0);
        eventSource.close();
      };
    },
    [projectId, queryClient]
  );

  // Generate images
  const generate = useCallback(async () => {
    if (!prompt.trim() || isGenerating) return;

    setError(null);
    setIsGenerating(true);
    setPendingCount(variationCount);
    setCurrentBatchVariations([]);

    try {
      // Feature 028: Prepare reference assets with modes for API
      const assetsForApi = selectedAssetsWithModes.length > 0
        ? selectedAssetsWithModes.map(a => ({ id: a.id, mode: a.mode }))
        : referenceAssets.length > 0
          ? referenceAssets.map(a => ({ id: a.id, mode: assetMode }))
          : undefined;

      const response = await generateImageBatch({
        prompt: prompt.trim(),
        project_id: projectId,
        creative_concept: conceptSlug,
        aspect_ratio: aspectRatio,
        model: model,
        creativity: creativity / 100,
        count: variationCount,
        reference_image_url: referenceImageUrl,
        // Feature 028: Pass reference assets with individual modes
        reference_assets: assetsForApi ? assetsForApi.map(a => a.id) : undefined,
        reference_asset_modes: assetsForApi,
        // Feature 028: Brand context toggle
        apply_brand_context: applyBrandContext,
      });

      if (response.status === 'processing' && response.batch_id) {
        setBatchId(response.batch_id);
        currentBatchIdRef.current = response.batch_id;
        const token = await getAccessToken();
        if (token) {
          setupSSE(response.batch_id, token);
        } else {
          setError('Erro de autenticação');
          setIsGenerating(false);
          setPendingCount(0);
          toast.error('Erro de autenticação ao conectar ao stream');
        }
      } else if (response.status === 'failed') {
        setError(response.message || 'Falha ao iniciar geração');
        setIsGenerating(false);
        setPendingCount(0);
        toast.error(response.message || 'Falha ao iniciar geração');
      }
    } catch (err) {
      console.error('Failed to start batch generation:', err);
      setError(err instanceof Error ? err.message : 'Erro desconhecido');
      setIsGenerating(false);
      setPendingCount(0);
      toast.error('Falha ao iniciar geração de imagens');
    }
  }, [
    prompt,
    isGenerating,
    projectId,
    conceptSlug,
    aspectRatio,
    model,
    creativity,
    variationCount,
    referenceImageUrl,
    referenceAssets,
    assetMode,
    selectedAssetsWithModes,
    applyBrandContext,
    setupSSE,
    getAccessToken,
  ]);

  // Refine an existing image (use it as reference)
  const refine = useCallback((image: GeneratedImage) => {
    if (image.file_url) {
      setReferenceImage(image.file_url);
      toast.info('Imagem definida como referência');
    }
  }, []);

  // Save image to project
  const save = useCallback(
    async (image: GeneratedImage, _folderId?: string) => {
      if (image.document_id) {
        toast.success('Imagem já salva no projeto');
        queryClient.invalidateQueries({
          queryKey: documentKeys.list(projectId),
        });
      }
    },
    [projectId, queryClient]
  );

  // Attach image to a document
  const attach = useCallback(
    async (image: GeneratedImage, documentId: string) => {
      if (!image.document_id) {
        toast.error('Imagem não encontrada');
        return;
      }

      try {
        await attachImageToDocument(documentId, image.document_id);
        toast.success('Imagem anexada ao documento');
        queryClient.invalidateQueries({
          queryKey: documentKeys.list(projectId),
        });
      } catch (err) {
        console.error('Failed to attach image:', err);
        toast.error('Falha ao anexar imagem');
      }
    },
    [projectId, queryClient]
  );

  // Reset all state
  const reset = useCallback(() => {
    setPrompt('');
    setConcept(null);
    setAspectRatio('1:1');
    setModel(defaultModel || DEFAULT_MODEL);
    setCreativity(50);
    setVariationCount(DEFAULT_VARIATIONS);
    setReferenceImage(null);
    setReferenceAssets([]);
    setAssetMode('style');
    setSelectedAssetsWithModes([]);
    setApplyBrandContext(true);
    setVariations([]);
    setCurrentBatchVariations([]);
    setIsGenerating(false);
    setBatchId(null);
    currentBatchIdRef.current = null;
    setError(null);
    setPendingCount(0);

    if (eventSourceRef.current) {
      eventSourceRef.current.close();
    }
  }, [defaultModel]);

  // Clear just variations (history)
  const clearVariations = useCallback(() => {
    setVariations([]);
    setCurrentBatchVariations([]);
    setBatchId(null);
    currentBatchIdRef.current = null;
    setError(null);
  }, []);

  // Add a variation manually (for Edit/Adjust mode results)
  const addVariation = useCallback((variation: GeneratedImage) => {
    setVariations((prev) => [variation, ...prev]);
  }, []);

  // Combine current batch (being generated) + history for display
  const allVariations = [...currentBatchVariations, ...variations];

  return {
    // State
    prompt,
    concept: conceptSlug,
    aspectRatio,
    model,
    creativity,
    referenceImageUrl,
    variations: allVariations,
    isGenerating,
    batchId,
    error,

    // Setters
    setPrompt,
    setConcept,
    setAspectRatio,
    setModel,
    modelParams,
    setModelParams,
    setCreativity,
    setVariationCount,
    setReferenceImage,
    setReferenceAssets,
    setAssetMode,
    updateSelectedAssets,
    setApplyBrandContext,

    // Actions
    generate,
    refine,
    save,
    attach,
    reset,
    clearVariations,
    addVariation,

    // Helpers
    selectedConcept,
    pendingCount,
    variationCount,
    // Feature 028
    referenceAssets,
    assetMode,
    selectedAssetsWithModes,
    applyBrandContext,
  };
}

export default useImageStudio;
