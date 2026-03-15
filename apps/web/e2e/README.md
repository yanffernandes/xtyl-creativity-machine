# E2E com Playwright

Testes de interface e usabilidade do app (React + Vite), incluindo os criados após a migração full-stack para validar fluxos críticos.

## Setup

1. Copie o exemplo de env e preencha com uma conta de teste (Supabase):

   ```bash
   cp .env.test.example .env.test
   # Edite .env.test: E2E_TEST_EMAIL, E2E_TEST_PASSWORD, E2E_BASE_URL (opcional)
   ```

2. Instale dependências e browsers do Playwright (se ainda não fez):

   ```bash
   bun install
   bunx playwright install chromium
   ```

## Comandos

| Comando | Descrição |
|--------|-----------|
| `bun run test:e2e` | Roda todos os E2E (sobe o dev server na 4000 se não estiver rodando) |
| `bun run test:e2e:ui` | Abre a UI do Playwright |
| `bun run test:e2e:headed` | Roda com o browser visível |
| `bun run test:e2e:debug` | Modo debug (pause, step) |

## Estrutura

- **`auth.setup.ts`** – Faz login e grava o estado em `.auth/user.json`; usado pelos testes que dependem de sessão.
- **`projects.spec.ts`**, **`documents.spec.ts`**, **`chat.spec.ts`** – Testes de fluxos com usuário já autenticado (projeto chromium).
- **`diagnose.spec.ts`** – Diagnóstico: login + navegação, captura erros de console e rede.
- **`diagnose-full.spec.ts`** – Fluxo completo pós-migração: **login → workspace → project → studio → settings**. Registra erros de console/rede e salva screenshots em `/tmp/diag-01-login.png` … `/tmp/diag-07-settings.png`. Roda no projeto **diagnostic** (sem auth salva).

Quando a aplicação sobe pelo `./start.sh`, o frontend fica em **http://localhost:4000**; o config do Playwright e o `.env.test.example` usam essa porta por padrão.
