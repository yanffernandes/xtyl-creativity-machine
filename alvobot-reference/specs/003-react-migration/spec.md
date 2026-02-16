# Feature Specification: React Migration

**Feature Branch**: `003-react-migration`
**Created**: 2025-12-10
**Status**: ✅ Implementado
**Input**: User description: "Fazer a migração para react, com o backend o modelo de backend hibrido. Mas nesse momento tudo já está rodando com o supabase, então manter o supabase. Mantenha o mesmo visual, podendo fazer pequenos ajustes para dar uma visão mais premium e moderna."

## Clarifications

### Session 2025-12-10

- Q: Qual estratégia de migração será usada? → A: Big Bang - Migrar tudo de uma vez, deploy único quando completo
- Q: Qual solução de state management usar? → A: Zustand + TanStack Query (Zustand para UI state, Query para server cache)

## Overview

Migration of the AlvoBot frontend from Vue.js 3 to React while preserving the existing hybrid backend architecture with Supabase. The visual design will be maintained with subtle refinements for a more premium, modern appearance.

### Migration Strategy

**Approach**: Big Bang Migration - Complete rewrite with single deployment when fully ready.

This means:
- All 176 Vue components will be migrated before any production deployment
- The Vue application remains in production until React version is 100% complete
- Single cutover from Vue to React when all features pass acceptance tests
- No parallel running of both frameworks in production

### Current State

- **Frontend**: Vue.js 3.5.13 with Composition API, Pinia state management
- **Components**: 176 Vue components (~42,000 lines)
- **Features**: 14 feature modules (auth, articles, tasks, projects, runs, calendar, flows, keywords, connections, settings, scraper, users, dashboard)
- **Shared Components**: 11 base components (BaseButton, BaseInput, BaseModal, BaseTable, BaseSelect, BaseCard, AlertMessage, LoadingSpinner, EmptyState, BaseCheckbox, BaseTextarea)
- **Backend**: NestJS with Supabase integration (hybrid model)
- **Database**: Supabase PostgreSQL
- **Design System**: CSS custom properties with semantic tokens

### Target State

- **Frontend**: React 18+ with modern patterns
- **State Management**: Zustand (UI/client state) + TanStack Query (server state/cache)
- **Components**: Equivalent React components with same visual identity
- **Backend**: Unchanged (NestJS + Supabase hybrid)
- **Design System**: Same CSS variables, enhanced with subtle premium touches

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Authentication Flow (Priority: P1)

Users can log in, sign up, reset password, and manage their session exactly as they do today, with the same or better visual experience.

**Why this priority**: Authentication is the gateway to the application. Without it, no other features are accessible. This must work flawlessly from day one.

**Independent Test**: Can be fully tested by creating a new account, logging in, resetting password, and logging out. Delivers immediate value as the entry point to the application.

**Acceptance Scenarios**:

1. **Given** a user is on the login page, **When** they enter valid credentials and submit, **Then** they are redirected to the dashboard within 2 seconds
2. **Given** a user is on the signup page, **When** they complete registration, **Then** they receive a confirmation and can access the platform
3. **Given** a logged-in user, **When** they click logout, **Then** their session is terminated and they are redirected to login
4. **Given** a user forgot their password, **When** they request a reset, **Then** they receive an email with reset instructions

---

### User Story 2 - Dashboard and Navigation (Priority: P1)

Users can navigate the application using the sidebar/main layout, view the dashboard with key metrics, and access all feature modules seamlessly.

**Why this priority**: The dashboard and navigation are the core user experience. Users need to move between features effortlessly.

**Independent Test**: Can be tested by logging in and navigating to each major section (Projects, Articles, Tasks, Flows, etc.) and verifying content loads correctly.

**Acceptance Scenarios**:

1. **Given** a logged-in user, **When** they access the dashboard, **Then** they see their key metrics and recent activity
2. **Given** a user viewing any page, **When** they click a navigation item, **Then** they are taken to that section without page reload
3. **Given** a user on mobile, **When** they interact with navigation, **Then** the responsive layout adapts appropriately

---

### User Story 3 - Projects Management (Priority: P2)

Users can create, view, edit, and delete projects with all associated data and integrations preserved.

**Why this priority**: Projects are the organizational unit for most features. Once auth and navigation work, users need to manage their projects.

**Independent Test**: Can be tested by creating a project, editing its details, viewing project list, and deleting a test project.

**Acceptance Scenarios**:

1. **Given** a user on the projects page, **When** they click "New Project", **Then** they see a creation form
2. **Given** a user has projects, **When** they view the projects list, **Then** they see all their projects with correct data
3. **Given** a user viewing a project, **When** they edit details, **Then** changes are saved and reflected immediately

---

### User Story 4 - Articles Management (Priority: P2)

Users can create, edit, and manage blog articles with the rich text editor, maintaining all formatting capabilities.

**Why this priority**: Content creation is a core feature. The rich text editor (Tiptap) has React support, making migration feasible.

**Independent Test**: Can be tested by creating an article with formatted text, images, and links, then editing and publishing it.

**Acceptance Scenarios**:

1. **Given** a user creating an article, **When** they use the rich text editor, **Then** all formatting options work (bold, italic, links, images, tables)
2. **Given** a user has draft articles, **When** they view the articles list, **Then** they see status, dates, and can filter/sort
3. **Given** a user editing an article, **When** they save changes, **Then** content is persisted without data loss

---

### User Story 5 - Tasks and Calendar (Priority: P2)

Users can manage tasks with due dates and view them on a calendar interface.

**Why this priority**: Task management integrates with multiple features and the calendar provides a critical overview.

**Independent Test**: Can be tested by creating tasks, assigning due dates, and verifying they appear correctly on the calendar.

**Acceptance Scenarios**:

1. **Given** a user on tasks page, **When** they create a task with a due date, **Then** it appears in the task list and calendar
2. **Given** a user viewing the calendar, **When** they click a date, **Then** they see tasks due on that date
3. **Given** a user completing a task, **When** they mark it done, **Then** status updates across all views

---

### User Story 6 - Automation Flows (Priority: P3)

Users can create and manage automation flows using the visual flow editor with node-based interface.

**Why this priority**: While important, flows are a more advanced feature. React Flow is a mature equivalent to Vue Flow.

**Independent Test**: Can be tested by creating a simple flow with triggers and actions, saving it, and viewing it in the flows list.

**Acceptance Scenarios**:

1. **Given** a user on flows page, **When** they create a new flow, **Then** they see the visual flow editor
2. **Given** a user in the flow editor, **When** they add nodes and connect them, **Then** the flow structure is saved correctly
3. **Given** a user with existing flows, **When** they edit a flow, **Then** all nodes and connections load properly

---

### User Story 7 - Keywords and Scraper (Priority: P3)

Users can research keywords and use the ads transparency scraper tool.

**Why this priority**: These are specialized tools that build on the core platform. Lower priority but essential for complete feature parity.

**Independent Test**: Can be tested by running a keyword search and viewing scraper results.

**Acceptance Scenarios**:

1. **Given** a user on keywords page, **When** they search for a term, **Then** they see relevant keyword data
2. **Given** a user using the scraper, **When** they input parameters, **Then** they receive transparency data

---

### User Story 8 - Settings and User Management (Priority: P3)

Users can manage their account settings and administrators can manage users.

**Why this priority**: Settings are accessed less frequently but are necessary for complete platform functionality.

**Independent Test**: Can be tested by changing user preferences and verifying changes persist.

**Acceptance Scenarios**:

1. **Given** a user on settings page, **When** they update preferences, **Then** changes are saved and applied
2. **Given** an admin user, **When** they access user management, **Then** they can view and manage platform users

---

### Edge Cases

- What happens when a user's session expires during an operation? (Should redirect to login with return URL)
- How does the system handle network failures during data submission? (Show error message, allow retry)
- What happens when navigating away from unsaved changes? (Prompt user to confirm)
- How does the system behave with slow network connections? (Show loading states, timeout gracefully)

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST authenticate users via Supabase Auth with email/password and maintain session state
- **FR-002**: System MUST render the main layout with sidebar navigation and responsive behavior for all screen sizes
- **FR-003**: System MUST display dashboard with user metrics and recent activity data from Supabase
- **FR-004**: System MUST support CRUD operations for all entities (Projects, Articles, Tasks, Keywords, Flows, Connections, Runs)
- **FR-005**: System MUST provide a rich text editor for article creation with formatting, images, links, and tables
- **FR-006**: System MUST display calendar view for tasks and events with date-based navigation
- **FR-007**: System MUST provide visual flow editor for automation workflows
- **FR-008**: System MUST support data tables with sorting, filtering, and pagination for list views
- **FR-009**: System MUST display loading states, empty states, and error messages consistently across all features
- **FR-010**: System MUST maintain all existing API integrations with the NestJS backend and direct Supabase queries
- **FR-011**: System MUST preserve the existing CSS design system (custom properties) and apply subtle premium enhancements
- **FR-012**: System MUST implement route-based code splitting for optimal load performance
- **FR-013**: System MUST handle form validation with user-friendly error messages
- **FR-014**: System MUST support modal dialogs for confirmations and detail views

### Visual Enhancement Requirements

- **VR-001**: System MUST maintain the existing color palette (primary yellow #fbbf24, text colors, status colors)
- **VR-002**: System SHOULD add subtle micro-interactions (hover effects, focus states, transitions)
- **VR-003**: System SHOULD enhance shadows and depth for a more premium feel
- **VR-004**: System SHOULD improve typography hierarchy with better spacing
- **VR-005**: System SHOULD add subtle animations for state changes (loading, success, error)

### Key Entities

- **User**: Authenticated user with profile, preferences, and role
- **Project**: Container for organizing content and workflows
- **Article**: Blog content with rich text, metadata, and publishing state
- **Task**: Action item with status, due date, and project association
- **Flow**: Automation workflow with nodes, connections, and trigger configuration
- **Keyword**: Search term with research data and metrics
- **Connection**: Third-party service integration credentials
- **Run**: Execution history for flows and automations

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: All 14 feature modules are fully functional with feature parity to the Vue version
- **SC-002**: Page load time is equal to or faster than the current Vue application (under 3 seconds on 3G)
- **SC-003**: Users can complete any existing workflow without errors or data loss
- **SC-004**: 100% of existing Supabase queries and NestJS API calls work without modification
- **SC-005**: Application works on Chrome, Firefox, Safari, and Edge (latest 2 versions)
- **SC-006**: Mobile responsiveness is maintained or improved for screens 320px and above
- **SC-007**: All unit tests achieve equivalent coverage to existing Vue tests (auth store at 100%)
- **SC-008**: Zero regressions in user-facing functionality during migration
- **SC-009**: Visual appearance matches existing design with subtle enhancements (no major redesign)
- **SC-010**: End-to-end tests pass for all critical user journeys (auth, navigation, CRUD operations)

## Assumptions

- The existing Supabase backend and database schema remain unchanged
- The NestJS backend API contracts remain stable
- React versions of key libraries (Tiptap, React Flow, AG Grid) provide equivalent functionality
- The CSS custom properties design system is technology-agnostic and can be reused directly
- The development team has React experience or will acquire it during the migration
- Migration can be done incrementally (feature by feature) if needed
- Existing E2E tests can be adapted for the React version

## Out of Scope

- Backend architecture changes
- Database schema modifications
- New feature development (migration focuses on parity)
- Major visual redesign (only subtle enhancements)
- Mobile native applications
- Internationalization/localization (maintain current state)
