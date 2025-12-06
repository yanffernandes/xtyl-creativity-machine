# Feature 024: User Memory System - Research

## Research Questions

1. How does mem0 implement fact extraction and memory updates?
2. What are the best practices for pgvector index configuration?
3. How to implement async memory extraction without blocking chat responses?
4. How to automatically categorize extracted facts?

---

## 1. mem0 Implementation Analysis

### Source: mem0ai/mem0 Repository

**Fact Extraction Approach**

mem0 uses a two-phase approach:

1. **Phase 1: Fact Extraction** (`FACT_RETRIEVAL_PROMPT`)
   - Extracts atomic facts from user messages only (not assistant messages)
   - Returns JSON format: `{"facts": ["fact1", "fact2", ...]}`
   - Categories: personal preferences, personal details, plans, professional info, health, misc
   - Detects language and returns facts in same language

2. **Phase 2: Memory Management** (`DEFAULT_UPDATE_MEMORY_PROMPT`)
   - Compares extracted facts with existing memories
   - Determines operations: ADD, UPDATE, DELETE, NONE
   - ADD: New fact not present in memory
   - UPDATE: Same topic with more/different details (keeps ID)
   - DELETE: Contradicts existing memory
   - NONE: Already exists or irrelevant

**Key Prompts (from mem0/configs/prompts.py)**

```python
# Fact extraction focuses on:
# 1. Personal Preferences (likes, dislikes)
# 2. Personal Details (names, relationships, dates)
# 3. Plans and Intentions (events, trips, goals)
# 4. Activity Preferences (dining, travel, hobbies)
# 5. Health and Wellness (dietary, fitness)
# 6. Professional Details (job, career)
# 7. Miscellaneous (books, movies, brands)

# IMPORTANT: Only extract from USER messages
# IMPORTANT: Return facts in same language as input
```

**Memory Update Logic**

- Uses content hashing for deduplication
- Stores embeddings for semantic search
- Supports concurrent vector and graph operations (graph optional)

**Decision**: Replicate mem0's two-phase approach with similar prompts, adapted for Portuguese/English bilingual support.

---

## 2. pgvector Best Practices

### Index Types

| Type | Best For | Pros | Cons |
|------|----------|------|------|
| IVFFlat | <1M rows | Fast build, good recall | Requires tuning `lists` parameter |
| HNSW | >1M rows | Best recall, no warm-up | Slower build, more memory |

### Configuration for Our Scale

Expected: ~1000 memories per active user, ~10,000 total memories initially.

**Recommendation: IVFFlat with 100 lists**

```sql
CREATE INDEX idx_user_memories_embedding
ON user_memories USING ivfflat (embedding vector_cosine_ops)
WITH (lists = 100);
```

**Rationale**:
- `lists = sqrt(n)` where n = expected rows (10,000 → 100)
- Cosine distance for semantic similarity
- Can be recreated with HNSW if scale exceeds expectations

### Query Optimization

```sql
-- Set probes before query (higher = more accurate, slower)
SET ivfflat.probes = 10;

-- Efficient search query
SELECT id, content, 1 - (embedding <=> query_embedding) as similarity
FROM user_memories
WHERE user_id = $1 AND project_id = $2
ORDER BY embedding <=> query_embedding
LIMIT 5;
```

**Decision**: Use IVFFlat with 100 lists, cosine similarity, probes = 10 for balance of speed/accuracy.

---

## 3. Async Extraction Pattern

### Options Evaluated

| Pattern | Pros | Cons |
|---------|------|------|
| `asyncio.create_task()` | Simple, immediate | May be lost on crash |
| Background worker (Celery/RQ) | Persistent, retries | Overkill for this use case |
| Database queue | Persistent | Complex implementation |

### Recommended Pattern

```python
async def process_chat_with_memory(message, user_id, project_id, conversation_id):
    # 1. Search relevant memories (blocking, fast)
    memories = await memory_service.search(message, user_id, project_id)

    # 2. Build system prompt with memories
    system_prompt = build_system_prompt_with_memories(memories)

    # 3. Get LLM response (streaming)
    response = await generate_response(message, system_prompt)

    # 4. Extract memories AFTER response sent (non-blocking)
    asyncio.create_task(
        memory_service.extract_and_save(message, user_id, project_id, conversation_id)
    )

    return response
```

**Error Handling**

```python
async def extract_and_save(...):
    try:
        facts = await extract_facts(messages)
        if facts:
            await process_and_save_memories(facts, user_id, project_id)
    except Exception as e:
        # Log error but don't propagate (user already got response)
        logger.error(f"Memory extraction failed: {e}")
```

**Decision**: Use `asyncio.create_task()` with error suppression. Simple, effective, no external dependencies.

---

## 4. Memory Categorization

### Options Evaluated

| Approach | Pros | Cons |
|----------|------|------|
| LLM-based | Accurate, context-aware | Extra API call, cost |
| Rule-based | Fast, free | Less accurate |
| Hybrid | Best of both | Complex |

### Recommended: LLM-based with Few-Shot Examples

Include categorization in the fact extraction prompt:

```python
FACT_EXTRACTION_WITH_CATEGORY_PROMPT = """
...extract facts...

For each fact, also determine the category:
- personal: names, relationships, personal dates, family
- professional: job, career, company, work habits
- preference: likes, dislikes, favorites
- plan: goals, intentions, upcoming events
- health: diet, fitness, medical
- other: anything else

Output format:
{
  "facts": [
    {"content": "fact text", "category": "personal"},
    {"content": "another fact", "category": "preference"}
  ]
}
"""
```

**Decision**: Combine extraction and categorization in single LLM call to minimize API costs.

---

## 5. Embedding Model Selection

### Current System

Already using OpenAI embeddings via OpenRouter for RAG:
- Model: `text-embedding-3-small`
- Dimensions: 1536
- Configured in `rag_service.py`

### Decision

Reuse existing embedding infrastructure:
- No additional configuration needed
- Consistent with document embeddings
- Cost-effective (already paying for it)

---

## 6. Model Selection for Extraction

### mem0 Default

mem0 uses `gpt-4.1-nano` - a cost-optimized model for simple extraction tasks.

### Our Approach

Make model configurable via admin panel:

```python
# Default model in system_config
memory_extraction_model = "openai/gpt-4.1-nano"

# Admin can change to:
# - openai/gpt-4o-mini (better accuracy)
# - anthropic/claude-3-haiku (alternative)
# - any model available via OpenRouter
```

**Decision**: Default to `gpt-4.1-nano`, admin-configurable for flexibility.

---

## Summary of Decisions

| Topic | Decision | Rationale |
|-------|----------|-----------|
| Extraction Approach | Two-phase (extract → update) | Proven by mem0, handles contradictions |
| Vector Index | IVFFlat, 100 lists | Appropriate for expected scale |
| Async Pattern | `asyncio.create_task()` | Simple, no external deps |
| Categorization | In-prompt with LLM | Single API call, accurate |
| Embedding Model | text-embedding-3-small | Already in use for RAG |
| Extraction Model | gpt-4.1-nano (configurable) | Cost-effective, admin can override |
| Memory Limit | 100 per user/project | Prevent abuse, manageable scale |
| Similarity Metric | Cosine distance | Standard for semantic search |

---

## References

- [mem0 GitHub Repository](https://github.com/mem0ai/mem0)
- [mem0 prompts.py](https://github.com/mem0ai/mem0/blob/main/mem0/configs/prompts.py)
- [pgvector Documentation](https://github.com/pgvector/pgvector)
- [pgvector Index Selection](https://github.com/pgvector/pgvector#indexing)
- [OpenAI Embeddings Guide](https://platform.openai.com/docs/guides/embeddings)
