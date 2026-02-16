/**
 * DTOs for Documents Module
 *
 * Ported from backend/schemas.py (DocumentCreate, DocumentUpdate, Document)
 */

export interface DocumentCreateDto {
  title: string;
  content?: string;
  status?: string; // 'draft' | 'text_ok' | 'art_ok' | 'done' | 'published'
  media_type?: string; // 'text' | 'image' | 'pdf' | 'video'
  file_url?: string;
  thumbnail_url?: string;
  generation_metadata?: Record<string, any>;
  folder_id?: string;
  is_context?: boolean;
  is_reference_asset?: boolean;
  asset_type?: string;
  asset_metadata?: Record<string, any>;
  tags?: string[];
  campaign_id?: string;
  channel?: string;
}

export interface DocumentUpdateDto {
  title?: string;
  content?: string;
  status?: string;
  media_type?: string;
  file_url?: string;
  thumbnail_url?: string;
  generation_metadata?: Record<string, any>;
  folder_id?: string;
  is_context?: boolean;
  is_reference_asset?: boolean;
  asset_type?: string;
  asset_metadata?: Record<string, any>;
  tags?: string[];
  campaign_id?: string;
  channel?: string;
}

export interface DocumentResponseDto {
  id: string;
  title: string;
  content?: string;
  status: string;
  project_id: string;
  folder_id?: string;
  media_type: string;
  file_url?: string;
  thumbnail_url?: string;
  generation_metadata?: Record<string, any>;
  is_public?: boolean;
  share_token?: string;
  share_expires_at?: Date;
  is_reference_asset?: boolean;
  asset_type?: string;
  asset_metadata?: Record<string, any>;
  is_context?: boolean;
  tags?: string[];
  campaign_id?: string;
  channel?: string;
  created_at: Date;
  updated_at?: Date;
  deleted_at?: Date;
}

export interface DocumentListQueryDto {
  project_id?: string;
  folder_id?: string;
  media_type?: string;
  status?: string;
  search?: string;
  page?: number;
  limit?: number;
  campaign_id?: string;
}

export interface DocumentMoveDto {
  folder_id?: string;
}

export interface DocumentShareDto {
  expires_in_days?: number;
}

export interface ShareLinkResponseDto {
  share_token: string;
  share_url: string;
  expires_at?: string;
  is_public: boolean;
}

export interface DocumentAttachmentCreateDto {
  image_id: string;
  is_primary?: boolean;
  attachment_order?: number;
}

export interface DocumentAttachmentResponseDto {
  id: string;
  document_id: string;
  image_id: string;
  is_primary: boolean;
  attachment_order: number;
  created_at: Date;
  image?: DocumentResponseDto;
}

export interface VersionEntryDto {
  version: number;
  title: string;
  content: string;
  created_at: Date;
  created_by?: string;
}

export interface VersionHistoryResponseDto {
  document_id: string;
  current_version: number;
  versions: VersionEntryDto[];
}

export interface RestoreVersionResponseDto {
  success: boolean;
  message: string;
  current_version: number;
  restored_from: number;
}

export interface DeleteImagePermanentResponseDto {
  success: boolean;
  message: string;
  deleted_files: string[];
}

export interface DetachImageResponseDto {
  success: boolean;
  message: string;
  image_id: string;
}

export interface DocumentListResponseDto {
  documents: DocumentResponseDto[];
  total: number;
  page?: number;
  limit?: number;
  has_more?: boolean;
}
