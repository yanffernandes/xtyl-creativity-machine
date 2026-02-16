# Data Model: Andromeda Creative Diversity System

**Date**: 2026-02-03
**Status**: Phase 1 Complete
**Feature**: [spec.md](./spec.md) | [plan.md](./plan.md)

## Overview

This document defines the database schema for the Andromeda Creative Diversity System. The design follows Constitution Principle II (Dynamic Data - no hardcode) by storing all concepts, templates, and configurations in Supabase tables.

## Entity Relationship Diagram

```
┌─────────────────────┐     ┌─────────────────────┐
│  creative_concepts  │     │   visual_groups     │
├─────────────────────┤     ├─────────────────────┤
│ id (PK)             │     │ id (PK)             │
│ slug                │     │ code (A-H)          │
│ name                │     │ name                │
│ description         │     │ variations (JSONB)  │
│ prompt_template     │     │ niche               │
│ category            │     │ is_active           │
│ niche               │     └──────────┬──────────┘
│ works_for_niches[]  │                │
│ is_active           │                │
└──────────┬──────────┘                │
           │                           │
           │    ┌──────────────────────┤
           │    │                      │
           ▼    ▼                      ▼
┌─────────────────────┐     ┌─────────────────────┐
│ generation_sessions │     │  niche_templates    │
├─────────────────────┤     ├─────────────────────┤
│ id (PK)             │     │ id (PK)             │
│ user_id (FK)        │     │ niche (unique)      │
│ workspace_id (FK)   │     │ template            │
│ wizard_session_id   │     │ prohibited_words[]  │
│ used_concepts[]     │     │ required_elements[] │
│ used_backgrounds[]  │     │ is_active           │
│ used_models[]       │     └─────────────────────┘
│ generation_mode     │
│ detected_niche      │
│ diversity_score     │
└──────────┬──────────┘
           │
           │ references
           ▼
┌─────────────────────┐
│  creative_library   │ (existing - extended)
├─────────────────────┤
│ id (PK)             │
│ user_id (FK)        │
│ workspace_id (FK)   │
│ image_url           │
│ storage_path        │
│ model_used          │
│ style_used          │
│ prompt_used         │
│ format              │
│ concept_id (NEW)    │
│ visual_group_code   │
│ session_id (NEW)    │
└─────────────────────┘
```

## Tables

### 1. creative_concepts

Stores the 8 universal concepts and 28 financial-specific concepts.

```sql
CREATE TABLE creative_concepts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug VARCHAR(50) NOT NULL UNIQUE,
  name VARCHAR(100) NOT NULL,
  description TEXT,
  prompt_template TEXT NOT NULL,
  icon VARCHAR(20),
  category VARCHAR(50) NOT NULL,
  niche VARCHAR(50) NOT NULL DEFAULT 'generic',
  works_for_niches TEXT[] NOT NULL DEFAULT ARRAY['generic'],
  example_images TEXT[] DEFAULT '{}',
  sort_order INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_creative_concepts_niche ON creative_concepts(niche);
CREATE INDEX idx_creative_concepts_category ON creative_concepts(category);
CREATE INDEX idx_creative_concepts_active ON creative_concepts(is_active) WHERE is_active = TRUE;

-- RLS
ALTER TABLE creative_concepts ENABLE ROW LEVEL SECURITY;

-- Public read access (concepts are shared across all users)
CREATE POLICY "public_read_concepts" ON creative_concepts
  FOR SELECT USING (true);

-- Only admins can modify
CREATE POLICY "admin_manage_concepts" ON creative_concepts
  FOR ALL USING (is_admin(auth.uid()));
```

**Columns**:
| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| slug | VARCHAR(50) | Unique identifier (e.g., 'simulator-ui', 'typography') |
| name | VARCHAR(100) | Display name (e.g., 'Simulador / Calculadora UI') |
| description | TEXT | Full description of the concept |
| prompt_template | TEXT | Base prompt template for this concept |
| icon | VARCHAR(20) | Emoji or icon code for UI |
| category | VARCHAR(50) | Category: 'universal', 'narrativa', 'prova_social', 'produto', 'curiosidade', 'estilo_visual' |
| niche | VARCHAR(50) | Primary niche: 'generic', 'financial', 'jobs' |
| works_for_niches | TEXT[] | Array of compatible niches |
| example_images | TEXT[] | URLs to example images (for carousels per FR-011) |
| sort_order | INTEGER | Display order in UI |
| is_active | BOOLEAN | Whether concept is available for selection |

### 2. visual_groups

Stores the 8 visual groups (A-H) for financial niche with 10 variations each.

```sql
CREATE TABLE visual_groups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code CHAR(1) NOT NULL UNIQUE,
  name VARCHAR(100) NOT NULL,
  description TEXT,
  variations JSONB NOT NULL,
  niche VARCHAR(50) NOT NULL DEFAULT 'financial',
  sort_order INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_visual_groups_niche ON visual_groups(niche);
CREATE INDEX idx_visual_groups_code ON visual_groups(code);

-- RLS
ALTER TABLE visual_groups ENABLE ROW LEVEL SECURITY;

-- Public read access
CREATE POLICY "public_read_visual_groups" ON visual_groups
  FOR SELECT USING (true);

-- Only admins can modify
CREATE POLICY "admin_manage_visual_groups" ON visual_groups
  FOR ALL USING (is_admin(auth.uid()));
```

**Variations JSONB Structure**:
```json
[
  {
    "index": 0,
    "name": "Flat fintech UI clean",
    "prompt": "Clean, flat fintech UI design with modern typography and subtle shadows"
  },
  {
    "index": 1,
    "name": "Dark mode fintech UI",
    "prompt": "Dark mode fintech interface with glowing accents and premium feel"
  }
  // ... 10 total variations
]
```

### 3. niche_templates

Stores master templates for strategic niches (financial, jobs).

```sql
CREATE TABLE niche_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  niche VARCHAR(50) NOT NULL UNIQUE,
  name VARCHAR(100) NOT NULL,
  description TEXT,
  template TEXT NOT NULL,
  prohibited_words TEXT[] NOT NULL DEFAULT '{}',
  required_elements TEXT[] NOT NULL DEFAULT '{}',
  format_requirements JSONB,
  localization_rules JSONB,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS
ALTER TABLE niche_templates ENABLE ROW LEVEL SECURITY;

-- Public read access
CREATE POLICY "public_read_niche_templates" ON niche_templates
  FOR SELECT USING (true);

-- Only admins can modify
CREATE POLICY "admin_manage_niche_templates" ON niche_templates
  FOR ALL USING (is_admin(auth.uid()));
```

**Example Data (Financial)**:
```sql
INSERT INTO niche_templates (niche, name, template, prohibited_words, required_elements, format_requirements) VALUES
(
  'financial',
  'Template Master Financeiro',
  'FORMAT: Square 1:1. Alta legibilidade. Layout publicitário profissional.

TEXT COMPOSITION:
- Title: {title} - EXTRA-LARGE, bold, dominant
- Subtext: {subtext} - smaller, supporting
- Value Buttons: [ {value1} {currency} ] [ {value2} {currency} ] [ {value3} {currency} ]
- CTA: {cta} - LARGE, visible, contrasting

BACKGROUND: {background_style}
VISUAL GROUP: {visual_group}',
  ARRAY['imediato', 'hoje', 'agora', 'instantâneo', 'bani pe loc', 'azi', 'garantido', 'aprovado'],
  ARRAY['título grande', 'botões de valores', 'CTA visível', 'moeda local'],
  '{"format": "1:1", "min_title_size": "extra-large", "min_cta_size": "large"}'::jsonb
);
```

### 4. generation_sessions

Tracks creative generation sessions for diversity scoring and history.

```sql
CREATE TABLE generation_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  workspace_id UUID REFERENCES workspaces(id) ON DELETE SET NULL,
  wizard_session_id VARCHAR(100),

  -- Generation settings
  generation_mode VARCHAR(20) NOT NULL CHECK (generation_mode IN ('preset', 'free')),
  detected_niche VARCHAR(50),
  user_directions TEXT,

  -- Concept selections (for preset mode)
  concept_selections JSONB DEFAULT '[]',

  -- Diversity tracking (rolling window)
  used_concepts TEXT[] DEFAULT '{}',
  used_backgrounds TEXT[] DEFAULT '{}',
  used_models TEXT[] DEFAULT '{}',

  -- Results
  images_generated INTEGER DEFAULT 0,
  images_failed INTEGER DEFAULT 0,
  diversity_score DECIMAL(4,3),

  -- Timestamps
  started_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_generation_sessions_user ON generation_sessions(user_id);
CREATE INDEX idx_generation_sessions_workspace ON generation_sessions(workspace_id);
CREATE INDEX idx_generation_sessions_wizard ON generation_sessions(wizard_session_id);

-- RLS
ALTER TABLE generation_sessions ENABLE ROW LEVEL SECURITY;

-- Users can view their own sessions
CREATE POLICY "users_view_own_sessions" ON generation_sessions
  FOR SELECT USING (user_id = auth.uid());

-- Users can create their own sessions
CREATE POLICY "users_create_own_sessions" ON generation_sessions
  FOR INSERT WITH CHECK (user_id = auth.uid());

-- Users can update their own sessions
CREATE POLICY "users_update_own_sessions" ON generation_sessions
  FOR UPDATE USING (user_id = auth.uid());

-- Workspace members can view workspace sessions
CREATE POLICY "workspace_members_view_sessions" ON generation_sessions
  FOR SELECT USING (
    workspace_id IN (
      SELECT workspace_id FROM workspace_members
      WHERE user_id = auth.uid() AND status = 'active'
    )
  );
```

**concept_selections JSONB Structure**:
```json
[
  { "concept_id": "uuid-here", "concept_slug": "simulator-ui", "quantity": 2 },
  { "concept_id": "uuid-here", "concept_slug": "testimony", "quantity": 2 },
  { "concept_id": "uuid-here", "concept_slug": "before-after", "quantity": 1 }
]
```

### 5. creative_library (Extended)

Extend existing table with new columns for concept tracking.

```sql
-- Add new columns to existing table
ALTER TABLE creative_library
  ADD COLUMN IF NOT EXISTS concept_id UUID REFERENCES creative_concepts(id),
  ADD COLUMN IF NOT EXISTS visual_group_code CHAR(1),
  ADD COLUMN IF NOT EXISTS session_id UUID REFERENCES generation_sessions(id),
  ADD COLUMN IF NOT EXISTS background_style VARCHAR(50),
  ADD COLUMN IF NOT EXISTS diversity_metadata JSONB DEFAULT '{}';

-- Index for concept lookups
CREATE INDEX IF NOT EXISTS idx_creative_library_concept ON creative_library(concept_id);
CREATE INDEX IF NOT EXISTS idx_creative_library_session ON creative_library(session_id);
```

**diversity_metadata JSONB Structure**:
```json
{
  "concept_slug": "simulator-ui",
  "visual_group": "A",
  "background": "gradient-dark",
  "model_rotation_index": 0,
  "diversity_contribution": 0.85
}
```

## Seed Data

### Universal Concepts (8)

```sql
INSERT INTO creative_concepts (slug, name, description, prompt_template, icon, category, niche, works_for_niches, sort_order) VALUES
('simulator-ui', 'Simulador / Calculadora UI', 'Interface de app com sliders, botões, campos', 'Fintech app UI showing a calculator or simulator interface. Clean, modern app design with input fields, sliders, or value selection buttons. The UI IS the creative — it looks like a real app screenshot that invites interaction.', '📱', 'universal', 'generic', ARRAY['generic', 'financial', 'jobs', 'health', 'ecommerce'], 1),
('typography', 'Tipografia Dominante', 'Headline ENORME, sem fotos, fundo sólido', 'Bold, dominant typography design. A massive headline that takes up the entire creative space. No photos, just powerful text on a solid or gradient background. Pattern interrupt style — visually different from everything in the feed.', '🔤', 'universal', 'generic', ARRAY['generic', 'financial', 'jobs', 'health', 'ecommerce'], 2),
('testimonial', 'Depoimento / Prova Social', 'Cards de review estilo app store', 'Testimonial-style card with a quote from a real-looking person. Photo of the person, their quote in large readable text, star rating or trust badge. Clean card UI floating over a subtle background. Feels like a real app review.', '⭐', 'universal', 'generic', ARRAY['generic', 'financial', 'jobs', 'health', 'ecommerce'], 3),
('before-after', 'Antes / Depois', 'Split-screen com contraste claro', 'Split-screen or side-by-side composition showing a dramatic before/after transformation. Left side shows the before state (struggle, problem), right side shows the after state (success, solution). Clear visual contrast.', '↔️', 'universal', 'generic', ARRAY['generic', 'financial', 'jobs', 'health', 'ecommerce'], 4),
('question-hook', 'Hook de Pergunta', 'Pergunta que fala com a dor do público', 'The entire creative is dominated by a single large, provocative question that speaks directly to the viewer pain point. The question is typographically massive — it IS the creative. Minimal supporting elements, maximum text impact.', '❓', 'universal', 'generic', ARRAY['generic', 'financial', 'jobs', 'health', 'ecommerce'], 5),
('comparison', 'Comparação / Versus', 'Tradicional vs Nosso, checkmarks vs X', 'Side-by-side comparison layout: Traditional way vs Our way. Clear visual contrast — one side negative/complicated, the other positive/simple. Checkmarks vs X marks. Simplifies decision for the viewer.', '⚖️', 'universal', 'generic', ARRAY['generic', 'financial', 'jobs', 'health', 'ecommerce'], 6),
('native-ugc', 'Native / UGC-style', 'Parece post orgânico, notificação, chat', 'The ad looks like an organic post or native phone UI. Screenshot of a conversation, phone notification, or social media post style. Radically different from polished UI = real diversity.', '📲', 'universal', 'generic', ARRAY['generic', 'financial', 'jobs', 'health', 'ecommerce'], 7),
('banner-professional', 'Banner / Professional Design', 'Banner de anúncio profissional com CTA', 'Professional advertisement banner design. Clean, polished layout that looks like it was made by a professional designer. Clear CTA button, professional elements, brand-quality design.', '🎨', 'universal', 'generic', ARRAY['generic', 'financial', 'jobs', 'health', 'ecommerce'], 8);
```

### Visual Groups (8) - Financial

```sql
INSERT INTO visual_groups (code, name, description, variations, niche, sort_order) VALUES
('A', 'UI / Fintech', 'Clean fintech app interfaces', '[
  {"index": 0, "name": "Flat fintech UI clean", "prompt": "Clean, flat fintech UI with modern typography"},
  {"index": 1, "name": "Dark mode fintech UI", "prompt": "Dark mode fintech interface with glowing accents"},
  {"index": 2, "name": "White minimal banking UI", "prompt": "White minimal banking UI with subtle shadows"},
  {"index": 3, "name": "Corporate blue banking UI", "prompt": "Corporate blue banking interface, professional"},
  {"index": 4, "name": "Simulator calculator UI", "prompt": "Loan simulator UI with sliders and buttons"},
  {"index": 5, "name": "Smartphone mockup central", "prompt": "Smartphone mockup in center showing app"},
  {"index": 6, "name": "Floating financial cards", "prompt": "Floating credit cards and UI elements"},
  {"index": 7, "name": "Stacked button UI", "prompt": "Vertically stacked value buttons UI"},
  {"index": 8, "name": "Diagonal dynamic layout", "prompt": "Dynamic diagonal layout with UI elements"},
  {"index": 9, "name": "Premium institutional UI", "prompt": "Premium institutional banking UI"}
]'::jsonb, 'financial', 1),
('B', 'Dinheiro Realista', 'Realistic money stacks and bills', '[
  {"index": 0, "name": "Realistic money stacks editorial", "prompt": "Realistic money stacks in editorial lighting, professional photography"},
  {"index": 1, "name": "Symmetric stacked bills", "prompt": "Symmetrically stacked currency bills, clean arrangement"},
  {"index": 2, "name": "Close-up premium money", "prompt": "Close-up shot of premium money, shallow depth of field"},
  {"index": 3, "name": "Blurred money background", "prompt": "Money bills as blurred background, bokeh effect"},
  {"index": 4, "name": "Money on editorial desk", "prompt": "Money arranged on editorial desk setup, professional"},
  {"index": 5, "name": "Money with depth of field", "prompt": "Money with artistic depth of field, selective focus"},
  {"index": 6, "name": "Money in dark studio", "prompt": "Money in dark studio lighting, dramatic shadows"},
  {"index": 7, "name": "Money with magazine lighting", "prompt": "Money with magazine-quality lighting, glossy"},
  {"index": 8, "name": "Money + UI overlay", "prompt": "Realistic money with subtle UI overlay elements"},
  {"index": 9, "name": "Elegant minimalist money", "prompt": "Elegant minimalist composition with money"}
]'::jsonb, 'financial', 2),
('C', 'Dinheiro em Movimento', 'Money in motion and dynamic compositions', '[
  {"index": 0, "name": "Controlled flying money", "prompt": "Controlled flying money, frozen motion, editorial style"},
  {"index": 1, "name": "Money in motion trails", "prompt": "Money with motion blur trails, dynamic energy"},
  {"index": 2, "name": "Editorial money rain", "prompt": "Editorial style money rain, controlled chaos"},
  {"index": 3, "name": "Money orbiting buttons", "prompt": "Money orbiting around UI buttons, dynamic"},
  {"index": 4, "name": "Money in diagonals", "prompt": "Money arranged in diagonal dynamic lines"},
  {"index": 5, "name": "Money silhouettes", "prompt": "Money silhouettes in motion, artistic"},
  {"index": 6, "name": "Money with soft glow", "prompt": "Money in motion with soft glow effects"},
  {"index": 7, "name": "Layered money", "prompt": "Layered money composition, depth and movement"},
  {"index": 8, "name": "Money with visual arrows", "prompt": "Money with visual arrows indicating flow"},
  {"index": 9, "name": "Abstract money flow", "prompt": "Abstract representation of money flow"}
]'::jsonb, 'financial', 3),
('D', 'Malotes / Sacos', 'Money bags in various styles', '[
  {"index": 0, "name": "Premium realistic money bags", "prompt": "Premium realistic money bags, photorealistic"},
  {"index": 1, "name": "Flat cartoon money bags", "prompt": "Flat design cartoon money bags, friendly style"},
  {"index": 2, "name": "Dark editorial money bags", "prompt": "Money bags in dark editorial lighting"},
  {"index": 3, "name": "Stacked money bags", "prompt": "Stacked money bags arrangement, abundance"},
  {"index": 4, "name": "Symmetric money bags", "prompt": "Symmetrically arranged money bags"},
  {"index": 5, "name": "Money bags as background", "prompt": "Money bags as subtle background element"},
  {"index": 6, "name": "Money bags with clean UI", "prompt": "Money bags with clean UI overlay"},
  {"index": 7, "name": "Institutional money bags", "prompt": "Institutional style money bags, corporate"},
  {"index": 8, "name": "Minimalist money bags", "prompt": "Minimalist money bags, simple and clean"},
  {"index": 9, "name": "High-contrast money bags", "prompt": "High-contrast money bags, bold colors"}
]'::jsonb, 'financial', 4),
('E', 'Bancos / Institucional', 'Bank buildings and institutional imagery', '[
  {"index": 0, "name": "Modern glass bank facade", "prompt": "Modern glass bank building facade, corporate"},
  {"index": 1, "name": "Classic columned bank", "prompt": "Classic bank with columns, traditional architecture"},
  {"index": 2, "name": "Urban minimalist bank", "prompt": "Urban minimalist bank building, modern city"},
  {"index": 3, "name": "Flat illustrated bank", "prompt": "Flat illustration of bank building, friendly"},
  {"index": 4, "name": "Premium editorial bank", "prompt": "Bank in premium editorial photography style"},
  {"index": 5, "name": "Bank silhouette", "prompt": "Bank building silhouette, iconic shape"},
  {"index": 6, "name": "Bank with UI overlay", "prompt": "Bank building with fintech UI overlay"},
  {"index": 7, "name": "Clean institutional bank", "prompt": "Clean institutional bank imagery, professional"},
  {"index": 8, "name": "Illustrated bank entrance", "prompt": "Illustrated bank entrance, welcoming"},
  {"index": 9, "name": "Abstract corporate bank", "prompt": "Abstract representation of corporate banking"}
]'::jsonb, 'financial', 5),
('F', 'Pessoas Reais', 'Real people with financial context', '[
  {"index": 0, "name": "Real person + UI", "prompt": "Real person with fintech UI overlay, natural"},
  {"index": 1, "name": "Real woman + UI", "prompt": "Real woman using financial app, authentic"},
  {"index": 2, "name": "Real man + UI", "prompt": "Real man interacting with banking UI"},
  {"index": 3, "name": "Real couple", "prompt": "Real couple discussing finances, relatable"},
  {"index": 4, "name": "Person using smartphone", "prompt": "Person using smartphone for banking"},
  {"index": 5, "name": "Person in neutral setting", "prompt": "Person in neutral setting, approachable"},
  {"index": 6, "name": "Premium editorial person", "prompt": "Person in premium editorial style photography"},
  {"index": 7, "name": "Institutional person", "prompt": "Person in institutional/corporate context"},
  {"index": 8, "name": "Person guiding to buttons", "prompt": "Person gesture guiding eye to UI buttons"},
  {"index": 9, "name": "Person with discreet money", "prompt": "Person with money subtly in frame"}
]'::jsonb, 'financial', 6),
('G', 'Cartoon / Ilustração', 'Cartoon and illustration styles', '[
  {"index": 0, "name": "Flat fintech cartoon", "prompt": "Flat design fintech cartoon illustration"},
  {"index": 1, "name": "Cartoon money icons", "prompt": "Cartoon money icons and symbols, playful"},
  {"index": 2, "name": "Cartoon UI cards", "prompt": "Cartoon style UI cards and elements"},
  {"index": 3, "name": "Cartoon flying money", "prompt": "Cartoon money flying, fun and dynamic"},
  {"index": 4, "name": "Cartoon money bags", "prompt": "Cartoon money bags, friendly illustration"},
  {"index": 5, "name": "Cartoon bank", "prompt": "Cartoon bank building, approachable"},
  {"index": 6, "name": "Simple cartoon character", "prompt": "Simple cartoon character with money theme"},
  {"index": 7, "name": "Minimalist cartoon", "prompt": "Minimalist cartoon financial illustration"},
  {"index": 8, "name": "Premium editorial cartoon", "prompt": "Premium editorial quality cartoon"},
  {"index": 9, "name": "Hybrid real + cartoon", "prompt": "Hybrid real photo with cartoon elements"}
]'::jsonb, 'financial', 7),
('H', 'Ultra Premium / Editorial', 'Ultra premium editorial aesthetics', '[
  {"index": 0, "name": "Dark luxury editorial", "prompt": "Dark luxury editorial, black background, gold accents"},
  {"index": 1, "name": "White minimal editorial", "prompt": "White minimal editorial, generous whitespace"},
  {"index": 2, "name": "Stone & glass editorial", "prompt": "Stone and glass textures, luxury materials"},
  {"index": 3, "name": "Financial magazine editorial", "prompt": "Financial magazine editorial style"},
  {"index": 4, "name": "Green private banking", "prompt": "Green private banking aesthetic, exclusive"},
  {"index": 5, "name": "Beige luxury editorial", "prompt": "Beige luxury editorial, warm premium feel"},
  {"index": 6, "name": "Corporate blue editorial", "prompt": "Corporate blue editorial, professional trust"},
  {"index": 7, "name": "Black & red editorial", "prompt": "Black and red editorial, bold and premium"},
  {"index": 8, "name": "Paper / print editorial", "prompt": "Paper and print editorial textures"},
  {"index": 9, "name": "Modern prestige editorial", "prompt": "Modern prestige editorial, contemporary luxury"}
]'::jsonb, 'financial', 8);
```

### Financial Niche Template

```sql
INSERT INTO niche_templates (niche, name, template, prohibited_words, required_elements, format_requirements, localization_rules) VALUES
('financial', 'Andromeda Compliant Financial Template',
'FORMAT: Square 1:1. High legibility. Professional advertising layout.

TITLE (EXTRA-LARGE, bold, dominant):
Variation of: "Precisa de dinheiro?", "De quanto você precisa?", "Um empréstimo te ajudaria?", "Quanto você quer solicitar?", "Pensando em um empréstimo?"

SUBTEXT (smaller, supporting):
Variation of: "Escolha o valor que faz sentido para você", "Selecione o valor desejado", "Comece escolhendo o montante"

VALUE BUTTONS (LARGE, high contrast):
[ {value1} {currency} ] [ {value2} {currency} ] [ {value3} {currency} ]

CTA (LARGE, visible, contrasting):
Variation of: "Quero simular", "Simule agora", "Começar simulação", "Iniciar simulação"

MANDATORY RULES:
- Title MUST be extra-large and dominant
- Value buttons MUST include currency symbol
- CTA MUST be large and visible
- NEVER repeat layout between consecutive prompts',
ARRAY['imediato', 'hoje', 'agora', 'instantâneo', 'bani pe loc', 'azi', 'garantido', 'aprovado', 'liberação', 'aprovação'],
ARRAY['título extra-grande', 'botões de valores com moeda', 'CTA grande e visível', 'layout profissional'],
'{"format": "1:1", "title_size": "extra-large", "cta_size": "large", "button_style": "high-contrast"}'::jsonb,
'{"BR": {"currency": "R$", "values": ["5K", "10K", "20K"]}, "PT": {"currency": "€", "values": ["5K", "10K", "20K"]}, "US": {"currency": "$", "values": ["5K", "10K", "20K"]}}'::jsonb
);
```

## Migration Files

### Migration 1: Create Tables

File: `supabase/migrations/20260203_creative_diversity_tables.sql`

### Migration 2: Seed Data

File: `supabase/migrations/20260203_creative_diversity_seed.sql`

### Migration 3: Extend creative_library

File: `supabase/migrations/20260203_extend_creative_library.sql`

## Indexes Summary

| Table | Index | Columns | Purpose |
|-------|-------|---------|---------|
| creative_concepts | idx_creative_concepts_niche | niche | Filter by niche |
| creative_concepts | idx_creative_concepts_category | category | Filter by category |
| creative_concepts | idx_creative_concepts_active | is_active | Active concepts only |
| visual_groups | idx_visual_groups_niche | niche | Filter by niche |
| visual_groups | idx_visual_groups_code | code | Lookup by code |
| generation_sessions | idx_generation_sessions_user | user_id | User's sessions |
| generation_sessions | idx_generation_sessions_workspace | workspace_id | Workspace sessions |
| creative_library | idx_creative_library_concept | concept_id | Filter by concept |
| creative_library | idx_creative_library_session | session_id | Group by session |

## RLS Summary

| Table | Policy | Access |
|-------|--------|--------|
| creative_concepts | public_read_concepts | All users can read |
| creative_concepts | admin_manage_concepts | Only admins can modify |
| visual_groups | public_read_visual_groups | All users can read |
| visual_groups | admin_manage_visual_groups | Only admins can modify |
| niche_templates | public_read_niche_templates | All users can read |
| niche_templates | admin_manage_niche_templates | Only admins can modify |
| generation_sessions | users_view_own_sessions | Users own data |
| generation_sessions | workspace_members_view_sessions | Workspace members |
