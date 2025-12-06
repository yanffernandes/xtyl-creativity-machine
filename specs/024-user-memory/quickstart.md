# Feature 024: User Memory System - Quickstart

---

## Prerequisites

- PostgreSQL with pgvector extension enabled
- Python 3.11+
- Node.js 18+
- OpenRouter API key (for embeddings and extraction)

## Database Setup

### 1. Run Migration

```bash
# From repository root
cd backend
psql $DATABASE_URL -f migrations/025_create_user_memories.sql
```

### 2. Verify pgvector Extension

```sql
-- Check if pgvector is enabled
SELECT * FROM pg_extension WHERE extname = 'vector';

-- If not, enable it (requires superuser)
CREATE EXTENSION IF NOT EXISTS vector;
```

### 3. Verify Table Creation

```sql
-- Check table exists
\d user_memories

-- Check indexes
\di+ idx_user_memories_*
```

## Backend Development

### 1. Install Dependencies

```bash
cd backend
pip install pgvector-sqlalchemy  # If not already installed
```

### 2. Start Backend

```bash
# Using dev script
./dev.sh backend

# Or directly
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

### 3. Test API Endpoints

```bash
# Get project memories
curl -H "Authorization: Bearer $TOKEN" \
  http://localhost:8000/projects/{project_id}/memories

# Create memory manually
curl -X POST -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"content": "Test memory", "category": "preference"}' \
  http://localhost:8000/projects/{project_id}/memories

# Search memories
curl -X POST -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"query": "preferences"}' \
  http://localhost:8000/projects/{project_id}/memories/search
```

## Frontend Development

### 1. Start Frontend

```bash
cd frontend
npm run dev
```

### 2. Access Memory UI

1. Open a project
2. Go to AI Assistant chat
3. Click the 3-dot menu (⋮)
4. Select "Memories"

## Testing Memory Extraction

### 1. Send a Chat Message with Personal Info

```
"Hi, my name is John and I work as a software engineer at Acme Corp."
```

### 2. Wait for Extraction (async)

The system extracts memories after the response is sent. Check backend logs:

```
INFO: Extracted 2 facts from conversation
INFO: Memory ADD: "Name is John"
INFO: Memory ADD: "Works as software engineer at Acme Corp"
```

### 3. Verify in Database

```sql
SELECT id, content, category, created_at
FROM user_memories
WHERE user_id = 'your-user-id'
ORDER BY created_at DESC;
```

## Admin Configuration

### Set Extraction Model

```sql
-- View current model
SELECT value FROM system_config WHERE key = 'memory_extraction_model';

-- Update model
UPDATE system_config
SET value = '"openai/gpt-4o-mini"'
WHERE key = 'memory_extraction_model';
```

### Enable/Disable Memory System

```sql
-- Disable globally
UPDATE system_config
SET value = 'false'
WHERE key = 'memory_system_enabled';

-- Re-enable
UPDATE system_config
SET value = 'true'
WHERE key = 'memory_system_enabled';
```

## Debugging

### Check Memory Service Logs

```python
# In memory_service.py, enable debug logging
import logging
logging.getLogger('memory_service').setLevel(logging.DEBUG)
```

### Test Extraction Prompt

```python
# Interactive test
from services.memory_service import MemoryService

service = MemoryService()
facts = await service.extract_facts([
    {"role": "user", "content": "I prefer dark mode and hate meetings"}
])
print(facts)  # ["Prefers dark mode", "Dislikes meetings"]
```

### Test Vector Search

```python
from services.memory_service import MemoryService

service = MemoryService()
memories = await service.search(
    query="work preferences",
    user_id="...",
    project_id="...",
    limit=5
)
for m in memories:
    print(f"{m.category}: {m.content}")
```

## Common Issues

### 1. pgvector Not Installed

```
ERROR: type "vector" does not exist
```

**Solution**: Enable the extension:
```sql
CREATE EXTENSION IF NOT EXISTS vector;
```

### 2. Embedding Generation Fails

```
ERROR: OpenAI API error
```

**Solution**: Check `OPENROUTER_API_KEY` in `.env`

### 3. Memory Limit Reached

```
ERROR: Maximum memories (100) reached for this project
```

**Solution**: User needs to delete some memories or admin increases limit in system_config.

## Performance Tuning

### Optimize Vector Search

```sql
-- Adjust probes for accuracy vs speed
SET ivfflat.probes = 10;  -- Default
SET ivfflat.probes = 20;  -- More accurate, slower
SET ivfflat.probes = 5;   -- Faster, less accurate
```

### Monitor Query Performance

```sql
EXPLAIN ANALYZE
SELECT id, content
FROM user_memories
WHERE user_id = '...' AND project_id = '...'
ORDER BY embedding <=> '[...]'::vector
LIMIT 5;
```

## Memory Categories

| Category | Icon | Description |
|----------|------|-------------|
| personal | 👤 | Name, relationships, dates |
| professional | 💼 | Work, career, company |
| preference | 🎯 | Likes, preferences |
| plan | 📅 | Plans, goals, events |
| health | 💪 | Health, diet, fitness |
| other | 📝 | Other |
