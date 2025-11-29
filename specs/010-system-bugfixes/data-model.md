# Data Model: System Bugfixes

**Date**: 2025-11-29
**Branch**: `010-system-bugfixes`

## Existing Models (No Changes Required)

### ChatConversation

Already exists in `backend/models.py`. No schema changes needed.

```python
class ChatConversation(Base):
    __tablename__ = "chat_conversations"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    project_id = Column(UUID(as_uuid=True), ForeignKey("projects.id"), nullable=True)
    workspace_id = Column(UUID(as_uuid=True), ForeignKey("workspaces.id"), nullable=False)

    title = Column(String(500), nullable=True)  # Auto-generated from first message
    summary = Column(Text, nullable=True)  # AI-generated summary
    messages_json = Column(JSONB, default=list)  # Array of message objects
    model_used = Column(String(100), nullable=True)

    document_ids_context = Column(ARRAY(UUID(as_uuid=True)), default=list)
    folder_ids_context = Column(ARRAY(UUID(as_uuid=True)), default=list)
    created_document_ids = Column(ARRAY(UUID(as_uuid=True)), default=list)

    is_archived = Column(Boolean, default=False)
    message_count = Column(Integer, default=0)
    last_message_at = Column(DateTime(timezone=True), nullable=True)

    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
```

**Message JSON Structure** (within `messages_json`):
```json
{
  "role": "user" | "assistant",
  "content": "string",
  "timestamp": "ISO datetime",
  "model": "string (optional, for assistant)",
  "tokens": { "input": number, "output": number } (optional)
}
```

### ActivityLog

Already exists in `backend/models.py`. No schema changes needed.

```python
class ActivityLog(Base):
    __tablename__ = "activity_logs"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    entity_type = Column(String(50), nullable=False)  # 'document', 'folder'
    entity_id = Column(UUID(as_uuid=True), nullable=False)
    action = Column(String(50), nullable=False)  # 'create', 'update', 'delete', 'restore', 'move'
    actor_type = Column(String(20), default="human")  # 'human', 'ai'
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=True)
    changes = Column(JSONB, nullable=True)  # { before: {...}, after: {...} }
    created_at = Column(DateTime(timezone=True), server_default=func.now())
```

### Document

Existing model with `is_reference_asset` field. No changes needed.

```python
# Relevant fields for Kanban filter:
is_reference_asset = Column(Boolean, default=False)  # True for visual assets
status = Column(String(50), default="draft")  # Kanban column status
```

### Project

Existing model with `settings` JSONB and `name` field.

```python
name = Column(String(255), nullable=False)
settings = Column(JSONB, default=dict)  # Contains client_name, etc.
```

**Settings JSON Structure**:
```json
{
  "client_name": "string",
  "description": "string",
  "target_audience": "string",
  "brand_voice": "string",
  "brand_voice_custom": "string",
  "key_messages": ["string"],
  "competitors": "string",
  "custom_notes": "string"
}
```

---

## New Pydantic Schemas

### ConversationListItem (for history display)

```python
class ConversationListItem(BaseModel):
    id: UUID
    title: Optional[str]
    summary: Optional[str]
    message_count: int
    last_message_at: Optional[datetime]
    created_at: datetime

    class Config:
        from_attributes = True
```

### ConversationListResponse (paginated)

```python
class ConversationListResponse(BaseModel):
    items: List[ConversationListItem]
    total: int
    page: int
    page_size: int
    has_more: bool
```

### ActivityLogItem (for activity display)

```python
class ActivityLogItem(BaseModel):
    id: UUID
    entity_type: str
    entity_id: UUID
    action: str
    actor_type: str
    user_id: Optional[UUID]
    changes: Optional[dict]
    created_at: datetime

    # Enriched fields
    entity_title: Optional[str]  # Document/folder name
    user_name: Optional[str]  # User display name

    class Config:
        from_attributes = True
```

---

## Entity Relationships

```
User (1) ──────────< (N) ChatConversation
                           │
Project (1) ───────────────┤
                           │
Workspace (1) ─────────────┘

Document (1) ──────< (N) ActivityLog
     │
     └── is_reference_asset: Boolean
         (determines Kanban vs Assets display)

Project.name <──sync── Project.settings.client_name
```

---

## Data Flow

### Conversation History Flow
```
1. User sends message
2. Chat endpoint processes → returns response
3. Save to ChatConversation.messages_json (append)
4. Update message_count, last_message_at
5. Frontend fetches list via GET /conversations
6. User selects → load full messages_json
```

### Kanban Filter Flow
```
1. Fetch documents for project
2. Filter: status matches column AND is_reference_asset != true
3. Display only work documents
```

### Project Name Sync Flow
```
1. User updates client_name in settings
2. PUT /projects/{id}/settings
3. Backend also updates project.name = client_name
4. Response includes updated project
5. Frontend refreshes sidebar/header
```
