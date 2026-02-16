# Feature Specification: AdSense Account Status Display

**Feature Branch**: `20260203-adsense-account-status`
**Created**: 2026-02-03
**Status**: Draft
**Input**: User description: "Display AdSense account state (READY, NEEDS_ATTENTION, CLOSED) when connecting AdSense accounts on the connections page"

## Clarifications

### Session 2026-02-03

- Q: Should account states be refreshed automatically, on page load, or only on explicit user action? → A: Global cron job runs every 6 hours to refresh all AdSense account states in the background. Users see data at most 6h stale without any manual action.
- Q: How should the NEEDS_ATTENTION guidance message be presented? → A: The "Requer Atenção" badge is clickable, opening Google AdSense in a new tab. A tooltip on hover explains the action (e.g., "Clique para resolver no Google AdSense").

## User Scenarios & Testing *(mandatory)*

### User Story 1 - View AdSense Account Status on Connection (Priority: P1)

When a user connects their Google AdSense account via the connections page, the system fetches and stores the account state from the AdSense API. After the connection is established, the user can see each account's operational status (Ready, Needs Attention, or Closed) displayed alongside the account information on the connections page.

**Why this priority**: This is the core feature. Without fetching and displaying the account state, users have no visibility into whether their connected AdSense accounts are operational, require attention, or have been closed by Google. This information is critical for publishers to take timely action.

**Independent Test**: Can be fully tested by connecting an AdSense account and verifying the account state is displayed on the connections page. Delivers immediate visibility into account health.

**Acceptance Scenarios**:

1. **Given** a user initiates an AdSense OAuth connection, **When** the OAuth callback completes successfully, **Then** the system fetches each account's state from the AdSense API and stores it alongside existing account data (id, displayName, currencyCode, timezone).
2. **Given** a user has an active AdSense connection with accounts in READY state, **When** the user views the connections page, **Then** each account displays a green "Pronta" status badge.
3. **Given** a user has an AdSense connection with an account in NEEDS_ATTENTION state, **When** the user views the connections page, **Then** the account displays a clickable yellow/orange "Requer Atenção" badge. Hovering the badge shows a tooltip (e.g., "Clique para resolver no Google AdSense"). Clicking the badge opens Google AdSense in a new tab.
4. **Given** a user has an AdSense connection with an account in CLOSED state, **When** the user views the connections page, **Then** the account displays a red "Encerrada" status badge.
5. **Given** the AdSense API returns STATE_UNSPECIFIED for an account, **When** the user views the connections page, **Then** the account displays a neutral "Desconhecido" status badge.

---

### User Story 2 - Automatic Background Status Refresh (Priority: P2)

A global cron job runs every 6 hours to refresh account states for all active AdSense connections. This ensures users always see reasonably fresh status data without needing to manually trigger a refresh or re-do the OAuth flow.

**Why this priority**: Account states can change at any time on Google's side (e.g., flagged as NEEDS_ATTENTION). A periodic background refresh ensures the displayed data stays current without requiring user intervention. The 6-hour interval balances data freshness against API rate limits.

**Independent Test**: Can be tested by verifying the cron job iterates over all active AdSense connections, fetches updated account states from the API, and writes them back to connection metadata.

**Acceptance Scenarios**:

1. **Given** the system has active AdSense connections, **When** the 6-hour cron cycle triggers, **Then** the system iterates over all active AdSense connections, fetches current account states from the AdSense API, and updates the stored metadata for each.
2. **Given** a connection's token is expired during the cron run, **When** the cron attempts to refresh that connection's accounts, **Then** the system attempts a token refresh first; if the token refresh fails permanently, it marks the connection as needs_reconnect and skips state fetching for that connection.
3. **Given** the AdSense API is temporarily unavailable during a cron run, **When** a state fetch fails for a connection, **Then** the system logs the error and retains the previously stored state (does not overwrite with empty data). The next cron cycle will retry.
4. **Given** the cron successfully updates an account's state from READY to NEEDS_ATTENTION, **When** the user next views the connections page, **Then** the updated status badge is displayed without any manual action from the user.

---

### User Story 3 - Visual Alert for Accounts Needing Attention (Priority: P3)

When any connected AdSense account has a state other than READY, the connections page provides a visual alert or indicator at the connection level so users can quickly identify which connections have issues without expanding each one.

**Why this priority**: This enhances the user experience by surfacing problems proactively. A connection-level indicator saves time when users have multiple connections.

**Independent Test**: Can be tested by having a connection with a NEEDS_ATTENTION account and verifying the connection card shows a warning indicator.

**Acceptance Scenarios**:

1. **Given** a connection has at least one account in NEEDS_ATTENTION or CLOSED state, **When** the user views the connections list, **Then** the connection card displays a warning indicator (icon or badge count) showing the number of accounts requiring attention.
2. **Given** all accounts in a connection are in READY state, **When** the user views the connections list, **Then** no warning indicator is shown on the connection card.

---

### Edge Cases

- What happens when the AdSense API is unreachable during OAuth callback? The connection should still be created with a STATE_UNSPECIFIED status for accounts, and the user should be informed that status could not be determined.
- What happens when an existing connection's metadata has no state field (migrated from before this feature)? The system should treat missing state as STATE_UNSPECIFIED and display "Desconhecido" until the next cron cycle or manual refresh updates it.
- What happens when a connection has multiple accounts with mixed states (e.g., one READY and one CLOSED)? Each account should display its own individual status badge.
- What happens when the user's token is invalid during a cron refresh? The system should follow existing error handling (set needs_reconnect flag) and skip that connection. The user will see the needs_reconnect indicator on the connections page.
- What happens if the cron job encounters rate limiting from the AdSense API? The system should respect rate limits, pause processing, and resume on the next cycle. Connections not yet processed retain their previous state.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST fetch the `state` field from the AdSense Accounts API during the OAuth callback and store it in the connection metadata for each account.
- **FR-002**: System MUST display a localized status badge for each AdSense account on the connections page, using the following mapping:
  - READY -> "Pronta" (green)
  - NEEDS_ATTENTION -> "Requer Atenção" (yellow/orange)
  - CLOSED -> "Encerrada" (red)
  - STATE_UNSPECIFIED or missing -> "Desconhecido" (gray)
- **FR-003**: System MUST run a global cron job every 6 hours that refreshes account states for all active AdSense connections by fetching current data from the AdSense API and updating connection metadata.
- **FR-004**: System MUST handle backward compatibility for existing connections that lack the state field in their metadata, defaulting to STATE_UNSPECIFIED display until the next cron cycle updates them.
- **FR-005**: System MUST show a connection-level warning indicator when any account within a connection has a state other than READY.
- **FR-006**: For accounts in NEEDS_ATTENTION state, the "Requer Atenção" badge MUST be clickable, opening Google AdSense in a new tab. A tooltip on hover MUST explain the action (e.g., "Clique para resolver no Google AdSense").
- **FR-007**: The cron job MUST gracefully handle failures (API errors, expired tokens, rate limits) per connection without affecting other connections in the batch.

### Key Entities

- **AdSense Account State**: Represents the operational status of an AdSense publisher account as reported by Google. Possible values: READY, NEEDS_ATTENTION, CLOSED, STATE_UNSPECIFIED. Stored as part of the account metadata within a connection.
- **Connection**: An existing entity representing an OAuth connection to a Google service. The metadata.accounts array for AdSense connections will be extended to include the `state` field per account.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: 100% of newly created AdSense connections display the account state within the connections page immediately after OAuth completion.
- **SC-002**: Users can identify accounts needing attention within 3 seconds of viewing the connections page (no additional clicks or navigation required).
- **SC-003**: Existing connections without state data display a fallback status ("Desconhecido") rather than broken UI or errors.
- **SC-004**: Account states are automatically refreshed every 6 hours across all active connections without user intervention.
- **SC-005**: Cron job failures for individual connections do not block processing of remaining connections.

## Assumptions

- The Google AdSense Management API v2 `accounts` endpoint returns the `state` field as documented. No additional OAuth scopes are needed beyond the existing `adsense.readonly` scope.
- The `state` field is available for all AdSense account types returned by the API.
- Status labels will be displayed in Portuguese, consistent with the rest of the application.
- The existing connection card layout on the connections page can accommodate per-account status badges without a major redesign.
- The 6-hour cron interval provides sufficient freshness while staying well within AdSense API rate limits for the expected number of connections.
- The backend infrastructure supports scheduling cron jobs (e.g., via NestJS scheduling or an external scheduler).
