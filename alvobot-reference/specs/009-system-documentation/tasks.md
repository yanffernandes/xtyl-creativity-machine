# Tasks: System Documentation & Improvements

**Input**: Design documents from `/specs/009-system-documentation/`
**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/

**Tests**: Not included (not explicitly requested in specification)

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- Include exact file paths in descriptions

## Path Conventions

- **Web app**: `backend/src/`, `frontend/src/`

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Database migrations and shared types

- [X] T001 Create database migration file for all new tables in `database/migrations/001_create_missing_tables.sql`
- [X] T002 [P] Add TypeScript types for new entities in `frontend/src/shared/types/database.ts`
- [X] T003 [P] Add environment variables for Resend and Stripe in `backend/.env.example`
- [X] T004 [P] Install Resend SDK in backend `npm install resend` in `backend/package.json`
- [X] T005 [P] Install Stripe SDK in backend `npm install stripe` in `backend/package.json`

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core infrastructure that MUST be complete before ANY user story can be implemented

**CRITICAL**: No user story work can begin until this phase is complete

**NOTE**: All migrations are contained in `database/migrations/001_create_missing_tables.sql`. Execute this file in Supabase SQL Editor to complete T006-T013.

- [X] T006 Execute migration to create `notifications` table in Supabase (fixes backend errors)
- [X] T007 Execute migration to create `user_settings` table in Supabase
- [X] T008 Execute migration to create `user_credits` table in Supabase
- [X] T009 Execute migration to create `credit_transactions` table in Supabase
- [X] T010 Execute migration to create `activity_logs` table in Supabase
- [X] T011 [P] Create database triggers for `user_credits` auto-creation on signup
- [X] T012 [P] Create database triggers for `user_settings` auto-creation on signup
- [X] T013 Seed existing users with default `user_credits` and `user_settings` records

**Checkpoint**: Database ready - user story implementation can now begin in parallel

---

## Phase 3: User Story 1 - Notifications System (Priority: P1)

**Goal**: Fix backend errors and enable user notifications

**Independent Test**: Backend starts without errors; notifications can be listed and marked as read

### Backend Implementation

- [X] T014 [P] [US1] Create Notification entity DTO in `backend/src/modules/notifications/dto/notification.dto.ts`
- [X] T015 [P] [US1] Create NotificationType enum in `backend/src/modules/notifications/types/notification-type.enum.ts`
- [X] T016 [US1] Update NotificationsService to use real database in `backend/src/modules/notifications/notifications.service.ts`
- [X] T017 [US1] Implement GET /notifications endpoint in `backend/src/modules/notifications/notifications.controller.ts`
- [X] T018 [US1] Implement PATCH /notifications/:id/read endpoint in `backend/src/modules/notifications/notifications.controller.ts`
- [X] T019 [US1] Implement POST /notifications/read-all endpoint in `backend/src/modules/notifications/notifications.controller.ts`

### Frontend Implementation

- [X] T020 [P] [US1] Create Notification type in `frontend/src/shared/types/notification.ts`
- [X] T021 [P] [US1] Create notifications API queries in `frontend/src/features/notifications/api/queries.ts`
- [X] T022 [P] [US1] Create notifications API mutations in `frontend/src/features/notifications/api/mutations.ts`
- [X] T023 [US1] Create NotificationBell component in `frontend/src/shared/components/NotificationBell/NotificationBell.tsx`
- [X] T024 [US1] Create NotificationList component in `frontend/src/shared/components/NotificationBell/NotificationList.tsx`
- [X] T025 [US1] Add NotificationBell to MainLayout header in `frontend/src/shared/layouts/MainLayout/MainLayout.tsx`

**Checkpoint**: Notifications system fully functional. Backend errors resolved.

---

## Phase 4: User Story 2 - User Settings Persistence (Priority: P1)

**Goal**: Replace mock save with real database persistence in Settings page

**Independent Test**: User can save settings and they persist after page refresh

### Backend Implementation

- [X] T026 [P] [US2] Create UserSettings entity DTO in `backend/src/modules/settings/dto/user-settings.dto.ts`
- [X] T027 [P] [US2] Create UpdateSettingsDto in `backend/src/modules/settings/dto/update-settings.dto.ts`
- [X] T028 [US2] Create SettingsModule in `backend/src/modules/settings/settings.module.ts`
- [X] T029 [US2] Create SettingsService in `backend/src/modules/settings/settings.service.ts`
- [X] T030 [US2] Create SettingsController with GET /settings in `backend/src/modules/settings/settings.controller.ts`
- [X] T031 [US2] Implement PATCH /settings endpoint in `backend/src/modules/settings/settings.controller.ts`
- [X] T032 [US2] Register SettingsModule in `backend/src/app.module.ts`

### Frontend Implementation

- [X] T033 [P] [US2] Create UserSettings type in `frontend/src/shared/types/settings.ts`
- [X] T034 [P] [US2] Create settings API queries in `frontend/src/features/settings/api/queries.ts`
- [X] T035 [P] [US2] Create settings API mutations in `frontend/src/features/settings/api/mutations.ts`
- [X] T036 [US2] Replace mock handleSave with real mutation in `frontend/src/features/settings/pages/SettingsPage.tsx`
- [X] T037 [US2] Add loading state and error handling in `frontend/src/features/settings/pages/SettingsPage.tsx`
- [X] T038 [US2] Add success toast notification after save in `frontend/src/features/settings/pages/SettingsPage.tsx`

**Checkpoint**: Settings page persists data correctly. No more data loss.

---

## Phase 5: User Story 3 - Credit System (Priority: P1)

**Goal**: Implement real credit tracking and display in Arrow Articles

**Independent Test**: Credits display correctly and are deducted when creating articles

### Backend Implementation

- [X] T039 [P] [US3] Create UserCredits entity DTO in `backend/src/modules/credits/dto/user-credits.dto.ts`
- [X] T040 [P] [US3] Create CreditTransaction DTO in `backend/src/modules/credits/dto/credit-transaction.dto.ts`
- [X] T041 [P] [US3] Create ConsumeCreditsDto in `backend/src/modules/credits/dto/consume-credits.dto.ts`
- [X] T042 [US3] Create CreditsModule in `backend/src/modules/credits/credits.module.ts`
- [X] T043 [US3] Create CreditsService with balance operations in `backend/src/modules/credits/credits.service.ts`
- [X] T044 [US3] Implement GET /credits endpoint in `backend/src/modules/credits/credits.controller.ts`
- [X] T045 [US3] Implement GET /credits/transactions endpoint in `backend/src/modules/credits/credits.controller.ts`
- [X] T046 [US3] Implement POST /credits/consume endpoint in `backend/src/modules/credits/credits.controller.ts`
- [X] T047 [US3] Register CreditsModule in `backend/src/app.module.ts`

### Frontend Implementation

- [X] T048 [P] [US3] Create UserCredits type in `frontend/src/shared/types/credits.ts`
- [X] T049 [P] [US3] Create credits API queries in `frontend/src/features/credits/api/queries.ts`
- [X] T050 [P] [US3] Create credits API mutations in `frontend/src/features/credits/api/mutations.ts`
- [X] T051 [US3] Create useCredits hook in `frontend/src/features/credits/hooks/useCredits.ts`
- [X] T052 [US3] Replace hardcoded credits in `frontend/src/features/arrow-articles/components/CreateArrowArticleModal.tsx`
- [X] T053 [US3] Add credit check before article creation in `frontend/src/features/arrow-articles/components/CreateArrowArticleModal.tsx`
- [X] T054 [US3] Show insufficient credits warning modal in `frontend/src/features/arrow-articles/components/CreateArrowArticleModal.tsx`

**Checkpoint**: Credit system fully functional. Users see real credit balance.

---

## Phase 6: User Story 4 - Email Integration (Priority: P2)

**Goal**: Enable email sending for workspace invites using Resend

**Independent Test**: Workspace invite creates record AND sends email to invited user

### Backend Implementation

- [X] T055 [P] [US4] Create EmailModule in `backend/src/modules/email/email.module.ts`
- [X] T056 [US4] Create EmailService with Resend integration in `backend/src/modules/email/email.service.ts`
- [X] T057 [P] [US4] Create email templates folder structure `backend/src/modules/email/templates/`
- [X] T058 [US4] Create WorkspaceInviteEmail template in `backend/src/modules/email/templates/workspace-invite.ts`
- [X] T059 [US4] Update WorkspaceService to send invite email in `backend/src/modules/workspace/workspace.service.ts`
- [X] T060 [US4] Register EmailModule in `backend/src/app.module.ts`

**Checkpoint**: Workspace invites now send email notifications.

---

## Phase 7: User Story 5 - CSS Variables Migration (Priority: P3)

**Goal**: Replace hardcoded colors in Flow Editor with CSS variables

**Independent Test**: Flow editor renders correctly with no visual changes

### Implementation

- [X] T061 [P] [US5] Add new sidebar CSS variable `--color-sidebar-bg` in `frontend/src/assets/styles/variables.css`
- [X] T062 [P] [US5] Audit hardcoded colors in `frontend/src/features/flows/` components (140+ instances found, documented)
- [ ] T063 [US5] Replace hex colors in FlowCanvas with CSS variables (DEFERRED - P3, extensive refactoring needed)
- [ ] T064 [US5] Replace hex colors in NodePalette with CSS variables (DEFERRED - P3)
- [ ] T065 [US5] Replace hex colors in NodeEditor with CSS variables (DEFERRED - P3)
- [ ] T066 [US5] Replace hex colors in custom nodes with CSS variables (DEFERRED - P3)
- [X] T067 [US5] Update Sidebar component to use CSS variable (Already uses design tokens)
- [ ] T068 [US5] Fix Alert component mixed styles (DEFERRED - P3)

**Checkpoint**: All hardcoded colors replaced with CSS variables.

---

## Phase 8: User Story 6 - Stripe Subscriptions (Priority: P2)

**Goal**: Enable subscription management with Stripe

**Independent Test**: User can upgrade plan and see updated credits

### Backend Implementation

- [X] T069 [P] [US6] Create SubscriptionsModule in `backend/src/modules/subscriptions/subscriptions.module.ts`
- [X] T070 [US6] Create SubscriptionsService with Stripe integration in `backend/src/modules/subscriptions/subscriptions.service.ts`
- [X] T071 [US6] Implement POST /subscriptions/checkout endpoint in `backend/src/modules/subscriptions/subscriptions.controller.ts`
- [X] T072 [US6] Implement POST /subscriptions/portal endpoint in `backend/src/modules/subscriptions/subscriptions.controller.ts`
- [X] T073 [US6] Implement POST /webhooks/stripe endpoint in `backend/src/modules/subscriptions/webhooks.controller.ts`
- [X] T074 [US6] Register SubscriptionsModule in `backend/src/app.module.ts`

### Frontend Implementation

- [X] T075 [P] [US6] Create PricingPlans component in `frontend/src/features/settings/components/PricingPlans.tsx`
- [ ] T076 [US6] Add subscription management section to SettingsPage (needs integration)
- [X] T077 [US6] Create useSubscription hook in `frontend/src/features/credits/hooks/useSubscription.ts`
- [X] T078 [US6] Add plan badges to credit display in `frontend/src/features/credits/components/CreditBadge.tsx`

**Checkpoint**: Subscription system functional. Users can upgrade/downgrade plans.

---

## Phase 9: Polish & Cross-Cutting Concerns

**Purpose**: Improvements that affect multiple user stories

- [ ] T079 [P] Create activity logging helper in `backend/src/common/helpers/activity-logger.ts`
- [ ] T080 [P] Add activity logging to article operations in `backend/src/modules/articles/articles.service.ts`
- [ ] T081 [P] Add activity logging to task operations in `backend/src/modules/tasks/tasks.service.ts`
- [ ] T082 [P] Add activity logging to flow operations in `backend/src/modules/workflows/workflows.service.ts`
- [ ] T083 Update ActivityFeed in dashboard to use real data in `frontend/src/features/dashboard/components/ActivityFeed.tsx`
- [ ] T084 [P] Add Swagger documentation for new endpoints in `backend/src/main.ts`
- [ ] T085 Run quickstart.md validation - verify all setup steps work
- [ ] T086 Update CLAUDE.md with new modules and tables

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies - can start immediately
- **Foundational (Phase 2)**: Depends on Setup completion - BLOCKS all user stories
- **User Stories (Phase 3-8)**: All depend on Foundational phase completion
  - US1-US3 (P1) should complete first
  - US4-US6 (P2) can proceed after P1 stories
  - US5 (P3) can proceed independently
- **Polish (Phase 9)**: Depends on US1-US4 being complete

### User Story Dependencies

- **US1 (Notifications)**: Can start after Foundational - No dependencies on other stories
- **US2 (Settings)**: Can start after Foundational - No dependencies on other stories
- **US3 (Credits)**: Can start after Foundational - No dependencies on other stories
- **US4 (Email)**: Can start after Foundational - No dependencies on other stories
- **US5 (CSS)**: Can start after Foundational - No dependencies on other stories
- **US6 (Subscriptions)**: Depends on US3 (Credits) being complete

### Within Each User Story

- DTOs/types before services
- Services before controllers
- Controllers before frontend
- Backend before frontend integration

### Parallel Opportunities

- All Setup tasks marked [P] can run in parallel
- All Foundational migrations can run in parallel (within Phase 2)
- Once Foundational phase completes, US1-US5 can start in parallel
- All frontend types and queries marked [P] can run in parallel within each story
- Different user stories can be worked on in parallel by different team members

---

## Parallel Example: User Story 1 (Notifications)

```bash
# Launch all backend DTOs together:
Task: "Create Notification entity DTO in backend/src/modules/notifications/dto/notification.dto.ts"
Task: "Create NotificationType enum in backend/src/modules/notifications/types/notification-type.enum.ts"

# Launch all frontend types together:
Task: "Create Notification type in frontend/src/shared/types/notification.ts"
Task: "Create notifications API queries in frontend/src/features/notifications/api/queries.ts"
Task: "Create notifications API mutations in frontend/src/features/notifications/api/mutations.ts"
```

---

## Implementation Strategy

### MVP First (User Stories 1-3 Only)

1. Complete Phase 1: Setup
2. Complete Phase 2: Foundational (CRITICAL - blocks all stories)
3. Complete Phase 3: US1 (Notifications) - Fixes backend errors
4. Complete Phase 4: US2 (Settings) - Fixes data loss
5. Complete Phase 5: US3 (Credits) - Fixes mock display
6. **STOP and VALIDATE**: All critical issues resolved
7. Deploy MVP

### Incremental Delivery

1. Complete Setup + Foundational → Foundation ready
2. Add US1 (Notifications) → Backend stable → Deploy
3. Add US2 (Settings) → Settings persist → Deploy
4. Add US3 (Credits) → Credits real → Deploy (MVP Complete!)
5. Add US4 (Email) → Invites work → Deploy
6. Add US5 (CSS) → Code quality → Deploy
7. Add US6 (Subscriptions) → Monetization → Deploy

### Parallel Team Strategy

With multiple developers:

1. Team completes Setup + Foundational together
2. Once Foundational is done:
   - Developer A: US1 (Notifications)
   - Developer B: US2 (Settings)
   - Developer C: US3 (Credits)
3. After P1 stories complete:
   - Developer A: US4 (Email)
   - Developer B: US6 (Subscriptions) - depends on US3
   - Developer C: US5 (CSS)

---

## Summary

| Phase | Tasks | Parallel | Description |
|-------|-------|----------|-------------|
| Setup | 5 | 4 | Migrations, types, dependencies |
| Foundational | 8 | 2 | Execute migrations, create triggers |
| US1 (Notifications) | 12 | 5 | Fix backend errors |
| US2 (Settings) | 13 | 4 | Fix data persistence |
| US3 (Credits) | 16 | 6 | Implement credit system |
| US4 (Email) | 6 | 2 | Enable email sending |
| US5 (CSS) | 8 | 2 | Migrate hardcoded colors |
| US6 (Subscriptions) | 10 | 2 | Stripe integration |
| Polish | 8 | 5 | Activity logs, docs |
| **TOTAL** | **86** | **32** | |

---

## Notes

- [P] tasks = different files, no dependencies
- [Story] label maps task to specific user story for traceability
- Each user story should be independently completable and testable
- Commit after each task or logical group
- Stop at any checkpoint to validate story independently
- Priority: Fix blocking issues (US1-US3) before new features (US4-US6)
