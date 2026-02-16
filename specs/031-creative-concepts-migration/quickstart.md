# Quickstart: Creative Concepts Migration

**Feature**: 031-creative-concepts-migration
**Date**: 2026-02-07

## Overview

This migration replaces `style_presets` with `creative_concepts` across the entire stack. It's a rename + simplification that removes type categories, deletes visual style presets, and adds template variable support.

## Prerequisites

- Access to Supabase database (for running migration)
- Backend and frontend dev servers running (`./dev.sh start`)

## Migration Order

Execute changes in this order to avoid broken references:

### Step 1: Database Migration

Run the SQL migration to rename the table, update columns, and seed data.

```bash
# Apply migration to Supabase
supabase db push
# Or run manually against the database
psql $DATABASE_URL -f supabase/migrations/031_creative_concepts_migration.sql
```

### Step 2: Backend Changes

Update in this order:

1. **models.py** - Rename `StylePreset` class to `CreativeConcept`, update `__tablename__`
2. **schemas.py** - Rename schemas, add new fields, update `ImageBatchRequest` and `BootstrapData`
3. **routers/image_generation.py** - Rename endpoint, update query logic
4. **routers/projects.py** - Update bootstrap response field name
5. **scripts/generate_preset_thumbnails.py** - Update SQL references

### Step 3: Frontend Changes

Update in this order:

1. **types/image-studio.ts** - Rename types, remove `PresetType`, add new fields
2. **types/supabase.ts** - Update StylePreset type
3. **components/image-studio/StylePresetCard.tsx** → Rename to `ConceptCard.tsx`
4. **components/image-studio/StylePresetGrid.tsx** → Rename to `ConceptGrid.tsx`
5. **components/image-studio/index.ts** - Update exports
6. **components/image-studio/CreateMode.tsx** - Update imports, remove dual grid, single concept grid
7. **hooks/useImageStudio.ts** - Replace visualStyle/layout state with single concept state
8. **studio/page.tsx** - Update bootstrap data consumption

## Key Changes Summary

| Before | After |
|--------|-------|
| Table: `style_presets` | Table: `creative_concepts` |
| Model: `StylePreset` | Model: `CreativeConcept` |
| Endpoint: `GET /image-generation/style-presets` | Endpoint: `GET /image-generation/creative-concepts` |
| Response: `{ visual_styles: [], layouts: [], total }` | Response: `{ concepts: [], total }` |
| Request fields: `visual_style`, `layout`, `style_preset` | Request field: `creative_concept` |
| Bootstrap: `style_presets: []` | Bootstrap: `creative_concepts: []` |
| Components: `StylePresetCard`, `StylePresetGrid` | Components: `ConceptCard`, `ConceptGrid` |
| Hook state: `visualStyleSlug`, `layoutSlug` | Hook state: `conceptSlug` |
| UI: Two grids (Estilo Visual + Diagramacao) | UI: One grid (Conceitos Criativos) |

## Verification Checklist

After applying all changes:

- [ ] Database migration runs without errors
- [ ] `GET /image-generation/creative-concepts` returns all active concepts as flat list
- [ ] `POST /image-generation/batch` accepts `creative_concept` slug
- [ ] Bootstrap endpoint returns `creative_concepts` instead of `style_presets`
- [ ] Frontend shows single concept grid (no visual_style/layout split)
- [ ] Selecting a concept and generating an image works correctly
- [ ] Concept text is prepended to user prompt in generation
- [ ] No references to `style_presets` remain in running code
- [ ] Existing documents with historical metadata still display correctly
