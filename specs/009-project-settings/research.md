# Research: Project Settings & Context Information

**Feature**: 009-project-settings
**Date**: 2025-11-28

## Research Summary

This feature is straightforward - extending the existing Project model with settings fields and injecting them into AI prompts. No external research needed as it follows existing patterns in the codebase.

## Technical Decisions

### 1. Data Storage Approach

**Decision**: Extend Project model with JSONB settings field

**Rationale**:
- Single table extension is simpler than separate entity
- JSONB allows flexible schema for settings fields
- Existing Project CRUD already handles permissions

**Alternatives Considered**:
- Separate ProjectSettings table (1:1): More normalized but adds complexity for no benefit
- Key-value store: Too generic, loses type safety

### 2. AI Context Injection Point

**Decision**: Inject in chat router before LLM call

**Rationale**:
- Server-side injection ensures consistency
- Easy to add without modifying LLM service
- Context can be formatted appropriately for each model

**Alternatives Considered**:
- Frontend injection: Would require client to always include context, error-prone
- LLM service level: Too deep, harder to customize per-project

### 3. Brand Voice Options

**Decision**: Predefined options + custom text field

**Rationale**:
- Predefined options guide users with good defaults
- Custom field allows flexibility for unique brand voices
- Simple UI pattern (select + optional text)

**Options List**:
- Professional & Formal
- Casual & Friendly
- Technical & Precise
- Creative & Playful
- Authoritative & Expert
- Custom (free text)

### 4. Settings UI Location

**Decision**: Dedicated settings page accessible from project header

**Rationale**:
- Clear navigation pattern
- Enough space for all fields
- Follows existing workspace settings pattern

**Alternatives Considered**:
- Modal: Too cramped for multiple fields
- Inline editing: Confusing with project content

## Integration Points

### Existing Code to Modify

1. **backend/models.py**: Add settings fields to Project model
2. **backend/schemas.py**: Add ProjectSettings Pydantic schema
3. **backend/routers/projects.py**: Add GET/PUT endpoints for settings
4. **backend/routers/chat.py**: Inject project context before LLM call
5. **frontend/src/lib/api.ts**: Add settings API functions

### No Breaking Changes

- Existing Project API remains unchanged
- Settings fields have default values (null/empty)
- Chat continues working without settings configured

## Performance Considerations

- Settings fetched with project data (no additional query)
- Context injection adds ~100-500 tokens to prompt (minimal impact)
- No caching needed for settings (always fresh from DB)
