# Feature 024: User Memory System - Data Model

## Database Schema

### Table: `user_memories`

Armazena memórias extraídas das conversas do usuário.

```sql
CREATE TABLE user_memories (
    -- Primary key
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- Foreign keys (escopo da memória)
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    project_id VARCHAR NOT NULL REFERENCES projects(id) ON DELETE CASCADE,

    -- Memory content
    content TEXT NOT NULL,
    content_hash VARCHAR(64) NOT NULL, -- SHA-256 hash para deduplicação

    -- Vector embedding (OpenAI text-embedding-3-small = 1536 dimensions)
    embedding vector(1536),

    -- Categorização
    category VARCHAR(50) DEFAULT 'other',
    -- Valores: 'personal', 'professional', 'preference', 'plan', 'health', 'other'

    -- Rastreamento de origem
    source_conversation_id VARCHAR REFERENCES chat_conversations(id) ON DELETE SET NULL,

    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,

    -- Constraints
    CONSTRAINT unique_user_project_memory_hash UNIQUE (user_id, project_id, content_hash),
    CONSTRAINT valid_category CHECK (category IN ('personal', 'professional', 'preference', 'plan', 'health', 'other'))
);

-- Comentários
COMMENT ON TABLE user_memories IS 'Stores extracted facts about users from chat conversations';
COMMENT ON COLUMN user_memories.content_hash IS 'SHA-256 hash of content for deduplication';
COMMENT ON COLUMN user_memories.embedding IS 'Vector embedding for semantic search (1536 dims)';
COMMENT ON COLUMN user_memories.category IS 'Category of memory for filtering';
```

### Indexes

```sql
-- Composite index for user+project queries (most common)
CREATE INDEX idx_user_memories_user_project
    ON user_memories(user_id, project_id);

-- Vector similarity search index (IVFFlat for large datasets)
CREATE INDEX idx_user_memories_embedding
    ON user_memories USING ivfflat (embedding vector_cosine_ops)
    WITH (lists = 100);

-- Category filtering
CREATE INDEX idx_user_memories_category
    ON user_memories(category);

-- Timestamp for ordering
CREATE INDEX idx_user_memories_updated_at
    ON user_memories(updated_at DESC);

-- Hash lookup for deduplication
CREATE INDEX idx_user_memories_hash
    ON user_memories(content_hash);
```

### Row Level Security (RLS)

```sql
-- Enable RLS
ALTER TABLE user_memories ENABLE ROW LEVEL SECURITY;

-- Policy: Users can only access their own memories
CREATE POLICY user_memories_user_access ON user_memories
    FOR ALL
    USING (user_id = auth.uid());

-- Policy: Service role can access all (for admin operations)
CREATE POLICY user_memories_service_access ON user_memories
    FOR ALL
    USING (auth.role() = 'service_role');
```

## SQLAlchemy Model

```python
# backend/models.py

from sqlalchemy import Column, String, Text, DateTime, ForeignKey, CheckConstraint
from sqlalchemy.dialects.postgresql import UUID, ARRAY
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from pgvector.sqlalchemy import Vector
import uuid

class UserMemory(Base):
    """
    User Memory model - stores extracted facts from conversations.
    Memories are scoped to user + project for isolation.
    """
    __tablename__ = "user_memories"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    project_id = Column(String, ForeignKey("projects.id", ondelete="CASCADE"), nullable=False, index=True)

    # Content
    content = Column(Text, nullable=False)
    content_hash = Column(String(64), nullable=False)

    # Vector embedding (1536 dimensions for text-embedding-3-small)
    embedding = Column(Vector(1536))

    # Categorization
    category = Column(String(50), default="other")

    # Source tracking
    source_conversation_id = Column(String, ForeignKey("chat_conversations.id", ondelete="SET NULL"), nullable=True)

    # Timestamps
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)

    # Relationships
    user = relationship("User", backref="memories")
    project = relationship("Project", backref="memories")
    source_conversation = relationship("ChatConversation", backref="extracted_memories")

    # Constraints
    __table_args__ = (
        CheckConstraint(
            "category IN ('personal', 'professional', 'preference', 'plan', 'health', 'other')",
            name="valid_category"
        ),
    )

    def __repr__(self):
        return f"<UserMemory(id={self.id}, user_id={self.user_id}, content={self.content[:50]}...)>"
```

## Pydantic Schemas

```python
# backend/schemas/memory.py

from pydantic import BaseModel, Field
from typing import Optional, List, Literal
from datetime import datetime
from uuid import UUID

MemoryCategory = Literal['personal', 'professional', 'preference', 'plan', 'health', 'other']

class MemoryBase(BaseModel):
    content: str = Field(..., min_length=1, max_length=2000)
    category: MemoryCategory = "other"

class MemoryCreate(MemoryBase):
    """Schema for creating a memory manually"""
    pass

class MemoryUpdate(BaseModel):
    """Schema for updating a memory"""
    content: Optional[str] = Field(None, min_length=1, max_length=2000)
    category: Optional[MemoryCategory] = None

class MemoryResponse(MemoryBase):
    """Schema for memory response"""
    id: UUID
    user_id: UUID
    project_id: str
    source_conversation_id: Optional[str] = None
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True

class MemoryListResponse(BaseModel):
    """Schema for listing memories"""
    memories: List[MemoryResponse]
    total: int
    page: int
    per_page: int

class MemorySearchRequest(BaseModel):
    """Schema for searching memories"""
    query: str = Field(..., min_length=1)
    limit: int = Field(5, ge=1, le=20)
    category: Optional[MemoryCategory] = None

class MemorySearchResponse(BaseModel):
    """Schema for search results"""
    memories: List[MemoryResponse]
    query: str

# Internal schemas for extraction/update process
class ExtractedFact(BaseModel):
    """A single extracted fact"""
    content: str
    category: MemoryCategory = "other"

class FactExtractionResult(BaseModel):
    """Result from fact extraction LLM"""
    facts: List[str]

class MemoryOperation(BaseModel):
    """Single memory operation from update LLM"""
    id: str
    text: str
    event: Literal["ADD", "UPDATE", "DELETE", "NONE"]
    old_memory: Optional[str] = None

class MemoryUpdateResult(BaseModel):
    """Result from memory update LLM"""
    memory: List[MemoryOperation]
```

## TypeScript Types

```typescript
// frontend/src/types/memory.ts

export type MemoryCategory = 'personal' | 'professional' | 'preference' | 'plan' | 'health' | 'other';

export interface UserMemory {
  id: string;
  user_id: string;
  project_id: string;
  content: string;
  category: MemoryCategory;
  source_conversation_id?: string;
  created_at: string;
  updated_at: string;
}

export interface MemoryCreate {
  content: string;
  category?: MemoryCategory;
}

export interface MemoryUpdate {
  content?: string;
  category?: MemoryCategory;
}

export interface MemoryListResponse {
  memories: UserMemory[];
  total: number;
  page: number;
  per_page: number;
}

export interface MemorySearchRequest {
  query: string;
  limit?: number;
  category?: MemoryCategory;
}

export interface MemorySearchResponse {
  memories: UserMemory[];
  query: string;
}

// Category metadata for UI
export const MEMORY_CATEGORIES: Record<MemoryCategory, { label: string; icon: string; color: string }> = {
  personal: { label: 'Personal', icon: '👤', color: 'blue' },
  professional: { label: 'Professional', icon: '💼', color: 'purple' },
  preference: { label: 'Preferences', icon: '🎯', color: 'green' },
  plan: { label: 'Plans', icon: '📅', color: 'orange' },
  health: { label: 'Health', icon: '💪', color: 'red' },
  other: { label: 'Other', icon: '📝', color: 'gray' },
};
```

## System Config Updates

```sql
-- Adicionar configurações de memória no system_config
INSERT INTO system_config (key, value, description, category) VALUES
(
    'memory_extraction_model',
    '"openai/gpt-4.1-nano"',
    'LLM model used for extracting and managing user memories',
    'ai_models'
),
(
    'memory_system_enabled',
    'true',
    'Enable/disable the user memory system globally',
    'features'
),
(
    'memory_max_per_user_project',
    '100',
    'Maximum number of memories per user per project',
    'limits'
);
```

## Migration File

```sql
-- backend/migrations/024_create_user_memories.sql

-- Enable pgvector if not already enabled
CREATE EXTENSION IF NOT EXISTS vector;

-- Create user_memories table
CREATE TABLE IF NOT EXISTS user_memories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    project_id VARCHAR NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    content_hash VARCHAR(64) NOT NULL,
    embedding vector(1536),
    category VARCHAR(50) DEFAULT 'other',
    source_conversation_id VARCHAR REFERENCES chat_conversations(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    CONSTRAINT unique_user_project_memory_hash UNIQUE (user_id, project_id, content_hash),
    CONSTRAINT valid_category CHECK (category IN ('personal', 'professional', 'preference', 'plan', 'health', 'other'))
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_user_memories_user_project ON user_memories(user_id, project_id);
CREATE INDEX IF NOT EXISTS idx_user_memories_category ON user_memories(category);
CREATE INDEX IF NOT EXISTS idx_user_memories_updated_at ON user_memories(updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_user_memories_hash ON user_memories(content_hash);

-- Create vector index (IVFFlat)
CREATE INDEX IF NOT EXISTS idx_user_memories_embedding
    ON user_memories USING ivfflat (embedding vector_cosine_ops)
    WITH (lists = 100);

-- Enable RLS
ALTER TABLE user_memories ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
DROP POLICY IF EXISTS user_memories_user_access ON user_memories;
CREATE POLICY user_memories_user_access ON user_memories
    FOR ALL
    USING (user_id = auth.uid());

DROP POLICY IF EXISTS user_memories_service_access ON user_memories;
CREATE POLICY user_memories_service_access ON user_memories
    FOR ALL
    USING (auth.role() = 'service_role');

-- Add system config entries
INSERT INTO system_config (key, value, description, category)
VALUES
    ('memory_extraction_model', '"openai/gpt-4.1-nano"', 'LLM model used for extracting and managing user memories', 'ai_models'),
    ('memory_system_enabled', 'true', 'Enable/disable the user memory system globally', 'features'),
    ('memory_max_per_user_project', '100', 'Maximum number of memories per user per project', 'limits')
ON CONFLICT (key) DO NOTHING;

-- Update timestamp trigger
CREATE OR REPLACE FUNCTION update_user_memories_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_user_memories_updated_at ON user_memories;
CREATE TRIGGER trigger_update_user_memories_updated_at
    BEFORE UPDATE ON user_memories
    FOR EACH ROW
    EXECUTE FUNCTION update_user_memories_updated_at();
```

## Data Flow Diagram

```
┌────────────────────────────────────────────────────────────────┐
│                     USER MEMORY DATA FLOW                       │
└────────────────────────────────────────────────────────────────┘

WRITE PATH (Extraction):
──────────────────────────

User Message ──▶ Chat Service ──▶ LLM Response
                      │
                      ▼ (async)
              Memory Service
                      │
                      ├──▶ Fact Extraction LLM ──▶ {"facts": [...]}
                      │
                      ├──▶ Fetch Existing Memories (user_id + project_id)
                      │
                      ├──▶ Memory Update LLM ──▶ {ADD/UPDATE/DELETE}
                      │
                      └──▶ Apply Operations to DB
                                │
                                ├── ADD: Insert new row + embedding
                                ├── UPDATE: Update content + re-embed
                                └── DELETE: Remove row


READ PATH (Retrieval):
──────────────────────────

User Message ──▶ Memory Service
                      │
                      ├──▶ Generate embedding for query
                      │
                      ├──▶ Vector similarity search (pgvector)
                      │         SELECT * FROM user_memories
                      │         WHERE user_id = ? AND project_id = ?
                      │         ORDER BY embedding <=> query_embedding
                      │         LIMIT 5
                      │
                      └──▶ Return relevant memories
                                │
                                ▼
                      Inject into System Prompt
                                │
                                ▼
                           LLM Response
```

## Query Examples

### Insert Memory with Embedding

```sql
INSERT INTO user_memories (user_id, project_id, content, content_hash, embedding, category)
VALUES (
    $1,  -- user_id
    $2,  -- project_id
    $3,  -- content
    encode(sha256($3::bytea), 'hex'),  -- content_hash
    $4,  -- embedding (vector)
    $5   -- category
)
ON CONFLICT (user_id, project_id, content_hash) DO UPDATE
SET content = EXCLUDED.content,
    embedding = EXCLUDED.embedding,
    category = EXCLUDED.category,
    updated_at = NOW();
```

### Vector Similarity Search

```sql
SELECT
    id,
    content,
    category,
    updated_at,
    1 - (embedding <=> $1) as similarity
FROM user_memories
WHERE user_id = $2
  AND project_id = $3
  AND embedding IS NOT NULL
ORDER BY embedding <=> $1
LIMIT $4;
```

### Get User Memories with Pagination

```sql
SELECT *
FROM user_memories
WHERE user_id = $1
  AND project_id = $2
ORDER BY updated_at DESC
LIMIT $3 OFFSET $4;
```

### Count by Category

```sql
SELECT category, COUNT(*) as count
FROM user_memories
WHERE user_id = $1
  AND project_id = $2
GROUP BY category;
```
