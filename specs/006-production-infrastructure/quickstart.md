# Quickstart: Production Infrastructure Migration

**Feature**: 006-production-infrastructure
**Date**: 2025-11-28

## Prerequisites

Before starting, ensure you have:

- [ ] Supabase project created (free tier works)
- [ ] Cloudflare account with R2 enabled
- [ ] Easypanel server provisioned
- [ ] Domain configured (optional but recommended)

---

## Step 1: Configure Supabase

### 1.1 Enable pgvector Extension

1. Go to Supabase Dashboard → Database → Extensions
2. Search for "vector"
3. Click "Enable"

### 1.2 Configure Authentication

1. Go to Authentication → Providers → Email
2. Enable Email provider
3. **Disable** "Confirm email" (for immediate access)
4. Set minimum password length: 8

### 1.3 Get Credentials

From Supabase Dashboard → Settings → API:
- Copy **Project URL** → `NEXT_PUBLIC_SUPABASE_URL`
- Copy **anon public** key → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- Copy **JWT Secret** (Settings → API → JWT Settings) → `SUPABASE_JWT_SECRET`

From Settings → Database:
- Copy **Connection string** (URI) → `DATABASE_URL`
  - Use the "Transaction pooler" connection for production

---

## Step 2: Configure Cloudflare R2

### 2.1 Create Bucket

1. Go to Cloudflare Dashboard → R2
2. Click "Create bucket"
3. Name: `xtyl-storage` (or your preferred name)

### 2.2 Enable Public Access

1. Go to R2 → Your Bucket → Settings
2. Enable "Public access"
3. Copy the public URL → `R2_PUBLIC_URL` (e.g., `https://pub-xxx.r2.dev`)

### 2.3 Create API Token

1. Go to R2 → Manage R2 API Tokens
2. Create new token with:
   - Permissions: Object Read & Write
   - Specify bucket: your bucket name
3. Copy:
   - Access Key ID → `R2_ACCESS_KEY`
   - Secret Access Key → `R2_SECRET_KEY`
4. Note your Account ID for endpoint:
   - `R2_ENDPOINT` = `https://<account_id>.r2.cloudflarestorage.com`

---

## Step 3: Create Environment File

Create `.env.production` in project root:

```bash
# Supabase
DATABASE_URL=postgresql://postgres.[ref]:[password]@aws-0-us-east-1.pooler.supabase.com:6543/postgres
SUPABASE_JWT_SECRET=your-jwt-secret-from-supabase
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...

# Cloudflare R2
R2_ENDPOINT=https://xxx.r2.cloudflarestorage.com
R2_ACCESS_KEY=your-access-key
R2_SECRET_KEY=your-secret-key
R2_BUCKET=xtyl-storage
R2_PUBLIC_URL=https://pub-xxx.r2.dev

# Redis (internal)
REDIS_URL=redis://redis:6379/0
CELERY_BROKER_URL=redis://redis:6379/0
CELERY_RESULT_BACKEND=redis://redis:6379/1

# API URLs
NEXT_PUBLIC_API_URL=https://api.yourdomain.com

# AI Services (keep existing)
OPENROUTER_API_KEY=sk-or-xxx
TAVILY_API_KEY=xxx

# Email (keep existing)
BREVO_API_KEY=xkeysib-xxx
FROM_EMAIL=noreply@yourdomain.com
FROM_NAME=XTYL
```

---

## Step 4: Run Database Migrations

### 4.1 Modify User Model

The User model needs UUID primary key. Update `backend/models.py`:

```python
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

### 4.2 Run Migrations

```bash
cd backend
alembic upgrade head
```

### 4.3 Create Supabase Trigger

Run the SQL from `contracts/supabase-trigger.sql` in Supabase SQL Editor.

---

## Step 5: Deploy to Easypanel

### 5.1 Push to Git

```bash
git add .
git commit -m "feat: production infrastructure migration"
git push origin 006-production-infrastructure
```

### 5.2 Create Easypanel Project

1. Go to Easypanel Dashboard
2. Create new project
3. Add Docker Compose service
4. Point to your repository
5. Select `docker-compose.prod.yml`

### 5.3 Configure Environment Variables

In Easypanel, add all variables from `.env.production`

### 5.4 Deploy

Click "Deploy" and wait for all services to be healthy.

---

## Step 6: Verify Deployment

### 6.1 Health Checks

```bash
# Backend health
curl https://api.yourdomain.com/health

# Frontend accessible
curl https://yourdomain.com
```

### 6.2 Test Authentication

1. Visit `https://yourdomain.com/register`
2. Create new account
3. Verify immediate access (no email verification)
4. Check Supabase Dashboard → Authentication → Users

### 6.3 Test File Upload

1. Login to the app
2. Create a workflow with image generation
3. Verify image URL starts with `R2_PUBLIC_URL`
4. Verify image is accessible directly

---

## Troubleshooting

### Database Connection Failed

- Verify `DATABASE_URL` uses the Transaction Pooler connection
- Check Supabase is not paused (free tier pauses after inactivity)

### Auth Token Invalid

- Verify `SUPABASE_JWT_SECRET` matches the one in Supabase dashboard
- Check token is being sent in Authorization header

### R2 Upload Failed

- Verify R2 credentials are correct
- Check bucket name matches `R2_BUCKET`
- Verify API token has write permissions

### pgvector Extension Missing

- Enable the extension in Supabase Dashboard → Database → Extensions
- Run migrations again after enabling

---

## Rollback

If migration fails, the local development environment still works with:
- `docker-compose.dev.yml` (local PostgreSQL + MinIO)
- Original `.env` file

No data is lost as this is a fresh production deployment.
