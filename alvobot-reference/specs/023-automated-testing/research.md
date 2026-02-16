# Research: Sistema de Testes Automatizados

**Feature**: 023-automated-testing
**Date**: 2026-01-10

## 1. Framework de Testes Frontend

### Decision: Vitest + React Testing Library + MSW

### Rationale
- **Vitest**: Integração nativa com Vite (build tool do projeto), 10-20x mais rápido que Jest, API compatível com Jest para migração futura
- **React Testing Library**: Padrão da indústria para testes de componentes React, foca em comportamento vs implementação
- **MSW (Mock Service Worker)**: Intercepta requests no nível de rede, funciona tanto em testes quanto em desenvolvimento
- **happy-dom**: DOM virtual mais rápido que jsdom, suficiente para maioria dos testes

### Alternatives Considered
| Alternativa | Por que rejeitada |
|-------------|-------------------|
| Jest | Mais lento com Vite, requer configuração extra de ESM |
| Enzyme | Deprecado, não suporta React 18+ |
| jsdom | Mais lento que happy-dom, só necessário para APIs específicas do browser |
| Cypress Component Testing | Mais pesado, melhor para E2E que unit |

### Packages a Instalar
```bash
# Frontend testing dependencies
npm install -D vitest @vitest/ui @vitest/coverage-v8
npm install -D @testing-library/react @testing-library/jest-dom @testing-library/user-event
npm install -D msw happy-dom @faker-js/faker
```

---

## 2. Framework de Testes Backend

### Decision: Jest (existente) + nock para APIs externas

### Rationale
- **Jest**: Já configurado no projeto, padrão NestJS, bom suporte a mocking
- **Supertest**: Já instalado, ideal para testes de HTTP/API
- **nock**: Mock de HTTP requests externos (OpenAI, Meta, Google) sem interceptar requests internos
- **@nestjs/testing**: Já instalado, fornece TestingModule para testes isolados

### Alternatives Considered
| Alternativa | Por que rejeitada |
|-------------|-------------------|
| Vitest | Não é padrão NestJS, requeriria reconfiguração |
| MSW no backend | nock é mais simples para Node.js puro |
| Testcontainers | Complexidade adicional para MVP, considerar em fase futura |

### Packages a Instalar
```bash
# Backend testing dependencies (adicionais)
npm install -D nock @faker-js/faker
```

---

## 3. Framework de Testes E2E

### Decision: Playwright

### Rationale
- **Cross-browser**: Chrome, Firefox, Safari, Mobile - importante para app web
- **Auto-wait**: Espera inteligente por elementos, reduz flakiness
- **Trace viewer**: Debug visual de testes falhando
- **Fixtures nativas**: Gerenciamento de estado/autenticação built-in
- **Mais rápido**: Execução paralela nativa, mais rápido que Cypress

### Alternatives Considered
| Alternativa | Por que rejeitada |
|-------------|-------------------|
| Cypress | Mais lento, licenciamento para parallelism, single-tab only |
| Selenium | API mais antiga, setup mais complexo |
| TestCafe | Menos popular, menor ecossistema |
| Puppeteer | Apenas Chrome, menos features de testing |

### Packages a Instalar
```bash
# E2E (nova pasta)
mkdir e2e && cd e2e
npm init -y
npm install -D @playwright/test
npx playwright install chromium firefox
```

---

## 4. Estratégia de Banco de Dados para Testes

### Decision: Supabase Local para unit/integration, Projeto Separado para E2E

### Rationale

**Unit Tests (Frontend/Backend)**:
- Mock completo do Supabase client
- Não toca banco real
- Máxima velocidade

**Integration Tests (Backend)**:
- Supabase Local via Docker (CLI)
- Migrations aplicadas automaticamente
- Dados limpos entre testes

**E2E Tests**:
- Projeto Supabase dedicado para testes
- Evita conflito com desenvolvimento
- Permite testes paralelos sem colisão

### Alternatives Considered
| Alternativa | Por que rejeitada |
|-------------|-------------------|
| Banco de produção | Risco de dados, lentidão, dependência |
| Testcontainers PostgreSQL | Perde features do Supabase (RLS, Auth) |
| Banco staging | Conflito entre múltiplos devs/CI |

### Setup Necessário
```bash
# Local development
supabase start
supabase db push

# CI environment (GitHub Actions)
# Usar projeto Supabase dedicado: alvobot-test
# Secrets: SUPABASE_TEST_URL, SUPABASE_TEST_ANON_KEY, SUPABASE_TEST_SERVICE_KEY
```

---

## 5. Estrutura de Mocks

### Decision: Mocks tipados e centralizados por domínio

### Rationale
- Mocks centralizados evitam duplicação
- Tipagem TypeScript garante sincronização com código real
- Factories com Faker geram dados realistas

### Mock Structure

```typescript
// frontend/src/test/mocks/supabase.ts
// Mock completo do cliente Supabase com tipagem

// frontend/src/test/mocks/handlers.ts
// MSW handlers para todas as rotas da API

// frontend/src/test/factories/
// Factories por entidade usando @faker-js/faker

// backend/test/mocks/external-apis.ts
// nock mocks para OpenAI, Meta, Google, WordPress
```

---

## 6. CI/CD Pipeline

### Decision: GitHub Actions com jobs paralelos

### Rationale
- GitHub Actions é padrão do projeto
- Jobs paralelos reduzem tempo total
- Caching de node_modules acelera execução
- Artifacts para relatórios de cobertura

### Pipeline Structure

```yaml
# .github/workflows/test.yml
jobs:
  frontend-tests:      # Vitest unit tests
  backend-unit-tests:  # Jest unit tests
  backend-integration: # Jest E2E (depende de unit)
  e2e-tests:           # Playwright (depende de todos)
```

### Targets
- Frontend tests: < 2 min
- Backend unit: < 2 min
- Backend integration: < 3 min
- E2E tests: < 5 min
- **Total pipeline: < 10 min**

---

## 7. Testes de RLS

### Decision: Scripts SQL com assertions em transações

### Rationale
- Testes SQL diretos são mais precisos para RLS
- Transações garantem isolamento e rollback
- Podem rodar via Supabase CLI ou psql

### Alternatives Considered
| Alternativa | Por que rejeitada |
|-------------|-------------------|
| pgTAP | Complexidade adicional, overkill para escopo |
| Testes via API | Não testa RLS diretamente, pode mascarar bugs |

### Pattern
```sql
BEGIN;
  SET LOCAL ROLE authenticated;
  SET LOCAL request.jwt.claims TO '{"sub": "user-id"}';
  -- assertions
ROLLBACK;
```

---

## 8. Coverage Requirements

### Decision: 70% como threshold inicial

### Rationale
- 70% é balanceado: bom coverage sem over-testing
- Foca em código crítico (services, hooks, utils)
- Permite crescimento gradual
- Threshold configurável para aumentar depois

### Exclusions
```typescript
// Arquivos excluídos do coverage:
- **/*.d.ts        // Type definitions
- **/index.ts      // Barrel exports
- **/*.stories.tsx // Storybook (se houver)
- src/test/**      // Test utilities
```

---

## 9. Componentes Prioritários para Testes Iniciais

### Frontend (P1)
1. `shared/components/Button` - usado em toda app
2. `shared/components/Input` - validação de forms
3. `shared/components/Modal` - interações complexas
4. `features/auth/hooks/useAuth` - autenticação crítica
5. `shared/utils/supabase` - cliente base

### Backend (P1)
1. `modules/auth/auth.service` - autenticação
2. `modules/auth/jwt.strategy` - validação JWT
3. `common/supabase/supabase.service` - acesso a dados
4. `modules/base-structure/base-structure.service` - geração AI

### E2E (P1)
1. Login flow
2. Signup flow
3. Create project flow

### RLS (P1)
1. `projects` - dados de usuário
2. `articles` - conteúdo gerado
3. `system_prompts` - permissões admin

---

## 10. Convenções de Nomenclatura

### Decision: Padrão da indústria por tipo de teste

| Tipo | Pattern | Exemplo |
|------|---------|---------|
| Unit Frontend | `*.test.tsx` | `Button.test.tsx` |
| Unit Backend | `*.spec.ts` | `auth.service.spec.ts` |
| Integration | `*.e2e-spec.ts` | `auth.e2e-spec.ts` |
| E2E Playwright | `*.spec.ts` | `login.spec.ts` |
| RLS | `*.test.sql` | `projects.test.sql` |

### Describe/Test Pattern
```typescript
describe('ComponentName', () => {
  describe('when condition', () => {
    it('should behavior', () => {})
  })
})
```

---

## Summary

| Área | Decisão | Justificativa Principal |
|------|---------|------------------------|
| Frontend Testing | Vitest + RTL + MSW | Velocidade + compatibilidade Vite |
| Backend Testing | Jest + nock | Já configurado + padrão NestJS |
| E2E Testing | Playwright | Cross-browser + velocidade + features |
| Banco de Testes | Supabase Local + Projeto Teste | Isolamento + features Supabase |
| CI/CD | GitHub Actions | Já é padrão do projeto |
| RLS Testing | SQL scripts | Teste direto de policies |
| Coverage | 70% threshold | Balanceado para início |
