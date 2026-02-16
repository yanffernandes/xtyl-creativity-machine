import { z } from 'zod';

// ============================================================================
// Enums
// ============================================================================

export const MediaTypeEnum = z.enum(['text', 'image', 'pdf', 'video']);
export const DocumentStatusEnum = z.enum(['draft', 'published', 'archived']);

// ============================================================================
// Request Schemas
// ============================================================================

export const CreateDocumentSchema = z.object({
  title: z.string().min(1).max(500),
  content: z.string().optional(),
  projectId: z.string(),
  mediaType: MediaTypeEnum.default('text').optional(),
  folderId: z.string().optional(),
});

export const UpdateDocumentSchema = z.object({
  title: z.string().min(1).max(500).optional(),
  content: z.string().optional(),
  status: DocumentStatusEnum.optional(),
  folderId: z.string().nullable().optional(),
});

export const ShareDocumentSchema = z.object({
  isPublic: z.boolean(),
  expiresAt: z.string().datetime().optional(),
});

export const DocumentListParamsSchema = z.object({
  projectId: z.string(),
  mediaType: MediaTypeEnum.optional(),
  status: DocumentStatusEnum.optional(),
  folderId: z.string().optional(),
  search: z.string().optional(),
  page: z.number().int().min(1).default(1).optional(),
  limit: z.number().int().min(1).max(100).default(20).optional(),
});

// ============================================================================
// Response Schemas
// ============================================================================

export const DocumentResponseSchema = z.object({
  id: z.string(),
  title: z.string(),
  content: z.string().nullable().optional(),
  status: z.string().default('draft'),
  mediaType: z.string().default('text'),
  fileUrl: z.string().nullable().optional(),
  thumbnailUrl: z.string().nullable().optional(),
  isPublic: z.boolean().default(false),
  shareToken: z.string().nullable().optional(),
  shareExpiresAt: z.string().datetime().nullable().optional(),
  projectId: z.string(),
  folderId: z.string().nullable().optional(),
  generationMetadata: z.record(z.unknown()).nullable().optional(),
  tags: z.array(z.string()).nullable().optional(),
  campaignId: z.string().nullable().optional(),
  channel: z.string().nullable().optional(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime().nullable().optional(),
});

// ============================================================================
// Inferred Types
// ============================================================================

export type CreateDocument = z.infer<typeof CreateDocumentSchema>;
export type UpdateDocument = z.infer<typeof UpdateDocumentSchema>;
export type ShareDocument = z.infer<typeof ShareDocumentSchema>;
export type DocumentListParams = z.infer<typeof DocumentListParamsSchema>;
export type DocumentResponse = z.infer<typeof DocumentResponseSchema>;
