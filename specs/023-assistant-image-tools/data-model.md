# Data Model: Assistant Image Analysis & Refinement Tools

**Feature**: 023-assistant-image-tools
**Date**: 2025-12-05

## Overview

This feature does not introduce new database tables. It leverages existing entities and adds tool return types (non-persisted dictionaries).

## Existing Entities (Referenced)

### Document

```python
class Document(Base):
    __tablename__ = "documents"

    id = Column(String, primary_key=True)
    title = Column(String)
    content = Column(Text)
    project_id = Column(String, ForeignKey("projects.id"))
    folder_id = Column(String, ForeignKey("folders.id"), nullable=True)
    status = Column(String, default="draft")
    media_type = Column(String, nullable=True)  # "image" for image documents
    file_url = Column(String, nullable=True)     # URL to full image
    thumbnail_url = Column(String, nullable=True) # URL to thumbnail
    generation_metadata = Column(JSON, nullable=True)  # AI generation info
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, onupdate=datetime.utcnow)
    deleted_at = Column(DateTime, nullable=True)  # Soft delete
```

**Used by**: All image tools to fetch/store images

### DocumentAttachment

```python
class DocumentAttachment(Base):
    __tablename__ = "document_attachments"

    id = Column(String, primary_key=True)
    document_id = Column(String, ForeignKey("documents.id"))  # Parent document
    image_id = Column(String, ForeignKey("documents.id"))     # Attached image
    is_primary = Column(Boolean, default=False)
    attachment_order = Column(Integer, default=0)
    created_at = Column(DateTime, default=datetime.utcnow)
```

**Used by**: `list_document_images`, `analyze_document_images`, `refine_image` (for auto-attach)

### UserPreferences

```python
class UserPreferences(Base):
    __tablename__ = "user_preferences"

    id = Column(String, primary_key=True)
    user_id = Column(String, ForeignKey("users.id"), unique=True)
    max_iterations = Column(Integer, default=25)  # CHANGED: was 15
    # ... other preferences
```

**Used by**: `chat.py` to determine tool iteration limit

## Tool Return Types (Non-Persisted)

### ListDocumentImagesResult

```python
{
    "images": [
        {
            "position": 1,
            "image_id": "uuid",
            "title": "Banner Promocional",
            "file_url": "https://...",
            "thumbnail_url": "https://...",
            "is_primary": True,
            "created_at": "2025-12-05T10:00:00Z"
        }
    ],
    "count": 3,
    "document_id": "uuid",
    "document_title": "Campanha Black Friday"
}
```

### ImageAnalysisResult

```python
{
    "image_id": "uuid",
    "image_title": "Banner Promocional",
    "analysis": {
        "description": "Marketing banner with bold typography...",
        "detected_text": ["50% OFF", "BLACK FRIDAY", "Compre Agora"],
        "colors": ["#FF0000", "#000000", "#FFFFFF"],
        "composition": "Centered layout with CTA button",
        "suggestions": ["Consider increasing text contrast"]
    },
    "model_used": "anthropic/claude-3.5-sonnet",
    "processing_time_ms": 2340
}
```

### RefineImageResult

```python
{
    "original_image_id": "uuid",
    "refined_image_id": "uuid",  # New document created
    "refined_image_url": "https://...",
    "refined_thumbnail_url": "https://...",
    "instructions_used": "Diminua o tamanho da fonte em 20%",
    "attached_to_document_id": "uuid",  # If auto-attached
    "message": "Imagem refinada criada com sucesso"
}
```

## Schema Changes

### Migration: 024_update_max_iterations.sql

```sql
-- Update default for new users
ALTER TABLE user_preferences
ALTER COLUMN max_iterations SET DEFAULT 25;

-- Update existing users who have the old default
UPDATE user_preferences
SET max_iterations = 25
WHERE max_iterations = 15;

-- Update Pydantic schema default (done in code)
-- backend/schemas.py: max_iterations: int = Field(default=25, ge=1, le=50)
```

## Relationships Diagram

```
┌─────────────────┐       ┌─────────────────────┐       ┌─────────────────┐
│    Document     │       │  DocumentAttachment │       │    Document     │
│  (text doc)     │──────<│                     │>──────│   (image)       │
│                 │       │  document_id        │       │                 │
│  id             │       │  image_id           │       │  id             │
│  title          │       │  is_primary         │       │  title          │
│  content        │       │  attachment_order   │       │  file_url       │
│  project_id     │       └─────────────────────┘       │  thumbnail_url  │
│                 │                                      │  media_type     │
└─────────────────┘                                      └─────────────────┘
         │                                                        │
         │                                                        │
         └──────────────────────────┬─────────────────────────────┘
                                    │
                                    ▼
                           ┌─────────────────┐
                           │     Project     │
                           │                 │
                           │  id             │
                           │  name           │
                           │  workspace_id   │
                           └─────────────────┘
```

## Query Patterns

### Get attached images for a document

```python
def get_document_images(db: Session, document_id: str) -> List[Dict]:
    attachments = db.query(DocumentAttachment, Document).join(
        Document, DocumentAttachment.image_id == Document.id
    ).filter(
        DocumentAttachment.document_id == document_id,
        Document.deleted_at.is_(None)
    ).order_by(
        DocumentAttachment.attachment_order
    ).all()

    return [
        {
            "position": idx + 1,
            "image_id": doc.id,
            "title": doc.title,
            "file_url": doc.file_url,
            "thumbnail_url": doc.thumbnail_url,
            "is_primary": att.is_primary
        }
        for idx, (att, doc) in enumerate(attachments)
    ]
```

### Get image by ID for analysis

```python
def get_image_document(db: Session, image_id: str) -> Optional[Document]:
    return db.query(Document).filter(
        Document.id == image_id,
        Document.media_type == "image",
        Document.deleted_at.is_(None)
    ).first()
```

## Validation Rules

| Field | Rule | Error Message |
|-------|------|---------------|
| document_id | Must exist and not be deleted | "Documento não encontrado" |
| image_id | Must be media_type="image" | "Este documento não é uma imagem" |
| file_url | Must be accessible URL | "URL da imagem inacessível" |
| max_iterations | 1 ≤ value ≤ 50 | "Limite deve estar entre 1 e 50" |
