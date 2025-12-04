# Quickstart: Admin Model Visibility Configuration

**Feature**: 018-admin-model-visibility
**Estimated Time**: 2-3 hours

## Prerequisites

- Backend running locally (`uvicorn main:app`)
- Frontend running locally (`npm run dev`)
- Admin user account
- OpenRouter API key configured

## Implementation Order

```
1. Backend: ModelConfigService    ──►  30 min
2. Backend: Admin Router          ──►  20 min
3. Backend: Chat/Image Routers    ──►  30 min
4. Frontend: Admin UI             ──►  45 min
5. Frontend: Remove Workspace     ──►  15 min
6. Testing & Validation           ──►  30 min
```

## Step 1: Backend - ModelConfigService

**File**: `backend/services/model_config_service.py`

Add new methods for separated model lists:

```python
# Add these methods to ModelConfigService class

async def get_visible_text_models(self) -> List[str]:
    """Get list of text model IDs visible to users."""
    return await self._get_config_value(
        "visible_text_models",
        default=[
            "anthropic/claude-sonnet-4-20250514",
            "openai/gpt-4o",
            "google/gemini-pro-1.5"
        ]
    )

async def get_visible_image_models(self) -> List[str]:
    """Get list of image model IDs visible to users."""
    return await self._get_config_value(
        "visible_image_models",
        default=["openai/dall-e-3"]
    )

async def update_visible_text_models(self, model_ids: List[str]) -> None:
    """Update visible text models list."""
    if not model_ids:
        raise ValueError("At least one text model must be visible")
    await self._update_config_value("visible_text_models", model_ids)

async def update_visible_image_models(self, model_ids: List[str]) -> None:
    """Update visible image models list."""
    if not model_ids:
        raise ValueError("At least one image model must be visible")
    await self._update_config_value("visible_image_models", model_ids)
```

## Step 2: Backend - Admin Router

**File**: `backend/routers/admin.py`

Update schemas and endpoints:

```python
# Update AIModelConfig schema
class AIModelConfig(BaseModel):
    defaults: Dict[str, str] = {}
    fallbacks: Dict[str, str] = {}
    visible_text_models: List[str] = []
    visible_image_models: List[str] = []

# Update AIModelConfigUpdate schema
class AIModelConfigUpdate(BaseModel):
    defaults: Optional[Dict[str, str]] = None
    fallbacks: Optional[Dict[str, str]] = None
    visible_text_models: Optional[List[str]] = None
    visible_image_models: Optional[List[str]] = None

# Update GET /admin/models/config
@router.get("/models/config")
async def get_model_config(...):
    return AIModelConfig(
        defaults=await model_config.get_defaults(),
        fallbacks=await model_config.get_fallbacks(),
        visible_text_models=await model_config.get_visible_text_models(),
        visible_image_models=await model_config.get_visible_image_models()
    )

# Update PUT /admin/models/config
@router.put("/models/config")
async def update_model_config(update: AIModelConfigUpdate, ...):
    if update.visible_text_models is not None:
        await model_config.update_visible_text_models(update.visible_text_models)
    if update.visible_image_models is not None:
        await model_config.update_visible_image_models(update.visible_image_models)
    # ... return updated config
```

## Step 3: Backend - Chat & Image Routers

**File**: `backend/routers/chat.py`

```python
@router.get("/models")
async def get_chat_models(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Return only visible text models (from DB, not OpenRouter)."""
    model_config = ModelConfigService(db)
    visible_ids = await model_config.get_visible_text_models()

    # Return simplified model info
    return [
        {"id": model_id, "name": model_id.split("/")[-1].replace("-", " ").title()}
        for model_id in visible_ids
    ]
```

**File**: `backend/routers/image_generation.py`

```python
@router.get("/models")
async def get_image_models(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Return only visible image models (from DB, not OpenRouter)."""
    model_config = ModelConfigService(db)
    visible_ids = await model_config.get_visible_image_models()

    return [
        {"id": model_id, "name": model_id.split("/")[-1].replace("-", " ").title()}
        for model_id in visible_ids
    ]
```

## Step 4: Frontend - Admin Models Page

**File**: `frontend/src/app/admin/models/page.tsx`

Update tabs to separate text and image models:

```tsx
// Change from 2 tabs to 3 tabs
<Tabs defaultValue="defaults">
  <TabsList>
    <TabsTrigger value="defaults">Default Models</TabsTrigger>
    <TabsTrigger value="text">Text Models</TabsTrigger>
    <TabsTrigger value="image">Image Models</TabsTrigger>
  </TabsList>

  <TabsContent value="text">
    <VisibleModelsConfig
      title="Visible Text Models"
      models={textModels}  // Filtered by output_modalities.includes("text")
      selected={config?.visible_text_models || []}
      onSave={(ids) => updateConfig({ visible_text_models: ids })}
    />
  </TabsContent>

  <TabsContent value="image">
    <VisibleModelsConfig
      title="Visible Image Models"
      models={imageModels}  // Filtered by output_modalities.includes("image")
      selected={config?.visible_image_models || []}
      onSave={(ids) => updateConfig({ visible_image_models: ids })}
    />
  </TabsContent>
</Tabs>
```

Add pricing display to model list:

```tsx
// In VisibleModelsConfig component
<div className="flex items-center justify-between">
  <span>{model.name}</span>
  <span className="text-xs text-muted-foreground">
    {model.pricing_prompt} / {model.pricing_completion}
  </span>
</div>
```

## Step 5: Frontend - Remove Workspace Section

**File**: `frontend/src/app/workspace/[id]/settings/page.tsx`

Remove the "Modelos Recomendados" section (approximately lines 399-450):

```tsx
// REMOVE this entire section:
// <div className="space-y-4">
//   <Label>Modelos Recomendados</Label>
//   <p className="text-sm text-muted-foreground">
//     Selecione quais modelos aparecerão como sugestões rápidas...
//   </p>
//   ... checkbox list ...
// </div>
```

## Step 6: Testing & Validation

### Manual Testing Checklist

1. **Admin - Text Models**
   - [ ] Navigate to /admin/models
   - [ ] Click "Text Models" tab
   - [ ] Verify models show with prices
   - [ ] Select/deselect models
   - [ ] Save and verify persistence

2. **Admin - Image Models**
   - [ ] Click "Image Models" tab
   - [ ] Verify image models filtered correctly
   - [ ] Save selection

3. **User - Chat Model Selector**
   - [ ] Open AI assistant
   - [ ] Verify only admin-selected text models appear
   - [ ] Verify no OpenRouter request in Network tab

4. **User - Image Generation**
   - [ ] Open image generation modal
   - [ ] Verify only admin-selected image models appear

5. **Workspace Settings**
   - [ ] Navigate to workspace settings
   - [ ] Verify "Modelos Recomendados" section is gone

### API Tests

```bash
# Get model config
curl -X GET http://localhost:8000/admin/models/config \
  -H "Authorization: Bearer $TOKEN"

# Update visible text models
curl -X PUT http://localhost:8000/admin/models/config \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"visible_text_models": ["anthropic/claude-sonnet-4-20250514", "openai/gpt-4o"]}'

# Get user-visible chat models
curl -X GET http://localhost:8000/chat/models \
  -H "Authorization: Bearer $TOKEN"
```

## Troubleshooting

| Issue | Solution |
|-------|----------|
| Empty model list | Check DB has seed data in system_config |
| Models not filtering | Verify output_modalities field from OpenRouter |
| Old models still showing | Clear browser cache, check Redis cache TTL |
| 403 on admin endpoint | Verify user has admin role |

## Success Criteria

- [ ] Admin can configure text models separately from image models
- [ ] Model prices displayed in admin UI
- [ ] User selectors show only admin-configured models
- [ ] No OpenRouter calls from user-facing selectors
- [ ] Workspace "Modelos Recomendados" section removed
