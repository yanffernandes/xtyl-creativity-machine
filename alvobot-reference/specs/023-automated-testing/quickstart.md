# Quickstart: Sistema de Testes Automatizados

**Feature**: 023-automated-testing
**Date**: 2026-01-10

## Prerequisites

- Node.js 20+
- Docker (para Supabase local)
- Supabase CLI instalado
- Projeto clonado com `npm install` executado em frontend/ e backend/

---

## 1. Setup Rápido

### Frontend (Vitest)

```bash
cd frontend

# Instalar dependências de teste
npm install -D vitest @vitest/ui @vitest/coverage-v8
npm install -D @testing-library/react @testing-library/jest-dom @testing-library/user-event
npm install -D msw happy-dom @faker-js/faker

# Executar testes
npm run test

# Executar com UI
npm run test:ui

# Executar com coverage
npm run test:coverage
```

### Backend (Jest)

```bash
cd backend

# Instalar dependências adicionais
npm install -D nock @faker-js/faker

# Executar testes unitários
npm run test

# Executar com coverage
npm run test:cov

# Executar testes E2E
npm run test:e2e
```

### E2E (Playwright)

```bash
cd e2e

# Setup inicial
npm install -D @playwright/test
npx playwright install chromium

# Executar testes (requer app rodando)
npm run test

# Executar com UI
npm run test:ui

# Ver relatório
npm run report
```

---

## 2. Executar Testes Localmente

### Todos os testes (sequencial)

```bash
# Na raiz do projeto
cd frontend && npm run test && cd ..
cd backend && npm run test && cd ..
cd e2e && npm run test
```

### Com Supabase Local (para integration)

```bash
# Terminal 1: Iniciar Supabase
supabase start

# Terminal 2: Rodar testes de integração
cd backend && npm run test:e2e
```

---

## 3. Escrever Primeiro Teste

### Teste de Componente (Frontend)

```typescript
// frontend/src/shared/components/Button/Button.test.tsx
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Button } from './index'

describe('Button', () => {
  it('renders with text', () => {
    render(<Button>Click me</Button>)
    expect(screen.getByRole('button', { name: /click me/i })).toBeInTheDocument()
  })

  it('calls onClick when clicked', async () => {
    const onClick = vi.fn()
    render(<Button onClick={onClick}>Click</Button>)

    await userEvent.click(screen.getByRole('button'))
    expect(onClick).toHaveBeenCalledTimes(1)
  })
})
```

### Teste de Service (Backend)

```typescript
// backend/src/modules/auth/auth.service.spec.ts
import { Test, TestingModule } from '@nestjs/testing'
import { AuthService } from './auth.service'
import { JwtService } from '@nestjs/jwt'

describe('AuthService', () => {
  let service: AuthService

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        {
          provide: JwtService,
          useValue: { verify: jest.fn().mockReturnValue({ sub: 'user-123' }) },
        },
      ],
    }).compile()

    service = module.get<AuthService>(AuthService)
  })

  it('should validate token', async () => {
    const result = await service.validateToken('valid-token')
    expect(result).toHaveProperty('sub', 'user-123')
  })
})
```

### Teste E2E (Playwright)

```typescript
// e2e/tests/auth/login.spec.ts
import { test, expect } from '@playwright/test'

test('user can login', async ({ page }) => {
  await page.goto('/login')

  await page.fill('[name="email"]', 'test@example.com')
  await page.fill('[name="password"]', 'password123')
  await page.click('button[type="submit"]')

  await expect(page).toHaveURL('/dashboard')
})
```

---

## 4. Usar Mocks e Factories

### Usando Factory de Usuário

```typescript
import { UserFactory } from '@/test/factories'

const user = UserFactory.create()
// { id: 'uuid', email: 'test-123@test.alvobot.com', ... }

const users = UserFactory.createMany(5)
// Array com 5 usuários únicos
```

### Usando Mock do Supabase

```typescript
import { mockSupabase } from '@/test/mocks/supabase'

// O mock é aplicado automaticamente via setup.ts
// Para customizar:
mockSupabase.from('projects').select.mockResolvedValue({
  data: [{ id: '1', name: 'Test Project' }],
  error: null,
})
```

### Usando MSW

```typescript
import { server } from '@/test/mocks/server'
import { http, HttpResponse } from 'msw'

// Dentro do teste:
server.use(
  http.get('/api/projects', () => {
    return HttpResponse.json([{ id: '1', name: 'Custom' }])
  })
)
```

---

## 5. Estrutura de Arquivos

### Frontend
```
frontend/src/
├── test/
│   ├── setup.ts           # Setup global
│   ├── mocks/
│   │   ├── supabase.ts    # Mock Supabase
│   │   ├── handlers.ts    # MSW handlers
│   │   └── server.ts      # MSW server
│   ├── utils/
│   │   └── render.tsx     # Custom render
│   └── factories/
│       └── index.ts       # Todas factories
└── features/
    └── [feature]/
        └── __tests__/     # Testes aqui
```

### Backend
```
backend/
├── src/modules/
│   └── [module]/
│       └── *.spec.ts      # Unit tests
└── test/
    ├── mocks/
    │   └── external-apis.ts
    └── modules/
        └── *.e2e-spec.ts  # Integration
```

### E2E
```
e2e/
├── tests/
│   └── [feature]/
│       └── *.spec.ts
├── pages/
│   └── *.page.ts          # Page Objects
└── fixtures/
    └── *.fixture.ts
```

---

## 6. Scripts Disponíveis

### Frontend (package.json)
```json
{
  "test": "vitest",
  "test:ui": "vitest --ui",
  "test:coverage": "vitest run --coverage",
  "test:watch": "vitest --watch"
}
```

### Backend (package.json)
```json
{
  "test": "jest",
  "test:watch": "jest --watch",
  "test:cov": "jest --coverage",
  "test:e2e": "jest --config ./test/jest-e2e.json"
}
```

### E2E (package.json)
```json
{
  "test": "playwright test",
  "test:ui": "playwright test --ui",
  "test:headed": "playwright test --headed",
  "report": "playwright show-report"
}
```

---

## 7. CI/CD

Os testes rodam automaticamente em cada PR via GitHub Actions.

Para simular CI localmente:
```bash
# Frontend
cd frontend && npm run test:coverage

# Backend
cd backend && npm run test:cov

# E2E (requer app rodando)
cd frontend && npm run build && npm run preview &
cd backend && npm run start:prod &
cd e2e && npm run test
```

---

## Troubleshooting

### "Cannot find module" em testes
```bash
# Verificar se path alias está configurado em vitest.config.ts
resolve: {
  alias: { '@': path.resolve(__dirname, './src') }
}
```

### Testes E2E falham no CI
- Verificar se `webServer` está configurado no playwright.config.ts
- Garantir que secrets do Supabase Test estão configurados

### Coverage baixo
```bash
# Ver arquivos não cobertos
npm run test:coverage -- --reporter=text
```

### MSW não intercepta requests
- Verificar se `server.listen()` está no setup.ts
- Confirmar que handlers estão exportados corretamente

---

## Próximos Passos

1. Implementar setup conforme `/speckit.tasks`
2. Adicionar testes para componentes críticos
3. Configurar CI pipeline
4. Aumentar coverage gradualmente para 70%
