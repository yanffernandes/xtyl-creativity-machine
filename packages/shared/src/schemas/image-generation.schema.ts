import { z } from 'zod';

// ============================================================================
// Request Schemas
// ============================================================================

export const GenerateImageSchema = z.object({
  prompt: z.string().min(1).max(4000),
  model: z.string(),
  projectId: z.string(),
  width: z.number().int().min(256).max(4096).optional(),
  height: z.number().int().min(256).max(4096).optional(),
  numImages: z.number().int().min(1).max(8).default(1).optional(),
  negativePrompt: z.string().max(2000).optional(),
  guidanceScale: z.number().min(1).max(20).optional(),
  numInferenceSteps: z.number().int().min(1).max(100).optional(),
  seed: z.number().int().optional(),
  strength: z.number().min(0).max(1).optional(),
  imageUrl: z.string().url().optional(),
  maskUrl: z.string().url().optional(),
  aspectRatio: z.string().optional(),
});

export const BatchGenerateSchema = z.object({
  requests: z.array(GenerateImageSchema).min(1).max(8),
});

// ============================================================================
// Response Schemas
// ============================================================================

export const ImageModelResponseSchema = z.object({
  id: z.string(),
  name: z.string(),
  provider: z.string(),
  capabilities: z.array(z.string()),
  maxResolution: z.object({
    width: z.number().int(),
    height: z.number().int(),
  }).optional(),
  supportsImageInput: z.boolean().default(false),
  supportsMask: z.boolean().default(false),
});

export const ImageGenerationResponseSchema = z.object({
  id: z.string(),
  status: z.string(),
  imageUrl: z.string().nullable().optional(),
  thumbnailUrl: z.string().nullable().optional(),
  prompt: z.string(),
  model: z.string(),
  metadata: z.record(z.unknown()).nullable().optional(),
  processingTimeMs: z.number().int().optional(),
});

// ============================================================================
// Inferred Types
// ============================================================================

export type GenerateImage = z.infer<typeof GenerateImageSchema>;
export type BatchGenerate = z.infer<typeof BatchGenerateSchema>;
export type ImageModelResponse = z.infer<typeof ImageModelResponseSchema>;
export type ImageGenerationResponse = z.infer<typeof ImageGenerationResponseSchema>;
