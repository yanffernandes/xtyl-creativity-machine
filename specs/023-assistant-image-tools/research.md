# Research: Assistant Image Analysis & Refinement Tools

**Feature**: 023-assistant-image-tools
**Date**: 2025-12-05

## Research Questions

### 1. How does the existing vision service work?

**Finding**: `backend/vision_service.py` provides `analyze_image()` function that:
- Takes image path + prompt
- Converts image to base64
- Sends to OpenRouter with Claude vision model
- Returns structured analysis result

**Decision**: Reuse existing vision service, add wrapper for URL-based images (not just file paths)

### 2. How does image refinement work with base_image_url?

**Finding**: `backend/image_generation_service.py` has `generate_image_openrouter()` with:
- `base_image_url` parameter for image-to-image refinement
- Converts URL to base64 automatically
- Sends image + prompt to model for generation

**Code Evidence** (lines 131-188):
```python
async def generate_image_openrouter(
    prompt: str,
    model: str = DEFAULT_MODEL,
    ...
    base_image_url: Optional[str] = None,  # For refinement
):
    # Add base image if provided (for refinement)
    if base_image_url:
        base_image_url = await url_to_base64(base_image_url)
        message_content.append({
            "type": "image_url",
            "image_url": {"url": base_image_url}
        })
```

**Decision**: Use existing mechanism - pass source image URL as `base_image_url` with refinement prompt

### 3. How are document attachments stored?

**Finding**: `DocumentAttachment` model links documents to images:
```python
class DocumentAttachment(Base):
    id = Column(String, primary_key=True)
    document_id = Column(String, ForeignKey("documents.id"))
    image_id = Column(String, ForeignKey("documents.id"))
    is_primary = Column(Boolean, default=False)
    attachment_order = Column(Integer, default=0)
```

**Decision**: Query attachments by `document_id`, join with `Document` to get `file_url` and `thumbnail_url`

### 4. How do existing tools follow patterns?

**Finding**: Tools in `tools.py` follow this pattern:
1. Function definition with `db: Session` + specific args
2. Entry in `TOOL_DEFINITIONS` list with OpenAI function calling format
3. Case in `execute_tool()` async function to route and call

**Example** (generate_image_tool):
```python
async def generate_image_tool(db, project_id, prompt, ...) -> Dict[str, Any]:
    # Implementation
    return {"image_url": ..., "message": ...}

TOOL_DEFINITIONS = [
    {
        "type": "function",
        "function": {
            "name": "generate_image",
            "description": "...",
            "parameters": {...}
        }
    }
]

async def execute_tool(tool_name, tool_args, db):
    elif tool_name == "generate_image":
        return await generate_image_tool(db, ...)
```

**Decision**: Follow exact same pattern for new tools

### 5. How is max_iterations configured?

**Finding**:
- Default in `schemas.py`: `max_iterations: int = Field(default=15, ge=1, le=50)`
- Model in `models.py`: `max_iterations = Column(Integer, default=15)`
- Read in `chat.py`: `user_prefs.max_iterations if user_prefs else 15`
- DB constraint: `CHECK (max_iterations >= 1 AND max_iterations <= 50)`

**Decision**:
1. Update schema default to 25
2. Update model default to 25
3. Create migration to UPDATE all users from 15 to 25
4. Keep max limit at 50

## Alternatives Considered

### Vision API Approach

| Option | Pros | Cons | Decision |
|--------|------|------|----------|
| Use existing vision_service | Already tested, no new code | Needs URL support | ✅ Selected - add URL wrapper |
| Create new service | Clean slate | Duplicates logic | ❌ Rejected |
| Direct OpenRouter call in tool | Simple | No reuse | ❌ Rejected |

### Refinement Strategy

| Option | Pros | Cons | Decision |
|--------|------|------|----------|
| base_image_url (existing) | Already works, proven | Model-dependent results | ✅ Selected |
| External image editing API | Precise edits | New integration, cost | ❌ Rejected |
| Generate from scratch + description | Simple | Loses original style | ❌ Rejected |

### Refined Image Storage

| Option | Pros | Cons | Decision |
|--------|------|------|----------|
| Create new + keep original | Preserves history | More storage | ✅ Selected (per clarification) |
| Replace original | Clean | Loses history | ❌ Rejected |
| Ask user each time | Flexible | Interrupts flow | ❌ Rejected |

## Technical Constraints Identified

1. **Vision models availability**: Not all OpenRouter models support vision - need to use vision-capable model (Claude, GPT-4V, Gemini)
2. **Image-to-image quality**: Results depend on model's capability to follow refinement instructions
3. **URL accessibility**: Image URLs must be accessible from backend (no localhost URLs in production)
4. **Base64 size limits**: Large images may hit API limits - existing url_to_base64 handles this

## Dependencies

- `vision_service.py` - for image analysis
- `image_generation_service.py` - for refinement via base_image_url
- `models.py` - DocumentAttachment, Document, UserPreferences
- `tools.py` - extend with new tools
- `chat.py` - attach image context to system prompt
