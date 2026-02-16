# Feature Specification: Meus Blogs (Projetos)

**Feature Branch**: `004-meus-blogs`
**Created**: 2025-12-11
**Status**: ✅ Implementado
**Input**: User description: "Feature: Meus Blogs (Projetos) - Tela de listagem de projetos/blogs do usuário, função de adicionar novo projeto WordPress, função de refazer/reativar o plugin AlvoBot em um projeto existente, conexão com WordPress via API REST"

## Overview

Esta feature implementa o gerenciamento completo de projetos WordPress (blogs) na plataforma AlvoBot. Os usuários poderão adicionar novos blogs WordPress, gerenciar conexões existentes, testar a conectividade e reativar o plugin AlvoBot quando necessário. A integração com WordPress será feita via API REST, e as credenciais de acesso (Application Passwords) serão armazenadas de forma segura no Supabase com criptografia.

### Current State

- Frontend React já possui página básica de projetos (`ProjectsPage.tsx`) com listagem e CRUD simples
- Tabela `projects` no Supabase com campos: `id`, `user_id`, `name`, `domain`, `login`, `pass`, `status`, `token`, `wp_version`, `plugins`, etc.
- Row Level Security (RLS) já configurado para a tabela `projects`
- Backend NestJS com módulo `workflows` que possui alguma lógica relacionada a projetos
- Não existe ainda integração funcional com WordPress REST API
- Não existe funcionalidade de teste de conexão ou reativação de plugin

### Target State

- **Frontend**:
  - Tela completa de listagem de projetos com cards mostrando status de conexão
  - Wizard de criação de projeto WordPress com validação de conectividade
  - Modal de gerenciamento de projeto com opção de testar conexão e reinstalar plugin
  - Indicadores visuais de status (conectado, erro, não configurado)
  - Métricas básicas por projeto (artigos publicados, última atualização)

- **Backend**:
  - Módulo WordPress dedicado para integração com WordPress REST API
  - Endpoints para testar conexão, instalar/reinstalar plugin, buscar informações do site
  - Serviço de criptografia para armazenar credenciais de forma segura
  - Validação de Application Password e verificação de permissões
  - Logs de tentativas de conexão para troubleshooting

- **Database**:
  - Extensão da tabela `projects` com campos de status de conexão e logs
  - Possível tabela adicional `wordpress_connection_logs` para histórico de testes

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Visualizar Projetos WordPress (Priority: P1)

Usuários podem visualizar a lista de seus blogs WordPress com status de conexão, métricas básicas e informações de última sincronização.

**Why this priority**: É o ponto de entrada para todas as outras funcionalidades. Usuários precisam ver seus projetos antes de gerenciá-los.

**Independent Test**: Pode ser testado acessando a página "Meus Blogs" e verificando se os projetos cadastrados são exibidos corretamente com suas informações.

**Acceptance Scenarios**:

1. **Given** um usuário logado com projetos cadastrados, **When** acessa a página "Meus Blogs", **Then** vê uma lista de cards com nome do blog, domínio, status de conexão e métricas básicas
2. **Given** um usuário sem projetos, **When** acessa a página "Meus Blogs", **Then** vê um estado vazio com opção de adicionar o primeiro projeto
3. **Given** um usuário visualizando seus projetos, **When** um projeto tem erro de conexão, **Then** vê indicador visual de erro e mensagem explicativa
4. **Given** um usuário com mais de 5 projetos, **When** visualiza a lista, **Then** os projetos são exibidos em grid responsivo que se adapta ao tamanho da tela

---

### User Story 2 - Adicionar Novo Projeto WordPress (Priority: P1)

Usuários podem adicionar um novo blog WordPress através de um wizard guiado que valida a conexão e instala o plugin AlvoBot automaticamente.

**Why this priority**: Adicionar projetos é fundamental para começar a usar a plataforma. Sem projetos, não há conteúdo para gerar.

**Independent Test**: Pode ser testado criando um projeto WordPress de teste, fornecendo URL, usuário e Application Password, e verificando se a conexão é estabelecida.

**Acceptance Scenarios**:

1. **Given** um usuário na página "Meus Blogs", **When** clica em "Adicionar novo Blog", **Then** é aberto um wizard com campos para URL, nome do site, usuário WordPress e Application Password
2. **Given** um usuário preenchendo o wizard, **When** fornece credenciais inválidas, **Then** recebe feedback claro sobre o erro (URL inválida, credenciais incorretas, etc.)
3. **Given** um usuário com credenciais válidas, **When** completa o wizard, **Then** o sistema testa a conexão, instala o plugin AlvoBot e salva o projeto com status "conectado"
4. **Given** um usuário adicionando projeto, **When** o WordPress não tem permissões adequadas, **Then** recebe orientação sobre como gerar Application Password com permissões corretas
5. **Given** um usuário atingindo limite de projetos, **When** tenta adicionar novo projeto, **Then** é informado do limite e orientado a fazer upgrade do plano

---

### User Story 2.1 - Instalar Plugins Essenciais (Priority: P1)

Após cadastrar um projeto WordPress, o sistema instala automaticamente uma lista de plugins essenciais via AlvoBot Plugin API, mostrando progresso em tempo real para cada plugin.

**Why this priority**: Plugins essenciais são necessários para o funcionamento completo da plataforma. Instalação automática garante configuração correta.

**Independent Test**: Pode ser testado adicionando um novo projeto e verificando se todos os plugins são instalados com feedback visual.

**Acceptance Scenarios**:

1. **Given** um usuário completou cadastro do projeto, **When** wizard avança para etapa de plugins, **Then** sistema exibe lista de 8 plugins essenciais a serem instalados
2. **Given** instalação de plugins iniciada, **When** cada plugin é processado, **Then** sistema exibe status em tempo real ("Instalando...", "Instalado", "Erro")
3. **Given** instalação bem-sucedida de um plugin, **When** completa, **Then** indicador visual muda para "✓ Instalado" e próximo plugin inicia
4. **Given** erro na instalação de um plugin, **When** falha ocorre, **Then** sistema exibe erro mas continua com próximos plugins
5. **Given** todos os plugins processados, **When** wizard completa, **Then** projeto é salvo e usuário vê resumo (X de 8 plugins instalados)

**Lista de Plugins Essenciais**:
- Instant Indexing (`fast-indexing-api`) - Facilita indexação rápida nos motores de busca
- Missed Schedule Posts (`missed-scheduled-posts-publisher`) - Publicação automática de posts agendados
- Rank Math (`seo-by-rank-math`) - Otimização de SEO avançada
- JetPack (`jetpack`) - Ferramentas de segurança, performance e marketing
- Widgets Clássicos (`classic-widgets`) - Restaura editor de widgets clássico
- Cookie Notice (`cookie-notice`) - Notificações de consentimento de cookies
- Site Kit by Google (`google-site-kit`) - Integração com serviços do Google
- Polylang (`polylang`) - Site multilíngue

**API Endpoint WordPress**:
```
POST {domain}/wp-json/alvobot-pro/v1/plugins/commands
Headers: Authorization: Basic {base64(login:password)}
Body: {
  "token": "{token_projeto}",
  "command": "install_plugin",
  "plugin_slug": "{slug}"
}
```

**UX Considerations**:
- Progress bar geral mostrando "2 de 8 plugins instalados"
- Lista de plugins com indicador individual por plugin
- Opção de pular instalação de plugins (avançado)
- Possibilidade de retentar plugins com erro posteriormente

---

### User Story 3 - Testar Conexão WordPress (Priority: P2)

Usuários podem testar a conexão de um projeto existente para verificar se as credenciais ainda são válidas e o plugin está ativo.

**Why this priority**: Essencial para manutenção e troubleshooting. Credenciais podem expirar ou plugin pode ser desativado.

**Independent Test**: Pode ser testado selecionando um projeto e clicando em "Testar Conexão", verificando se o resultado é correto.

**Acceptance Scenarios**:

1. **Given** um usuário visualizando detalhes de um projeto, **When** clica em "Testar Conexão", **Then** o sistema verifica conectividade, valida credenciais e checa status do plugin
2. **Given** um teste de conexão bem-sucedido, **When** o resultado retorna, **Then** exibe mensagem de sucesso com informações do WordPress (versão, plugins ativos)
3. **Given** um teste com falha de autenticação, **When** o resultado retorna, **Then** exibe erro específico e opção de atualizar credenciais
4. **Given** um teste com plugin inativo, **When** o resultado retorna, **Then** exibe alerta e oferece opção de reinstalar plugin

---

### User Story 4 - Reinstalar Plugin AlvoBot (Priority: P2)

Usuários podem reinstalar ou reativar o plugin AlvoBot em um projeto WordPress existente quando necessário.

**Why this priority**: Importante para recuperação de erros e manutenção, mas depende da funcionalidade de teste de conexão.

**Independent Test**: Pode ser testado desativando manualmente o plugin no WordPress e usando a função de reinstalação.

**Acceptance Scenarios**:

1. **Given** um projeto com plugin AlvoBot inativo, **When** usuário clica em "Reinstalar Plugin", **Then** o sistema tenta reinstalar/reativar o plugin via API WordPress
2. **Given** uma reinstalação bem-sucedida, **When** processo completa, **Then** status do projeto é atualizado para "conectado" e usuário recebe confirmação
3. **Given** falha na reinstalação, **When** erro ocorre, **Then** sistema exibe mensagem de erro detalhada e instruções para instalação manual
4. **Given** usuário sem permissões de administrador no WordPress, **When** tenta reinstalar plugin, **Then** recebe erro explicando necessidade de permissões de admin

---

### User Story 5 - Editar Projeto Existente (Priority: P3)

Usuários podem editar informações de um projeto existente, incluindo nome, URL e credenciais de acesso.

**Why this priority**: Necessário para manutenção, mas menos crítico que criação e teste de conexão.

**Independent Test**: Pode ser testado editando nome e credenciais de um projeto e verificando se mudanças são salvas.

**Acceptance Scenarios**:

1. **Given** um usuário visualizando projeto, **When** clica em "Gerenciar", **Then** abre modal com informações editáveis
2. **Given** usuário editando projeto, **When** altera credenciais, **Then** sistema valida novas credenciais antes de salvar
3. **Given** usuário alterando URL do WordPress, **When** salva mudanças, **Then** sistema testa nova URL e atualiza configurações
4. **Given** usuário editando apenas nome do projeto, **When** salva, **Then** atualização é instantânea sem reteste de conexão

---

### User Story 6 - Excluir Projeto (Priority: P3)

Usuários podem excluir projetos da plataforma (soft delete) mantendo histórico de artigos gerados.

**Why this priority**: Funcionalidade de manutenção menos utilizada, mas necessária para limpeza.

**Independent Test**: Pode ser testado excluindo um projeto e verificando se ele sai da listagem mas dados são preservados.

**Acceptance Scenarios**:

1. **Given** um usuário gerenciando projeto, **When** clica em "Excluir", **Then** sistema solicita confirmação com aviso sobre preservação de dados
2. **Given** confirmação de exclusão, **When** usuário confirma, **Then** projeto é marcado como excluído (soft delete) e removido da listagem
3. **Given** projeto excluído, **When** usuário visualiza artigos antigos, **Then** artigos ainda exibem referência ao projeto excluído
4. **Given** usuário excluindo projeto com artigos em rascunho, **When** confirma exclusão, **Then** recebe aviso sobre perda de acesso aos rascunhos

---

### Edge Cases

- **O que acontece quando Application Password é revogado no WordPress?** Sistema deve detectar erro de autenticação e marcar projeto como "erro de conexão"
- **Como sistema lida com WordPress em domínio temporário/localhost?** Deve aceitar URLs válidas mas alertar sobre uso em produção
- **O que acontece se plugin AlvoBot já existe mas está desatualizado?** Sistema deve detectar versão e oferecer atualização
- **Como sistema lida com rate limiting da API WordPress?** Deve implementar retry com backoff exponencial e informar usuário sobre espera
- **O que acontece se usuário muda URL do WordPress?** Deve permitir atualização e retestar conexão
- **Como sistema lida com WordPress em HTTPS com certificado inválido?** Deve alertar sobre risco de segurança mas permitir conexão se usuário confirmar
- **O que acontece com credenciais se projeto é excluído?** Credenciais devem ser removidas permanentemente por segurança

## Requirements *(mandatory)*

### Functional Requirements

#### Frontend (React)

- **FR-001**: Sistema DEVE exibir página "Meus Blogs" com lista de projetos do usuário em formato de grid responsivo
- **FR-002**: Sistema DEVE mostrar para cada projeto: nome, domínio, status de conexão, contagem de artigos, data da última atualização
- **FR-003**: Sistema DEVE implementar wizard de criação de projeto com 4 etapas: (1) Informações básicas, (2) Credenciais WordPress, (3) Instalação de plugins essenciais, (4) Confirmação final
- **FR-004**: Sistema DEVE permitir busca/filtro de projetos por nome ou domínio
- **FR-005**: Sistema DEVE exibir indicadores visuais de status: conectado (verde), erro (vermelho), não configurado (cinza), testando (amarelo)
- **FR-006**: Sistema DEVE mostrar estado vazio com call-to-action quando usuário não tem projetos
- **FR-007**: Sistema DEVE implementar modal de gerenciamento com abas: Informações, Conexão, Histórico
- **FR-008**: Sistema DEVE validar campos de formulário em tempo real (URL válida, campos obrigatórios)
- **FR-009**: Sistema DEVE exibir mensagens de erro específicas do backend (credenciais inválidas, plugin não instalado, etc.)
- **FR-010**: Sistema DEVE mostrar contador de projetos vs limite do plano do usuário
- **FR-011**: Sistema DEVE implementar confirmação visual antes de excluir projeto
- **FR-011.1**: Sistema DEVE exibir etapa de instalação de plugins essenciais com progress bar geral e status individual por plugin
- **FR-011.2**: Sistema DEVE mostrar em tempo real o status de cada plugin: "Aguardando", "Instalando...", "✓ Instalado", "✗ Erro"
- **FR-011.3**: Sistema DEVE permitir pular instalação de plugins (botão "Pular" para usuários avançados)
- **FR-011.4**: Sistema DEVE exibir resumo final: "X de 8 plugins instalados com sucesso"
- **FR-011.5**: Sistema DEVE permitir retry de plugins que falharam após wizard completar

#### Backend (NestJS)

- **FR-012**: Sistema DEVE implementar módulo WordPress dedicado (`/src/modules/wordpress`) com controller, service e DTOs
- **FR-013**: Sistema DEVE criar endpoint `POST /wordpress/test-connection` que valida credenciais e retorna informações do site
- **FR-014**: Sistema DEVE criar endpoint `POST /wordpress/install-plugin` que instala/ativa plugin via AlvoBot Plugin API
- **FR-014.1**: Sistema DEVE criar endpoint `POST /wordpress/install-essential-plugins` que instala lista de plugins essenciais em loop
- **FR-014.2**: Endpoint DEVE receber `projectId`, `token` e retornar array de resultados com `{slug, name, status, error?}`
- **FR-014.3**: Sistema DEVE chamar WordPress API `POST {domain}/wp-json/alvobot-pro/v1/plugins/commands` com `command: "install_plugin"` e `plugin_slug`
- **FR-014.4**: Sistema DEVE continuar instalação de plugins mesmo se um falhar (não interromper loop)
- **FR-014.5**: Sistema DEVE retornar status individual para cada plugin: "installed", "error", "already_installed"
- **FR-015**: Sistema DEVE criar endpoint `GET /wordpress/site-info/:projectId` que busca informações atualizadas do WordPress
- **FR-016**: Sistema DEVE validar Application Password testando endpoint `/wp-json/wp/v2/users/me`
- **FR-017**: Sistema DEVE verificar permissões do usuário WordPress (precisa ser administrador ou editor)
- **FR-018**: Sistema DEVE buscar versão do WordPress e lista de plugins instalados
- **FR-019**: Sistema DEVE criptografar credenciais WordPress antes de salvar no banco usando `crypto` do Node.js
- **FR-020**: Sistema DEVE descriptografar credenciais apenas quando necessário para chamadas API
- **FR-021**: Sistema DEVE implementar retry com backoff exponencial para chamadas WordPress API (max 3 tentativas)
- **FR-022**: Sistema DEVE registrar logs de tentativas de conexão com timestamp e resultado
- **FR-023**: Sistema DEVE retornar erros HTTP apropriados: 400 (validação), 401 (auth falhou), 502 (WordPress inacessível)
- **FR-024**: Sistema DEVE usar Supabase service_role client para operações de leitura/escrita de projetos

#### Database (Supabase)

- **FR-025**: Sistema DEVE usar tabela existente `projects` com campos: `id`, `user_id`, `name`, `domain`, `login`, `pass`, `status`, `token`, `wp_version`, `plugins`
- **FR-026**: Sistema DEVE adicionar campo `connection_status` à tabela `projects` (enum: 'connected', 'error', 'not_configured', 'testing')
- **FR-027**: Sistema DEVE adicionar campo `last_connection_test` à tabela `projects` (timestamp)
- **FR-028**: Sistema DEVE adicionar campo `connection_error_message` à tabela `projects` (text nullable)
- **FR-029**: Sistema PODE criar tabela `wordpress_connection_logs` para histórico detalhado de testes
- **FR-030**: Sistema DEVE manter RLS policies existentes na tabela `projects` (usuário acessa apenas seus projetos)
- **FR-031**: Sistema DEVE armazenar campo `pass` (Application Password) criptografado
- **FR-032**: Sistema DEVE usar soft delete (campo `is_deleted`) ao excluir projetos

### Security Requirements

- **SEC-001**: Sistema NUNCA DEVE expor Application Passwords no frontend (nem em responses da API)
- **SEC-002**: Sistema DEVE enviar credenciais WordPress apenas via HTTPS
- **SEC-003**: Sistema DEVE criptografar Application Passwords no banco usando AES-256-GCM
- **SEC-004**: Sistema DEVE armazenar chave de criptografia em variável de ambiente `WORDPRESS_ENCRYPTION_KEY`
- **SEC-005**: Sistema DEVE validar e sanitizar URLs do WordPress para prevenir SSRF attacks
- **SEC-006**: Sistema DEVE usar JWT Guard em todos os endpoints WordPress para garantir autenticação
- **SEC-007**: Sistema DEVE validar que `user_id` do token JWT corresponde ao `user_id` do projeto
- **SEC-008**: Sistema DEVE implementar rate limiting em endpoints de teste de conexão (max 10 req/min por usuário)
- **SEC-009**: Sistema DEVE logar tentativas de acesso não autorizado a projetos
- **SEC-010**: Sistema DEVE validar tamanho e formato de Application Password (36-48 caracteres alfanuméricos)

### Non-Functional Requirements

- **NFR-001**: Teste de conexão WordPress DEVE completar em menos de 10 segundos
- **NFR-002**: Instalação de plugin DEVE completar em menos de 15 segundos
- **NFR-003**: Listagem de projetos DEVE carregar em menos de 2 segundos para até 50 projetos
- **NFR-004**: Sistema DEVE suportar até 100 projetos por usuário (configurável por plano)
- **NFR-005**: Interface DEVE ser responsiva para telas a partir de 320px de largura
- **NFR-006**: Sistema DEVE cachear informações do WordPress por 5 minutos usando TanStack Query
- **NFR-007**: Wizard de criação DEVE ter animações suaves entre etapas (200-300ms)
- **NFR-008**: Sistema DEVE exibir loading states durante operações assíncronas

### Key Entities

#### Project (existente, será estendido)
```typescript
interface Project {
  id: number
  user_id: string
  name: string
  domain: string // URL do WordPress (ex: https://meublog.com)
  login: string // Username WordPress
  pass: string // Application Password (criptografado)
  status: boolean // Ativo/inativo
  connection_status: 'connected' | 'error' | 'not_configured' | 'testing'
  last_connection_test?: string // ISO timestamp
  connection_error_message?: string
  token?: string // Token de autenticação customizado (se necessário)
  wp_version?: string // Versão do WordPress
  plugins?: { name: string; version: string; active: boolean }[]
  niche_selected?: string
  is_approved_on_adsense: boolean
  adsense_status?: string
  log?: Record<string, unknown>
  created_at: string
  updated_at?: string
  is_deleted: boolean
}
```

#### WordPressConnectionLog (novo, opcional)
```typescript
interface WordPressConnectionLog {
  id: string
  project_id: number
  test_type: 'manual' | 'automatic' | 'wizard'
  success: boolean
  error_message?: string
  response_time_ms: number
  wp_version?: string
  tested_at: string
  user_id: string
}
```

#### DTOs Backend

```typescript
// Test Connection DTO
interface TestConnectionDto {
  projectId: number
}

// Create Project DTO
interface CreateProjectDto {
  name: string
  domain: string // URL completa do WordPress
  login: string // Username WordPress
  applicationPassword: string // Application Password (será criptografado)
  nicheSelected?: string
}

// Update Project DTO
interface UpdateProjectDto {
  name?: string
  domain?: string
  login?: string
  applicationPassword?: string
}

// WordPress Site Info Response
interface WordPressSiteInfo {
  wpVersion: string
  siteUrl: string
  siteName: string
  plugins: { name: string; version: string; active: boolean }[]
  alvobot_plugin_active: boolean
  user_permissions: string[]
}

// Test Connection Response
interface TestConnectionResponse {
  success: boolean
  connectionStatus: 'connected' | 'error'
  errorMessage?: string
  siteInfo?: WordPressSiteInfo
  responseTimeMs: number
}
```

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Usuário pode adicionar novo projeto WordPress e ver status "conectado" em menos de 30 segundos
- **SC-002**: Taxa de sucesso de teste de conexão deve ser > 95% para credenciais válidas
- **SC-003**: Tempo de resposta de teste de conexão deve ser < 10 segundos em 90% dos casos
- **SC-004**: Wizard de criação deve ter taxa de conclusão > 80% (usuários que começam completam)
- **SC-005**: Zero Application Passwords expostos em logs, responses da API ou frontend
- **SC-006**: Sistema deve detectar e alertar sobre 100% dos casos de credenciais inválidas
- **SC-007**: Interface deve manter 100% de funcionalidade em telas de 320px+ de largura
- **SC-008**: Reinstalação de plugin deve ter taxa de sucesso > 90% quando credenciais são válidas
- **SC-009**: Sistema deve suportar pelo menos 3 requisições simultâneas de teste de conexão sem degradação
- **SC-010**: Listagem de projetos deve funcionar corretamente com até 100 projetos por usuário

### User Acceptance

- **UAC-001**: Usuário consegue adicionar projeto WordPress real e ver confirmação de sucesso
- **UAC-002**: Usuário consegue identificar visualmente quais projetos têm problemas de conexão
- **UAC-003**: Usuário recebe mensagem de erro clara e acionável quando conexão falha
- **UAC-004**: Usuário consegue resolver problemas de conexão atualizando credenciais
- **UAC-005**: Usuário consegue reinstalar plugin sem precisar acessar WordPress manualmente

## Constants

### Essential WordPress Plugins

Lista de plugins essenciais instalados automaticamente após cadastro do projeto:

```typescript
const ESSENTIAL_PLUGINS = [
  {
    name: 'Instant Indexing',
    slug: 'fast-indexing-api',
    description: 'Facilita a indexação rápida de páginas nos motores de busca'
  },
  {
    name: 'Missed Schedule Posts',
    slug: 'missed-scheduled-posts-publisher',
    description: 'Realiza a publicação automática de posts agendados que perderam o prazo'
  },
  {
    name: 'Rank Math',
    slug: 'seo-by-rank-math',
    description: 'Plugin avançado para otimização de SEO no WordPress'
  },
  {
    name: 'JetPack',
    slug: 'jetpack',
    description: 'Conjunto de ferramentas para segurança, performance e marketing'
  },
  {
    name: 'Widgets Clássicos',
    slug: 'classic-widgets',
    description: 'Restaura o editor de widgets clássico do WordPress'
  },
  {
    name: 'Cookie Notice',
    slug: 'cookie-notice',
    description: 'Exibe notificações para consentimento de cookies no site'
  },
  {
    name: 'Site Kit by Google',
    slug: 'google-site-kit',
    description: 'Integração completa com serviços do Google para análises, SEO e desempenho'
  },
  {
    name: 'Polylang',
    slug: 'polylang',
    description: 'Permite criar um site WordPress multilíngue facilmente'
  }
]
```

### Plugin Installation API

```typescript
// AlvoBot Plugin API Endpoint
POST {domain}/wp-json/alvobot-pro/v1/plugins/commands

// Headers
Authorization: Basic {base64(login:password)}
Content-Type: application/json

// Body
{
  "token": string,           // Project token from database
  "command": "install_plugin",
  "plugin_slug": string      // WordPress plugin slug
}

// Response
{
  "success": boolean,
  "message": string,
  "data": {
    "plugin": string,
    "status": "installed" | "already_installed" | "error"
  }
}
```

## Technical Architecture

### Frontend Structure

```
features/projects/
├── api/
│   ├── useProjects.ts (existente - query de listagem)
│   ├── useProject.ts (existente - query de item único)
│   ├── useProjectStats.ts (existente - métricas)
│   ├── mutations.ts (existente - create, update, delete)
│   └── wordpress.ts (NOVO - mutations para teste/instalação)
├── components/
│   ├── ProjectCard.tsx (existente - card de projeto)
│   ├── ProjectForm.tsx (existente - formulário)
│   ├── ProjectCreateWizard.tsx (existente - wizard criação)
│   ├── ProjectManageModal.tsx (NOVO - modal gerenciamento)
│   ├── ConnectionStatusBadge.tsx (NOVO - badge de status)
│   └── ConnectionTestResult.tsx (NOVO - resultado do teste)
├── pages/
│   └── ProjectsPage.tsx (existente - página principal)
└── types/
    └── index.ts (existente - tipos TypeScript)
```

### Backend Structure

```
backend/src/modules/wordpress/ (NOVO)
├── wordpress.controller.ts
├── wordpress.service.ts
├── wordpress.module.ts
├── dto/
│   ├── test-connection.dto.ts
│   ├── install-plugin.dto.ts
│   ├── create-project.dto.ts
│   └── update-project.dto.ts
├── interfaces/
│   ├── wordpress-api.interface.ts
│   └── site-info.interface.ts
└── utils/
    ├── encryption.util.ts (criptografia de credenciais)
    └── wordpress-client.util.ts (cliente HTTP para WP API)
```

### API Endpoints

```
POST   /wordpress/test-connection
       Body: { projectId: number }
       Response: TestConnectionResponse

POST   /wordpress/install-plugin
       Body: { projectId: number }
       Response: { success: boolean; message: string }

GET    /wordpress/site-info/:projectId
       Response: WordPressSiteInfo

PATCH  /wordpress/update-credentials/:projectId
       Body: { login?: string; applicationPassword?: string }
       Response: { success: boolean }
```

### WordPress REST API Endpoints Used

```
GET    /wp-json/wp/v2/users/me
       Purpose: Validar credenciais e obter informações do usuário

GET    /wp-json/wp/v2/plugins
       Purpose: Listar plugins instalados (requer WordPress 5.5+)

POST   /wp-json/wp/v2/plugins/alvobot/activate
       Purpose: Ativar plugin AlvoBot (se já instalado)

GET    /wp-json/
       Purpose: Descobrir endpoints disponíveis e versão do WP
```

### Database Schema Changes

```sql
-- Adicionar colunas à tabela projects existente
ALTER TABLE projects
ADD COLUMN connection_status TEXT DEFAULT 'not_configured',
ADD COLUMN last_connection_test TIMESTAMP WITH TIME ZONE,
ADD COLUMN connection_error_message TEXT;

-- Criar enum para status de conexão
CREATE TYPE connection_status_enum AS ENUM ('connected', 'error', 'not_configured', 'testing');

-- Alterar coluna para usar enum
ALTER TABLE projects
ALTER COLUMN connection_status TYPE connection_status_enum
USING connection_status::connection_status_enum;

-- Tabela de logs de conexão (opcional)
CREATE TABLE wordpress_connection_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id INTEGER REFERENCES projects(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  test_type TEXT NOT NULL, -- 'manual', 'automatic', 'wizard'
  success BOOLEAN NOT NULL,
  error_message TEXT,
  response_time_ms INTEGER,
  wp_version TEXT,
  tested_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- RLS para logs de conexão
ALTER TABLE wordpress_connection_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own connection logs"
  ON wordpress_connection_logs FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own connection logs"
  ON wordpress_connection_logs FOR INSERT
  WITH CHECK (auth.uid() = user_id);
```

### WordPress Plugin (AlvoBot)

O plugin AlvoBot deve ser instalado no WordPress do usuário para permitir integrações avançadas:

```php
/**
 * Plugin Name: AlvoBot
 * Description: Integração entre WordPress e AlvoBot para publicação automatizada
 * Version: 1.0.0
 * Author: AlvoBot
 */

// Registrar endpoint customizado para verificação
add_action('rest_api_init', function () {
  register_rest_route('alvobot/v1', '/status', [
    'methods' => 'GET',
    'callback' => 'alvobot_status_callback',
    'permission_callback' => function() {
      return current_user_can('edit_posts');
    }
  ]);
});

function alvobot_status_callback() {
  return [
    'active' => true,
    'version' => '1.0.0',
    'wp_version' => get_bloginfo('version'),
    'capabilities' => [
      'create_posts' => current_user_can('publish_posts'),
      'upload_files' => current_user_can('upload_files'),
    ]
  ];
}
```

## Implementation Plan

### Phase 1: Backend WordPress Integration (Priority: P1)
**Estimated: 3 days**

1. Criar módulo WordPress em `backend/src/modules/wordpress/`
2. Implementar serviço de criptografia de credenciais
3. Criar cliente HTTP para WordPress REST API com retry logic
4. Implementar endpoint `POST /wordpress/test-connection`
5. Implementar endpoint `GET /wordpress/site-info/:projectId`
6. Adicionar validação de Application Password
7. Adicionar testes unitários para serviços WordPress
8. Documentar endpoints da API

**Deliverables**:
- Módulo WordPress funcional
- Endpoints de teste e informações do site
- Criptografia de credenciais
- Testes unitários

---

### Phase 2: Database Schema & Migration (Priority: P1)
**Estimated: 1 day**

1. Criar migration para adicionar colunas na tabela `projects`
2. Criar tabela `wordpress_connection_logs` (opcional)
3. Configurar RLS policies para novos campos
4. Atualizar tipos TypeScript para refletir schema
5. Testar migrations em ambiente de desenvolvimento

**Deliverables**:
- Migrations do banco de dados
- Schema atualizado
- Tipos TypeScript atualizados

---

### Phase 3: Frontend - Wizard de Criação (Priority: P1)
**Estimated: 3 days**

1. Atualizar `ProjectCreateWizard.tsx` para incluir validação WordPress
2. Adicionar step de teste de conexão no wizard
3. Implementar validação de URL e Application Password
4. Criar mutation `useTestWordPressConnection` em `api/wordpress.ts`
5. Adicionar feedback visual durante teste de conexão
6. Implementar tratamento de erros específicos
7. Adicionar animações entre steps do wizard
8. Testar wizard com WordPress real

**Deliverables**:
- Wizard de criação completo
- Validação de conexão funcional
- Tratamento de erros
- UX polida

---

### Phase 4: Frontend - Gerenciamento de Projetos (Priority: P2)
**Estimated: 2 days**

1. Criar componente `ProjectManageModal.tsx` com abas
2. Implementar aba "Informações" para edição básica
3. Implementar aba "Conexão" com teste e reinstalação
4. Criar componente `ConnectionStatusBadge.tsx`
5. Criar componente `ConnectionTestResult.tsx`
6. Atualizar `ProjectCard.tsx` para mostrar status de conexão
7. Adicionar mutation `useReinstallPlugin` em `api/wordpress.ts`
8. Implementar polling de status durante reinstalação

**Deliverables**:
- Modal de gerenciamento funcional
- Teste de conexão em projeto existente
- Reinstalação de plugin
- Componentes de status

---

### Phase 5: Backend - Instalação de Plugin (Priority: P2)
**Estimated: 2 days**

1. Implementar endpoint `POST /wordpress/install-plugin`
2. Criar lógica de ativação de plugin via API WordPress
3. Implementar verificação de versão do plugin
4. Adicionar logging de tentativas de instalação
5. Criar endpoint para download/upload do plugin (se necessário)
6. Implementar fallback para instalação manual
7. Adicionar testes para instalação de plugin

**Deliverables**:
- Endpoint de instalação de plugin
- Lógica de ativação
- Tratamento de erros
- Testes

---

### Phase 6: Frontend - Listagem e Filtros (Priority: P3)
**Estimated: 1 day**

1. Atualizar `ProjectsPage.tsx` para mostrar status de conexão
2. Adicionar filtro por status de conexão
3. Implementar busca por nome/domínio
4. Adicionar ordenação (nome, data, status)
5. Otimizar grid responsivo para mobile
6. Adicionar loading states e skeleton screens
7. Implementar refresh manual da lista

**Deliverables**:
- Listagem aprimorada
- Filtros funcionais
- Responsividade mobile

---

### Phase 7: Logs e Histórico (Priority: P3)
**Estimated: 2 days**

1. Implementar salvamento de logs no backend
2. Criar endpoint `GET /wordpress/connection-logs/:projectId`
3. Adicionar aba "Histórico" no modal de gerenciamento
4. Criar componente de timeline de logs
5. Implementar paginação de logs
6. Adicionar filtros de logs (sucesso/erro, período)
7. Criar query `useConnectionLogs` no frontend

**Deliverables**:
- Logs de conexão persistidos
- Visualização de histórico
- Timeline de eventos

---

### Phase 8: Polish e Refinamento (Priority: P3)
**Estimated: 1 day**

1. Revisar mensagens de erro e feedback do usuário
2. Adicionar tooltips explicativos
3. Implementar empty states aprimorados
4. Adicionar animações e micro-interações
5. Revisar acessibilidade (ARIA labels, keyboard navigation)
6. Otimizar performance de queries
7. Adicionar analytics/tracking de eventos
8. Documentar fluxo de uso para usuários

**Deliverables**:
- UX polida
- Acessibilidade
- Performance otimizada
- Documentação de usuário

---

## Assumptions

- WordPress dos usuários roda versão 5.5+ (para suporte a plugin endpoints)
- Usuários têm permissão de administrador ou editor no WordPress
- Application Passwords estão habilitados no WordPress (padrão desde WP 5.6)
- Sites WordPress são acessíveis via HTTPS (não HTTP)
- Plugin AlvoBot será desenvolvido separadamente como plugin WordPress standalone
- Backend tem acesso à internet para chamar WordPress REST API
- Supabase permite armazenamento de credenciais criptografadas
- Rate limiting do WordPress permite pelo menos 60 requisições por minuto
- Não há necessidade de OAuth para autenticação WordPress (Application Password é suficiente)

## Out of Scope

- Desenvolvimento completo do plugin AlvoBot WordPress (apenas estrutura básica)
- Sincronização automática de posts WordPress → AlvoBot (apenas AlvoBot → WordPress)
- Suporte para WordPress.com (apenas WordPress auto-hospedado)
- Instalação automática do plugin (usuário precisa instalar manualmente ou via upload)
- Gestão de múltiplos usuários WordPress por projeto
- Versionamento e atualização automática do plugin AlvoBot
- Backup e restauração de configurações WordPress
- Monitoramento de uptime do WordPress
- Integração com outros CMSs além de WordPress
- Migração de conteúdo entre projetos WordPress

## Risks & Mitigations

### Risk 1: WordPress com REST API desabilitada
**Impact**: Alto - Usuário não conseguirá conectar projeto
**Probability**: Baixa
**Mitigation**: Detectar erro específico e orientar usuário a habilitar REST API

### Risk 2: Application Password não funciona (desabilitado por plugin de segurança)
**Impact**: Alto - Autenticação falhará
**Probability**: Média
**Mitigation**: Documentar plugins de segurança conhecidos e como configurá-los

### Risk 3: WordPress em servidor com IP bloqueado/firewall
**Impact**: Médio - Teste de conexão falhará
**Probability**: Média
**Mitigation**: Orientar usuário a adicionar IP do servidor AlvoBot na whitelist

### Risk 4: Credenciais expostas em logs ou erro
**Impact**: Crítico - Violação de segurança
**Probability**: Baixa
**Mitigation**: Sanitizar todos os logs, nunca logar credenciais, code review rigoroso

### Risk 5: Rate limiting agressivo no WordPress
**Impact**: Médio - Operações falham temporariamente
**Probability**: Baixa
**Mitigation**: Implementar retry com backoff, informar usuário sobre espera

### Risk 6: Plugin AlvoBot desatualizado ou incompatível
**Impact**: Médio - Funcionalidades podem falhar
**Probability**: Média
**Mitigation**: Verificar versão do plugin e alertar sobre necessidade de atualização

## Dependencies

- **External Libraries (Backend)**:
  - `axios` para HTTP requests ao WordPress
  - `crypto` (Node.js built-in) para criptografia
  - `@nestjs/axios` para integração NestJS

- **External Libraries (Frontend)**:
  - Nenhuma nova dependência (usa stack existente)

- **Infrastructure**:
  - Servidor backend precisa ter acesso HTTP/HTTPS saída para chamar WordPress
  - Variável de ambiente `WORDPRESS_ENCRYPTION_KEY` precisa ser configurada

- **Third-Party Services**:
  - WordPress REST API (versão 5.5+)
  - Supabase PostgreSQL com RLS

## Testing Strategy

### Unit Tests

**Backend**:
- Serviço de criptografia/descriptografia de credenciais
- Cliente WordPress API (mock de responses)
- Validação de DTOs
- Lógica de retry e backoff

**Frontend**:
- Validação de formulários (URL, Application Password)
- Transformação de dados (DTOs)
- Hooks customizados (queries e mutations)

### Integration Tests

**Backend**:
- Endpoint de teste de conexão com WordPress mock
- Endpoint de instalação de plugin
- Fluxo completo: criar projeto → testar → salvar no banco

**Frontend**:
- Wizard completo de criação de projeto
- Modal de gerenciamento
- Fluxo de teste de conexão

### E2E Tests

- Criar projeto WordPress com credenciais válidas
- Testar conexão de projeto existente
- Reinstalar plugin em projeto
- Editar credenciais e validar nova conexão
- Excluir projeto e verificar soft delete
- Listar projetos e aplicar filtros

### Manual Testing Checklist

- [ ] Criar projeto com URL inválida (deve falhar com mensagem clara)
- [ ] Criar projeto com Application Password inválido (deve falhar na autenticação)
- [ ] Criar projeto com credenciais válidas (deve conectar com sucesso)
- [ ] Testar conexão de projeto existente com status OK
- [ ] Testar conexão após revogar Application Password no WordPress
- [ ] Reinstalar plugin AlvoBot
- [ ] Editar URL do projeto e retestar conexão
- [ ] Excluir projeto e verificar que não aparece mais na listagem
- [ ] Verificar responsividade em mobile (320px, 768px, 1024px)
- [ ] Verificar que credenciais nunca aparecem em DevTools Network tab

## Glossary

- **Application Password**: Senha específica gerada pelo WordPress para autenticação via REST API (diferente da senha de login)
- **Soft Delete**: Marcação de registro como excluído sem removê-lo fisicamente do banco de dados
- **RLS (Row Level Security)**: Política de segurança do PostgreSQL que restringe acesso a linhas baseado no usuário
- **WordPress REST API**: Interface HTTP nativa do WordPress para manipulação de conteúdo programaticamente
- **Service Role**: Chave do Supabase com permissões administrativas, usada apenas no backend
- **Anon Key**: Chave do Supabase com permissões limitadas, segura para uso no frontend
- **SSRF (Server-Side Request Forgery)**: Ataque onde servidor é enganado para fazer requisições não autorizadas
- **Retry com Backoff**: Estratégia de tentar novamente após falha, aumentando tempo de espera entre tentativas

## References

- [WordPress REST API Handbook](https://developer.wordpress.org/rest-api/)
- [Application Passwords in WordPress](https://make.wordpress.org/core/2020/11/05/application-passwords-integration-guide/)
- [Supabase Row Level Security](https://supabase.com/docs/guides/auth/row-level-security)
- [NestJS Guards Documentation](https://docs.nestjs.com/guards)
- [TanStack Query Best Practices](https://tanstack.com/query/latest/docs/react/guides/best-practices)
