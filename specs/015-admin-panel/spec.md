# Feature Specification: Admin Panel

**Feature Branch**: `015-admin-panel`
**Created**: 2025-11-30
**Status**: Draft
**Input**: User description: "Ambiente admin onde eu vou definir os modelos de IA padrões do sistema, para TODOS os locais que usam IA, até mesmo aqueles onde o usuario não tem a opção de escolher o modelo. como embeding, visual de imagem e arquivos no chat, modelo default do chat … todos todos todos, não quero NADA hardcode. Assim como, quais serão os modelos exibidos na listagem de models no assistente IA. Aproveitando que vai ser implementado um ambiente admin, crie também as configurações básicas no admin, como gestão de usuários, workspaces e outras coisas importantes para um SaaS."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - AI Model Configuration (Priority: P1)

O administrador do sistema precisa configurar quais modelos de IA são usados em cada funcionalidade do sistema, eliminando qualquer configuração hardcoded. Isso inclui:

- Modelo padrão do chat/assistente
- Modelo para embeddings (RAG)
- Modelo para análise de imagens (vision)
- Modelo para análise de arquivos/documentos
- Modelo para geração de imagens
- Modelo para naming automático de imagens
- Quais modelos aparecem na listagem do seletor de modelos

**Why this priority**: Requisito principal e mais crítico do admin - permite controle total sobre custos de IA, qualidade de output e flexibilidade para trocar providers sem alterar código.

**Independent Test**: Pode ser testado alterando o modelo padrão do chat e verificando que novas conversas usam o novo modelo configurado.

**Acceptance Scenarios**:

1. **Given** o admin está na página de configuração de modelos de IA, **When** ele seleciona um novo modelo padrão para chat, **Then** todas as novas conversas criadas usam esse modelo como padrão
2. **Given** o admin configura o modelo de embedding, **When** novos documentos são indexados para RAG, **Then** o sistema usa o modelo configurado para gerar embeddings
3. **Given** o admin configura a lista de modelos visíveis, **When** um usuário abre o seletor de modelos no chat, **Then** apenas os modelos configurados aparecem na listagem
4. **Given** o admin desabilita um modelo da listagem, **When** usuários tentam selecionar modelos, **Then** o modelo desabilitado não aparece como opção

---

### User Story 2 - User Management (Priority: P2)

O administrador precisa visualizar, gerenciar e moderar todos os usuários da plataforma. Isso inclui ver estatísticas de uso, bloquear/desbloquear usuários, e gerenciar permissões.

**Why this priority**: Essencial para operação de um SaaS - permite controle sobre acesso, identificação de problemas e moderação.

**Independent Test**: Pode ser testado listando usuários, filtrando por critérios e bloqueando/desbloqueando um usuário de teste.

**Acceptance Scenarios**:

1. **Given** o admin está na página de usuários, **When** ele visualiza a lista, **Then** vê todos os usuários com email, data de cadastro, status e último acesso
2. **Given** o admin seleciona um usuário, **When** ele clica em "Bloquear", **Then** o usuário não consegue mais fazer login e vê mensagem apropriada
3. **Given** o admin está na lista de usuários, **When** ele filtra por "usuários ativos nos últimos 30 dias", **Then** apenas esses usuários são exibidos
4. **Given** o admin visualiza um usuário, **When** ele acessa os detalhes, **Then** vê estatísticas de uso (conversas, documentos, tokens consumidos)

---

### User Story 3 - Workspace Management (Priority: P2)

O administrador precisa visualizar e gerenciar todos os workspaces da plataforma, incluindo estatísticas de uso, membros e configurações.

**Why this priority**: Workspaces são a unidade central de organização do sistema - gerenciá-los é fundamental para suporte e operação.

**Independent Test**: Pode ser testado listando workspaces, visualizando detalhes de um workspace específico e alterando configurações.

**Acceptance Scenarios**:

1. **Given** o admin está na página de workspaces, **When** ele visualiza a lista, **Then** vê todos os workspaces com nome, owner, número de membros e data de criação
2. **Given** o admin seleciona um workspace, **When** ele acessa os detalhes, **Then** vê lista de membros, projetos, documentos e estatísticas de uso
3. **Given** o admin está nos detalhes do workspace, **When** ele remove um membro, **Then** o membro perde acesso ao workspace

---

### User Story 4 - System Dashboard (Priority: P3)

O administrador precisa de uma visão geral do sistema com métricas importantes para monitoramento e tomada de decisão.

**Why this priority**: Importante para operação mas não bloqueia outras funcionalidades.

**Independent Test**: Pode ser testado acessando o dashboard e verificando que as métricas são exibidas corretamente.

**Acceptance Scenarios**:

1. **Given** o admin acessa o dashboard, **When** a página carrega, **Then** vê métricas de usuários ativos, workspaces, uso de IA e tendências
2. **Given** o admin está no dashboard, **When** ele seleciona período "últimos 7 dias", **Then** as métricas são filtradas para esse período
3. **Given** o admin está no dashboard, **When** há alertas importantes (ex: uso alto de API), **Then** os alertas são exibidos de forma destacada

---

### User Story 5 - System Settings (Priority: P3)

O administrador precisa gerenciar configurações globais do sistema como limites de uso, feature flags e configurações de integração.

**Why this priority**: Complementa as funcionalidades principais de admin.

**Independent Test**: Pode ser testado alterando um limite global e verificando que afeta novos usuários.

**Acceptance Scenarios**:

1. **Given** o admin está nas configurações do sistema, **When** ele define limite máximo de tokens por usuário/mês, **Then** usuários que excedem o limite são notificados e bloqueados de gerar mais conteúdo
2. **Given** o admin configura uma feature flag, **When** ele ativa/desativa uma funcionalidade, **Then** a funcionalidade é ativada/desativada para todos os usuários
3. **Given** o admin configura chave de API do OpenRouter, **When** a chave é salva, **Then** o sistema usa a nova chave para chamadas de IA

---

### Edge Cases

- O que acontece quando o admin tenta configurar um modelo inválido ou inexistente? → Sistema valida antes de salvar e rejeita configuração inválida
- Como o sistema se comporta se a API de modelos está indisponível? → Usa modelo fallback configurado; se fallback também indisponível, exibe erro gracioso ao usuário
- O que acontece quando um modelo configurado é removido do provider? → Sistema detecta na próxima validação e usa fallback automaticamente
- Como lidar com usuários que estão no meio de uma operação quando são bloqueados?
- O que acontece quando o admin tenta remover o owner de um workspace?

## Requirements *(mandatory)*

### Functional Requirements

#### Autenticação e Autorização Admin

- **FR-001**: Sistema DEVE ter um papel de "super_admin" separado de owner/admin de workspace
- **FR-001a**: O primeiro super_admin DEVE ser configurado via seed/migration no banco de dados
- **FR-001b**: Novos super_admins só podem ser promovidos por super_admins existentes (FR-020)
- **FR-002**: Apenas usuários com papel super_admin DEVEM acessar o painel administrativo via rota `/admin`
- **FR-003**: Sistema DEVE verificar permissões em todas as rotas do admin
- **FR-004**: Sistema DEVE registrar todas as ações administrativas em log de auditoria

#### Configuração de Modelos de IA

- **FR-005**: Sistema DEVE permitir configurar modelo padrão para chat/assistente
- **FR-006**: Sistema DEVE permitir configurar modelo para geração de embeddings
- **FR-007**: Sistema DEVE permitir configurar modelo para análise de imagens (vision)
- **FR-008**: Sistema DEVE permitir configurar modelo para análise de documentos/arquivos
- **FR-009**: Sistema DEVE permitir configurar modelo para geração de imagens
- **FR-010**: Sistema DEVE permitir configurar modelo para naming automático de imagens
- **FR-011**: Sistema DEVE permitir definir quais modelos aparecem no seletor de modelos do usuário
- **FR-012**: Sistema DEVE buscar lista de modelos disponíveis dinamicamente da API do provider
- **FR-013**: Sistema DEVE validar que modelos configurados existem e estão disponíveis
- **FR-013a**: Sistema DEVE permitir configurar modelo fallback para cada tipo de tarefa
- **FR-013b**: Quando modelo principal estiver indisponível, sistema DEVE usar modelo fallback automaticamente
- **FR-014**: Todas as configurações de modelo DEVEM ser armazenadas no banco de dados, nunca hardcoded
- **FR-015**: Sistema DEVE aplicar configurações imediatamente sem necessidade de restart

#### Gestão de Usuários

- **FR-016**: Sistema DEVE listar todos os usuários com paginação e busca
- **FR-017**: Sistema DEVE permitir filtrar usuários por status, data de cadastro e atividade
- **FR-018**: Sistema DEVE exibir detalhes do usuário incluindo email, workspaces e estatísticas
- **FR-019**: Sistema DEVE permitir bloquear/desbloquear usuários
- **FR-020**: Sistema DEVE permitir promover usuário a super_admin
- **FR-021**: Sistema DEVE exibir estatísticas de uso por usuário (tokens, conversas, documentos)

#### Gestão de Workspaces

- **FR-022**: Sistema DEVE listar todos os workspaces com paginação e busca
- **FR-023**: Sistema DEVE exibir detalhes do workspace incluindo membros, projetos e uso
- **FR-024**: Sistema DEVE permitir transferir ownership de workspace
- **FR-025**: Sistema DEVE permitir remover membros de workspaces

#### Dashboard e Métricas

- **FR-026**: Sistema DEVE exibir métricas de usuários (total, ativos, novos)
- **FR-027**: Sistema DEVE exibir métricas de workspaces (total, ativos)
- **FR-028**: Sistema DEVE exibir métricas de uso de IA (tokens consumidos, por modelo)
- **FR-029**: Sistema DEVE permitir filtrar métricas por período
- **FR-030**: Sistema DEVE exibir alertas para situações críticas (ex: erros de API, uso alto)

#### Configurações do Sistema

- **FR-031**: Sistema DEVE permitir configurar limites globais (tokens/mês, workspaces/usuário)
- **FR-032**: Sistema DEVE permitir configurar feature flags
- **FR-033**: Sistema DEVE permitir configurar chaves de API de providers
- **FR-034**: Sistema DEVE permitir configurar mensagens de sistema (manutenção, anúncios)

### Key Entities

- **SystemConfig**: Configurações globais do sistema (modelo padrão, limites, feature flags)
- **AIModelConfig**: Configurações específicas de modelos de IA por funcionalidade
- **AuditLog**: Registro de ações administrativas (quem, quando, o que)
- **User (extend)**: Adicionar campo is_super_admin
- **SystemAlert**: Alertas e notificações do sistema

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Admin consegue alterar modelo padrão do chat em menos de 1 minuto
- **SC-002**: Alterações de configuração de modelo são aplicadas imediatamente sem downtime
- **SC-003**: 100% das funcionalidades de IA usam configurações do banco, zero hardcode
- **SC-004**: Admin consegue localizar e gerenciar qualquer usuário em menos de 30 segundos
- **SC-005**: Dashboard carrega com todas as métricas em menos de 3 segundos
- **SC-006**: Todas as ações administrativas são registradas em log de auditoria
- **SC-007**: Sistema mantém funcionamento normal mesmo se painel admin estiver indisponível

## Assumptions

- O sistema já possui autenticação via Supabase Auth
- Já existe estrutura de roles em workspaces (owner, admin, member)
- A API do OpenRouter já está integrada para buscar modelos disponíveis
- O banco de dados PostgreSQL suporta campos JSONB para configurações flexíveis
- O frontend já utiliza o design system com glassmorphism

## Clarifications

### Session 2025-11-30

- Q: Como o primeiro super_admin é criado e como novos super_admins são designados? → A: Seed inicial no banco + promoção por super_admin existente
- Q: Como o painel admin será acessado - rota separada ou integrado na navegação? → A: Rota separada `/admin` com autenticação específica
- Q: O que acontece se um modelo configurado ficar indisponível durante uso? → A: Usar modelo fallback configurável pelo admin para cada tipo de tarefa
