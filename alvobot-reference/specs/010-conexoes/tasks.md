# Tasks: Conexoes (Integracoes)

**Input**: Design documents from `/specs/010-conexoes/`
**Prerequisites**: plan.md, spec.md, research.md, quickstart.md

**Status**: ✅ COMPLETO
- Meta OAuth: ✅ COMPLETO (US1)
- Google OAuth: ✅ COMPLETO (US2)
- Gerenciar Conexoes: ✅ COMPLETO (US3)
- Notificacoes: ✅ COMPLETO (US4)

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- Include exact file paths in descriptions

---

## Phase 1: Setup (Verificacao)

**Purpose**: Verificar infraestrutura existente

- [X] T001 Verificar estrutura de pastas backend/src/modules/meta
- [X] T002 Verificar estrutura de pastas frontend/src/features/connections
- [X] T003 Verificar tabela connections no Supabase
- [X] T004 Verificar/criar tabela connection_logs no Supabase
- [X] T005 Adicionar GOOGLE_CLIENT_ID e GOOGLE_CLIENT_SECRET ao backend/.env.example

---

## Phase 2: Foundational (Shared Infrastructure)

**Purpose**: Infraestrutura compartilhada entre Meta e Google OAuth

- [X] T006 ConnectionsService base em backend/src/modules/meta/meta.service.ts
- [X] T007 JwtAuthGuard configurado em backend/src/common/guards/jwt-auth.guard.ts
- [X] T008 Criar funcao encrypt_token no Supabase (se nao existir)
- [X] T009 Criar funcao decrypt_token no Supabase (se nao existir)
- [X] T010 Adicionar cron job para auto-refresh de tokens em backend/src/modules/connections/connections.cron.ts

**Checkpoint**: Foundation ready - Google OAuth pode ser implementado

---

## Phase 3: User Story 1 - Conectar Meta (Priority: P1) ✅ COMPLETO

**Goal**: Usuario pode conectar sua conta do Meta usando OAuth

**Status**: ✅ JA IMPLEMENTADO

- [X] T011 [US1] POST /meta/oauth/initiate em backend/src/modules/meta/meta.controller.ts
- [X] T012 [US1] GET /meta/oauth/callback em backend/src/modules/meta/meta.controller.ts
- [X] T013 [US1] MetaCallbackPage em frontend/src/features/connections/pages/MetaCallbackPage.tsx
- [X] T014 [US1] Selecao de paginas apos OAuth em frontend/src/features/connections/pages/MetaCallbackPage.tsx
- [X] T015 [US1] UI de conexao Meta em frontend/src/features/connections/pages/ConnectionsPage.tsx

**Checkpoint**: User Story 1 COMPLETA

---

## Phase 4: User Story 2 - Conectar Google Ads (Priority: P2) ✅ COMPLETO

**Goal**: Usuario pode conectar sua conta Google para criar campanhas no Google Ads

**Independent Test**: Clicar "Conectar Google", autorizar no Google, ver conexao como "Ativa"

### Implementation for User Story 2

- [X] T016 [P] [US2] Criar google-oauth.controller.ts em backend/src/modules/google/google-oauth.controller.ts
- [X] T017 [P] [US2] Criar dto/initiate-google-oauth.dto.ts em backend/src/modules/google/dto/initiate-google-oauth.dto.ts
- [X] T018 [US2] Implementar POST /google/oauth/initiate em backend/src/modules/google/google-oauth.controller.ts
- [X] T019 [US2] Implementar GET /google/oauth/callback em backend/src/modules/google/google-oauth.controller.ts
- [X] T020 [US2] Adicionar GoogleOAuthController ao GoogleModule em backend/src/modules/google/google.module.ts
- [X] T021 [P] [US2] Criar GoogleCallbackPage em frontend/src/features/connections/pages/GoogleCallbackPage.tsx
- [X] T022 [US2] Adicionar rota /callback/google em frontend/src/app/router.tsx
- [X] T023 [US2] Habilitar botao "Conectar Google" em frontend/src/features/connections/pages/ConnectionsPage.tsx
- [X] T024 [US2] Adicionar Google Ads account selection (similar a Meta pages) em GoogleCallbackPage.tsx

**Checkpoint**: User Story 2 funcional - Usuario pode conectar Google

---

## Phase 5: User Story 3 - Gerenciar Conexoes (Priority: P1) ✅ COMPLETO

**Goal**: Usuario pode visualizar, desconectar, e reconectar suas conexoes

**Independent Test**: Ver lista de conexoes, desconectar uma, reconectar

### Status Atual
- [X] UI de listagem de conexoes
- [X] Modal de criacao de conexao
- [X] Logs de conexao
- [X] Visualizacao de detalhes com historico

### Implementation for User Story 3

- [X] T025 [US3] Criar endpoint GET /api/connections/:id/logs em backend/src/modules/connections/connections.controller.ts
- [X] T026 [US3] Implementar service method getConnectionLogs em backend/src/modules/connections/connections.service.ts
- [X] T027 [P] [US3] Criar ConnectionLogsModal em frontend/src/features/connections/components/ConnectionLogsModal.tsx
- [X] T028 [US3] Adicionar botao "Ver Historico" no ConnectionCard
- [X] T029 [US3] Implementar DELETE /api/connections/:id com revogacao de tokens

**Checkpoint**: User Story 3 completa - Gerenciamento full de conexoes

---

## Phase 6: User Story 4 - Status e Notificacoes (Priority: P2) ✅ COMPLETO

**Goal**: Usuario e notificado quando uma conexao expira ou precisa de atencao

**Independent Test**: Simular expiracao de token, ver notificacao na UI

### Implementation for User Story 4

- [X] T030 [US4] Criar cron job para verificar tokens expirando em backend/src/modules/connections/connections.cron.ts
- [X] T031 [US4] Criar tabela notifications no Supabase (migration criada)
- [X] T032 [P] [US4] Criar NotificationService em backend/src/modules/connections/notifications.service.ts
- [X] T033 [US4] Implementar endpoint GET /api/notifications em backend/src/modules/connections/notifications.controller.ts
- [X] T034 [P] [US4] Criar NotificationBell component em frontend/src/shared/components/NotificationBell/
- [X] T035 [US4] Integrar NotificationBell no Header

**Checkpoint**: User Story 4 completa - Notificacoes funcionando

---

## Phase 7: Polish & Cross-Cutting Concerns

**Purpose**: Melhorias que afetam todas as user stories

- [ ] T036 [P] Atualizar checklist de requirements em specs/010-conexoes/checklists/requirements.md
- [ ] T037 [P] Documentar setup de Google App no quickstart.md
- [ ] T038 Testar fluxo completo Meta end-to-end
- [ ] T039 Testar fluxo completo Google end-to-end
- [ ] T040 Verificar que tokens NAO aparecem em responses da API
- [ ] T041 Verificar RLS policies bloqueiam acesso entre usuarios
- [ ] T042 Atualizar spec.md com status final

---

## Dependencies & Execution Order

### Phase Dependencies

- **Phase 1 (Setup)**: ✅ COMPLETO
- **Phase 2 (Foundational)**: ✅ COMPLETO
- **Phase 3 (US1 Meta)**: ✅ COMPLETO
- **Phase 4 (US2 Google)**: ✅ COMPLETO
- **Phase 5 (US3 Gerenciar)**: ✅ COMPLETO
- **Phase 6 (US4 Notificacoes)**: ✅ COMPLETO
- **Phase 7 (Polish)**: Pendente - testes e documentacao

### User Story Independence

- **US1 (Meta)**: ✅ Completa e independente
- **US2 (Google)**: ✅ Completa - Independente de US1, compartilha infraestrutura
- **US3 (Gerenciar)**: ✅ Completa - Logs e gerenciamento implementados
- **US4 (Notificacoes)**: ✅ Completa - Cron job e NotificationBell implementados

---

## Arquivos Criados/Modificados

### Backend
- `backend/src/modules/connections/connections.module.ts` - Modulo de conexoes
- `backend/src/modules/connections/connections.service.ts` - Service de conexoes com logs
- `backend/src/modules/connections/connections.controller.ts` - Controller de conexoes
- `backend/src/modules/connections/notifications.service.ts` - Service de notificacoes
- `backend/src/modules/connections/notifications.controller.ts` - Controller de notificacoes
- `backend/src/modules/connections/connections.cron.ts` - Cron jobs para tokens
- `backend/src/app.module.ts` - Adicionado ConnectionsModule e ScheduleModule

### Frontend
- `frontend/src/features/connections/components/ConnectionLogsModal.tsx` - Modal de logs
- `frontend/src/features/connections/components/ConnectionLogsModal.module.css` - Estilos
- `frontend/src/features/connections/pages/ConnectionsPage.tsx` - Botao Ver Historico
- `frontend/src/shared/components/NotificationBell/NotificationBell.tsx` - Componente sino
- `frontend/src/shared/components/NotificationBell/NotificationBell.module.css` - Estilos
- `frontend/src/shared/layouts/MainLayout/Header.tsx` - NotificationBell integrado

### Database (Migrations)
- `supabase/migrations/20241215_connection_logs.sql` - Tabela connection_logs
- `supabase/migrations/20241215_notifications.sql` - Tabela notifications

---

## Notes

- US1-US4 100% implementadas
- Cron jobs configurados para verificar tokens a cada hora
- NotificationBell integrado no Header com dropdown funcional
- Tokens sao revogados no delete (Meta e Google)
- Migrations SQL criadas para connection_logs e notifications
- @nestjs/schedule adicionado ao package.json
