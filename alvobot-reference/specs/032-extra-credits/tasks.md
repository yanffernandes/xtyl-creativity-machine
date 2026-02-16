# Tasks: Sistema de Créditos Extras

**Input**: Design documents from `/specs/031-extra-credits/`
**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/

**Organization**: Tasks are grouped by user story to enable independent implementation and testing.

## Format: `[ID] [P?] [Story?] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (US1, US2, US3, US4, US5)
- Paths follow web app convention: `backend/src/`, `frontend/src/`, `supabase/migrations/`

---

## Phase 1: Setup (Database Foundation)

**Purpose**: Database schema changes and core SQL functions

- [x] T001 Create migration file with new columns for credit_transactions in supabase/migrations/20260122_031_extra_credits.sql
- [x] T002 Add expires_at, remaining_amount, source_type, added_by_admin_id columns to credit_transactions table
- [x] T003 Add source_type CHECK constraint ('plan', 'extra') to credit_transactions
- [x] T004 [P] Create index idx_credit_tx_extra_active for active extra credits query optimization
- [x] T005 [P] Create index idx_credit_tx_fifo for FIFO ordering optimization
- [x] T006 Create view user_credits_summary_v2 with monthly + extra credits calculation
- [x] T007 Create view user_extra_credits_packages for listing user's credit packages
- [x] T008 Create function add_extra_credits for admin to add credits
- [x] T009 Create function consume_extra_credits_fifo for FIFO consumption logic
- [x] T010 Update RLS policies for credit_transactions to handle source_type='extra'

**Checkpoint**: Database ready - all views and functions available for querying

---

## Phase 2: Foundational (Shared Types & Queries)

**Purpose**: TypeScript types and base queries used by multiple user stories

- [x] T011 [P] Add ExtraCreditPackage interface to frontend/src/features/subscription/types/index.ts
- [x] T012 [P] Add UserCreditsSummary interface to frontend/src/features/subscription/types/index.ts
- [x] T013 [P] Add AddCreditsDto interface to frontend/src/features/admin/types/index.ts
- [x] T014 [P] Add CreditsDashboardMetrics interface to frontend/src/features/admin/types/index.ts
- [x] T015 Add useCreditsSummaryV2 query to frontend/src/features/subscription/api/useSubscription.ts
- [x] T016 Add useExtraCreditsPackages query to frontend/src/features/subscription/api/useSubscription.ts
- [x] T017 Add queryKeys for credits (credits.summary, credits.packages, credits.history) to frontend/src/shared/utils/queryKeys.ts

**Checkpoint**: Foundation ready - user story implementation can now begin in parallel

---

## Phase 3: User Story 1 - Admin Adiciona Créditos (Priority: P1) 🎯 MVP

**Goal**: Administrador pode adicionar créditos extras para qualquer usuário via modal

**Independent Test**: Acessar painel admin > selecionar usuário > adicionar créditos > verificar saldo aumentou

### Implementation for User Story 1

- [x] T018 [P] [US1] Create AddCreditsModal component folder structure in frontend/src/features/admin/components/AddCreditsModal/
- [x] T019 [P] [US1] Create AddCreditsModal.module.css with modal styles in frontend/src/features/admin/components/AddCreditsModal/
- [x] T020 [US1] Implement AddCreditsModal component with form (amount, description, expires_at) in frontend/src/features/admin/components/AddCreditsModal/index.tsx
- [x] T021 [US1] Add useAddCredits mutation (calls add_extra_credits RPC) to frontend/src/features/admin/api/mutations.ts
- [x] T022 [US1] Add useLogAdminAction for credits_add action to frontend/src/features/admin/api/mutations.ts
- [x] T023 [US1] Update AdminUsersPage to add "Adicionar Créditos" button per user row in frontend/src/features/admin/pages/AdminUsersPage.tsx
- [x] T024 [US1] Add modal state management (open/close, selected user) to AdminUsersPage in frontend/src/features/admin/pages/AdminUsersPage.tsx
- [x] T025 [US1] Integrate AddCreditsModal with AdminUsersPage (pass user, handle success) in frontend/src/features/admin/pages/AdminUsersPage.tsx
- [x] T026 [US1] Add success toast notification after adding credits in frontend/src/features/admin/pages/AdminUsersPage.tsx
- [x] T027 [US1] Export AddCreditsModal from admin components barrel in frontend/src/features/admin/components/index.ts

**Checkpoint**: Admin can add credits to any user. Story 1 is fully functional.

---

## Phase 4: User Story 2 - Usuário Visualiza Saldo (Priority: P1)

**Goal**: Usuário vê saldo de créditos extras separado dos mensais na página de assinatura

**Independent Test**: Login como usuário > acessar /subscription > ver seção de créditos extras com saldo e pacotes

### Implementation for User Story 2

- [x] T028 [P] [US2] Create ExtraCreditsSection component folder in frontend/src/features/subscription/components/ExtraCreditsSection/
- [x] T029 [P] [US2] Create ExtraCreditsSection.module.css with section styles in frontend/src/features/subscription/components/ExtraCreditsSection/
- [x] T030 [US2] Implement ExtraCreditsSection component showing total extra credits in frontend/src/features/subscription/components/ExtraCreditsSection/index.tsx
- [x] T031 [US2] Add CreditPackagesList subcomponent showing individual packages with expiry in frontend/src/features/subscription/components/ExtraCreditsSection/index.tsx
- [x] T032 [US2] Add expandable/collapsible behavior for packages list in frontend/src/features/subscription/components/ExtraCreditsSection/index.tsx
- [x] T033 [US2] Add useExtraCreditHistory query for user's transaction history to frontend/src/features/subscription/api/useSubscription.ts
- [x] T034 [US2] Update SubscriptionPage to include ExtraCreditsSection in "Visão Geral" tab in frontend/src/features/subscription/pages/SubscriptionPage.tsx
- [x] T035 [US2] Update credits display logic to use user_credits_summary_v2 view in frontend/src/features/subscription/pages/SubscriptionPage.tsx
- [x] T036 [US2] Add empty state when user has no extra credits in frontend/src/features/subscription/components/ExtraCreditsSection/index.tsx
- [x] T037 [US2] Export ExtraCreditsSection from subscription components barrel in frontend/src/features/subscription/components/index.ts

**Checkpoint**: User can see their extra credits separated from monthly. Story 2 is fully functional.

---

## Phase 5: User Story 3 - Consumo na Ordem Correta (Priority: P1)

**Goal**: Sistema consome créditos mensais primeiro, depois extras em ordem FIFO de expiração

**Independent Test**: Criar usuário com poucos mensais + extras > executar ação que consome mais que mensais > verificar ordem de consumo

### Implementation for User Story 3

- [x] T038 [US3] Create consume_credits wrapper function in supabase/migrations/20260122_031_extra_credits.sql
- [x] T039 [US3] Implement logic: check monthly remaining, consume monthly first, then call consume_extra_credits_fifo for remainder
- [x] T040 [US3] Update activity_logs insert to track which credits were consumed (monthly vs extra) via metadata
- [x] T041 [US3] Add check_credits_available function to verify total balance before operations in supabase/migrations/20260122_031_extra_credits.sql
- [x] T042 [US3] Create useConsumeCredits hook that calls the consume_credits RPC in frontend/src/shared/hooks/useConsumeCredits.ts
- [x] T043 [US3] Update existing credit consumption points to use new consume_credits function (identify in codebase)
- [x] T044 [US3] Add error handling for insufficient credits with user-friendly message
- [x] T045 [US3] Invalidate credits queries after consumption to refresh UI

**Checkpoint**: Credits are consumed in correct order (monthly first, then extras FIFO). Story 3 is fully functional.

---

## Phase 6: User Story 4 - Admin Dashboard de Créditos (Priority: P2)

**Goal**: Administrador tem visão geral de créditos extras no sistema (métricas agregadas)

**Independent Test**: Login como admin > acessar dashboard de créditos > ver total distribuído, consumido, saldo geral

### Implementation for User Story 4

- [x] T046 [P] [US4] Create AdminCreditsPage folder structure in frontend/src/features/admin/pages/AdminCreditsPage/
- [x] T047 [P] [US4] Create AdminCreditsPage.module.css with dashboard styles in frontend/src/features/admin/pages/AdminCreditsPage/
- [x] T048 [US4] Create view admin_credits_dashboard_metrics for aggregated metrics in supabase/migrations/20260122_031_extra_credits.sql
- [x] T049 [US4] Create view admin_credits_recent_transactions for recent activity in supabase/migrations/20260122_031_extra_credits.sql
- [x] T050 [US4] Add useCreditsDashboard query to frontend/src/features/admin/api/queries.ts
- [x] T051 [US4] Add useAdminUserCredits query for individual user lookup to frontend/src/features/admin/api/queries.ts
- [x] T052 [US4] Implement AdminCreditsPage with metrics cards (distributed, consumed, available, expired) in frontend/src/features/admin/pages/AdminCreditsPage/index.tsx
- [x] T053 [US4] Add recent transactions table to AdminCreditsPage in frontend/src/features/admin/pages/AdminCreditsPage/index.tsx
- [x] T054 [US4] Add user search/filter functionality to AdminCreditsPage in frontend/src/features/admin/pages/AdminCreditsPage/index.tsx
- [x] T055 [US4] Add top users by extra credits list to AdminCreditsPage in frontend/src/features/admin/pages/AdminCreditsPage/index.tsx
- [x] T056 [US4] Add route /admin/credits to router in frontend/src/app/router.tsx
- [x] T057 [US4] Add "Créditos" link to admin sidebar navigation in frontend/src/shared/layouts/MainLayout/Sidebar.tsx

**Checkpoint**: Admin has full visibility into extra credits system. Story 4 is fully functional.

---

## Phase 7: User Story 5 - Expiração de Créditos (Priority: P3)

**Goal**: Créditos podem ter data de expiração; expirados não são contados no saldo

**Independent Test**: Adicionar créditos com expiração > verificar status muda para "expiring_soon" e depois "expired"

### Implementation for User Story 5

- [x] T058 [US5] Add expires_at date picker field to AddCreditsModal in frontend/src/features/admin/components/AddCreditsModal/index.tsx
- [x] T059 [US5] Add "Sem expiração" checkbox toggle for permanent credits in frontend/src/features/admin/components/AddCreditsModal/index.tsx
- [x] T060 [US5] Add expiry status badges (expiring_soon, expired) to CreditPackagesList in frontend/src/features/subscription/components/ExtraCreditsSection/index.tsx
- [x] T061 [US5] Add days until expiry display for each package in frontend/src/features/subscription/components/ExtraCreditsSection/index.tsx
- [x] T062 [US5] Add expired credits section to ExtraCreditsSection showing historical expired packages in frontend/src/features/subscription/components/ExtraCreditsSection/index.tsx
- [x] T063 [US5] Ensure user_credits_summary_v2 view correctly excludes expired credits from available count (verify in SQL)
- [x] T064 [US5] Add tooltip explaining expiration to AddCreditsModal in frontend/src/features/admin/components/AddCreditsModal/index.tsx

**Checkpoint**: Expiration feature complete. All user stories are functional.

---

## Phase 8: Polish & Cross-Cutting Concerns

**Purpose**: Improvements that affect multiple user stories

- [x] T065 [P] Add loading states to all credit-related components
- [x] T066 [P] Add error boundaries for credit components
- [x] T067 Verify RLS policies work correctly for all operations (manual test)
- [x] T068 [P] Add optimistic updates for adding credits (immediate UI feedback)
- [x] T069 Code cleanup and remove any console.logs or debug code
- [x] T070 Run quickstart.md validation checklist
- [x] T071 Update CLAUDE.md Recent Changes section with feature info

---

## Dependencies & Execution Order

### Phase Dependencies

```
Phase 1: Setup (Database)
    ↓
Phase 2: Foundational (Types & Base Queries)
    ↓
┌───────────────────────────────────────────────────┐
│ Phase 3: US1 (Admin Add Credits)    ← MVP 🎯      │
│ Phase 4: US2 (User View Credits)                  │ Can run in parallel
│ Phase 5: US3 (Consumption Order)                  │ after Phase 2
└───────────────────────────────────────────────────┘
    ↓
Phase 6: US4 (Admin Dashboard) - Depends on Phase 2, can run parallel to US1-3
    ↓
Phase 7: US5 (Expiration) - Depends on Phase 3 (AddCreditsModal exists)
    ↓
Phase 8: Polish - After desired stories complete
```

### User Story Dependencies

| Story | Depends On | Can Start After |
|-------|------------|-----------------|
| US1 (Admin Add) | Phase 2 | Phase 2 complete |
| US2 (User View) | Phase 2 | Phase 2 complete |
| US3 (Consumption) | Phase 2 | Phase 2 complete |
| US4 (Dashboard) | Phase 2 | Phase 2 complete |
| US5 (Expiration) | US1 (AddCreditsModal) | US1 complete |

### Parallel Opportunities

**Phase 1 (Setup)**:
- T004 and T005 (indexes) can run in parallel

**Phase 2 (Foundational)**:
- T011, T012, T013, T014 (types) can all run in parallel

**User Stories**:
- US1, US2, US3, US4 can all start in parallel after Phase 2
- Within each story, tasks marked [P] can run in parallel

---

## Parallel Example: Phase 2 Types

```bash
# Launch all type definitions together:
Task: "Add ExtraCreditPackage interface to frontend/src/features/subscription/types/index.ts"
Task: "Add UserCreditsSummary interface to frontend/src/features/subscription/types/index.ts"
Task: "Add AddCreditsDto interface to frontend/src/features/admin/types/index.ts"
Task: "Add CreditsDashboardMetrics interface to frontend/src/features/admin/types/index.ts"
```

## Parallel Example: User Story 1 Components

```bash
# Launch component structure and styles together:
Task: "Create AddCreditsModal component folder structure in frontend/src/features/admin/components/AddCreditsModal/"
Task: "Create AddCreditsModal.module.css with modal styles in frontend/src/features/admin/components/AddCreditsModal/"
```

---

## Implementation Strategy

### MVP First (User Stories 1-3)

1. Complete Phase 1: Database Setup
2. Complete Phase 2: Foundational Types/Queries
3. Complete Phase 3: US1 - Admin Add Credits
4. Complete Phase 4: US2 - User View Credits
5. Complete Phase 5: US3 - Consumption Order
6. **STOP and VALIDATE**: Core functionality complete
7. Deploy if ready - users can receive and use extra credits

### Incremental Delivery

1. **MVP (US1-3)**: Admin can add credits, users can see and use them → **Core value delivered**
2. **Add US4**: Admin dashboard for visibility → **Operational visibility**
3. **Add US5**: Expiration feature → **Advanced control**
4. **Polish**: Loading states, error handling → **Production ready**

### Task Count Summary

| Phase | Tasks | Purpose |
|-------|-------|---------|
| Phase 1: Setup | 10 | Database foundation |
| Phase 2: Foundational | 7 | Shared types & queries |
| Phase 3: US1 | 10 | Admin adds credits |
| Phase 4: US2 | 10 | User views credits |
| Phase 5: US3 | 8 | Consumption logic |
| Phase 6: US4 | 12 | Admin dashboard |
| Phase 7: US5 | 7 | Expiration feature |
| Phase 8: Polish | 7 | Final touches |
| **Total** | **71** | |

---

## Notes

- [P] tasks = different files, no dependencies on incomplete tasks
- [USn] label maps task to specific user story
- Each user story should be independently completable and testable
- Commit after each task or logical group
- Stop at any checkpoint to validate story independently
- MVP = US1 + US2 + US3 (admin can add, user can see, system consumes correctly)
