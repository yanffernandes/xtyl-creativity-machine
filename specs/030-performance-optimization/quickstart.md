# Quickstart: Performance Optimization

**Feature**: 030-performance-optimization
**Date**: 2026-01-25

## Prerequisites

- [ ] Redis server running (local: `docker run -d -p 6379:6379 redis:7-alpine`)
- [ ] Database access for migration
- [ ] Feature branch: `030-performance-optimization`

---

## Implementation Order

### Phase 1: Database Indexes (Backend) - 15min

1. Create migration file:
   ```bash
   touch supabase/migrations/034_performance_indexes.sql
   ```

2. Add indexes (copy from `data-model.md`):
   ```sql
   CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_documents_context
   ON documents(project_id, is_context) WHERE deleted_at IS NULL;
   -- ... (see data-model.md for full SQL)
   ```

3. Apply migration:
   ```bash
   supabase db push
   ```

---

### Phase 2: React Query Configuration (Frontend) - 30min

1. Update QueryClient defaults in `_app.tsx` or provider:
   ```typescript
   const queryClient = new QueryClient({
     defaultOptions: {
       queries: {
         gcTime: 30 * 60 * 1000,  // 30 minutes
         staleTime: 15000,         // 15 seconds
       },
     },
   })
   ```

2. Consolidate query keys - update imports in all hooks:
   ```typescript
   // Before
   import { documentKeys } from '@/hooks/use-documents'

   // After
   import { queryKeys } from '@/lib/query-keys'
   ```

3. Update invalidation calls:
   ```typescript
   // Before
   queryClient.invalidateQueries({ queryKey: documentKeys.lists() })

   // After
   queryClient.invalidateQueries({ queryKey: queryKeys.documents.byProject(projectId) })
   ```

---

### Phase 3: Component Memoization (Frontend) - 1hr

1. Add memo to VariationCard:
   ```typescript
   // frontend/src/components/image-studio/VariationCard.tsx
   import { memo } from 'react'

   const VariationCard = memo(function VariationCard(props: VariationCardProps) {
     // existing implementation
   })

   export default VariationCard
   ```

2. Repeat for:
   - `StylePresetCard.tsx`
   - `DocumentFilters.tsx`

---

### Phase 4: UI Store (Frontend) - 1hr

1. Create store file:
   ```bash
   touch frontend/src/lib/stores/ui-store.ts
   ```

2. Implement store (see `data-model.md` for full schema):
   ```typescript
   import { create } from 'zustand'

   export const useUIStore = create<UIStore>((set) => ({
     modals: {
       assets: false,
       // ... all modal states
     },
     openModal: (name) => set((state) => ({
       modals: { ...state.modals, [name]: true }
     })),
     closeModal: (name) => set((state) => ({
       modals: { ...state.modals, [name]: false }
     })),
     // ... rest of implementation
   }))
   ```

3. Migrate page.tsx modal states to store (remove useState, use selectors)

---

### Phase 5: Redis Service (Backend) - 2hr

1. Add dependencies:
   ```bash
   cd backend && pip install redis aioredis
   echo "redis>=4.5.0" >> requirements.txt
   ```

2. Create service file:
   ```bash
   touch backend/services/redis_service.py
   ```

3. Implement (see `contracts/redis-keys.md` for full implementation):
   ```python
   import redis.asyncio as redis
   import os

   _redis_client = None

   async def get_redis():
       global _redis_client
       if _redis_client is None:
           _redis_client = await redis.from_url(
               os.getenv("REDIS_URL", "redis://localhost:6379/0")
           )
       return _redis_client
   ```

4. Update `image_generation.py` to use Redis for batch progress

---

### Phase 6: Rate Limiting (Backend) - 1hr

1. Add semaphore to batch generation:
   ```python
   # In image_generation.py
   FAL_SEMAPHORE = asyncio.Semaphore(3)

   async def generate_with_limit(params):
       async with FAL_SEMAPHORE:
           return await call_fal_api(params)
   ```

2. Update batch endpoint to use semaphore

---

### Phase 7: Virtualization (Frontend) - 1hr

1. Install dependency:
   ```bash
   cd frontend && npm install @tanstack/react-virtual
   ```

2. Update VariationGrid:
   ```typescript
   import { useVirtualizer } from '@tanstack/react-virtual'

   const virtualizer = useVirtualizer({
     count: images.length,
     getScrollElement: () => scrollRef.current,
     estimateSize: () => 200,
     overscan: 5,
   })
   ```

---

### Phase 8: Docker Compose (DevOps) - 15min

1. Add Redis service to `docker-compose.yml`:
   ```yaml
   services:
     redis:
       image: redis:7-alpine
       ports:
         - "6379:6379"
       healthcheck:
         test: ["CMD", "redis-cli", "ping"]
         interval: 10s
         timeout: 5s
         retries: 5
   ```

2. Add `REDIS_URL` to backend environment

---

## Verification Checklist

### Frontend
- [ ] Navigation between views uses cached data (no loading spinner)
- [ ] React DevTools shows <5 re-renders on modal open
- [ ] Image grid scrolls smoothly with 50+ items
- [ ] Console shows gcTime applied (check React Query devtools)

### Backend
- [ ] EXPLAIN ANALYZE shows index usage on document queries
- [ ] Redis stores batch progress (`redis-cli KEYS "batch:*"`)
- [ ] No rate limit errors during 10-image batch
- [ ] Thumbnails generated asynchronously (response returns before thumbnail ready)

### Performance
- [ ] Sentry shows improved transaction times
- [ ] Lighthouse performance score improved
- [ ] Document list loads in <2s with 100+ items

---

## Rollback

If issues arise:

1. **Query keys**: Revert imports, keep both key systems temporarily
2. **Indexes**: `DROP INDEX CONCURRENTLY idx_...` (non-blocking)
3. **Redis**: Fall back to in-memory dict (existing code path)
4. **Virtualization**: Remove virtualizer, render all items

---

## Resources

- [React Query gcTime docs](https://tanstack.com/query/latest/docs/react/guides/caching)
- [Redis Hashes](https://redis.io/docs/data-types/hashes/)
- [TanStack Virtual](https://tanstack.com/virtual/latest)
- [Zustand selectors](https://docs.pmnd.rs/zustand/guides/prevent-rerenders-with-use-shallow)
