# Implementation Plan: Brand Identity Settings (Color Palette & Typography)

**Branch**: `012-brand-identity` | **Date**: 2025-11-30 | **Spec**: [spec.md](spec.md)
**Input**: Feature specification from `/specs/012-brand-identity/spec.md`

## Summary

Add Brand Identity settings (color palette up to 6 colors with priority ordering and typography with 3 font tiers) to the existing Project Settings page. Colors can be added manually via HEX input/color picker or extracted automatically from uploaded images using K-means clustering. All brand identity data is persisted in the existing `Project.settings` JSONB column and integrated into AI context for image generation consistency.

## Technical Context

**Language/Version**: Python 3.11 (Backend), TypeScript 5.x (Frontend)
**Primary Dependencies**: FastAPI, SQLAlchemy, Next.js 14, React 18, Shadcn/UI, Pillow (image processing), scikit-learn (K-means clustering)
**Storage**: Supabase PostgreSQL (extends existing Project.settings JSONB column)
**Testing**: pytest (backend), Jest/React Testing Library (frontend)
**Target Platform**: Web application (responsive)
**Project Type**: Web application (frontend + backend)
**Performance Goals**: Color extraction < 5 seconds for images up to 5MB
**Constraints**: Max 6 colors in palette, 3 font tiers, images up to 5MB
**Scale/Scope**: Extension to existing Project Settings - single section addition

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Status | Notes |
|-----------|--------|-------|
| I. AI-First Development | ✅ PASS | Brand identity feeds into AI context for image generation |
| II. API-First Architecture | ✅ PASS | Extends existing `/projects/{id}/settings` API |
| III. User Experience Excellence | ✅ PASS | Color picker, drag-and-drop reorder, visual swatches follow premium design |
| IV. Production-Ready Deployments | ✅ PASS | Uses existing Docker setup, no new services |
| V. Data Integrity & Security | ✅ PASS | File uploads validated for type/size, HEX validation |
| VI. Scalability & Performance | ✅ PASS | Image processing async, color extraction optimized |
| VII. Testing & Quality Assurance | ✅ PASS | API endpoints tested, TypeScript types enforced |

## Project Structure

### Documentation (this feature)

```text
specs/012-brand-identity/
├── plan.md              # This file
├── research.md          # Color extraction algorithm research
├── data-model.md        # Brand identity schema extension
├── quickstart.md        # Quick implementation guide
├── contracts/           # API contracts
│   └── brand-identity-api.json
└── tasks.md             # Implementation tasks (/speckit.tasks output)
```

### Source Code (repository root)

```text
backend/
├── routers/
│   └── projects.py           # Extended with brand identity endpoints
├── services/
│   └── color_extraction.py   # NEW: K-means color extraction service
├── schemas.py                # Extended with brand identity schemas
└── requirements.txt          # Add Pillow, scikit-learn

frontend/
├── src/
│   ├── components/
│   │   └── project/
│   │       ├── ProjectSettingsForm.tsx    # Extended with Brand Identity section
│   │       └── brand-identity/            # NEW: Brand identity components
│   │           ├── ColorPalette.tsx       # Color swatch display/edit
│   │           ├── ColorPicker.tsx        # HEX input + visual picker
│   │           ├── ColorExtractor.tsx     # Image upload + extraction UI
│   │           └── TypographySettings.tsx # Font selection component
│   └── lib/
│       └── api.ts             # Extended with brand identity API calls
```

**Structure Decision**: Web application structure (Option 2). This feature extends existing components and services without introducing new top-level directories. Backend uses service pattern for color extraction logic; frontend adds new component subdirectory under existing project settings.

## Complexity Tracking

> No constitution violations - feature follows established patterns.

| Decision | Rationale |
|----------|-----------|
| Use existing JSONB column | Avoids new migrations, brand identity is project-specific metadata |
| K-means for color extraction | Industry standard, well-supported in scikit-learn |
| Pillow for image processing | Already common in Python ecosystem, efficient |
| Frontend color picker | Radix/Shadcn color picker for consistency with design system |

## Phase 0: Research Artifacts

See [research.md](research.md) for:
- Color extraction algorithm comparison (K-means vs. median cut)
- Font list curation methodology
- Similar feature implementations in design tools

## Phase 1: Design Artifacts

See:
- [data-model.md](data-model.md) - Schema design for brand identity in Project.settings
- [contracts/brand-identity-api.json](contracts/brand-identity-api.json) - API endpoint contracts
- [quickstart.md](quickstart.md) - Implementation quick start guide

## Implementation Approach

### Backend Changes

1. **Extend `ProjectSettingsUpdate` schema** to include `brand_identity` object:
   - `color_palette`: Array of HEX strings (ordered by priority)
   - `typography`: Object with `primary`, `secondary`, `tertiary` font names

2. **Create `color_extraction.py` service**:
   - Accept image upload (multipart/form-data)
   - Resize large images for performance
   - Apply K-means clustering (k=6)
   - Return dominant colors sorted by prevalence

3. **Extend `format_project_context()`** in `projects.py`:
   - Include color palette in AI prompt context
   - Include typography preferences in AI prompt context

4. **Add new endpoint** `POST /projects/{id}/extract-colors`:
   - Accept image upload
   - Return extracted colors as suggestions

### Frontend Changes

1. **Add Brand Identity section** to `ProjectSettingsForm.tsx`:
   - Position between "Basic Information" and "Advanced Settings"
   - Collapsible like other sections

2. **Create `ColorPalette.tsx`**:
   - Display color swatches in order
   - Drag-and-drop reordering (use `@dnd-kit/sortable`)
   - Click to edit HEX
   - Delete button on hover

3. **Create `ColorPicker.tsx`**:
   - HEX input with validation
   - Visual color picker (use `react-colorful` or similar)
   - Preview swatch

4. **Create `ColorExtractor.tsx`**:
   - Image upload dropzone
   - Show extracted color suggestions
   - "Add" / "Add All" buttons

5. **Create `TypographySettings.tsx`**:
   - Three dropdowns (Primary, Secondary, Tertiary)
   - Popular fonts list + custom input option
   - Font name preview with styled text

### Integration

1. **AI Context**: Update chat/image generation to include brand colors and fonts from project settings
2. **Validation**: Ensure HEX format (#RGB or #RRGGBB), max 6 colors, max 3 fonts
3. **Persistence**: All data saved via existing `updateProjectSettings` API
