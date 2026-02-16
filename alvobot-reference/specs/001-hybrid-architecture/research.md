# Research: Hybrid Architecture Migration

**Date**: 2025-12-04
**Feature**: [spec.md](spec.md)
**Purpose**: Technical research to resolve architectural decisions and best practices

## Research Overview

This document consolidates research findings for migrating AlvoBot from a single Vue.js frontend to a hybrid monorepo architecture with separate frontend and backend services.

---

## 1. NestJS Backend Setup in Monorepo

### Decision
Use native NestJS CLI monorepo structure with backend in dedicated directory

### Rationale
- NestJS CLI provides built-in monorepo support without additional tooling
- Simpler than Nx for small-scale monorepos (2 apps)
- Industry-standard project structure with clear separation
- Easy to integrate with Docker Compose for deployment

### Implementation
```bash
# Initialize NestJS backend
nest new backend --package-manager npm

# Project structure
backend/
├── src/
│   ├── main.ts
│   ├── app.module.ts
│   └── modules/
├── package.json
├── tsconfig.json
└── Dockerfile
```

### Key Dependencies
- `@nestjs/common`, `@nestjs/core`, `@nestjs/platform-express` (^10.x)
- `reflect-metadata`, `rxjs` (required by NestJS)
- TypeScript 5.x, Node.js 20 LTS

### Alternatives Considered
- **Nx Monorepo**: Rejected - adds significant complexity for minimal benefit in 2-app setup
- **Lerna**: Rejected - primarily for managing multiple npm packages, not full applications

---

## 2. Prisma + Supabase Integration

### Decision
Use Prisma ORM with dual connection strings for Supabase PostgreSQL

### Rationale
- Type-safe database access with auto-generated TypeScript types
- Clean migration workflow compatible with Supabase
- Better developer experience than TypeORM or raw SQL
- Prisma Client works seamlessly with NestJS dependency injection

### Implementation

**Environment Configuration:**
```env
# Pooled connection for Prisma Client (application queries)
DATABASE_URL="postgresql://postgres.[project-id]:[password]@aws-0-[region].pooler.supabase.com:6543/postgres?pgbouncer=true"

# Direct connection for Prisma migrations
DIRECT_URL="postgresql://postgres.[project-id]:[password]@aws-0-[region].pooler.supabase.com:5432/postgres"
```

**Prisma Schema:**
```prisma
datasource db {
  provider  = "postgresql"
  url       = env("DATABASE_URL")
  directUrl = env("DIRECT_URL")
}
```

**NestJS Integration:**
```typescript
@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit {
  async onModuleInit() {
    await this.$connect();
  }
}
```

### Important Notes
- Prisma bypasses Supabase Row Level Security (RLS) - must enforce auth in application layer
- Use `DATABASE_URL` with pgbouncer=true for connection pooling
- Use `DIRECT_URL` without pgbouncer for running migrations
- Generate Prisma Client after schema changes: `npx prisma generate`

### Alternatives Considered
- **TypeORM**: Rejected - more verbose, less type-safe than Prisma
- **Knex.js**: Rejected - requires manual migration management
- **Sequelize**: Rejected - slower, larger package size

---

## 3. Supabase Authentication Integration

### Decision
Use Passport.js with JWT strategy for validating Supabase auth tokens

### Rationale
- Passport is NestJS-native authentication framework
- JWT strategy handles bearer token validation automatically
- Compatible with Supabase's JWT-based authentication
- Extensible for future OAuth providers

### Implementation

**Installation:**
```bash
npm install @nestjs/passport passport passport-jwt
npm install -D @types/passport-jwt
```

**JWT Strategy:**
```typescript
@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor() {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      secretOrKey: process.env.SUPABASE_JWT_SECRET,
    });
  }

  async validate(payload: any) {
    return {
      userId: payload.sub,
      email: payload.email,
    };
  }
}
```

**Protected Endpoint:**
```typescript
@Get('profile')
@UseGuards(AuthGuard('jwt'))
getProfile(@Request() req) {
  return req.user;
}
```

### Environment Variables
```env
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your-anon-key
SUPABASE_JWT_SECRET=your-jwt-secret
```

### Important Notes
- JWT secret is found in Supabase Settings → API (not the anon key)
- Token includes user claims: `sub` (user ID), `email`, `role`, etc.
- Frontend includes token in Authorization header: `Bearer <token>`
- Backend validates signature and expiration automatically

### Alternatives Considered
- **Manual JWT verification**: Rejected - reinvents wheel, more error-prone
- **@supabase/supabase-js client-side validation**: Rejected - adds unnecessary dependency

---

## 4. BullMQ + Redis Job Queue

### Decision
Use BullMQ with Redis for asynchronous job processing

### Rationale
- BullMQ is modern successor to Bull with better TypeScript support
- Built-in retry logic with exponential backoff
- Redis persistence ensures job durability across restarts
- Scalable architecture for handling background tasks

### Implementation

**Installation:**
```bash
npm install bullmq ioredis
npm install @nestjs/bullmq
```

**Queue Configuration:**
```typescript
@Module({
  imports: [
    BullModule.forRoot({
      redis: {
        host: process.env.REDIS_HOST || 'redis',
        port: parseInt(process.env.REDIS_PORT) || 6379,
      },
    }),
    BullModule.registerQueue({ name: 'emails' }),
  ],
})
export class QueueModule {}
```

**Job Processor:**
```typescript
@Processor('emails')
export class EmailProcessor extends WorkerHost {
  async process(job: Job) {
    const { to, subject, body } = job.data;
    await this.sendEmail(to, subject, body);
    return { success: true };
  }
}
```

**Docker Compose Redis Service:**
```yaml
redis:
  image: redis:7-alpine
  command: redis-server --appendonly yes
  volumes:
    - redis_data:/data
  healthcheck:
    test: ["CMD", "redis-cli", "ping"]
```

### Job Configuration Best Practices
- Set retry attempts: `{ attempts: 3, backoff: { type: 'exponential', delay: 2000 } }`
- Remove completed jobs: `{ removeOnComplete: true }`
- Set job timeout: `{ timeout: 60000 }`
- Use job priorities for critical tasks

### Alternatives Considered
- **Bull (legacy)**: Rejected - superseded by BullMQ
- **node-schedule**: Rejected - no persistence, no retries
- **Agenda**: Rejected - MongoDB dependency

---

## 5. CORS Configuration

### Decision
Use NestJS built-in `enableCors()` with environment-based origin whitelist

### Rationale
- Production-safe (no wildcards)
- Environment-specific configuration
- Handles preflight requests automatically
- Supports credentials (cookies/auth headers)

### Implementation

**Backend (main.ts):**
```typescript
const app = await NestFactory.create(AppModule);

const corsOrigins = process.env.NODE_ENV === 'production'
  ? process.env.CORS_ORIGINS.split(',')
  : ['http://localhost:3000', 'http://localhost:5173'];

app.enableCors({
  origin: corsOrigins,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
});
```

**Frontend (Vite dev proxy):**
```javascript
// vite.config.js
export default defineConfig({
  server: {
    proxy: {
      '/api': {
        target: 'http://localhost:3000',
        changeOrigin: true,
      }
    }
  }
})
```

### Environment Variables
```env
# Development
CORS_ORIGINS=http://localhost:3000,http://localhost:5173

# Production
CORS_ORIGINS=https://app.alvobot.ai,https://www.alvobot.ai
```

### Important Notes
- Cannot use `origin: '*'` with `credentials: true`
- Vite dev server runs on port 5173, production Nginx on port 8080
- OPTIONS requests handled automatically by NestJS

---

## 6. Swagger/OpenAPI Documentation

### Decision
Use @nestjs/swagger for automatic API documentation generation

### Rationale
- Zero-configuration documentation from decorators
- Interactive UI for testing endpoints
- OpenAPI 3.0 specification generated automatically
- Supports authentication schemes (Bearer tokens)

### Implementation

**Setup (main.ts):**
```typescript
const config = new DocumentBuilder()
  .setTitle('AlvoBot API')
  .setDescription('Backend API for AlvoBot')
  .setVersion('1.0')
  .addBearerAuth()
  .build();

const document = SwaggerModule.createDocument(app, config);
SwaggerModule.setup('api/docs', app, document);
```

**Controller Decorators:**
```typescript
@ApiTags('Users')
@Controller('api/users')
export class UsersController {
  @Post()
  @ApiOperation({ summary: 'Create user' })
  @ApiResponse({ status: 201, description: 'User created' })
  create(@Body() dto: CreateUserDto) {}
}
```

**DTO Decorators:**
```typescript
export class CreateUserDto {
  @ApiProperty({ example: 'user@example.com' })
  @IsEmail()
  email: string;
}
```

### Access
- **Development**: `http://localhost:3000/api/docs`
- **Production**: `https://api.alvobot.ai/docs`

### Conditional Disabling for Production
```typescript
if (process.env.NODE_ENV !== 'production') {
  SwaggerModule.setup('api/docs', app, document);
}
```

---

## 7. Docker Configuration

### Decision
Use multi-stage Dockerfiles for both frontend and backend

### Rationale
- Smaller production images (Alpine-based)
- Separate build and runtime environments
- Security: non-root users
- Optimized layer caching

### Backend Dockerfile

```dockerfile
# Stage 1: Dependencies
FROM node:20-alpine AS deps
WORKDIR /app
COPY package*.json ./
RUN npm ci

# Stage 2: Build
FROM node:20-alpine AS build
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npm run build

# Stage 3: Production
FROM node:20-alpine
WORKDIR /app
RUN apk add --no-cache dumb-init
RUN addgroup -g 1001 -S nodejs && adduser -S nestjs -u 1001

COPY --from=build --chown=nestjs:nodejs /app/dist ./dist
COPY --from=deps --chown=nestjs:nodejs /app/node_modules ./node_modules
COPY --chown=nestjs:nodejs package*.json ./

USER nestjs
EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=10s --start-period=40s \
  CMD node -e "require('http').get('http://localhost:3000/health', (r) => {if (r.statusCode !== 200) throw new Error(r.statusCode)})"

ENTRYPOINT ["dumb-init", "--"]
CMD ["node", "dist/main.js"]
```

### Frontend Dockerfile

```dockerfile
# Build stage
FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

# Production stage
FROM nginx:stable-alpine
RUN rm /etc/nginx/conf.d/default.conf
COPY nginx.conf /etc/nginx/conf.d/
COPY --from=builder /app/dist /usr/share/nginx/html

RUN adduser -D -H -u 101 -s /sbin/nologin nginx
RUN chown -R nginx:nginx /usr/share/nginx/html

USER nginx
EXPOSE 8080

HEALTHCHECK --interval=30s --timeout=3s \
  CMD wget --quiet --tries=1 --spider http://localhost:8080/ || exit 1
```

### Key Optimizations
- **Alpine base images**: 50-70% smaller than debian/ubuntu
- **Non-root users**: Security best practice
- **dumb-init**: Proper signal handling for graceful shutdowns
- **Multi-stage builds**: Only production dependencies in final image
- **Health checks**: Container orchestration readiness

---

## 8. Docker Compose Orchestration

### Decision
Single docker-compose.yml at repo root with health checks and service dependencies

### Rationale
- Automatic service discovery via DNS
- Health check cascading ensures proper startup order
- Named volumes for data persistence
- Simple local development environment

### docker-compose.yml

```yaml
version: '3.8'

services:
  redis:
    image: redis:7-alpine
    command: redis-server --appendonly yes
    healthcheck:
      test: ["CMD", "redis-cli", "ping"]
      interval: 10s
      timeout: 3s
      retries: 5
    volumes:
      - redis_data:/data
    networks:
      - app_network

  backend:
    build:
      context: .
      dockerfile: backend/Dockerfile
    ports:
      - "3000:3000"
    environment:
      - NODE_ENV=${NODE_ENV:-development}
      - REDIS_URL=redis://redis:6379
      - DATABASE_URL=${DATABASE_URL}
    depends_on:
      redis:
        condition: service_healthy
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:3000/health"]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 40s
    networks:
      - app_network

  frontend:
    build:
      context: .
      dockerfile: frontend/Dockerfile
    ports:
      - "8080:8080"
    depends_on:
      backend:
        condition: service_healthy
    networks:
      - app_network

networks:
  app_network:
    driver: bridge

volumes:
  redis_data:
    driver: local
```

### Service Communication
- Backend accesses Redis at `redis://redis:6379`
- Frontend proxies API requests to `http://backend:3000`
- DNS resolution handled automatically by Docker
- No hardcoded IP addresses needed

### Environment Management
```env
# .env file (not committed)
NODE_ENV=development
DATABASE_URL=postgresql://user:pass@host:5432/db
REDIS_URL=redis://redis:6379
CORS_ORIGINS=http://localhost:8080
```

---

## 9. Zero-Downtime Migration Strategy

### Decision
Use git mv to reorganize into monorepo structure incrementally

### Rationale
- Preserves git history for all files
- Incremental approach allows testing at each step
- Rollback-friendly with tagged backup points
- Zero impact on running production environment

### Migration Steps

**Phase 1: Backup**
```bash
git checkout -b pre-migration-backup
git tag -a migration-v0 -m "Pre-migration state"
```

**Phase 2: Move Frontend**
```bash
mkdir -p frontend
git mv src frontend/
git mv public frontend/
git mv package.json frontend/
git mv vite.config.js frontend/
git commit -m "chore: move Vue.js to frontend/"
```

**Phase 3: Update Configurations**
- Update `frontend/vite.config.js` paths
- Update `frontend/package.json` scripts
- Test build: `cd frontend && npm run build`

**Phase 4: Add Backend**
```bash
cd backend
nest new . --skip-git
cd ..
git add backend/
git commit -m "feat: add NestJS backend"
```

**Phase 5: Docker Integration**
- Create `docker-compose.yml`
- Create Dockerfiles for both services
- Test: `docker-compose up`

### Rollback Plan
```bash
# Quick rollback to pre-migration
git reset --hard migration-v0
git push --force-with-lease origin main
```

### Verification Checklist
- [ ] Frontend builds without errors
- [ ] All import paths resolve correctly
- [ ] Environment variables load
- [ ] Vite dev server starts
- [ ] Production build serves correctly
- [ ] No console errors in browser

---

## 10. Nginx Configuration for SPA

### Decision
Configure Nginx to serve Vue.js SPA with API proxying and proper caching

### Rationale
- Single point of entry for frontend and API
- Handles Vue Router client-side routing
- Optimizes static asset caching
- Adds security headers

### nginx.conf

```nginx
server {
  listen 8080;
  server_name _;

  # Gzip compression
  gzip on;
  gzip_types text/plain text/css application/json application/javascript;

  # Security headers
  add_header X-Frame-Options "SAMEORIGIN" always;
  add_header X-Content-Type-Options "nosniff" always;

  root /usr/share/nginx/html;
  index index.html;

  # Cache static assets
  location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg)$ {
    expires 1y;
    add_header Cache-Control "public, immutable";
  }

  # Proxy API requests
  location /api/ {
    proxy_pass http://backend:3000/api/;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
  }

  # SPA fallback
  location / {
    try_files $uri $uri/ /index.html;
  }
}
```

### Key Configuration Points
- `try_files $uri $uri/ /index.html` - Handles Vue Router routes
- Static assets cached for 1 year (Vite adds content hashes)
- API requests proxied to backend service
- Security headers prevent common attacks

---

## Summary of Key Decisions

| Area | Decision | Rationale |
|------|----------|-----------|
| **Backend Framework** | NestJS 10.x | Enterprise-grade, TypeScript-native, modular |
| **ORM** | Prisma 5.x | Type-safe, excellent DX, migration support |
| **Authentication** | Passport JWT | NestJS standard, Supabase compatible |
| **Job Queue** | BullMQ + Redis | Persistent, scalable, retry logic |
| **API Docs** | Swagger/OpenAPI | Auto-generated, interactive |
| **Containerization** | Docker multi-stage | Small images, secure, production-ready |
| **Orchestration** | Docker Compose | Simple, health checks, local dev parity |
| **Frontend Server** | Nginx | Fast, battle-tested, SPA-friendly |
| **Migration Strategy** | Git mv incremental | History preserved, rollback-friendly |

---

## Next Steps

With research complete, proceed to Phase 1:
1. Generate data model from feature spec entities
2. Create API contracts (OpenAPI spec)
3. Write quickstart guide for developers
4. Update agent context with new technologies

**Research Status**: ✅ Complete
**Ready for Phase 1**: Yes
