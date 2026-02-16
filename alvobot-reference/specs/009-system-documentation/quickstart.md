# AlvoBot 2 - Quickstart Guide

## Prerequisites

- Node.js 18+ (LTS recommended)
- npm 9+
- Git
- Supabase account (for database)
- Optional: Temporal server (for workflows)

## 1. Clone & Install

```bash
# Clone the repository
git clone https://github.com/your-org/alvobot-2.git
cd alvobot-2

# Install frontend dependencies
cd frontend && npm install

# Install backend dependencies
cd ../backend && npm install
```

## 2. Environment Setup

### Frontend (.env)

```bash
cd frontend
cp .env.example .env
```

Edit `frontend/.env`:
```env
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
VITE_API_URL=http://localhost:3001
```

### Backend (.env)

```bash
cd backend
cp .env.example .env
```

Edit `backend/.env`:
```env
# Core
BACKEND_PORT=3001
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_KEY=your-service-key
SUPABASE_JWT_SECRET=your-jwt-secret

# OpenAI (for AI features)
OPENAI_API_KEY=sk-your-key

# Optional integrations
RAPIDAPI_KEY=your-key
META_APP_ID=your-app-id
META_APP_SECRET=your-secret
GOOGLE_CLIENT_ID=your-client-id
GOOGLE_CLIENT_SECRET=your-secret

# Optional: Temporal
TEMPORAL_ADDRESS=localhost:7233

# CORS
FRONTEND_URL=http://localhost:5173
```

## 3. Database Setup

### Option A: Use Supabase Dashboard

1. Go to Supabase Dashboard → SQL Editor
2. Run the migration scripts from `database/migrations/`

### Option B: Use Supabase CLI

```bash
# Install Supabase CLI
npm install -g supabase

# Login
supabase login

# Link project
supabase link --project-ref your-project-ref

# Run migrations
supabase db push
```

### Required Tables

The following tables must exist (see `data-model.md` for schemas):

- `profiles` - User profiles
- `projects` - WordPress blogs
- `articles` - Generated articles
- `tasks` - Kanban tasks
- `keywords` - Mined keywords
- `keyword_usages` - Keyword-article links
- `flows` - Automation workflows
- `flow_runs` - Workflow executions
- `triggers` - Workflow triggers
- `workspaces` - Team workspaces
- `workspace_members` - Workspace memberships
- `oauth_connections` - OAuth tokens
- `notifications` - User notifications (NEW)
- `user_credits` - Credit balances (NEW)
- `user_settings` - User preferences (NEW)

## 4. Start Development Servers

### Terminal 1: Frontend

```bash
cd frontend
npm run dev
```

Frontend available at: http://localhost:5173

### Terminal 2: Backend

```bash
cd backend
npm run start:dev
```

Backend available at: http://localhost:3001

### Terminal 3: Temporal Worker (Optional)

```bash
cd backend
npm run worker:dev
```

## 5. Verify Setup

### Health Check

```bash
curl http://localhost:3001/health
# Expected: {"status":"ok"}
```

### Frontend Access

1. Open http://localhost:5173
2. You should see the login page
3. Create an account or sign in

### Test Database Connection

```bash
curl http://localhost:3001/health/detailed
# Expected: {"database":"connected","auth":"configured"}
```

## 6. Common Issues

### CORS Errors

Ensure `FRONTEND_URL` in backend `.env` matches your frontend URL:
```env
FRONTEND_URL=http://localhost:5173
```

### Supabase Connection Failed

1. Verify `SUPABASE_URL` is correct
2. Check if `SUPABASE_SERVICE_KEY` has proper permissions
3. Ensure RLS policies allow backend service role access

### OpenAI API Errors

1. Verify `OPENAI_API_KEY` is valid
2. Check API quota/billing in OpenAI dashboard
3. AI features will fail gracefully if key is missing

### Port Already in Use

```bash
# Find process using port
lsof -i :5173  # Frontend
lsof -i :3001  # Backend

# Kill process
kill -9 <PID>
```

## 7. Development Workflow

### Create New Feature

1. Create feature branch: `git checkout -b feature/my-feature`
2. Add feature folder: `frontend/src/features/my-feature/`
3. Follow existing patterns:
   - `api/` - TanStack Query hooks
   - `components/` - React components
   - `pages/` - Route pages
   - `types/` - TypeScript interfaces

### Add New API Endpoint

1. Create module in `backend/src/modules/my-feature/`
2. Add controller, service, DTOs
3. Register in `app.module.ts`
4. Add OpenAPI spec to `specs/*/contracts/`

### Database Changes

1. Create migration in `database/migrations/`
2. Test locally with Supabase CLI
3. Document schema in `data-model.md`
4. Update TypeScript types in `shared/types/`

## 8. Available Scripts

### Frontend

```bash
npm run dev       # Start dev server
npm run build     # Production build
npm run preview   # Preview production build
npm run lint      # Run ESLint
npm run type-check # TypeScript check
```

### Backend

```bash
npm run start:dev  # Start with hot reload
npm run start:prod # Start production
npm run build      # Build for production
npm run lint       # Run ESLint
npm run test       # Run unit tests
npm run test:e2e   # Run E2E tests
npm run worker:dev # Start Temporal worker (dev)
npm run worker:prod # Start Temporal worker (prod)
```

## 9. Key URLs

| Service | URL | Description |
|---------|-----|-------------|
| Frontend | http://localhost:5173 | React SPA |
| Backend API | http://localhost:3001 | NestJS API |
| Supabase Studio | https://app.supabase.com | Database management |
| Temporal UI | http://localhost:8080 | Workflow monitoring |

## 10. Next Steps

- Review [spec.md](./spec.md) for full system documentation
- Check [data-model.md](./data-model.md) for database schemas
- See [research.md](./research.md) for technology decisions
- Run `/speckit.tasks` to generate implementation tasks

---

**Questions?** Check the main README.md or open an issue on GitHub.
