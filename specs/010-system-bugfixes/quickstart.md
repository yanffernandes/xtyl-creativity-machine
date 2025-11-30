# Quickstart: System Bugfixes Implementation

**Branch**: `010-system-bugfixes`
**Date**: 2025-11-29

## Quick Reference

### Bug 1: Conversation History (P1)

**Goal**: Save and display chat conversation history

**Backend Changes**:
```python
# backend/routers/conversations.py - ADD endpoint
@router.get("/", response_model=ConversationListResponse)
async def list_conversations(
    project_id: Optional[UUID] = None,
    page: int = 1,
    page_size: int = 20,
    current_user = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    query = db.query(ChatConversation).filter(
        ChatConversation.user_id == current_user.id,
        ChatConversation.is_archived == False
    )
    if project_id:
        query = query.filter(ChatConversation.project_id == project_id)

    total = query.count()
    items = query.order_by(ChatConversation.last_message_at.desc())\
        .offset((page - 1) * page_size)\
        .limit(page_size).all()

    return {
        "items": items,
        "total": total,
        "page": page,
        "page_size": page_size,
        "has_more": (page * page_size) < total
    }
```

```python
# backend/routers/chat.py - After response, save to conversation
# Add at end of completion handler:
conversation = get_or_create_conversation(db, user_id, project_id, workspace_id)
append_message(conversation, "user", user_message)
append_message(conversation, "assistant", response_content)
db.commit()
```

**Frontend Changes**:
```tsx
// frontend/src/components/ChatHistory.tsx
// Scroll infinito pattern with useInfiniteQuery or manual pagination
```

---

### Bug 2: Kanban Filter (P1)

**Goal**: Exclude visual assets from Kanban

**File**: `frontend/src/components/KanbanBoard.tsx`

**Change**:
```tsx
// BEFORE
const columnDocs = documents.filter(doc => (doc.status || "draft") === status);

// AFTER
const columnDocs = documents.filter(doc =>
    (doc.status || "draft") === status &&
    !doc.is_reference_asset
);
```

---

### Bug 3: Activity History (P2)

**Goal**: Display activity log in UI

**Backend**: Already exists at `GET /activity/project/{project_id}/recent`

**Frontend**:
```tsx
// frontend/src/components/ActivityHistory.tsx
// Fetch from /activity/project/{projectId}/recent
// Display: action type icon + entity name + timestamp + user
```

---

### Bug 4: Project Name Sync (P2)

**Goal**: Sync project.name when client_name changes

**File**: `backend/routers/projects.py`

**Change**:
```python
@router.put("/{project_id}/settings")
async def update_project_settings(...):
    # Existing settings update logic
    ...

    # ADD: Sync project name with client_name
    if settings_data.client_name:
        project.name = settings_data.client_name
        db.commit()

    return {"settings": project.settings, "project_name": project.name}
```

---

### Bug 5: CommandPalette Accessibility (P2)

**Goal**: Add DialogTitle for screen readers

**File**: `frontend/src/components/ui/command.tsx`

**Change**:
```tsx
import { VisuallyHidden } from "@radix-ui/react-visually-hidden";
import { DialogTitle } from "@radix-ui/react-dialog";

// Inside CommandDialog component, after DialogContent opens:
<DialogContent>
  <VisuallyHidden>
    <DialogTitle>Command Palette</DialogTitle>
  </VisuallyHidden>
  {/* existing content */}
</DialogContent>
```

---

### Bug 6: Profile Email (P3)

**Goal**: Display user email on profile page

**Verification**: Check `/auth/me` endpoint returns `email` field

**File**: `backend/routers/auth.py`

```python
@router.get("/me")
async def get_current_user_profile(current_user = Depends(get_current_user)):
    return {
        "id": current_user.id,
        "email": current_user.email,  # MUST be present
        "full_name": current_user.full_name
    }
```

---

## Testing Checklist

| Bug | Test Action | Expected Result |
|-----|-------------|-----------------|
| 1 | Send chat message, reload page, check history | Message appears in history |
| 2 | Upload image to Assets, check Kanban | Image NOT in Kanban |
| 3 | Create document, check Activity | "Created" action shows |
| 4 | Change Client Name, check sidebar | Project name updated |
| 5 | Press Cmd+K, check console | No accessibility warning |
| 6 | Go to Profile page | Email displayed |

---

## File Change Summary

| File | Action | Lines |
|------|--------|-------|
| `backend/routers/conversations.py` | MODIFY | +30 |
| `backend/routers/chat.py` | MODIFY | +15 |
| `backend/routers/projects.py` | MODIFY | +5 |
| `backend/schemas.py` | MODIFY | +20 |
| `frontend/src/components/KanbanBoard.tsx` | MODIFY | +1 |
| `frontend/src/components/ui/command.tsx` | MODIFY | +5 |
| `frontend/src/components/ChatHistory.tsx` | CREATE | ~100 |
| `frontend/src/components/ActivityHistory.tsx` | CREATE | ~80 |
| **Total Estimated** | | ~256 lines |
