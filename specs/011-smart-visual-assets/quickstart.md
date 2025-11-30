# Quickstart: Smart Visual Assets

**Feature**: 011-smart-visual-assets
**Date**: 2025-11-29

## Prerequisites

- Python 3.11+ with virtual environment
- Node.js 20+ with npm
- PostgreSQL (Supabase)
- Redis (for caching)
- OpenRouter API key (for vision analysis)

## Setup Steps

### 1. Apply Database Migration

```bash
# From project root
cd backend

# Apply the visual assets migration
psql $DATABASE_URL -f migrations/015_add_visual_asset_fields.sql
```

Or via Supabase dashboard:
1. Open SQL Editor
2. Paste contents of `migrations/015_add_visual_asset_fields.sql`
3. Execute

### 2. Backend Changes

Create/update the following files:

```
backend/
├── routers/
│   └── visual_assets.py      # New router for visual asset endpoints
├── schemas.py                 # Add new Pydantic schemas
├── models.py                  # Add SQLAlchemy models
└── services/
    └── visual_context_service.py  # New service for visual context logic
```

Register new router in `main.py`:
```python
from routers import visual_assets
app.include_router(visual_assets.router, prefix="/api")
```

### 3. Frontend Changes

Create/update the following files:

```
frontend/src/
├── components/
│   └── project/
│       ├── AssetClassificationModal.tsx    # Classification confirmation
│       └── AssistantVisualSettings.tsx     # Settings panel component
├── app/
│   └── workspace/[id]/project/[projectId]/
│       └── settings/
│           └── visual-context/
│               └── page.tsx                # Settings page
└── lib/
    └── api.ts                              # Add new API functions
```

### 4. Environment Variables

No new environment variables required. Uses existing:
- `OPENROUTER_API_KEY` - For vision analysis via Claude Haiku
- `DATABASE_URL` - PostgreSQL connection
- `R2_*` - Cloudflare R2 for asset storage

## Testing the Feature

### Manual Testing Flow

1. **Upload & Classification**:
   - Navigate to a project's Assets tab
   - Upload an image (logo, person photo, etc.)
   - Verify AI classification modal appears with suggestions
   - Confirm or edit the classification

2. **Visual Settings Configuration**:
   - Go to Project Settings → Visual Context
   - Enable the visual context toggle
   - Select Manual or Auto mode
   - For Manual: select specific assets
   - For Auto: configure assets per category

3. **Generation with Context**:
   - Open the chat or image generation modal
   - Request an image generation
   - Verify selected assets appear as references
   - Check generated image incorporates visual elements

### API Testing

```bash
# Classify an asset
curl -X POST http://localhost:8000/api/assets/{asset_id}/classify \
  -H "Authorization: Bearer $TOKEN"

# Get visual assets summary
curl http://localhost:8000/api/projects/{project_id}/visual-assets/summary \
  -H "Authorization: Bearer $TOKEN"

# Update visual settings
curl -X PUT http://localhost:8000/api/projects/{project_id}/assistant/visual-settings \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"is_enabled": true, "mode": "auto", "assets_per_category": 2}'

# Get resolved visual context
curl http://localhost:8000/api/projects/{project_id}/assistant/visual-context \
  -H "Authorization: Bearer $TOKEN"
```

## Key Implementation Notes

### Vision Service Integration

The classification uses existing `vision_service.analyze_image()`:

```python
CLASSIFICATION_PROMPT = """Analyze this image and classify it. Return JSON:
{
  "category": "Logo|Pessoa|Background|Produto|Outro",
  "tags": ["tag1", "tag2", "tag3"],
  "description": "Brief description"
}
Be concise. Focus on the most prominent visual elements."""

result = await vision_service.analyze_image(
    image_url=asset.file_url,
    prompt=CLASSIFICATION_PROMPT,
    model="haiku"  # Cost-effective for classification
)
```

### Rotation Algorithm (Auto Mode)

```python
async def get_rotated_assets(project_id: str, limit: int = 5):
    # 1. Get all eligible assets
    assets = await get_visual_assets(project_id)

    # 2. Always include logos first
    logos = [a for a in assets if a.category == "Logo"]

    # 3. Get usage history for last 30 days
    usage = await get_recent_usage(project_id, days=30)

    # 4. Score remaining assets (lower = used less recently)
    remaining = [a for a in assets if a.category != "Logo"]
    scored = sorted(remaining, key=lambda a: usage.get(a.id, datetime.min))

    # 5. Take N from each category
    selected = logos[:limit]
    for category in ["Pessoa", "Produto", "Background", "Outro"]:
        category_assets = [a for a in scored if a.category == category]
        selected.extend(category_assets[:assets_per_category])

    return selected[:limit]  # Cap at 5 total
```

### Database Indexes

The migration creates optimized indexes:
- `idx_documents_asset_category` - For filtering by category
- `idx_asset_selection_settings` - For fetching enabled selections
- `idx_usage_history_asset` - For rotation queries

## Validation Checklist

- [ ] Migration applied successfully
- [ ] New router registered and accessible
- [ ] Classification returns results in <5 seconds
- [ ] Manual mode allows asset selection
- [ ] Auto mode rotates assets correctly
- [ ] Visual context appears in generation modal
- [ ] Usage history recorded after generation
- [ ] Maximum 5 assets per generation enforced
- [ ] 10MB file size limit enforced on upload
