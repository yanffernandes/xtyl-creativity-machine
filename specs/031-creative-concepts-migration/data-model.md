# Data Model: Creative Concepts Migration

**Feature**: 031-creative-concepts-migration
**Date**: 2026-02-07

## Entity: Creative Concept

Replaces the `style_presets` table. All entries are creative concepts (no type distinction).

### Table: `creative_concepts`

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| `id` | UUID | No | `uuid_generate_v4()` | Primary key |
| `name` | VARCHAR(100) | No | - | English name |
| `name_pt` | VARCHAR(100) | No | - | Portuguese name |
| `slug` | VARCHAR(50) | No | - | Unique identifier (URL-safe) |
| `prompt_modifier` | TEXT | No | - | Static text prepended to user prompt |
| `prompt_template` | TEXT | Yes | NULL | Template with `{{variable}}` placeholders |
| `template_variables` | JSONB | Yes | NULL | Array of variable names the template accepts |
| `thumbnail_url` | TEXT | Yes | NULL | URL to concept thumbnail image |
| `sort_order` | INTEGER | No | 0 | Display order in UI |
| `is_active` | BOOLEAN | No | true | Whether concept is visible |
| `created_at` | TIMESTAMPTZ | No | `now()` | Creation timestamp |
| `updated_at` | TIMESTAMPTZ | Yes | NULL | Last update timestamp |

### Removed Columns (from `style_presets`)

| Column | Reason for Removal |
|--------|-------------------|
| `preset_type` | No longer needed - everything is a concept |
| `category` | Not needed - XTYL serves education, context comes from prompt |

### Added Columns (new)

| Column | Purpose |
|--------|---------|
| `prompt_template` | Supports `{{variable}}` syntax for dynamic content from project context |
| `template_variables` | Declares which variables the template accepts, e.g. `["client_name", "target_audience"]` |

### Indexes

| Index | Columns | Purpose |
|-------|---------|---------|
| `idx_creative_concepts_active` | `is_active` | Filter active concepts |
| `idx_creative_concepts_slug` | `slug` (UNIQUE) | Lookup by slug |
| `idx_creative_concepts_sort` | `sort_order` | Ordered listing |

### Constraints

- `slug` MUST be unique across all concepts
- `prompt_modifier` MUST NOT be null (provides fallback text)
- `prompt_template` MAY be null (concepts without variables use `prompt_modifier` directly)
- `template_variables` SHOULD be null when `prompt_template` is null

### Validation Rules

- `slug`: Lowercase alphanumeric + hyphens, 3-50 characters
- `name` / `name_pt`: Non-empty, max 100 characters
- `prompt_modifier`: Non-empty text
- `prompt_template`: If present, must contain at least one `{{variable}}`
- `template_variables`: If present, must be a JSON array of strings matching variables in `prompt_template`
- `sort_order`: Non-negative integer

---

## Seed Data

### Existing Concepts (migrated from layout presets)

12 rows carried over from `style_presets` where `preset_type = 'layout'`:

| slug | name | name_pt | sort_order |
|------|------|---------|------------|
| social-feed | Social Feed Post | Post para Feed Social | 1 |
| vertical-story | Vertical Story | Story Vertical | 2 |
| banner-cta | Banner with CTA | Banner com CTA | 3 |
| carousel-slide | Carousel Slide | Slide de Carrossel | 4 |
| corporate-pro | Corporate Professional | Corporativo Profissional | 5 |
| startup-tech | Startup Tech | Startup Tecnologia | 6 |
| ecommerce-product | E-commerce Product | Produto E-commerce | 7 |
| influencer-lifestyle | Influencer Lifestyle | Lifestyle Influenciador | 8 |
| sale-promo | Sale Promotion | Promocao de Venda | 9 |
| launch-announcement | Launch Announcement | Anuncio de Lancamento | 10 |
| testimonial-quote | Testimonial Quote | Depoimento/Testemunho | 11 |
| behind-scenes | Behind the Scenes | Bastidores | 12 |

### New Concepts (from Alvo Bot research)

| slug | name | name_pt | prompt_modifier | prompt_template | template_variables | sort_order |
|------|------|---------|-----------------|-----------------|-------------------|------------|
| question-hook | Question Hook | Pergunta Provocativa | "An attention-grabbing social media image with a bold question as the central element, designed to stop scrolling and provoke curiosity. Clean typography, contrasting background, engaging visual metaphor." | "An attention-grabbing image with a bold question about {{client_name}}, designed for {{target_audience}}. Clean typography, contrasting background." | `["client_name", "target_audience"]` | 13 |
| before-after | Before & After | Antes e Depois | "A split-screen comparison image showing a clear before-and-after transformation. Left side shows the problem state, right side shows the improved outcome. Clear visual divider, dramatic contrast." | NULL | NULL | 14 |
| social-proof-stats | Social Proof Stats | Prova Social com Dados | "A data-driven social proof image featuring impressive statistics and numbers. Large bold numbers as focal point, supporting icons, clean infographic style, professional credibility." | NULL | NULL | 15 |
| step-by-step | Step by Step Guide | Passo a Passo | "A visual step-by-step guide with numbered steps, each with a clear icon and brief description. Clean layout, progressive flow, easy to follow, educational tone." | NULL | NULL | 16 |
| comparison-table | Comparison Table | Tabela Comparativa | "A clean comparison layout showing features or options side by side. Structured grid, checkmarks and crosses, clear winner highlight, professional and informative." | NULL | NULL | 17 |
| simulator-ui | App/Simulator UI | Interface de App | "A realistic mobile app or web interface mockup showing an interactive tool or simulator. Modern UI design, clean interface elements, dark or light mode, professional app screenshot style." | NULL | NULL | 18 |

### Deleted Rows (visual style presets)

8 rows removed: `photographic`, `watercolor`, `3d-render`, `illustration`, `minimalist`, `vibrant`, `vintage`, `cinematic`.

---

## Template Variable Resolution

### Resolution Flow

```
1. User selects concept + writes prompt
2. Backend receives concept slug + user prompt
3. Backend loads concept from DB
4. If concept.prompt_template is not null:
   a. Load project settings (already available in generation context)
   b. Build variable map: { "client_name": project.settings["client_name"], ... }
   c. For each {{var}} in prompt_template:
      - If var exists in map and is non-empty → substitute
      - If var missing or empty → mark as unresolvable
   d. If all variables resolved → use resolved template
   e. If any variable unresolvable → fall back to concept.prompt_modifier
5. Prepend concept text to user prompt: "{concept_text}. {user_prompt}"
```

### Variable Sources (Project Settings)

| Variable Name | Source Path | Example |
|---------------|------------ |---------|
| `client_name` | `project.settings['client_name']` | "Universidade XPTO" |
| `description` | `project.settings['description']` | "Curso de engenharia" |
| `target_audience` | `project.settings['target_audience']` | "Jovens 18-25" |
| `brand_voice` | `project.settings['brand_voice']` (label) | "Professional & Formal" |
| `key_messages` | `project.settings['key_messages']` (joined) | "Inovacao, Qualidade" |
| `project_name` | `project.name` | "Campanha Vestibular" |

---

## Migration SQL (high-level)

```sql
-- 1. Rename table
ALTER TABLE style_presets RENAME TO creative_concepts;

-- 2. Drop columns
ALTER TABLE creative_concepts DROP COLUMN IF EXISTS preset_type;
ALTER TABLE creative_concepts DROP COLUMN IF EXISTS category;

-- 3. Add columns
ALTER TABLE creative_concepts ADD COLUMN IF NOT EXISTS prompt_template TEXT;
ALTER TABLE creative_concepts ADD COLUMN IF NOT EXISTS template_variables JSONB;
ALTER TABLE creative_concepts ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ;

-- 4. Delete visual style presets
DELETE FROM creative_concepts WHERE slug IN (
  'photographic', 'watercolor', '3d-render', 'illustration',
  'minimalist', 'vibrant', 'vintage', 'cinematic'
);

-- 5. Insert new concepts
INSERT INTO creative_concepts (...) VALUES (...);

-- 6. Rename indexes
ALTER INDEX IF EXISTS idx_style_presets_active RENAME TO idx_creative_concepts_active;
ALTER INDEX IF EXISTS idx_style_presets_type RENAME TO idx_creative_concepts_sort;
```

---

## Impact on Existing Data

### Documents with generation_metadata

Documents that reference `style_preset: "photographic"` (or any old preset slug) in their `generation_metadata` JSONB are **NOT modified**. The metadata is historical and preserved as-is. The UI displays it as a read-only string.

### No Foreign Keys

The `style_presets` table has no foreign key relationships with other tables. The connection is via slug strings stored in `generation_metadata` JSONB, which is unaffected by the rename.
