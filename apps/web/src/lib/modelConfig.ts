/**
 * Model Configuration for Image Studio
 * Feature 029: Hardcoded fal.ai models configuration
 *
 * This file contains the 8 fal.ai models used for image generation and editing:
 * - 4 text-to-image models (no reference image required)
 * - 4 image-to-image/edit models (require reference image)
 *
 * Only GPT-Image 1.5/edit supports mask_image_url for brush/inpainting.
 */

// ============================================================================
// TYPES
// ============================================================================

export type ModelType = 'text-to-image' | 'image-to-image';

export type AspectRatio =
  | '1:1'
  | '16:9'
  | '9:16'
  | '4:3'
  | '3:4'
  | '3:2'
  | '2:3'
  | '21:9'
  | '9:21';

export type ImageSize =
  | '1024x1024'
  | '1536x1024'
  | '1024x1536'
  | '1792x1024'
  | '1024x1792'
  | 'auto';

export type Resolution = '1K' | '2K' | '4K';

export type Quality = 'low' | 'medium' | 'high';

export type Background = 'auto' | 'transparent' | 'opaque';

export type InputFidelity = 'low' | 'high';

export interface ModelParameter {
  name: string;
  type: 'select' | 'number' | 'boolean';
  label: string;
  description?: string;
  options?: { value: string; label: string }[];
  default: string | number | boolean;
  min?: number;
  max?: number;
  step?: number;
}

export interface ModelConfig {
  id: string;
  name: string;
  description: string;
  provider: string;
  type: ModelType;
  supportsMask: boolean;
  maxImages: number;
  parameters: ModelParameter[];
  // Pricing info (optional, for display)
  pricing?: string;
}

// ============================================================================
// PARAMETER DEFINITIONS (reusable across models)
// ============================================================================

const ASPECT_RATIO_OPTIONS = [
  { value: '1:1', label: '1:1 (Quadrado)' },
  { value: '16:9', label: '16:9 (Paisagem)' },
  { value: '9:16', label: '9:16 (Retrato)' },
  { value: '4:3', label: '4:3' },
  { value: '3:4', label: '3:4' },
  { value: '3:2', label: '3:2' },
  { value: '2:3', label: '2:3' },
];

const IMAGE_SIZE_OPTIONS = [
  { value: '1024x1024', label: '1024x1024' },
  { value: '1536x1024', label: '1536x1024 (Paisagem)' },
  { value: '1024x1536', label: '1024x1536 (Retrato)' },
  { value: '1792x1024', label: '1792x1024 (Wide)' },
  { value: '1024x1792', label: '1024x1792 (Tall)' },
  { value: 'auto', label: 'Automático' },
];

// Seedream 4.5 uses named presets instead of dimensions
const SEEDREAM_IMAGE_SIZE_OPTIONS = [
  { value: 'square', label: '1:1 (Quadrado)' },
  { value: 'square_hd', label: '1:1 HD' },
  { value: 'landscape_4_3', label: '4:3 (Paisagem)' },
  { value: 'portrait_4_3', label: '3:4 (Retrato)' },
  { value: 'landscape_16_9', label: '16:9 (Wide)' },
  { value: 'portrait_16_9', label: '9:16 (Tall)' },
  { value: 'auto_2K', label: '2K Automático' },
  { value: 'auto_4K', label: '4K Automático' },
];

const RESOLUTION_OPTIONS = [
  { value: '1K', label: '1K' },
  { value: '2K', label: '2K' },
  { value: '4K', label: '4K (Gemini 3 Pro apenas)' },
];

const QUALITY_OPTIONS = [
  { value: 'low', label: 'Baixa' },
  { value: 'medium', label: 'Média' },
  { value: 'high', label: 'Alta' },
];

const BACKGROUND_OPTIONS = [
  { value: 'auto', label: 'Automático' },
  { value: 'transparent', label: 'Transparente' },
  { value: 'opaque', label: 'Opaco' },
];

const INPUT_FIDELITY_OPTIONS = [
  { value: 'low', label: 'Baixa (mais criativo)' },
  { value: 'high', label: 'Alta (mais fiel)' },
];

// ============================================================================
// TEXT-TO-IMAGE MODELS (4 models)
// ============================================================================

export const GEMINI_3_PRO_TEXT: ModelConfig = {
  id: 'fal-ai/gemini-3-pro-image-preview',
  name: 'Gemini 3 Pro',
  description: 'Modelo avançado do Google com raciocínio espacial e semântico',
  provider: 'Google',
  type: 'text-to-image',
  supportsMask: false,
  maxImages: 4,
  parameters: [
    {
      name: 'num_images',
      type: 'number',
      label: 'Quantidade',
      description: 'Número de imagens a gerar',
      default: 1,
      min: 1,
      max: 4,
      step: 1,
    },
    {
      name: 'aspect_ratio',
      type: 'select',
      label: 'Proporção',
      options: ASPECT_RATIO_OPTIONS,
      default: '1:1',
    },
    {
      name: 'resolution',
      type: 'select',
      label: 'Resolução',
      description: 'Gemini 3 Pro suporta até 4K',
      options: RESOLUTION_OPTIONS,
      default: '1K',
    },
  ],
};

export const GEMINI_25_FLASH_TEXT: ModelConfig = {
  id: 'fal-ai/gemini-25-flash-image',
  name: 'Gemini 2.5 Flash',
  description: 'Modelo rápido do Google com raciocínio multi-imagem',
  provider: 'Google',
  type: 'text-to-image',
  supportsMask: false,
  maxImages: 4,
  parameters: [
    {
      name: 'num_images',
      type: 'number',
      label: 'Quantidade',
      description: 'Número de imagens a gerar',
      default: 1,
      min: 1,
      max: 4,
      step: 1,
    },
    {
      name: 'aspect_ratio',
      type: 'select',
      label: 'Proporção',
      options: ASPECT_RATIO_OPTIONS,
      default: '1:1',
    },
  ],
};

export const GPT_IMAGE_15_TEXT: ModelConfig = {
  id: 'fal-ai/gpt-image-1.5',
  name: 'GPT-Image 1.5',
  description: 'Modelo multimodal da OpenAI com alta fidelidade',
  provider: 'OpenAI',
  type: 'text-to-image',
  supportsMask: false,
  maxImages: 4,
  parameters: [
    {
      name: 'num_images',
      type: 'number',
      label: 'Quantidade',
      description: 'Número de imagens a gerar',
      default: 1,
      min: 1,
      max: 4,
      step: 1,
    },
    {
      name: 'image_size',
      type: 'select',
      label: 'Tamanho',
      options: IMAGE_SIZE_OPTIONS,
      default: '1024x1024',
    },
    {
      name: 'quality',
      type: 'select',
      label: 'Qualidade',
      options: QUALITY_OPTIONS,
      default: 'medium',
    },
    {
      name: 'background',
      type: 'select',
      label: 'Fundo',
      options: BACKGROUND_OPTIONS,
      default: 'auto',
    },
  ],
};

export const SEEDREAM_45_TEXT: ModelConfig = {
  id: 'fal-ai/bytedance/seedream/v4.5/text-to-image',
  name: 'Seedream 4.5',
  description: 'Modelo da Bytedance otimizado para velocidade e qualidade',
  provider: 'Bytedance',
  type: 'text-to-image',
  supportsMask: false,
  maxImages: 6,
  parameters: [
    {
      name: 'num_images',
      type: 'number',
      label: 'Quantidade',
      description: 'Número de imagens a gerar',
      default: 1,
      min: 1,
      max: 6,
      step: 1,
    },
    {
      name: 'image_size',
      type: 'select',
      label: 'Tamanho',
      options: SEEDREAM_IMAGE_SIZE_OPTIONS,
      default: 'square',
    },
    {
      name: 'enable_safety_checker',
      type: 'boolean',
      label: 'Filtro de segurança',
      description: 'Ativar filtro de conteúdo',
      default: true,
    },
  ],
};

// ============================================================================
// IMAGE-TO-IMAGE / EDIT MODELS (4 models)
// ============================================================================

export const GEMINI_3_PRO_EDIT: ModelConfig = {
  id: 'fal-ai/gemini-3-pro-image-preview/edit',
  name: 'Gemini 3 Pro Edit',
  description: 'Edição avançada com compreensão espacial e semântica',
  provider: 'Google',
  type: 'image-to-image',
  supportsMask: false,
  maxImages: 4,
  parameters: [
    {
      name: 'num_images',
      type: 'number',
      label: 'Quantidade',
      description: 'Número de imagens a gerar',
      default: 1,
      min: 1,
      max: 4,
      step: 1,
    },
    {
      name: 'aspect_ratio',
      type: 'select',
      label: 'Proporção',
      options: ASPECT_RATIO_OPTIONS,
      default: '1:1',
    },
    {
      name: 'resolution',
      type: 'select',
      label: 'Resolução',
      description: 'Gemini 3 Pro suporta até 4K',
      options: RESOLUTION_OPTIONS,
      default: '1K',
    },
  ],
};

export const GEMINI_25_FLASH_EDIT: ModelConfig = {
  id: 'fal-ai/gemini-25-flash-image/edit',
  name: 'Gemini 2.5 Flash Edit',
  description: 'Edição rápida com raciocínio multi-imagem',
  provider: 'Google',
  type: 'image-to-image',
  supportsMask: false,
  maxImages: 4,
  parameters: [
    {
      name: 'num_images',
      type: 'number',
      label: 'Quantidade',
      description: 'Número de imagens a gerar',
      default: 1,
      min: 1,
      max: 4,
      step: 1,
    },
    {
      name: 'aspect_ratio',
      type: 'select',
      label: 'Proporção',
      options: ASPECT_RATIO_OPTIONS,
      default: '1:1',
    },
  ],
};

export const GPT_IMAGE_15_EDIT: ModelConfig = {
  id: 'fal-ai/gpt-image-1.5/edit',
  name: 'GPT-Image 1.5 Edit',
  description: 'Edição com alta fidelidade - SUPORTA MÁSCARA (brush)',
  provider: 'OpenAI',
  type: 'image-to-image',
  supportsMask: true, // ÚNICO modelo que suporta mask_image_url
  maxImages: 4,
  parameters: [
    {
      name: 'num_images',
      type: 'number',
      label: 'Quantidade',
      description: 'Número de imagens a gerar',
      default: 1,
      min: 1,
      max: 4,
      step: 1,
    },
    {
      name: 'image_size',
      type: 'select',
      label: 'Tamanho',
      options: IMAGE_SIZE_OPTIONS,
      default: '1024x1024',
    },
    {
      name: 'quality',
      type: 'select',
      label: 'Qualidade',
      options: QUALITY_OPTIONS,
      default: 'medium',
    },
    {
      name: 'input_fidelity',
      type: 'select',
      label: 'Fidelidade',
      description: 'Quão fiel ao original',
      options: INPUT_FIDELITY_OPTIONS,
      default: 'high',
    },
  ],
};

export const SEEDREAM_45_EDIT: ModelConfig = {
  id: 'fal-ai/bytedance/seedream/v4.5/edit',
  name: 'Seedream 4.5 Edit',
  description: 'Edição rápida com até 10 imagens de referência',
  provider: 'Bytedance',
  type: 'image-to-image',
  supportsMask: false,
  maxImages: 6,
  parameters: [
    {
      name: 'num_images',
      type: 'number',
      label: 'Quantidade',
      description: 'Número de imagens a gerar',
      default: 1,
      min: 1,
      max: 6,
      step: 1,
    },
    {
      name: 'image_size',
      type: 'select',
      label: 'Tamanho',
      options: SEEDREAM_IMAGE_SIZE_OPTIONS,
      default: 'square',
    },
    {
      name: 'enable_safety_checker',
      type: 'boolean',
      label: 'Filtro de segurança',
      description: 'Ativar filtro de conteúdo',
      default: true,
    },
  ],
};

// ============================================================================
// MODEL COLLECTIONS
// ============================================================================

/** All text-to-image models (no reference image required) */
export const TEXT_TO_IMAGE_MODELS: ModelConfig[] = [
  GPT_IMAGE_15_TEXT,
  GEMINI_3_PRO_TEXT,
  GEMINI_25_FLASH_TEXT,
  SEEDREAM_45_TEXT,
];

/** All image-to-image/edit models (require reference image) */
export const IMAGE_TO_IMAGE_MODELS: ModelConfig[] = [
  GPT_IMAGE_15_EDIT,
  GEMINI_3_PRO_EDIT,
  GEMINI_25_FLASH_EDIT,
  SEEDREAM_45_EDIT,
];

/** All models */
export const ALL_MODELS: ModelConfig[] = [
  ...TEXT_TO_IMAGE_MODELS,
  ...IMAGE_TO_IMAGE_MODELS,
];

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Get model config by ID
 */
export function getModelById(modelId: string): ModelConfig | undefined {
  return ALL_MODELS.find((m) => m.id === modelId);
}

/**
 * Get the edit counterpart of a text-to-image model
 */
export function getEditModel(textModelId: string): ModelConfig | undefined {
  // Add /edit suffix if not present
  const editId = textModelId.endsWith('/edit')
    ? textModelId
    : `${textModelId}/edit`;
  return IMAGE_TO_IMAGE_MODELS.find((m) => m.id === editId);
}

/**
 * Get the text-to-image counterpart of an edit model
 */
export function getTextModel(editModelId: string): ModelConfig | undefined {
  // Remove /edit suffix
  const textId = editModelId.replace('/edit', '');
  return TEXT_TO_IMAGE_MODELS.find((m) => m.id === textId);
}

/**
 * Check if a model supports mask/brush editing
 */
export function modelSupportsMask(modelId: string): boolean {
  const model = getModelById(modelId);
  return model?.supportsMask ?? false;
}

/**
 * Get default model for text-to-image
 */
export function getDefaultTextModel(): ModelConfig {
  return GPT_IMAGE_15_TEXT;
}

/**
 * Get default model for image-to-image/edit
 */
export function getDefaultEditModel(): ModelConfig {
  return GPT_IMAGE_15_EDIT;
}

/**
 * Get appropriate model based on whether a reference image is provided
 * @param hasReferenceImage - Whether the user has provided a reference image
 * @param preferredModelId - Optional preferred model ID
 */
export function selectAppropriateModel(
  hasReferenceImage: boolean,
  preferredModelId?: string
): ModelConfig {
  if (preferredModelId) {
    const model = getModelById(preferredModelId);
    if (model) {
      // If model type matches use case, return it
      if (hasReferenceImage && model.type === 'image-to-image') {
        return model;
      }
      if (!hasReferenceImage && model.type === 'text-to-image') {
        return model;
      }
      // Otherwise, get the counterpart model
      if (hasReferenceImage) {
        return getEditModel(preferredModelId) || getDefaultEditModel();
      }
      return getTextModel(preferredModelId) || getDefaultTextModel();
    }
  }

  // Return default based on use case
  return hasReferenceImage ? getDefaultEditModel() : getDefaultTextModel();
}

/**
 * Build API payload from model parameters and user values
 */
export function buildModelPayload(
  model: ModelConfig,
  prompt: string,
  userParams: Record<string, unknown>,
  options?: {
    imageUrls?: string[];
    maskUrl?: string;
  }
): Record<string, unknown> {
  const payload: Record<string, unknown> = {
    prompt,
  };

  // Add reference images for edit models
  if (model.type === 'image-to-image' && options?.imageUrls?.length) {
    payload.image_urls = options.imageUrls;
  }

  // Add mask for GPT-Image edit (only model that supports it)
  if (model.supportsMask && options?.maskUrl) {
    payload.mask_image_url = options.maskUrl;
  }

  // Add model-specific parameters with defaults
  for (const param of model.parameters) {
    const value = userParams[param.name] ?? param.default;
    payload[param.name] = value;
  }

  return payload;
}
