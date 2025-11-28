# Tasks: Workflow Visual Redesign

**Input**: Design documents from `/specs/005-workflow-visual-redesign/`
**Prerequisites**: plan.md (required), spec.md (required), research.md, data-model.md, contracts/

**Tests**: Not explicitly requested - test tasks omitted.

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- Include exact file paths in descriptions

## Path Conventions

- **Web app**: `backend/` and `frontend/src/`

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Project initialization and shared utilities

- [X] T001 Create workflow types file with NODE_TYPE_CONFIGS in frontend/src/lib/workflow-types.ts
- [X] T002 [P] Extract floatingGlassClasses constant to frontend/src/lib/glass-utils.ts for reuse

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core infrastructure that MUST be complete before ANY user story can be implemented

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

- [X] T003 Add project_id query parameter support to list_templates endpoint in backend/routers/workflows.py
- [X] T004 [P] Add is_system filter parameter to list_templates endpoint in backend/routers/workflows.py
- [X] T005 [P] Create useValidateConnection hook in frontend/src/hooks/useValidateConnection.ts
- [X] T006 Create WorkflowHeader component skeleton in frontend/src/components/workflow/WorkflowHeader.tsx

**Checkpoint**: Foundation ready - user story implementation can now begin in parallel

---

## Phase 3: User Story 1 - Navegação para Workflows de um Projeto (Priority: P1) 🎯 MVP

**Goal**: Usuário acessa workflows diretamente dentro de um projeto, vê lista de workflows, pode criar/executar/duplicar

**Independent Test**: Navegar para um projeto, clicar na aba Workflows, verificar lista de workflows do projeto

### Implementation for User Story 1

- [X] T007 [US1] Create workflows folder structure in frontend/src/app/workspace/[id]/project/[projectId]/workflows/
- [X] T008 [US1] Create project workflows list page in frontend/src/app/workspace/[id]/project/[projectId]/workflows/page.tsx
- [X] T009 [P] [US1] Create WorkflowCard component for project workflows in frontend/src/components/workflow/WorkflowCard.tsx
- [X] T010 [P] [US1] Create WorkflowList component in frontend/src/components/workflow/WorkflowList.tsx
- [X] T011 [US1] Add "Workflows" tab to project page tabs in frontend/src/app/workspace/[id]/project/[projectId]/page.tsx
- [X] T012 [US1] Create new workflow page with template selection in frontend/src/app/workspace/[id]/project/[projectId]/workflows/new/page.tsx
- [X] T013 [US1] Create workflow editor page in frontend/src/app/workspace/[id]/project/[projectId]/workflows/[workflowId]/page.tsx
- [X] T014 [US1] Implement duplicate template to project functionality in frontend/src/lib/api/workflows.ts

**Checkpoint**: User Story 1 complete - workflows accessible from project context

---

## Phase 4: User Story 2 - Visual Liquid Glass Consistente (Priority: P1)

**Goal**: Editor de workflows com sidebars flutuantes glass, mesma linguagem visual da tela de projetos

**Independent Test**: Comparar visualmente o editor de workflows com a tela de projetos

### Implementation for User Story 2

- [X] T015 [US2] Apply floating glass effect to NodePalette in frontend/src/components/workflow/NodePalette.tsx
- [X] T016 [P] [US2] Apply floating glass effect to NodeConfigPanel in frontend/src/components/workflow/NodeConfigPanel.tsx
- [X] T017 [P] [US2] Apply floating glass effect to NodePropertiesPanel in frontend/src/components/workflow/NodePropertiesPanel.tsx
- [X] T018 [US2] Update WorkflowCanvas layout for floating sidebars with margin in frontend/src/components/workflow/WorkflowCanvas.tsx
- [X] T019 [P] [US2] Apply glass styling to ModelSelector dropdown in frontend/src/components/workflow/ModelSelector.tsx
- [X] T020 [US2] Ensure all workflow modals use glass effect consistent with project page modals

**Checkpoint**: User Story 2 complete - visual consistency with project page achieved

---

## Phase 5: User Story 3 - Nós com Conexões Horizontais (Priority: P1)

**Goal**: Todos os nós têm entrada à esquerda e saída à direita, fluxo visual da esquerda para direita

**Independent Test**: Adicionar nós ao canvas e verificar handles na posição horizontal

### Implementation for User Story 3

- [X] T021 [US3] Update BaseNode component handle positions to Left/Right in frontend/src/components/workflow/nodes/BaseNode.tsx
- [X] T022 [P] [US3] Update StartNode handle position to Right only in frontend/src/components/workflow/nodes/StartNode.tsx
- [X] T023 [P] [US3] Update FinishNode handle position to Left only in frontend/src/components/workflow/nodes/FinishNode.tsx
- [X] T024 [P] [US3] Update TextGenerationNode handles in frontend/src/components/workflow/nodes/TextGenerationNode.tsx
- [X] T025 [P] [US3] Update ImageGenerationNode handles in frontend/src/components/workflow/nodes/ImageGenerationNode.tsx
- [X] T026 [P] [US3] Update ConditionalNode handles in frontend/src/components/workflow/nodes/ConditionalNode.tsx
- [X] T027 [P] [US3] Update LoopNode handles in frontend/src/components/workflow/nodes/LoopNode.tsx
- [X] T028 [P] [US3] Update ContextRetrievalNode handles in frontend/src/components/workflow/nodes/ContextRetrievalNode.tsx
- [X] T029 [P] [US3] Update ProcessingNode handles in frontend/src/components/workflow/nodes/ProcessingNode.tsx
- [X] T030 [P] [US3] Update AttachNode handles in frontend/src/components/workflow/nodes/AttachNode.tsx
- [X] T031 [US3] Implement connection validation with visual feedback in WorkflowCanvas.tsx using useValidateConnection hook
- [X] T032 [US3] Add invalid connection styling (red handle, tooltip) in frontend/src/components/workflow/WorkflowCanvas.tsx

**Checkpoint**: User Story 3 complete - horizontal flow with type validation

---

## Phase 6: User Story 4 - Separação Clara de Templates vs Meus Workflows (Priority: P2)

**Goal**: Interface distingue claramente templates do sistema de workflows do usuário com seções separadas

**Independent Test**: Acessar galeria de workflows e verificar seções "Templates" e "Meus Workflows"

### Implementation for User Story 4

- [ ] T033 [US4] Refactor workflows gallery page with tabs in frontend/src/app/workspace/[id]/workflows/page.tsx
- [ ] T034 [P] [US4] Create TemplateBadge component in frontend/src/components/workflow/TemplateBadge.tsx
- [ ] T035 [US4] Add template badge to WorkflowCard component in frontend/src/components/workflow/WorkflowCard.tsx
- [ ] T036 [US4] Implement differentiated actions for templates vs user workflows in WorkflowCard.tsx
- [ ] T037 [US4] Add "Duplicar para Projeto" action for templates in frontend/src/components/workflow/WorkflowCard.tsx
- [ ] T038 [US4] Implement unique naming on duplicate (add suffix) in backend/routers/workflows.py

**Checkpoint**: User Story 4 complete - clear separation between templates and user workflows

---

## Phase 7: User Story 5 - Navegação com Botão de Sair/Voltar (Priority: P2)

**Goal**: Todas as telas de workflow têm navegação clara para voltar, breadcrumbs visíveis

**Independent Test**: Entrar no editor de workflow e verificar botão voltar e breadcrumb

### Implementation for User Story 5

- [ ] T039 [US5] Complete WorkflowHeader component with breadcrumb in frontend/src/components/workflow/WorkflowHeader.tsx
- [ ] T040 [US5] Integrate WorkflowHeader into workflow editor page in frontend/src/app/workspace/[id]/project/[projectId]/workflows/[workflowId]/page.tsx
- [ ] T041 [P] [US5] Add back navigation to workflows gallery in frontend/src/app/workspace/[id]/workflows/page.tsx
- [ ] T042 [P] [US5] Add back navigation to project workflows list in frontend/src/app/workspace/[id]/project/[projectId]/workflows/page.tsx
- [ ] T043 [US5] Add navigation header to execution view page

**Checkpoint**: User Story 5 complete - clear navigation on all workflow screens

---

## Phase 8: User Story 6 - Nós Alinhados com Ferramentas do Assistente de IA (Priority: P2)

**Goal**: Nós do workflow usam mesmos serviços que o assistente de IA, permitindo fluxos completos

**Independent Test**: Criar e executar workflow com múltiplos nós verificando integração com serviços

### Implementation for User Story 6

- [ ] T044 [US6] Verify text_generation node uses llm_service in backend/services/node_executor.py
- [ ] T045 [P] [US6] Verify image_generation node uses image_generation_service in backend/services/node_executor.py
- [ ] T046 [P] [US6] Verify context_retrieval node uses same search as assistant in backend/services/node_executor.py
- [ ] T047 [US6] Implement attach_creative node integration with edit_document_tool in backend/services/node_executor.py
- [ ] T048 [US6] Add move_kanban_item node capability or integrate with processing node in backend/services/node_executor.py
- [ ] T049 [US6] Test complete workflow: context→text→image→attach→kanban execution

**Checkpoint**: User Story 6 complete - full integration with assistant tools

---

## Phase 9: Polish & Cross-Cutting Concerns

**Purpose**: Improvements that affect multiple user stories

- [ ] T050 [P] Implement execution pause/resume on node failure in backend/services/workflow_executor.py
- [ ] T051 [P] Implement prevent deletion of running workflow in backend/routers/workflows.py
- [ ] T052 [P] Add empty result notification for context_retrieval in backend/services/node_executor.py
- [ ] T053 Performance optimization: memoize node components with useMemo/useCallback
- [ ] T054 Verify all glass effects work in both light and dark mode
- [ ] T055 Run quickstart.md validation checklist

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies - can start immediately
- **Foundational (Phase 2)**: Depends on Setup completion - BLOCKS all user stories
- **User Stories (Phase 3-8)**: All depend on Foundational phase completion
  - US1, US2, US3 are all P1 priority - can run in parallel
  - US4, US5, US6 are P2 priority - can run in parallel after foundational
- **Polish (Phase 9)**: Depends on all user stories being complete

### User Story Dependencies

- **User Story 1 (P1)**: Can start after Foundational - Creates route structure others may use
- **User Story 2 (P1)**: Can start after Foundational - Independent visual changes
- **User Story 3 (P1)**: Can start after Foundational - Independent node changes
- **User Story 4 (P2)**: Can start after Foundational - May use components from US1
- **User Story 5 (P2)**: Can start after Foundational - Uses WorkflowHeader from T006
- **User Story 6 (P2)**: Can start after Foundational - Backend-focused, mostly verification

### Within Each User Story

- Frontend routes before components that use them
- Components before page integrations
- Base styling before refinements
- Core functionality before edge cases

### Parallel Opportunities

- All Setup tasks marked [P] can run in parallel
- All Foundational tasks marked [P] can run in parallel (within Phase 2)
- **US2**: T016, T017, T019 can run in parallel (different components)
- **US3**: T022-T030 can run in parallel (different node files)
- **US4**: T034 can run in parallel with T033
- **US5**: T041, T042 can run in parallel (different pages)
- **US6**: T045, T046 can run in parallel (different node types)
- **Polish**: T050, T051, T052 can run in parallel

---

## Parallel Example: User Story 3 (Maximum Parallelism)

```bash
# After T021 (BaseNode) completes, launch ALL node updates in parallel:
Task: "Update StartNode handle position in frontend/src/components/workflow/nodes/StartNode.tsx"
Task: "Update FinishNode handle position in frontend/src/components/workflow/nodes/FinishNode.tsx"
Task: "Update TextGenerationNode handles in frontend/src/components/workflow/nodes/TextGenerationNode.tsx"
Task: "Update ImageGenerationNode handles in frontend/src/components/workflow/nodes/ImageGenerationNode.tsx"
Task: "Update ConditionalNode handles in frontend/src/components/workflow/nodes/ConditionalNode.tsx"
Task: "Update LoopNode handles in frontend/src/components/workflow/nodes/LoopNode.tsx"
Task: "Update ContextRetrievalNode handles in frontend/src/components/workflow/nodes/ContextRetrievalNode.tsx"
Task: "Update ProcessingNode handles in frontend/src/components/workflow/nodes/ProcessingNode.tsx"
Task: "Update AttachNode handles in frontend/src/components/workflow/nodes/AttachNode.tsx"
```

---

## Implementation Strategy

### MVP First (User Stories 1, 2, 3)

1. Complete Phase 1: Setup
2. Complete Phase 2: Foundational (CRITICAL - blocks all stories)
3. Complete Phase 3: User Story 1 (project workflows access)
4. Complete Phase 4: User Story 2 (glass visual consistency)
5. Complete Phase 5: User Story 3 (horizontal node handles)
6. **STOP and VALIDATE**: Core experience is complete and usable
7. Deploy/demo MVP

### Incremental Delivery

1. **MVP**: Setup + Foundational + US1 + US2 + US3 → Core workflow redesign
2. **Enhancement 1**: US4 → Template/workflow separation
3. **Enhancement 2**: US5 → Navigation improvements
4. **Enhancement 3**: US6 → Full tool integration
5. **Final Polish**: Phase 9 → Edge cases and optimization

### Parallel Team Strategy

With multiple developers:

1. Team completes Setup + Foundational together
2. Once Foundational is done:
   - Developer A: User Story 1 (routes and pages)
   - Developer B: User Story 2 (glass styling) + User Story 3 (node handles)
   - Developer C: User Story 4 (template separation)
3. Then:
   - Developer A: User Story 5 (navigation)
   - Developer B: User Story 6 (tool integration)
   - Developer C: Polish tasks

---

## Summary

| Phase | Tasks | Parallel Opportunities |
|-------|-------|----------------------|
| Setup | 2 | 1 |
| Foundational | 4 | 2 |
| US1 - Project Workflows | 8 | 2 |
| US2 - Liquid Glass | 6 | 3 |
| US3 - Horizontal Nodes | 12 | 9 |
| US4 - Template Separation | 6 | 1 |
| US5 - Navigation | 5 | 2 |
| US6 - Tool Integration | 6 | 2 |
| Polish | 6 | 3 |
| **Total** | **55** | **25** |

---

## Notes

- [P] tasks = different files, no dependencies
- [Story] label maps task to specific user story for traceability
- Each user story should be independently completable and testable
- Commit after each task or logical group
- Stop at any checkpoint to validate story independently
- MVP = US1 + US2 + US3 (P1 stories) provides core value
