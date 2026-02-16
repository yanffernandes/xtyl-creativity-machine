/**
 * Projects Module DTOs
 * Corresponds to backend/schemas.py project-related schemas
 */

export interface BrandTypography {
  primary?: string;
  secondary?: string;
  tertiary?: string;
}

export interface BrandIdentity {
  color_palette: string[];
  typography?: BrandTypography;
}

export interface ProjectSettings {
  client_name: string;
  description?: string;
  target_audience?: string;
  brand_voice?: string;
  brand_voice_custom?: string;
  key_messages?: string[];
  competitors?: string[];
  custom_notes?: string;
  brand_identity?: BrandIdentity;
}

export interface ProjectSettingsUpdate {
  client_name: string;
  description?: string;
  target_audience?: string;
  brand_voice?: string;
  brand_voice_custom?: string;
  key_messages?: string[];
  competitors?: string[];
  custom_notes?: string;
  brand_identity?: BrandIdentity;
}

export interface ProjectContext {
  formatted_context: string;
  has_settings: boolean;
  missing_fields: string[];
}

export interface ColorExtractionResult {
  colors: string[];
  source_filename: string;
  processing_time_ms: number;
  message?: string;
}

export interface AssetColorExtractionRequest {
  asset_id: string;
}

export interface AssetColorExtractionResult {
  colors: string[];
  source_filename: string;
  processing_time_ms: number;
  message?: string;
  source_asset_id: string;
  source_asset_name: string;
}

export interface CascadeSummary {
  documents_deleted: number;
  folders_deleted: number;
  workflow_templates_deleted: number;
  workflow_executions_deleted: number;
  user_memories_deleted?: number;
}

export interface DeleteProjectResponse {
  success: boolean;
  message: string;
  deleted_at: string;
  cascade_summary: CascadeSummary;
}

export interface AvailableModel {
  id: string;
  name: string;
  description?: string;
  output_modalities: string[];
}

export interface ModelsConfig {
  text: AvailableModel[];
  image: AvailableModel[];
  default_image_model?: string;
}

export interface VisualAsset {
  id: string;
  project_id: string;
  name: string;
  file_url?: string;
  thumbnail_url?: string;
  category?: string;
  tags?: string[];
  ai_description?: string;
  is_classified: boolean;
  created_at: Date;
  updated_at?: Date;
}

export interface MemoryResponse {
  id: string;
  user_id: string;
  project_id: string;
  content: string;
  category?: string;
  source_conversation_id?: string;
  created_at: Date;
  updated_at?: Date;
}

export interface Document {
  id: string;
  title?: string;
  content?: string;
  status?: string;
  project_id?: string;
  folder_id?: string;
  media_type?: string;
  file_url?: string;
  thumbnail_url?: string;
  generation_metadata?: any;
  is_reference_asset?: boolean;
  asset_type?: string;
  created_at: Date;
  updated_at?: Date;
  deleted_at?: Date;
}

export interface CreativeConcept {
  id: string;
  name: string;
  description?: string;
  thumbnail_url?: string;
  prompt_template?: string;
  category?: string;
  tags?: string[];
  is_active: boolean;
  sort_order: number;
  created_at: Date;
  updated_at?: Date;
}

export interface Project {
  id: string;
  name: string;
  description?: string;
  settings?: any;
  created_at: Date;
}

export interface BootstrapData {
  project: Project;
  settings?: any;
  models: ModelsConfig;
  visual_context: VisualAsset[];
  memories: MemoryResponse[];
  recent_copies: Document[];
  recent_media: Document[];
  recent_documents: Document[]; // deprecated
  creative_concepts: CreativeConcept[];
}
