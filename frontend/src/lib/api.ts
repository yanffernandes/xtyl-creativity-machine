import axios from 'axios';
import { supabase } from './supabase';

const api = axios.create({
    baseURL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000',
    headers: {
        'Content-Type': 'application/json',
    },
});

// Request interceptor to add Supabase access token
api.interceptors.request.use(
    async (config) => {
        // Get current session from Supabase
        const { data: { session }, error } = await supabase.auth.getSession();

        if (error) {
            console.error('[API] Error getting session:', error);
        }

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
export type AssetCategory = 'Logo' | 'Pessoa' | 'Background' | 'Produto' | 'Outro';
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
export async function getVisualSettings(projectId: string): Promise<AssistantVisualSettings> {
    const response = await api.get(`/projects/${projectId}/assistant/visual-settings`);
    return response.data;
}

export async function updateVisualSettings(
    projectId: string,
    update: AssistantVisualSettingsUpdate
): Promise<AssistantVisualSettings> {
    const response = await api.put(`/projects/${projectId}/assistant/visual-settings`, update);
    return response.data;
}

// Asset Selections API
export async function getAssetSelections(projectId: string): Promise<AssetSelectionList> {
    const response = await api.get(`/projects/${projectId}/assistant/visual-settings/selections`);
    return response.data;
}

export async function updateAssetSelections(projectId: string, assetIds: string[]): Promise<AssetSelectionList> {
    const response = await api.put(`/projects/${projectId}/assistant/visual-settings/selections`, {
        asset_ids: assetIds
    });
    return response.data;
}

// Visual Context API
export async function getVisualContext(projectId: string, limit: number = 5): Promise<VisualContextResponse> {
    const response = await api.get(`/projects/${projectId}/assistant/visual-context?limit=${limit}`);
    return response.data;
}

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

export default api;
