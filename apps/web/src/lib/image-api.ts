/**
 * Image API Helper Functions
 * Feature 029: fal.ai Migration
 *
 * Wrapper functions for image generation API calls.
 */

import api from './api';

// ============================================================================
// TYPES
// ============================================================================

interface ImageOperationResult {
  document_id: string;
  file_url: string;
  thumbnail_url: string;
  title: string;
}

interface GenerateImageUnifiedParams {
  prompt: string;
  project_id: string;
  model: string;
  image_urls?: string[];
  mask_url?: string;
  params?: Record<string, unknown>;
}

interface RemoveBackgroundParams {
  image_url: string;
  project_id: string;
  output_format?: string;
}

interface UpscaleImageParams {
  image_url: string;
  project_id: string;
  scale_factor: number;
}

interface EnhanceImageParams {
  image_url: string;
  project_id: string;
  enhancement_type?: string;
}

// ============================================================================
// API FUNCTIONS
// ============================================================================

/**
 * Upload a mask image from a data URL
 */
export async function uploadMaskFromDataUrl(
  dataUrl: string,
  projectId: string,
): Promise<{ url: string }> {
  // Convert data URL to blob
  const response = await fetch(dataUrl);
  const blob = await response.blob();

  const formData = new FormData();
  formData.append('file', blob, 'mask.png');
  formData.append('project_id', projectId);

  const result = await api.post('/api/image-generation/upload-mask', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });

  return result.data;
}

/**
 * Generate/edit an image with unified parameters
 */
export async function generateImageUnified(
  params: GenerateImageUnifiedParams,
): Promise<ImageOperationResult> {
  const result = await api.post('/api/image-generation/generate-unified', params);
  return result.data;
}

/**
 * Remove background from an image
 */
export async function removeBackground(
  params: RemoveBackgroundParams,
): Promise<ImageOperationResult> {
  const result = await api.post('/api/image-generation/remove-background', params);
  return result.data;
}

/**
 * Upscale an image by a given factor
 */
export async function upscaleImage(
  params: UpscaleImageParams,
): Promise<ImageOperationResult> {
  const result = await api.post('/api/image-generation/upscale', params);
  return result.data;
}

/**
 * Enhance image quality
 */
export async function enhanceImage(
  params: EnhanceImageParams,
): Promise<ImageOperationResult> {
  const result = await api.post('/api/image-generation/enhance', params);
  return result.data;
}
