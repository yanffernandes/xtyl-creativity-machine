# Implementation Plan: User Memory System

**Branch**: `024-user-memory` | **Date**: 2025-12-06 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification for User Memory System

## Summary

Sistema de memória persistente para usuários, inspirado no mem0, que permite ao assistente de IA lembrar informações importantes sobre o usuário dentro do contexto de um projeto. O sistema extrai automaticamente fatos relevantes das conversas e os usa para personalizar respostas futuras.

## Technical Context

**Language/Version**: Python 3.11 (Backend), TypeScript 5.x (Frontend)
**Primary Dependencies**: FastAPI, SQLAlchemy, Next.js 14, React 18, Shadcn/UI, pgvector
**Storage**: Supabase PostgreSQL with pgvector extension
**Target Platform**: Linux server (Docker), Web browsers
**Project Type**: Web application (frontend + backend)
**Performance Goals**: Memory search <100ms, chat response streaming <2s TTFB
**Constraints**: Max 100 memories per user/project, async extraction (non-blocking)

## Constitution Check

| Principle | Status | Notes |
|-----------|--------|-------|
| I. AI-First Development | ✅ PASS | Memory system enhances AI capabilities with user context |
| II. API-First Architecture | ✅ PASS | New endpoints follow REST patterns with OpenAPI docs |
| III. User Experience Excellence | ✅ PASS | MemoryDrawer provides elegant management UI |
| IV. Production-Ready Deployments | ✅ PASS | Docker-compatible, health checks maintained |
| V. Data Integrity & Security | ✅ PASS | RLS policies, user isolation |
| VI. Scalability & Performance | ✅ PASS | Async extraction, vector indexes, pagination |
| VII. Testing & Quality Assurance | ✅ PASS | Unit, integration tests planned |

## Project Structure

### Documentation (this feature)

```text
specs/024-user-memory/
├── plan.md              # This file
├── spec.md              # User Memory feature specification
├── data-model.md        # Database schema and models
├── quickstart.md        # Setup guide
├── contracts/           # API contracts
│   └── memory-api.yaml  # Memory endpoints OpenAPI
└── tasks.md             # Implementation tasks
```

### Source Code (repository root)

```text
backend/
├── routers/
│   └── memories.py          # Memory CRUD endpoints
├── services/
│   └── memory_service.py    # Memory extraction & search
├── models.py                # UserMemory model
├── schemas.py               # Memory Pydantic schemas
├── prompts/
│   └── memory_prompts.py    # Extraction prompts
└── migrations/
    └── 025_create_user_memories.sql  # Memory table

frontend/
├── src/
│   ├── components/
│   │   └── memories/
│   │       ├── MemoryDrawer.tsx    # Memory management UI
│   │       └── MemoryCard.tsx      # Individual memory display
│   ├── hooks/
│   │   └── useMemories.ts          # Memory API hooks
│   └── types/
│       └── memory.ts               # TypeScript types
```

## Research Summary

### 1. Embedding Model
**Decision**: text-embedding-3-small (1536 dimensions)
**Rationale**: Good quality/cost ratio, compatible with existing pgvector setup
**Alternative Rejected**: text-embedding-3-large (overkill for short facts)

### 2. Memory Update Strategy
**Decision**: LLM-based ADD/UPDATE/DELETE decisions (mem0 pattern)
**Rationale**: Handles contradictions and updates intelligently
**Alternative Rejected**: Simple append-only (doesn't handle "I moved to NYC" updating "I live in LA")

### 3. Vector Search Index
**Decision**: IVFFlat with 100 lists
**Rationale**: Good recall at this scale, faster than HNSW for small datasets
**Alternative Rejected**: HNSW (better for >100k vectors, more memory)

## Implementation Phases

### Phase 1: Database & Models

1. **Database Migration** (backend/migrations/025_create_user_memories.sql)
   - Create user_memories table with pgvector
   - Add indexes (user+project, vector, category)
   - Add RLS policies

2. **SQLAlchemy Model** (backend/models.py)
   - Add UserMemory model
   - Vector embedding column

3. **Pydantic Schemas** (backend/schemas.py)
   - MemoryCreate, MemoryUpdate, MemoryResponse
   - MemorySearchRequest, MemorySearchResponse

4. **System Config** (migration)
   - memory_extraction_model
   - memory_system_enabled
   - memory_max_per_user_project

### Phase 2: Memory Service

5. **Memory Service** (backend/services/memory_service.py)
   - `add()` - Create memory with embedding
   - `get()`, `list()`, `update()`, `delete()` - CRUD
   - `search()` - Vector similarity search
   - `extract_facts()` - LLM fact extraction
   - `process_facts_and_update()` - ADD/UPDATE/DELETE logic
   - `extract_and_save()` - Main entry point

6. **Prompts** (backend/prompts/memory_prompts.py)
   - FACT_EXTRACTION_PROMPT
   - MEMORY_UPDATE_PROMPT
   - Helper formatters

### Phase 3: API Endpoints

7. **Memory Router** (backend/routers/memories.py)
   - `GET /projects/{id}/memories` - List with pagination
   - `POST /projects/{id}/memories` - Create manual
   - `GET /projects/{id}/memories/{id}` - Get single
   - `PUT /projects/{id}/memories/{id}` - Update
   - `DELETE /projects/{id}/memories/{id}` - Delete single
   - `DELETE /projects/{id}/memories` - Delete all
   - `POST /projects/{id}/memories/search` - Vector search

8. **Chat Integration** (backend/routers/chat.py)
   - Search relevant memories before LLM call
   - Inject into system prompt
   - Extract memories after response (async)

### Phase 4: Frontend Components

9. **Types** (frontend/src/types/memory.ts)
   - UserMemory interface
   - MemoryCategory type
   - API request/response types

10. **Hooks** (frontend/src/hooks/useMemories.ts)
    - `useMemories()` - List with pagination
    - `useCreateMemory()` - Create mutation
    - `useUpdateMemory()` - Update mutation
    - `useDeleteMemory()` - Delete mutation
    - `useSearchMemories()` - Search query

11. **Components** (frontend/src/components/memories/)
    - `MemoryDrawer.tsx` - Side drawer with list
    - `MemoryCard.tsx` - Individual memory display
    - Category badges, edit mode, delete confirmation

12. **Integration** (ChatSidebar)
    - Add "Memories" menu item with Brain icon
    - Open MemoryDrawer on click

### Phase 5: Admin Configuration

13. **Admin Memory Config** (frontend/src/components/admin/)
    - Model selector dropdown
    - Enable/disable toggle
    - Statistics display

14. **Admin API** (backend/routers/admin.py)
    - `GET /admin/config/memory` - Get config
    - `PUT /admin/config/memory` - Update config

### Phase 6: Polish & i18n

15. **Translations** (frontend/src/messages/)
    - en.json - English strings
    - pt-BR.json - Portuguese strings

16. **Performance Optimization**
    - Async extraction (non-blocking)
    - Efficient vector queries
    - Proper error handling

---

## Data Model

See [data-model.md](./data-model.md) for complete schema including:
- `user_memories` table
- Indexes and constraints
- RLS policies
- SQLAlchemy model
- Pydantic schemas
- TypeScript types

## API Contracts

See [contracts/memory-api.yaml](./contracts/memory-api.yaml) for OpenAPI spec.

## Success Criteria

- [ ] Memory extraction works for user messages
- [ ] Relevant memories injected into system prompt
- [ ] Memory management UI functional
- [ ] Admin can configure extraction model
- [ ] <100ms memory search latency
- [ ] Max 100 memories per user/project enforced
- [ ] i18n support (EN, PT-BR)

---

**Next Step**: Run `/speckit.tasks` to generate detailed task list from this plan.
