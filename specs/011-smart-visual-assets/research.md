# Research: Smart Visual Assets

**Feature**: 011-smart-visual-assets
**Date**: 2025-11-29

## Research Questions

### RQ-1: How to leverage existing vision_service for classification?

**Decision**: Use the existing `vision_service.analyze_image()` with a specialized classification prompt.

**Rationale**:
- The vision_service already supports Claude Haiku ($0.25/$1.25) which is cost-effective for classification
- It handles multiple providers (Anthropic, OpenRouter, OpenAI) with automatic fallback
- The `analyze_image` method accepts custom prompts, so we can craft a classification-specific prompt

**Implementation**:
```python
CLASSIFICATION_PROMPT = """Analyze this image and classify it. Return JSON with:
{
  "category": "Logo|Pessoa|Background|Produto|Outro",
  "tags": ["tag1", "tag2", "tag3"],
  "description": "Brief description of the image"
}
Be concise. Focus on the most prominent visual elements."""
```

**Alternatives considered**:
- Creating a new classification-specific service → Rejected (duplicates vision_service functionality)
- Using a different model for classification → Rejected (Haiku is already cost-effective)

---

### RQ-2: Where to store asset classification metadata?

**Decision**: Extend the existing `documents` table with new columns: `asset_category`, `asset_tags`, `ai_description`.

**Rationale**:
- Assets are already stored as documents with `is_reference_asset=True`
- Adding columns to existing table is simpler than creating a new table
- Maintains referential integrity with existing project/user relationships
- Migration is straightforward with `ALTER TABLE ADD COLUMN`

**Alternatives considered**:
- Create separate `asset_metadata` table → Rejected (adds unnecessary joins, complexity)
- Store as JSON in content field → Rejected (harder to query/filter by category)

---

### RQ-3: How to implement assistant visual context settings?

**Decision**: Create new tables `assistant_visual_settings` (per project) and `assistant_asset_selection` (for manual mode selections).

**Rationale**:
- Settings are project-scoped per spec assumptions
- Manual mode needs a many-to-many relationship between settings and selected assets
- Separate table keeps Document model clean

**Data model**:
```sql
-- Per-project settings
CREATE TABLE assistant_visual_settings (
    id UUID PRIMARY KEY,
    project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
    is_enabled BOOLEAN DEFAULT FALSE,
    mode VARCHAR(10) DEFAULT 'manual',  -- 'manual' or 'auto'
    assets_per_category INTEGER DEFAULT 2,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Manual mode selections (optional)
CREATE TABLE assistant_asset_selection (
    id UUID PRIMARY KEY,
    settings_id UUID REFERENCES assistant_visual_settings(id) ON DELETE CASCADE,
    asset_id UUID REFERENCES documents(id) ON DELETE CASCADE,
    is_enabled BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT NOW()
);
```

---

### RQ-4: How to implement asset usage rotation?

**Decision**: Create `asset_usage_history` table to track when each asset was used, with 30-day retention.

**Rationale**:
- Simple timestamp-based tracking allows efficient "least recently used" queries
- 30-day retention keeps table size manageable
- Can be pruned with scheduled job or on-query cleanup

**Implementation**:
```sql
CREATE TABLE asset_usage_history (
    id UUID PRIMARY KEY,
    asset_id UUID REFERENCES documents(id) ON DELETE CASCADE,
    generation_id UUID,  -- Reference to image generation request
    used_at TIMESTAMP DEFAULT NOW()
);

-- Index for efficient "least used" queries
CREATE INDEX idx_asset_usage_project ON asset_usage_history(asset_id, used_at DESC);
```

**Rotation algorithm**:
1. Get all eligible assets in category
2. Left join with usage_history for last 30 days
3. Order by `COALESCE(last_used, '1970-01-01')` ASC (never used first)
4. Take N assets as configured

---

### RQ-5: How to integrate visual context with image generation?

**Decision**: Modify the existing image generation flow to fetch and include visual context assets.

**Rationale**:
- Image generation already supports `reference_assets` parameter
- Need to inject assets from visual context settings when generating
- Chat endpoint and modal both call the same image generation service

**Implementation points**:
1. Before image generation, check if project has visual context enabled
2. If enabled, fetch selected assets based on mode (manual or auto)
3. Merge with any user-provided reference assets
4. Cap at 5 total assets per NFR-003
5. Record usage in asset_usage_history after successful generation

---

### RQ-6: Best practices for file size validation (10MB limit)?

**Decision**: Validate file size on both frontend and backend.

**Rationale**:
- Frontend validation provides immediate feedback
- Backend validation is required for security (frontend can be bypassed)
- 10MB is reasonable for high-quality images without excessive storage costs

**Implementation**:
```python
# Backend validation
MAX_FILE_SIZE = 10 * 1024 * 1024  # 10MB

@router.post("/upload")
async def upload_asset(file: UploadFile):
    file.file.seek(0, 2)  # Seek to end
    size = file.file.tell()
    file.file.seek(0)  # Reset

    if size > MAX_FILE_SIZE:
        raise HTTPException(400, f"File too large. Max size: 10MB")
```

```typescript
// Frontend validation
const MAX_SIZE = 10 * 1024 * 1024; // 10MB
if (file.size > MAX_SIZE) {
  toast.error("File too large. Maximum size is 10MB.");
  return;
}
```

---

## Technology Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Classification model | Claude Haiku via vision_service | Cost-effective, already integrated |
| Category storage | Enum column in documents | Queryable, type-safe |
| Tags storage | Text array column | PostgreSQL native, searchable |
| Settings storage | Separate table | Clean separation, project-scoped |
| Usage tracking | Timestamp-based table | Simple, efficient rotation queries |
| Frontend components | Shadcn/UI + Tailwind | Matches existing UI patterns |

## Unresolved Items

None - all technical questions resolved through this research.

## Next Steps

1. Generate data-model.md with complete entity definitions
2. Generate API contracts for new endpoints
3. Create quickstart.md for development setup
