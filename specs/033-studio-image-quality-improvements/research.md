# Research: Studio Image Quality Improvements

**Feature**: `033-studio-image-quality-improvements`
**Date**: 2026-03-15
**Status**: Complete

---

## 1. fal.ai Quality Parameter Support

### Decision
Send model-specific quality parameters driven by capabilities stored in `system_config` (`visible_image_models`), auto-detected from the fal.ai schema at model-enable time — not via a static `MODEL_CAPABILITIES` map in the processor.

### Findings

> **Note**: The table below reflects the *expected* auto-detected capability values for known models. These values are derived at runtime by `deriveCapabilitiesFromSchema()` when an admin enables the model in the Admin Panel and stored in `system_config`. Nothing in this table is hardcoded in the processor or any backend service.

| Model | quality param | resolution param | negative_prompt | Notes |
|---|---|---|---|---|
| `fal-ai/gpt-image-1.5` | `'low' \| 'medium' \| 'high'` | ✗ | ✗ | Default: `medium`. Use `high` |
| `fal-ai/gpt-image-1.5/edit` | `'low' \| 'medium' \| 'high'` | ✗ | ✗ | Same as above |
| `fal-ai/gemini-3-pro-image-preview` | ✗ | `'1K' \| '2K'` | ✗ | Use `2K` |
| `fal-ai/gemini-25-flash-image` | ✗ | ✗ | ✗ | No quality controls |
| `fal-ai/bytedance/seedream/v4.5/text-to-image` | ✗ | ✗ | `string` | Supports `negative_prompt` |
| `fal-ai/bytedance/seedream/v4.5/edit` | ✗ | ✗ | `string` | Supports `negative_prompt` |
| Gemini edit variants | ✗ | ✗ | ✗ | No extra quality params |

### Rationale
Capabilities are auto-detected from the fal.ai model schema (`parameters` array returned by `GET /admin/models/schema`) when an admin enables a model, then persisted in `system_config` via `deriveCapabilitiesFromSchema()` in `apps/admin/src/lib/api.ts`. The processor reads these flags at job execution time — no hardcoded model names or capability values anywhere in the backend. This avoids fal.ai 422 errors for unknown params and ensures new models gain correct capabilities without code changes.

### Alternatives Considered
- **Static `MODEL_CAPABILITIES` map in the processor**: Requires code changes for every new model. Rejected in favour of DB-driven auto-detection.
- **Try/catch and retry without param**: Increases latency per variation. Rejected.

---

## 2. Optimal Prompt Length and Structure for Image Generation

### Decision
Expand LLM system prompt to request 250–350 word outputs structured in 5–6 named sections.

### Findings

**Professional prompt engineering conventions (based on analysis of Midjourney, DALL-E, Flux communities):**
1. **Subject + Action**: What is happening, who/what is the hero
2. **Composition + Framing**: Shot type (wide, close-up, overhead), rule of thirds, negative space
3. **Lighting**: Natural/studio/dramatic, direction, color temperature (warm/cool)
4. **Atmosphere + Mood**: Emotional tone, time of day, weather
5. **Visual Style + Medium**: Photography vs illustration, film grain, color grading
6. **Typography** (when text appears): Font weight, size emphasis, contrast requirements

**AlvoBotApp reference:** Uses 2,200 tokens for prompt composition with structured JSON. Key insight: the _refinement_ step (AI transforming a template into a rich prompt) is what produces quality. The final prompt sent to the image model is 200–400 words, not 2,200 — the extra tokens are context for the LLM.

**Current XCM limit**: 100 words. Analysis of 10 outputs: average 58 words, no lighting or composition detail.

**Optimal**: 250–350 words — enough to constrain the model without hitting token limits on fal.ai models.

### Rationale
Longer, structured prompts reduce model's "creative freedom" in undesirable directions. The prompt is a contract, not a suggestion.

### Alternatives Considered
- **JSON prompt template (like AlvoBotApp)**: More structured but requires an additional refinement API call. Deferred to Phase 3 (not in this spec).
- **Keep 100-word limit**: Insufficient. Tested — images remain generic.

---

## 3. LLM Temperature for Prompt Generation

### Decision
Use `temperature: 0.3` for the chat/completion call in `useCreativePromptGenerator`.

### Findings
- Default temperature on OpenRouter-routed models is typically `1.0`
- At temperature 1.0, the same input produces structurally different outputs each time
- At temperature 0.3, output style is consistent while noun/adjective variation remains
- AlvoBotApp uses `0.35` — same rationale
- For creative tasks (story writing), high temperature is useful. For constrained technical tasks (writing a prompt to spec), low temperature is better

### Rationale
Prompt generation is a translation task (copy → visual description), not a creative task. Low temperature produces reliable, professional outputs.

---

## 4. Global Visual Rules Content

### Decision
Inject a 7-rule `GLOBAL VISUAL QUALITY RULES` block at the end of every enriched prompt.

### Rules (derived from AlvoBotApp analysis + image generation best practices):

```
GLOBAL VISUAL QUALITY RULES:
1. OUTPUT FORMAT: High resolution, sharp details, professional quality.
2. TYPOGRAPHY: Any text in the image must be large enough to read on mobile (350px display). Headlines minimum 48pt equivalent, body minimum 28pt equivalent.
3. CONTRAST: Text must have sufficient contrast against background (minimum 4.5:1 ratio).
4. HIERARCHY: One dominant visual element. Clear foreground, midground, background separation.
5. NO CLUTTER: Maximum 3 focal elements. Negative space is intentional.
6. STYLE CONSISTENCY: Single unified aesthetic. No mixing of photography and flat design.
7. AVOID: blurry edges, watermarks, text artifacts, oversaturation, unrealistic skin tones.
```

### When applied
- Always, as the last block of the enriched prompt
- Brand colors referenced in rule 3 when available
- UI-concept-specific note added to rule 2 when concept category is `ui`

---

## 5. Negative Prompt Strategy

### Decision
Add optional `negative_prompt` field to batch DTO; use default quality-guard string when empty; gate per model capabilities.

### Default negative prompt
```
blurry, low quality, distorted, watermark, text artifacts, oversaturated, noisy, pixelated, bad anatomy, ugly, duplicate
```

### Findings
- fal.ai's Seedream models explicitly document `negative_prompt` parameter
- GPT Image 1.5 does NOT support negative prompts (OpenAI API design decision)
- Gemini image models do NOT support negative prompts via fal.ai
- Passing an unsupported field to fal.ai returns HTTP 422 — must be gated

### Rationale
Even on non-supporting models, having the field in the UI trains users to think in quality terms. On supporting models (Seedream), the impact is measurable.

---

## 6. Creativity Slider Mechanics

### Decision
Map `creativity` (0–100) to a 2D modifier selection: use creativity to determine modifier pool (conservative vs expressive), use variation index to pick within that pool.

### Modifier Matrix

| creativity range | index 0 | index 1 | index 2 | index 3 |
|---|---|---|---|---|
| 0–25 (low) | exact style match | subtle color shift | minor framing variation | faithful mood adaptation |
| 26–50 (medium-low) | faithful composition | subtle creative flourish | moderate stylistic variation | expressive lighting |
| 51–75 (medium-high) | creative interpretation | bold composition | experimental color grade | strong artistic voice |
| 76–100 (high) | bold reimagination | avant-garde composition | dramatic stylistic departure | artistic reinterpretation |

### Rationale
Current implementation ignores `_creativity` entirely (prefixed with `_` to suppress lint warnings). Mapping to a 2D matrix preserves variation across a batch while scaling the overall "boldness" by creativity level.

---

## 7. Structured Concept Usage in Enrichment

### Decision
When `prompt_template_json` is present, extract composition fields as structured text directives in `enrichPrompt()`.

### Mapping
```typescript
// From: concept.prompt_template_json
{
  composition: { layout, style, main_element },
  requirements: string[],
  visual_description: string
}

// To: enriched prompt addition
"Concept: {name}. Composition: {layout} layout, {style} style, main element: {main_element}. Visual requirements: {requirements.join(', ')}. Reference: {visual_description}."
```

### Rationale
Currently the concept `promptModifier` (a free-text string) is prepended. If it's short or generic, it adds little value. Structured fields from `prompt_template_json` provide richer, more reliable directives that survive prompt generation even when the user doesn't use the LLM generator.

---

## 8. Affected Files Summary

| File | Changes | Priority |
|---|---|---|
| `apps/api/src/modules/image-generation/image-generation.processor.ts` | Add MODEL_CAPABILITIES map, send quality/resolution/negative_prompt params | P1 |
| `apps/web/src/hooks/useCreativePromptGenerator.ts` | Expand system prompt, add temperature | P1 |
| `apps/api/src/modules/image-generation/prompt-enrichment.service.ts` | Add global rules block, structured concept usage | P2 |
| `apps/api/src/modules/image-generation/dto/image-generation.dto.ts` | Add `negative_prompt` field | P2 |
| `apps/api/src/modules/image-generation/image-generation.service.ts` | Forward `negative_prompt` to queue job | P2 |
| `apps/web/src/hooks/useImageStudio.ts` | Add `negativePrompt` state, forward in API call | P2 |
| `apps/web/src/app/workspace/[id]/project/[projectId]/studio/page.tsx` | Add collapsible advanced section with negative prompt textarea | P2 |
| `apps/api/src/modules/image-generation/image-generation.processor.ts` | Fix creativity slider logic | P2 |
