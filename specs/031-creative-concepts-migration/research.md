# Research: Creative Concepts Migration

**Feature**: 031-creative-concepts-migration
**Date**: 2026-02-07

## R1: New Concept Seed Data - What to Add from Alvo Bot

**Decision**: Add 6 new concepts inspired by Alvo Bot, merge with existing 12 layouts (removing duplicates), resulting in ~15-18 total concepts.

**Rationale**: The existing 12 layout presets already cover many marketing composition patterns. Alvo Bot's concept system adds narrative/engagement approaches that complement our layouts. We should only add concepts that are genuinely new and not duplicates.

**Mapping - Existing layouts to keep as concepts**:

| Existing Layout Slug | Keep? | Notes |
|---------------------|-------|-------|
| social-feed | Yes | Generic social media post composition |
| vertical-story | Yes | 9:16 story format |
| banner-cta | Yes | Banner with call-to-action |
| carousel-slide | Yes | Carousel slide design |
| corporate-pro | Yes | Corporate professional style |
| startup-tech | Yes | Modern tech aesthetic |
| ecommerce-product | Yes | Product showcase |
| influencer-lifestyle | Yes | Lifestyle/influencer aesthetic |
| sale-promo | Yes | Promotional/sale design |
| launch-announcement | Yes | Product/feature launch |
| testimonial-quote | Yes | Already matches Alvo Bot's testimonial-social |
| behind-scenes | Yes | Behind-the-scenes content |

**New concepts to add (from Alvo Bot, no duplicates)**:

| New Slug | Name (EN) | Name (PT) | Source |
|----------|-----------|-----------|--------|
| question-hook | Question Hook | Pergunta Provocativa | Alvo Bot - narrativa |
| before-after | Before & After | Antes e Depois | Alvo Bot - comparacao |
| social-proof-stats | Social Proof Stats | Prova Social com Dados | Alvo Bot - prova_social |
| step-by-step | Step by Step Guide | Passo a Passo | Alvo Bot - narrativa |
| comparison-table | Comparison Table | Tabela Comparativa | Alvo Bot - comparacao |
| simulator-ui | App/Simulator UI | Interface de App | Alvo Bot - ui_simulacao |

**Alternatives considered**:
- Import all ~20 Alvo Bot concepts → rejected (too many duplicates with existing layouts)
- Import only 2-3 → rejected (misses valuable narrative patterns)

---

## R2: Template Variable Resolution Strategy

**Decision**: Use simple `{{variable}}` substitution from project settings context, reusing the existing `substitute_variables()` pattern from the templates module.

**Rationale**: The codebase already has a `substitute_variables()` function in `backend/routers/templates.py` that does `{{key}}` replacement. We should follow the same pattern rather than inventing a new one. The project context is already structured in settings JSONB.

**Available variables for concept templates**:

| Variable | Source | Example Value |
|----------|--------|---------------|
| `{{client_name}}` | `project.settings['client_name']` | "Universidade XPTO" |
| `{{description}}` | `project.settings['description']` | "Curso de engenharia de dados" |
| `{{target_audience}}` | `project.settings['target_audience']` | "Jovens de 18-25 anos" |
| `{{brand_voice}}` | `project.settings['brand_voice']` label | "Professional & Formal" |
| `{{key_messages}}` | `project.settings['key_messages']` joined | "Inovacao, Qualidade, Acessibilidade" |
| `{{project_name}}` | `project.name` | "Campanha Vestibular 2026" |

**Fallback strategy**: If a variable in `prompt_template` cannot be resolved (e.g., `target_audience` not set in project settings), fall back to `prompt_modifier` (static text). This avoids generating prompts with literal `{{target_audience}}` strings.

**Alternatives considered**:
- Use workflow-style `{{node.field}}` syntax → rejected (different context, unnecessary complexity)
- Resolve variables on frontend before sending → rejected (backend has the project context, cleaner to resolve server-side)

---

## R3: Migration Strategy - Rename vs Drop+Create

**Decision**: Use `ALTER TABLE RENAME` for the table, `ALTER TABLE DROP/ADD COLUMN` for columns. This preserves existing row IDs and references.

**Rationale**: Renaming is safer than drop+create because it preserves UUIDs, foreign key references (if any), and existing data. The migration is a single atomic transaction.

**Migration steps**:
1. Rename table: `style_presets` → `creative_concepts`
2. Drop columns: `preset_type`, `category`
3. Add columns: `prompt_template` (TEXT, nullable), `template_variables` (JSONB, nullable)
4. Delete visual_style rows (8 presets)
5. Update existing layout rows (refresh prompt_modifier text if needed)
6. Insert new concept rows (6 new from Alvo Bot)
7. Rename indexes accordingly

**Alternatives considered**:
- Create new table + migrate data → rejected (unnecessary complexity, risk of ID mismatch)
- Keep old table as archive → rejected (clean break decision from clarify phase)

---

## R4: Prompt Composition - Prepend Strategy

**Decision**: Concept text is prepended to user prompt with a period+space separator: `"{concept_text}. {user_prompt}"`.

**Rationale**: The current system already uses `". ".join(modifiers)` to combine style modifiers (see `image_generation.py` line 1174). We follow the same pattern but simplify: instead of building a list of modifiers from visual_style + layout, we have at most one concept modifier prepended to the user prompt.

**Composition logic**:
```
if concept has prompt_template AND all variables resolvable:
    concept_text = resolve_variables(prompt_template, project_context)
else:
    concept_text = prompt_modifier

if concept_text:
    final_prompt = f"{concept_text}. {user_prompt}"
else:
    final_prompt = user_prompt
```

**Alternatives considered**:
- Append concept after user prompt → rejected (model pays less attention to end of prompt)
- Use system prompt for concept → rejected (not all image models support system prompts)

---

## R5: Frontend Component Renaming Strategy

**Decision**: Rename `StylePresetCard.tsx` → `ConceptCard.tsx` and `StylePresetGrid.tsx` → `ConceptGrid.tsx`. Update all imports and exports in a single pass.

**Rationale**: Clean break means clean naming. The old "preset" terminology is replaced everywhere with "concept". Since we control all consumers (internal frontend), there are no external dependencies to worry about.

**Files requiring import updates** (from codebase search):
- `CreateMode.tsx` - imports StylePresetGrid
- `index.ts` - exports StylePresetCard, StylePresetGrid
- `useImageStudio.ts` - imports StylePreset type
- `image-studio.ts` - defines StylePreset interface
- `supabase.ts` - defines StylePreset interface
- `studio/page.tsx` - uses bootstrap data with style_presets

**Alternatives considered**:
- Keep old component names with new internal logic → rejected (confusing, mixed terminology)
- Create wrapper components for backward compat → rejected (unnecessary, clean break)
