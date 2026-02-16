# Feature Specification: Unified Ads Dashboard

**Feature Branch**: `feat/unified-ads-dashboard`
**Created**: 2026-01-27
**Status**: Draft
**Input**: User description: "Unified Ads Dashboard - Central de anúncios unificada para gerenciar Google Ads e Meta Ads em um só lugar. Permite visualizar campanhas de múltiplas plataformas, métricas de performance consolidadas, automações e histórico de ações. Usa Platform Adapter Pattern para normalizar dados entre plataformas."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - View Unified Campaign List (Priority: P1)

As a marketing manager, I want to see all my Google Ads and Meta Ads campaigns in a single dashboard so I can monitor my advertising efforts without switching between platforms.

**Why this priority**: This is the core value proposition - consolidating campaign visibility across platforms is the primary reason users would adopt this feature over managing platforms separately.

**Independent Test**: Can be fully tested by loading the /ads page and verifying campaigns from both platforms appear in a single table with platform badges identifying their source.

**Acceptance Scenarios**:

1. **Given** a user with active Google Ads and Meta Ads connections, **When** they access /ads, **Then** they see a unified table showing campaigns from both platforms with platform badges
2. **Given** a user viewing the unified dashboard, **When** they click the platform selector to filter by "Google Ads", **Then** only Google campaigns are displayed
3. **Given** a user viewing the unified dashboard, **When** they click the platform selector to filter by "Meta Ads", **Then** only Meta campaigns are displayed
4. **Given** a user viewing the unified dashboard, **When** they click "Both" in the platform selector, **Then** campaigns from both platforms are displayed together

---

### User Story 2 - Monitor Cross-Platform Performance (Priority: P2)

As a marketing manager, I want to see consolidated performance metrics across both advertising platforms so I can understand my total advertising spend and results at a glance.

**Why this priority**: Performance visibility is the second most valuable feature, enabling users to make informed decisions based on aggregated data without manual calculations.

**Independent Test**: Can be tested by navigating to the Performance tab and verifying metric cards show aggregated data from both platforms.

**Acceptance Scenarios**:

1. **Given** a user with campaigns on both platforms, **When** they view the Performance tab with "Both" selected, **Then** they see aggregated totals for impressions, clicks, cost, and conversions
2. **Given** a user viewing aggregated performance, **When** they scroll down, **Then** they see a breakdown showing metrics per platform
3. **Given** a user selecting a date period filter, **When** they choose "Last 7 days", **Then** all metrics update to reflect that time period

---

### User Story 3 - Quick Campaign Actions (Priority: P2)

As a marketing manager, I want to pause, enable, or edit campaigns directly from the unified dashboard so I can manage campaigns without navigating to each platform.

**Why this priority**: Enables users to take action on insights without context switching, completing the "view and act" workflow in one place.

**Independent Test**: Can be tested by selecting a campaign and using the action buttons to pause/enable it, verifying the status updates.

**Acceptance Scenarios**:

1. **Given** an enabled campaign displayed in the unified table, **When** the user clicks "Pause", **Then** a confirmation modal appears and the campaign is paused upon confirmation
2. **Given** a paused campaign, **When** the user clicks "Enable", **Then** the campaign becomes active
3. **Given** any campaign, **When** the user clicks "Edit Budget", **Then** a modal appears allowing them to change the daily budget

---

### User Story 4 - View Automation Rules (Priority: P3)

As a marketing manager, I want to view and manage my Google Ads automation rules from the unified dashboard so I can monitor automatic optimizations in one place.

**Why this priority**: Automations are currently only available for Google Ads; this extends the unified experience but has lower priority since Meta automations are planned for a future phase.

**Independent Test**: Can be tested by navigating to the Automations tab with Google selected and verifying existing rules are displayed.

**Acceptance Scenarios**:

1. **Given** a user with Google Ads automations configured, **When** they view the Automations tab, **Then** they see a list of their automation rules with status indicators
2. **Given** a user selecting only "Meta Ads" platform, **When** they view the Automations tab, **Then** they see a message indicating automations are coming soon for Meta
3. **Given** a user viewing the Automations tab, **When** they click "New Automation", **Then** they are directed to the automation creation workflow

---

### User Story 5 - Review Action History (Priority: P3)

As a marketing manager, I want to see a log of all actions taken on my campaigns (both manual and automated) so I can audit changes and understand what optimizations have been applied.

**Why this priority**: History provides transparency and accountability but is not essential for the core "view and manage" workflow.

**Independent Test**: Can be tested by navigating to the History tab and verifying past actions are displayed with filters working correctly.

**Acceptance Scenarios**:

1. **Given** a user with past campaign actions, **When** they view the History tab, **Then** they see a chronological list of actions with timestamps, action type, and status
2. **Given** a user viewing history, **When** they filter by "Automation" source, **Then** only automated actions are displayed
3. **Given** a user viewing history, **When** they click on an action item, **Then** they see expanded details including previous/new values for budget changes

---

### Edge Cases

- What happens when a user has no connections to any ad platform?
  - Display an empty state with a call-to-action to connect their first ad account
- What happens when API calls to one platform fail while the other succeeds?
  - Show partial data with an error indicator for the failed platform, not a full page error
- What happens when a user has 500+ campaigns across both platforms?
  - Implement pagination with 50 campaigns per page and search/filter functionality
- What happens when campaign data is being loaded?
  - Show skeleton loading states for each section independently
- What happens when a user tries to edit a campaign they don't have permission to modify?
  - Display an appropriate error message from the platform API without crashing

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST display campaigns from Google Ads and Meta Ads in a unified table view
- **FR-002**: System MUST provide a platform selector allowing users to filter by Google, Meta, or Both
- **FR-003**: System MUST persist the user's platform selection across sessions
- **FR-004**: System MUST display a platform badge on each campaign row indicating its source (Google or Meta)
- **FR-005**: System MUST aggregate performance metrics when "Both" platforms are selected
- **FR-006**: System MUST allow users to pause and enable campaigns directly from the dashboard
- **FR-007**: System MUST allow users to edit campaign budgets from the dashboard
- **FR-008**: System MUST display Google Ads automation rules in the Automations tab
- **FR-009**: System MUST log all campaign actions (manual and automated) in the History tab
- **FR-010**: System MUST support filtering history by source (Manual/Automation) and status (Success/Failed)
- **FR-011**: System MUST provide period filters (Today, Yesterday, Last 7 days, Last 30 days) for performance data
- **FR-012**: System MUST normalize metric names across platforms (e.g., both use "Impressions", "Clicks", "CTR", "Cost")
- **FR-013**: System MUST handle API errors gracefully, showing partial data when one platform fails
- **FR-014**: System MUST provide navigation tabs for Campaigns, Performance, Automations, and History

### Key Entities

- **UnifiedCampaign**: A normalized representation of a campaign from either platform, containing common fields (id, name, platform, status, budget, metrics) plus original platform data
- **PlatformConnection**: A user's authenticated connection to Google Ads or Meta Ads, required to fetch campaign data
- **AutomationRule**: A rule that automatically adjusts campaigns based on conditions (currently Google-only)
- **ActionLog**: A record of any action taken on a campaign, including source (manual/automation), type, status, and timestamp

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Users can view campaigns from both platforms in under 3 seconds initial load time
- **SC-002**: Users can switch between platform filters without page reload (instant filtering)
- **SC-003**: 100% of Google Ads dashboard core functionality is accessible through the unified dashboard (campaign list, metrics view, pause/enable actions, budget editing, automation rules view, action history)
- **SC-004**: Users can complete campaign pause/enable actions in under 5 seconds including confirmation
- **SC-005**: Performance metrics accurately reflect the sum of both platforms when "Both" is selected (verified by manual calculation)
- **SC-006**: Users report the unified dashboard reduces time spent managing ads by at least 30% (baseline: pre-launch user interview measuring time to check campaigns on both platforms; post-launch: in-app feedback survey at 2 weeks)
- **SC-007**: Zero data loss or corruption when performing campaign actions through the unified dashboard
- **SC-008**: System gracefully degrades when one platform API is unavailable, showing data from the healthy platform

## Assumptions

- Users already have existing connections to Google Ads and/or Meta Ads configured in the system
- The existing Google Ads dashboard functionality (automations, history, budget management) is stable and working
- Meta Ads API provides sufficient metrics to create meaningful comparisons with Google Ads data
- Currency conversion to USD is acceptable for cross-platform aggregation
- Meta Ads automations will be a future phase and are not required for MVP
- Platform selection persistence uses browser localStorage via Zustand persist middleware
- Existing platform-specific routes (`/alvoads-google`, `/alvoads-meta`) coexist with unified `/ads` during MVP for advanced features (wizards, detailed settings)
