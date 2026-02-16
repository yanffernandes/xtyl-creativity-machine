# AlvoBot 2 - Documentação Completa do Sistema

**Branch**: `009-system-documentation`
**Data**: 17/12/2024
**Status**: ✅ Implementado

---

## 1. Visão Geral da Arquitetura

### 1.1 Arquitetura BaaS Simplificada

O AlvoBot 2 utiliza uma arquitetura Backend-as-a-Service (BaaS) otimizada para desenvolvimento rápido:

```
┌─────────────────────────────────────────────────────────────┐
│                    Frontend (React + TypeScript)            │
│                         Vite + Port 5173                    │
└─────────────────────────┬───────────────────────────────────┘
                          │
          ┌───────────────┼───────────────┐
          │               │               │
          ▼               ▼               ▼
┌─────────────────┐ ┌───────────┐ ┌─────────────────┐
│    Supabase     │ │  Backend  │ │    Temporal     │
│  (BaaS Direct)  │ │  NestJS   │ │   Workflows     │
│   Port: Cloud   │ │ Port 3001 │ │   Port 7233     │
└─────────────────┘ └───────────┘ └─────────────────┘
        │                 │               │
        ▼                 ▼               ▼
┌─────────────────────────────────────────────────────────────┐
│                    Supabase PostgreSQL                      │
│              + Auth + Storage + RLS Policies                │
└─────────────────────────────────────────────────────────────┘
```

### 1.2 Princípio de Decisão: Frontend vs Backend

| Operação | Frontend | Backend | Motivo |
|----------|:--------:|:-------:|--------|
| CRUD dados do usuário | ✅ | ❌ | RLS protege os dados |
| Autenticação | ✅ | ❌ | Supabase Auth nativo |
| Upload de arquivos | ✅ | ❌ | Supabase Storage + RLS |
| WordPress API | ❌ | ✅ | Requer app password |
| Meta/Facebook API | ❌ | ✅ | Requer app secret |
| Google Ads API | ❌ | ✅ | Requer OAuth + secrets |
| Geração de conteúdo IA | ❌ | ✅ | Requer OpenAI key |
| Mineração de keywords | ❌ | ✅ | Requer RapidAPI key |
| Workflows longos | ❌ | ✅ | Temporal orchestration |

---

## 2. Estrutura do Frontend

### 2.1 Tecnologias

| Tecnologia | Versão | Propósito |
|------------|--------|-----------|
| React | 18.2+ | Framework UI |
| TypeScript | 5.x | Tipagem estática |
| Vite | 5.x | Build tool |
| React Router | v6 | Roteamento (lazy loading) |
| TanStack Query | v5 | Estado do servidor |
| Zustand | 4.x | Estado global (5 stores) |
| React Hook Form | 7.x | Formulários |
| Zod | 3.x | Validação de schemas |
| CSS Modules | - | Estilos escopados |
| XYFlow (React Flow) | 11.x | Editor visual de fluxos |
| Tiptap | 2.x | Editor rich text |
| dnd-kit | 6.x | Drag and drop |

### 2.2 Estrutura de Pastas

```
frontend/src/
├── app/                          # Entry point
│   ├── App.tsx                   # Root com BrowserRouter
│   ├── router.tsx                # Definição de rotas
│   └── providers.tsx             # QueryClientProvider
│
├── features/                     # 25 módulos de features
│   ├── auth/                     # Autenticação
│   ├── dashboard/                # Dashboard principal
│   ├── projects/                 # Meus Blogs
│   ├── articles/                 # Gestão de artigos
│   ├── base-articles/            # Artigos de base
│   ├── arrow-articles/           # Artigos flecha
│   ├── base-structure/           # Wizard de nicho
│   ├── tasks/                    # Kanban de tarefas
│   ├── keywords/                 # Mineração de keywords
│   ├── scraper/                  # Web scraper
│   ├── flows/                    # Editor de fluxos
│   ├── runs/                     # Execuções
│   ├── triggers/                 # Acionadores
│   ├── connections/              # Integrações
│   ├── calendar/                 # Calendário
│   ├── alvoads-meta/             # Meta Ads
│   ├── settings/                 # Configurações
│   ├── users/                    # Admin de usuários
│   ├── workspace/                # Workspaces/times
│   └── [outras features...]
│
├── shared/                       # Código compartilhado
│   ├── components/               # 28 componentes UI
│   ├── layouts/                  # MainLayout
│   ├── hooks/                    # Hooks compartilhados
│   ├── types/                    # Tipos TypeScript
│   └── utils/                    # Utilitários
│
└── assets/styles/
    └── variables.css             # 150+ tokens CSS
```

### 2.3 Features Implementadas

#### 2.3.1 Auth (`/features/auth/`)
**Páginas**: Login, Signup, ForgotPassword, ResetPassword

**Funcionalidades**:
- Login com email/senha via Supabase Auth
- Cadastro de novos usuários
- Recuperação de senha por email
- Reset de senha com token
- Persistência de sessão via Zustand + localStorage

**Store**: `authStore.ts`
- `user`: Usuário autenticado
- `session`: Sessão Supabase
- `isLoading`: Estado de carregamento
- `signIn()`, `signUp()`, `signOut()`, `resetPassword()`

---

#### 2.3.2 Dashboard (`/features/dashboard/`)
**Rota**: `/dashboard`

**Funcionalidades**:
- Cards de estatísticas (artigos, projetos, tarefas)
- Feed de atividades recentes
- Atalhos para ações rápidas
- Gráficos de performance

**Componentes**:
- `StatsCard`: Card de métrica
- `ActivityFeed`: Lista de atividades
- `QuickActions`: Botões de ação rápida

---

#### 2.3.3 Projects / Meus Blogs (`/features/projects/`)
**Rota**: `/projects`

**Funcionalidades**:
- Listagem de blogs/projetos WordPress conectados
- CRUD de projetos
- Configuração de conexão WordPress
- Estatísticas por projeto

**Tabela**: `projects`
- `id`, `name`, `url`, `wordpress_username`, `wordpress_app_password`
- `user_id`, `created_at`, `updated_at`

---

#### 2.3.4 Articles / Artigos (`/features/articles/`)
**Rotas**: `/articles`, `/articles/:id`, `/articles/:id/edit`

**Funcionalidades**:
- Listagem de artigos com filtros
- Editor de artigo com Tiptap
- Preview de artigo
- Publicação para WordPress
- Status: null (fila), draft, published, archived

**Tabela**: `articles`
- `id`, `title`, `content`, `excerpt`, `slug`
- `status`, `project_id`, `user_id`
- `keyword_used`, `is_approval_article`, `url_added`
- `date`, `created_at`, `updated_at`, `deleted_at`

---

#### 2.3.5 Base Articles / Artigos de Base (`/features/base-articles/`)
**Rota**: `/base-articles`

**Funcionalidades**:
- Artigos de base para SEO (pillar content)
- Geração via IA
- Vinculação com artigos flecha

**Identificação**: `is_approval_article = true` na tabela `articles`

---

#### 2.3.6 Arrow Articles / Artigos Flecha (`/features/arrow-articles/`)
**Rota**: `/arrow-articles`

**Funcionalidades**:
- Criação rápida de artigos
- Seleção de keyword com busca
- Seleção de projeto
- Agendamento de data
- Geração de título/descrição por IA

**Componentes**:
- `CreateArrowArticleModal`: Modal de criação
- `ArrowArticlesList`: Lista de artigos flecha

---

#### 2.3.7 Base Structure / Estrutura de Base (`/features/base-structure/`)
**Rota**: `/base-structure`

**Funcionalidades**:
- Wizard de 5 etapas para criar estrutura de blog
- Geração de nichos via IA (OpenAI)
- Geração de categorias por nicho
- Geração de títulos de artigos
- Exportação para tarefas

**Fluxo**:
1. Seleção de projeto
2. Geração de nichos (IA)
3. Seleção e geração de categorias
4. Geração de títulos
5. Confirmação e criação de tarefas

**Backend**: `/base-structure/generate-niches`, `/base-structure/generate-categories`

---

#### 2.3.8 Tasks / Minhas Tarefas (`/features/tasks/`)
**Rota**: `/tasks`

**Funcionalidades**:
- Kanban board com 4 colunas
- Drag and drop entre colunas
- Filtros por projeto e prioridade
- CRUD de tarefas

**Colunas**:
- `backlog`: Backlog
- `todo`: A Fazer
- `in_progress`: Em Progresso
- `done`: Concluído

**Tabela**: `tasks`
- `id`, `title`, `description`, `status`, `priority`
- `project_id`, `user_id`, `due_date`
- `created_at`, `updated_at`

---

#### 2.3.9 Keywords / Mineração 10x (`/features/keywords/`)
**Rota**: `/keywords`

**Funcionalidades**:
- Listagem de keywords mineradas
- Importação de keywords
- Métricas: volume de busca, CPC, competição
- Vinculação com projetos

**Tabela**: `keywords`
- `id`, `keyword`, `search_volume`, `cpc`, `competition`
- `user_id`, `created_at`

**Tabela de Uso**: `keyword_usages`
- `id`, `keyword_id`, `project_id`, `article_id`

---

#### 2.3.10 Scraper / Mineração Web (`/features/scraper/`)
**Rota**: `/scraper`

**Funcionalidades**:
- Configuração de scraping de sites
- Extração de dados estruturados
- Agendamento de execuções

---

#### 2.3.11 Flows / Meus Fluxos (`/features/flows/`)
**Rotas**: `/flows`, `/flows/:id`

**Funcionalidades**:
- Editor visual de automações (XYFlow)
- Nós de ação, condição e trigger
- Conexões entre nós
- Salvamento e execução de fluxos

**Componentes**:
- `FlowCanvas`: Canvas do React Flow
- `NodePalette`: Paleta de nós disponíveis
- `NodeEditor`: Editor de propriedades do nó

**Store**: `flowEditorStore.ts`
- `nodes`, `edges`, `selectedNode`
- `addNode()`, `updateNode()`, `connect()`

**Tabela**: `flows`
- `id`, `name`, `description`, `nodes`, `edges`
- `user_id`, `is_active`, `created_at`, `updated_at`

---

#### 2.3.12 Runs / Disparos (`/features/runs/`)
**Rota**: `/runs`

**Funcionalidades**:
- Histórico de execuções de fluxos
- Status: pending, running, completed, failed
- Logs de execução
- Retry de execuções falhas

**Tabela**: `flow_runs`
- `id`, `flow_id`, `status`, `started_at`, `completed_at`
- `input_data`, `output_data`, `error_message`

---

#### 2.3.13 Triggers / Acionadores (`/features/triggers/`)
**Rota**: `/triggers`

**Funcionalidades**:
- Configuração de triggers para fluxos
- Tipos: schedule (cron), webhook, event
- Ativação/desativação

**Tabela**: `triggers`
- `id`, `flow_id`, `type`, `config`
- `is_active`, `last_triggered_at`

---

#### 2.3.14 Connections / Conexões (`/features/connections/`)
**Rota**: `/connections`

**Funcionalidades**:
- Integração com Meta/Facebook
- Integração com Google
- Status de conexão OAuth
- Reconexão quando expirado

**Tabela**: `oauth_connections`
- `id`, `user_id`, `provider`, `access_token`, `refresh_token`
- `expires_at`, `scopes`, `created_at`

---

#### 2.3.15 Calendar / Calendário (`/features/calendar/`)
**Rota**: `/calendar`

**Funcionalidades**:
- Visualização mensal/semanal
- Eventos de publicação de artigos
- Tarefas com due_date
- Drag to reschedule

---

#### 2.3.16 AlvoAds Meta (`/features/alvoads-meta/`)
**Rota**: `/alvoads-meta`

**Funcionalidades**:
- Gestão de campanhas Meta Ads
- Wizard de criação de campanha
- Métricas de performance
- Integração com API do Meta

**Store**: `campaignWizardStore.ts`

---

#### 2.3.17 Settings / Configurações (`/features/settings/`)
**Rota**: `/settings`

**Funcionalidades**:
- Perfil do usuário
- Preferências de notificação
- Configurações de conta
- Gerenciamento de API keys

---

#### 2.3.18 Users / Usuários (`/features/users/`)
**Rota**: `/users` (admin only)

**Funcionalidades**:
- Listagem de usuários (admin)
- CRUD de usuários
- Gestão de roles

---

#### 2.3.19 Workspace (`/features/workspace/`)
**Funcionalidades**:
- Criação de workspaces/times
- Convite de membros
- Gestão de permissões
- Troca de workspace ativo

**Store**: `workspaceStore.ts`
- `activeWorkspace`, `workspaces`
- `setActiveWorkspace()`, `createWorkspace()`

**Tabelas**:
- `workspaces`: id, name, slug, owner_id
- `workspace_members`: workspace_id, user_id, role

---

### 2.4 Componentes Compartilhados

| Componente | Arquivo | Descrição |
|------------|---------|-----------|
| Alert | `Alert/` | Notificações (success, error, warning, info) |
| Button | `Button/` | Botões (primary, secondary, ghost, danger) |
| Card | `Card/` | Container com Header, Body, Footer |
| Checkbox | `Checkbox/` | Checkbox com label |
| EmptyState | `EmptyState/` | Estado vazio com ilustração |
| Input | `Input/` | Input com label, error, ícones |
| Modal | `Modal/` | Dialog overlay |
| SearchableSelect | `SearchableSelect/` | Select com busca |
| Select | `Select/` | Dropdown select |
| Spinner | `Spinner/` | Loading indicator (sm, md, lg) |
| Table | `Table/` | Tabela de dados |
| Textarea | `Textarea/` | Input multiline |
| Tabs | `Tabs/` | Navegação em abas |
| Badge | `Badge/` | Tags/labels |
| Avatar | `Avatar/` | Foto de perfil |
| Dropdown | `Dropdown/` | Menu dropdown |
| Tooltip | `Tooltip/` | Tooltip informativo |
| ProtectedRoute | `ProtectedRoute/` | Wrapper de autenticação |

---

### 2.5 Rotas do Frontend

#### Rotas Públicas
| Rota | Componente | Descrição |
|------|------------|-----------|
| `/login` | LoginPage | Página de login |
| `/signup` | SignupPage | Página de cadastro |
| `/forgot-password` | ForgotPasswordPage | Recuperação de senha |
| `/reset-password` | ResetPasswordPage | Reset com token |

#### Rotas Protegidas
| Rota | Componente | Descrição |
|------|------------|-----------|
| `/dashboard` | DashboardPage | Dashboard principal |
| `/projects` | ProjectsPage | Meus Blogs |
| `/tasks` | TasksPage | Minhas Tarefas |
| `/base-structure` | BaseStructureWizard | Estrutura de Base |
| `/base-articles` | BaseArticlesPage | Artigos de Base |
| `/arrow-articles` | ArrowArticlesPage | Artigos Flecha |
| `/articles/:id` | ArticleDetailPage | Detalhe do artigo |
| `/articles/:id/edit` | ArticleEditorPage | Editor de artigo |
| `/keywords` | KeywordsPage | Mineração 10x |
| `/scraper` | ScraperPage | Web Scraper |
| `/flows` | FlowsPage | Meus Fluxos |
| `/flows/:id` | FlowEditorPage | Editor de fluxo |
| `/runs` | RunsPage | Disparos |
| `/triggers` | TriggersPage | Acionadores |
| `/connections` | ConnectionsPage | Conexões |
| `/calendar` | CalendarPage | Calendário |
| `/alvoads-meta` | AlvoAdsMetaPage | Meta Ads |
| `/settings` | SettingsPage | Configurações |
| `/design-system` | DesignSystemPage | Referência visual |

---

## 3. Estrutura do Backend

### 3.1 Tecnologias

| Tecnologia | Versão | Propósito |
|------------|--------|-----------|
| NestJS | 10.x | Framework API |
| TypeScript | 5.x | Tipagem estática |
| Passport | 0.7.x | Autenticação JWT |
| Temporal.io | 1.x | Orquestração de workflows |
| OpenAI | 4.x | Integração GPT |
| Axios | 1.x | Cliente HTTP |

### 3.2 Estrutura de Pastas

```
backend/src/
├── main.ts                       # Entry point
├── app.module.ts                 # Root module
│
├── modules/                      # 12 módulos
│   ├── auth/                     # Validação JWT
│   ├── health/                   # Health checks
│   ├── wordpress/                # WordPress API
│   ├── base-structure/           # Geração IA
│   ├── keywords/                 # Mineração (RapidAPI)
│   ├── tasks/                    # Import de tarefas
│   ├── workflows/                # Temporal workflows
│   ├── workspace/                # Gestão de workspace
│   ├── meta/                     # Meta OAuth
│   ├── google/                   # Google OAuth
│   ├── notifications/            # Notificações
│   └── articles/                 # Operações de artigos
│
├── common/
│   ├── guards/                   # JwtAuthGuard
│   ├── decorators/               # @CurrentUser, etc
│   └── supabase/                 # Service role client
│
└── temporal/                     # Temporal worker
    ├── worker.ts
    ├── workflows/
    └── activities/
```

### 3.3 Módulos e Endpoints

#### 3.3.1 Auth Module
**Prefixo**: `/auth`

| Método | Endpoint | Descrição |
|--------|----------|-----------|
| POST | `/auth/validate` | Valida token JWT |

**Guard**: `JwtAuthGuard` - Extrai e valida JWT do header Authorization

---

#### 3.3.2 Health Module
**Prefixo**: `/health`

| Método | Endpoint | Descrição |
|--------|----------|-----------|
| GET | `/health` | Health check básico |
| GET | `/health/detailed` | Health com dependências |

---

#### 3.3.3 WordPress Module
**Prefixo**: `/wordpress`

| Método | Endpoint | Descrição |
|--------|----------|-----------|
| POST | `/wordpress/test-connection` | Testa conexão com site |
| POST | `/wordpress/publish` | Publica artigo no WP |
| GET | `/wordpress/posts/:siteId` | Lista posts do site |
| POST | `/wordpress/install-plugin` | Instala plugin AlvoBot |

**Autenticação**: WordPress Application Passwords

---

#### 3.3.4 Base Structure Module
**Prefixo**: `/base-structure`

| Método | Endpoint | Descrição |
|--------|----------|-----------|
| POST | `/base-structure/generate-niches` | Gera nichos via IA |
| POST | `/base-structure/generate-categories` | Gera categorias via IA |
| POST | `/base-structure/generate-titles` | Gera títulos via IA |
| POST | `/base-structure/create-tasks` | Cria tarefas dos títulos |

**Integração**: OpenAI GPT-4o-mini

---

#### 3.3.5 Keywords Module
**Prefixo**: `/keywords`

| Método | Endpoint | Descrição |
|--------|----------|-----------|
| POST | `/keywords/mine` | Minera keywords (RapidAPI) |
| POST | `/keywords/import` | Importa lista de keywords |
| GET | `/keywords/suggestions` | Sugestões relacionadas |

**Integração**: RapidAPI (DataForSEO, SEMrush API)

---

#### 3.3.6 Tasks Module
**Prefixo**: `/tasks`

| Método | Endpoint | Descrição |
|--------|----------|-----------|
| POST | `/tasks/import-template` | Importa template de tarefas |
| POST | `/tasks/bulk-create` | Cria múltiplas tarefas |

---

#### 3.3.7 Workflows Module
**Prefixo**: `/workflows`

| Método | Endpoint | Descrição |
|--------|----------|-----------|
| POST | `/workflows/execute` | Executa workflow |
| GET | `/workflows/:id/status` | Status de execução |
| POST | `/workflows/cancel/:runId` | Cancela execução |

**Integração**: Temporal.io para workflows de longa duração

---

#### 3.3.8 Workspace Module
**Prefixo**: `/workspaces`

| Método | Endpoint | Descrição |
|--------|----------|-----------|
| POST | `/workspaces` | Cria workspace |
| GET | `/workspaces` | Lista workspaces do usuário |
| POST | `/workspaces/:id/invite` | Convida membro |
| DELETE | `/workspaces/:id/members/:userId` | Remove membro |

---

#### 3.3.9 Meta Module
**Prefixo**: `/meta`

| Método | Endpoint | Descrição |
|--------|----------|-----------|
| GET | `/meta/auth/url` | URL de OAuth |
| GET | `/meta/auth/callback` | Callback OAuth |
| GET | `/meta/campaigns` | Lista campanhas |
| POST | `/meta/campaigns` | Cria campanha |
| GET | `/meta/adsets/:campaignId` | Lista ad sets |
| GET | `/meta/insights/:objectId` | Métricas |

**Integração**: Meta Marketing API

---

#### 3.3.10 Google Module
**Prefixo**: `/google`

| Método | Endpoint | Descrição |
|--------|----------|-----------|
| GET | `/google/auth/url` | URL de OAuth |
| GET | `/google/auth/callback` | Callback OAuth |
| GET | `/google/analytics/properties` | Lista propriedades GA4 |

---

### 3.4 Temporal Workflows

#### Workflows Implementados

1. **ArticleGenerationWorkflow**
   - Gera conteúdo de artigo via IA
   - Steps: análise de keyword → outline → conteúdo → revisão

2. **BulkPublishWorkflow**
   - Publica múltiplos artigos no WordPress
   - Retry automático em caso de falha

3. **KeywordMiningWorkflow**
   - Minera keywords em batch
   - Rate limiting para APIs externas

---

## 4. Estrutura do Banco de Dados

### 4.1 Diagrama de Entidades

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│   users     │────<│  projects   │────<│  articles   │
│  (auth.users)│     │             │     │             │
└─────────────┘     └─────────────┘     └─────────────┘
      │                   │                   │
      │                   │                   │
      ▼                   ▼                   ▼
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│   tasks     │     │  keywords   │────<│keyword_usages│
│             │     │             │     │             │
└─────────────┘     └─────────────┘     └─────────────┘
      │
      │
      ▼
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│   flows     │────<│  flow_runs  │     │  triggers   │
│             │     │             │     │             │
└─────────────┘     └─────────────┘     └─────────────┘

┌─────────────┐     ┌─────────────────┐
│ workspaces  │────<│workspace_members│
│             │     │                 │
└─────────────┘     └─────────────────┘

┌─────────────────┐
│oauth_connections│
│                 │
└─────────────────┘
```

### 4.2 Tabelas Principais

#### users (auth.users - Supabase Auth)
Gerenciado automaticamente pelo Supabase Auth.

| Coluna | Tipo | Descrição |
|--------|------|-----------|
| id | uuid | PK, auto-generated |
| email | text | Email único |
| encrypted_password | text | Senha hash |
| created_at | timestamp | Data de criação |
| updated_at | timestamp | Última atualização |

---

#### profiles
Extensão de dados do usuário.

| Coluna | Tipo | Descrição |
|--------|------|-----------|
| id | uuid | FK → auth.users |
| full_name | text | Nome completo |
| avatar_url | text | URL do avatar |
| phone | text | Telefone |
| created_at | timestamp | Data de criação |

**RLS**: `auth.uid() = id`

---

#### projects
Blogs/sites WordPress conectados.

| Coluna | Tipo | Descrição |
|--------|------|-----------|
| id | serial | PK |
| user_id | uuid | FK → auth.users |
| name | text | Nome do projeto |
| url | text | URL do WordPress |
| wordpress_username | text | Usuário WP |
| wordpress_app_password | text | App password (criptografado) |
| is_active | boolean | Status ativo |
| created_at | timestamp | Data de criação |
| updated_at | timestamp | Última atualização |

**RLS**: `auth.uid() = user_id`

---

#### articles
Artigos gerados e publicados.

| Coluna | Tipo | Descrição |
|--------|------|-----------|
| id | serial | PK |
| user_id | uuid | FK → auth.users |
| project_id | integer | FK → projects |
| title | text | Título do artigo |
| content | text | Conteúdo HTML |
| excerpt | text | Resumo |
| slug | text | URL slug |
| status | text | null, draft, published, archived |
| keyword_used | text | Keyword alvo |
| is_approval_article | boolean | É artigo de base? |
| url_added | boolean | URL já vinculada? |
| date | timestamp | Data de publicação |
| wordpress_post_id | integer | ID no WordPress |
| created_at | timestamp | Data de criação |
| updated_at | timestamp | Última atualização |
| deleted_at | timestamp | Soft delete |

**RLS**: `auth.uid() = user_id`

**Índices**: `user_id`, `project_id`, `status`, `keyword_used`

---

#### tasks
Tarefas do Kanban.

| Coluna | Tipo | Descrição |
|--------|------|-----------|
| id | serial | PK |
| user_id | uuid | FK → auth.users |
| project_id | integer | FK → projects (nullable) |
| title | text | Título da tarefa |
| description | text | Descrição |
| status | text | backlog, todo, in_progress, done |
| priority | text | low, medium, high, urgent |
| due_date | date | Data limite |
| position | integer | Ordem no Kanban |
| created_at | timestamp | Data de criação |
| updated_at | timestamp | Última atualização |

**RLS**: `auth.uid() = user_id`

---

#### keywords
Keywords mineradas.

| Coluna | Tipo | Descrição |
|--------|------|-----------|
| id | serial | PK |
| user_id | uuid | FK → auth.users |
| keyword | text | Termo |
| search_volume | integer | Volume de busca mensal |
| cpc | decimal | Custo por clique |
| competition | decimal | Índice de competição (0-1) |
| trend | jsonb | Histórico de tendência |
| created_at | timestamp | Data de criação |

**RLS**: `auth.uid() = user_id`

---

#### keyword_usages
Vinculação de keywords com artigos.

| Coluna | Tipo | Descrição |
|--------|------|-----------|
| id | serial | PK |
| keyword_id | integer | FK → keywords |
| project_id | integer | FK → projects |
| article_id | integer | FK → articles (nullable) |
| created_at | timestamp | Data de criação |

---

#### flows
Automações visuais.

| Coluna | Tipo | Descrição |
|--------|------|-----------|
| id | serial | PK |
| user_id | uuid | FK → auth.users |
| name | text | Nome do fluxo |
| description | text | Descrição |
| nodes | jsonb | Definição dos nós |
| edges | jsonb | Conexões entre nós |
| is_active | boolean | Status ativo |
| created_at | timestamp | Data de criação |
| updated_at | timestamp | Última atualização |

**RLS**: `auth.uid() = user_id`

---

#### flow_runs
Execuções de fluxos.

| Coluna | Tipo | Descrição |
|--------|------|-----------|
| id | serial | PK |
| flow_id | integer | FK → flows |
| status | text | pending, running, completed, failed |
| started_at | timestamp | Início |
| completed_at | timestamp | Fim |
| input_data | jsonb | Dados de entrada |
| output_data | jsonb | Resultado |
| error_message | text | Mensagem de erro |
| logs | jsonb | Logs de execução |

---

#### triggers
Acionadores de fluxos.

| Coluna | Tipo | Descrição |
|--------|------|-----------|
| id | serial | PK |
| flow_id | integer | FK → flows |
| type | text | schedule, webhook, event |
| config | jsonb | Configuração (cron, URL, etc) |
| is_active | boolean | Status ativo |
| last_triggered_at | timestamp | Última execução |
| created_at | timestamp | Data de criação |

---

#### workspaces
Times/organizações.

| Coluna | Tipo | Descrição |
|--------|------|-----------|
| id | serial | PK |
| name | text | Nome do workspace |
| slug | text | URL slug único |
| owner_id | uuid | FK → auth.users |
| settings | jsonb | Configurações |
| created_at | timestamp | Data de criação |
| updated_at | timestamp | Última atualização |

---

#### workspace_members
Membros de workspaces.

| Coluna | Tipo | Descrição |
|--------|------|-----------|
| id | serial | PK |
| workspace_id | integer | FK → workspaces |
| user_id | uuid | FK → auth.users |
| role | text | owner, admin, member |
| invited_at | timestamp | Data do convite |
| joined_at | timestamp | Data de entrada |

---

#### oauth_connections
Conexões OAuth (Meta, Google).

| Coluna | Tipo | Descrição |
|--------|------|-----------|
| id | serial | PK |
| user_id | uuid | FK → auth.users |
| provider | text | meta, google |
| provider_user_id | text | ID no provider |
| access_token | text | Token de acesso (criptografado) |
| refresh_token | text | Token de refresh (criptografado) |
| expires_at | timestamp | Expiração do token |
| scopes | text[] | Escopos autorizados |
| created_at | timestamp | Data de criação |
| updated_at | timestamp | Última atualização |

**RLS**: `auth.uid() = user_id`

---

### 4.3 Row Level Security (RLS)

Todas as tabelas com dados de usuário têm RLS habilitado:

```sql
-- Padrão para todas as tabelas
ALTER TABLE table_name ENABLE ROW LEVEL SECURITY;

-- Policy padrão: usuário acessa apenas seus dados
CREATE POLICY "Users can manage own data"
ON table_name
FOR ALL
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);
```

**Exceções**:
- `workspace_members`: Acesso via membership
- `keyword_usages`: Acesso via owner da keyword

---

## 5. Design System

### 5.1 Tokens CSS (variables.css)

#### Cores Primárias
```css
--color-primary: #fbbf24;           /* Amarelo marca */
--color-primary-hover: #f59e0b;
--color-primary-light: #fef3c7;
--color-primary-dark: #d97706;
```

#### Cores de Texto
```css
--color-text-primary: #344054;      /* Texto principal */
--color-text-secondary: #6B7280;    /* Texto secundário */
--color-text-tertiary: #98A2B3;     /* Texto muted */
--color-text-inverse: #FFFFFF;      /* Texto em fundo escuro */
```

#### Cores de Background
```css
--color-bg-primary: #FFFFFF;        /* Fundo principal */
--color-bg-secondary: #F9FAFB;      /* Fundo secundário */
--color-bg-tertiary: #F3F4F6;       /* Fundo terciário */
```

#### Cores de Status
```css
--color-success: #10B981;
--color-error: #EF4444;
--color-warning: #F59E0B;
--color-info: #3B82F6;
```

#### Espaçamento (base 4px)
```css
--space-1: 4px;
--space-2: 8px;
--space-3: 12px;
--space-4: 16px;
--space-5: 20px;
--space-6: 24px;
--space-8: 32px;
--space-10: 40px;
--space-12: 48px;
```

#### Border Radius
```css
--radius-sm: 4px;
--radius-md: 6px;
--radius-lg: 8px;
--radius-xl: 12px;
--radius-2xl: 16px;
--radius-full: 9999px;
```

#### Sombras
```css
--shadow-sm: 0 1px 2px rgba(0,0,0,0.05);
--shadow-md: 0 4px 6px rgba(0,0,0,0.1);
--shadow-lg: 0 10px 15px rgba(0,0,0,0.1);
--shadow-xl: 0 20px 25px rgba(0,0,0,0.15);
```

#### Transições
```css
--transition-fast: 0.15s ease;
--transition-normal: 0.2s ease;
--transition-slow: 0.3s ease;
```

---

## 6. Variáveis de Ambiente

### 6.1 Frontend (.env)
```bash
VITE_SUPABASE_URL=https://xxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGci...
VITE_API_URL=http://localhost:3001
```

### 6.2 Backend (.env)
```bash
# Core
BACKEND_PORT=3001
SUPABASE_URL=https://xxx.supabase.co
SUPABASE_SERVICE_KEY=eyJhbGci...
SUPABASE_JWT_SECRET=xxx

# OpenAI
OPENAI_API_KEY=sk-xxx

# RapidAPI (Keywords)
RAPIDAPI_KEY=xxx

# Meta
META_APP_ID=xxx
META_APP_SECRET=xxx

# Google
GOOGLE_CLIENT_ID=xxx
GOOGLE_CLIENT_SECRET=xxx

# Temporal
TEMPORAL_ADDRESS=localhost:7233

# Frontend URL (CORS)
FRONTEND_URL=http://localhost:5173
```

---

## 7. Comandos de Desenvolvimento

```bash
# Frontend
cd frontend && npm install          # Instalar dependências
cd frontend && npm run dev          # Dev server (port 5173)
cd frontend && npm run build        # Build de produção
cd frontend && npm run lint         # Lint do código

# Backend
cd backend && npm install           # Instalar dependências
cd backend && npm run start:dev     # Dev server (port 3001)
cd backend && npm run build         # Build de produção
cd backend && npm run worker:prod   # Worker Temporal

# Ambos
npm run dev                         # Script na raiz (se existir)
```

---

## 8. PROBLEMAS CONHECIDOS E FUNCIONALIDADES INCOMPLETAS

> **ATENÇÃO**: Esta seção documenta funcionalidades que estão **incompletas, com dados mockados, ou não implementadas**. Estas NÃO devem ser consideradas como funcionais em produção.

### 8.1 Frontend - Dados Mockados

#### AlvoAds Meta - Templates de Campanha (MOCK)
**Arquivo**: `frontend/src/features/alvoads-meta/pages/AlvoAdsMetaPage.tsx`
**Linhas**: ~40-60

Os templates de campanha estão hardcoded no frontend:
```typescript
const campaignTemplates = [
  { id: 1, name: 'Campanha de Conversão', ... },
  { id: 2, name: 'Campanha de Tráfego', ... },
  // ... dados estáticos
]
```

**Status**: Não integrado com backend. Dados de demonstração apenas.

---

#### Settings Page - Save Mock (MOCK)
**Arquivo**: `frontend/src/features/settings/pages/SettingsPage.tsx`

A função de salvar configurações usa `setTimeout` para simular:
```typescript
const handleSave = async () => {
  setIsSaving(true)
  // Simula delay de rede
  await new Promise(resolve => setTimeout(resolve, 1000))
  setIsSaving(false)
}
```

**Status**: Não persiste dados reais. Apenas UI.

---

#### Créditos de Usuário (MOCK)
**Arquivo**: `frontend/src/features/arrow-articles/components/CreateArrowArticleModal.tsx`
**Linha**: 138

```typescript
const credits = { used: 386, total: 120 }
```

**Status**: Valor hardcoded. Sistema de créditos não implementado.

---

### 8.2 Backend - Integrações Incompletas

#### Google Ads API (NÃO INTEGRADO)
**Módulo**: `backend/src/modules/google/`

A integração com Google Ads API não está implementada. O backend gera IDs falsos:
```typescript
// Gera ID mock
const campaignId = `gads-${Date.now()}`
```

**Status**: OAuth configurado, mas operações de campanha são mock.

---

#### Envio de Emails de Convite (NÃO IMPLEMENTADO)
**Arquivo**: `backend/src/modules/workspace/workspace.service.ts`

```typescript
async inviteMember(workspaceId: string, email: string) {
  // TODO: Implementar envio de email
  // Por enquanto apenas cria o registro
}
```

**Status**: Cria registro mas não envia email.

---

#### Tabela Notifications (NÃO EXISTE)
**Erro nos logs**:
```
relation "public.notifications" does not exist
```

O módulo `NotificationsService` referencia uma tabela que não existe no schema.

**Status**: Módulo existe no código mas tabela não foi criada.

---

### 8.3 Database - Tabelas Referenciadas mas Possivelmente Ausentes

As seguintes tabelas são referenciadas no código mas podem não existir:
- `notifications` - Sistema de notificações
- `activity_logs` - Log de atividades (pode estar em outra estrutura)
- `subscriptions` - Sistema de assinaturas

**Recomendação**: Verificar schema atual do Supabase.

---

### 8.4 Funcionalidades Parcialmente Implementadas

| Feature | Status | Detalhes |
|---------|--------|----------|
| AlvoAds Meta | 30% | UI existe, integração Meta parcial |
| Google Ads | 10% | OAuth apenas, sem operações |
| Notificações | 0% | Módulo existe, sem tabela |
| Sistema de Créditos | 0% | UI mock, sem backend |
| Email de Convite | 0% | Registro criado, email não enviado |
| Scraper | 50% | UI existe, execução limitada |

---

### 8.5 Inconsistências Identificadas

1. **Cores hardcoded no Flow Editor**: ~30 valores hex que deveriam usar CSS variables
2. **Sidebar usa cor diferente**: `#1a1a2e` ao invés de design system
3. **Alert component**: Mix de variáveis CSS e valores hardcoded

---

## 9. Recomendações para Desenvolvimento Futuro

### 9.1 Prioridade Alta
1. Criar tabela `notifications` no Supabase
2. Implementar sistema de créditos real
3. Completar integração Google Ads API
4. Implementar envio de emails (Resend, SendGrid, etc)

### 9.2 Prioridade Média
1. Migrar cores hardcoded para CSS variables
2. Implementar dark mode
3. Adicionar testes unitários e E2E
4. Documentar API com Swagger/OpenAPI

### 9.3 Prioridade Baixa
1. Otimizar bundle size
2. Implementar PWA
3. Adicionar internacionalização (i18n)

---

## 10. Conclusão

O AlvoBot 2 é uma aplicação de gestão de conteúdo e automação de marketing digital com:

- **Frontend maduro**: 25 features implementadas, design system consistente
- **Backend funcional**: 12 módulos, integrações principais funcionando
- **Banco estruturado**: 50+ tabelas com RLS apropriado

**Pontos de atenção**:
- Algumas integrações externas estão incompletas (Google Ads)
- Dados mock em algumas telas (AlvoAds, Settings)
- Tabela de notificações não existe

A documentação acima representa o estado atual do sistema em 17/12/2024.
