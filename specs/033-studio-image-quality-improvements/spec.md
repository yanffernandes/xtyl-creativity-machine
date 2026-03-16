# Feature Specification: Studio Image Quality Improvements

**Feature Branch**: `033-studio-image-quality-improvements`
**Created**: 2026-03-15
**Status**: Draft

## Context

Comparative analysis with a reference system (AlvoBotApp) revealed that XCM Studio generates low-quality, "strange" images due to several systemic issues: quality parameters never reaching the model API, prompts that are too short and generic, a creativity slider that doesn't function, and absence of visual composition rules. This spec covers fixes and improvements across backend and frontend to dramatically raise generation quality.

---

## User Scenarios & Testing

### User Story 1 — Quality Parameter Reaches fal.ai (Priority: P1)

A user clicks "Gerar Imagem" expecting the best quality the model can produce. Currently `quality: 'standard'` is stored in the database but never sent to fal.ai. The model defaults to `medium` quality. This fix ensures the quality param is forwarded.

**Why this priority**: Highest ROI fix — single-line bug in the processor. Immediate, measurable visual improvement.

**Independent Test**: Generate an image with `fal-ai/gpt-image-1.5`. The fal.ai response's `quality` field (visible in logs) must read `high`. Perceptible improvement in detail vs baseline.

**Acceptance Scenarios**:

1. **Given** a batch job with model `fal-ai/gpt-image-1.5`, **When** the processor calls fal.ai, **Then** the params object includes `quality: 'high'`.
2. **Given** a model that does not accept `quality` param (e.g., Gemini Flash), **When** calling fal.ai, **Then** the quality param is omitted (no API error).
3. **Given** a batch job with a model configurado com `supportsResolution: true` e `resolutionValue: '2K'` no `system_config` (ex: Gemini 3 Pro), **When** calling fal.ai, **Then** os params incluem `resolution: '2K'`. **Given** Seedream configurado com `supportsNegativePrompt: true`, **Then** os params incluem `negative_prompt`.

---

### User Story 2 — Rich, Detailed Prompt Generation (Priority: P1)

A user selects a creative concept, picks a marketing document, and clicks "Gerar Prompt". Today the LLM is asked for max 100 words with no guidance on composition, lighting, or typography. The result is a vague sentence sent directly to fal.ai.

After this improvement, the system prompt instructs the LLM to produce a rich, structured visual description (~250–350 words) covering: scene composition, lighting, camera angle, typography rules, color palette, texture/material, and visual hierarchy — matching what professional prompt engineers write.

**Why this priority**: The single biggest driver of image quality is prompt quality. Everything else is multiplied by a bad prompt.

**Independent Test**: Call `POST /chat/completion` with the new system prompt and any copy. The returned prompt must contain explicit composition and lighting descriptors. Images generated from it must look intentional, not random.

**Acceptance Scenarios**:

1. **Given** a copy without a concept selected, **When** the user generates a prompt, **Then** the output is 200–350 words and explicitly describes composition, lighting style, and camera angle in English.
2. **Given** a copy with a concept selected, **When** the user generates a prompt, **Then** the output incorporates the concept's `prompt_modifier` and `prompt_template_json` fields as structured visual directives.
3. **Given** a copy in Portuguese, **When** the user generates a prompt, **Then** all visible text in the image (CTAs, headlines) remains in Portuguese while the visual description is in English.
4. **Given** a prompt describing a UI-style concept, **When** generating, **Then** the prompt mandates oversized, legible typography (≥ 48pt equivalent for headlines).

---

### User Story 3 — LLM Temperature Control for Prompts (Priority: P1)

The chat/completion call that generates prompts uses the model's default temperature (~1.0), producing inconsistent and sometimes incoherent outputs. Adding `temperature: 0.3` makes outputs deterministic and professional.

**Why this priority**: Low effort, high impact. The current randomness makes outputs unpredictable.

**Independent Test**: Call the prompt generation endpoint 5 times with the same input. With temperature 0.3, outputs should be stylistically consistent (same structure, similar descriptors). With default temperature, they vary wildly.

**Acceptance Scenarios**:

1. **Given** a call to `POST /chat/completion` from the prompt generator, **When** the request is made, **Then** the payload includes `temperature: 0.3`.
2. **Given** a concept-guided generation, **When** called multiple times, **Then** outputs maintain structural consistency.

---

### User Story 4 — Global Visual Quality Rules in Prompt Enrichment (Priority: P2)

The `PromptEnrichmentService.enrichPrompt()` currently appends brand context as plain text. After this improvement it also injects a standard block of global visual rules that prevent common quality failures: blurry text, illegible typography, poor contrast, visual clutter.

**Why this priority**: These rules act as a quality floor — a safety net even when the generated prompt is mediocre.

**Independent Test**: Manually call `enrichPrompt` and inspect the result. The output must contain a recognizable "GLOBAL RULES:" section before the fal.ai call. Images must show improved text legibility on mobile-sized previews.

**Acceptance Scenarios**:

1. **Given** any generation, **When** the enriched prompt is built, **Then** it includes rules for text legibility, visual hierarchy, and minimum typography sizes.
2. **Given** a UI-style concept, **When** enriched, **Then** the rules section instructs models to scale text 2–3x above realistic UI sizes.
3. **Given** brand context with colors, **When** enriched, **Then** rules reference the brand colors in contrast guidance.

---

### User Story 5 — Negative Prompts Support (Priority: P2)

Users have no way to exclude unwanted visual elements. After this feature, a "Negative Prompt" textarea (collapsible, advanced section) is added to the Studio UI and forwarded to fal.ai models that support `negative_prompt` parameter.

**Why this priority**: Negative prompts are industry-standard for controlling image quality. Absence creates "blurry", "watermark", "distorted" artifacts.

**Independent Test**: Enter "blurry, watermark, low quality, distorted" as negative prompt. Generated images must avoid those artifacts. fal.ai request log must include `negative_prompt` field.

**Acceptance Scenarios**:

1. **Given** the Studio form, **When** the user expands "Configurações Avançadas", **Then** a negative prompt textarea is visible.
2. **Given** a negative prompt text, **When** generation is requested, **Then** the value is forwarded in the batch payload and included in the fal.ai params.
3. **Given** a model that doesn't support `negative_prompt`, **When** the user types in the negative prompt textarea, **Then** an inline warning appears below it: "Este modelo não suporta prompt negativo. O campo será ignorado." A geração não é bloqueada.
4. **Given** no negative prompt entered, **When** generating, **Then** a sensible default negative prompt is used: `"blurry, low quality, distorted, watermark, text artifacts, oversaturated"`.

---

### User Story 6 — Functional Creativity Slider (Priority: P2)

The creativity slider (0–100) is stored and sent but never actually used by the processor — the `_creativity` parameter is explicitly ignored. After this fix, the slider maps to a meaningful variation in style modifiers: low creativity = faithful reproduction, high creativity = bold artistic interpretation applied *per-variation* progressively.

**Why this priority**: Users expect the slider to do something. Currently all images in a batch are identical in terms of variation guidance.

**Independent Test**: Set creativity to 0 and generate 4 variations. All should be stylistically similar. Set to 100 and generate 4 variations — each should differ progressively in artistic interpretation.

**Acceptance Scenarios**:

1. **Given** creativity = 0, **When** generating 4 variations, **Then** all use modifier "faithful to the original concept, exact style match".
2. **Given** creativity = 100, **When** generating 4 variations, **Then** each variation uses progressively bolder modifiers, with the 4th being "bold creative reinterpretation".
3. **Given** creativity = 50 with 2 variations, **When** generating, **Then** modifiers reflect medium-range creative guidance.

---

### User Story 7 — Structured Concept Usage in Prompt Enrichment (Priority: P3)

Currently concept data is used only in the LLM prompt generator. The `PromptEnrichmentService` on the backend prepends just `concept.promptModifier`. After this improvement, if a concept with `prompt_template_json` is provided, the enrichment structures the concept fields (composition, requirements, visual_description) as explicit directives rather than plain text concatenation.

**Why this priority**: Makes concept usage more reliable when the user skips prompt generation and types a prompt manually.

**Independent Test**: Pass a concept with `prompt_template_json` directly to the API without generating a prompt first. The enriched prompt must include structured composition and visual directives extracted from the JSON.

**Acceptance Scenarios**:

1. **Given** a concept with `prompt_template_json.composition`, **When** enriching, **Then** composition fields are formatted as `Composition: layout=X, style=Y, main_element=Z`.
2. **Given** a concept with only `prompt_modifier`, **When** enriching, **Then** behavior is unchanged from current (modifier prepended).

---

### Edge Cases

- What if the fal.ai model ignores the quality parameter? No error — best-effort basis.
- What if negative prompt is set but model doesn't support it? Silently omit the field.
- What if the LLM returns a prompt over 400 words? Truncate gracefully at word boundary.
- What if `prompt_template_json` fields are partially filled? Use available fields, skip missing ones.
- What if brand context is empty but enrichment is toggled on? Skip brand context block, still apply global rules.

---

## Clarifications

### Session 2026-03-15

- Q: As capacidades por modelo (`quality`, `resolution`, `negative_prompt`) devem ser hardcoded no processor ou vir do banco? → A: Tudo no banco — nada hardcoded. As capabilities são armazenadas como campos da `VisibleImageModelConfig` no `system_config` e lidas pelo processor em runtime.
- Q: Como as capabilities são configuradas no Admin Panel? → A: Auto-detectadas do schema fal.ai (array `parameters` retornado por `getModelSchema`) quando o admin habilita um modelo. Sem UI extra de edição manual.
- Q: Onde as Global Visual Rules devem ser aplicadas? → A: Nos dois lugares — no system prompt do LLM (para que o prompt gerado já respeite as regras) e no enrichment do backend como reforço final antes do fal.ai.
- Q: O que mostrar ao usuário quando o negative prompt é ignorado por um modelo não-suportado? → A: Aviso inline discreto abaixo do textarea quando o modelo selecionado não suporta `negative_prompt`. Sem bloquear a geração.
- Q: O prompt enriquecido final deve ser visível para o usuário antes de gerar? → A: Sim — colapsável "Ver prompt completo" somente leitura no Studio, exibindo o prompt que será enviado ao fal.ai (após enrichment + regras visuais).

---

## Requirements

### Functional Requirements

- **FR-001**: O processor MUST ler as capabilities do modelo a partir do `system_config` (campo `visibleImageModels`) e enviar `quality` ao fal.ai somente se `supportsQuality === true`, usando o valor configurado em `qualityValue`. Nenhum valor de capability pode ser hardcoded no código.
- **FR-002**: O processor MUST enviar `resolution` ao fal.ai somente se `supportsResolution === true`, usando `resolutionValue` do `system_config`.
- **FR-003**: A função `buildSystemPrompt` MUST incluir as Global Visual Quality Rules (tipografia mínima, contraste, hierarquia, sem clutter) tanto no system prompt enviado ao LLM quanto no enrichment do backend antes do fal.ai.
- **FR-004**: Prompt generation MUST cap at 350 words maximum (expanded from 100).
- **FR-005**: The chat/completion API call for prompt generation MUST include `temperature: 0.3`.
- **FR-006**: `PromptEnrichmentService.enrichPrompt()` MUST append a global visual rules block to all generated prompts.
- **FR-007**: O Studio MUST expor uma seção colapsável "Configurações Avançadas" contendo: (a) textarea de negative prompt, e (b) visualizador somente-leitura colapsável "Ver prompt completo" mostrando o prompt enriquecido final (retornado pelo backend após enrichment + regras visuais).
- **FR-008**: Negative prompts MUST be forwarded through the batch API payload to the processor and included in fal.ai params for supporting models.
- **FR-009**: When no negative prompt is entered, a default quality-guard negative prompt MUST be applied automatically.
- **FR-010**: The `buildStyleModifier` method MUST use the `creativity` value (0–100) to select modifiers, not just the variation index.
- **FR-011**: When a concept with `prompt_template_json` is provided to `enrichPrompt()`, structured fields MUST be formatted as explicit visual directives.

### Key Entities

- **ImageGenerationBatch**: Extended with `negative_prompt?: string` field in both the DTO and the batch queue job data.
- **FalAiParams**: Extended with optional `quality`, `resolution`, and `negative_prompt` fields, gated by model capability flags stored in `system_config`.
- **VisibleImageModelConfig** *(extended)*: Campos adicionados — `supportsQuality?: boolean`, `qualityValue?: 'low' | 'medium' | 'high'`, `supportsResolution?: boolean`, `resolutionValue?: string`, `supportsNegativePrompt?: boolean`. Derivados automaticamente do array `parameters` retornado por `getModelSchema` (fal.ai) no momento em que o admin habilita o modelo. Armazenados no `system_config`. Nenhum valor hardcoded no código.

---

## Success Criteria

### Measurable Outcomes

- **SC-001**: Images generated with `fal-ai/gpt-image-1.5` show visibly higher detail with quality param set to `high` vs `medium` (verified by comparing fal.ai API logs).
- **SC-002**: LLM-generated prompts average 220–320 words (up from ~60 words) as measured in logs.
- **SC-003**: 5 consecutive prompt generations from the same input produce structurally consistent outputs (same sections present) when temperature is 0.3.
- **SC-004**: Images generated with `negative_prompt: "blurry, watermark, low quality"` have reduced incidence of those artifacts vs baseline.
- **SC-005**: Generating 4 variations at creativity=0 and creativity=100 produces noticeably different modifier sets in the `generationMetadata` of resulting documents.
