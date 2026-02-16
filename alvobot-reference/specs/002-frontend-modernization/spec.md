# Feature Specification: Frontend Modernization

**Feature Branch**: `002-frontend-modernization`
**Created**: 2025-12-04
**Status**: ✅ Implementado
**Input**: User description: "Refatorar a estrutura do frontend para seguir padrões modernos de desenvolvimento, incluindo: migração para arquitetura feature-based, remoção de código legado WeWeb, consolidação de gerenciamento de estado (Pinia), limpeza de variáveis de ambiente, e implementação de boas práticas de organização de código para facilitar manutenção e atualizações futuras."

## Clarifications

### Session 2025-12-04

- Q: What migration execution strategy should be used for the frontend refactoring? → A: Big-bang migration (complete all changes in one release, extensive pre-release testing)
- Q: What testing strategy will validate zero regression (FR-012, SC-010) before the big-bang release? → A: Manual testing checklist covering all features + automated smoke tests for critical paths
- Q: When does a component belong in shared/ vs remaining feature-specific? → A: Component used by 3+ features = shared (wait for clear pattern)
- Q: What should be done with WeWeb-specific functionality (wwLib/, WeWeb plugins) that the application currently relies on? → A: Remove all WeWeb code immediately (replace with native Vue implementations before migration)
- Q: Where and how should the new frontend architecture be documented? → A: Create dedicated ARCHITECTURE.md file (separate technical documentation from getting-started guide)

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Code Organization and Maintainability (Priority: P1)

As a **developer**, I need the frontend codebase organized using modern feature-based architecture so that I can quickly locate, understand, and modify code without navigating through confusing legacy structures.

**Why this priority**: Core architectural foundation that enables all other improvements. Without proper organization, any future development becomes exponentially harder and error-prone.

**Independent Test**: Can be fully tested by navigating the src/ directory structure, verifying that features are self-contained with their own components, pages, stores, and API modules. Delivers immediate value by reducing time to find and understand code.

**Acceptance Scenarios**:

1. **Given** a developer needs to work on the Tasks feature, **When** they navigate to src/features/tasks/, **Then** they find all task-related components, pages, stores, and API calls in one location
2. **Given** a developer needs to add a new feature, **When** they create a new feature directory, **Then** they can follow the established pattern without touching unrelated code
3. **Given** multiple developers working on different features, **When** they work in parallel, **Then** they experience minimal merge conflicts due to feature isolation

---

### User Story 2 - State Management Clarity (Priority: P1)

As a **developer**, I need a single, consolidated state management system (Pinia) so that I can predictably manage application state without confusion between multiple state management approaches.

**Why this priority**: Critical for application stability and developer confidence. Duplicate state management systems lead to bugs, data inconsistencies, and unpredictable behavior.

**Independent Test**: Can be fully tested by verifying that all state is managed through Pinia stores located in feature directories, with no legacy Vuex store/ directory. Developers can trace data flow from components to stores without ambiguity.

**Acceptance Scenarios**:

1. **Given** a component needs to access user authentication state, **When** it imports the auth store, **Then** it receives data from a single source of truth (Pinia)
2. **Given** a developer searches for state management code, **When** they look in the codebase, **Then** they find only Pinia stores, no Vuex legacy code
3. **Given** application state needs to be debugged, **When** using Vue DevTools, **Then** all state is visible in Pinia stores

---

### User Story 3 - Environment Configuration Cleanup (Priority: P2)

As a **developer** or **DevOps engineer**, I need clean, documented environment variables without legacy WeWeb references so that I can confidently configure the application for different environments (development, staging, production).

**Why this priority**: Enables proper deployment and environment management. Legacy variables cause confusion and can lead to misconfiguration in production.

**Independent Test**: Can be fully tested by reviewing .env and .env.example files, verifying that only necessary variables exist, all are documented, and no WeWeb URLs remain. Deployment to a new environment succeeds using only the documented variables.

**Acceptance Scenarios**:

1. **Given** a new developer joins the team, **When** they read .env.example, **Then** they understand exactly which variables are needed and what each does
2. **Given** the application needs to connect to the backend API, **When** it reads VITE_API_URL, **Then** it uses the correct URL without confusion from duplicate VITE_APP_API_URL
3. **Given** deployment to a new environment, **When** configuring environment variables, **Then** only AlvoBot-specific variables are needed, no WeWeb URLs

---

### User Story 4 - Single Page Application Structure (Priority: P2)

As a **developer**, I need the application to follow true SPA architecture with a single index.html and dynamic routing so that I can leverage modern SPA benefits like code splitting, lazy loading, and seamless navigation.

**Why this priority**: Fundamental architectural improvement that enables performance optimizations and modern development patterns. Multiple HTML files break SPA principles.

**Independent Test**: Can be fully tested by verifying that only one index.html exists in the root, all pages are Vue components in src/, and navigation works through Vue Router without page reloads.

**Acceptance Scenarios**:

1. **Given** a user navigates between pages, **When** they click navigation links, **Then** page transitions occur without full page reloads
2. **Given** the application loads, **When** a user first visits, **Then** only necessary code for the initial route is loaded (code splitting works)
3. **Given** a developer adds a new page, **When** they create it, **Then** they add a Vue component and router configuration, not a new HTML file

---

### User Story 5 - Legacy Code Removal (Priority: P3)

As a **developer**, I need WeWeb legacy code (wwLib/, legacy naming conventions) removed or refactored so that the codebase reflects AlvoBot's identity and reduces technical debt.

**Why this priority**: Quality of life improvement that reduces confusion and technical debt. Can be done incrementally after core architectural changes.

**Independent Test**: Can be fully tested by searching the codebase for WeWeb references (wwLib, _front/, _common/ with underscore prefixes) and verifying they're either removed or renamed to follow modern conventions.

**Acceptance Scenarios**:

1. **Given** a developer searches for "ww" in the codebase, **When** they review results, **Then** they find only necessary WeWeb export compatibility code clearly marked as legacy
2. **Given** the src/ directory structure, **When** developers review it, **Then** they see no directories with underscore prefixes (_front, _common)
3. **Given** the application needs to be branded, **When** reviewing the codebase, **Then** WeWeb references are minimal and clearly isolated

---

### Edge Cases

- **What happens when migrating existing features to the new structure?** All features will be migrated together in a single release (big-bang approach). Extensive pre-release testing in a staging environment is required to validate all functionality before production deployment.

- **What is the rollback plan if critical issues are discovered post-deployment?** Maintain a feature flag or Git tag for the previous working version. If critical issues occur, rollback to the previous release while the team fixes issues in the new structure. Rollback window should be within 24 hours of deployment.

- **How does the system handle existing user sessions during the migration?** All user-facing functionality must remain operational throughout the refactoring. State management migration should preserve existing session data.

- **What happens if some WeWeb plugins are still needed?** All WeWeb plugin functionality must be replaced with native Vue implementations before the migration. This includes identifying WeWeb plugin features currently in use and creating equivalent Vue components or composables.

- **How do we ensure no functionality is lost during HTML file consolidation?** Each HTML page's routing and functionality must be tested before and after migration to ensure identical behavior.

- **What happens to existing environment variable references in legacy code?** Legacy code must be updated to use consolidated environment variables, with a deprecation period where both old and new variables work.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST organize all frontend code using feature-based architecture with dedicated directories for auth, tasks, articles, projects, and other features
- **FR-002**: System MUST consolidate all state management into Pinia stores located within feature directories, removing legacy Vuex store/ directory
- **FR-003**: System MUST use a single index.html file in the root directory, with all pages implemented as Vue components routed through Vue Router
- **FR-004**: System MUST remove duplicate environment variables, maintaining only VITE_API_URL for backend communication and removing VITE_APP_API_URL
- **FR-005**: System MUST provide .env.example file documenting all required environment variables with clear descriptions
- **FR-006**: System MUST completely remove all WeWeb legacy code (wwLib/, WeWeb plugins), replacing all functionality with native Vue implementations before migration
- **FR-007**: System MUST eliminate underscore-prefixed directory names (_front/, _common/), replacing with standard naming conventions (core/, shared/, utils/)
- **FR-008**: System MUST remove version-suffixed directories (runs-old/, runs_old2/), relying on Git for version control
- **FR-009**: System MUST organize shared code (components, composables, utilities) in a dedicated shared/ directory
- **FR-010**: System MUST place all feature-specific code (components, pages, stores, API modules) within their respective feature directories
- **FR-011**: System MUST implement Vue Router configuration in a dedicated router/ directory
- **FR-012**: System MUST maintain all existing functionality during and after refactoring (zero regression)
- **FR-013**: System MUST document the new structure in a dedicated frontend/ARCHITECTURE.md file covering: folder structure, feature module pattern, shared component rules (3+ uses), state management approach (Pinia), routing conventions, and code organization principles
- **FR-014**: System MUST ensure all existing tests continue to pass after refactoring
- **FR-015**: System MUST provide a comprehensive manual testing checklist covering all features (auth, tasks, articles, projects, keyword mining, file uploads) and automated smoke tests for critical user paths before production deployment

### Key Entities

- **Feature Module**: Self-contained directory containing all code related to a specific domain (auth, tasks, articles, etc.), including:
  - Components specific to that feature
  - Page views for that feature
  - Pinia stores for feature state
  - API services for backend communication
  - Feature-specific types/interfaces

- **Shared Module**: Reusable code used across multiple features, including:
  - Common UI components (promoted to shared/ when used by 3+ features)
  - Utility functions
  - Composables (Vue composition utilities)
  - Global constants and configurations
  - **Rule**: Components remain feature-specific until used by 3 or more features, at which point they are moved to shared/

- **Route Configuration**: Vue Router setup defining application navigation, including:
  - Route definitions mapping URLs to components
  - Navigation guards for authentication/authorization
  - Lazy-loaded route components for performance

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Developers can locate any feature-related file within 10 seconds by navigating to src/features/[feature-name]/
- **SC-002**: New features can be added without modifying existing feature directories (100% feature isolation)
- **SC-003**: Zero WeWeb URLs remain in environment variables (all VITE_APP_CDN_URL, VITE_APP_API_URL, VITE_APP_PLUGINS_URL removed)
- **SC-004**: Application uses only one HTML file (index.html), with all other HTML files removed or consolidated
- **SC-005**: All state management occurs through Pinia stores (zero Vuex dependencies remaining)
- **SC-006**: Code review time for new features reduces by 40% due to predictable structure
- **SC-007**: Onboarding time for new developers reduces by 50% due to clear organization
- **SC-008**: Build time improves by 20% due to better code splitting and lazy loading
- **SC-009**: Merge conflicts between developers working on different features reduce by 60%
- **SC-010**: 100% of existing functionality continues to work identically (zero user-facing regressions)

### Assumptions

1. **Vue Router is already configured**: Assumes the application currently uses Vue Router, requiring only route consolidation, not initial setup
2. **Pinia is already installed**: Assumes Pinia is available as a dependency, requiring only migration from Vuex, not new installation
3. **WeWeb functionality can be replaced**: Assumes that all WeWeb plugin functionality currently in use can be identified and replaced with native Vue implementations without loss of features
4. **Team agrees on feature module structure**: Assumes stakeholders approve the feature-based organization approach
5. **Big-bang migration approach**: The refactoring will be completed in a single release with extensive pre-release testing rather than incremental releases. This requires comprehensive staging environment validation before production deployment.
6. **Existing tests adequately cover functionality**: Assumes current test coverage is sufficient to catch regressions during refactoring
7. **Environment variables can be changed**: Assumes deployment configurations can be updated to use new variable names
8. **WeWeb plugin audit feasible**: Assumes a complete audit of WeWeb plugin usage can be conducted, and native Vue alternatives can be implemented within the migration timeline
