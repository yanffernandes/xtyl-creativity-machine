# Feature Specification: Custom Alert Dialogs

**Feature Branch**: `014-custom-alerts`
**Created**: 2025-11-30
**Status**: Draft
**Input**: User description: "Alerts de confirmação de exclusão e outros alertas, atualmente estão usando um alert padrão do navegador, construa algo mais personalizado. Revise em todo o sistema para corrigir isso, implementando da forma mais eficiente possível."

## Clarifications

### Session 2025-11-30

- Q: For informational alerts, should they be toast notifications (non-blocking, auto-dismiss) or modal dialogs (blocking, requires acknowledgment)? → A: Toast notifications

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Delete Confirmation with Custom Dialog (Priority: P1)

When a user attempts to delete or archive an item (document, workflow, conversation, folder, image), they should see a visually consistent, branded confirmation dialog instead of the browser's native confirm() dialog. This provides a more professional, cohesive user experience that matches the application's glassmorphism design system.

**Why this priority**: Delete/archive confirmations are the most critical alerts because they involve destructive actions. Users need clear, visually distinct warnings before losing data. This is the most common alert type in the system (10 occurrences).

**Independent Test**: Can be fully tested by attempting to delete any item in the system and verifying the custom dialog appears with proper styling, title, message, and action buttons.

**Acceptance Scenarios**:

1. **Given** a user is viewing a document list, **When** they click to delete a document, **Then** a styled modal dialog appears with the confirmation message, cancel button, and destructive action button styled in red/danger color
2. **Given** a custom confirmation dialog is open, **When** the user clicks "Cancel" or presses Escape, **Then** the dialog closes and no action is taken
3. **Given** a custom confirmation dialog is open, **When** the user clicks the confirm/delete button, **Then** the dialog closes and the deletion proceeds

---

### User Story 2 - Informational Toast Notifications (Priority: P2)

When the system needs to inform users about errors, warnings, or informational messages (e.g., "Maximum 20 images can be attached", "Failed to attach images"), it should display a styled toast notification instead of the browser's native alert() function. Toast notifications are non-blocking, appear in a corner of the screen, auto-dismiss after approximately 5 seconds, and can be manually dismissed by the user.

**Why this priority**: Informational alerts occur less frequently than confirmations but still disrupt the professional appearance of the application when they appear as browser alerts.

**Independent Test**: Can be fully tested by triggering any error condition (e.g., trying to attach more than 20 images) and verifying a styled toast notification appears instead of a browser alert.

**Acceptance Scenarios**:

1. **Given** a user tries to attach more than 20 images, **When** the limit is exceeded, **Then** a styled toast notification appears in the corner with the limit message
2. **Given** an operation fails (e.g., image attachment fails), **When** the error occurs, **Then** a styled error toast notification appears with a clear message
3. **Given** a toast notification is displayed, **When** approximately 5 seconds pass or the user clicks to dismiss, **Then** the notification disappears smoothly

---

### User Story 3 - Consistent Imperative API for Alerts (Priority: P3)

Developers need an easy-to-use API that allows them to call confirmation dialogs and toast notifications imperatively (similar to `if (!confirm("message"))`) without requiring complex component state management for each usage location.

**Why this priority**: The current codebase has 10+ locations using native browser alerts. An efficient migration requires an API that can be easily substituted in place of `confirm()` and `alert()` calls without major refactoring of each component.

**Independent Test**: Can be tested by implementing the API and replacing one `confirm()` call, verifying the same logical flow works with the new imperative API.

**Acceptance Scenarios**:

1. **Given** a developer needs a confirmation dialog, **When** they call the confirmation function, **Then** it returns a promise that resolves to true (confirmed) or false (cancelled)
2. **Given** a developer needs to show a toast notification, **When** they call the toast function, **Then** it displays the message as a non-blocking toast

---

### Edge Cases

- What happens when multiple confirmation dialogs are triggered simultaneously? Only one should be shown at a time; additional requests should queue or wait
- How does the dialog behave when the user presses keyboard shortcuts? Escape should cancel, Enter should confirm the focused action
- What happens if a confirmation dialog is open and the user navigates away? Dialog should close gracefully without blocking navigation
- What happens when multiple toast notifications are triggered? They should stack vertically, each with its own auto-dismiss timer

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST replace all native `confirm()` dialogs with custom styled dialogs matching the application's glassmorphism design system
- **FR-002**: System MUST replace all native `alert()` calls with toast notifications (non-blocking, positioned in corner, auto-dismiss after ~5 seconds)
- **FR-003**: Custom confirmation dialogs MUST display a title, descriptive message, cancel button, and confirm button
- **FR-004**: Destructive action confirmations (delete, archive, revoke) MUST have the confirm button styled with danger/destructive variant
- **FR-005**: Custom dialogs MUST support keyboard navigation (Escape to cancel, Enter or Tab+Enter to confirm)
- **FR-006**: System MUST provide an imperative API that returns Promises for easy migration from `confirm()` and `alert()` patterns
- **FR-007**: All confirmation dialogs MUST maintain accessibility standards (ARIA labels, focus management, screen reader support)
- **FR-008**: Dialogs and toast notifications MUST animate in and out smoothly following the application's animation patterns
- **FR-009**: System MUST handle both Portuguese and English messages as currently used in the codebase
- **FR-010**: Toast notifications MUST support multiple concurrent notifications stacked vertically
- **FR-011**: Toast notifications MUST support different types: info, success, warning, error (with appropriate styling for each)

### Key Entities

- **ConfirmDialog**: Represents a confirmation request with title, message, confirmLabel, cancelLabel, and variant (default, destructive)
- **ToastNotification**: Represents an informational message with message, type (info, success, warning, error), and duration for auto-dismiss (default ~5 seconds)

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: 100% of browser native `confirm()` and `alert()` calls are replaced with custom styled components
- **SC-002**: All custom dialogs and toasts render with consistent styling matching the application's glassmorphism design
- **SC-003**: Users can dismiss confirmation dialogs within 1 second using keyboard or mouse
- **SC-004**: All custom dialogs meet WCAG 2.1 AA accessibility requirements (focus trap, ARIA labels, keyboard navigation)
- **SC-005**: Migration from browser alerts to custom alerts requires minimal code changes per location (single function call replacement)
- **SC-006**: Toast notifications auto-dismiss within 5 seconds unless manually dismissed earlier

## Assumptions

- The existing Shadcn/UI AlertDialog component will be used as the foundation for confirmation dialogs
- Toast notifications will use a toast/sonner library or custom implementation matching the design system
- The implementation will leverage React Context for the imperative API provider
- Current message text (in Portuguese and English) will be preserved as-is
