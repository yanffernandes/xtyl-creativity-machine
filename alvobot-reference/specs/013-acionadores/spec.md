# Feature Specification: Acionadores (Triggers)

**Feature Branch**: `013-acionadores`
**Created**: 2025-12-11
**Status**: ✅ Implementado
**Input**: User description: "Tela de gerenciamento de acionadores/triggers com listagem melhorada, modal de cadastro e edição, suporte a webhooks, schedule, eventos, ativação/pausar, histórico e teste"

## Clarifications

### Session 2025-12-11

- Q: Quais tipos de triggers serão suportados inicialmente? → A: Webhook, Schedule (cron), Evento (database event)
- Q: O histórico deve mostrar quantas ativações? → A: Últimas 100 ativações com paginação
- Q: Teste de acionador deve executar de verdade ou simular? → A: Simular com dados de exemplo, mas permitir execução real para admins

## Overview

Feature for managing automation triggers (acionadores) that initiate workflow executions. Users can create, configure, test, and monitor triggers of different types (webhooks, schedules, events). The system provides a comprehensive UI for trigger management with real-time status monitoring and activation history.

### Current State

- No dedicated triggers management interface exists
- Triggers may be embedded in other features (flows) without centralized control
- No historical tracking of trigger activations
- No testing capability for triggers

### Target State

- **Trigger Types Supported**:
  - Webhook (external HTTP calls trigger flows)
  - Schedule (cron-based time triggers)
  - Event (database event triggers via Supabase Realtime)
- **Management UI**: Full CRUD operations with modals for create/edit
- **Monitoring**: Real-time status display (active, paused, error)
- **History**: Comprehensive activation log with filtering and pagination
- **Testing**: Ability to simulate or execute triggers manually
- **Security**: RLS-based access control, webhook signature validation

## User Scenarios & Testing *(mandatory)*

### User Story 1 - View and Filter Triggers (Priority: P1)

Users can view all their triggers in a table with filtering by type, status, and associated flow.

**Why this priority**: Users need visibility into what triggers exist and their current state before managing them. This is the foundation for all trigger operations.

**Independent Test**: Can be fully tested by creating sample triggers of different types and verifying they appear in the list with correct information (name, type, status, flow, last activation).

**Acceptance Scenarios**:

1. **Given** a user has multiple triggers, **When** they access the triggers page, **Then** they see a table with all triggers showing name, type, status badge, associated flow, and last activation timestamp
2. **Given** a user viewing the triggers list, **When** they filter by type "webhook", **Then** only webhook triggers are displayed
3. **Given** a user viewing the triggers list, **When** they filter by status "active", **Then** only active triggers are shown
4. **Given** a user has no triggers, **When** they access the triggers page, **Then** they see an empty state with a "Create Trigger" call-to-action

---

### User Story 2 - Create Webhook Trigger (Priority: P1)

Users can create a webhook trigger that generates a unique URL to receive external HTTP requests.

**Why this priority**: Webhooks are the most common trigger type for integrations with external services. Essential for automation workflows.

**Independent Test**: Can be tested by creating a webhook trigger, receiving the webhook URL, and verifying the trigger is saved with correct configuration.

**Acceptance Scenarios**:

1. **Given** a user clicks "Create Trigger", **When** they select type "Webhook" and choose a flow, **Then** a unique webhook URL is generated and displayed
2. **Given** a user creating a webhook trigger, **When** they enable signature validation, **Then** a secret key is generated for HMAC verification
3. **Given** a user creating a webhook trigger, **When** they add request filters (e.g., only POST requests with specific headers), **Then** the filters are saved in the trigger configuration
4. **Given** a user saves a webhook trigger, **When** an external service calls the webhook URL, **Then** the associated flow is triggered (tested via backend integration)

---

### User Story 3 - Create Schedule Trigger (Priority: P1)

Users can create a schedule trigger using cron expressions to run flows at specific times/intervals.

**Why this priority**: Time-based automation is critical for recurring tasks (daily reports, weekly updates, etc.).

**Independent Test**: Can be tested by creating a schedule trigger with a cron expression, verifying the next execution time is calculated correctly, and checking the trigger fires at the scheduled time.

**Acceptance Scenarios**:

1. **Given** a user creating a schedule trigger, **When** they enter a cron expression (e.g., "0 9 * * 1" for Mondays at 9am), **Then** the system validates the expression and shows the next 5 execution times
2. **Given** a user creating a schedule trigger, **When** they use the visual cron builder, **Then** the cron expression is generated automatically
3. **Given** a user saves a schedule trigger, **When** they configure a timezone, **Then** the schedule respects the specified timezone
4. **Given** an active schedule trigger, **When** the scheduled time arrives, **Then** the associated flow is executed (tested via backend scheduler)

---

### User Story 4 - Create Event Trigger (Priority: P2)

Users can create event triggers that respond to database changes (insert, update, delete) on specific tables.

**Why this priority**: Event-driven automation is powerful for reacting to data changes but is less commonly used than webhooks and schedules.

**Independent Test**: Can be tested by creating an event trigger for a table insert, then inserting a record and verifying the flow is triggered.

**Acceptance Scenarios**:

1. **Given** a user creating an event trigger, **When** they select a table and event type (insert/update/delete), **Then** the trigger listens for changes on that table
2. **Given** a user creating an event trigger, **When** they add a filter condition (e.g., only trigger if status = 'published'), **Then** the flow only runs when the condition is met
3. **Given** a user saves an event trigger, **When** a matching database event occurs, **Then** the flow receives the event payload with old and new record data
4. **Given** an event trigger with filters, **When** a non-matching change occurs, **Then** the flow is NOT triggered

---

### User Story 5 - Edit and Pause Triggers (Priority: P1)

Users can edit trigger configurations and toggle between active and paused states.

**Why this priority**: Users need control over triggers without deleting them. Pausing is essential for debugging and temporary deactivation.

**Independent Test**: Can be tested by editing a trigger's configuration, saving changes, and toggling status between active and paused.

**Acceptance Scenarios**:

1. **Given** a user viewing a trigger, **When** they click "Edit", **Then** a modal opens pre-filled with current configuration
2. **Given** a user editing a trigger, **When** they change the associated flow, **Then** the new flow is saved and future activations use the new flow
3. **Given** an active trigger, **When** a user clicks the toggle to pause, **Then** the status changes to "paused" and no new activations occur
4. **Given** a paused trigger, **When** a user clicks the toggle to activate, **Then** the status changes to "active" and activations resume

---

### User Story 6 - View Activation History (Priority: P2)

Users can view a detailed history of trigger activations with timestamps, status, and execution details.

**Why this priority**: Historical data is critical for debugging, monitoring, and understanding trigger behavior over time.

**Independent Test**: Can be tested by triggering a flow multiple times and verifying the history shows all activations with correct timestamps and statuses.

**Acceptance Scenarios**:

1. **Given** a user viewing a trigger, **When** they click "View History", **Then** they see the last 100 activations in reverse chronological order
2. **Given** a user viewing activation history, **When** they inspect an activation, **Then** they see timestamp, status (success/failed), execution duration, and error message if failed
3. **Given** a trigger has been activated many times, **When** a user scrolls through history, **Then** pagination loads older activations
4. **Given** a user viewing history, **When** they filter by date range, **Then** only activations within that range are displayed

---

### User Story 7 - Test Trigger (Priority: P2)

Users can manually test a trigger to verify it works correctly before relying on it in production.

**Why this priority**: Testing reduces errors and gives users confidence in their trigger configurations.

**Independent Test**: Can be tested by creating a trigger, clicking "Test", and verifying the flow runs with test data.

**Acceptance Scenarios**:

1. **Given** a user viewing a trigger, **When** they click "Test Trigger", **Then** a modal opens allowing them to input test payload data
2. **Given** a user testing a webhook trigger, **When** they provide test JSON payload, **Then** the flow executes with that payload and shows execution result
3. **Given** a user testing a schedule trigger, **When** they click "Run Now", **Then** the flow executes immediately as if the scheduled time arrived
4. **Given** a user testing an event trigger, **When** they provide test event data, **Then** the flow executes with that event payload
5. **Given** a test execution fails, **When** the user views the result, **Then** they see a clear error message indicating what went wrong

---

### User Story 8 - Delete Trigger (Priority: P3)

Users can delete triggers they no longer need with confirmation.

**Why this priority**: While less urgent, cleanup is necessary for maintaining a tidy trigger list.

**Independent Test**: Can be tested by deleting a trigger and verifying it no longer appears in the list or receives activations.

**Acceptance Scenarios**:

1. **Given** a user viewing a trigger, **When** they click "Delete", **Then** a confirmation modal appears warning about permanent deletion
2. **Given** a user confirms deletion, **When** the trigger is deleted, **Then** it is removed from the list and all future activations stop
3. **Given** a trigger has activation history, **When** it is deleted, **Then** the history is preserved (soft delete) or archived

---

### Edge Cases

- What happens when a webhook URL is called while the trigger is paused? (Log the attempt but do not execute flow, return 200 OK with paused status)
- How does the system handle invalid cron expressions? (Validate on input, show error message, prevent save)
- What happens when a trigger's associated flow is deleted? (Mark trigger as "error" status, prevent activation, show warning)
- How does the system handle concurrent activations of the same trigger? (Queue executions, prevent race conditions)
- What happens when a webhook receives a payload larger than the size limit? (Return 413 Payload Too Large, log error)
- How does the system handle timezone changes for schedule triggers? (Store in UTC, convert for display based on user timezone)

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST support creating webhook triggers with unique URLs and optional signature validation
- **FR-002**: System MUST support creating schedule triggers with cron expression syntax (5-part cron: min hour day month weekday)
- **FR-003**: System MUST support creating event triggers for database table changes (insert, update, delete)
- **FR-004**: System MUST display all triggers in a table with columns: name, type, status, associated flow, last activation
- **FR-005**: System MUST allow filtering triggers by type (webhook, schedule, event) and status (active, paused, error)
- **FR-006**: System MUST provide a modal for creating new triggers with type-specific configuration forms
- **FR-007**: System MUST provide a modal for editing existing triggers with pre-filled current values
- **FR-008**: System MUST allow users to toggle trigger status between active and paused
- **FR-009**: System MUST record activation history with timestamp, status, duration, and error details
- **FR-010**: System MUST provide a history view showing the last 100 activations with pagination
- **FR-011**: System MUST provide a test interface for manually triggering flows with custom payloads
- **FR-012**: System MUST validate cron expressions and show next 5 execution times for schedule triggers
- **FR-013**: System MUST soft-delete triggers to preserve activation history
- **FR-014**: System MUST show empty state when user has no triggers with call-to-action to create first trigger
- **FR-015**: System MUST validate webhook signatures using HMAC-SHA256 when signature validation is enabled
- **FR-016**: System MUST apply RLS policies ensuring users can only access their own triggers
- **FR-017**: System MUST display loading states during trigger operations (create, edit, delete, test)
- **FR-018**: System MUST display error messages when trigger operations fail
- **FR-019**: System MUST generate unique, unguessable webhook URLs (using UUIDs)
- **FR-020**: System MUST support timezone selection for schedule triggers (default to user's timezone)

### Backend-Specific Requirements

- **BR-001**: Backend MUST expose webhook endpoints that validate signatures and trigger flows
- **BR-002**: Backend MUST implement a scheduler service (using node-cron or similar) for schedule triggers
- **BR-003**: Backend MUST listen to Supabase Realtime events for event triggers
- **BR-004**: Backend MUST log all trigger activations to the database for history tracking
- **BR-005**: Backend MUST enforce rate limiting on webhook endpoints (e.g., 100 requests/minute per trigger)
- **BR-006**: Backend MUST validate incoming webhook payloads against configurable schemas
- **BR-007**: Backend MUST handle failed trigger executions with exponential backoff retry logic
- **BR-008**: Backend MUST emit real-time status updates when triggers activate (using Supabase Realtime or SSE)

### Visual Enhancement Requirements

- **VR-001**: System MUST use status badges with semantic colors (green: active, gray: paused, red: error)
- **VR-002**: System SHOULD add icons for each trigger type (webhook: globe icon, schedule: clock icon, event: database icon)
- **VR-003**: System SHOULD display webhook URLs in a copyable input field with copy-to-clipboard button
- **VR-004**: System SHOULD show a visual cron builder for schedule triggers in addition to text input
- **VR-005**: System SHOULD display next execution time prominently for schedule triggers
- **VR-006**: System SHOULD add hover states on table rows showing quick actions (edit, pause/activate, test, delete)
- **VR-007**: System SHOULD use modal transitions for create/edit forms
- **VR-008**: System SHOULD display activation history in a timeline format with status indicators

### Security Requirements

- **SR-001**: System MUST enforce RLS on triggers table ensuring users can only CRUD their own triggers
- **SR-002**: System MUST enforce RLS on trigger_activations table ensuring users can only view their own activation history
- **SR-003**: System MUST validate webhook signatures to prevent unauthorized trigger activations
- **SR-004**: System MUST rate-limit webhook endpoints to prevent abuse
- **SR-005**: System MUST sanitize all user inputs to prevent injection attacks
- **SR-006**: System MUST use HTTPS for all webhook URLs in production
- **SR-007**: System MUST log failed authentication attempts on webhooks
- **SR-008**: System MUST restrict event triggers to tables the user has access to (via RLS)

### Key Entities

#### Trigger (Database Table: `triggers`)

```sql
CREATE TABLE triggers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) NOT NULL,
  name VARCHAR(255) NOT NULL,
  type VARCHAR(50) NOT NULL CHECK (type IN ('webhook', 'schedule', 'event')),
  status VARCHAR(50) NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'paused', 'error')),
  flow_id UUID REFERENCES flows(id) ON DELETE SET NULL,
  configuration JSONB NOT NULL, -- Type-specific config (webhook URL, cron, event filters)
  last_activation_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  deleted_at TIMESTAMP WITH TIME ZONE -- Soft delete
);

-- RLS Policies
ALTER TABLE triggers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own triggers"
  ON triggers FOR SELECT
  USING (auth.uid() = user_id AND deleted_at IS NULL);

CREATE POLICY "Users can create own triggers"
  ON triggers FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own triggers"
  ON triggers FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own triggers"
  ON triggers FOR DELETE
  USING (auth.uid() = user_id);
```

**Configuration Field Structure**:

**Webhook**:
```json
{
  "url": "https://api.alvobot.com/webhooks/abc-123-def",
  "secret": "generated-secret-key",
  "validate_signature": true,
  "allowed_methods": ["POST"],
  "filters": {
    "headers": {"X-Source": "trusted-service"}
  }
}
```

**Schedule**:
```json
{
  "cron": "0 9 * * 1",
  "timezone": "America/Sao_Paulo",
  "next_run_at": "2025-12-18T09:00:00-03:00"
}
```

**Event**:
```json
{
  "table": "articles",
  "event_type": "INSERT",
  "filters": {
    "status": "published"
  }
}
```

#### TriggerActivation (Database Table: `trigger_activations`)

```sql
CREATE TABLE trigger_activations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trigger_id UUID REFERENCES triggers(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES auth.users(id) NOT NULL,
  status VARCHAR(50) NOT NULL CHECK (status IN ('success', 'failed', 'running')),
  payload JSONB, -- Input data that triggered the flow
  result JSONB, -- Flow execution result
  error_message TEXT,
  duration_ms INTEGER, -- Execution time in milliseconds
  activated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- RLS Policies
ALTER TABLE trigger_activations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own activations"
  ON trigger_activations FOR SELECT
  USING (auth.uid() = user_id);

-- Only backend can insert activations (via service_role)
```

**TypeScript Types**:

```typescript
export type TriggerType = 'webhook' | 'schedule' | 'event';
export type TriggerStatus = 'active' | 'paused' | 'error';
export type ActivationStatus = 'success' | 'failed' | 'running';

export interface Trigger {
  id: string;
  user_id: string;
  name: string;
  type: TriggerType;
  status: TriggerStatus;
  flow_id: string | null;
  configuration: WebhookConfig | ScheduleConfig | EventConfig;
  last_activation_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface WebhookConfig {
  url: string;
  secret: string;
  validate_signature: boolean;
  allowed_methods: string[];
  filters?: {
    headers?: Record<string, string>;
  };
}

export interface ScheduleConfig {
  cron: string;
  timezone: string;
  next_run_at: string;
}

export interface EventConfig {
  table: string;
  event_type: 'INSERT' | 'UPDATE' | 'DELETE';
  filters?: Record<string, any>;
}

export interface TriggerActivation {
  id: string;
  trigger_id: string;
  user_id: string;
  status: ActivationStatus;
  payload?: any;
  result?: any;
  error_message?: string;
  duration_ms?: number;
  activated_at: string;
}

export interface CreateTriggerInput {
  name: string;
  type: TriggerType;
  flow_id: string;
  configuration: WebhookConfig | ScheduleConfig | EventConfig;
}

export interface UpdateTriggerInput {
  id: string;
  name?: string;
  status?: TriggerStatus;
  flow_id?: string;
  configuration?: WebhookConfig | ScheduleConfig | EventConfig;
}
```

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Users can create all three trigger types (webhook, schedule, event) without errors
- **SC-002**: Webhook triggers receive external HTTP requests and execute associated flows within 2 seconds
- **SC-003**: Schedule triggers execute at the correct time with less than 30 seconds variance
- **SC-004**: Event triggers respond to database changes within 1 second of the event
- **SC-005**: Trigger list page loads and displays all triggers within 1 second
- **SC-006**: Activation history displays last 100 records with pagination working correctly
- **SC-007**: Cron expression validation works for all common cron patterns
- **SC-008**: Webhook signature validation correctly rejects invalid signatures
- **SC-009**: Users can toggle trigger status (active/paused) and changes take effect immediately
- **SC-010**: Test trigger functionality executes flows and displays results within 5 seconds
- **SC-011**: RLS policies prevent users from accessing triggers belonging to other users
- **SC-012**: All trigger operations (CRUD) have proper loading and error states
- **SC-013**: Empty state displays when user has no triggers with clear call-to-action
- **SC-014**: Mobile responsiveness works on screens 320px and above
- **SC-015**: Webhook rate limiting prevents more than 100 requests/minute per trigger

## Technical Architecture

### Frontend Architecture

```
src/features/triggers/
├── api/
│   ├── useTriggers.ts          # TanStack Query hooks for CRUD
│   ├── useTriggerActivations.ts # Hooks for activation history
│   └── useTestTrigger.ts        # Hook for testing triggers
├── components/
│   ├── TriggerTable.tsx         # Main table component
│   ├── TriggerTypeFilter.tsx    # Filter by type
│   ├── TriggerStatusBadge.tsx   # Status badge component
│   ├── CreateTriggerModal.tsx   # Modal for creating triggers
│   ├── EditTriggerModal.tsx     # Modal for editing triggers
│   ├── TriggerForm.tsx          # Shared form component
│   ├── WebhookForm.tsx          # Webhook-specific fields
│   ├── ScheduleForm.tsx         # Schedule-specific fields (cron builder)
│   ├── EventForm.tsx            # Event-specific fields
│   ├── ActivationHistory.tsx    # History table/timeline
│   ├── TestTriggerModal.tsx     # Testing interface
│   └── TriggerEmptyState.tsx    # Empty state component
├── pages/
│   └── TriggersPage.tsx         # Main page
├── types/
│   └── trigger.types.ts         # TypeScript interfaces
└── utils/
    ├── cronValidator.ts         # Validate and parse cron expressions
    └── webhookUrlGenerator.ts   # Generate unique webhook URLs
```

### Backend Architecture (NestJS)

Since triggers involve webhooks (external calls) and scheduling (background jobs), backend is required.

```
backend/src/modules/triggers/
├── controllers/
│   ├── triggers.controller.ts         # CRUD endpoints
│   ├── webhooks.controller.ts         # Webhook receiver endpoints
│   └── trigger-test.controller.ts     # Test trigger endpoint
├── services/
│   ├── triggers.service.ts            # Business logic for triggers
│   ├── webhook.service.ts             # Webhook validation and handling
│   ├── scheduler.service.ts           # Cron scheduler using node-cron
│   ├── event-listener.service.ts      # Supabase Realtime listener
│   └── trigger-activations.service.ts # Activation history logging
├── dto/
│   ├── create-trigger.dto.ts
│   ├── update-trigger.dto.ts
│   └── test-trigger.dto.ts
├── entities/
│   ├── trigger.entity.ts
│   └── trigger-activation.entity.ts
└── triggers.module.ts
```

**Key Backend Implementation Notes**:

1. **Webhook Receiver**:
   - Dynamic route: `POST /webhooks/:triggerId`
   - Validates signature if enabled
   - Queues flow execution
   - Returns 200 OK immediately (async execution)

2. **Scheduler Service**:
   - On app start, loads all active schedule triggers
   - Uses `node-cron` to schedule tasks
   - Updates `next_run_at` after each execution
   - Handles timezone conversions

3. **Event Listener Service**:
   - Subscribes to Supabase Realtime channels for each active event trigger
   - Applies filters before triggering flows
   - Handles reconnection logic

4. **Flow Execution Integration**:
   - Triggers don't execute flows directly
   - Instead, they call the existing `flows.service.executeFlow(flowId, payload)`
   - This maintains separation of concerns

### Data Flow

**Webhook Trigger Activation**:
```
External Service → POST /webhooks/{triggerId} → Webhook Controller
  → Validate Signature → Webhook Service → Find Trigger
  → Check Status (active?) → Trigger Activations Service (log start)
  → Flows Service (execute flow) → Log Result → Return 200 OK
```

**Schedule Trigger Activation**:
```
Scheduler Service (cron job fires) → Find Trigger → Check Status
  → Trigger Activations Service (log start) → Flows Service (execute)
  → Log Result → Update next_run_at
```

**Event Trigger Activation**:
```
Database Change → Supabase Realtime → Event Listener Service
  → Find Matching Triggers → Apply Filters → For each match:
  → Trigger Activations Service (log start) → Flows Service (execute)
  → Log Result
```

### Frontend-Backend Split

| Operation | Frontend | Backend | Notes |
|-----------|----------|---------|-------|
| List Triggers | ✅ Supabase | ❌ | Direct query with RLS |
| Create Trigger | ✅ Supabase + 🔶 Backend | 🔶 Backend | Frontend inserts to DB, backend registers webhook/schedule/event |
| Update Trigger | ✅ Supabase + 🔶 Backend | 🔶 Backend | Same as create |
| Delete Trigger | ✅ Supabase + 🔶 Backend | 🔶 Backend | Frontend soft-deletes, backend unregisters |
| Toggle Status | ✅ Supabase + 🔶 Backend | 🔶 Backend | Frontend updates status, backend pauses/resumes |
| View History | ✅ Supabase | ❌ | Direct query with RLS |
| Test Trigger | ❌ | ✅ Backend | Backend executes flow with test payload |
| Receive Webhook | ❌ | ✅ Backend | External call handled by backend |
| Schedule Execution | ❌ | ✅ Backend | Cron jobs run in backend |
| Event Listening | ❌ | ✅ Backend | Realtime subscriptions in backend |

**🔶 Indicates**: Frontend makes Supabase call AND calls backend API to register/update/delete the trigger in the backend's internal state (scheduler, event listeners, webhook registry).

### API Endpoints

**Frontend → Backend API Calls**:

```typescript
// Register/Update/Delete operations that need backend state updates
POST   /api/triggers/register       # After creating in Supabase, register in backend
PUT    /api/triggers/:id/register   # After updating in Supabase, update backend
DELETE /api/triggers/:id/unregister # After soft-deleting in Supabase, unregister from backend
POST   /api/triggers/:id/test       # Test trigger execution

// Webhook receiver (called by external services)
POST   /webhooks/:triggerId         # Receive webhook and trigger flow
```

## Implementation Phases

### Phase 1: Core Infrastructure (Week 1)
- ✅ Database schema (triggers, trigger_activations tables)
- ✅ RLS policies
- ✅ Backend module structure
- ✅ Frontend feature folder structure
- ✅ TypeScript types

### Phase 2: Webhook Triggers (Week 1-2)
- ✅ Webhook creation UI (form, URL generation)
- ✅ Backend webhook receiver endpoint
- ✅ Signature validation
- ✅ Integration with flows execution
- ✅ Activation history logging

### Phase 3: Schedule Triggers (Week 2)
- ✅ Schedule creation UI (cron builder)
- ✅ Cron validation and next run calculation
- ✅ Backend scheduler service (node-cron)
- ✅ Timezone handling
- ✅ Schedule trigger execution

### Phase 4: Event Triggers (Week 3)
- ✅ Event creation UI (table selector, event type)
- ✅ Backend Realtime listener service
- ✅ Filter application
- ✅ Event trigger execution

### Phase 5: Management & Testing (Week 3)
- ✅ Edit trigger modal
- ✅ Toggle status (pause/activate)
- ✅ Activation history view
- ✅ Test trigger interface
- ✅ Delete trigger

### Phase 6: Polish & Documentation (Week 4)
- ✅ Error handling and edge cases
- ✅ Loading states and animations
- ✅ Empty states
- ✅ Mobile responsiveness
- ✅ Documentation
- ✅ Unit and E2E tests

## Assumptions

- Flows execution logic already exists and can be called by triggers
- Supabase Realtime is available for event triggers
- Users understand basic cron syntax or can use the visual builder
- Webhook callers can implement HMAC-SHA256 signature generation
- Backend can handle concurrent trigger activations (proper queuing)
- Timezone data is accurate and available (using `Intl` API or libraries)

## Out of Scope

- Custom trigger types beyond webhook, schedule, and event
- Trigger orchestration (one trigger activating another)
- Conditional triggers (complex if/then logic - handled in flows instead)
- Trigger analytics dashboard (metrics, charts)
- Trigger marketplace or templates
- Multi-step trigger workflows
- Trigger versioning
- Trigger sharing between users
- Custom retry strategies per trigger (use default exponential backoff)

## Dependencies

- **Backend**: NestJS module for triggers
- **Flows**: Existing flows execution service
- **Supabase**: Database, RLS, Realtime (for event triggers)
- **Libraries**:
  - Frontend: `react-hook-form`, `zod`, `@tanstack/react-query`
  - Backend: `node-cron` (scheduling), `crypto` (HMAC validation), `@supabase/supabase-js` (Realtime)

## Risks & Mitigations

| Risk | Impact | Mitigation |
|------|--------|------------|
| Webhook abuse/spam | High | Rate limiting (100/min), signature validation, CAPTCHA for creation |
| Cron expression errors | Medium | Strict validation, visual builder, show next runs |
| Event trigger overhead | Medium | Optimize filters, limit active event triggers per user |
| Failed trigger activations | Medium | Retry logic with exponential backoff, error notifications |
| Timezone confusion | Low | Default to user's timezone, show clear UTC times |
| Concurrent activations | Medium | Queuing system, prevent race conditions |

## Testing Strategy

### Unit Tests
- Cron expression validation
- Webhook signature generation and validation
- Filter application logic
- Frontend form validation

### Integration Tests
- Trigger CRUD operations with RLS
- Webhook receiver endpoint
- Scheduler service execution
- Event listener service

### E2E Tests
- Create webhook trigger and call it
- Create schedule trigger and verify execution (with time manipulation)
- Create event trigger and insert record
- View activation history
- Test trigger manually

## Documentation

- User guide on creating and managing triggers
- Webhook integration guide for external services (HMAC signature)
- Cron expression reference
- Event trigger table/column reference
- API documentation for backend endpoints

## Success Metrics (Post-Launch)

- Number of active triggers per user (target: 5+ for engaged users)
- Webhook activation success rate (target: >95%)
- Schedule trigger accuracy (target: <30s variance)
- Event trigger latency (target: <1s)
- Trigger test usage (indicates user confidence)
- Support tickets related to triggers (target: <5/month)
