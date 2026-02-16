import { useState, useCallback, useRef, useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import type {
  GeneratedImage,
  AvailableModel,
  CreativeConcept,
  AspectRatioId,
  AssetMode,
  SelectedAsset,
  SelectedAssetWithMode,
} from '@repo/shared';
import { generateImageBatch, getBatchStreamUrl, attachImageToDocument } from '../lib/api';
import { queryKeys } from '../lib/query-keys';
import { useAuthStore } from '../lib/stores/authStore';

// Helper to access documentKeys
const documentKeys = queryKeys.documents;

// Helper to get access token
function useGetAccessToken() {
  const store = useAuthStore();
  return store.getAccessToken || (async () => {
    const { data } = await import('../lib/supabase').then(m => m.supabase.auth.getSession());
    return data.session?.access_token || null;
  });
}

interface UseImageStudioOptions {
  projectId: string;
  defaultModel?: string;
  imageModels?: AvailableModel[];
  concepts?: CreativeConcept[];
  initialHistory?: GeneratedImage[];
}

const DEFAULT_MODEL = 'google/gemini-2.5-flash-image';
const DEFAULT_VARIATIONS = 2;

export function useImageStudio({
  projectId,
  defaultModel,
  imageModels: _imageModels = [],
  concepts = [],
  initialHistory = [],
}: UseImageStudioOptions) {
  const queryClient = useQueryClient();
  const getAccessToken = useGetAccessToken();
  const eventSourceRef = useRef<EventSource | null>(null);
  const [pendingCount, setPendingCount] = useState(0);

  // Form state
  const [prompt, setPrompt] = useState('');
  const [conceptSlug, setConcept] = useState<string | null>(null);
  const [aspectRatio, setAspectRatio] = useState<AspectRatioId>('1:1');
  const [model, setModel] = useState(defaultModel || DEFAULT_MODEL);
  const [modelParams, setModelParams] = useState<Record<string, unknown>>({});
  const [creativity, setCreativity] = useState(50);
  const [variationCount, setVariationCount] = useState(DEFAULT_VARIATIONS);
  const [referenceImageUrl, setReferenceImage] = useState<string | null>(null);
  const [referenceAssets, setReferenceAssets] = useState<SelectedAsset[]>([]);
  const [assetMode, setAssetMode] = useState<AssetMode>('style');
  const [selectedAssetsWithModes, setSelectedAssetsWithModes] = useState<SelectedAssetWithMode[]>([]);

  const updateSelectedAssets = useCallback((assets: SelectedAssetWithMode[]) => {
    setSelectedAssetsWithModes(assets);
    setReferenceAssets(
      assets.map((a) => ({
        id: a.id,
        thumbnail_url: a.thumbnail_url,
        title: a.title,
      })),
    );
  }, []);

  const [applyBrandContext, setApplyBrandContext] = useState(true);

  // Generation state
  const [variations, setVariations] = useState<GeneratedImage[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [batchId, setBatchId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [currentBatchVariations, setCurrentBatchVariations] = useState<GeneratedImage[]>([]);
  const currentBatchIdRef = useRef<string | null>(null);

  // Cleanup SSE on unmount
  useEffect(() => {
    return () => {
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
      }
    };
  }, []);

  // Load initial history
  const initialHistoryLoadedRef = useRef(false);
  useEffect(() => {
    if (initialHistory.length > 0 && !initialHistoryLoadedRef.current) {
      initialHistoryLoadedRef.current = true;
      setVariations(initialHistory);
    }
  }, [initialHistory]);

  const selectedConcept = conceptSlug
    ? concepts.find((c) => c.slug === conceptSlug) || null
    : null;

  // ---------------------------------------------------------------------------
  // SSE setup - uses supabase token and api baseURL
  // ---------------------------------------------------------------------------
  const setupSSE = useCallback(
    (batchId: string, token: string) => {
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
              setCurrentBatchVariations((prev) => [
                ...prev,
                {
                  success: true,
                  index: data.data.index,
                  document_id: data.data.document_id,
                  file_url: data.data.file_url,
                  thumbnail_url: data.data.thumbnail_url,
                  title: data.data.title,
                  modifier: data.data.modifier,
                  batchId: currentBatch || undefined,
                  generatedAt: new Date().toISOString(),
                },
              ]);
              break;

            case 'variation_failed':
              setPendingCount((prev) => Math.max(0, prev - 1));
              setCurrentBatchVariations((prev) => [
                ...prev,
                {
                  success: false,
                  index: data.data.index,
                  error: data.data.error,
                  batchId: currentBatch || undefined,
                  generatedAt: new Date().toISOString(),
                },
              ]);
              break;

            case 'batch_complete': {
              setCurrentBatchVariations([]);
              setVariations((history) => {
                const currentImages = data.data.images || [];
                const newImages: GeneratedImage[] = currentImages.map(
                  (img: Record<string, unknown>) => ({
                    success: true,
                    index: img.index as number,
                    document_id: img.document_id as string,
                    file_url: img.file_url as string,
                    thumbnail_url: img.thumbnail_url as string,
                    title: img.title as string,
                    modifier: img.modifier as string | undefined,
                    batchId: currentBatch || undefined,
                    generatedAt: new Date().toISOString(),
                  }),
                );
                const existingIds = new Set(newImages.map((i) => i.document_id));
                const filteredHistory = history.filter(
                  (h) => !existingIds.has(h.document_id),
                );
                return [...newImages, ...filteredHistory];
              });

              setIsGenerating(false);
              setPendingCount(0);
              eventSource.close();
              queryClient.invalidateQueries({ queryKey: ['documents', projectId] });

              const successCount = (data.data.completed as number) || 0;
              const failCount = (data.data.failed as number) || 0;
              if (successCount > 0) toast.success(`${successCount} imagens geradas com sucesso`);
              if (failCount > 0) toast.error(`${failCount} imagens falharam`);
              break;
            }

            case 'error':
              setCurrentBatchVariations((cb) => {
                if (cb.length > 0) setVariations((h) => [...cb, ...h]);
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

      eventSource.onerror = () => {
        console.error('SSE connection error');
        setIsGenerating(false);
        setPendingCount(0);
        eventSource.close();
      };
    },
    [projectId, queryClient],
  );

  // ---------------------------------------------------------------------------
  // Generate batch
  // ---------------------------------------------------------------------------
  const generate = useCallback(async () => {
    if (!prompt.trim() || isGenerating) return;

    setError(null);
    setIsGenerating(true);
    setPendingCount(variationCount);
    setCurrentBatchVariations([]);

    try {
      const assetsForApi =
        selectedAssetsWithModes.length > 0
          ? selectedAssetsWithModes.map((a) => ({ id: a.id, mode: a.mode }))
          : referenceAssets.length > 0
            ? referenceAssets.map((a) => ({ id: a.id, mode: assetMode }))
            : undefined;

      const result = await generateImageBatch({
        prompt: prompt.trim(),
        project_id: projectId,
        creative_concept: conceptSlug,
        aspect_ratio: aspectRatio,
        model,
        creativity: creativity / 100,
        count: variationCount,
        reference_image_url: referenceImageUrl,
        reference_asset_ids: assetsForApi ? assetsForApi.map((a) => a.id) : undefined,
        asset_modes: assetsForApi ? Object.fromEntries(assetsForApi.map(a => [a.id, a.mode])) : undefined,
        apply_brand_context: applyBrandContext,
      });

      if (result.status === 'processing' && result.batch_id) {
        setBatchId(result.batch_id);
        currentBatchIdRef.current = result.batch_id;

        const token = await getAccessToken();

        if (token) {
          setupSSE(result.batch_id, token);
        } else {
          setError('Erro de autenticação');
          setIsGenerating(false);
          setPendingCount(0);
          toast.error('Erro de autenticação ao conectar ao stream');
        }
      } else if (result.status === 'failed') {
        setError(result.message || 'Falha ao iniciar geração');
        setIsGenerating(false);
        setPendingCount(0);
        toast.error(result.message || 'Falha ao iniciar geração');
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
  ]);

  // ---------------------------------------------------------------------------
  // Actions
  // ---------------------------------------------------------------------------
  const refine = useCallback((image: GeneratedImage) => {
    if (image.file_url) {
      setReferenceImage(image.file_url);
      toast.info('Imagem definida como referência');
    }
  }, []);

  const save = useCallback(
    async (image: GeneratedImage) => {
      if (image.document_id) {
        toast.success('Imagem já salva no projeto');
        queryClient.invalidateQueries({ queryKey: ['documents', projectId] });
      }
    },
    [projectId, queryClient],
  );

  const attach = useCallback(
    async (image: GeneratedImage, documentId: string) => {
      if (!image.document_id) {
        toast.error('Imagem não encontrada');
        return;
      }
      try {
        await attachImageToDocument(documentId, image.document_id);
        toast.success('Imagem anexada ao documento');
        queryClient.invalidateQueries({ queryKey: documentKeys.byProject(projectId) });
      } catch (err) {
        console.error('Failed to attach image:', err);
        toast.error('Falha ao anexar imagem');
      }
    },
    [projectId, queryClient],
  );

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
    if (eventSourceRef.current) eventSourceRef.current.close();
  }, [defaultModel]);

  const clearVariations = useCallback(() => {
    setVariations([]);
    setCurrentBatchVariations([]);
    setBatchId(null);
    currentBatchIdRef.current = null;
    setError(null);
  }, []);

  const addVariation = useCallback((variation: GeneratedImage) => {
    setVariations((prev) => [variation, ...prev]);
  }, []);

  // Merge in-progress batch variations with completed history
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

    // Derived / extra
    selectedConcept,
    pendingCount,
    variationCount,
    referenceAssets,
    assetMode,
    selectedAssetsWithModes,
    applyBrandContext,
  };
}

export default useImageStudio;
