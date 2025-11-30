# Research: Admin Panel

**Feature**: 015-admin-panel
**Date**: 2025-11-30
**Status**: Complete

## Research Questions

### RQ-001: How should super_admin role be implemented?

**Context**: The system needs a super_admin role separate from workspace-level roles (owner/admin/member).

**Decision**: Add `is_super_admin` boolean field to User model

**Rationale**:
- Simple boolean is more efficient than a separate roles table for a single system-level role
- Follows existing pattern where workspace roles are in WorkspaceUser junction table
- Easy to check with `current_user.is_super_admin`
- Allows future expansion to role-based permissions if needed

**Alternatives Considered**:
1. **Separate AdminRole table**: More complex, overkill for single role
2. **JSON roles array on User**: Flexible but harder to query/index
3. **User type enum (user/admin)**: Less extensible than boolean

---

### RQ-002: How should AI model configuration be stored?

**Context**: Need to store default models for 6+ different task types, plus list of visible models.

**Decision**: Create `system_config` table with category-based JSONB storage

**Rationale**:
- Single table for all system settings with `key` identifier
- JSONB `value` column for flexible schema
- Each config category (ai_models, limits, feature_flags) stored as separate row
- Easy to extend without migrations
- PostgreSQL JSONB supports indexing if needed

**Schema Design**:
```sql
system_config (
  id UUID PRIMARY KEY,
  key VARCHAR(100) UNIQUE NOT NULL,  -- 'ai_models', 'global_limits', 'feature_flags'
  value JSONB NOT NULL,               -- Flexible JSON for each category
  updated_at TIMESTAMP,
  updated_by UUID REFERENCES users(id)
)
```

**ai_models value structure**:
```json
{
  "defaults": {
    "chat": "openai/gpt-4-turbo",
    "embedding": "openai/text-embedding-3-small",
    "vision": "openai/gpt-4-turbo",
    "document_analysis": "openai/gpt-4-turbo",
    "image_generation": "openai/dall-e-3",
    "image_naming": "openai/gpt-3.5-turbo"
  },
  "fallbacks": {
    "chat": "openai/gpt-3.5-turbo",
    "embedding": "openai/text-embedding-ada-002",
    "vision": "anthropic/claude-3-sonnet",
    "document_analysis": "anthropic/claude-3-sonnet",
    "image_generation": "stabilityai/stable-diffusion-xl",
    "image_naming": "openai/gpt-3.5-turbo"
  },
  "visible_in_selector": [
    "openai/gpt-4-turbo",
    "openai/gpt-3.5-turbo",
    "anthropic/claude-3-opus",
    "anthropic/claude-3-sonnet"
  ]
}
```

**Alternatives Considered**:
1. **Separate AIModelConfig table per task type**: More normalized but requires 6+ table joins
2. **All in env vars**: Not dynamic, requires restart
3. **Workspace-level only**: Doesn't meet "system-wide" requirement

---

### RQ-003: How should services read model configuration?

**Context**: Services (llm_service, image_generation_service) currently use hardcoded defaults.

**Decision**: Create `ModelConfigService` that caches system config with TTL

**Rationale**:
- Single source of truth for model configuration
- Memory cache with 60-second TTL (matches user cache pattern)
- Fallback to hardcoded defaults if DB unavailable
- Immediate invalidation when admin updates config

**Implementation Pattern**:
```python
class ModelConfigService:
    _cache: Dict[str, Any] = {}
    _cache_time: float = 0
    _ttl: int = 60  # seconds

    @classmethod
    async def get_model(cls, task_type: str, db: Session) -> str:
        config = await cls._get_cached_config(db)
        model = config["defaults"].get(task_type)

        # Validate model is available
        if not await cls._validate_model(model):
            model = config["fallbacks"].get(task_type)

        return model or cls._hardcoded_fallback(task_type)

    @classmethod
    def invalidate_cache(cls):
        cls._cache = {}
```

**Alternatives Considered**:
1. **No caching**: Too many DB queries per request
2. **Redis cache**: Overkill for single config object
3. **Env-based fallback**: Less flexible, requires restart

---

### RQ-004: How should admin routes be protected?

**Context**: Need to restrict `/admin/*` routes to super_admin users only.

**Decision**: Create `require_admin` dependency function

**Rationale**:
- Follows existing `get_current_user` pattern
- Easy to compose: `Depends(require_admin)` includes user validation
- Clear separation of concerns
- Consistent error handling with HTTPException 403

**Implementation**:
```python
async def require_admin(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
) -> User:
    if not current_user.is_super_admin:
        raise HTTPException(
            status_code=403,
            detail="Admin access required"
        )
    return current_user
```

**Alternatives Considered**:
1. **Middleware**: Harder to test, less flexible for mixed routes
2. **Decorator**: Python decorators don't compose well with FastAPI
3. **Manual check in each endpoint**: Repetitive, error-prone

---

### RQ-005: How should audit logging be implemented?

**Context**: All admin actions must be logged for compliance and debugging.

**Decision**: Create `admin_audit_log` table with structured event logging

**Rationale**:
- Separate from existing `activity_log` (which tracks document changes)
- Captures: who, what, when, target, old_value, new_value
- JSONB for flexible payload storage
- Indexed by `created_at` for time-based queries

**Schema Design**:
```sql
admin_audit_log (
  id UUID PRIMARY KEY,
  admin_id UUID REFERENCES users(id),
  action VARCHAR(50) NOT NULL,      -- 'update_model_config', 'block_user', etc.
  entity_type VARCHAR(50),          -- 'user', 'workspace', 'system_config'
  entity_id VARCHAR(100),           -- Target entity ID
  old_value JSONB,                  -- State before change
  new_value JSONB,                  -- State after change
  ip_address VARCHAR(45),           -- For security audit
  created_at TIMESTAMP DEFAULT NOW()
)
```

**Alternatives Considered**:
1. **Extend ActivityLog**: Different purpose, would pollute existing data
2. **Event sourcing**: Complex, overkill for admin actions
3. **Simple text log file**: Not queryable, not persistent

---

### RQ-006: How should the first super_admin be created?

**Context**: No admin exists initially; need bootstrap mechanism.

**Decision**: SQL migration with environment variable for initial admin email

**Rationale**:
- Secure: admin email comes from env var, not hardcoded
- Idempotent: migration only runs once
- Automated: no manual CLI step required
- Auditable: part of migration history

**Implementation**:
```sql
-- 016_add_admin_tables.sql
-- First super_admin is set via INITIAL_ADMIN_EMAIL env var
-- Run: UPDATE users SET is_super_admin = true WHERE email = '${INITIAL_ADMIN_EMAIL}';
-- This is handled by a post-migration script or manual setup
```

**Post-migration CLI option**:
```bash
python -m backend.scripts.set_admin --email=admin@example.com
```

**Alternatives Considered**:
1. **Hardcoded email**: Security risk, inflexible
2. **First user auto-admin**: Security risk, race condition
3. **Invite system**: Chicken-and-egg problem for first admin

---

### RQ-007: What metrics should the dashboard display?

**Context**: Admin needs visibility into system health and usage.

**Decision**: Group metrics into 4 categories

**Metrics Categories**:

1. **User Metrics**:
   - Total users
   - Active users (last 30 days)
   - New users (this period)
   - Blocked users

2. **Workspace Metrics**:
   - Total workspaces
   - Active workspaces (last 30 days)
   - Average members per workspace

3. **AI Usage Metrics**:
   - Total tokens consumed (by period)
   - Tokens by model
   - API calls count
   - Error rate

4. **System Health**:
   - API response time (avg)
   - Error count (last 24h)
   - Active workflows

**Data Sources**:
- User/workspace metrics: Direct SQL aggregates
- AI usage: Aggregate from existing usage tracking or new tracking table
- System health: Application metrics or external monitoring

**Alternatives Considered**:
1. **External monitoring only (Datadog, etc.)**: Doesn't give admin easy access
2. **Comprehensive analytics**: Scope creep, can add later
3. **No dashboard**: Fails FR-026 to FR-030

---

### RQ-008: How should the frontend detect admin access?

**Context**: Frontend needs to show/hide admin menu and protect admin routes.

**Decision**: Extend auth store with `is_super_admin` field from `/auth/me` response

**Rationale**:
- Single source of truth from backend
- Cached in Zustand store for performance
- Admin layout checks store before rendering
- Server-side protection via API (frontend is just UX)

**Implementation**:
```typescript
// store.ts
interface AuthState {
  user: {
    id: string;
    email: string;
    full_name?: string;
    is_super_admin: boolean;  // NEW
  } | null;
}

// Admin layout
export default function AdminLayout({ children }) {
  const { user } = useAuthStore();

  if (!user?.is_super_admin) {
    redirect('/');  // Or show unauthorized page
  }

  return <AdminShell>{children}</AdminShell>;
}
```

**Alternatives Considered**:
1. **Separate admin auth flow**: Unnecessary complexity
2. **Client-side role check only**: Insecure
3. **JWT claims for role**: Would require Supabase custom claims setup

---

## Integration Findings

### Existing Code Patterns

1. **SQLAlchemy Models** (`backend/models.py`):
   - UUID primary keys
   - Relationship definitions with back_populates
   - Column types: String, Text, TIMESTAMP, Boolean, JSONB

2. **Pydantic Schemas** (`backend/schemas.py`):
   - `class Config: from_attributes = True` for ORM compatibility
   - Optional fields with `= None`
   - UUID fields use `from uuid import UUID`

3. **FastAPI Routes** (`backend/routers/*.py`):
   - Router with prefix and tags
   - Dependencies: `Depends(get_current_user)`, `Depends(get_db)`
   - Response models: `response_model=List[SchemaClass]`

4. **Frontend Hooks** (`frontend/src/hooks/*.ts`):
   - React Query for data fetching
   - Custom hooks pattern: `useXxx()` returns `{ data, isLoading, error }`
   - Mutations with `useMutation`

5. **UI Components** (`frontend/src/components/*.tsx`):
   - Shadcn/UI base components
   - Glassmorphism: `backdrop-blur-2xl bg-white/80 dark:bg-gray-900/80`
   - Tailwind for styling

---

## Decisions Summary

| Question | Decision | Key Rationale |
|----------|----------|---------------|
| Super admin role | Boolean field on User | Simple, queryable, extensible |
| Model config storage | JSONB in system_config table | Flexible, no schema changes for new models |
| Service config access | Cached ModelConfigService | Performance + immediate invalidation |
| Route protection | require_admin dependency | Composable, follows existing patterns |
| Audit logging | Separate admin_audit_log table | Clean separation from document activity |
| First admin | Migration + CLI option | Secure, automated, auditable |
| Dashboard metrics | 4 categories (users, workspaces, AI, health) | Actionable, not overwhelming |
| Frontend auth | Extend store with is_super_admin | Single source of truth, cached |

---

## Open Questions (for implementation)

1. **Rate limiting for admin endpoints**: Not required initially, can add if needed
2. **Admin notification system**: Could use existing toast; email alerts can be future feature
3. **Bulk operations**: Start with individual operations; batch can be added later
