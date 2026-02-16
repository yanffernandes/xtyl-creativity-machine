# Feature Specification: Creative Concepts Migration

**Feature Branch**: `031-creative-concepts-migration`
**Created**: 2026-02-07
**Status**: Draft
**Input**: Migrate from `style_presets` to `creative_concepts` - a unified table of compositional/narrative prompt templates inspired by the Alvo Bot reference project, removing visual style presets and simplifying the data model.

## Clarifications

### Session 2026-02-07

- Q: How should the concept's text be combined with the user's prompt? → A: **Prepend** - concept text comes first, providing compositional framing, followed by the user's prompt.
- Q: How should the old `/image-generation/style-presets` endpoint be handled? → A: **Clean break** - remove old endpoint entirely, replace with new `/image-generation/creative-concepts`. All code updated together (internal API only).
- Q: Can users select multiple concepts per generation? → A: **Single selection** - at most one concept per generation (or none). Hybrid approaches are described in the prompt text.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Select a Creative Concept for Image Generation (Priority: P1)

A user is generating an image in the Visual Studio. Instead of choosing between separate "visual style" and "layout" categories, they see a single list of **creative concepts** - compositional approaches like "Testimonial Quote", "Before & After", "Product Showcase", etc. They select one, write their prompt describing what they want, and the concept's template enriches their prompt with compositional direction before sending it to the image generation model.

**Why this priority**: This is the core user-facing change. Without this, the migration has no value. Users must be able to browse and select creative concepts seamlessly.

**Independent Test**: Can be fully tested by opening the image studio, selecting a creative concept, entering a prompt, and generating an image. The generated image should reflect the concept's compositional direction.

**Acceptance Scenarios**:

1. **Given** a user is in the image studio, **When** they open the concept selector, **Then** they see a single flat list of creative concepts (no visual_style/layout split).
2. **Given** a user selects the "Testimonial Quote" concept, **When** they enter "Student satisfied with the engineering program" and generate, **Then** the final prompt sent to the model includes the concept's compositional template merged with the user's text.
3. **Given** a user does not select any concept, **When** they generate an image, **Then** only their raw prompt is used (no concept template injected).

---

### User Story 2 - Describe Visual Style Directly in the Prompt (Priority: P1)

A user wants a "watercolor" or "cinematic" look for their image. Instead of picking from a predefined list of visual style presets, they simply type the desired style as part of their prompt (e.g., "A watercolor illustration of students studying in a library"). The system no longer offers visual style presets as a separate selection.

**Why this priority**: Equally critical as Story 1 - removing the old visual style presets is a core part of the simplification. Users must understand that style direction is now part of their prompt text.

**Independent Test**: Can be tested by verifying that no visual style preset selector appears in the UI, and that including style keywords in the prompt produces the expected visual output.

**Acceptance Scenarios**:

1. **Given** a user is in the image studio, **When** the concept selector loads, **Then** no "visual style" category or presets (photographic, watercolor, cinematic, etc.) are displayed.
2. **Given** a user types "A cinematic photo of a university campus at sunset", **When** they generate without selecting any concept, **Then** the image reflects the cinematic style from their prompt text.

---

### User Story 3 - Concepts with Dynamic Template Variables (Priority: P2)

Some creative concepts include template variables (e.g., `{{keyword}}`, `{{title}}`) that are automatically filled from project or document context. When a user selects such a concept, the system resolves the variables before composing the final prompt.

**Why this priority**: Adds intelligence to concepts but is not required for basic functionality. The system works without template variables (using static prompt_modifier as fallback).

**Independent Test**: Can be tested by selecting a concept that has a `prompt_template` with variables, generating an image within a project that has a title/keyword, and verifying the variables were resolved in the final prompt.

**Acceptance Scenarios**:

1. **Given** a concept has `prompt_template = "A testimonial card showing a student talking about {{client_name}}"` and `template_variables = ["client_name"]`, **When** the user generates an image in a project with `client_name` set to "Universidade XPTO", **Then** the resolved prompt includes "A testimonial card showing a student talking about Universidade XPTO".
2. **Given** a concept has a `prompt_template` but a required variable is not available in context, **When** the user generates an image, **Then** the system falls back to the concept's static `prompt_modifier` instead.
3. **Given** a concept has no `prompt_template` (null), **When** the user selects it, **Then** the system uses the `prompt_modifier` field as it does today.

---

### User Story 4 - Backward Compatibility During Transition (Priority: P2)

Existing images in the system that were generated with old `style_preset` references continue to display correctly. The migration does not break any existing documents or generation history.

**Why this priority**: Data integrity is critical. Users must not lose context about how their existing images were generated.

**Independent Test**: Can be tested by querying documents that have `generation_metadata` referencing old style preset slugs, and verifying they still display with their historical metadata intact.

**Acceptance Scenarios**:

1. **Given** a document was generated with `style_preset: "photographic"` (now removed), **When** the user views that document's details, **Then** the historical metadata is preserved and displayed as-is.
2. **Given** the old API endpoint `/image-generation/style-presets` no longer exists, **When** the frontend loads, **Then** it calls the new `/image-generation/creative-concepts` endpoint without errors (clean break, no legacy endpoint needed).

---

### Edge Cases

- What happens when a concept's `prompt_template` references a variable that doesn't exist in the current context? System falls back to `prompt_modifier`.
- What happens when all concepts are deactivated (`is_active = false`)? The concept selector shows an empty state and generation works without any concept enrichment.
- What happens when a concept's `prompt_modifier` is empty? The concept is effectively a no-op and only the user's prompt is used.
- What happens to the `generate_preset_thumbnails.py` script? It must be updated to reference the new table name.
- What happens to the bootstrap endpoint that returns `style_presets`? It must return `creative_concepts` in the same bootstrap payload.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST rename the `style_presets` table to `creative_concepts` in the database.
- **FR-002**: System MUST remove the 8 visual style presets (photographic, watercolor, 3d-render, illustration, minimalist, vibrant, vintage, cinematic) from the database.
- **FR-003**: System MUST retain the 12 layout presets as creative concepts, updating their data as needed.
- **FR-004**: System MUST add new creative concept presets inspired by the Alvo Bot system (e.g., question-hook, before-after, social-proof, simulator-ui, lifestyle-aspiration, comparison) while avoiding duplicates with existing layout presets.
- **FR-005**: System MUST remove the `preset_type` and `category` columns from the table, as all entries are now concepts and the platform primarily serves education.
- **FR-006**: System MUST add a `prompt_template` column (text, nullable) to support templates with `{{variable}}` syntax.
- **FR-007**: System MUST add a `template_variables` column (JSON, nullable) to declare which variables a concept's template accepts.
- **FR-008**: System MUST resolve template variables from project/document context when composing the final prompt for image generation.
- **FR-009**: System MUST fall back to the static `prompt_modifier` when `prompt_template` is null or when required variables cannot be resolved.
- **FR-015**: System MUST compose the final prompt by **prepending** the concept's text (resolved template or modifier) before the user's prompt, so the concept provides compositional framing and the user's text provides specific content.
- **FR-010**: System MUST update the backend model, schema, and all router endpoints from `StylePreset`/`style-presets` to `CreativeConcept`/`creative-concepts`.
- **FR-011**: System MUST update the frontend types, components, hooks, and API calls from `StylePreset`/`style-presets` to `CreativeConcept`/`creative-concepts`.
- **FR-012**: System MUST display creative concepts in a single flat list (no category/type grouping) in the image studio UI.
- **FR-016**: System MUST allow at most one concept to be selected per image generation. Selecting a new concept deselects the previous one.
- **FR-013**: System MUST preserve existing `generation_metadata` in documents that reference old style preset slugs.
- **FR-014**: System MUST update the bootstrap endpoint to return `creative_concepts` instead of `style_presets`.

### Key Entities

- **Creative Concept**: A reusable compositional/narrative template that enriches a user's image generation prompt. Key attributes: name (en/pt), unique slug, prompt modifier text, optional prompt template with variables, thumbnail, sort order, active status.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Users can browse and select creative concepts from a single unified list in under 5 seconds.
- **SC-002**: 100% of existing layout presets are preserved and accessible as creative concepts after migration.
- **SC-003**: Image generation with a selected creative concept produces results that reflect the concept's compositional direction.
- **SC-004**: No visual style presets (photographic, watercolor, etc.) appear in the concept selector UI.
- **SC-005**: All existing documents with historical style preset references retain their metadata without data loss.
- **SC-006**: The concept selector UI loads in a single request without needing to differentiate between preset types.

## Assumptions

- Users will adapt quickly to describing visual styles directly in their prompts, as this is a natural way to communicate with image generation models.
- The 12 existing layout presets provide sufficient starting concepts; new Alvo Bot-inspired concepts will be additive and can be expanded over time.
- Template variable resolution will initially support basic project-level variables (`keyword`, `title`, `description`); more complex variable sources can be added later.
- The old `style_preset` field in image batch requests will be renamed to `creative_concept` as a clean break. Since this is an internal API (only our frontend), no external consumers are affected.

## Scope Boundaries

### In Scope
- Database migration (rename table, add/remove columns, update data)
- Backend model/schema/router refactoring
- Frontend component/hook/type refactoring
- New concept seed data
- Template variable resolution in prompt composition

### Out of Scope
- Niche detection system (Alvo Bot feature not needed for education focus)
- Diversity/Andromeda scoring system (can be a separate future feature)
- Ad copy generation (specific to Meta ads, not relevant to XCM)
- Creative library system (XCM already has Document-based asset management)
- SSE slot-based streaming (XCM already has its own SSE system)
