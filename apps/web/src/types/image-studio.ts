/**
 * TypeScript types for Visual Generation Studio
 * Ported from frontend/src/types/image-studio.ts
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
// VISUAL ASSET (from bootstrap)
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
// MEMORY (from bootstrap)
// ============================================================================

export interface Memory {
  id: string;
  user_id: string;
  project_id: string;
  content: string;
  category: 'personal' | 'professional' | 'preference' | 'plan' | 'health' | 'other';
  source_conversation_id: string | null;
  created_at: string;
  updated_at: string;
}

// ============================================================================
// DOCUMENT (from bootstrap)
// ============================================================================

export interface Document {
  id: string;
  title: string;
  content: string | null;
  status: string;
  project_id: string;
  folder_id: string | null;
  media_type: 'text' | 'image' | 'pdf';
  file_url: string | null;
  thumbnail_url: string | null;
  generation_metadata: Record<string, unknown> | null;
  is_public: boolean;
  share_token: string | null;
  share_expires_at: string | null;
  is_reference_asset: boolean;
  asset_type: string | null;
  asset_metadata: Record<string, unknown> | null;
  is_context: boolean;
  created_at: string;
  updated_at: string | null;
}

// ============================================================================
// PROJECT (from bootstrap)
// ============================================================================

export interface Project {
  id: string;
  name: string;
  description: string | null;
  settings: Record<string, unknown> | null;
  created_at: string;
}

// ============================================================================
// BOOTSTRAP DATA
// ============================================================================

export interface BootstrapData {
  project: Project;
  settings: Record<string, unknown> | null;
  models: {
    text: AvailableModel[];
    image: AvailableModel[];
    default_image_model?: string | null;
  };
  visual_context: VisualAsset[];
  memories: Memory[];
  recent_copies: Document[];
  recent_media: Document[];
  /** @deprecated Use recent_copies or recent_media instead */
  recent_documents: Document[];
  creative_concepts: CreativeConcept[];
}

// ============================================================================
// BATCH IMAGE GENERATION
// ============================================================================

export interface ImageBatchRequest {
  prompt: string;
  project_id: string;
  creative_concept?: string | null;
  aspect_ratio?: AspectRatioId;
  model?: string;
  creativity?: number;
  count?: number;
  reference_image_url?: string | null;
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
  batchId?: string;
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
}

export interface ImageStudioActions {
  setPrompt: (prompt: string) => void;
  setConcept: (slug: string | null) => void;
  setAspectRatio: (ratio: ImageStudioState['aspectRatio']) => void;
  setModel: (model: string) => void;
  setCreativity: (value: number) => void;
  setReferenceImage: (url: string | null) => void;
  generate: () => Promise<void>;
  refine: (image: GeneratedImage) => void;
  save: (image: GeneratedImage, folderId?: string) => Promise<void>;
  reset: () => void;
}

// ============================================================================
// FORMAT OPTIONS
// ============================================================================

export type AspectRatioId = '1:1' | '16:9' | '9:16' | '4:3' | '3:4' | '3:2' | '2:3' | '21:9';

export interface FormatOption {
  id: AspectRatioId;
  label: string;
  width: number;
  height: number;
  icon?: string;
}

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
