# Data Model: Production Infrastructure Migration

**Feature**: 006-production-infrastructure
**Date**: 2025-11-28

## Overview

This migration primarily affects **configuration and authentication**, not the core data model. The existing SQLAlchemy models remain unchanged. This document describes the changes to the User entity and the new Supabase Auth integration.

---

## Entity Changes

### User (Modified)

The `users` table must be modified to work with Supabase Auth:

**Before (Custom Auth)**:
```
users
├── id: String (UUID as string)
├── email: String (unique)
├── hashed_password: String
├── full_name: String
├── is_active: Boolean
├── created_at: DateTime
└── updated_at: DateTime
```

**After (Supabase Auth)**:
```
users
├── id: UUID (PRIMARY KEY, matches auth.users.id)
├── email: String (unique, synced from auth.users)
├── full_name: String (optional, from user_metadata)
├── created_at: DateTime
└── updated_at: DateTime

Note: hashed_password removed - managed by Supabase Auth
Note: is_active removed - managed by Supabase Auth
```

### Supabase Auth Tables (Managed)

These tables are managed by Supabase and should NOT be modified directly:

```
auth.users (Supabase-managed)
├── id: UUID (PRIMARY KEY)
├── email: String
├── encrypted_password: String
├── email_confirmed_at: DateTime
├── raw_user_meta_data: JSONB
├── created_at: DateTime
└── updated_at: DateTime
```

---

## Relationships

### User → Other Entities

All existing relationships remain unchanged. The `user_id` foreign key in related tables (workspaces, projects, documents, etc.) will now reference the UUID from `auth.users`:

```
workspaces.owner_id → users.id (UUID)
projects.created_by → users.id (UUID)
documents.user_id → users.id (UUID)
chat_sessions.user_id → users.id (UUID)
```

---

## Migration Strategy

### Step 1: Modify users table schema

```sql
-- If id column is VARCHAR, convert to UUID
ALTER TABLE users ALTER COLUMN id TYPE uuid USING id::uuid;

-- Remove auth-related columns (now in Supabase)
ALTER TABLE users DROP COLUMN IF EXISTS hashed_password;
ALTER TABLE users DROP COLUMN IF EXISTS is_active;
```

### Step 2: Create Supabase trigger

```sql
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.users (id, email, full_name, created_at, updated_at)
  VALUES (
    new.id,
    new.email,
    COALESCE(new.raw_user_meta_data->>'full_name', ''),
    now(),
    now()
  )
  ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    updated_at = now();
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
```

### Step 3: Update SQLAlchemy model

```python
# models.py
from sqlalchemy.dialects.postgresql import UUID
import uuid

class User(Base):
    __tablename__ = "users"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    email = Column(String, unique=True, nullable=False)
    full_name = Column(String, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Removed: hashed_password, is_active
```

---

## Storage Model

### File Storage (Cloudflare R2)

No schema changes. The `file_url` fields in existing models will store R2 public URLs instead of MinIO URLs:

**URL Format Change**:
- Before: `http://localhost:9000/xtyl-storage/images/xxx.png`
- After: `https://pub-xxx.r2.dev/images/xxx.png`

Affected tables with file URLs:
- `documents.file_url`
- `visual_assets.file_url`
- `visual_assets.thumbnail_url`

---

## Environment Configuration

### New Environment Variables

| Variable | Type | Description |
|----------|------|-------------|
| `SUPABASE_JWT_SECRET` | Secret | For backend JWT validation |
| `NEXT_PUBLIC_SUPABASE_URL` | Public | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Public | Supabase anon key |
| `R2_ENDPOINT` | Secret | R2 S3-compatible endpoint |
| `R2_ACCESS_KEY` | Secret | R2 access key |
| `R2_SECRET_KEY` | Secret | R2 secret key |
| `R2_BUCKET` | Config | R2 bucket name |
| `R2_PUBLIC_URL` | Public | R2 public access URL |

### Removed Environment Variables

| Variable | Reason |
|----------|--------|
| `MINIO_ENDPOINT` | Replaced by R2 |
| `MINIO_ACCESS_KEY` | Replaced by R2 |
| `MINIO_SECRET_KEY` | Replaced by R2 |
| `MINIO_BUCKET` | Replaced by R2 |
| `SECRET_KEY` | JWT now managed by Supabase |

---

## Validation Rules

### User Entity

| Field | Validation |
|-------|------------|
| `id` | UUID format, matches auth.users.id |
| `email` | Valid email format, unique |
| `full_name` | Max 255 characters, optional |

### File URLs

| Field | Validation |
|-------|------------|
| `file_url` | Must be valid URL, must start with R2_PUBLIC_URL |

---

## No State Transitions

This migration does not introduce new state machines. Existing entity states (workflow execution status, document status, etc.) remain unchanged.
