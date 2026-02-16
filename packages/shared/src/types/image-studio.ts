/**
 * TypeScript types for Image Studio
 * Feature 032 - Full-Stack Migration
 *
 * Shared types between backend (NestJS) and frontend (React)
 */

// ============================================================================
// CREATIVE CONCEPTS
// ============================================================================

export interface CreativeConcept {
  id: string;
  name: string;
  name_pt: string;
  slug: string;
  description?: string | null;
  prompt_modifier: string;
  thumbnail_url: string | null;
  prompt_template?: string | null;
  prompt_template_json?: Record<string, unknown> | null;
  template_variables?: string[] | null;
  icon?: string | null;
  category?: string | null;
  niche?: string | null;
  works_for_niches?: string[] | null;
  example_images?: unknown[] | null;
  sort_order: number;
  is_active: boolean;
  created_at: string;
  updated_at?: string | null;
}

export interface CreativeConceptList {
  concepts: CreativeConcept[];
  total: number;
}

// ============================================================================
// AVAILABLE MODELS
// ============================================================================

export interface AvailableModel {
  id: string;
  name: string;
  description?: string | null;
  context_length?: number | null;
  pricing_prompt?: string | null;
  pricing_completion?: string | null;
  top_provider?: string | null;
  output_modalities?: string[] | null;
}

// ============================================================================
// VISUAL ASSETS
// ============================================================================

export interface VisualAsset {
  id: string;
  project_id: string;
  name: string;
  file_url: string | null;
  thumbnail_url: string | null;
  category: string | null;
  tags: string[] | null;
  ai_description: string | null;
  is_classified: boolean;
  created_at: string;
  updated_at: string | null;
}

// ============================================================================
// BATCH IMAGE GENERATION
// ============================================================================

export type AspectRatioId = '1:1' | '16:9' | '9:16' | '4:3' | '3:4' | '3:2' | '2:3' | '21:9';

export interface FormatOption {
  id: AspectRatioId;
  label: string;
  width: number;
  height: number;
  icon?: string;
}

/**
 * Supported aspect ratios and their resolutions
 */
export const FORMAT_OPTIONS: FormatOption[] = [
  { id: '1:1', label: 'Quadrado', width: 1024, height: 1024 },
  { id: '16:9', label: 'Paisagem', width: 1344, height: 768 },
  { id: '9:16', label: 'Story', width: 768, height: 1344 },
  { id: '4:3', label: 'Tela 4:3', width: 1184, height: 864 },
  { id: '3:4', label: 'Retrato', width: 864, height: 1184 },
  { id: '3:2', label: 'Foto 3:2', width: 1248, height: 832 },
  { id: '2:3', label: 'Foto 2:3', width: 832, height: 1248 },
  { id: '21:9', label: 'Ultra wide', width: 1536, height: 672 },
];

export interface ImageBatchRequest {
  prompt: string;
  project_id: string;
  creative_concept?: string | null;
  aspect_ratio?: AspectRatioId;
  model?: string;
  creativity?: number;
  count?: number;
  reference_image_url?: string | null;
  // Feature 028: Reference assets
  reference_asset_ids?: string[];
  asset_modes?: Record<string, 'style' | 'compose' | 'base'>;
  apply_brand_context?: boolean;
  // Feature 029: Model-specific parameters (fal.ai)
  model_params?: Record<string, unknown>;
}

export interface ImageBatchResponse {
  batch_id: string;
  status: 'processing' | 'completed' | 'failed';
  message?: string | null;
}

export interface GeneratedImage {
  success: boolean;
  index: number;
  document_id?: string;
  file_url?: string;
  thumbnail_url?: string;
  title?: string;
  modifier?: string;
  error?: string;
  /** Batch ID for grouping variations in history view */
  batchId?: string;
  /** Timestamp when image was generated */
  generatedAt?: string;
}

export interface ImageBatchProgress {
  batch_id: string;
  total: number;
  completed: number;
  failed: number;
  images: GeneratedImage[];
  errors: string[];
}

// ============================================================================
// SSE EVENTS
// ============================================================================

export type BatchSSEEventType =
  | 'variation_started'
  | 'variation_complete'
  | 'variation_failed'
  | 'batch_complete'
  | 'error';

export interface BatchSSEEvent {
  type: BatchSSEEventType;
  data: GeneratedImage | ImageBatchProgress | { message: string } | { error: string };
}

// ============================================================================
// IMAGE STUDIO STATE
// ============================================================================

export interface ImageStudioState {
  prompt: string;
  concept: string | null;
  aspectRatio: AspectRatioId;
  model: string;
  creativity: number;
  variations: GeneratedImage[];
  isGenerating: boolean;
  batchId: string | null;
  error: string | null;
  referenceImageUrl: string | null;
  // Feature 028: Reference assets with modes
  selectedAssetsWithModes: SelectedAssetWithMode[];
  applyBrandContext: boolean;
  // Feature 029: Model-specific parameters
  modelParams: Record<string, unknown>;
}

export interface ImageStudioActions {
  setPrompt: (prompt: string) => void;
  setConcept: (slug: string | null) => void;
  setAspectRatio: (ratio: AspectRatioId) => void;
  setModel: (model: string) => void;
  setCreativity: (value: number) => void;
  setReferenceImage: (url: string | null) => void;
  updateSelectedAssets: (assets: SelectedAssetWithMode[]) => void;
  setApplyBrandContext: (apply: boolean) => void;
  setModelParams: (params: Record<string, unknown>) => void;
  generate: () => Promise<void>;
  refine: (image: GeneratedImage) => void;
  save: (image: GeneratedImage, folderId?: string) => Promise<void>;
  reset: () => void;
}

// ============================================================================
// ASSET MODES (Feature 028)
// ============================================================================

export type AssetMode = 'style' | 'compose' | 'base';

export interface SelectedAsset {
  id: string;
  thumbnail_url?: string;
  title?: string;
}

export interface SelectedAssetWithMode {
  id: string;
  mode: AssetMode;
  thumbnail_url?: string;
  title?: string;
}

// ============================================================================
// EDIT OPERATIONS (Feature 029 - fal.ai)
// ============================================================================

export interface InpaintRequest {
  project_id: string;
  image_url: string;
  mask_url: string;
  prompt: string;
  model?: string;
}

export interface ImageEditRequest {
  project_id: string;
  image_url: string;
  instruction: string;
  model?: string;
}

export interface RemoveBackgroundRequest {
  project_id: string;
  image_url: string;
  model?: string;
}

export interface UpscaleRequest {
  project_id: string;
  image_url: string;
  scale?: number; // 2x, 4x
  model?: string;
}

export interface EnhanceRequest {
  project_id: string;
  image_url: string;
  model?: string;
}
