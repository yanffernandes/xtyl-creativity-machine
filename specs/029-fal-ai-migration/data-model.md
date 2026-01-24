# Data Model: Image Studio Evolution - fal.ai Migration

## Database Changes

### New Table: `image_operations`

Rastreia todas as operações de edição/processamento de imagem.

```sql
CREATE TABLE image_operations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    document_id UUID REFERENCES documents(id) ON DELETE CASCADE,
    project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,

    -- Operation details
    operation_type VARCHAR(50) NOT NULL, -- 'inpaint', 'edit', 'remove_bg', 'upscale', 'enhance'

    -- Input
    input_image_url TEXT NOT NULL,
    mask_url TEXT, -- Only for inpaint operations
    prompt TEXT, -- For inpaint and edit operations

    -- Output
    output_document_id UUID REFERENCES documents(id) ON DELETE SET NULL,
    output_image_url TEXT,

    -- Model info
    provider VARCHAR(50) NOT NULL DEFAULT 'fal.ai',
    model_id VARCHAR(255) NOT NULL,
    model_params JSONB DEFAULT '{}',

    -- Cost tracking
    cost_cents INTEGER DEFAULT 0,

    -- Status
    status VARCHAR(50) NOT NULL DEFAULT 'pending', -- 'pending', 'processing', 'completed', 'failed'
    error_message TEXT,

    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    started_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,

    -- Indexes
    CONSTRAINT valid_operation_type CHECK (
        operation_type IN ('inpaint', 'edit', 'remove_bg', 'upscale', 'enhance', 'generate')
    )
);

-- Indexes for common queries
CREATE INDEX idx_image_operations_document ON image_operations(document_id);
CREATE INDEX idx_image_operations_project ON image_operations(project_id);
CREATE INDEX idx_image_operations_user ON image_operations(user_id);
CREATE INDEX idx_image_operations_status ON image_operations(status);
CREATE INDEX idx_image_operations_created ON image_operations(created_at DESC);
```

### Modified Table: `documents`

Adicionar campos para suportar operações de imagem.

```sql
-- Add new columns to documents table
ALTER TABLE documents ADD COLUMN IF NOT EXISTS
    processing_status VARCHAR(50) DEFAULT 'ready'; -- 'ready', 'processing', 'failed'

ALTER TABLE documents ADD COLUMN IF NOT EXISTS
    source_operation_id UUID REFERENCES image_operations(id) ON DELETE SET NULL;

-- Update generation_metadata to include fal.ai specific fields
COMMENT ON COLUMN documents.generation_metadata IS
    'JSON with generation info: {provider, model, prompt, aspect_ratio, cost_cents, fal_request_id}';
```

### New Table: `fal_model_configs`

Configuração de modelos fal.ai disponíveis.

```sql
CREATE TABLE fal_model_configs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- Model identification
    model_id VARCHAR(255) NOT NULL UNIQUE, -- e.g., 'fal-ai/flux-pro/v1/fill'
    provider VARCHAR(50) NOT NULL DEFAULT 'fal.ai',

    -- Display info
    display_name VARCHAR(255) NOT NULL,
    description TEXT,
    category VARCHAR(50) NOT NULL, -- 'generation', 'editing', 'utility', 'video'

    -- Capabilities
    supports_mask BOOLEAN DEFAULT FALSE,
    supports_reference BOOLEAN DEFAULT FALSE,
    supports_prompt BOOLEAN DEFAULT TRUE,
    max_resolution INTEGER DEFAULT 2048,
    supported_aspect_ratios TEXT[] DEFAULT ARRAY['1:1', '16:9', '9:16', '4:3', '3:4'],

    -- Pricing
    price_per_mp DECIMAL(10, 6), -- Price per megapixel
    price_per_image DECIMAL(10, 6), -- Fixed price per image
    price_per_second DECIMAL(10, 6), -- For video models

    -- Admin settings
    is_visible BOOLEAN DEFAULT TRUE,
    is_default BOOLEAN DEFAULT FALSE,
    sort_order INTEGER DEFAULT 0,

    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),

    CONSTRAINT valid_category CHECK (
        category IN ('generation', 'editing', 'utility', 'video')
    )
);

-- Seed initial models
INSERT INTO fal_model_configs (model_id, display_name, description, category, supports_mask, price_per_image, is_default) VALUES
    ('fal-ai/gpt-image-1.5', 'GPT Image 1.5', 'OpenAI latest with excellent text rendering', 'generation', FALSE, 0.04, TRUE),
    ('fal-ai/flux-pro', 'FLUX Pro', 'High quality photorealistic generation', 'generation', FALSE, 0.05, FALSE),
    ('fal-ai/flux/dev', 'FLUX Dev', 'Fast and affordable generation', 'generation', FALSE, 0.025, FALSE),
    ('fal-ai/gemini-3-pro-image-preview', 'Gemini 3 Pro', 'Google conversational editing', 'generation', FALSE, 0.039, FALSE),
    ('fal-ai/flux-pro/v1/fill', 'FLUX Fill Pro', 'Precision inpainting with mask', 'editing', TRUE, 0.05, FALSE),
    ('fal-ai/flux-pro/kontext', 'FLUX Kontext', 'Natural language image editing', 'editing', FALSE, 0.04, FALSE),
    ('fal-ai/gpt-image-1.5/edit', 'GPT Image 1.5 Edit', 'Instruction-based editing', 'editing', TRUE, 0.04, FALSE),
    ('fal-ai/bria/background/remove', 'Remove Background', 'Professional background removal', 'utility', FALSE, 0.018, FALSE),
    ('fal-ai/clarity-upscaler', 'Clarity Upscaler', 'AI-powered image upscaling', 'utility', FALSE, 0.02, FALSE),
    ('fal-ai/esrgan', 'ESRGAN', 'Classic upscaling algorithm', 'utility', FALSE, 0.01, FALSE);
```

## TypeScript Types

### Frontend Types

```typescript
// Types for image operations
export type ImageOperationType =
  | 'inpaint'
  | 'edit'
  | 'remove_bg'
  | 'upscale'
  | 'enhance'
  | 'generate';

export type OperationStatus =
  | 'pending'
  | 'processing'
  | 'completed'
  | 'failed';

export type ModelCategory =
  | 'generation'
  | 'editing'
  | 'utility'
  | 'video';

export interface ImageOperation {
  id: string;
  document_id: string;
  project_id: string;
  operation_type: ImageOperationType;
  input_image_url: string;
  mask_url?: string;
  prompt?: string;
  output_document_id?: string;
  output_image_url?: string;
  provider: 'fal.ai';
  model_id: string;
  model_params: Record<string, unknown>;
  cost_cents: number;
  status: OperationStatus;
  error_message?: string;
  created_at: string;
  started_at?: string;
  completed_at?: string;
}

export interface FalModel {
  id: string;
  model_id: string;
  display_name: string;
  description: string;
  category: ModelCategory;
  supports_mask: boolean;
  supports_reference: boolean;
  supports_prompt: boolean;
  max_resolution: number;
  supported_aspect_ratios: string[];
  price_per_mp?: number;
  price_per_image?: number;
  is_visible: boolean;
  is_default: boolean;
}

// Request types
export interface InpaintRequest {
  image_url: string;
  mask_url: string;
  prompt: string;
  project_id: string;
  model?: string;
}

export interface EditRequest {
  image_url: string;
  prompt: string;
  project_id: string;
  model?: string;
  preserve_elements?: string[];
}

export interface RemoveBackgroundRequest {
  image_url: string;
  project_id: string;
  output_format?: 'png' | 'webp';
}

export interface UpscaleRequest {
  image_url: string;
  project_id: string;
  scale_factor?: number; // 2 or 4
  model?: string;
}

export interface EnhanceRequest {
  image_url: string;
  project_id: string;
  enhancement_type?: 'auto' | 'faces' | 'details' | 'colors';
}

// Response types
export interface ImageOperationResponse {
  operation_id: string;
  document_id: string;
  file_url: string;
  thumbnail_url: string;
  operation_type: ImageOperationType;
  model_used: string;
  cost_cents: number;
}

// Brush canvas types
export interface BrushSettings {
  size: number; // 1-100
  opacity: number; // 0-1
  color: string; // Hex color for overlay
  mode: 'brush' | 'eraser';
}

export interface MaskData {
  dataUrl: string; // Base64 PNG with alpha
  width: number;
  height: number;
}
```

### Backend Pydantic Schemas

```python
from pydantic import BaseModel, Field
from typing import Optional, List, Literal
from datetime import datetime
from uuid import UUID

class InpaintRequest(BaseModel):
    image_url: str
    mask_url: str
    prompt: str
    project_id: str
    model: str = "fal-ai/flux-pro/v1/fill"

class EditRequest(BaseModel):
    image_url: str
    prompt: str
    project_id: str
    model: str = "fal-ai/flux-pro/kontext"
    preserve_elements: Optional[List[str]] = None

class RemoveBackgroundRequest(BaseModel):
    image_url: str
    project_id: str
    output_format: Literal["png", "webp"] = "png"

class UpscaleRequest(BaseModel):
    image_url: str
    project_id: str
    scale_factor: float = Field(default=2.0, ge=1.0, le=4.0)
    model: str = "fal-ai/clarity-upscaler"

class EnhanceRequest(BaseModel):
    image_url: str
    project_id: str
    enhancement_type: Literal["auto", "faces", "details", "colors"] = "auto"

class ImageOperationResponse(BaseModel):
    operation_id: str
    document_id: str
    file_url: str
    thumbnail_url: str
    operation_type: str
    model_used: str
    cost_cents: int

class FalModelResponse(BaseModel):
    id: str
    model_id: str
    display_name: str
    description: Optional[str]
    category: str
    supports_mask: bool
    supports_reference: bool
    price_per_mp: Optional[float]
    price_per_image: Optional[float]
    is_default: bool

class FalModelListResponse(BaseModel):
    models: List[FalModelResponse]
    categories: List[str]
```

## Migration Script

```sql
-- Migration: 032_add_fal_ai_support.sql

-- 1. Create image_operations table
CREATE TABLE IF NOT EXISTS image_operations (
    -- ... (full schema above)
);

-- 2. Create fal_model_configs table
CREATE TABLE IF NOT EXISTS fal_model_configs (
    -- ... (full schema above)
);

-- 3. Add columns to documents
ALTER TABLE documents
ADD COLUMN IF NOT EXISTS processing_status VARCHAR(50) DEFAULT 'ready',
ADD COLUMN IF NOT EXISTS source_operation_id UUID;

-- 4. Add foreign key constraint
ALTER TABLE documents
ADD CONSTRAINT fk_source_operation
FOREIGN KEY (source_operation_id)
REFERENCES image_operations(id)
ON DELETE SET NULL;

-- 5. Seed initial models
INSERT INTO fal_model_configs (...) VALUES (...);

-- 6. Create indexes
CREATE INDEX IF NOT EXISTS idx_image_operations_document ON image_operations(document_id);
-- ... (other indexes)
```

## Entity Relationship Diagram

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│    projects     │     │   documents     │     │ image_operations│
├─────────────────┤     ├─────────────────┤     ├─────────────────┤
│ id              │◄────│ project_id      │     │ id              │
│ name            │     │ id              │◄────│ document_id     │
│ ...             │     │ file_url        │     │ input_image_url │
└─────────────────┘     │ thumbnail_url   │     │ mask_url        │
                        │ generation_meta │     │ prompt          │
                        │ processing_stat │     │ operation_type  │
                        │ source_op_id    │────►│ model_id        │
                        └─────────────────┘     │ status          │
                                                │ cost_cents      │
                                                └─────────────────┘
                                                        │
                                                        ▼
                                                ┌─────────────────┐
                                                │fal_model_configs│
                                                ├─────────────────┤
                                                │ id              │
                                                │ model_id        │
                                                │ display_name    │
                                                │ category        │
                                                │ supports_mask   │
                                                │ price_per_mp    │
                                                └─────────────────┘
```
