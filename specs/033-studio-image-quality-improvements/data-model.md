# Data Model: Studio Image Quality Improvements

**Feature**: `033-studio-image-quality-improvements`
**Date**: 2026-03-15

---

## No New Tables

This feature does not introduce new database tables. All changes are in-memory (service logic), API payload shape, and TypeScript types.

---

## Modified DTO: `GenerateImageBatchDto`

**File**: `apps/api/src/modules/image-generation/dto/image-generation.dto.ts`

```typescript
// ADD to existing DTO
@IsOptional()
@IsString()
@MaxLength(500)
negative_prompt?: string;   // new — forwarded to fal.ai supporting models
```

---

## Model Capabilities — DB-Driven (no hardcoded values)

Capabilities are stored as fields of `VisibleImageModelConfig` in `system_config` (key: `visible_image_models`). They are auto-detected from the fal.ai model schema (`parameters` array returned by `GET /admin/models/schema`) when an admin enables a model in the Admin Panel.

### deriveCapabilitiesFromSchema helper
Located in `apps/admin/src/lib/api.ts`. Reads the `parameters` array and sets:
- `supportsQuality: true` + `qualityValue: 'high'` if a parameter named `quality` exists
- `supportsResolution: true` + `resolutionValue: '2K'` if a parameter named `resolution` exists
- `supportsNegativePrompt: true` if a parameter named `negative_prompt` exists

No values are hardcoded in the processor or any backend service.

---

## Modified Queue Job Data

**Field added to BullMQ job payload** (in `image-generation.service.ts` when enqueuing):

```typescript
// existing fields...
negative_prompt?: string;     // new
```

---

## Modified `generationMetadata` (stored in documents table)

```typescript
generationMetadata: {
  prompt,
  enriched_prompt: finalPrompt,           // new — store the actual prompt sent to fal.ai
  model: effectiveModel,
  original_model: effectiveModel !== model ? model : undefined,
  aspect_ratio,
  quality_param_sent: caps.qualityValue,  // new — for debugging
  resolution_param_sent: caps.resolutionValue, // new
  negative_prompt_applied: !!negative_prompt, // new
  style_modifier: styleModifier,
  creativity_value: creativity,            // new — store for debugging
  batch_id: batchId,
  variation_index: variationIndex,
  visual_assets_applied: reference_asset_modes.length > 0,
}
```

---

## Frontend State Extension: `useImageStudio`

```typescript
// New state variable
const [negativePrompt, setNegativePrompt] = useState<string>('');

// Extended generate payload
{
  ...existing fields,
  negative_prompt: negativePrompt || undefined,
}
```

---

## Validation Rules

| Field | Rule |
|---|---|
| `negative_prompt` | Optional string, max 500 chars, trimmed before use |
| `quality` param | Only set if `caps.supportsQuality === true` (read from `system_config` at runtime) |
| `resolution` param | Only set if `caps.supportsResolution === true` (read from `system_config` at runtime) |
| Prompt from LLM | Trim to max 2000 chars before sending to fal.ai (safety) |
| Temperature | Fixed at `0.3` — not user-configurable |
