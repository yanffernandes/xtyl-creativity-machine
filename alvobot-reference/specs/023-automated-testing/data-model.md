# Data Model: Sistema de Testes Automatizados

**Feature**: 023-automated-testing
**Date**: 2026-01-10

## Overview

Este documento define os modelos de dados para a infraestrutura de testes. Como testes não persistem dados permanentes, este modelo foca em:
1. **Factories** - Estrutura de dados de teste
2. **Fixtures** - Estados reutilizáveis
3. **Mocks** - Simulações de dependências

---

## 1. Test Data Factories

### UserFactory

```typescript
interface TestUser {
  id: string          // UUID
  email: string       // formato: test-{timestamp}@test.alvobot.com
  password: string    // senha padrão para testes
  full_name: string
  avatar_url?: string
  created_at: Date
}

// Uso:
const user = UserFactory.create()
const users = UserFactory.createMany(5)
const adminUser = UserFactory.create({ role: 'admin' })
```

### ProjectFactory

```typescript
interface TestProject {
  id: string
  user_id: string
  workspace_id: string
  name: string
  url: string         // formato: https://test-{random}.example.com
  status: 'active' | 'inactive' | 'pending'
  created_at: Date
  updated_at: Date
}

// Relacionamentos:
// - belongs_to: User (via user_id)
// - belongs_to: Workspace (via workspace_id)
```

### WorkspaceFactory

```typescript
interface TestWorkspace {
  id: string
  name: string
  owner_id: string
  created_at: Date
}

// Relacionamentos:
// - has_many: Projects
// - has_many: WorkspaceMembers
// - belongs_to: User (owner)
```

### ArticleFactory

```typescript
interface TestArticle {
  id: string
  project_id: string
  user_id: string
  title: string
  content: string     // HTML content
  status: 'draft' | 'published' | 'scheduled'
  published_at?: Date
  created_at: Date
}
```

### SystemPromptFactory

```typescript
interface TestSystemPrompt {
  id: string
  slug: string
  name: string
  prompt_template: string
  variables: Record<string, unknown>
  is_active: boolean
  created_by?: string
}
```

---

## 2. Test Fixtures

### AuthenticatedUserFixture

```typescript
interface AuthFixture {
  user: TestUser
  session: {
    access_token: string
    refresh_token: string
    expires_at: number
  }
  cleanup: () => Promise<void>
}

// Uso em Playwright:
test.use({ authenticatedPage: AuthFixture })

// Lifecycle:
// 1. beforeAll: Cria usuário no Supabase
// 2. beforeEach: Login e obtem sessão
// 3. afterAll: Deleta usuário e dados
```

### DatabaseFixture

```typescript
interface DatabaseFixture {
  user: TestUser
  workspace: TestWorkspace
  projects: TestProject[]

  seed: () => Promise<void>
  cleanup: () => Promise<void>
}

// Uso:
// Cria conjunto completo de dados relacionados para testes
```

---

## 3. Mock Structures

### SupabaseMock

```typescript
interface SupabaseMockConfig {
  auth: {
    session: TestSession | null
    user: TestUser | null
  }

  // Responses configuráveis por tabela
  tables: {
    [tableName: string]: {
      select: TestData[]
      insert: TestData
      update: TestData
      delete: { success: boolean }
      error?: PostgrestError
    }
  }
}
```

### MSW Handlers Structure

```typescript
// Handlers organizados por domínio
const handlers = [
  // Supabase Auth
  http.post('*/auth/v1/token', authHandler),
  http.get('*/auth/v1/user', userHandler),

  // Supabase Database
  http.get('*/rest/v1/projects*', projectsHandler),
  http.post('*/rest/v1/projects*', createProjectHandler),

  // Backend API
  http.post('*/base-structure/*', baseStructureHandler),
  http.get('*/meta/*', metaHandler),
]
```

### External API Mocks (nock)

```typescript
// OpenAI
nock('https://api.openai.com')
  .post('/v1/chat/completions')
  .reply(200, { choices: [{ message: { content: 'response' } }] })

// Meta Graph API
nock('https://graph.facebook.com')
  .get(/\/v\d+\.0\/me\/adaccounts/)
  .reply(200, { data: [...] })

// Google Ads API
nock('https://googleads.googleapis.com')
  .post(/\/v\d+\/customers.*/)
  .reply(200, { results: [...] })
```

---

## 4. Test Context Providers

### QueryClientProvider (Frontend)

```typescript
interface TestQueryClientConfig {
  defaultOptions: {
    queries: {
      retry: false          // Não retry em testes
      staleTime: Infinity   // Dados nunca stale em testes
    }
  }
}

function createTestQueryClient(): QueryClient {
  return new QueryClient(TestQueryClientConfig)
}
```

### TestWrapper (Frontend)

```typescript
interface TestWrapperProps {
  children: React.ReactNode
  initialRoute?: string
  queryClient?: QueryClient
  authState?: Partial<AuthState>
}

// Wrapper padrão inclui:
// - QueryClientProvider
// - BrowserRouter / MemoryRouter
// - AuthProvider (mockado)
```

---

## 5. RLS Test Contexts

### Test User Contexts

```sql
-- Contexto de usuário comum
CREATE OR REPLACE FUNCTION set_test_user(user_id UUID)
RETURNS void AS $$
BEGIN
  SET LOCAL ROLE authenticated;
  SET LOCAL request.jwt.claims TO json_build_object('sub', user_id::text);
END;
$$ LANGUAGE plpgsql;

-- Contexto de admin
CREATE OR REPLACE FUNCTION set_test_admin(user_id UUID)
RETURNS void AS $$
BEGIN
  SET LOCAL ROLE authenticated;
  SET LOCAL request.jwt.claims TO json_build_object(
    'sub', user_id::text,
    'role', 'admin'
  );
END;
$$ LANGUAGE plpgsql;

-- Contexto de service role (backend)
CREATE OR REPLACE FUNCTION set_service_role()
RETURNS void AS $$
BEGIN
  SET LOCAL ROLE service_role;
END;
$$ LANGUAGE plpgsql;
```

---

## 6. Coverage Tracking Model

### CoverageReport

```typescript
interface CoverageReport {
  timestamp: Date
  commit: string
  branch: string

  summary: {
    statements: { covered: number; total: number; pct: number }
    branches: { covered: number; total: number; pct: number }
    functions: { covered: number; total: number; pct: number }
    lines: { covered: number; total: number; pct: number }
  }

  files: CoverageFile[]
}

interface CoverageFile {
  path: string
  statements: number
  branches: number
  functions: number
  lines: number
  uncoveredLines: number[]
}
```

---

## Entity Relationships Diagram

```
┌─────────────────┐
│   TestUser      │
└────────┬────────┘
         │ 1:N
         ▼
┌─────────────────┐     1:N    ┌─────────────────┐
│  TestWorkspace  │───────────▶│   TestProject   │
└─────────────────┘            └────────┬────────┘
                                        │ 1:N
                                        ▼
                               ┌─────────────────┐
                               │  TestArticle    │
                               └─────────────────┘

┌─────────────────┐
│ TestSystemPrompt│  (standalone, admin-only)
└─────────────────┘

┌─────────────────┐     uses    ┌─────────────────┐
│   TestFixture   │────────────▶│   TestFactory   │
└─────────────────┘             └─────────────────┘
         │
         │ creates
         ▼
┌─────────────────┐
│ TestContext/Mock│
└─────────────────┘
```

---

## Notes

1. **Factories** geram dados únicos por execução usando timestamps e UUIDs
2. **Fixtures** gerenciam ciclo de vida (setup/teardown) automaticamente
3. **Mocks** são tipados para garantir sincronização com código real
4. Todos os dados de teste usam domínio `@test.alvobot.com` para fácil identificação
5. IDs de teste seguem padrão `test-{entity}-{uuid}` quando possível
