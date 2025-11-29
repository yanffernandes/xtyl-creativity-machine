# Research: System Bugfixes - Pre-Launch Corrections

**Date**: 2025-11-29
**Branch**: `010-system-bugfixes`

## Bug Analysis Summary

### Bug 1: Conversation History Not Persisted (P1)

**Root Cause**: Chat completion endpoints (`/chat/completion`, `/chat/completion-stream`) process messages and return responses but do NOT save to `ChatConversation` model.

**Current State**:
- `ChatConversation` model exists in `backend/models.py` (lines 347-382)
- Fields: `id`, `user_id`, `project_id`, `workspace_id`, `title`, `summary`, `messages_json`, `model_used`, etc.
- `conversations.py` router has endpoints to append messages but no list/load endpoint
- Frontend has no conversation history UI component

**Solution**:
- Decision: Create conversation on first message, append on subsequent messages
- Rationale: Simpler than tracking "new conversation" state separately
- Alternatives considered:
  - Explicit "new conversation" button (rejected: adds friction)
  - Auto-save every N messages (rejected: inconsistent UX)

**Files to Modify**:
- `backend/routers/chat.py` - Save messages after completion
- `backend/routers/conversations.py` - Add `GET /conversations` list endpoint
- `frontend/src/components/ChatHistory.tsx` - New component (scroll infinito)
- `frontend/src/app/workspace/[id]/project/[projectId]/page.tsx` - Integrate history

---

### Bug 2: Visual Assets Appearing in Kanban (P1)

**Root Cause**: `KanbanBoard.tsx` filters documents by status only, not excluding `is_reference_asset=true`.

**Current State**:
- Visual assets uploaded via `/visual-assets/upload` set `is_reference_asset=true`
- Kanban displays all documents matching status filter
- No exclusion logic for reference assets

**Solution**:
- Decision: Add filter `!doc.is_reference_asset` in KanbanBoard
- Rationale: Minimal change, clear separation of concerns
- Alternatives considered:
  - Separate Document types (rejected: existing flag is sufficient)
  - Backend filter (rejected: adds API complexity)

**Files to Modify**:
- `frontend/src/components/KanbanBoard.tsx` - Add filter condition

---

### Bug 3: Activity History Not Displayed (P2)

**Root Cause**: Backend API exists but no frontend component to display it.

**Current State**:
- `ActivityLog` model exists in `backend/models.py` (lines 118-130)
- `activity.py` router has endpoints:
  - `GET /{entity_type}/{entity_id}` - Entity activity
  - `GET /project/{project_id}/recent` - Project activity
  - `GET /user/{user_id}/recent` - User activity
- No frontend component displays this data

**Solution**:
- Decision: Create ActivityHistory component with scroll infinito
- Rationale: Reuse existing API, consistent with chat history pattern
- Alternatives considered:
  - Real-time WebSocket updates (deferred: adds complexity)

**Files to Modify**:
- `frontend/src/components/ActivityHistory.tsx` - New component
- Integration point TBD (sidebar or dedicated tab)

---

### Bug 4: Project Name Not Syncing with Client Name (P2)

**Root Cause**: `PUT /projects/{project_id}/settings` updates settings but doesn't update `project.name`.

**Current State**:
- Project has `name` field and `settings.client_name` field
- These are treated as separate values
- User expects them to be synchronized

**Solution**:
- Decision: Update `project.name` when `client_name` changes in settings
- Rationale: Single source of truth, matches user mental model
- Alternatives considered:
  - Keep separate (rejected: user explicitly requested sync)
  - Remove project.name (rejected: breaking change)

**Files to Modify**:
- `backend/routers/projects.py` - Update `project.name` in settings endpoint

---

### Bug 5: CommandPalette Accessibility Warning (P2)

**Root Cause**: `CommandDialog` component missing `DialogTitle` required by Radix UI for screen readers.

**Current State**:
- Error in console: "DialogContent requires a DialogTitle for screen reader users"
- Stack trace points to `command.tsx:38` and `CommandPalette.tsx:65`
- Radix UI requires DialogTitle for ARIA compliance

**Solution**:
- Decision: Add `VisuallyHidden` wrapped `DialogTitle` to CommandDialog
- Rationale: Standard Radix UI pattern, no visual change
- Alternatives considered:
  - Visible title (rejected: changes design)
  - Suppress warning (rejected: accessibility violation)

**Files to Modify**:
- `frontend/src/components/ui/command.tsx` - Add VisuallyHidden DialogTitle

---

### Bug 6: Profile Email Not Displayed (P3)

**Root Cause**: Profile page reads `user?.email` but needs verification that `/auth/me` returns email.

**Current State**:
- Profile page at `frontend/src/app/workspace/[id]/profile/page.tsx`
- Line 65: `<Input id="email" value={user?.email || ""} disabled />`
- Calls `api.get("/auth/me")` to fetch user

**Solution**:
- Decision: Verify `/auth/me` endpoint returns email from Supabase user
- Rationale: May already work, needs testing
- Alternatives considered:
  - Fetch email from Supabase directly (rejected: API-first principle)

**Files to Modify**:
- `backend/routers/auth.py` - Verify `/auth/me` returns email (may be working)

---

## Key File Locations

| File | Purpose | Action |
|------|---------|--------|
| `backend/models.py` | ChatConversation, ActivityLog, Document models | VERIFY |
| `backend/routers/chat.py` | Chat completion endpoints | MODIFY |
| `backend/routers/conversations.py` | Conversation CRUD | MODIFY |
| `backend/routers/projects.py` | Project settings | MODIFY |
| `backend/routers/auth.py` | User authentication | VERIFY |
| `frontend/src/components/KanbanBoard.tsx` | Kanban display | MODIFY |
| `frontend/src/components/CommandPalette.tsx` | Command palette | VERIFY |
| `frontend/src/components/ui/command.tsx` | Command UI component | MODIFY |
| `frontend/src/app/workspace/[id]/profile/page.tsx` | Profile page | VERIFY |

---

## Implementation Order

Based on priority and dependencies:

1. **Bug 5**: CommandPalette accessibility (low effort, high visibility fix)
2. **Bug 2**: Kanban filter (low effort, P1 priority)
3. **Bug 6**: Profile email (verify only, may be working)
4. **Bug 4**: Project name sync (low effort)
5. **Bug 3**: Activity history UI (medium effort, new component)
6. **Bug 1**: Conversation history (medium effort, most complex)
