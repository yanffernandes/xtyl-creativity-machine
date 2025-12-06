# Tasks: Brand Identity Settings (Color Palette & Typography)

**Input**: Design documents from `/specs/012-brand-identity/`
**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/
**Status**: ✅ COMPLETED

**Tests**: Not explicitly requested - test tasks excluded.

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- Include exact file paths in descriptions

## Path Conventions

- **Web app**: `backend/` for Python/FastAPI, `frontend/src/` for Next.js/React
- Based on plan.md structure

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Install dependencies and create directory structure

- [x] T001 [P] Install backend dependencies (Pillow, scikit-learn) in backend/requirements.txt
- [x] T002 [P] Install frontend dependencies (react-colorful, @dnd-kit/core, @dnd-kit/sortable) in frontend/package.json
- [x] T003 Create frontend component directory at frontend/src/components/project/brand-identity/

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core schemas and types that ALL user stories depend on

**CRITICAL**: No user story work can begin until this phase is complete

- [x] T004 Add BrandTypography schema in backend/schemas.py
- [x] T005 Add BrandIdentity schema with HEX validator in backend/schemas.py
- [x] T006 Add ColorExtractionResult schema in backend/schemas.py
- [x] T007 Extend ProjectSettingsUpdate schema with brand_identity field in backend/schemas.py
- [x] T008 [P] Add BrandTypography TypeScript interface in frontend/src/lib/api.ts
- [x] T009 [P] Add BrandIdentity TypeScript interface in frontend/src/lib/api.ts
- [x] T010 [P] Add ColorExtractionResult TypeScript interface in frontend/src/lib/api.ts
- [x] T011 Update ProjectSettings TypeScript interface with brand_identity field in frontend/src/lib/api.ts

**Checkpoint**: Foundation ready - user story implementation can now begin

---

## Phase 3: User Story 1 - Define Color Palette Manually (Priority: P1) MVP

**Goal**: Users can manually add up to 6 HEX colors to their project's brand palette with visual color picker

**Independent Test**: Create project, access settings, add 3 colors via HEX input and color picker, verify they appear as visual swatches and persist after reload

### Implementation for User Story 1

- [x] T012 [P] [US1] Create ColorSwatch component for displaying a single color in frontend/src/components/project/brand-identity/ColorSwatch.tsx
- [x] T013 [P] [US1] Create ColorPicker component with HEX input and react-colorful picker in frontend/src/components/project/brand-identity/ColorPicker.tsx
- [x] T014 [US1] Create ColorPalette component with drag-and-drop reordering using @dnd-kit in frontend/src/components/project/brand-identity/ColorPalette.tsx
- [x] T015 [US1] Add brand identity state management (colorPalette, typography) to ProjectSettingsForm.tsx
- [x] T016 [US1] Add Brand Identity section UI between Basic Info and Advanced Settings in frontend/src/components/project/ProjectSettingsForm.tsx
- [x] T017 [US1] Integrate ColorPalette component into Brand Identity section in frontend/src/components/project/ProjectSettingsForm.tsx
- [x] T018 [US1] Add HEX validation with error feedback in ColorPicker component
- [x] T019 [US1] Add "max 6 colors" limit enforcement with disabled button and tooltip in ColorPalette.tsx
- [x] T020 [US1] Update handleSave function to include brand_identity in settings payload in ProjectSettingsForm.tsx
- [x] T021 [US1] Update loadSettings function to load brand_identity from API response in ProjectSettingsForm.tsx

**Checkpoint**: User Story 1 complete - users can add, edit, reorder, and remove colors manually

---

## Phase 4: User Story 2 - Extract Colors from Image Upload (Priority: P1)

**Goal**: Users can upload an image and extract dominant colors automatically using K-means clustering

**Independent Test**: Upload a logo PNG with known colors, verify 6 dominant colors are extracted and displayed as suggestions

### Implementation for User Story 2

- [x] T022 [US2] Create color_extraction.py service with K-means algorithm in backend/services/color_extraction.py
- [x] T023 [US2] Implement extract_colors function with image resize and clustering in backend/services/color_extraction.py
- [x] T024 [US2] Add POST /projects/{project_id}/extract-colors endpoint in backend/routers/projects.py
- [x] T025 [US2] Add file type validation (PNG, JPG, WEBP) and size limit (5MB) in extract-colors endpoint
- [x] T026 [US2] Add edge case handling for monochrome/invalid images returning message in extract-colors endpoint
- [x] T027 [P] [US2] Add extractColors API function in frontend/src/lib/api.ts
- [x] T028 [US2] Create ColorExtractor component with image upload dropzone in frontend/src/components/project/brand-identity/ColorExtractor.tsx
- [x] T029 [US2] Add loading state and extracted colors preview grid in ColorExtractor.tsx
- [x] T030 [US2] Add "Add" button per color and "Add All" button in ColorExtractor.tsx
- [x] T031 [US2] Integrate ColorExtractor component below ColorPalette in Brand Identity section
- [x] T032 [US2] Add error handling for failed extraction with retry option in ColorExtractor.tsx

**Checkpoint**: User Story 2 complete - users can extract colors from uploaded images

---

## Phase 5: User Story 3 - Define Typography (Priority: P2)

**Goal**: Users can configure 3 font tiers (primary, secondary, tertiary) from a list of 15 popular fonts or custom input

**Independent Test**: Select "Inter" as primary, "Open Sans" as secondary, save, reload, verify fonts are displayed correctly

### Implementation for User Story 3

- [x] T033 [US3] Create POPULAR_FONTS constant array with 15 fonts in frontend/src/components/project/brand-identity/TypographySettings.tsx
- [x] T034 [US3] Create FontSelector sub-component with Combobox (dropdown + custom input) in TypographySettings.tsx
- [x] T035 [US3] Create TypographySettings component with 3 FontSelectors (Primary, Secondary, Tertiary) in frontend/src/components/project/brand-identity/TypographySettings.tsx
- [x] T036 [US3] Add visual hierarchy indicators (labels: "Headlines", "Body Text", "Accents") in TypographySettings.tsx
- [x] T037 [US3] Integrate TypographySettings below color section in Brand Identity in ProjectSettingsForm.tsx
- [x] T038 [US3] Connect typography state to brand_identity.typography in form submission

**Checkpoint**: User Story 3 complete - users can configure brand typography

---

## Phase 6: User Story 4 - Brand Identity in AI Context (Priority: P2)

**Goal**: Brand colors and fonts are automatically included in AI prompts for image generation consistency

**Independent Test**: Configure palette and fonts, generate image via chat, verify colors and fonts appear in AI context/logs

### Implementation for User Story 4

- [x] T039 [US4] Extend format_project_context() to include brand colors in backend/routers/projects.py
- [x] T040 [US4] Extend format_project_context() to include brand fonts in backend/routers/projects.py
- [x] T041 [US4] Ensure graceful degradation when brand_identity is null or empty in format_project_context()
- [x] T042 [US4] Update get_missing_fields() to suggest brand identity if not configured in backend/routers/projects.py

**Checkpoint**: User Story 4 complete - brand identity flows to AI context

---

## Phase 7: User Story 5 - Extract Colors from Existing Assets (Priority: P3)

**Goal**: Users can extract colors from visual assets already in their project library without re-uploading

**Independent Test**: Have assets in project, click "Extract from Assets", select asset, verify colors extracted

### Implementation for User Story 5

- [x] T043 [US5] Add POST /projects/{project_id}/extract-colors-from-asset endpoint in backend/routers/projects.py
- [x] T044 [US5] Implement asset lookup and file download for color extraction in extract-colors-from-asset endpoint
- [x] T045 [P] [US5] Add extractColorsFromAsset API function in frontend/src/lib/api.ts
- [x] T046 [US5] Create AssetColorExtractor component with asset gallery modal in frontend/src/components/project/brand-identity/AssetColorExtractor.tsx
- [x] T047 [US5] Add "Extract from Existing Assets" button in ColorExtractor that opens AssetColorExtractor
- [x] T048 [US5] Handle empty assets state with helpful message in AssetColorExtractor.tsx

**Checkpoint**: User Story 5 complete - all user stories implemented

---

## Phase 8: Polish & Cross-Cutting Concerns

**Purpose**: UI refinements, edge cases, and accessibility

- [x] T049 [P] Add loading skeleton for Brand Identity section during settings load
- [x] T050 [P] Add duplicate color warning when user adds same HEX twice
- [x] T051 [P] Ensure color contrast meets WCAG AA for HEX text on color swatches
- [x] T052 [P] Add keyboard navigation for color reordering (accessibility)
- [x] T053 [P] Add responsive design adjustments for mobile view of color palette
- [x] T054 Verify all acceptance scenarios from spec.md manually
- [x] T055 Run quickstart.md validation checklist

---

## Summary

**Total Tasks**: 55
**Completed Tasks**: 55 ✅

| Phase | Tasks | Status |
|-------|-------|--------|
| Setup | 3 | ✅ Complete |
| Foundational | 8 | ✅ Complete |
| US1 - Manual Colors | 10 | ✅ Complete |
| US2 - Color Extraction | 11 | ✅ Complete |
| US3 - Typography | 6 | ✅ Complete |
| US4 - AI Context | 4 | ✅ Complete |
| US5 - Asset Extraction | 6 | ✅ Complete |
| Polish | 7 | ✅ Complete |

**Completion Date**: 2025-12-06

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies - can start immediately
- **Foundational (Phase 2)**: Depends on Setup (T001-T003 complete)
- **User Stories (Phases 3-7)**: All depend on Foundational phase completion
- **Polish (Phase 8)**: Depends on all user stories complete

### User Story Dependencies

- **User Story 1 (P1)**: Can start after Foundational (Phase 2) - No dependencies on other stories
- **User Story 2 (P1)**: Can start after Foundational (Phase 2) - No dependencies on US1 (separate components)
- **User Story 3 (P2)**: Can start after Foundational (Phase 2) - No dependencies on US1/US2
- **User Story 4 (P2)**: Can start after Foundational (Phase 2) - Backend only, no frontend dependencies
- **User Story 5 (P3)**: Depends on US2 completion (reuses ColorExtractor patterns)

### Within Each User Story

- Components with [P] marker can run in parallel
- Services before endpoints
- Backend before frontend integration
- Core implementation before edge cases

### Parallel Opportunities

- T001, T002, T003 can all run in parallel (different files)
- T008, T009, T010 can run in parallel (TypeScript interfaces)
- T012, T013 can run in parallel (independent components)
- T022-T026 (backend) can run in parallel with T027 (frontend API types)
- All User Stories can theoretically run in parallel after Phase 2 (except US5 depends on US2)

---

## Parallel Example: Phase 2 (Foundational)

```bash
# Launch all TypeScript interfaces in parallel:
Task: T008 "Add BrandTypography TypeScript interface"
Task: T009 "Add BrandIdentity TypeScript interface"
Task: T010 "Add ColorExtractionResult TypeScript interface"
```

## Parallel Example: User Story 1

```bash
# Launch independent components in parallel:
Task: T012 "Create ColorSwatch component"
Task: T013 "Create ColorPicker component"
```

---

## Implementation Strategy

### MVP First (User Stories 1 + 2)

1. Complete Phase 1: Setup
2. Complete Phase 2: Foundational (CRITICAL - blocks all stories)
3. Complete Phase 3: User Story 1 (Manual color palette)
4. **STOP and VALIDATE**: Test US1 independently
5. Complete Phase 4: User Story 2 (Color extraction from upload)
6. **STOP and VALIDATE**: Test US2 independently
7. Deploy/demo MVP with color palette functionality

### Incremental Delivery

1. Setup + Foundational → Foundation ready
2. User Story 1 → Test independently → **Deliverable: Manual color palette**
3. User Story 2 → Test independently → **Deliverable: + Color extraction**
4. User Story 3 → Test independently → **Deliverable: + Typography settings**
5. User Story 4 → Test independently → **Deliverable: + AI integration**
6. User Story 5 → Test independently → **Deliverable: + Asset extraction**
7. Polish phase → Final refinements

### Suggested MVP Scope

**Minimum Viable Product**: User Stories 1 + 2 + 4

- US1: Manual color palette (core functionality)
- US2: Color extraction from images (key differentiator)
- US4: AI context integration (delivers actual value)

Typography (US3) and asset extraction (US5) can be added in subsequent releases.

---

## Notes

- [P] tasks = different files, no dependencies
- [Story] label maps task to specific user story for traceability
- Each user story should be independently completable and testable
- Commit after each task or logical group
- Stop at any checkpoint to validate story independently
- No database migrations needed - uses existing JSONB column
