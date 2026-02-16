# Quickstart Guide: Hybrid Architecture

**Target Audience**: Developers working on the AlvoBot monorepo
**Time to Complete**: 15-20 minutes
**Prerequisites**: Node.js 20+, Docker, Git

---

## Overview

This guide walks you through setting up the AlvoBot hybrid architecture for local development. You'll have a running frontend (Vue.js), backend (NestJS), and Redis instance.

---

## 🚀 Quick Start (Docker Compose)

### 1. Clone and Setup

```bash
# Clone the repository
git checkout 001-hybrid-architecture

# Copy environment template
cp .env.example .env

# Edit .env with your Supabase credentials
nano .env
```

### 2. Start All Services

```bash
# Start frontend, backend, and Redis
docker-compose up -d

# Check service status
docker-compose ps

# View logs
docker-compose logs -f
```

### 3. Verify Installation

```bash
# Frontend: http://localhost:8080
curl http://localhost:8080

# Backend health check: http://localhost:3000/health
curl http://localhost:3000/health

# API documentation: http://localhost:3000/api/docs
open http://localhost:3000/api/docs
```

✅ **Success**: All services running and accessible

---

## 💻 Local Development (Without Docker)

### Prerequisites

```bash
# Check versions
node --version   # Should be 20+
npm --version    # Should be 9+
```

### 1. Install Dependencies

```bash
# Frontend dependencies
cd frontend
npm install
cd ..

# Backend dependencies
cd backend
npm install
cd ..
```

### 2. Start Redis

```bash
# Option A: Docker
docker run -d --name redis -p 6379:6379 redis:7-alpine

# Option B: Homebrew (macOS)
brew services start redis

# Verify Redis
redis-cli ping  # Should return: PONG
```

### 3. Start Backend

```bash
cd backend

# Development mode with hot reload
npm run start:dev

# Backend starts on http://localhost:3000
# API docs at http://localhost:3000/api/docs
```

### 4. Start Frontend

```bash
cd frontend

# Development server
npm run dev

# Frontend starts on http://localhost:5173
```

✅ **Success**: Development servers running with hot reload

---

## ⚙️ Environment Configuration

### Required Environment Variables

Create `.env` file in project root:

```env
# ============================================
# Node Environment
# ============================================
NODE_ENV=development

# ============================================
# Supabase Configuration
# ============================================
# Get from: https://supabase.com/dashboard/project/_/settings/api

# Project URL (found in Settings → API)
SUPABASE_URL=https://your-project.supabase.co

# Anon/Public Key (for frontend)
SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# Service Role Key (for backend - KEEP SECRET!)
SUPABASE_SERVICE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# JWT Secret (found in Settings → API → JWT Settings)
SUPABASE_JWT_SECRET=your-super-secret-jwt-secret-32-chars-min

# Database URLs (found in Settings → Database)
DATABASE_URL=postgresql://postgres.[project-ref]:[password]@aws-0-[region].pooler.supabase.com:6543/postgres?pgbouncer=true
DIRECT_URL=postgresql://postgres.[project-ref]:[password]@aws-0-[region].pooler.supabase.com:5432/postgres

# ============================================
# Redis Configuration
# ============================================
REDIS_HOST=localhost  # or 'redis' in Docker
REDIS_PORT=6379
REDIS_PASSWORD=       # Leave empty for local dev

# ============================================
# CORS Configuration
# ============================================
CORS_ORIGINS=http://localhost:5173,http://localhost:3000

# ============================================
# Frontend Build Variables (Vite)
# ============================================
VITE_API_URL=http://localhost:3000
VITE_SUPABASE_URL=${SUPABASE_URL}
VITE_SUPABASE_ANON_KEY=${SUPABASE_ANON_KEY}
```

### Frontend-Specific (.env in frontend/)

```env
VITE_API_URL=http://localhost:3000
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
```

### Backend-Specific (.env in backend/)

```env
NODE_ENV=development
DATABASE_URL=postgresql://...
DIRECT_URL=postgresql://...
SUPABASE_JWT_SECRET=your-jwt-secret
REDIS_HOST=localhost
REDIS_PORT=6379
```

---

## 📁 Project Structure

```
alvobot-2/
├── frontend/                  # Vue.js 3 application
│   ├── src/
│   │   ├── _front/           # WeWeb components
│   │   ├── _common/          # Shared utilities
│   │   ├── wwLib/            # WeWeb libraries
│   │   └── components/       # Custom components
│   ├── public/
│   ├── package.json
│   ├── vite.config.js
│   └── Dockerfile
│
├── backend/                   # NestJS application
│   ├── src/
│   │   ├── main.ts           # Entry point
│   │   ├── app.module.ts     # Root module
│   │   ├── modules/
│   │   │   ├── health/       # Health checks
│   │   │   └── auth/         # Authentication
│   │   ├── common/
│   │   │   ├── guards/       # Auth guards
│   │   │   └── filters/      # Error filters
│   │   └── database/
│   │       └── prisma.service.ts
│   ├── prisma/
│   │   └── schema.prisma
│   ├── package.json
│   └── Dockerfile
│
├── specs/                     # Feature specs and docs
│   └── 001-hybrid-architecture/
│       ├── spec.md
│       ├── plan.md
│       ├── research.md
│       └── quickstart.md     # This file
│
├── docker-compose.yml         # Service orchestration
├── .env.example              # Environment template
└── README.md
```

---

## 🧪 Testing the Setup

### 1. Health Check

```bash
# Backend health
curl http://localhost:3000/health

# Expected response:
{
  "status": "healthy",
  "timestamp": "2025-12-04T10:00:00Z",
  "uptime": 120,
  "version": "1.0.0",
  "dependencies": {
    "redis": { "status": "healthy", "responseTime": 2 },
    "supabase": { "status": "healthy", "responseTime": 45 }
  }
}
```

### 2. Authentication Test

```bash
# Get a token from Supabase (use frontend login or API)
TOKEN="your-supabase-jwt-token"

# Validate token
curl -H "Authorization: Bearer $TOKEN" \
  http://localhost:3000/auth/validate

# Expected response:
{
  "valid": true,
  "user": {
    "id": "...",
    "email": "user@example.com",
    "role": "authenticated"
  }
}
```

### 3. Frontend API Integration

```javascript
// Test from browser console on http://localhost:5173
fetch('http://localhost:3000/health')
  .then(res => res.json())
  .then(data => console.log(data))
```

---

## 🔧 Common Commands

### Docker Compose

```bash
# Start all services
docker-compose up -d

# Stop all services
docker-compose down

# View logs
docker-compose logs -f [service_name]

# Rebuild images
docker-compose build

# Restart a single service
docker-compose restart backend

# Execute command in container
docker-compose exec backend npm run prisma:migrate
```

### Frontend (Vite)

```bash
cd frontend

# Development server
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview

# Lint code
npm run lint
```

### Backend (NestJS)

```bash
cd backend

# Development mode (watch)
npm run start:dev

# Production mode
npm run start:prod

# Build
npm run build

# Run tests
npm run test

# E2E tests
npm run test:e2e
```

### Prisma

```bash
cd backend

# Generate Prisma Client
npm run prisma:generate

# View database in browser
npm run prisma:studio

# Create migration
npm run prisma:migrate dev --name migration_name

# Apply migrations
npm run prisma:migrate deploy

# Pull schema from database
npm run prisma db pull
```

---

## 🐛 Troubleshooting

### Port Already in Use

```bash
# Check what's using port 3000
lsof -i :3000

# Kill process
kill -9 <PID>
```

### Redis Connection Failed

```bash
# Check Redis is running
redis-cli ping

# If Docker Redis
docker ps | grep redis

# Restart Redis
docker restart redis
# or
brew services restart redis
```

### Supabase Connection Failed

```bash
# Test direct connection
psql "postgresql://postgres.[project-ref]:[password]@aws-0-[region].pooler.supabase.com:5432/postgres"

# Verify credentials in Supabase dashboard
# Settings → Database → Connection string
```

### Frontend Can't Reach Backend

```bash
# Check backend is running
curl http://localhost:3000/health

# Check CORS settings in backend/src/main.ts
# Verify VITE_API_URL in frontend/.env
```

### Docker Build Fails

```bash
# Clear Docker cache
docker system prune -a

# Rebuild from scratch
docker-compose build --no-cache

# Check logs
docker-compose logs backend
```

---

## 📚 Next Steps

### Development Workflow

1. **Create a feature branch**
   ```bash
   git checkout -b feature/your-feature-name
   ```

2. **Make changes** to frontend or backend

3. **Test locally**
   ```bash
   # Frontend
   cd frontend && npm run dev

   # Backend
   cd backend && npm run start:dev
   ```

4. **Build for production**
   ```bash
   docker-compose build
   docker-compose up -d
   ```

5. **Commit and push**
   ```bash
   git add .
   git commit -m "feat: your feature description"
   git push origin feature/your-feature-name
   ```

### Adding a New Backend Endpoint

1. Generate module:
   ```bash
   cd backend
   nest g module features/your-feature
   nest g controller features/your-feature
   nest g service features/your-feature
   ```

2. Implement endpoint in controller

3. Add Swagger decorators for documentation

4. Update OpenAPI spec in `/specs/001-hybrid-architecture/contracts/`

5. Test with curl or Swagger UI

### Adding a New Frontend Component

1. Create component in `frontend/src/components/`

2. Import in relevant views

3. Test with `npm run dev`

4. Build and verify: `npm run build && npm run preview`

---

## 📖 Documentation

- **Feature Spec**: [spec.md](spec.md)
- **Implementation Plan**: [plan.md](plan.md)
- **Research Findings**: [research.md](research.md)
- **Data Model**: [data-model.md](data-model.md)
- **API Contracts**: [contracts/backend-api.yaml](contracts/backend-api.yaml)

### External Resources

- [NestJS Documentation](https://docs.nestjs.com/)
- [Vue.js 3 Guide](https://vuejs.org/guide/)
- [Vite Documentation](https://vitejs.dev/)
- [Prisma Documentation](https://www.prisma.io/docs)
- [Supabase Documentation](https://supabase.com/docs)
- [Docker Compose Documentation](https://docs.docker.com/compose/)

---

## 🎯 Key Takeaways

1. **Frontend stays direct**: CRUD operations continue using Supabase client
2. **Backend for complex tasks**: OAuth, webhooks, background jobs
3. **Docker for consistency**: Development-production parity
4. **Health checks critical**: Monitor service dependencies
5. **Environment variables**: Never commit secrets, use .env.example

---

## ✅ Setup Checklist

- [ ] Repository cloned and on correct branch
- [ ] `.env` file created with Supabase credentials
- [ ] Docker and Docker Compose installed
- [ ] Services start successfully: `docker-compose up -d`
- [ ] Frontend accessible at http://localhost:8080
- [ ] Backend health check passes: http://localhost:3000/health
- [ ] API documentation loads: http://localhost:3000/api/docs
- [ ] Redis connection confirmed in health check
- [ ] Supabase connection confirmed in health check

**Estimated Setup Time**: 15-20 minutes

---

**Questions?** Check the troubleshooting section or review research.md for technical details.
