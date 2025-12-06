# Tasks: Sistema de Internacionalização (i18n)

**Input**: Design documents from `/specs/022-i18n/`
**Prerequisites**: plan.md, spec.md, research.md, data-model.md, quickstart.md

**Tests**: Não solicitados explicitamente. Testes opcionais podem ser adicionados na fase de Polish.

**Organization**: Tasks organizadas por user story para permitir implementação e teste independente de cada história.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Pode executar em paralelo (arquivos diferentes, sem dependências)
- **[Story]**: Qual user story esta task pertence (e.g., US1, US2, US3, US4)
- Inclui caminhos exatos de arquivo nas descrições

## Path Conventions

- **Web app**: `frontend/src/` (feature frontend-only)
- Caminhos assumem estrutura Next.js 16 com App Router

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Instalação de dependências e criação da estrutura base de i18n

- [x] T001 Instalar next-intl via `npm install next-intl` em frontend/
- [x] T002 [P] Criar estrutura de diretórios i18n em frontend/src/i18n/
- [x] T003 [P] Criar estrutura de diretórios messages em frontend/src/messages/
- [x] T004 Criar arquivo de configuração i18n em frontend/src/i18n/config.ts
- [x] T005 Criar arquivo de request config em frontend/src/i18n/request.ts
- [x] T006 Atualizar next.config.ts com plugin next-intl em frontend/next.config.ts

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Infraestrutura core que DEVE estar completa antes de qualquer user story

**⚠️ CRITICAL**: Nenhum trabalho de user story pode começar até esta fase estar completa

- [x] T007 Criar arquivo de traduções base pt-BR.json em frontend/src/messages/pt-BR.json
- [x] T008 [P] Criar arquivo de traduções base en.json em frontend/src/messages/en.json
- [x] T009 Criar LocaleContext e LocaleProvider em frontend/src/contexts/LocaleContext.tsx
- [x] T010 Criar hook useLocale em frontend/src/hooks/use-locale.ts
- [x] T011 Criar utilitário de localStorage para locale em frontend/src/i18n/storage.ts
- [x] T012 Integrar NextIntlClientProvider no layout root em frontend/src/app/layout.tsx
- [x] T013 Criar tipos TypeScript para Messages em frontend/src/types/i18n.ts

**Checkpoint**: Infraestrutura i18n pronta - implementação de user stories pode começar

---

## Phase 3: User Story 1 - Seleção de Idioma (Priority: P1) 🎯 MVP

**Goal**: Usuário pode selecionar e persistir preferência de idioma (PT/EN)

**Independent Test**: Verificar se seletor aparece no perfil, mudança atualiza interface, preferência persiste após reload

### Implementation for User Story 1

- [x] T014 [US1] Criar componente LocaleSwitcher em frontend/src/components/LocaleSwitcher.tsx
- [x] T015 [US1] Adicionar traduções do namespace 'profile' em frontend/src/messages/pt-BR.json
- [x] T016 [P] [US1] Adicionar traduções do namespace 'profile' em frontend/src/messages/en.json
- [x] T017 [US1] Integrar LocaleSwitcher na página de perfil em frontend/src/app/workspace/[id]/profile/page.tsx
- [x] T018 [US1] Implementar detecção de idioma do navegador em frontend/src/i18n/config.ts
- [x] T019 [US1] Atualizar html lang attribute dinamicamente em frontend/src/app/layout.tsx

**Checkpoint**: User Story 1 funcional - usuário pode selecionar idioma e preferência persiste

---

## Phase 4: User Story 2 - Textos da Interface Traduzidos (Priority: P1)

**Goal**: Todos os textos estáticos da interface aparecem no idioma selecionado

**Independent Test**: Navegar por diferentes seções e verificar que todos os textos estão no idioma correto

### Implementation for User Story 2

#### Traduções Core (common, auth, navigation)

- [x] T020 [US2] Adicionar traduções 'common' (save, cancel, delete, etc.) em frontend/src/messages/pt-BR.json
- [x] T021 [P] [US2] Adicionar traduções 'common' em frontend/src/messages/en.json
- [x] T022 [US2] Adicionar traduções 'auth' (login, logout, etc.) em frontend/src/messages/pt-BR.json
- [x] T023 [P] [US2] Adicionar traduções 'auth' em frontend/src/messages/en.json
- [x] T024 [US2] Adicionar traduções 'navigation' em frontend/src/messages/pt-BR.json
- [x] T025 [P] [US2] Adicionar traduções 'navigation' em frontend/src/messages/en.json

#### Migração de Páginas Auth

- [x] T026 [US2] Migrar página login para usar useTranslations em frontend/src/app/login/page.tsx
- [x] T027 [P] [US2] Migrar página register para usar useTranslations em frontend/src/app/register/page.tsx
- [x] T028 [P] [US2] Migrar página forgot-password para usar useTranslations em frontend/src/app/forgot-password/page.tsx
- [x] T029 [P] [US2] Migrar página reset-password para usar useTranslations em frontend/src/app/reset-password/page.tsx

#### Migração de Componentes Core

- [x] T030 [US2] Migrar WorkspaceSidebar para usar useTranslations em frontend/src/components/WorkspaceSidebar.tsx
- [x] T031 [P] [US2] Breadcrumbs não requer migração (labels são passados via props, i18n é aplicado nos componentes pais)
- [x] T032 [P] [US2] Migrar CommandPalette para usar useTranslations em frontend/src/components/CommandPalette.tsx

#### Traduções Workspace/Project

- [x] T033 [US2] Adicionar traduções 'workspace' em frontend/src/messages/pt-BR.json
- [x] T034 [P] [US2] Adicionar traduções 'workspace' em frontend/src/messages/en.json
- [x] T035 [US2] Adicionar traduções 'project' em frontend/src/messages/pt-BR.json
- [x] T036 [P] [US2] Adicionar traduções 'project' em frontend/src/messages/en.json

#### Migração de Páginas Workspace

- [x] T037 [US2] Migrar página workspace para usar useTranslations em frontend/src/app/workspace/[id]/page.tsx
- [x] T038 [P] [US2] Migrar página profile para usar useTranslations em frontend/src/app/workspace/[id]/profile/page.tsx
- [x] T039 [P] [US2] Adicionar traduções 'settings' para página de configurações (traduções adicionadas, migração pendente)

#### Traduções Document/Workflow

- [x] T040 [US2] Adicionar traduções 'document' em frontend/src/messages/pt-BR.json
- [x] T041 [P] [US2] Adicionar traduções 'document' em frontend/src/messages/en.json
- [x] T042 [US2] Adicionar traduções 'workflow' em frontend/src/messages/pt-BR.json
- [x] T043 [P] [US2] Adicionar traduções 'workflow' em frontend/src/messages/en.json

#### Migração de Componentes Workflow (Pendente)

- [ ] T044 [US2] Migrar WorkflowCanvas para usar useTranslations em frontend/src/components/workflow/WorkflowCanvas.tsx
- [ ] T045 [P] [US2] Migrar NodeConfigPanel para usar useTranslations em frontend/src/components/workflow/NodeConfigPanel.tsx
- [ ] T046 [P] [US2] Migrar ExecutionMonitor para usar useTranslations em frontend/src/components/workflow/ExecutionMonitor.tsx

**Checkpoint**: User Story 2 funcional - toda interface traduzida em PT/EN

---

## Phase 5: User Story 3 - Formatação de Datas e Números (Priority: P2)

**Goal**: Datas e números formatados de acordo com o idioma selecionado

**Independent Test**: Verificar campos de data e valores numéricos em cada idioma

### Implementation for User Story 3

- [ ] T047 [US3] Criar utilitário formatDate com suporte a locale em frontend/src/lib/format.ts
- [ ] T048 [P] [US3] Criar utilitário formatNumber com suporte a locale em frontend/src/lib/format.ts
- [ ] T049 [P] [US3] Criar utilitário formatCurrency com suporte a locale em frontend/src/lib/format.ts
- [ ] T050 [US3] Criar hook useFormatter para acesso fácil aos formatadores em frontend/src/hooks/use-formatter.ts
- [ ] T051 [US3] Migrar exibição de datas no ActivityLogPanel em frontend/src/components/ActivityLogPanel.tsx
- [ ] T052 [P] [US3] Migrar exibição de datas no WorkflowCard em frontend/src/components/workflow/WorkflowCard.tsx
- [ ] T053 [P] [US3] Migrar exibição de datas no ConversationsList em frontend/src/components/ConversationsList.tsx

**Checkpoint**: User Story 3 funcional - datas e números formatados corretamente

---

## Phase 6: User Story 4 - Mensagens de Validação e Feedback (Priority: P2)

**Goal**: Mensagens de validação e feedback no idioma correto

**Independent Test**: Submeter formulários com erros e verificar mensagens em cada idioma

### Implementation for User Story 4

- [ ] T054 [US4] Adicionar traduções 'validation' em frontend/src/messages/pt-BR.json
- [ ] T055 [P] [US4] Adicionar traduções 'validation' em frontend/src/messages/en.json
- [ ] T056 [US4] Adicionar traduções 'errors' em frontend/src/messages/pt-BR.json
- [ ] T057 [P] [US4] Adicionar traduções 'errors' em frontend/src/messages/en.json
- [ ] T058 [US4] Adicionar traduções 'success' em frontend/src/messages/pt-BR.json
- [ ] T059 [P] [US4] Adicionar traduções 'success' em frontend/src/messages/en.json
- [ ] T060 [US4] Criar hook useValidationMessages para mensagens traduzidas em frontend/src/hooks/use-validation-messages.ts
- [ ] T061 [US4] Migrar toast messages no useToast para usar traduções em frontend/src/components/ui/use-toast.ts
- [ ] T062 [US4] Migrar validação de formulários em ProjectSettingsForm em frontend/src/components/project/ProjectSettingsForm.tsx

**Checkpoint**: User Story 4 funcional - todas as mensagens traduzidas

---

## Phase 7: Polish & Cross-Cutting Concerns

**Purpose**: Melhorias que afetam múltiplas user stories

- [ ] T063 [P] Criar script de validação de traduções em frontend/scripts/validate-translations.ts
- [ ] T064 [P] Adicionar traduções para empty states em frontend/src/components/empty-states/
- [ ] T065 [P] Adicionar traduções para componentes de loading em frontend/src/components/loading/
- [ ] T066 Revisar e corrigir textos hardcoded restantes em todo o frontend
- [ ] T067 Adicionar traduções para admin panel (se necessário) em frontend/src/app/admin/
- [ ] T068 Validar acessibilidade do seletor de idioma (aria-labels, etc.)
- [ ] T069 Testar mudança de idioma em todas as páginas principais
- [ ] T070 Documentar processo de adição de novas traduções em specs/022-i18n/

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: Sem dependências - pode começar imediatamente
- **Foundational (Phase 2)**: Depende de Setup - BLOQUEIA todas as user stories
- **User Stories (Phase 3-6)**: Todas dependem da fase Foundational
  - US1 e US2 são ambas P1, podem ser feitas em paralelo ou sequencialmente
  - US3 e US4 são P2, podem começar após US1/US2 ou em paralelo
- **Polish (Phase 7)**: Depende de todas as user stories desejadas estarem completas

### User Story Dependencies

- **User Story 1 (P1)**: Pode começar após Foundational - Sem dependências de outras stories
- **User Story 2 (P1)**: Pode começar após Foundational - Independente de US1
- **User Story 3 (P2)**: Pode começar após Foundational - Independente de US1/US2
- **User Story 4 (P2)**: Pode começar após Foundational - Independente de outras stories

### Within Each User Story

- Traduções PT-BR antes de EN (base first)
- Componentes UI dependem de traduções existirem
- Migração de páginas após componentes dependentes

### Parallel Opportunities

- Todas as tasks marcadas [P] podem executar em paralelo
- Traduções PT-BR e EN podem ser feitas em paralelo por arquivos diferentes
- Migração de páginas/componentes independentes podem ser paralelas
- Diferentes user stories podem ser trabalhadas em paralelo por diferentes desenvolvedores

---

## Parallel Example: User Story 2 - Traduções

```bash
# Lançar traduções PT-BR e EN em paralelo:
Task: "Adicionar traduções 'common' em frontend/src/messages/pt-BR.json"
Task: "Adicionar traduções 'common' em frontend/src/messages/en.json"

# Lançar migrações de páginas auth em paralelo:
Task: "Migrar página login para usar useTranslations"
Task: "Migrar página register para usar useTranslations"
Task: "Migrar página forgot-password para usar useTranslations"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup (T001-T006)
2. Complete Phase 2: Foundational (T007-T013)
3. Complete Phase 3: User Story 1 (T014-T019)
4. **STOP and VALIDATE**: Testar seleção de idioma funciona e persiste
5. Deploy/demo se pronto

### Incremental Delivery

1. Setup + Foundational → Infraestrutura i18n pronta
2. User Story 1 → Seletor de idioma funcional → Deploy (MVP!)
3. User Story 2 → Interface toda traduzida → Deploy
4. User Story 3 → Formatação de datas/números → Deploy
5. User Story 4 → Mensagens de validação → Deploy
6. Polish → Refinamentos finais → Deploy final

### Parallel Team Strategy

Com múltiplos desenvolvedores:

1. Equipe completa Setup + Foundational juntos
2. Uma vez Foundational completo:
   - Developer A: User Story 1 (seletor de idioma)
   - Developer B: User Story 2 (traduções da interface)
3. Após US1/US2:
   - Developer A: User Story 3 (formatação)
   - Developer B: User Story 4 (validação)
4. Stories completam e integram independentemente

---

## Summary

| Metric | Value |
|--------|-------|
| **Total Tasks** | 70 |
| **Setup Tasks** | 6 |
| **Foundational Tasks** | 7 |
| **User Story 1 Tasks** | 6 |
| **User Story 2 Tasks** | 27 |
| **User Story 3 Tasks** | 7 |
| **User Story 4 Tasks** | 9 |
| **Polish Tasks** | 8 |
| **Parallel Opportunities** | 35 tasks marcadas [P] |

### MVP Scope

**User Story 1** é o MVP mínimo - permite ao usuário selecionar idioma e persistir preferência.

### Notes

- [P] tasks = arquivos diferentes, sem dependências
- [Story] label mapeia task para user story específica
- Cada user story deve ser completável e testável independentemente
- Commit após cada task ou grupo lógico
- Pare em qualquer checkpoint para validar story independentemente
