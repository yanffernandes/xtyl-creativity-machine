/**
 * Agency Studio Flow Types (Feature 028)
 * Types for agency-scale image generation workflow
 */

// ============================================================================
// COPY LIBRARY
// ============================================================================

export interface CopyLibraryItem {
  id: string;
  workspace_id: string;
  title: string;
  content: string;
  tags: string[];
  created_by?: string;
  created_at: string;
  updated_at: string;
}

export interface CopyLibraryItemCreate {
  title: string;
  content: string;
  tags?: string[];
}

export interface CopyLibraryItemUpdate {
  title?: string;
  content?: string;
  tags?: string[];
}

export interface CopyLibraryList {
  items: CopyLibraryItem[];
  total: number;
}

// ============================================================================
// CAMPAIGNS
// ============================================================================

export interface Campaign {
  id: string;
  project_id: string;
  name: string;
  channel?: string;
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export interface CampaignCreate {
  name: string;
  channel?: string;
  metadata?: Record<string, unknown>;
}

export interface CampaignUpdate {
  name?: string;
  channel?: string;
  metadata?: Record<string, unknown>;
}

export interface CampaignList {
  items: Campaign[];
  total: number;
}

// ============================================================================
// IMAGE MASKS
// ============================================================================

export interface ImageMask {
  id: string;
  document_id: string;
  mask_url: string;
  prompt?: string;
  result_document_id?: string;
  created_by?: string;
  created_at: string;
}

export interface ImageMaskCreate {
  document_id: string;
  mask_base64: string;
  prompt: string;
  model?: string;
}

export interface RefineWithMaskResponse {
  mask_id: string;
  status: string;
  result_document_id?: string;
}

// ============================================================================
// DOCUMENT VERSIONS
// ============================================================================

export interface VersionEntry {
  version: number;
  title: string;
  content: string;
  created_at: string;
  created_by?: string;
}

export interface VersionHistoryResponse {
  document_id: string;
  current_version: number;
  versions: VersionEntry[];
}

// ============================================================================
// EXTENDED BATCH REQUEST
// ============================================================================

export interface ImageBatchRequestExtended {
  prompt: string;
  project_id: string;
  count?: number;
  model?: string;
  visual_style?: string;
  layout?: string;
  style_preset?: string;
  size?: string;
  aspect_ratio?: string;
  // Feature 028 additions
  reference_assets?: string[];
  asset_mode?: 'style' | 'compose' | 'base';
  apply_brand_context?: boolean;
  campaign_id?: string;
  tags?: string[];
  channel?: string;
}

// ============================================================================
// KANBAN MULTI-SELECT
// ============================================================================

export interface KanbanSelection {
  documentIds: string[];
  count: number;
}

export interface BatchCopyItem {
  id: string;
  title: string;
  content: string;
  status: 'pending' | 'generating' | 'complete' | 'error';
  batchId?: string;
  generatedImages?: string[];
  error?: string;
}

// ============================================================================
// BRUSH CANVAS
// ============================================================================

export interface BrushState {
  isDrawing: boolean;
  brushSize: number;
  color: string;
  paths: Array<{
    points: Array<{ x: number; y: number }>;
    size: number;
  }>;
}

export interface BrushCanvasProps {
  imageUrl: string;
  width: number;
  height: number;
  onMaskReady: (maskBase64: string) => void;
}

// ============================================================================
// CHANNEL OPTIONS
// ============================================================================

export const CHANNEL_OPTIONS = [
  { value: 'instagram', label: 'Instagram' },
  { value: 'facebook', label: 'Facebook' },
  { value: 'tiktok', label: 'TikTok' },
  { value: 'twitter', label: 'Twitter/X' },
  { value: 'linkedin', label: 'LinkedIn' },
  { value: 'youtube', label: 'YouTube' },
  { value: 'email', label: 'Email' },
  { value: 'whatsapp', label: 'WhatsApp' },
  { value: 'website', label: 'Website' },
  { value: 'print', label: 'Print' },
  { value: 'other', label: 'Outro' },
] as const;

export type ChannelType = typeof CHANNEL_OPTIONS[number]['value'];
