# 🚀 PLANO DE ARQUITETURA HÍBRIDA - ALVOBOT 2.0

## 📋 ÍNDICE
1. [Visão Geral](#visão-geral)
2. [Stack Tecnológica](#stack-tecnológica)
3. [Arquitetura](#arquitetura)
4. [Divisão de Responsabilidades](#divisão-de-responsabilidades)
5. [Estrutura do Projeto](#estrutura-do-projeto)
6. [Plano de Implementação](#plano-de-implementação)
7. [Decisões Tomadas](#decisões-tomadas)

---

## 🎯 VISÃO GERAL

### Situação Atual
- **Frontend**: Vue.js 3 + Vite (exportado do WeWeb)
- **Backend**: Não existe (tudo no Supabase direto)
- **Database**: Supabase PostgreSQL
- **Auth**: Supabase Auth
- **Storage**: Supabase Storage

### Objetivo
Criar arquitetura híbrida onde:
- **Funcionalidades existentes** continuam funcionando via Supabase direto (CRUD simples)
- **Novas funcionalidades complexas** passam por backend Node.js (APIs externas, webhooks, jobs assíncronos)

### Princípio
> **"Não mexe em time que está ganhando"** - Mantém o que funciona, adiciona backend só para o que realmente precisa.

---

## 🛠️ STACK TECNOLÓGICA

### Frontend (MANTÉM)
```yaml
Framework: Vue.js 3
Build Tool: Vite
Language: JavaScript (.js mantido, sem migração para TS agora)
State Management: Pinia
Router: Vue Router 4
HTTP Client: Axios
UI: CSS atual (sem mudanças)
```

### Backend (NOVO)
```yaml
Framework: NestJS
Language: TypeScript
ORM: Prisma
Validation: class-validator + class-transformer
Queue: BullMQ (Redis)
Cache: Redis
Auth: JWT validation (integra com Supabase Auth)
Documentation: Swagger/OpenAPI (automático)
```

### Database (MANTÉM)
```yaml
Primary: Supabase PostgreSQL
Cache/Queue: Redis
```

### Deploy
```yaml
Platform: EasyPanel
Orchestration: Docker Compose
Services:
  - Frontend (Nginx)
  - Backend (Node.js)
  - Redis
```

---

## 🏗️ ARQUITETURA

```
┌─────────────────────────────────────────────────────┐
│              FRONTEND (Vue.js 3)                    │
│  - Interface atual (mantém tudo funcionando)        │
│  - Componentes WeWeb exportados                     │
└─────────────────────────────────────────────────────┘
         │                                    │
         │ (95% do tráfego)                   │ (5% - só o novo)
         │                                    │
         ↓                                    ↓
┌──────────────────────┐         ┌─────────────────────────┐
│  SUPABASE (mantém)   │         │  BACKEND (novo/futuro)  │
│                      │         │                         │
│  ✅ Blogs CRUD       │         │  🆕 Meta Ads API       │
│  ✅ Projetos CRUD    │         │  🆕 Google Ads API     │
│  ✅ Artigos CRUD     │         │  🆕 Webhooks           │
│  ✅ Mineração 10x    │         │  🆕 Disparos Auto      │
│  ✅ Auth             │         │  🆕 Acionadores        │
│  ✅ Storage          │         │  🆕 Cron Jobs          │
│  ✅ Realtime         │◄────────│  (usa Supabase SDK)    │
└──────────────────────┘         └─────────────────────────┘
                                            │
                                            ↓
                                    ┌───────────────┐
                                    │     Redis     │
                                    │  Cache + Jobs │
                                    └───────────────┘
```

---

## 📊 DIVISÃO DE RESPONSABILIDADES

### Frontend → Supabase (DIRETO - Mantém funcionando)

| Funcionalidade | Status | Motivo |
|----------------|--------|--------|
| **Listagem de Blogs** | ✅ Mantém | CRUD simples, já funciona |
| **Criar/Editar Blog** | ✅ Mantém | CRUD simples, já funciona |
| **Listagem de Projetos** | ✅ Mantém | CRUD simples, já funciona |
| **Criar/Editar Projeto** | ✅ Mantém | CRUD simples, já funciona |
| **Artigos (CRUD)** | ✅ Mantém | CRUD simples, já funciona |
| **Artigos Flecha** | ✅ Mantém | Funcionalidade existente |
| **Mineração 10x** | ✅ Mantém | Funcionalidade existente |
| **Estrutura de Base** | ✅ Mantém | Funcionalidade existente |
| **Autenticação** | ✅ Mantém | Supabase Auth funciona bem |
| **Upload de arquivos** | ✅ Mantém | Supabase Storage funciona |
| **Realtime updates** | ✅ Mantém | Supabase Realtime funciona |

### Frontend → Backend → Supabase (NOVO - Só para features complexas)

| Funcionalidade | Status | Motivo |
|----------------|--------|--------|
| **Conexões Meta Ads** | 🆕 Backend | OAuth, API keys sensíveis, processamento async |
| **Conexões Google Ads** | 🆕 Backend | OAuth, API keys sensíveis, processamento async |
| **Disparos Automatizados** | 🆕 Backend | Cron jobs, processamento em background |
| **Webhooks (receber)** | 🆕 Backend | Precisa endpoint público, validação complexa |
| **Acionadores Complexos** | 🆕 Backend | Orquestração multi-step, retry logic |
| **Meus Fluxos** | 🆕 Backend | Workflows complexos, state machine |
| **Integrações Futuras** | 🆕 Backend | WhatsApp, Analytics, outras APIs |
| **Relatórios Complexos** | 🆕 Backend | Agregação de múltiplas fontes |

---

## 📁 ESTRUTURA DO PROJETO

### Monorepo
```
alvobot-2/
├── frontend/                      # Código Vue.js atual (WeWeb exportado)
│   ├── src/
│   │   ├── _front/               # Componentes WeWeb
│   │   ├── _common/              # Helpers, stores
│   │   ├── wwLib/                # Biblioteca WeWeb
│   │   └── components/           # Componentes customizados
│   ├── public/
│   ├── package.json
│   ├── vite.config.js
│   └── Dockerfile
│
├── backend/                       # Novo - NestJS
│   ├── src/
│   │   ├── modules/
│   │   │   ├── auth/             # Validação JWT Supabase
│   │   │   ├── health/           # Health check
│   │   │   ├── meta-ads/         # 🆕 Meta Ads integration
│   │   │   ├── google-ads/       # 🆕 Google Ads integration
│   │   │   ├── webhooks/         # 🆕 Webhook receiver
│   │   │   ├── triggers/         # 🆕 Disparos automatizados
│   │   │   └── workflows/        # 🆕 Fluxos complexos
│   │   ├── common/
│   │   │   ├── guards/           # Auth guards
│   │   │   ├── interceptors/     # Logging, transform
│   │   │   ├── filters/          # Error handling
│   │   │   └── decorators/       # Custom decorators
│   │   ├── config/               # Configurações
│   │   └── database/             # Prisma client
│   ├── prisma/
│   │   └── schema.prisma         # Schema do Supabase
│   ├── test/
│   ├── package.json
│   ├── tsconfig.json
│   └── Dockerfile
│
├── docker-compose.yml             # Orquestração dos serviços
├── .env.example                   # Variáveis de ambiente template
├── .gitignore
├── README.md
└── PLANO_ARQUITETURA_HIBRIDA.md  # Este arquivo
```

---

## 🚀 PLANO DE IMPLEMENTAÇÃO

### Fase 0 - Preparação (Semana 1)
**Objetivo**: Organizar projeto sem quebrar nada

**Tarefas**:
- [ ] Criar estrutura de monorepo
- [ ] Mover código Vue.js atual para `/frontend`
- [ ] Criar estrutura básica do backend em `/backend`
- [ ] Configurar Docker Compose
- [ ] Documentar variáveis de ambiente
- [ ] Testar que frontend continua funcionando 100%

**Entregável**: Projeto organizado, frontend funcionando igual

---

### Fase 1 - Backend Básico (Semana 2)
**Objetivo**: Backend rodando com funcionalidades mínimas

**Tarefas**:
- [ ] Setup NestJS com TypeScript
- [ ] Configurar Prisma com schema do Supabase
- [ ] Implementar health check endpoint (`/health`)
- [ ] Implementar SupabaseAuthGuard (validação JWT)
- [ ] Conectar com Supabase via SDK
- [ ] Setup Redis (Docker)
- [ ] Configurar BullMQ para queues
- [ ] Implementar logging básico
- [ ] Configurar Swagger/OpenAPI

**Endpoints**:
```
GET  /health              # Health check
GET  /api/docs            # Swagger UI
POST /auth/validate       # Valida token Supabase (teste)
```

**Entregável**: Backend funcionando, mas frontend ainda não usa

---

### Fase 2 - Deploy Inicial (Semana 3)
**Objetivo**: Deploy no EasyPanel com Docker Compose

**Tarefas**:
- [ ] Criar Dockerfile para frontend (Nginx)
- [ ] Criar Dockerfile para backend (Node)
- [ ] Configurar docker-compose.yml
- [ ] Setup variáveis de ambiente no EasyPanel
- [ ] Configurar domínios/subdomínios
- [ ] Testar deploy completo
- [ ] Configurar health checks
- [ ] Setup logs centralizados

**Infraestrutura**:
```yaml
services:
  frontend:
    - Porta: 3000
    - Domínio: app.alvobot.ai

  backend:
    - Porta: 4000
    - Domínio: api.alvobot.ai

  redis:
    - Porta: 6379 (interno)
    - Volume persistente
```

**Entregável**: Aplicação rodando em produção, frontend funcionando normalmente

---

### Fase 3 - Primeira Feature (POC) (Semana 4-5)
**Objetivo**: Implementar primeira feature complexa no backend

**Feature Escolhida**: A definir (Meta Ads, Google Ads, Webhooks ou Disparos)

**Tarefas (exemplo Meta Ads)**:
- [ ] Implementar OAuth flow (Meta/Facebook)
- [ ] Criar endpoints de conexão
- [ ] Salvar tokens encrypted no Supabase
- [ ] Implementar refresh token automático
- [ ] Criar job assíncrono para sync de campanhas
- [ ] Implementar worker BullMQ
- [ ] Adicionar logging e error handling
- [ ] Criar testes unitários
- [ ] Adicionar botão no frontend para conectar

**Endpoints**:
```
POST /integrations/meta-ads/connect        # Inicia OAuth
GET  /integrations/meta-ads/callback       # Callback OAuth
POST /integrations/meta-ads/sync           # Sync campanhas
GET  /integrations/meta-ads/status/:blogId # Status da integração
```

**Frontend Changes** (mínimo):
```vue
<!-- Adiciona SÓ botão novo -->
<button @click="connectMetaAds">
  Conectar Meta Ads
</button>
```

**Entregável**: Feature funcionando end-to-end, provando arquitetura

---

### Fase 4 - Expansão (Semana 6-8)
**Objetivo**: Adicionar mais features complexas

**Tarefas**:
- [ ] Implementar segunda integração (Google Ads)
- [ ] Implementar sistema de Webhooks
- [ ] Implementar Disparos Automatizados (cron)
- [ ] Implementar Acionadores básicos
- [ ] Dashboard de integrações
- [ ] Logs de execução para usuário ver

**Entregável**: Múltiplas integrações funcionando

---

### Fase 5 - Otimização (Semana 9-10)
**Objetivo**: Melhorar performance e DX

**Tarefas**:
- [ ] Implementar cache strategies (Redis)
- [ ] Otimizar queries do Supabase
- [ ] Rate limiting por usuário
- [ ] Implementar retry logic robusto
- [ ] Melhorar error messages
- [ ] Adicionar testes E2E
- [ ] Monitoring e alertas
- [ ] CI/CD pipeline

**Entregável**: Sistema otimizado e monitorado

---

### Fase 6 - Melhorias Frontend (Semana 11-12)
**Objetivo**: Melhorar UX e visual (se necessário)

**Tarefas** (opcionais):
- [ ] Avaliar migração para TypeScript (gradual)
- [ ] Considerar Tailwind CSS (se fizer sentido)
- [ ] Melhorar componentes reutilizáveis
- [ ] Adicionar loading states consistentes
- [ ] Melhorar error boundaries
- [ ] Otimizar bundle size

**Entregável**: Frontend mais robusto

---

## ✅ DECISÕES TOMADAS

### 1. Stack Backend
**Decisão**: NestJS + TypeScript + Prisma
**Motivo**: Arquitetura enterprise, type-safe, modular, escalável

### 2. Organização do Código
**Decisão**: Monorepo
**Motivo**: Deploy mais fácil, compartilhamento de types, CI/CD simplificado

### 3. Frontend Language
**Decisão**: Manter JavaScript (.js)
**Motivo**: Não adicionar complexidade agora, pode migrar depois gradualmente

### 4. Funcionalidades Existentes
**Decisão**: Mantém tudo no Supabase direto
**Motivo**: Já funciona bem, não precisa adicionar latência

### 5. Novas Funcionalidades
**Decisão**: Implementar no backend
**Motivo**: Segurança, processamento assíncrono, integrações complexas

### 6. Deploy
**Decisão**: Docker Compose no EasyPanel
**Motivo**: Simples, escalável, fácil de gerenciar

---

## 📝 NOTAS IMPORTANTES

### Sobre Meta Ads Connection
> Usuário mencionou que já funciona sem expor chaves. Investigar implementação atual antes de recriar no backend. Pode ser que use Supabase Edge Functions ou outra abordagem.

### Sobre Código WeWeb
> Manter todos os arquivos do WeWeb como referência. Não deletar helpers, workflows, componentes do WeWeb mesmo que não sejam usados imediatamente.

### Sobre Migração
> **CRÍTICO**: Todas as funcionalidades atuais devem continuar funcionando durante e após a migração. Zero downtime, zero quebra de features.

---

## 🔄 PRÓXIMOS PASSOS IMEDIATOS

1. ⏸️ **Aguardar decisão** sobre qual feature implementar primeiro no backend
2. ⏸️ **Aguardar confirmação** do plano geral
3. 🚀 **Iniciar Fase 0**: Criar estrutura de monorepo

---

## 📚 REFERÊNCIAS

- [NestJS Documentation](https://docs.nestjs.com/)
- [Prisma Documentation](https://www.prisma.io/docs)
- [Supabase Documentation](https://supabase.com/docs)
- [BullMQ Documentation](https://docs.bullmq.io/)
- [Vue.js 3 Documentation](https://vuejs.org/)

---

**Versão**: 1.0
**Última Atualização**: 2025-12-04
**Status**: 🟡 Aguardando aprovação e próximos passos
