# Quickstart: Assistant Image Analysis & Refinement Tools

**Feature**: 023-assistant-image-tools
**Date**: 2025-12-05

## Overview

This guide provides step-by-step implementation instructions for adding image analysis and refinement tools to the AI assistant.

## Prerequisites

- Existing `tools.py` with current tool definitions
- `vision_service.py` with `analyze_image()` function
- `image_generation_service.py` with `base_image_url` support
- `DocumentAttachment` model for image-document relationships

## Implementation Steps

### Step 1: Add Tool Functions to tools.py

```python
# Add after existing tool functions

def list_document_images_tool(
    db: Session,
    document_id: str
) -> Dict[str, Any]:
    """
    List all images attached to a document.
    """
    from models import Document, DocumentAttachment

    # Verify document exists
    doc = db.query(Document).filter(
        Document.id == document_id,
        Document.deleted_at.is_(None)
    ).first()

    if not doc:
        return {"error": "Documento não encontrado"}

    # Get attachments with image details
    attachments = db.query(DocumentAttachment, Document).join(
        Document, DocumentAttachment.image_id == Document.id
    ).filter(
        DocumentAttachment.document_id == document_id,
        Document.deleted_at.is_(None)
    ).order_by(DocumentAttachment.attachment_order).all()

    images = [
        {
            "position": idx + 1,
            "image_id": img.id,
            "title": img.title,
            "file_url": img.file_url,
            "thumbnail_url": img.thumbnail_url,
            "is_primary": att.is_primary,
            "created_at": str(img.created_at)
        }
        for idx, (att, img) in enumerate(attachments)
    ]

    return {
        "images": images,
        "count": len(images),
        "document_id": document_id,
        "document_title": doc.title
    }


async def analyze_image_tool(
    db: Session,
    image_id: str,
    prompt: Optional[str] = None
) -> Dict[str, Any]:
    """
    Analyze an image using vision AI.
    """
    import time
    from models import Document
    from vision_service import analyze_image_from_url

    start_time = time.time()

    # Get image document
    image = db.query(Document).filter(
        Document.id == image_id,
        Document.media_type == "image",
        Document.deleted_at.is_(None)
    ).first()

    if not image:
        return {"error": "Imagem não encontrada"}

    if not image.file_url:
        return {"error": "URL da imagem não disponível"}

    # Default prompt for comprehensive analysis
    analysis_prompt = prompt or """
    Analise esta imagem em detalhes. Forneça:
    1. Descrição geral dos elementos visuais
    2. Texto visível (transcreva exatamente o que está escrito)
    3. Cores predominantes (em formato hex se possível)
    4. Composição e layout
    5. Sugestões de melhoria (se aplicável)
    """

    try:
        result = await analyze_image_from_url(image.file_url, analysis_prompt)
        processing_time = int((time.time() - start_time) * 1000)

        return {
            "image_id": image_id,
            "image_title": image.title,
            "analysis": result,
            "model_used": result.get("model", "unknown"),
            "processing_time_ms": processing_time
        }
    except Exception as e:
        return {"error": f"Falha na análise: {str(e)}"}


async def analyze_document_images_tool(
    db: Session,
    document_id: str,
    prompt: Optional[str] = None
) -> Dict[str, Any]:
    """
    Analyze all images attached to a document.
    """
    import time

    start_time = time.time()

    # First, list images
    images_result = list_document_images_tool(db, document_id)

    if "error" in images_result:
        return images_result

    if images_result["count"] == 0:
        return {
            "error": "Este documento não possui imagens anexadas",
            "document_id": document_id
        }

    # Analyze each image
    analyses = []
    for img in images_result["images"]:
        analysis = await analyze_image_tool(db, img["image_id"], prompt)
        analyses.append(analysis)

    total_time = int((time.time() - start_time) * 1000)

    return {
        "document_id": document_id,
        "document_title": images_result["document_title"],
        "analyses": analyses,
        "total_processing_time_ms": total_time,
        "image_count": len(analyses)
    }


async def refine_image_tool(
    db: Session,
    image_id: str,
    instructions: str,
    attach_to_document_id: Optional[str] = None,
    aspect_ratio: Optional[str] = None
) -> Dict[str, Any]:
    """
    Refine an existing image based on instructions.
    Creates a new image, preserving the original.
    """
    from models import Document, DocumentAttachment
    from image_generation_service import generate_and_store_image
    from image_naming_service import generate_image_title
    import uuid

    # Get source image
    source_image = db.query(Document).filter(
        Document.id == image_id,
        Document.media_type == "image",
        Document.deleted_at.is_(None)
    ).first()

    if not source_image:
        return {"error": "Imagem original não encontrada"}

    if not source_image.file_url:
        return {"error": "URL da imagem original não disponível"}

    # Build refinement prompt
    refinement_prompt = f"""
    Refine this image according to the following instructions:
    {instructions}

    Maintain the overall style and content while applying the requested changes.
    """

    try:
        # Generate refined image using base_image_url
        result = await generate_and_store_image(
            prompt=refinement_prompt,
            project_id=source_image.project_id,
            base_image_url=source_image.file_url,
            aspect_ratio=aspect_ratio or "1:1"
        )

        # Create document for refined image
        refined_title = await generate_image_title(instructions)
        refined_id = str(uuid.uuid4())

        refined_doc = Document(
            id=refined_id,
            title=f"{refined_title} (refinado)",
            content=instructions,
            project_id=source_image.project_id,
            media_type="image",
            file_url=result["file_url"],
            thumbnail_url=result["thumbnail_url"],
            generation_metadata={
                "source_image_id": image_id,
                "refinement_instructions": instructions,
                **result.get("generation_metadata", {})
            },
            status="art_ok"
        )
        db.add(refined_doc)

        # Attach to document if requested
        attachment_id = None
        if attach_to_document_id:
            target_doc = db.query(Document).filter(
                Document.id == attach_to_document_id,
                Document.deleted_at.is_(None)
            ).first()

            if target_doc:
                attachment = DocumentAttachment(
                    id=str(uuid.uuid4()),
                    document_id=attach_to_document_id,
                    image_id=refined_id,
                    is_primary=False,
                    attachment_order=0
                )
                db.add(attachment)
                attachment_id = attachment.id

        db.commit()

        return {
            "original_image_id": image_id,
            "refined_image_id": refined_id,
            "refined_image_url": result["file_url"],
            "refined_thumbnail_url": result["thumbnail_url"],
            "instructions_used": instructions,
            "attached_to_document_id": attach_to_document_id if attachment_id else None,
            "message": "Imagem refinada criada com sucesso"
        }

    except Exception as e:
        return {"error": f"Falha ao refinar imagem: {str(e)}"}
```

### Step 2: Add Tool Definitions

```python
# Add to TOOL_DEFINITIONS list in tools.py

{
    "type": "function",
    "function": {
        "name": "list_document_images",
        "description": "List all images attached to a document. Returns image IDs, titles, URLs, and positions.",
        "parameters": {
            "type": "object",
            "properties": {
                "document_id": {
                    "type": "string",
                    "description": "The ID of the document to list attached images from"
                }
            },
            "required": ["document_id"]
        }
    }
},
{
    "type": "function",
    "function": {
        "name": "analyze_image",
        "description": "Analyze a specific image using AI vision. Returns description, detected text, colors, composition, and suggestions.",
        "parameters": {
            "type": "object",
            "properties": {
                "image_id": {
                    "type": "string",
                    "description": "The ID of the image document to analyze"
                },
                "prompt": {
                    "type": "string",
                    "description": "Optional custom analysis prompt to focus on specific aspects"
                }
            },
            "required": ["image_id"]
        }
    }
},
{
    "type": "function",
    "function": {
        "name": "analyze_document_images",
        "description": "Analyze ALL images attached to a document. Useful for batch review of marketing creatives.",
        "parameters": {
            "type": "object",
            "properties": {
                "document_id": {
                    "type": "string",
                    "description": "The ID of the document whose attached images will be analyzed"
                },
                "prompt": {
                    "type": "string",
                    "description": "Optional custom analysis prompt applied to all images"
                }
            },
            "required": ["document_id"]
        }
    }
},
{
    "type": "function",
    "function": {
        "name": "refine_image",
        "description": "Refine an existing image based on natural language instructions. Creates a NEW image (original preserved). Examples: 'diminua a fonte', 'mude a cor de fundo'.",
        "parameters": {
            "type": "object",
            "properties": {
                "image_id": {
                    "type": "string",
                    "description": "The ID of the source image to refine"
                },
                "instructions": {
                    "type": "string",
                    "description": "Natural language instructions for modifications"
                },
                "attach_to_document_id": {
                    "type": "string",
                    "description": "Optional document ID to attach the refined image to"
                },
                "aspect_ratio": {
                    "type": "string",
                    "enum": ["1:1", "16:9", "9:16", "4:3", "3:4"],
                    "description": "Optional aspect ratio for refined image"
                }
            },
            "required": ["image_id", "instructions"]
        }
    }
}
```

### Step 3: Add execute_tool Cases

```python
# Add to execute_tool() function in tools.py

elif tool_name == "list_document_images":
    return list_document_images_tool(
        db,
        tool_args["document_id"]
    )

elif tool_name == "analyze_image":
    return await analyze_image_tool(
        db,
        tool_args["image_id"],
        prompt=tool_args.get("prompt")
    )

elif tool_name == "analyze_document_images":
    return await analyze_document_images_tool(
        db,
        tool_args["document_id"],
        prompt=tool_args.get("prompt")
    )

elif tool_name == "refine_image":
    return await refine_image_tool(
        db,
        tool_args["image_id"],
        tool_args["instructions"],
        attach_to_document_id=tool_args.get("attach_to_document_id"),
        aspect_ratio=tool_args.get("aspect_ratio")
    )
```

### Step 4: Add Vision URL Support

```python
# Add to vision_service.py

async def analyze_image_from_url(
    image_url: str,
    prompt: str,
    model: str = "anthropic/claude-3.5-sonnet"
) -> Dict[str, Any]:
    """
    Analyze image from URL using vision API.
    """
    import httpx
    import base64
    import os

    api_key = os.getenv("OPENROUTER_API_KEY")

    # Fetch and convert to base64
    async with httpx.AsyncClient(timeout=30.0) as client:
        response = await client.get(image_url)
        response.raise_for_status()
        image_bytes = response.content

    b64_data = base64.b64encode(image_bytes).decode('utf-8')
    data_url = f"data:image/png;base64,{b64_data}"

    # Call vision API
    async with httpx.AsyncClient(timeout=60.0) as client:
        response = await client.post(
            "https://openrouter.ai/api/v1/chat/completions",
            headers={
                "Authorization": f"Bearer {api_key}",
                "Content-Type": "application/json"
            },
            json={
                "model": model,
                "messages": [
                    {
                        "role": "user",
                        "content": [
                            {"type": "image_url", "image_url": {"url": data_url}},
                            {"type": "text", "text": prompt}
                        ]
                    }
                ]
            }
        )
        response.raise_for_status()
        data = response.json()

    content = data["choices"][0]["message"]["content"]

    return {
        "description": content,
        "model": model,
        "raw_response": data
    }
```

### Step 5: Update max_iterations Default

```python
# In schemas.py
class UserPreferencesBase(BaseModel):
    max_iterations: int = Field(default=25, ge=1, le=50)  # Changed from 15

# In models.py
class UserPreferences(Base):
    max_iterations = Column(Integer, default=25)  # Changed from 15
```

### Step 6: Create Migration

```sql
-- migrations/024_update_max_iterations.sql

-- Update default for new records
ALTER TABLE user_preferences
ALTER COLUMN max_iterations SET DEFAULT 25;

-- Update existing users with old default
UPDATE user_preferences
SET max_iterations = 25
WHERE max_iterations = 15;
```

### Step 7: Update Tool Description in chat.py

```python
# In _get_tool_description() function, add:

"list_document_images": lambda a: "Listar imagens do documento",
"analyze_image": lambda a: f"Analisar imagem: {a.get('image_id', 'imagem')[:20]}",
"analyze_document_images": lambda a: "Analisar todas as imagens do documento",
"refine_image": lambda a: f"Refinar imagem: {a.get('instructions', '')[:30]}",
```

## Testing

```python
# Test list_document_images
result = list_document_images_tool(db, "doc-uuid")
assert "images" in result
assert result["count"] >= 0

# Test analyze_image
result = await analyze_image_tool(db, "image-uuid")
assert "analysis" in result or "error" in result

# Test refine_image
result = await refine_image_tool(
    db,
    "image-uuid",
    "Diminua o tamanho da fonte"
)
assert "refined_image_id" in result or "error" in result
```

## Verification Checklist

- [ ] All 4 tool functions added to tools.py
- [ ] All 4 tool definitions in TOOL_DEFINITIONS
- [ ] All 4 cases in execute_tool()
- [ ] analyze_image_from_url added to vision_service.py
- [ ] max_iterations default updated in schemas.py and models.py
- [ ] Migration 024 created and tested
- [ ] Tool descriptions added to _get_tool_description()
- [ ] Frontend displays image thumbnails in tool results
