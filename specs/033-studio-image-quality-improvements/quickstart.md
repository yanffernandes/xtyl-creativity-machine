# Quickstart: Studio Image Quality Improvements

**Feature**: `033-studio-image-quality-improvements`

---

## What Changed

This feature fixes systemic image quality issues in XCM Studio across 8 files in 3 phases.

---

## Phase 1 — Critical Fixes (Start Here)

### 1.1 Quality params in processor

Open [image-generation.processor.ts](../../apps/api/src/modules/image-generation/image-generation.processor.ts).

1. Add `MODEL_CAPABILITIES` constant above the class definition.
2. Replace the `falParams` block to spread capabilities conditionally.
3. Replace `buildStyleModifier` with the creativity matrix version.

See [plan.md § Task 1.1 and 1.2](./plan.md) for exact code.

### 1.2 Richer prompt generation

Open [useCreativePromptGenerator.ts](../../apps/web/src/hooks/useCreativePromptGenerator.ts).

1. Expand both `buildSystemPrompt` branches to request 250–350 word outputs with composition, lighting, atmosphere, style, and typography sections.
2. Add `temperature: 0.3` to the `api.post('/chat/completion', ...)` call.

See [plan.md § Task 1.3](./plan.md) for exact code.

**Test Phase 1**: Generate an image with `fal-ai/gpt-image-1.5`. Check API logs — `quality: 'high'` should be in the fal.ai request. Generate a prompt — output should be 250+ words with labeled sections.

---

## Phase 2 — Quality Safety Net

### 2.1 Global rules in enrichment

Open [prompt-enrichment.service.ts](../../apps/api/src/modules/image-generation/prompt-enrichment.service.ts).

1. Add `GLOBAL_VISUAL_RULES` static constant.
2. Append to every `enrichPrompt()` output.
3. Replace concept prepend with `buildConceptDirective()` method.

### 2.2 Negative prompt end-to-end

Changes are sequential — work top-down:

1. **DTO** ([image-generation.dto.ts](../../apps/api/src/modules/image-generation/dto/image-generation.dto.ts)): Add optional `negative_prompt` field.
2. **Service** ([image-generation.service.ts](../../apps/api/src/modules/image-generation/image-generation.service.ts)): Pass `negative_prompt` to queue job data.
3. **Processor** ([image-generation.processor.ts](../../apps/api/src/modules/image-generation/image-generation.processor.ts)): Apply `DEFAULT_NEGATIVE_PROMPT` fallback; gate by `MODEL_CAPABILITIES`.
4. **Hook** ([useImageStudio.ts](../../apps/web/src/hooks/useImageStudio.ts)): Add `negativePrompt` state and forward in generate call.
5. **UI** ([studio/page.tsx](../../apps/web/src/app/workspace/%5Bid%5D/project/%5BprojectId%5D/studio/page.tsx)): Add collapsible "Configurações Avançadas" with Textarea.

**Test Phase 2**: Inspect the `enriched_prompt` in `generationMetadata` of a generated document — it should end with the `GLOBAL VISUAL QUALITY RULES` block. Use Seedream model with a negative prompt — the fal.ai request log must include `negative_prompt`.

---

## Phase 3 — Debugging Aid

Add `enriched_prompt: finalPrompt` to `generationMetadata` in the processor. Done.

---

## Verifying the Improvement

Compare side-by-side:
1. `git stash` (or checkout `main`)
2. Generate 3 images → screenshot
3. Apply this branch
4. Generate 3 images with same prompt → screenshot
5. Compare: detail level, text legibility, composition intentionality

Expected: images on the new branch will be sharper, more structured, and less "random-looking".
