# Data Model: Hybrid Architecture Migration

**Date**: 2025-12-04
**Feature**: [spec.md](spec.md)
**Purpose**: Define data structures and relationships for the hybrid architecture

---

## Overview

The hybrid architecture migration **does not introduce new data entities**. All existing data models from the WeWeb/Supabase implementation are preserved. This document defines the **configuration and infrastructure entities** that support the new architecture.

---

## Infrastructure Entities

### 1. Environment Configuration

**Purpose**: Centralized configuration for all services

**Attributes:**
- `NODE_ENV`: string - Environment mode (development, production, test)
- `DATABASE_URL`: string - Supabase PostgreSQL connection string (pooled)
- `DIRECT_URL`: string - Supabase PostgreSQL direct connection (migrations)
- `SUPABASE_URL`: string - Supabase project URL
- `SUPABASE_ANON_KEY`: string - Public anon key for frontend
- `SUPABASE_SERVICE_KEY`: string - Service role key for backend (sensitive)
- `SUPABASE_JWT_SECRET`: string - JWT signing secret
- `REDIS_HOST`: string - Redis hostname
- `REDIS_PORT`: number - Redis port
- `REDIS_PASSWORD`: string (optional) - Redis authentication
- `CORS_ORIGINS`: string[] - Allowed frontend origins
- `FRONTEND_URL`: string - Frontend application URL
- `BACKEND_URL`: string - Backend API URL

**Validation Rules:**
- All URLs must be valid HTTP/HTTPS URIs
- `SUPABASE_JWT_SECRET` must be minimum 32 characters
- `NODE_ENV` must be one of: development, production, test
- `CORS_ORIGINS` must not include wildcards in production

**Storage**: Environment variables (.env files, Docker secrets)

---

### 2. Service Health Status

**Purpose**: Track health and readiness of each service

**Attributes:**
- `service_name`: string - Service identifier (frontend, backend, redis)
- `status`: enum - Current status (healthy, unhealthy, starting)
- `last_check`: timestamp - Last health check time
- `details`: object - Service-specific health information
  - `uptime`: number - Seconds since service start
  - `version`: string - Service version
  - `dependencies`: object - Status of service dependencies

**State Transitions:**
- `starting` → `healthy`: After successful health check
- `healthy` → `unhealthy`: After failed health check
- `unhealthy` → `healthy`: After recovery

**Endpoints:**
- `GET /health` - Backend health status
- `GET /health/live` - Simple liveness probe
- `GET /health/ready` - Readiness probe with dependency checks

---

### 3. Docker Service Configuration

**Purpose**: Container orchestration metadata

**Attributes:**
- `service_name`: string - Docker service name
- `image`: string - Docker image name and tag
- `ports`: array - Port mappings (host:container)
- `environment`: object - Environment variables
- `volumes`: array - Volume mounts
- `depends_on`: array - Service dependencies
- `healthcheck`: object - Health check configuration
  - `test`: string[] - Health check command
  - `interval`: string - Check frequency
  - `timeout`: string - Command timeout
  - `retries`: number - Failure threshold
  - `start_period`: string - Grace period

**Storage**: docker-compose.yml

---

## Existing Application Entities (Preserved)

These entities exist in the current Supabase schema and **remain unchanged**:

### 1. Users (Supabase Auth)
Managed by Supabase Auth, accessed via `auth.users` table

### 2. Blogs
- `id`: uuid - Primary key
- `user_id`: uuid - Foreign key to auth.users
- `name`: string - Blog name
- `url`: string - Blog URL
- `status`: enum - Blog status
- `created_at`: timestamp
- `updated_at`: timestamp

### 3. Projects
- `id`: uuid - Primary key
- `blog_id`: uuid - Foreign key to blogs
- `name`: string - Project name
- `status`: enum - Project status
- `created_at`: timestamp
- `updated_at`: timestamp

### 4. Articles
- `id`: uuid - Primary key
- `project_id`: uuid - Foreign key to projects
- `title`: string - Article title
- `content`: text - Article body
- `status`: enum - Draft, published, etc.
- `created_at`: timestamp
- `updated_at`: timestamp

### 5. Keywords (Mineração 10x)
- `id`: uuid - Primary key
- `project_id`: uuid - Foreign key to projects
- `keyword`: string - Keyword text
- `volume`: number - Search volume
- `difficulty`: number - SEO difficulty
- `created_at`: timestamp

---

## Data Access Patterns

### Frontend → Supabase (Direct)

**Pattern**: Client-side SDK with Row Level Security

```typescript
// Frontend continues using Supabase client directly
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY
)

// Example: List blogs
const { data: blogs } = await supabase
  .from('blogs')
  .select('*')
  .eq('user_id', user.id)
```

**Security**: Enforced by Supabase RLS policies (existing)

---

### Backend → Supabase (Prisma)

**Pattern**: Backend uses Prisma for administrative queries

```typescript
// Backend uses Prisma with service role access
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: process.env.DATABASE_URL
    }
  }
})

// Example: Query blogs (bypasses RLS)
const blogs = await prisma.blog.findMany({
  where: { userId: userId }
})
```

**Security**: Backend validates user authentication before queries

---

## Database Schema (Prisma)

**Purpose**: Mirror existing Supabase schema for backend access

```prisma
// prisma/schema.prisma

generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider  = "postgresql"
  url       = env("DATABASE_URL")
  directUrl = env("DIRECT_URL")
}

// Mirror existing tables (read-only initially)
model Blog {
  id        String   @id @default(uuid())
  userId    String   @map("user_id")
  name      String
  url       String
  status    String
  createdAt DateTime @default(now()) @map("created_at")
  updatedAt DateTime @updatedAt @map("updated_at")

  projects  Project[]

  @@map("blogs")
}

model Project {
  id        String   @id @default(uuid())
  blogId    String   @map("blog_id")
  name      String
  status    String
  createdAt DateTime @default(now()) @map("created_at")
  updatedAt DateTime @updatedAt @map("updated_at")

  blog      Blog     @relation(fields: [blogId], references: [id])
  articles  Article[]
  keywords  Keyword[]

  @@map("projects")
}

model Article {
  id        String   @id @default(uuid())
  projectId String   @map("project_id")
  title     String
  content   String
  status    String
  createdAt DateTime @default(now()) @map("created_at")
  updatedAt DateTime @updatedAt @map("updated_at")

  project   Project  @relation(fields: [projectId], references: [id])

  @@map("articles")
}

model Keyword {
  id         String   @id @default(uuid())
  projectId  String   @map("project_id")
  keyword    String
  volume     Int?
  difficulty Float?
  createdAt  DateTime @default(now()) @map("created_at")

  project    Project  @relation(fields: [projectId], references: [id])

  @@map("keywords")
}
```

**Important Notes:**
- Schema mirrors existing Supabase tables
- Use `@map()` to match Supabase snake_case naming
- Backend initially reads data only (no writes to avoid conflicts)
- Future backend writes will need coordination with frontend

---

## Redis Data Structures

**Purpose**: Job queue persistence and caching

### Job Queue (BullMQ)

```typescript
// Job data structure
interface EmailJob {
  to: string
  subject: string
  body: string
  priority?: number
  attempts?: number
}

// Queue naming convention
const QUEUES = {
  emails: 'emails',
  notifications: 'notifications',
  integrations: 'integrations'
}
```

**Storage Keys:**
- `bull:{queue_name}:*` - BullMQ internal keys
- `bull:{queue_name}:jobs` - Job data
- `bull:{queue_name}:waiting` - Pending jobs
- `bull:{queue_name}:active` - Running jobs
- `bull:{queue_name}:completed` - Finished jobs
- `bull:{queue_name}:failed` - Failed jobs

### Cache (Future Use)

```typescript
// Cache key patterns
const CACHE_KEYS = {
  user: (userId: string) => `user:${userId}`,
  blog: (blogId: string) => `blog:${blogId}`,
  project: (projectId: string) => `project:${projectId}`
}

// TTL configuration
const CACHE_TTL = {
  short: 60,        // 1 minute
  medium: 300,      // 5 minutes
  long: 3600        // 1 hour
}
```

---

## Data Migration Notes

### No Data Migration Required

The hybrid architecture migration **does not require data migration** because:
1. Existing Supabase database remains unchanged
2. Frontend continues using Supabase directly
3. Backend connects to same Supabase database via Prisma
4. No schema changes needed

### Future Considerations

When adding backend-managed features:
- Create new tables via Supabase migrations (not Prisma)
- Keep Prisma schema in sync manually
- Document which tables are frontend-managed vs backend-managed
- Consider eventual consistency for data modified by both

---

## Validation Rules Summary

| Entity | Rule | Enforcement |
|--------|------|-------------|
| **Environment Config** | All URLs valid | Startup validation |
| **Environment Config** | JWT secret ≥32 chars | Startup validation |
| **Environment Config** | NODE_ENV in allowed values | Startup validation |
| **Health Status** | Status transitions follow state machine | Backend logic |
| **Supabase Data** | Row Level Security policies | Supabase RLS |
| **Backend Queries** | User authentication required | NestJS guards |
| **Redis Jobs** | Job data schema validation | BullMQ + class-validator |

---

## Next Steps

With data model defined:
1. ✅ **Complete**: Data model documentation
2. ⏭️ **Next**: Generate API contracts (OpenAPI spec)
3. ⏭️ **Next**: Write quickstart guide

**Status**: ✅ Data Model Complete
