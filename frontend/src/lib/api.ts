import axios from 'axios';
import { supabase } from './supabase';
import { getCachedSession, invalidateSessionCache } from './session-cache';

const api = axios.create({
    baseURL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000',
    headers: {
        'Content-Type': 'application/json',
    },
});

// T017: Request interceptor using cached session to eliminate 50-100ms overhead per request
api.interceptors.request.use(
    async (config) => {
        // Get cached session instead of calling getSession() every time
        // This reduces overhead from 50-100ms to ~0ms for cached sessions
        const session = await getCachedSession();

        if (session?.access_token) {
            config.headers.Authorization = `Bearer ${session.access_token}`;
        } else {
            console.warn('[API] No access token available for request:', config.url);
        }

        return config;
    },
    (error) => {
        return Promise.reject(error);
    }
);

// Response interceptor to handle 401 errors
api.interceptors.response.use(
    (response) => response,
    async (error) => {
        const originalRequest = error.config;

        // If error is 401 and we haven't tried to refresh yet
        if (error.response?.status === 401 && !originalRequest._retry) {
            originalRequest._retry = true;

            try {
                // Try to refresh the Supabase session
                const { data: { session }, error: refreshError } = await supabase.auth.refreshSession();

                if (refreshError || !session) {
                    // Refresh failed, redirect to login
                    console.error('Session refresh failed - redirecting to login');
                    invalidateSessionCache(); // Clear cached session on logout
                    await supabase.auth.signOut();

                    if (typeof window !== 'undefined') {
                        window.location.href = '/login';
                    }

                    return Promise.reject(error);
                }

                // Update the authorization header and retry
                originalRequest.headers.Authorization = `Bearer ${session.access_token}`;
                return api(originalRequest);
            } catch (refreshError) {
                console.error('Failed to refresh session:', refreshError);

                if (typeof window !== 'undefined') {
                    window.location.href = '/login';
                }

                return Promise.reject(refreshError);
            }
        }

        return Promise.reject(error);
    }
);

// ============================================================================
// BRAND IDENTITY TYPES (Feature 012)
// ============================================================================

export interface BrandTypography {
    primary: string | null;
    secondary: string | null;
    tertiary: string | null;
}

export interface BrandIdentity {
    color_palette: string[];  // HEX colors, max 6, ordered by priority
    typography: BrandTypography | null;
}

export interface ColorExtractionResult {
    colors: string[];
    source_filename: string;
    processing_time_ms: number;
    message: string | null;
}

// Project Settings API
// NOTE: Types kept for backwards compatibility, but use lib/supabase/projects.ts for new code
export interface ProjectSettings {
    client_name: string;
    description?: string | null;
    target_audience?: string | null;
    brand_voice?: string | null;
    brand_voice_custom?: string | null;
    key_messages?: string[] | null;
    competitors?: string[] | null;
    custom_notes?: string | null;
    brand_identity?: BrandIdentity | null;
}

export interface ProjectContext {
    formatted_context: string;
    has_settings: boolean;
    missing_fields: string[];
}

/**
 * @deprecated Use projectService from lib/supabase/projects.ts instead
 */
export async function getProjectSettings(projectId: string): Promise<ProjectSettings | null> {
    try {
        const response = await api.get(`/projects/${projectId}/settings`);
        // Return null if empty object (no settings configured)
        if (!response.data || Object.keys(response.data).length === 0) {
            return null;
        }
        return response.data;
    } catch (error: any) {
        if (error.response?.status === 404) {
            return null;
        }
        throw error;
    }
}

/**
 * @deprecated Use projectService from lib/supabase/projects.ts instead
 */
export async function updateProjectSettings(projectId: string, settings: ProjectSettings): Promise<ProjectSettings> {
    const response = await api.put(`/projects/${projectId}/settings`, settings);
    return response.data;
}

export async function getProjectContext(projectId: string): Promise<ProjectContext> {
    const response = await api.get(`/projects/${projectId}/settings/context`);
    return response.data;
}

// Brand Identity - Color Extraction API (Feature 012)
export async function extractColorsFromImage(projectId: string, file: File): Promise<ColorExtractionResult> {
    const formData = new FormData();
    formData.append('file', file);
    const response = await api.post(`/projects/${projectId}/extract-colors`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
    });
    return response.data;
}

export async function extractColorsFromAsset(projectId: string, assetId: string): Promise<ColorExtractionResult & { source_asset_id: string; source_asset_name: string }> {
    const response = await api.post(`/projects/${projectId}/extract-colors-from-asset`, { asset_id: assetId });
    return response.data;
}

// ============================================================================
// Smart Visual Assets API (Feature 011)
// ============================================================================

// Asset Categories
export type AssetCategory = 'Logo' | 'Pessoa' | 'Background' | 'Produto' | 'Referência' | 'Outro';
export type VisualContextMode = 'manual' | 'auto';

// Visual Asset Types
export interface VisualAsset {
    id: string;
    project_id: string;
    title: string;  // API returns "title" not "name"
    file_url?: string;
    thumbnail_url?: string;
    category?: AssetCategory;
    tags?: string[];
    ai_description?: string;
    is_classified: boolean;
    created_at: string;
    updated_at?: string;
}

export interface VisualAssetList {
    assets: VisualAsset[];
    total: number;
    by_category?: Record<string, VisualAsset[]>;
}

export interface VisualAssetsSummary {
    total: number;
    by_category: Record<string, number>;
}

// Classification Types
export interface AssetClassificationResult {
    asset_id: string;
    suggested_category: AssetCategory;
    suggested_tags: string[];
    ai_description: string;
    confidence?: number;
}

export interface AssetMetadataUpdate {
    category?: AssetCategory;
    tags?: string[];
    ai_description?: string;
}

// Visual Settings Types
export interface AssistantVisualSettings {
    id: string;
    project_id: string;
    is_enabled: boolean;
    mode: VisualContextMode;
    assets_per_category: number;
    created_at: string;
    updated_at?: string;
}

export interface AssistantVisualSettingsUpdate {
    is_enabled?: boolean;
    mode?: VisualContextMode;
    assets_per_category?: number;
}

// Asset Selection Types
export interface AssetSelection {
    id: string;
    asset_id: string;
    asset?: VisualAsset;
    is_enabled: boolean;
    created_at: string;
}

export interface AssetSelectionList {
    selections: AssetSelection[];
    total_enabled: number;
}

// Visual Context Types
export interface VisualContextResponse {
    is_enabled: boolean;
    mode?: VisualContextMode;
    assets: VisualAsset[];
    message?: string;
}

// Asset Classification API
export async function classifyAsset(assetId: string, force: boolean = false): Promise<AssetClassificationResult> {
    // AI classification can take time, especially with vision models - use 60s timeout
    const response = await api.post(`/assets/${assetId}/classify?force=${force}`, {}, { timeout: 60000 });
    return response.data;
}

export async function updateAssetMetadata(assetId: string, metadata: AssetMetadataUpdate): Promise<VisualAsset> {
    const response = await api.patch(`/assets/${assetId}/metadata`, metadata);
    return response.data;
}

// Visual Assets List API
export async function getVisualAssets(
    projectId: string,
    category?: AssetCategory,
    includeUnclassified: boolean = true
): Promise<VisualAssetList> {
    const params = new URLSearchParams();
    if (category) params.append('category', category);
    params.append('include_unclassified', String(includeUnclassified));

    const response = await api.get(`/projects/${projectId}/visual-assets?${params.toString()}`);
    return response.data;
}

export async function getVisualAssetsSummary(projectId: string): Promise<VisualAssetsSummary> {
    const response = await api.get(`/projects/${projectId}/visual-assets/summary`);
    return response.data;
}

// Visual Settings API
/**
 * @deprecated Use visualAssetService from lib/supabase/visual-assets.ts instead
 */
export async function getVisualSettings(projectId: string): Promise<AssistantVisualSettings> {
    const response = await api.get(`/projects/${projectId}/assistant/visual-settings`);
    return response.data;
}

/**
 * @deprecated Use visualAssetService from lib/supabase/visual-assets.ts instead
 */
export async function updateVisualSettings(
    projectId: string,
    update: AssistantVisualSettingsUpdate
): Promise<AssistantVisualSettings> {
    const response = await api.put(`/projects/${projectId}/assistant/visual-settings`, update);
    return response.data;
}

// Asset Selections API
/**
 * @deprecated Use visualAssetService from lib/supabase/visual-assets.ts instead
 */
export async function getAssetSelections(projectId: string): Promise<AssetSelectionList> {
    const response = await api.get(`/projects/${projectId}/assistant/visual-settings/selections`);
    return response.data;
}

/**
 * @deprecated Use visualAssetService from lib/supabase/visual-assets.ts instead
 */
export async function updateAssetSelections(projectId: string, assetIds: string[]): Promise<AssetSelectionList> {
    const response = await api.put(`/projects/${projectId}/assistant/visual-settings/selections`, {
        asset_ids: assetIds
    });
    return response.data;
}

// Visual Context API
/**
 * @deprecated Use visualAssetService from lib/supabase/visual-assets.ts instead
 */
export async function getVisualContext(projectId: string, limit: number = 5): Promise<VisualContextResponse> {
    const response = await api.get(`/projects/${projectId}/assistant/visual-context?limit=${limit}`);
    return response.data;
}

/**
 * @deprecated Use visualAssetService from lib/supabase/visual-assets.ts instead
 */
export async function recordAssetUsage(
    projectId: string,
    assetIds: string[],
    generationId?: string
): Promise<{ message: string; count: number }> {
    const response = await api.post(`/projects/${projectId}/assistant/visual-context/record-usage`, {
        asset_ids: assetIds,
        generation_id: generationId
    });
    return response.data;
}

// ============================================================================
// Document Attachment Actions API (Feature 016 - V1 Polish)
// ============================================================================

export interface DetachImageResponse {
    success: boolean;
    message: string;
    image_id: string;
}

export interface DeleteImagePermanentResponse {
    success: boolean;
    message: string;
    deleted_files: string[];
}

export interface AttachImageRequest {
    image_id: string;
    is_primary?: boolean;
    attachment_order?: number;
}

export interface DocumentAttachment {
    id: string;
    document_id: string;
    image_id: string;
    is_primary: boolean;
    attachment_order: number;
    created_at: string;
    image?: {
        id: string;
        title: string;
        file_url?: string;
        thumbnail_url?: string;
    };
}

/**
 * Attach an image to a document
 */
export async function attachImageToDocument(
    documentId: string,
    imageId: string,
    isPrimary: boolean = false
): Promise<DocumentAttachment> {
    const response = await api.post(`/documents/${documentId}/attachments`, {
        image_id: imageId,
        is_primary: isPrimary
    });
    return response.data;
}

/**
 * Detach an image from a document (keeps image in library)
 */
export async function detachImageFromDocument(
    documentId: string,
    attachmentId: string
): Promise<DetachImageResponse> {
    const response = await api.delete(`/documents/${documentId}/attachments/${attachmentId}`);
    return response.data;
}

/**
 * Permanently delete an image from document AND storage
 */
export async function deleteImagePermanently(
    documentId: string,
    attachmentId: string
): Promise<DeleteImagePermanentResponse> {
    const response = await api.delete(`/documents/${documentId}/attachments/${attachmentId}/permanent`);
    return response.data;
}

// ============================================================================
// Prompt Enrichment API (Feature 016 - V1 Polish)
// ============================================================================

export interface EnrichPromptRequest {
    prompt: string;
    project_id: string;
}

export interface EnrichPromptResponse {
    original_prompt: string;
    enriched_prompt: string;
    brand_context_applied: boolean;
    model_used: string;
}

/**
 * Enrich a user prompt with brand context and best practices
 */
export async function enrichPrompt(request: EnrichPromptRequest): Promise<EnrichPromptResponse> {
    const response = await api.post('/prompts/enrich', request);
    return response.data;
}

// System Messages Types
export interface ActiveSystemMessage {
    id: string;
    type: 'maintenance' | 'announcement' | 'warning' | 'info';
    title: string;
    content: string;
    dismissible: boolean;
    priority: number;
}

export interface ActiveSystemMessagesResponse {
    messages: ActiveSystemMessage[];
    count: number;
}

/**
 * Get active system messages for display to users (public endpoint)
 * @deprecated Use useSystemMessages hook from hooks/use-system-messages.ts instead
 */
export async function getActiveSystemMessages(): Promise<ActiveSystemMessagesResponse> {
    const response = await api.get('/system/messages');
    return response.data;
}

// ============================================================================
// Chat Templates API (Feature 019)
// ============================================================================

export interface StartChatFromTemplateRequest {
    template_id: string;
    variables: Record<string, string>;
    project_id?: string;
    title?: string;
}

export interface StartChatFromTemplateResponse {
    conversation_id: string;
    title: string;
    first_message: string | null;
}

/**
 * Start a new chat conversation from a template
 */
export async function startChatFromTemplate(
    request: StartChatFromTemplateRequest
): Promise<StartChatFromTemplateResponse> {
    const response = await api.post('/templates/start-chat', request);
    return response.data;
}

// ============================================================================
// Project Deletion API (Feature 020)
// ============================================================================

export interface CascadeSummary {
    documents: number;
    folders: number;
    workflow_templates: number;
    workflow_executions: number;
}

export interface DeleteProjectResponse {
    success: boolean;
    message: string;
    deleted_at: string;
    cascade_summary: CascadeSummary;
}

/**
 * Soft delete a project and cascade to all child entities.
 * Requires workspace owner or admin role.
 */
export async function deleteProject(projectId: string): Promise<DeleteProjectResponse> {
    const response = await api.delete(`/projects/${projectId}`);
    return response.data;
}

// ============================================================================
// Audio Transcription API (Feature 021 - Voice Input)
// ============================================================================

export interface TranscriptionResponse {
    text: string;
    duration_seconds: number;
    language: string;
    processing_time_ms: number;
}

/**
 * Transcribe audio file to text using OpenRouter's audio-capable models.
 *
 * @param audioBlob - Audio blob from MediaRecorder
 * @param languageHint - Optional ISO 639-1 language code (e.g., "pt", "en")
 * @returns TranscriptionResponse with transcribed text and metadata
 */
export async function transcribeAudio(
    audioBlob: Blob,
    languageHint?: string
): Promise<TranscriptionResponse> {
    const formData = new FormData();

    // Determine file extension from MIME type
    const mimeType = audioBlob.type || 'audio/webm';
    const extension = mimeType.includes('webm') ? 'webm'
        : mimeType.includes('mp4') ? 'mp4'
        : mimeType.includes('ogg') ? 'ogg'
        : 'webm';

    formData.append('audio', audioBlob, `recording.${extension}`);

    if (languageHint) {
        formData.append('language_hint', languageHint);
    }

    const response = await api.post('/chat/transcribe', formData, {
        headers: {
            'Content-Type': 'multipart/form-data'
        }
    });

    return response.data;
}

// ============================================================================
// User Memory API (Feature 024 - User Memory System)
// ============================================================================

import { UserMemory, MemoryCategory, MemoryListResponse, MemorySearchResponse } from '@/types/memory';

export interface CreateMemoryRequest {
    content: string;
    category?: MemoryCategory;
}

export interface UpdateMemoryRequest {
    content?: string;
    category?: MemoryCategory;
}

export interface SearchMemoriesRequest {
    query: string;
    limit?: number;
    category?: MemoryCategory;
}

/**
 * Get all memories for a project (paginated)
 * @deprecated Use memoryService from lib/supabase/memories.ts instead
 */
export async function getMemories(
    projectId: string,
    params?: { limit?: number; offset?: number; category?: MemoryCategory }
): Promise<MemoryListResponse> {
    const response = await api.get(`/projects/${projectId}/memories`, { params });
    return response.data;
}

/**
 * Get a single memory by ID
 * @deprecated Use memoryService from lib/supabase/memories.ts instead
 */
export async function getMemory(projectId: string, memoryId: string): Promise<UserMemory> {
    const response = await api.get(`/projects/${projectId}/memories/${memoryId}`);
    return response.data;
}

/**
 * Create a new memory (manual)
 * @deprecated Use memoryService from lib/supabase/memories.ts instead
 */
export async function createMemory(projectId: string, data: CreateMemoryRequest): Promise<UserMemory> {
    const response = await api.post(`/projects/${projectId}/memories`, data);
    return response.data;
}

/**
 * Update an existing memory
 * @deprecated Use memoryService from lib/supabase/memories.ts instead
 */
export async function updateMemory(
    projectId: string,
    memoryId: string,
    data: UpdateMemoryRequest
): Promise<UserMemory> {
    const response = await api.put(`/projects/${projectId}/memories/${memoryId}`, data);
    return response.data;
}

/**
 * Delete a single memory
 * @deprecated Use memoryService from lib/supabase/memories.ts instead
 */
export async function deleteMemory(projectId: string, memoryId: string): Promise<void> {
    await api.delete(`/projects/${projectId}/memories/${memoryId}`);
}

/**
 * Delete all memories for a project
 * @deprecated Use memoryService from lib/supabase/memories.ts instead
 */
export async function deleteAllMemories(projectId: string): Promise<{ deleted_count: number }> {
    const response = await api.delete(`/projects/${projectId}/memories`);
    return response.data;
}

/**
 * Search memories using semantic similarity
 * NOTE: This function is kept in the API as it requires pgvector operations on the backend
 */
export async function searchMemories(
    projectId: string,
    data: SearchMemoriesRequest
): Promise<MemorySearchResponse> {
    const response = await api.post(`/projects/${projectId}/memories/search`, data);
    return response.data;
}

// ============================================================================
// Project Bootstrap API (Feature 027 - Visual Generation Studio)
// ============================================================================

// Import types from centralized types file
import type { BootstrapData, StylePresetList } from '@/types/image-studio';

/**
 * Get all bootstrap data for a project in a single request.
 * Replaces 8+ individual API calls with 1 optimized endpoint.
 *
 * Returns: project, settings, models, visual_context, memories, recent_documents, style_presets
 */
export async function getProjectBootstrap(projectId: string): Promise<BootstrapData> {
    const response = await api.get(`/projects/${projectId}/bootstrap`);
    return response.data;
}

/**
 * Get all active style presets for image generation, grouped by type.
 *
 * Returns:
 * - visual_styles: Aesthetic/visual style presets (photographic, watercolor, etc.)
 * - layouts: Structure/layout presets for marketing (banner, carousel, etc.)
 */
export async function getStylePresets(): Promise<StylePresetList> {
    const response = await api.get('/image-generation/style-presets');
    return response.data;
}

// ============================================================================
// Image Batch Generation API (Feature 027 - Visual Generation Studio)
// ============================================================================

export interface ImageBatchRequest {
    prompt: string;
    project_id: string;
    count?: number;
    model?: string;
    visual_style?: string | null;
    layout?: string | null;
    style_preset?: string | null; // Legacy field
    size?: string;
    aspect_ratio?: string;
    creativity?: number;
    reference_image_url?: string | null;
    // Feature 028: Visual context and campaign support
    reference_assets?: string[];  // Array of asset UUIDs
    reference_asset_modes?: Array<{ id: string; mode: 'style' | 'compose' | 'base' }>;  // Per-asset modes
    asset_mode?: 'style' | 'compose' | 'base';  // Deprecated: global mode for all assets
    apply_brand_context?: boolean;
    campaign_id?: string;
    tags?: string[];
    channel?: string;
}

export interface ImageBatchResponse {
    batch_id: string;
    status: string;
    message: string;
}

/**
 * Start batch image generation.
 * Returns a batch_id for tracking progress via SSE.
 */
export async function generateImageBatch(request: ImageBatchRequest): Promise<ImageBatchResponse> {
    const response = await api.post('/image-generation/generate-batch', request);
    return response.data;
}

/**
 * Get the SSE stream URL for batch progress.
 * Token is passed via query param since EventSource doesn't support headers.
 */
export function getBatchStreamUrl(batchId: string, token: string): string {
    const baseUrl = api.defaults.baseURL || '';
    return `${baseUrl}/image-generation/batch/${batchId}/stream?token=${encodeURIComponent(token)}`;
}

// ============================================================================
// Copy Library API (Feature 028 - Agency Studio Flow)
// ============================================================================

export interface CopyLibraryItem {
    id: string;
    workspace_id: string;
    title: string;
    content: string;
    tags: string[];
    created_by: string | null;
    created_at: string;
    updated_at: string;
}

export interface CopyLibraryListResponse {
    items: CopyLibraryItem[];
    total: number;
}

export interface CreateCopyRequest {
    title: string;
    content: string;
    tags?: string[];
}

export interface UpdateCopyRequest {
    title?: string;
    content?: string;
    tags?: string[];
}

export interface ListCopiesParams {
    search?: string;
    tags?: string[];
    limit?: number;
    offset?: number;
}

/**
 * List copy library items for a workspace
 */
export async function listCopies(
    workspaceId: string,
    params?: ListCopiesParams
): Promise<CopyLibraryListResponse> {
    const response = await api.get(`/workspaces/${workspaceId}/copies`, { params });
    return response.data;
}

/**
 * Get a single copy library item
 */
export async function getCopy(workspaceId: string, copyId: string): Promise<CopyLibraryItem> {
    const response = await api.get(`/workspaces/${workspaceId}/copies/${copyId}`);
    return response.data;
}

/**
 * Create a new copy library item
 */
export async function createCopy(
    workspaceId: string,
    data: CreateCopyRequest
): Promise<CopyLibraryItem> {
    const response = await api.post(`/workspaces/${workspaceId}/copies`, data);
    return response.data;
}

/**
 * Update an existing copy library item
 */
export async function updateCopy(
    workspaceId: string,
    copyId: string,
    data: UpdateCopyRequest
): Promise<CopyLibraryItem> {
    const response = await api.put(`/workspaces/${workspaceId}/copies/${copyId}`, data);
    return response.data;
}

/**
 * Delete a copy library item
 */
export async function deleteCopy(workspaceId: string, copyId: string): Promise<void> {
    await api.delete(`/workspaces/${workspaceId}/copies/${copyId}`);
}

// ============================================================================
// Campaigns API (Feature 028 - Agency Studio Flow)
// ============================================================================

export interface Campaign {
    id: string;
    project_id: string;
    name: string;
    channel: string | null;
    metadata: Record<string, unknown>;
    created_at: string;
    updated_at: string;
}

export interface CampaignListResponse {
    items: Campaign[];
    total: number;
}

export interface CreateCampaignRequest {
    name: string;
    channel?: string;
    metadata?: Record<string, unknown>;
}

export interface UpdateCampaignRequest {
    name?: string;
    channel?: string;
    metadata?: Record<string, unknown>;
}

/**
 * List campaign packages for a project
 */
export async function listCampaigns(
    projectId: string,
    channel?: string
): Promise<CampaignListResponse> {
    const params = channel ? { channel } : undefined;
    const response = await api.get(`/projects/${projectId}/campaigns`, { params });
    return response.data;
}

/**
 * Get a single campaign package
 */
export async function getCampaign(projectId: string, campaignId: string): Promise<Campaign> {
    const response = await api.get(`/projects/${projectId}/campaigns/${campaignId}`);
    return response.data;
}

/**
 * Create a new campaign package
 */
export async function createCampaign(
    projectId: string,
    data: CreateCampaignRequest
): Promise<Campaign> {
    const response = await api.post(`/projects/${projectId}/campaigns`, data);
    return response.data;
}

/**
 * Update an existing campaign package
 */
export async function updateCampaign(
    projectId: string,
    campaignId: string,
    data: UpdateCampaignRequest
): Promise<Campaign> {
    const response = await api.put(`/projects/${projectId}/campaigns/${campaignId}`, data);
    return response.data;
}

/**
 * Delete a campaign package
 */
export async function deleteCampaign(projectId: string, campaignId: string): Promise<void> {
    await api.delete(`/projects/${projectId}/campaigns/${campaignId}`);
}

// ============================================================================
// fal.ai Image Operations API (Feature 029 - fal.ai Migration)
// ============================================================================

export type ImageOperationType = 'inpaint' | 'edit' | 'remove_bg' | 'upscale' | 'enhance' | 'generate';
export type OperationStatus = 'pending' | 'processing' | 'completed' | 'failed';
export type ModelCategory = 'generation' | 'editing' | 'utility' | 'video';

export interface ImageOperationResponse {
    operation_id: string;
    document_id: string;
    file_url: string;
    thumbnail_url: string;
    operation_type: ImageOperationType;
    model_used: string;
    cost_cents: number;
    processing_time_ms?: number;
}

export interface FalModel {
    id: string;
    model_id: string;
    display_name: string;
    description: string | null;
    category: ModelCategory;
    supports_mask: boolean;
    supports_reference: boolean;
    supports_prompt: boolean;
    max_resolution: number;
    supported_aspect_ratios: string[];
    price_per_mp: number | null;
    price_per_image: number | null;
    is_visible: boolean;
    is_default: boolean;
}

export interface FalModelListResponse {
    models: FalModel[];
    categories: string[];
}

// Inpaint Request/Response
export interface InpaintRequest {
    image_url: string;
    mask_url: string;
    prompt: string;
    project_id: string;
    model?: string;
    guidance_scale?: number;
    num_inference_steps?: number;
}

/**
 * Inpaint image with mask using fal.ai
 * White areas in mask will be edited, black areas preserved
 */
export async function inpaintImage(request: InpaintRequest): Promise<ImageOperationResponse> {
    const response = await api.post('/image-generation/inpaint', request);
    return response.data;
}

// Edit Request/Response
export interface EditRequest {
    image_url: string;
    prompt: string;
    project_id: string;
    model?: string;
    preserve_elements?: string[];
    guidance_scale?: number;
}

/**
 * Edit image with natural language instructions using fal.ai
 */
export async function editImage(request: EditRequest): Promise<ImageOperationResponse> {
    const response = await api.post('/image-generation/edit', request);
    return response.data;
}

// Remove Background Request/Response
export interface RemoveBackgroundRequest {
    image_url: string;
    project_id: string;
    output_format?: 'png' | 'webp';
}

/**
 * Remove background from image using fal.ai
 * Returns PNG with alpha channel transparency
 */
export async function removeBackground(request: RemoveBackgroundRequest): Promise<ImageOperationResponse> {
    const response = await api.post('/image-generation/remove-background', request);
    return response.data;
}

// Upscale Request/Response
export interface UpscaleRequest {
    image_url: string;
    project_id: string;
    scale_factor?: number; // 2 or 4
    model?: string;
}

/**
 * Upscale image resolution using fal.ai
 */
export async function upscaleImage(request: UpscaleRequest): Promise<ImageOperationResponse> {
    const response = await api.post('/image-generation/upscale', request);
    return response.data;
}

// Enhance Request/Response
export interface EnhanceRequest {
    image_url: string;
    project_id: string;
    enhancement_type?: 'auto' | 'faces' | 'details' | 'colors';
}

/**
 * Enhance image quality using fal.ai
 */
export async function enhanceImage(request: EnhanceRequest): Promise<ImageOperationResponse> {
    const response = await api.post('/image-generation/enhance', request);
    return response.data;
}

/**
 * Get list of available fal.ai models
 * @param category Optional filter by category (generation, editing, utility, video)
 */
export async function getFalModels(category?: ModelCategory): Promise<FalModelListResponse> {
    const params = category ? { category } : undefined;
    const response = await api.get('/image-generation/fal-models', { params });
    return response.data;
}

/**
 * Upload mask data URL to storage and return the URL
 * Helper function to convert base64 mask to uploaded file
 */
export async function uploadMaskFromDataUrl(
    dataUrl: string,
    projectId: string
): Promise<{ url: string }> {
    // Convert data URL to blob
    const response = await fetch(dataUrl);
    const blob = await response.blob();

    // Create form data
    const formData = new FormData();
    formData.append('file', blob, 'mask.png');
    formData.append('project_id', projectId);

    // Upload to storage
    const uploadResponse = await api.post('/storage/upload-mask', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
    });

    return uploadResponse.data;
}

export default api;
