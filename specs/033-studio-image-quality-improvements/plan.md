# Implementation Plan: Studio Image Quality Improvements

**Branch**: `033-studio-image-quality-improvements` | **Date**: 2026-03-15 | **Spec**: [spec.md](./spec.md)

## Summary

XCM Studio generates low-quality images due to: (1) quality params never reaching fal.ai, (2) prompts that are too short and generic, (3) unused creativity slider, (4) missing global visual rules, and (5) no negative prompt support. This plan fixes all five systemic issues across backend processor, enrichment service, and frontend Studio UI — in three phases ordered by impact-to-effort ratio.

---

## Technical Context

**Language/Version**: TypeScript 5.7 (NestJS 10 backend + Vite/React 19 frontend)
**Primary Dependencies**: BullMQ (job processor), fal.ai SDK, NestJS, TanStack Query, Framer Motion
**Storage**: Supabase PostgreSQL — no schema changes needed
**Testing**: Bun test (unit), manual integration testing against fal.ai dev key
**Target Platform**: NestJS API (Linux container) + Vite web app (browser)
**Project Type**: Monorepo — `apps/api` (backend) + `apps/web` (frontend)
**Performance Goals**: No change to generation latency. Temperature param adds ~0ms overhead.
**Constraints**: Must not break existing batch API contract for older clients. New fields are optional.
**Scale/Scope**: 8 files modified, ~350 lines of net changes

---

## Constitution Check

| Principle | Status | Notes |
|---|---|---|
| I. AI-First | ✅ Pass | Improves core AI quality output |
| II. API-First | ✅ Pass | DTO extended with optional field, no breaking changes |
| III. UX Excellence | ✅ Pass | Advanced section uses progressive disclosure, collapsible |
| IV. Production-Ready | ✅ Pass | No Docker or infra changes |
| V. Data Integrity | ✅ Pass | No new sensitive data; metadata logging improves debuggability |
| VI. Scalability | ✅ Pass | No added latency or resource usage |
| VII. Testing | ✅ Pass | Unit test for buildStyleModifier and buildSystemPrompt covered in tasks |

---

## Project Structure

### Documentation (this feature)

```text
specs/033-studio-image-quality-improvements/
├── plan.md              # This file
├── spec.md              # Feature specification
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output
├── quickstart.md        # Phase 1 output
├── contracts/
│   └── image-generation-api.yaml
└── tasks.md             # Phase 2 output (/speckit.tasks command)
```

### Source Code (affected files)

```text
apps/api/src/
├── modules/image-generation/
│   ├── image-generation.processor.ts     # P1 — quality params + creativity fix
│   ├── prompt-enrichment.service.ts      # P2 — global rules + structured concept
│   ├── image-generation.service.ts       # P2 — forward negative_prompt to queue
│   └── dto/
│       └── image-generation.dto.ts       # P2 — add negative_prompt field
└── integrations/fal-ai/
    └── fal-ai.service.ts                 # P1 — MODEL_CAPABILITIES constant

apps/web/src/
├── hooks/
│   ├── useCreativePromptGenerator.ts     # P1 — expanded system prompt + temperature
│   └── useImageStudio.ts                 # P2 — negativePrompt state + API forwarding
└── app/workspace/[id]/project/[projectId]/studio/
    └── page.tsx                          # P2 — negative prompt UI
```

---

## Implementation Phases

---

### Phase 1 — Critical Fixes (P1, High Impact, Low Risk)

**Goal**: Fix the quality parameter bug and expand prompt generation. These changes are backend-only with zero frontend changes and zero risk of breaking existing flows.

#### Task 1.1 — MODEL_CAPABILITIES Map + Quality Params in Processor

**File**: `apps/api/src/modules/image-generation/image-generation.processor.ts`

Add a `MODEL_CAPABILITIES` constant at module level (or import from `fal-ai.service.ts`):

```typescript
const MODEL_CAPABILITIES: Record<string, {
  quality?: 'high';
  resolution?: '2K';
  supportsNegativePrompt: boolean;
}> = {
  'fal-ai/gpt-image-1.5':                            { quality: 'high',  supportsNegativePrompt: false },
  'fal-ai/gpt-image-1.5/edit':                       { quality: 'high',  supportsNegativePrompt: false },
  'fal-ai/gemini-3-pro-image-preview':               { resolution: '2K', supportsNegativePrompt: false },
  'fal-ai/gemini-3-pro-image-preview/edit':          { resolution: '2K', supportsNegativePrompt: false },
  'fal-ai/gemini-25-flash-image':                    { supportsNegativePrompt: false },
  'fal-ai/gemini-25-flash-image/edit':               { supportsNegativePrompt: false },
  'fal-ai/bytedance/seedream/v4.5/text-to-image':    { supportsNegativePrompt: true },
  'fal-ai/bytedance/seedream/v4.5/edit':             { supportsNegativePrompt: true },
};
```

Replace the `falParams` block in `process()`:

```typescript
// Before
const falParams = {
  aspect_ratio,
  num_images: 1,
};

// After
const caps = MODEL_CAPABILITIES[effectiveModel] ?? { supportsNegativePrompt: false };
const falParams: Record<string, unknown> = {
  aspect_ratio,
  num_images: 1,
  ...(caps.quality    && { quality: caps.quality }),
  ...(caps.resolution && { resolution: caps.resolution }),
};
```

**Estimated change**: ~30 lines added, 5 lines modified.

#### Task 1.2 — Fix Creativity Slider in Processor

**File**: `apps/api/src/modules/image-generation/image-generation.processor.ts`

Replace `buildStyleModifier`:

```typescript
private buildStyleModifier(index: number, creativity: number): string {
  // creativity is 0–100, convert to 0–3 bucket
  const creativityBucket = Math.floor((creativity / 100) * 3.99); // 0, 1, 2, or 3

  const modifierMatrix: string[][] = [
    // bucket 0 (low creativity, 0–25)
    [
      'faithful to the original concept, exact style match',
      'faithful composition with subtle color variation',
      'faithful style with minor framing adjustment',
      'true to the original with mood adaptation only',
    ],
    // bucket 1 (medium-low, 26–50)
    [
      'faithful composition with a subtle creative flourish',
      'largely faithful with expressive lighting treatment',
      'moderate stylistic variation on the core concept',
      'faithful base with artistic color grading',
    ],
    // bucket 2 (medium-high, 51–75)
    [
      'creative interpretation with strong visual identity',
      'bold composition maintaining concept intent',
      'expressive stylistic approach with artistic freedom',
      'experimental color grade and framing',
    ],
    // bucket 3 (high creativity, 76–100)
    [
      'bold creative reimagination of the concept',
      'avant-garde composition with full artistic license',
      'dramatic stylistic departure, abstract expression',
      'radical artistic reinterpretation',
    ],
  ];

  const row = modifierMatrix[creativityBucket] ?? modifierMatrix[1];
  return row[Math.min(index, row.length - 1)];
}
```

**Estimated change**: ~25 lines modified.

#### Task 1.3 — Expand System Prompt in useCreativePromptGenerator

**File**: `apps/web/src/hooks/useCreativePromptGenerator.ts`

1. Add `temperature: 0.3` to the chat/completion API call.
2. Replace the `buildSystemPrompt` function with a richer version.

**New system prompt (no concept)**:
```
Você é um especialista sênior em prompt engineering para IA de geração de imagem (Flux, Ideogram, DALL-E, Stable Diffusion).

Baseado nesta copy de marketing:

{content}

Gere um PROMPT DE IMAGEM profissional e altamente detalhado. O prompt deve cobrir OBRIGATORIAMENTE:

1. SUJEITO E AÇÃO: O que está acontecendo, quem/o que é o elemento principal
2. COMPOSIÇÃO E ENQUADRAMENTO: Tipo de plano (close-up, wide shot, overhead, eye-level), regra dos terços, espaço negativo
3. ILUMINAÇÃO: Tipo (natural/estúdio/dramática), direção, temperatura de cor (quente/fria/neutra)
4. ATMOSFERA E MOOD: Tom emocional, hora do dia, sensação geral
5. ESTILO VISUAL: Fotografia vs ilustração, granulação, paleta de cores, grading
6. TIPOGRAFIA (se houver texto na imagem): Peso da fonte, tamanho (headlines mín 48pt equiv.), contraste com fundo

REGRA DE IDIOMA: Descreva a cena visual em inglês. Qualquer texto que apareça DENTRO DA IMAGEM (headlines, CTAs, frases) deve estar no MESMO IDIOMA da copy acima.

REGRA DE QUALIDADE: Especifique iluminação profissional, alta definição, sem artefatos.

FORMATO: 250 a 350 palavras. Responda APENAS com o prompt, sem introdução ou explicação.
```

**New system prompt (with concept)**:
```
Você é um especialista sênior em prompt engineering para IA de geração de imagem (Flux, Ideogram, DALL-E, Stable Diffusion).

CONCEITO CRIATIVO: "{conceptName}"
{conceptDesc}
{compositionGuide}

REFERÊNCIA DE ESTILO DO CONCEITO:
{promptModifier}

Baseado nesta copy de marketing:

{content}

Gere um PROMPT DE IMAGEM profissional que combine o conceito "{conceptName}" com a copy. O prompt deve cobrir OBRIGATORIAMENTE:

1. SUJEITO E AÇÃO: Elemento principal alinhado ao conceito criativo
2. COMPOSIÇÃO E ENQUADRAMENTO: Layout e enquadramento específicos do conceito
3. ILUMINAÇÃO: Iluminação que reforce o mood do conceito
4. ATMOSFERA E MOOD: Tom emocional extraído da copy e do conceito
5. ESTILO VISUAL: Estilo fiel ao conceito, paleta de cores, textura, acabamento
6. TIPOGRAFIA (se houver): Peso, tamanho e contraste adequados

REGRA DE IDIOMA: Descreva a cena em inglês. Texto DENTRO DA IMAGEM no idioma da copy.
REGRA DE QUALIDADE: Alta definição, profissional, sem artefatos, iluminação controlada.

FORMATO: 250 a 350 palavras. Responda APENAS com o prompt.
```

**API call change**:
```typescript
const response = await api.post('/chat/completion', {
  project_id: projectId,
  model,
  messages: [{ role: 'user', content: systemPrompt }],
  stream: false,
  temperature: 0.3,    // ADD THIS
});
```

**Estimated change**: ~60 lines modified/expanded.

---

### Phase 2 — Quality Safety Net (P2, Medium Impact, Low Risk)

**Goal**: Inject global visual rules into every enriched prompt, add negative prompt support throughout the stack (backend DTO → queue job → fal.ai params → frontend UI).

#### Task 2.1 — Global Visual Rules in PromptEnrichmentService

**File**: `apps/api/src/modules/image-generation/prompt-enrichment.service.ts`

Add a private constant and append to all enriched prompts:

```typescript
private static readonly GLOBAL_VISUAL_RULES = `

GLOBAL VISUAL QUALITY RULES:
1. HIGH QUALITY: Sharp details, professional photography or illustration quality, no artifacts.
2. TYPOGRAPHY: Any text in the image must be legible on mobile (min 48pt headlines, 28pt body). When in doubt, make text BIGGER.
3. CONTRAST: Text must contrast strongly against background. Dark text on light bg or vice versa.
4. HIERARCHY: One clear dominant element. Intentional foreground/midground/background separation.
5. NO CLUTTER: Maximum 3 focal elements. Use negative space purposefully.
6. STYLE UNITY: Single consistent aesthetic. No mixing photography with flat design.
7. AVOID: blurry edges, watermarks, text artifacts, oversaturation, unrealistic proportions.`;
```

Append to `enrichPrompt()` output:

```typescript
return `${enrichedPrompt}${PromptEnrichmentService.GLOBAL_VISUAL_RULES}`;
```

**Estimated change**: ~15 lines added.

#### Task 2.2 — Structured Concept Usage in PromptEnrichmentService

**File**: `apps/api/src/modules/image-generation/prompt-enrichment.service.ts`

Replace the concept modifier prepend logic:

```typescript
// Before
if (concept && concept.promptModifier) {
  enrichedPrompt = `${concept.promptModifier}. ${prompt}`;
}

// After
if (concept) {
  const conceptDirective = this.buildConceptDirective(concept);
  enrichedPrompt = `${conceptDirective} ${prompt}`;
}
```

New private method:

```typescript
private buildConceptDirective(concept: any): string {
  const parts: string[] = [];

  if (concept.name) {
    parts.push(`Concept: "${concept.name}".`);
  }

  const json = concept.prompt_template_json as Record<string, unknown> | null;
  if (json?.composition) {
    const c = json.composition as Record<string, unknown>;
    const compParts = [
      c.layout    && `layout: ${c.layout}`,
      c.style     && `style: ${c.style}`,
      c.main_element && `main element: ${c.main_element}`,
    ].filter(Boolean);
    if (compParts.length) parts.push(`Composition (${compParts.join(', ')}).`);
  }

  if (Array.isArray(json?.requirements) && json.requirements.length) {
    parts.push(`Visual requirements: ${(json.requirements as string[]).join(', ')}.`);
  }

  if (json?.visual_description) {
    parts.push(`Visual reference: ${json.visual_description}.`);
  }

  // Fallback to plain modifier if no JSON
  if (parts.length <= 1 && concept.prompt_modifier) {
    return `${concept.prompt_modifier}.`;
  }

  if (concept.prompt_modifier) {
    parts.push(`Style: ${concept.prompt_modifier}.`);
  }

  return parts.join(' ');
}
```

**Estimated change**: ~35 lines added.

#### Task 2.3 — Add `negative_prompt` to DTO

**File**: `apps/api/src/modules/image-generation/dto/image-generation.dto.ts`

```typescript
@IsOptional()
@IsString()
@MaxLength(500)
negative_prompt?: string;
```

**Estimated change**: 5 lines.

#### Task 2.4 — Forward `negative_prompt` through queue

**File**: `apps/api/src/modules/image-generation/image-generation.service.ts`

When enqueuing batch variation jobs, include `negative_prompt` from the DTO in the job data.

**Estimated change**: ~5 lines.

#### Task 2.5 — Apply `negative_prompt` in Processor

**File**: `apps/api/src/modules/image-generation/image-generation.processor.ts`

```typescript
const DEFAULT_NEGATIVE_PROMPT =
  'blurry, low quality, distorted, watermark, text artifacts, oversaturated, noisy, pixelated, bad anatomy, ugly, duplicate';

// In process():
const negativePrompt = job.data.negative_prompt || DEFAULT_NEGATIVE_PROMPT;

// After building falParams:
if (caps.supportsNegativePrompt && negativePrompt) {
  falParams.negative_prompt = negativePrompt;
}

// In generationMetadata:
negative_prompt_applied: caps.supportsNegativePrompt,
```

**Estimated change**: ~15 lines.

#### Task 2.6 — Add `negativePrompt` to `useImageStudio`

**File**: `apps/web/src/hooks/useImageStudio.ts`

```typescript
const [negativePrompt, setNegativePrompt] = useState<string>('');

// In generate():
negative_prompt: negativePrompt || undefined,

// Return from hook:
negativePrompt,
setNegativePrompt,
```

**Estimated change**: ~10 lines.

#### Task 2.7 — Add Negative Prompt UI to Studio Page

**File**: `apps/web/src/app/workspace/[id]/project/[projectId]/studio/page.tsx`

Add a collapsible "Configurações Avançadas" section (using Shadcn `Collapsible`) below the existing controls but above the generate button:

```tsx
<Collapsible>
  <CollapsibleTrigger asChild>
    <Button variant="ghost" size="sm" className="w-full justify-between text-muted-foreground">
      Configurações Avançadas
      <ChevronDown className="h-3 w-3" />
    </Button>
  </CollapsibleTrigger>
  <CollapsibleContent className="space-y-2 pt-2">
    <Label className="text-xs text-muted-foreground">
      Prompt Negativo
      <span className="ml-1 text-muted-foreground/60">(o que evitar na imagem)</span>
    </Label>
    <Textarea
      placeholder="blurry, watermark, low quality, distorted..."
      value={studio.negativePrompt}
      onChange={(e) => studio.setNegativePrompt(e.target.value)}
      className="min-h-[60px] text-xs resize-none"
      maxLength={500}
    />
  </CollapsibleContent>
</Collapsible>
```

**Estimated change**: ~25 lines.

---

### Phase 3 — Store Enriched Prompt for Debugging (P3, Low Effort)

#### Task 3.1 — Log Enriched Prompt in generationMetadata

**File**: `apps/api/src/modules/image-generation/image-generation.processor.ts`

Add `enriched_prompt: finalPrompt` to the `generationMetadata` object when saving the document record. This allows debugging prompt quality without inspecting queue logs.

**Estimated change**: 1 line.

---

## Risk Assessment

| Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|
| fal.ai returns 422 for unsupported quality param | Low | High | MODEL_CAPABILITIES map gates all params; tested before deploy |
| LLM generates prompts over 2000 chars | Low | Medium | Trim to 2000 chars before forwarding to fal.ai |
| Existing clients break on DTO change | Low | Medium | `negative_prompt` is optional with `@IsOptional()` decorator |
| Global rules make prompts too long for some models | Low | Low | Rules are ~130 words; all fal.ai models accept 1000+ char prompts |
| Temperature 0.3 on slow/large models adds latency | None | None | Temperature is a sampling param, adds 0ms overhead |

---

## Complexity Tracking

No constitution violations. All changes are minimal and targeted.

---

## Estimated Effort

| Phase | Tasks | Net Lines Changed | Estimated Time |
|---|---|---|---|
| Phase 1 (P1 fixes) | 3 tasks | ~115 lines | 1–2 hours |
| Phase 2 (safety net) | 5 tasks | ~95 lines | 2–3 hours |
| Phase 3 (debugging) | 1 task | ~5 lines | 15 min |
| **Total** | **9 tasks** | **~215 lines** | **3–5 hours** |
