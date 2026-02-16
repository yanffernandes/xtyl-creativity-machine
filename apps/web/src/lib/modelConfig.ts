/**
 * Model Configuration for Image Studio
 * Hardcoded fal.ai models configuration
 *
 * 4 text-to-image models + 4 image-to-image/edit models
 * Only GPT-Image 1.5/edit supports mask_image_url for brush/inpainting.
 */

// ============================================================================
// TYPES
// ============================================================================

export type ModelType = 'text-to-image' | 'image-to-image';

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
}

// ============================================================================
// PARAMETER DEFINITIONS
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
// TEXT-TO-IMAGE MODELS
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
    { name: 'num_images', type: 'number', label: 'Quantidade', default: 1, min: 1, max: 4, step: 1 },
    { name: 'aspect_ratio', type: 'select', label: 'Proporção', options: ASPECT_RATIO_OPTIONS, default: '1:1' },
    { name: 'resolution', type: 'select', label: 'Resolução', options: RESOLUTION_OPTIONS, default: '1K' },
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
    { name: 'num_images', type: 'number', label: 'Quantidade', default: 1, min: 1, max: 4, step: 1 },
    { name: 'aspect_ratio', type: 'select', label: 'Proporção', options: ASPECT_RATIO_OPTIONS, default: '1:1' },
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
    { name: 'num_images', type: 'number', label: 'Quantidade', default: 1, min: 1, max: 4, step: 1 },
    { name: 'image_size', type: 'select', label: 'Tamanho', options: IMAGE_SIZE_OPTIONS, default: '1024x1024' },
    { name: 'quality', type: 'select', label: 'Qualidade', options: QUALITY_OPTIONS, default: 'medium' },
    { name: 'background', type: 'select', label: 'Fundo', options: BACKGROUND_OPTIONS, default: 'auto' },
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
    { name: 'num_images', type: 'number', label: 'Quantidade', default: 1, min: 1, max: 6, step: 1 },
    { name: 'image_size', type: 'select', label: 'Tamanho', options: SEEDREAM_IMAGE_SIZE_OPTIONS, default: 'square' },
    { name: 'enable_safety_checker', type: 'boolean', label: 'Filtro de segurança', default: true },
  ],
};

// ============================================================================
// IMAGE-TO-IMAGE / EDIT MODELS
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
    { name: 'num_images', type: 'number', label: 'Quantidade', default: 1, min: 1, max: 4, step: 1 },
    { name: 'aspect_ratio', type: 'select', label: 'Proporção', options: ASPECT_RATIO_OPTIONS, default: '1:1' },
    { name: 'resolution', type: 'select', label: 'Resolução', options: RESOLUTION_OPTIONS, default: '1K' },
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
    { name: 'num_images', type: 'number', label: 'Quantidade', default: 1, min: 1, max: 4, step: 1 },
    { name: 'aspect_ratio', type: 'select', label: 'Proporção', options: ASPECT_RATIO_OPTIONS, default: '1:1' },
  ],
};

export const GPT_IMAGE_15_EDIT: ModelConfig = {
  id: 'fal-ai/gpt-image-1.5/edit',
  name: 'GPT-Image 1.5 Edit',
  description: 'Edição com alta fidelidade - SUPORTA MÁSCARA (brush)',
  provider: 'OpenAI',
  type: 'image-to-image',
  supportsMask: true,
  maxImages: 4,
  parameters: [
    { name: 'num_images', type: 'number', label: 'Quantidade', default: 1, min: 1, max: 4, step: 1 },
    { name: 'image_size', type: 'select', label: 'Tamanho', options: IMAGE_SIZE_OPTIONS, default: '1024x1024' },
    { name: 'quality', type: 'select', label: 'Qualidade', options: QUALITY_OPTIONS, default: 'medium' },
    { name: 'input_fidelity', type: 'select', label: 'Fidelidade', options: INPUT_FIDELITY_OPTIONS, default: 'high' },
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
    { name: 'num_images', type: 'number', label: 'Quantidade', default: 1, min: 1, max: 6, step: 1 },
    { name: 'image_size', type: 'select', label: 'Tamanho', options: SEEDREAM_IMAGE_SIZE_OPTIONS, default: 'square' },
    { name: 'enable_safety_checker', type: 'boolean', label: 'Filtro de segurança', default: true },
  ],
};

// ============================================================================
// MODEL COLLECTIONS
// ============================================================================

export const TEXT_TO_IMAGE_MODELS: ModelConfig[] = [
  GPT_IMAGE_15_TEXT,
  GEMINI_3_PRO_TEXT,
  GEMINI_25_FLASH_TEXT,
  SEEDREAM_45_TEXT,
];

export const IMAGE_TO_IMAGE_MODELS: ModelConfig[] = [
  GPT_IMAGE_15_EDIT,
  GEMINI_3_PRO_EDIT,
  GEMINI_25_FLASH_EDIT,
  SEEDREAM_45_EDIT,
];

export const ALL_MODELS: ModelConfig[] = [
  ...TEXT_TO_IMAGE_MODELS,
  ...IMAGE_TO_IMAGE_MODELS,
];

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

export function getModelById(modelId: string): ModelConfig | undefined {
  return ALL_MODELS.find((m) => m.id === modelId);
}

export function getEditModel(textModelId: string): ModelConfig | undefined {
  const editId = textModelId.endsWith('/edit') ? textModelId : `${textModelId}/edit`;
  return IMAGE_TO_IMAGE_MODELS.find((m) => m.id === editId);
}

export function getTextModel(editModelId: string): ModelConfig | undefined {
  const textId = editModelId.replace('/edit', '');
  return TEXT_TO_IMAGE_MODELS.find((m) => m.id === textId);
}

export function modelSupportsMask(modelId: string): boolean {
  return getModelById(modelId)?.supportsMask ?? false;
}

export function getDefaultTextModel(): ModelConfig {
  return GPT_IMAGE_15_TEXT;
}

export function getDefaultEditModel(): ModelConfig {
  return GPT_IMAGE_15_EDIT;
}
