# Tasks: Melhoria do Sistema de Ferramentas do Assistente IA

**Input**: Design documents from `/specs/004-agent-tools-enhancement/`
**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/

**Tests**: Não solicitados explicitamente - omitidos.

**Organization**: Tasks organizadas por user story para permitir implementação e testes independentes.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Pode rodar em paralelo (arquivos diferentes, sem dependências)
- **[Story]**: User story associada (US1, US2, US3, US4, US5, US6)
- Paths seguem estrutura web app: `backend/`, `frontend/`

---

## Phase 1: Setup (Infrastructure)

**Purpose**: Preparação do banco de dados e estrutura base

- [x] T001 Criar migration SQL em backend/migrations/011_add_user_preferences.sql
- [x] T002 Executar migration para criar tabela user_preferences no banco

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Modelo e CRUD de preferências que TODAS as user stories dependem

**⚠️ CRITICAL**: Nenhuma user story pode começar sem esta fase completa

- [x] T003 [P] Adicionar model UserPreferences em backend/models.py
- [x] T004 [P] Adicionar schemas UserPreferencesRead e UserPreferencesUpdate em backend/schemas.py
- [x] T005 Adicionar funções CRUD para user_preferences em backend/crud.py
- [x] T006 Criar router de preferências em backend/routers/preferences.py (GET /preferences, PUT /preferences)
- [x] T007 Registrar router preferences no main.py do backend
- [x] T008 [P] Criar API client de preferências em frontend/src/lib/api/preferences.ts
- [x] T009 [P] Criar hook useUserPreferences em frontend/src/hooks/useUserPreferences.ts

**Checkpoint**: Infraestrutura de preferências pronta - user stories podem começar

---

## Phase 3: User Story 1 - Modo Autônomo (Priority: P1) 🎯 MVP

**Goal**: Toggle "Modo Autônomo" que executa todas as ferramentas automaticamente sem aprovação

**Independent Test**: Ativar toggle, pedir ao assistente para criar pasta + documento → deve executar sem pedir aprovação

### Implementation for User Story 1

- [x] T010 [US1] Adicionar campo autonomous_mode ao ChatCompletionRequest em backend/routers/chat.py
- [x] T011 [US1] Modificar chat.py para verificar autonomous_mode e pular approval flow em backend/routers/chat.py
- [x] T012 [US1] Modificar toggle em ChatSidebar.tsx para usar "Modo Autônomo" e chamar API preferences em frontend/src/components/ChatSidebar.tsx
- [x] T013 [US1] Passar autonomous_mode no request de chat baseado nas preferências do usuário em frontend/src/components/ChatSidebar.tsx
- [x] T014 [US1] Implementar lógica de desativar toggle no meio da execução (termina atual, pede aprovação próximas) em backend/routers/chat.py

**Checkpoint**: Modo Autônomo funcional - pode ser testado independentemente

---

## Phase 4: User Story 2 - Lista de Tarefas Visual (Priority: P1)

**Goal**: Exibir lista de tarefas planejadas no chat com progresso em tempo real

**Independent Test**: Pedir tarefa complexa ("crie pasta Ideias com 3 docs") → lista deve aparecer com checkmarks animados

### Implementation for User Story 2

- [x] T015 [P] [US2] Criar componente TaskListCard em frontend/src/components/TaskListCard.tsx
- [x] T016 [US2] Adicionar eventos SSE task_list e task_update no backend em backend/routers/chat.py
- [x] T017 [US2] Implementar parsing de eventos task_list e task_update no frontend em frontend/src/components/ChatSidebar.tsx
- [x] T018 [US2] Integrar TaskListCard no fluxo de mensagens do ChatSidebar em frontend/src/components/ChatSidebar.tsx
- [x] T019 [US2] Adicionar animações Framer Motion para transições de status em frontend/src/components/TaskListCard.tsx

**Checkpoint**: Lista de tarefas visual funcional - pode ser testada independentemente

---

## Phase 5: User Story 3 - Aumento do Limite de Iterações (Priority: P2)

**Goal**: Aumentar limite de 5 para 15 iterações, configurável por usuário

**Independent Test**: Pedir tarefa que requer 10 ações → deve completar sem atingir limite

### Implementation for User Story 3

- [x] T020 [US3] Modificar max_iterations de 5 para 15 em backend/routers/chat.py
- [x] T021 [US3] Ler max_iterations das preferências do usuário no início do chat em backend/routers/chat.py
- [x] T022 [US3] Implementar detecção de loop infinito (3x mesma tool+args) em backend/routers/chat.py
- [x] T023 [US3] Adicionar mensagem ao atingir limite com opção de continuar em backend/routers/chat.py
- [x] T024 [US3] Exibir contador de iterações no frontend durante execução em frontend/src/components/ChatSidebar.tsx

**Checkpoint**: Limite de iterações expandido e configurável - pode ser testado independentemente

---

## Phase 6: User Story 4 - Ferramenta Renomear (Priority: P2)

**Goal**: Adicionar ferramentas rename_document, rename_folder, get_folder_contents

**Independent Test**: Pedir "renomeie documento X para Y" → documento deve aparecer com novo nome

### Implementation for User Story 4

- [x] T025 [P] [US4] Implementar rename_document_tool em backend/tools.py
- [x] T026 [P] [US4] Implementar rename_folder_tool em backend/tools.py
- [x] T027 [P] [US4] Implementar get_folder_contents_tool em backend/tools.py
- [x] T028 [US4] Adicionar definições das 3 tools ao TOOL_DEFINITIONS em backend/tools.py
- [x] T029 [US4] Adicionar cases no execute_tool dispatcher em backend/tools.py
- [x] T030 [US4] Adicionar ícones para novas tools em ToolExecutionCard em frontend/src/components/ToolExecutionCard.tsx

**Checkpoint**: Novas ferramentas de organização funcionais - pode ser testado independentemente

---

## Phase 7: User Story 5 - Imagem Vinculada (Priority: P2)

**Goal**: Geração de imagem com opção de anexar automaticamente ao documento

**Independent Test**: Pedir "crie imagem de gato e anexe ao documento atual" → imagem deve aparecer vinculada

### Implementation for User Story 5

- [x] T031 [US5] Adicionar parâmetro attach_to_document_id à ferramenta generate_image em backend/tools.py
- [x] T032 [US5] Implementar lógica de anexar imagem ao documento após geração em backend/tools.py
- [x] T033 [US5] Atualizar definição da tool no TOOL_DEFINITIONS com novo parâmetro em backend/tools.py
- [x] T034 [US5] Notificar frontend sobre anexo via evento SSE em backend/routers/chat.py

**Checkpoint**: Geração de imagem com anexo automático funcional - pode ser testado independentemente

---

## Phase 8: User Story 6 - Visualização de Execução (Priority: P3)

**Goal**: Cards de execução com timeout, progresso e cancelamento

**Independent Test**: Executar ferramenta demorada → deve mostrar timer e botão cancelar

### Implementation for User Story 6

- [x] T035 [US6] Implementar timeouts configuráveis por tool (60s padrão, 120s imagem) em backend/routers/chat.py
- [x] T036 [US6] Adicionar evento tool_timeout ao SSE em backend/routers/chat.py
- [x] T037 [US6] Implementar retry automático (1x com backoff 2s) em backend/routers/chat.py
- [x] T038 [US6] Adicionar evento tool_retry ao SSE em backend/routers/chat.py
- [x] T039 [US6] Criar endpoint POST /chat/tool-cancel em backend/routers/chat.py
- [x] T040 [US6] Adicionar indicador de progresso/timer ao ToolExecutionCard em frontend/src/components/ToolExecutionCard.tsx
- [x] T041 [US6] Adicionar botão cancelar ao ToolExecutionCard em frontend/src/components/ToolExecutionCard.tsx
- [x] T042 [US6] Implementar chamada ao endpoint tool-cancel no frontend em frontend/src/components/ToolExecutionCard.tsx

**Checkpoint**: Visualização completa com timeout e cancelamento - pode ser testado independentemente

---

## Phase 9: Polish & Cross-Cutting Concerns

**Purpose**: Melhorias finais que afetam múltiplas user stories

- [x] T043 [P] Adicionar tratamento de erro para documento deletado durante execução em backend/routers/chat.py
- [x] T044 [P] Adicionar loading state ao toggle de Modo Autônomo em frontend/src/components/ChatSidebar.tsx
- [x] T045 [P] Validar quickstart.md com fluxo end-to-end
- [x] T046 Code cleanup e remoção de código legado do toggle antigo

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: Sem dependências - pode começar imediatamente
- **Foundational (Phase 2)**: Depende de Setup - BLOQUEIA todas as user stories
- **User Stories (Phases 3-8)**: Todas dependem de Foundational
  - US1 e US2 são P1 - prioridade máxima
  - US3, US4, US5 são P2 - podem rodar em paralelo após US1/US2
  - US6 é P3 - última prioridade
- **Polish (Phase 9)**: Depende de todas as user stories desejadas

### User Story Dependencies

- **US1 (Modo Autônomo)**: Independente - usa infraestrutura de preferências
- **US2 (Lista de Tarefas)**: Independente - adiciona novos eventos SSE
- **US3 (Limite Iterações)**: Independente - modifica loop de chat
- **US4 (Renomear)**: Independente - adiciona novas tools
- **US5 (Imagem Vinculada)**: Independente - estende tool existente
- **US6 (Visualização)**: Independente - melhora UI de execução

### Parallel Opportunities

**Phase 2 (Foundational)**:
```
T003 (model) || T004 (schemas) → T005 (crud)
T008 (api client) || T009 (hook) → dependem de T006
```

**Phase 6 (Renomear)**:
```
T025 || T026 || T027 → todas tools em paralelo
```

---

## Parallel Example: User Story 4

```bash
# Todas as tools podem ser implementadas em paralelo:
Task: "Implementar rename_document_tool em backend/tools.py"
Task: "Implementar rename_folder_tool em backend/tools.py"
Task: "Implementar get_folder_contents_tool em backend/tools.py"
```

---

## Implementation Strategy

### MVP First (US1 + US2 Only)

1. Complete Phase 1: Setup (migration)
2. Complete Phase 2: Foundational (preferências)
3. Complete Phase 3: US1 - Modo Autônomo
4. Complete Phase 4: US2 - Lista de Tarefas
5. **STOP and VALIDATE**: Testar MVP com modo autônomo + lista visual
6. Deploy/demo se pronto

### Incremental Delivery

1. Setup + Foundational → Base pronta
2. US1 (Modo Autônomo) → Testar → Deploy (MVP básico!)
3. US2 (Lista de Tarefas) → Testar → Deploy (MVP completo!)
4. US3 (Limite Iterações) → Testar → Deploy
5. US4 (Renomear) → Testar → Deploy
6. US5 (Imagem Vinculada) → Testar → Deploy
7. US6 (Visualização) → Testar → Deploy
8. Polish → Deploy final

---

## Summary

| Phase | User Story | Tasks | Parallel Tasks |
|-------|------------|-------|----------------|
| 1 | Setup | 2 | 0 |
| 2 | Foundational | 7 | 4 |
| 3 | US1 - Modo Autônomo | 5 | 0 |
| 4 | US2 - Lista de Tarefas | 5 | 1 |
| 5 | US3 - Limite Iterações | 5 | 0 |
| 6 | US4 - Renomear | 6 | 3 |
| 7 | US5 - Imagem Vinculada | 4 | 0 |
| 8 | US6 - Visualização | 8 | 0 |
| 9 | Polish | 4 | 3 |
| **Total** | | **46** | **11** |

---

## Notes

- [P] tasks = arquivos diferentes, sem dependências
- [Story] label mapeia task para user story específica
- Cada user story é independentemente completável e testável
- Commit após cada task ou grupo lógico
- Pare em qualquer checkpoint para validar story independentemente
