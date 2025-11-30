# XTYL Creativity Machine

## Architecture

Hybrid cloud architecture:
- **Database**: Supabase PostgreSQL (cloud) with pgvector
- **Authentication**: Supabase Auth
- **Storage**: Cloudflare R2 (S3-compatible)
- **Cache/Queue**: Redis (local Docker)

## Quick Start

### Prerequisites
- Docker & Docker Compose
- Node.js 20+
- Supabase account
- Cloudflare R2 account

### 1. Setup Supabase
1. Create project at [supabase.com](https://supabase.com)
2. Enable `pgvector` extension: Dashboard > Database > Extensions
3. Get credentials from Dashboard > Settings > API

### 2. Configure Environment
```bash
cp .env.example .env
# Fill in your Supabase and R2 credentials
```

### 3. Run Development
```bash
./dev.sh setup   # First time
./dev.sh start   # Start all services
```

### URLs
- **Frontend**: http://localhost:3000
- **Backend API**: http://localhost:8000/docs

---

## Production Deployment

### Prerequisites
- Docker Engine 24.0+
- 4GB+ RAM, 20GB+ storage
- Configured Supabase project
- Configured Cloudflare R2 bucket

### Deploy
```bash
cp .env.example .env
# Configure all production variables (update URLs, Redis to redis://redis:6379/0)
docker-compose up -d
```

### Required Environment Variables

**Supabase:**
- `DATABASE_URL` - Connection string (use pooler port 6543)
- `SUPABASE_JWT_SECRET`
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`

**Cloudflare R2:**
- `R2_ENDPOINT` - `https://[ACCOUNT_ID].r2.cloudflarestorage.com`
- `R2_ACCESS_KEY`, `R2_SECRET_KEY`
- `R2_BUCKET`, `R2_PUBLIC_URL`

**Application:**
- `OPENROUTER_API_KEY` - AI models
- `BREVO_API_KEY` - Email
- `FRONTEND_URL`, `NEXT_PUBLIC_API_URL`

---

## Troubleshooting

### Supabase Connection
```bash
# Verify DATABASE_URL format
postgresql://postgres.[PROJECT_REF]:[PASSWORD]@aws-0-us-east-1.pooler.supabase.com:6543/postgres
```

### R2 Storage
- Verify credentials in Cloudflare Dashboard > R2
- Check bucket permissions for public access

### Redis/Celery
```bash
docker exec xtyl-redis redis-cli ping  # Should return PONG
docker-compose logs celery-worker
```

### Complete Rebuild
```bash
docker-compose down --rmi all
docker-compose build --no-cache
docker-compose up -d
```

### Development Mode
```bash
./dev.sh status   # Check services
./dev.sh stop     # Stop all
./dev.sh setup    # Reinstall dependencies
```

---

## Project Structure
```
├── frontend/          Next.js 14 + Shadcn/UI
├── backend/           FastAPI + SQLAlchemy
├── docker-compose.yml Production deployment
├── dev.sh             Development script
└── .env.example       Environment template
```
