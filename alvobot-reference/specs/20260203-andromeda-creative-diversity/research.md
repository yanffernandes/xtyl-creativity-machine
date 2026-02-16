# Research: Andromeda Creative Diversity System

**Date**: 2026-02-03
**Status**: Completed
**Feature**: [spec.md](./spec.md) | [plan.md](./plan.md)

## Research Questions

### Q1: OpenRouter API - Exact Model IDs

**Question**: What are the exact model IDs for Nano Banana Pro and GPT Image 1.5 on OpenRouter?

**Findings**:
OpenRouter uses the standard model ID format. Based on the OpenRouterService analysis:

```typescript
// Model ID format: provider/model-name
// Example: "google/gemini-3-flash-001"

// For image generation models, the service filters by:
// architecture.output_modalities.includes('image')
```

**Model IDs to use** (verify via OpenRouter API):
- **Nano Banana Pro** (Google DeepMind): Likely `google/gemini-3.0-pro` or similar - needs API verification
- **GPT Image 1.5** (OpenAI): Likely `openai/gpt-image-1.5` or similar - needs API verification

**Action Required**: Query OpenRouter `/models` endpoint with type=image to get exact model IDs.

**Implementation Note**: The existing `OpenRouterService.getImageModels()` method can fetch available image models dynamically. We should NOT hardcode model IDs but instead:
1. Store supported model IDs in `platform_settings` table
2. Provide admin UI to select models from available list

---

### Q2: Existing Integration Structure

**Question**: What is the current `ai-creative.service.ts` structure and extension points?

**Findings**:

The service has 1201 lines and includes:

**Core Methods (Reuse)**:
- `getDefaultImageModel()` - Gets model from `platform_settings` table
- `generateImageWithOpenRouter(prompt, model, format)` - OpenRouter image generation
- `generateImageWithConfiguredModel(prompt, format)` - Uses admin-configured model with fallback
- `uploadImageToStorage(imageBase64, mimeType, userId)` - Supabase storage upload
- `saveToLibrary(...)` - Saves to `creative_library` table

**Prompt Generation (Extend)**:
- `generateImagePrompt(article, style, format, userDirections)` - Database-driven prompt generation
- Uses `system_prompts` table for templates with variables: `{{article_title}}`, `{{keyword}}`, `{{style}}`, `{{user_directions}}`

**Styles (Replace with Concepts)**:
```typescript
export const CREATIVE_STYLES = [
  "photorealistic",
  "illustration",
  "minimalist",
  "cinematic",
  "watercolor",
] as const;

// Method cycles through styles:
getStyleForIndex(index: number): CreativeStyle {
  return CREATIVE_STYLES[index % CREATIVE_STYLES.length];
}
```

**Extension Points**:
1. Replace `CREATIVE_STYLES` with `CREATIVE_CONCEPTS` from database
2. Extend `generateImagePrompt()` to handle:
   - Concept-based prompts
   - Niche templates
   - Visual groups (financial)
   - User directions priority
3. Add model rotation logic (not just fallback, but intentional rotation)
4. Add session tracking for diversity validation

---

### Q3: Store Structure

**Question**: What is the current `metaAdsWizardStore` shape and how to extend for modes/concepts?

**Findings**:

**Current Image Config** (line 266):
```typescript
const initialImageConfig: ImageGenerationConfig = {
  model: 'dall-e-3',
  format: '1:1',
  userDirections: '',
}
```

**Required Extensions**:
```typescript
interface ImageGenerationConfig {
  model: ImageModel          // Keep (for legacy UI)
  format: ImageFormat        // Keep
  userDirections: string     // Keep (priority 1 in prompt)

  // NEW: Generation Mode
  generationMode: 'preset' | 'free'

  // NEW: For Preset Mode
  conceptSelections: Array<{
    conceptId: string
    quantity: number
  }>

  // NEW: Session tracking for diversity
  usedConcepts: string[]     // Last N concepts used
  usedBackgrounds: string[]  // Last N backgrounds used
  usedModels: string[]       // Last N models used
}
```

**Targeting Already Available** (line 238-244):
```typescript
const initialTargeting: MetaTargeting = {
  ageMin: 18,
  ageMax: 65,
  genders: [0],
  countries: ['BR'],
  languages: [{ key: 'pt', name: 'Português' }],
}
```
- `targeting.countries` - For localization (currency, cultural symbols)
- `targeting.languages` - For text in creatives

---

### Q4: Database Schema

**Question**: Best approach for storing concepts, templates, and generation history?

**Findings**:

**Existing Tables to Reuse**:
- `creative_library` - Already stores: `model_used`, `style_used`, `prompt_used`, `format`
- `system_prompts` - Already stores prompt templates with provider routing
- `platform_settings` - Already stores default model config

**New Tables Required**:

```sql
-- 1. Creative Concepts (8 universal + 28 financial)
CREATE TABLE creative_concepts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug VARCHAR(50) NOT NULL UNIQUE,  -- 'simulator-ui', 'typography', etc.
  name VARCHAR(100) NOT NULL,         -- Display name
  description TEXT,
  prompt_template TEXT NOT NULL,      -- Base prompt for this concept
  icon VARCHAR(20),                   -- Emoji or icon code
  category VARCHAR(50),               -- 'universal' | 'narrativa' | 'prova_social' | etc.
  niche VARCHAR(50) NOT NULL,         -- 'generic' | 'financial' | 'jobs'
  works_for_niches TEXT[],            -- Array of compatible niches
  sort_order INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Visual Groups (for financial niche)
CREATE TABLE visual_groups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code CHAR(1) NOT NULL UNIQUE,       -- 'A', 'B', 'C', etc.
  name VARCHAR(100) NOT NULL,         -- 'UI / Fintech', 'Dinheiro Realista', etc.
  variations JSONB NOT NULL,          -- Array of 10 variation prompts
  niche VARCHAR(50) NOT NULL,         -- Which niche this group belongs to
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Niche Templates (master templates per niche)
CREATE TABLE niche_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  niche VARCHAR(50) NOT NULL UNIQUE,
  template TEXT NOT NULL,             -- Master template (Andromeda compliant)
  prohibited_words TEXT[],            -- Words to never use
  required_elements TEXT[],           -- Elements that must be present
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Generation Sessions (for diversity tracking)
CREATE TABLE generation_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id),
  workspace_id UUID REFERENCES workspaces(id),
  wizard_session_id VARCHAR(100),     -- Links to wizard store

  -- Diversity tracking
  used_concepts TEXT[] DEFAULT '{}',
  used_backgrounds TEXT[] DEFAULT '{}',
  used_models TEXT[] DEFAULT '{}',

  -- Settings
  generation_mode VARCHAR(20) NOT NULL,  -- 'preset' | 'free'
  detected_niche VARCHAR(50),

  -- Results
  images_generated INTEGER DEFAULT 0,
  diversity_score DECIMAL(3,2),       -- 0.00 to 1.00

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS Policies
ALTER TABLE creative_concepts ENABLE ROW LEVEL SECURITY;
ALTER TABLE visual_groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE niche_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE generation_sessions ENABLE ROW LEVEL SECURITY;

-- Concepts/Groups/Templates: Public read (no user filter needed)
CREATE POLICY "public_read_concepts" ON creative_concepts FOR SELECT USING (true);
CREATE POLICY "public_read_visual_groups" ON visual_groups FOR SELECT USING (true);
CREATE POLICY "public_read_niche_templates" ON niche_templates FOR SELECT USING (true);

-- Sessions: User's own data
CREATE POLICY "users_own_sessions" ON generation_sessions
  USING (user_id = auth.uid());
```

---

### Q5: Prompt Format

**Question**: JSON prompt format that produces best results with text in images?

**Findings**:

Based on the spec (FR-011) and existing `generateImagePrompt()` method:

**Current Approach** (fallback):
```typescript
let prompt = `Professional advertisement image for Meta/Facebook ads about "${article.title}". `;
prompt += `Focus on the topic: ${article.keyword}. `;
prompt += `Visual style: ${styleDescriptions[style]}. `;
```

**Recommended JSON Format** (per spec FR-011):
```json
{
  "concept": "simulator-ui",
  "visual_description": "Fintech app UI showing a loan simulator interface with clean, modern design",
  "composition": {
    "title": {
      "text": "De quanto você precisa?",
      "position": "top-center",
      "style": "extra-large-bold"
    },
    "subtext": {
      "text": "Escolha o valor que faz sentido para você",
      "position": "below-title"
    },
    "value_buttons": {
      "values": ["5K", "10K", "20K"],
      "currency": "R$",
      "style": "large-high-contrast"
    },
    "cta": {
      "text": "Quero simular",
      "position": "bottom-center",
      "style": "large-contrasting"
    }
  },
  "background": {
    "type": "gradient",
    "colors": ["#1a1a2e", "#0f3460"]
  },
  "prohibited": ["imediato", "hoje", "agora", "instantâneo"],
  "format": "1:1"
}
```

**Text Rendering Best Practices**:
1. Use JSON structure for AI to understand layout
2. Explicit position instructions (top, center, bottom)
3. Size instructions (extra-large, large, small)
4. Currency formatting explicit
5. Prohibited words list included in prompt
6. High contrast requirement for text legibility

---

## Implementation Recommendations

### 1. Model Rotation Strategy

```typescript
// Round-robin rotation between models
function getNextModel(usedModels: string[], availableModels: string[]): string {
  // Filter out last used model
  const filtered = availableModels.filter(m => m !== usedModels[usedModels.length - 1]);
  // Random from remaining
  return filtered[Math.floor(Math.random() * filtered.length)] || availableModels[0];
}
```

### 2. Concept Selection Strategy

```typescript
// For Free mode - don't repeat last N concepts
const DIVERSITY_WINDOW = 3;

function getNextConcept(
  usedConcepts: string[],
  availableConcepts: Concept[],
  niche: string
): Concept {
  const recentlyUsed = new Set(usedConcepts.slice(-DIVERSITY_WINDOW));
  const eligible = availableConcepts.filter(c =>
    !recentlyUsed.has(c.id) && c.works_for_niches.includes(niche)
  );

  // Random selection from eligible
  return eligible[Math.floor(Math.random() * eligible.length)];
}
```

### 3. Prompt Composition Order

```typescript
async function composePrompt(
  article: ArticleContext,
  concept: Concept,
  visualGroup: VisualGroup | null,
  nicheTemplate: NicheTemplate | null,
  userDirections: string,
  targeting: Targeting
): string {
  const parts: string[] = [];

  // Priority 1: User directions (ALWAYS respected)
  if (userDirections) {
    parts.push(`IMPORTANT USER REQUIREMENTS: ${userDirections}`);
  }

  // Priority 2: Niche template (if applicable)
  if (nicheTemplate) {
    parts.push(`STYLE TEMPLATE: ${nicheTemplate.template}`);
    parts.push(`PROHIBITED WORDS: ${nicheTemplate.prohibited_words.join(', ')}`);
  }

  // Priority 3: Concept + Visual Group
  parts.push(`CONCEPT: ${concept.prompt_template}`);
  if (visualGroup) {
    const variation = visualGroup.variations[Math.floor(Math.random() * 10)];
    parts.push(`VISUAL STYLE: ${variation}`);
  }

  // Priority 4: Localization from targeting
  const currency = getCurrencyForCountry(targeting.countries[0]);
  const language = targeting.languages[0]?.name || 'Português';
  parts.push(`LOCALIZATION: Currency ${currency}, Language ${language}`);

  return parts.join('\n\n');
}
```

### 4. Diversity Score Calculation

```typescript
function calculateDiversityScore(session: GenerationSession): number {
  const uniqueConcepts = new Set(session.used_concepts).size;
  const uniqueBackgrounds = new Set(session.used_backgrounds).size;
  const uniqueModels = new Set(session.used_models).size;

  const total = session.images_generated;
  if (total === 0) return 0;

  // Weight: 50% concepts, 30% backgrounds, 20% models
  const conceptScore = Math.min(uniqueConcepts / total, 1) * 0.5;
  const backgroundScore = Math.min(uniqueBackgrounds / Math.min(total, 5), 1) * 0.3;
  const modelScore = uniqueModels >= 2 ? 0.2 : 0.1;

  return conceptScore + backgroundScore + modelScore;
}
```

---

## Unknowns Resolved

| Question | Status | Resolution |
|----------|--------|------------|
| OpenRouter model IDs | Partially Resolved | Use dynamic fetch from API; store in platform_settings |
| Integration structure | Resolved | Extend existing service; use system_prompts table |
| Store shape | Resolved | Add generationMode, conceptSelections, diversity tracking |
| Database schema | Resolved | 4 new tables with RLS |
| Prompt format | Resolved | JSON structure with composition, localization, prohibitions |

---

## Next Steps

1. **Phase 1**: Generate data-model.md with complete Supabase schema
2. **Phase 1**: Generate API contracts for new endpoints
3. **Phase 1**: Generate quickstart.md for developer onboarding
4. **Phase 2**: Generate tasks.md via `/speckit.tasks`
