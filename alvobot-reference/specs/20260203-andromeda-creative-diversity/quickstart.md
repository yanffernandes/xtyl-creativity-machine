# Quickstart: Andromeda Creative Diversity System

**Date**: 2026-02-03
**Status**: Phase 1 Complete
**Feature**: [spec.md](./spec.md) | [plan.md](./plan.md)

## Overview

This quickstart guide helps developers understand and implement the Andromeda Creative Diversity System. The system generates visually DISTINCT creatives for Meta Ads campaigns to avoid algorithm penalties.

## Key Concepts

### 1. Generation Modes

| Mode | Description | Use Case |
|------|-------------|----------|
| **Preset** | User selects concepts + quantities | Experienced users wanting control |
| **Free** | AI decides concepts automatically | Users preferring automation |

### 2. Creative Concepts

- **Universal (8)**: Work for all niches - Simulator UI, Typography, Testimonial, Before/After, Question Hook, Comparison, Native/UGC, Banner
- **Financial (28)**: Specialized concepts in 5 categories - Narrativa, Prova Social, Produto, Curiosidade, Estilo Visual

### 3. Visual Groups (Financial only)

8 visual groups (A-H) with 10 variations each:
- A: UI/Fintech
- B: Dinheiro Realista
- C: Dinheiro em Movimento
- D: Malotes/Sacos
- E: Bancos/Institucional
- F: Pessoas Reais
- G: Cartoon/Ilustração
- H: Ultra Premium/Editorial

### 4. Model Rotation

System alternates between:
- **Nano Banana Pro** (Google/DeepMind)
- **GPT Image 1.5** (OpenAI)

via OpenRouter for visual diversity.

## Architecture

```
Frontend (React)
├── StepCreatives.tsx      # Main wizard step
├── ModeToggle.tsx         # Preset/Free toggle
├── ConceptSelector.tsx    # Concept selection UI
└── DiversityPreview.tsx   # Score visualization

Backend (NestJS)
├── ai-creative.service.ts     # Extended with concept-based prompts
├── prompt-composer.service.ts # NEW: Composes prompts from components
└── niche-detector.service.ts  # NEW: Detects niche from content

Database (Supabase)
├── creative_concepts      # 8 universal + 28 financial concepts
├── visual_groups          # 8 groups with 10 variations each
├── niche_templates        # Master templates per niche
└── generation_sessions    # Diversity tracking
```

## Quick Implementation Guide

### Step 1: Database Migration

```bash
# Run migrations in order
cd supabase
supabase db push < migrations/20260203_creative_diversity_tables.sql
supabase db push < migrations/20260203_creative_diversity_seed.sql
supabase db push < migrations/20260203_extend_creative_library.sql
```

### Step 2: Backend Service Extension

```typescript
// backend/src/modules/meta/services/prompt-composer.service.ts

@Injectable()
export class PromptComposerService {
  constructor(private readonly supabase: SupabaseService) {}

  async composePrompt(
    article: ArticleContext,
    concept: CreativeConcept,
    options: {
      visualGroup?: VisualGroup;
      nicheTemplate?: NicheTemplate;
      userDirections?: string;
      targeting?: Targeting;
    }
  ): Promise<string> {
    const parts: string[] = [];

    // Priority 1: User directions (ALWAYS respected)
    if (options.userDirections) {
      parts.push(`USER REQUIREMENTS: ${options.userDirections}`);
    }

    // Priority 2: Niche template
    if (options.nicheTemplate) {
      parts.push(`TEMPLATE: ${options.nicheTemplate.template}`);
      parts.push(`PROHIBITED: ${options.nicheTemplate.prohibited_words.join(', ')}`);
    }

    // Priority 3: Concept + Visual Group
    parts.push(`CONCEPT: ${concept.prompt_template}`);
    if (options.visualGroup) {
      const variation = this.getRandomVariation(options.visualGroup);
      parts.push(`VISUAL: ${variation.prompt}`);
    }

    // Priority 4: Localization
    if (options.targeting) {
      const currency = this.getCurrency(options.targeting.countries[0]);
      const language = options.targeting.languages[0]?.name || 'Português';
      parts.push(`LOCALE: Currency ${currency}, Language ${language}`);
    }

    return parts.join('\n\n');
  }
}
```

### Step 3: Frontend Store Extension

```typescript
// frontend/src/features/alvoads-meta/stores/metaAdsWizardStore.ts

// Add to ImageGenerationConfig interface
interface ImageGenerationConfig {
  model: ImageModel
  format: ImageFormat
  userDirections: string

  // NEW: Generation mode
  generationMode: 'preset' | 'free'

  // NEW: For Preset mode
  conceptSelections: Array<{
    conceptId: string
    conceptSlug: string
    quantity: number
  }>
}

// Add to initial state
const initialImageConfig: ImageGenerationConfig = {
  model: 'dall-e-3',
  format: '1:1',
  userDirections: '',
  generationMode: 'free',  // Default to free mode
  conceptSelections: [],
}
```

### Step 4: Mode Toggle Component

```tsx
// frontend/src/features/alvoads-meta/components/wizard/ModeToggle.tsx

export function ModeToggle() {
  const { imageConfig, setImageConfig } = useMetaAdsWizardStore()

  return (
    <div className={styles.modeToggle}>
      <button
        className={imageConfig.generationMode === 'preset' ? styles.active : ''}
        onClick={() => setImageConfig({ generationMode: 'preset' })}
      >
        <span>Modo Preset</span>
        <small>Eu escolho os conceitos</small>
      </button>
      <button
        className={imageConfig.generationMode === 'free' ? styles.active : ''}
        onClick={() => setImageConfig({ generationMode: 'free' })}
      >
        <span>Modo Livre</span>
        <small>IA decide</small>
      </button>
    </div>
  )
}
```

### Step 5: Concept Selector Component

```tsx
// frontend/src/features/alvoads-meta/components/wizard/ConceptSelector.tsx

export function ConceptSelector() {
  const { data: concepts } = useConcepts('generic')
  const { imageConfig, setImageConfig } = useMetaAdsWizardStore()
  const requiredCount = useMetaAdsWizardStore(s => s.getRequiredImageCount())

  const totalSelected = imageConfig.conceptSelections.reduce(
    (sum, s) => sum + s.quantity, 0
  )

  const handleQuantityChange = (conceptId: string, slug: string, quantity: number) => {
    const existing = imageConfig.conceptSelections.filter(s => s.conceptId !== conceptId)
    if (quantity > 0) {
      existing.push({ conceptId, conceptSlug: slug, quantity })
    }
    setImageConfig({ conceptSelections: existing })
  }

  return (
    <div className={styles.conceptSelector}>
      <div className={styles.header}>
        <span>Conceitos Disponíveis</span>
        <span>{totalSelected} / {requiredCount} selecionados</span>
      </div>
      <div className={styles.grid}>
        {concepts?.universal.map(concept => (
          <ConceptCard
            key={concept.id}
            concept={concept}
            quantity={imageConfig.conceptSelections.find(s => s.conceptId === concept.id)?.quantity || 0}
            onChange={(qty) => handleQuantityChange(concept.id, concept.slug, qty)}
            maxQuantity={requiredCount - totalSelected + (imageConfig.conceptSelections.find(s => s.conceptId === concept.id)?.quantity || 0)}
          />
        ))}
      </div>
    </div>
  )
}
```

## API Usage

### Generate Creatives (Preset Mode)

```typescript
const response = await api.post('/meta/creatives/generate', {
  articles: selectedArticles.map(a => ({
    id: a.id,
    title: a.title,
    keyword: a.keyword_used,
    excerpt: a.excerpt,
  })),
  count: requiredImageCount,
  mode: 'preset',
  conceptSelections: imageConfig.conceptSelections.map(s => ({
    conceptId: s.conceptId,
    quantity: s.quantity,
  })),
  format: imageConfig.format,
  userDirections: imageConfig.userDirections,
  targeting: {
    countries: targeting.countries,
    languages: targeting.languages,
  },
  workspaceId,
})
```

### Generate Creatives (Free Mode)

```typescript
const response = await api.post('/meta/creatives/generate', {
  articles: selectedArticles.map(a => ({
    id: a.id,
    title: a.title,
    keyword: a.keyword_used,
    excerpt: a.excerpt,
  })),
  count: requiredImageCount,
  mode: 'free',
  format: imageConfig.format,
  userDirections: imageConfig.userDirections,
  targeting: {
    countries: targeting.countries,
    languages: targeting.languages,
  },
  workspaceId,
})
```

## Diversity Score Calculation

```typescript
function calculateDiversityScore(session: GenerationSession): number {
  const uniqueConcepts = new Set(session.used_concepts).size
  const uniqueBackgrounds = new Set(session.used_backgrounds).size
  const uniqueModels = new Set(session.used_models).size
  const total = session.images_generated

  if (total === 0) return 0

  // Weights: 50% concepts, 30% backgrounds, 20% models
  const conceptScore = Math.min(uniqueConcepts / total, 1) * 0.5
  const backgroundScore = Math.min(uniqueBackgrounds / Math.min(total, 5), 1) * 0.3
  const modelScore = uniqueModels >= 2 ? 0.2 : 0.1

  return conceptScore + backgroundScore + modelScore
}

// Threshold: >= 0.70 is considered good diversity
const DIVERSITY_THRESHOLD = 0.70
```

## Success Criteria Checklist

| SC | Criteria | Implementation |
|----|----------|----------------|
| SC-001 | Preset mode: exact quantities | Validate sum of selections = count |
| SC-002 | Free mode: 80% concept diversity | Track used_concepts, enforce window |
| SC-003 | 60% background diversity | Track used_backgrounds in session |
| SC-004 | Both models used for 4+ creatives | Rotate models, track used_models |
| SC-005 | <5% error rate with fallback | Implement model fallback |
| SC-006 | 95% financial niche detection | Keyword analysis with confidence |
| SC-007 | Financial template compliance | Validate required elements |
| SC-008 | Mode switch <5 seconds | UI is instant, no API call |
| SC-009 | Diversity score always shown | DiversityPreview component |

## Common Issues

### 1. Model Fallback Not Working
Ensure OpenRouter API key is configured and both models are available.

### 2. Concepts Not Loading
Check RLS policies on `creative_concepts` table allow public SELECT.

### 3. Diversity Score Too Low
- Increase concept variety in selections (preset mode)
- Check model rotation is working (both models should be used)
- Verify backgrounds are being varied

### 4. Financial Template Not Applied
Check niche detection confidence threshold (95% for financial).

## Files to Modify

### Backend
1. `ai-creative.service.ts` - Add concept-based prompt generation
2. `generate-image.dto.ts` - Add mode, concepts fields
3. `creative.controller.ts` - Add new endpoints

### Frontend
1. `StepCreatives.tsx` - Add ModeToggle, ConceptSelector
2. `metaAdsWizardStore.ts` - Add generationMode, conceptSelections
3. `useCreatives.ts` - Update mutation params
4. `creative.ts` - Add concept types

### Database
1. Run migrations for new tables
2. Seed concept data
3. Extend creative_library table

## Next Steps

1. Run `/speckit.tasks` to generate implementation tasks
2. Create feature branch: `20260203-andromeda-creative-diversity`
3. Implement in order: DB → Backend → Frontend → Tests
