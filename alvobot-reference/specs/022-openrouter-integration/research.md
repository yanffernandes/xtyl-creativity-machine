# Research: OpenRouter Integration

**Feature**: 022-openrouter-integration
**Date**: 2026-01-09
**Status**: Complete

## Executive Summary

OpenRouter provides a unified API to access 400+ AI models through a single endpoint. The API is compatible with OpenAI's chat completions format, making integration straightforward. Image generation is supported via the same chat completions endpoint with a `modalities` parameter.

## Research Findings

### 1. OpenRouter API Overview

**Decision**: Use OpenRouter's native SDK (`@openrouter/sdk`) for TypeScript integration

**Rationale**:
- Official SDK with TypeScript support
- Better error handling and type definitions
- Follows similar patterns to OpenAI SDK already in use

**Alternatives Considered**:
- Direct HTTP calls (rejected: more boilerplate, no type safety)
- OpenAI SDK compatibility mode (rejected: limited features, potential breaking changes)

### 2. API Authentication

**Decision**: Use Bearer token authentication via environment variable `OPENROUTER_API_KEY`

**Details**:
- Header format: `Authorization: Bearer <OPENROUTER_API_KEY>`
- Optional headers for attribution:
  - `HTTP-Referer`: App URL for rankings
  - `X-Title`: App name for display

**Rationale**: Follows same pattern as existing `OPENAI_API_KEY`, consistent with project conventions

### 3. Chat Completions Endpoint

**Base URL**: `https://openrouter.ai/api/v1/chat/completions`

**Request Format**:
```typescript
{
  model: "vendor/model-name",  // e.g., "openai/gpt-4o", "anthropic/claude-3.5-sonnet"
  messages: [
    { role: "system", content: "..." },
    { role: "user", content: "..." }
  ],
  temperature?: number,
  max_tokens?: number,
  // OpenRouter-specific
  provider?: {
    order?: string[],        // Provider preference order
    allow_fallbacks?: boolean
  }
}
```

**Response Format**: Same as OpenAI - `choices[0].message.content`

### 4. Models Listing Endpoint

**Decision**: Fetch models dynamically from `/api/v1/models` endpoint

**Endpoint**: `GET https://openrouter.ai/api/v1/models`

**Response Structure**:
```typescript
{
  data: [
    {
      id: "openai/gpt-4o",              // Model ID to use in requests
      name: "GPT-4o",                   // Display name
      pricing: {
        prompt: "0.000005",             // USD per token
        completion: "0.000015"
      },
      context_length: 128000,
      architecture: {
        input_modalities: ["text", "image"],
        output_modalities: ["text"]
      }
    }
  ]
}
```

**Caching Strategy**: Cache model list for 5 minutes (consistent with existing prompt caching)

### 5. Image Generation

**Decision**: Use chat completions endpoint with `modalities` parameter

**Key Finding**: OpenRouter does NOT use a separate images endpoint. Image generation uses the same chat completions API.

**Request Format**:
```typescript
{
  model: "google/gemini-2.5-flash-image-preview",  // or other image-capable model
  messages: [
    { role: "user", content: "Generate an image of..." }
  ],
  modalities: ["image", "text"],
  image_config: {  // Optional, Gemini-specific
    aspect_ratio: "1:1",  // or "16:9", "9:16", etc.
    resolution: "1K"      // "1K", "2K", "4K"
  }
}
```

**Response Format**:
```typescript
{
  choices: [{
    message: {
      content: "Description text",
      images: [{
        image_url: {
          url: "data:image/png;base64,..."  // Base64-encoded image
        }
      }]
    }
  }]
}
```

**Available Image Models**:
- `google/gemini-2.5-flash-image-preview` - Best quality/price ratio
- `black-forest-labs/flux.2-pro` - High quality
- `black-forest-labs/flux.2-flex` - Flexible parameters
- `sourceful/riverflow-v2-standard-preview` - Alternative option

### 6. Model Filtering for Admin UI

**Decision**: Filter models by `output_modalities` to show relevant options

**Text Models**: `output_modalities.includes("text") && !output_modalities.includes("image")`
**Image Models**: `output_modalities.includes("image")`

### 7. Error Handling

**Common Error Codes**:
- `400`: Invalid request (bad model, missing params)
- `401`: Invalid API key
- `402`: Insufficient credits
- `429`: Rate limited
- `503`: Provider temporarily unavailable

**Fallback Strategy**: Already implemented pattern in `ai-creative.service.ts` - try preferred model, fall back to DALL-E-3 on failure

### 8. SDK Installation

**Package**: `@openrouter/sdk`

```bash
npm install @openrouter/sdk
```

**Usage**:
```typescript
import OpenRouter from '@openrouter/sdk'

const client = new OpenRouter({
  apiKey: process.env.OPENROUTER_API_KEY
})

const response = await client.chat.completions.create({
  model: "openai/gpt-4o",
  messages: [{ role: "user", content: "Hello" }]
})
```

## Integration Architecture

### Provider Abstraction Pattern

```typescript
type AIProvider = 'openai' | 'openrouter'

interface ProviderConfig {
  provider: AIProvider
  model: string  // Full model ID
}

// For system_prompts table
interface SystemPrompt {
  // ... existing fields
  provider: AIProvider      // NEW: 'openai' | 'openrouter'
  provider_model: string    // NEW: Full model ID (e.g., "openai/gpt-4o")
}
```

### Service Integration Points

1. **OpenRouterService** (new)
   - Initialize SDK client
   - Fetch models list (with caching)
   - Chat completions
   - Image generation

2. **AdminService** (extend)
   - Add provider parameter to `testPrompt()`
   - Route to OpenAI or OpenRouter based on provider

3. **AiCreativeService** (extend)
   - Add OpenRouter image generation method
   - Update fallback logic to include OpenRouter

4. **AdminSystemPromptsPage** (extend)
   - Add provider dropdown
   - Dynamic model loading based on provider
   - Filter models by type (text/image)

## Database Changes Required

### system_prompts table
```sql
ALTER TABLE system_prompts
ADD COLUMN provider TEXT DEFAULT 'openai',
ADD COLUMN provider_model TEXT;

-- Migrate existing data
UPDATE system_prompts SET provider_model = model WHERE provider = 'openai';
```

### platform_settings table (or similar)
```sql
-- For default image generation model
INSERT INTO platform_settings (key, value)
VALUES ('default_image_model', '{"provider": "openai", "model": "dall-e-3"}');
```

## Sources

- [OpenRouter API Overview](https://openrouter.ai/docs/api/reference/overview)
- [Chat Completions Endpoint](https://openrouter.ai/docs/api/api-reference/chat/send-chat-completion-request)
- [OpenRouter Quickstart](https://openrouter.ai/docs/quickstart)
- [Models Guide](https://openrouter.ai/docs/guides/overview/models)
- [Image Generation Documentation](https://openrouter.ai/docs/guides/overview/multimodal/image-generation)
- [Image Models Collection](https://openrouter.ai/collections/image-models)
