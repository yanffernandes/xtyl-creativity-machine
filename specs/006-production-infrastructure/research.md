# Research: Production Infrastructure Migration

**Feature**: 006-production-infrastructure
**Date**: 2025-11-28

## Research Summary

This document consolidates technical decisions for migrating from local Docker services to managed cloud infrastructure.

---

## 1. Supabase Auth Integration

### Decision
Use `@supabase/supabase-js` SDK on frontend for authentication, validate Supabase JWT tokens on backend using PyJWT with Supabase's JWT secret.

### Rationale
- Supabase Auth provides complete auth flow (register, login, password reset, session management)
- Frontend SDK handles token refresh automatically
- Backend only needs to validate JWT, not manage auth state
- Reduces custom auth code significantly

### Alternatives Considered
| Alternative | Rejected Because |
|-------------|------------------|
| Keep custom auth, use Supabase only for DB | Duplicates auth logic, loses Supabase Auth features |
| Use Supabase Auth + custom backend tokens | Adds complexity, two token systems |
| Use Auth0/Clerk instead | Additional cost, Supabase already provides auth |

### Implementation Details
```python
# Backend: Validate Supabase JWT
import jwt
from fastapi import Depends, HTTPException
from fastapi.security import HTTPBearer

SUPABASE_JWT_SECRET = os.getenv("SUPABASE_JWT_SECRET")

def get_current_user(token: str = Depends(HTTPBearer())):
    try:
        payload = jwt.decode(token.credentials, SUPABASE_JWT_SECRET, algorithms=["HS256"], audience="authenticated")
        return payload.get("sub")  # user_id
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid token")
```

```typescript
// Frontend: Supabase client
import { createClient } from '@supabase/supabase-js'

export const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)
```

---

## 2. Supabase Database Trigger for User Sync

### Decision
Create a PostgreSQL trigger in Supabase that automatically inserts a record into `public.users` when a new user is created in `auth.users`.

### Rationale
- No backend code needed for user sync
- Immediate consistency between auth and application users
- Standard Supabase pattern, well-documented

### Implementation Details
```sql
-- Run in Supabase SQL Editor
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.users (id, email, full_name, created_at)
  VALUES (
    new.id,
    new.email,
    COALESCE(new.raw_user_meta_data->>'full_name', ''),
    now()
  );
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
```

### Schema Consideration
The `public.users` table must use UUID for `id` to match `auth.users.id`:
```sql
ALTER TABLE public.users ALTER COLUMN id TYPE uuid USING id::uuid;
```

---

## 3. Cloudflare R2 Storage Integration

### Decision
Use boto3 with S3-compatible endpoint configuration. Configure R2 bucket as public for direct URL access.

### Rationale
- R2 is 100% S3-compatible, minimal code changes
- boto3 is more actively maintained than minio-py for S3 operations
- Public bucket eliminates need for presigned URLs
- Egress is free on R2

### Alternatives Considered
| Alternative | Rejected Because |
|-------------|------------------|
| Keep MinIO in Docker | Requires volume management, backup complexity |
| AWS S3 | Higher cost, egress fees |
| Supabase Storage | Additional Supabase dependency, less flexible |

### Implementation Details
```python
# storage_service.py
import boto3
from botocore.config import Config

R2_ENDPOINT = os.getenv("R2_ENDPOINT")  # https://<account_id>.r2.cloudflarestorage.com
R2_ACCESS_KEY = os.getenv("R2_ACCESS_KEY")
R2_SECRET_KEY = os.getenv("R2_SECRET_KEY")
R2_BUCKET = os.getenv("R2_BUCKET")
R2_PUBLIC_URL = os.getenv("R2_PUBLIC_URL")  # https://pub-xxx.r2.dev or custom domain

s3_client = boto3.client(
    's3',
    endpoint_url=R2_ENDPOINT,
    aws_access_key_id=R2_ACCESS_KEY,
    aws_secret_access_key=R2_SECRET_KEY,
    config=Config(signature_version='s3v4')
)

def upload_file(file_data: bytes, file_name: str, content_type: str, folder: str = "") -> str:
    object_name = f"{folder}/{file_name}" if folder else file_name
    s3_client.put_object(
        Bucket=R2_BUCKET,
        Key=object_name,
        Body=file_data,
        ContentType=content_type
    )
    return f"{R2_PUBLIC_URL}/{object_name}"
```

### R2 Public Access Configuration
In Cloudflare Dashboard:
1. Go to R2 > Your Bucket > Settings
2. Enable "Public Access"
3. Note the public URL (e.g., `https://pub-xxx.r2.dev`)

---

## 4. Docker Compose Production Configuration

### Decision
Create `docker-compose.prod.yml` with only: frontend, backend, celery-worker, redis. Remove db and minio services.

### Rationale
- Stateless services in Docker, stateful services managed externally
- Simpler deployment, fewer volumes to manage
- Easypanel compatibility maintained

### Implementation Details
```yaml
# docker-compose.prod.yml
services:
  backend:
    build:
      context: ./backend
      dockerfile: Dockerfile.prod
    environment:
      DATABASE_URL: ${DATABASE_URL}  # Supabase connection string
      SUPABASE_JWT_SECRET: ${SUPABASE_JWT_SECRET}
      R2_ENDPOINT: ${R2_ENDPOINT}
      R2_ACCESS_KEY: ${R2_ACCESS_KEY}
      R2_SECRET_KEY: ${R2_SECRET_KEY}
      R2_BUCKET: ${R2_BUCKET}
      R2_PUBLIC_URL: ${R2_PUBLIC_URL}
    depends_on:
      redis:
        condition: service_healthy

  frontend:
    build:
      context: ./frontend
      dockerfile: Dockerfile.prod
      args:
        NEXT_PUBLIC_API_URL: ${NEXT_PUBLIC_API_URL}
        NEXT_PUBLIC_SUPABASE_URL: ${NEXT_PUBLIC_SUPABASE_URL}
        NEXT_PUBLIC_SUPABASE_ANON_KEY: ${NEXT_PUBLIC_SUPABASE_ANON_KEY}

  celery-worker:
    build:
      context: ./backend
      dockerfile: Dockerfile.prod
    command: celery -A celery_app worker --loglevel=info
    environment:
      DATABASE_URL: ${DATABASE_URL}
      CELERY_BROKER_URL: redis://redis:6379/0

  redis:
    image: redis:7-alpine
    healthcheck:
      test: ["CMD", "redis-cli", "ping"]
```

---

## 5. Environment Variables

### Decision
Create `.env.production.example` documenting all required variables for production deployment.

### Required Variables

| Variable | Description | Example |
|----------|-------------|---------|
| `DATABASE_URL` | Supabase PostgreSQL connection | `postgresql://postgres.[ref]:[password]@aws-0-us-east-1.pooler.supabase.com:6543/postgres` |
| `SUPABASE_JWT_SECRET` | JWT secret from Supabase dashboard | `your-jwt-secret` |
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL | `https://xxx.supabase.co` |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anon key | `eyJ...` |
| `R2_ENDPOINT` | Cloudflare R2 S3 endpoint | `https://xxx.r2.cloudflarestorage.com` |
| `R2_ACCESS_KEY` | R2 API access key | `xxx` |
| `R2_SECRET_KEY` | R2 API secret key | `xxx` |
| `R2_BUCKET` | R2 bucket name | `xtyl-storage` |
| `R2_PUBLIC_URL` | R2 public URL | `https://pub-xxx.r2.dev` |
| `REDIS_URL` | Redis connection (internal) | `redis://redis:6379/0` |
| `NEXT_PUBLIC_API_URL` | Backend API URL | `https://api.yourdomain.com` |
| `OPENROUTER_API_KEY` | OpenRouter API key | `sk-or-...` |
| `BREVO_API_KEY` | Brevo email API key | `xkeysib-...` |

---

## 6. pgvector Extension

### Decision
Enable pgvector in Supabase dashboard before running migrations.

### Rationale
- Required for RAG/embedding features
- Supabase supports pgvector natively
- Must be enabled before tables with vector columns are created

### Steps
1. Go to Supabase Dashboard > Database > Extensions
2. Search for "vector"
3. Enable the extension
4. Verify: `SELECT * FROM pg_extension WHERE extname = 'vector';`

---

## 7. Supabase Auth Configuration

### Decision
Configure Supabase Auth with email verification disabled and password-based auth enabled.

### Steps in Supabase Dashboard
1. Authentication > Providers > Email
   - Enable Email provider
   - Disable "Confirm email"
   - Set minimum password length (8 characters)

2. Authentication > URL Configuration
   - Site URL: `https://yourdomain.com`
   - Redirect URLs: `https://yourdomain.com/auth/callback`

3. Authentication > Email Templates
   - Customize password reset email (uses Brevo templates if configured)

---

## Research Complete

All technical decisions documented. Ready for Phase 1: Design & Contracts.
