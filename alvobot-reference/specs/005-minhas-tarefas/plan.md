# Implementation Plan: Minhas Tarefas (Import Tasks Feature)

**Branch**: `005-minhas-tarefas` | **Date**: 2025-12-12 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/005-minhas-tarefas/spec.md`

## Summary

Enhance the existing Tasks (Kanban) feature with task import functionality. Users will be able to import pre-defined tasks based on a selected project and phase (Seu Blog no Ar, Mineração, Escala). The feature requires a new ImportTasksModal component with project/phase selection dropdowns, and a backend endpoint that returns phase-specific task templates.

## Technical Context

**Language/Version**: TypeScript 5.x
**Primary Dependencies**: React 18.2+, TanStack Query, React Hook Form, Zod, Tailwind CSS, shadcn/ui
**Storage**: Supabase PostgreSQL (tasks table exists, task_templates table needed)
**Testing**: Manual testing (no automated tests requested)
**Target Platform**: Web (Desktop + Mobile responsive)
**Project Type**: Web application (frontend + backend)
**Performance Goals**: N/A - standard CRUD operations
**Constraints**: Must work with existing Kanban UI, follow RLS policies
**Scale/Scope**: Single user tasks, estimated <100 tasks per user

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

✅ Uses existing project structure
✅ Follows established patterns (TanStack Query hooks, Supabase direct access)
✅ No new external dependencies required
✅ Reuses existing shared components (Modal, Select, Button)

## Project Structure

### Documentation (this feature)

```text
specs/005-minhas-tarefas/
├── plan.md              # This file
├── spec.md              # Feature specification
└── tasks.md             # Generated task list
```

### Source Code (repository root)

```text
# Web application structure
backend/
├── src/
│   └── modules/
│       └── tasks/           # Task import endpoint
│           ├── tasks.controller.ts
│           ├── tasks.service.ts
│           └── tasks.module.ts

frontend/
├── src/
│   ├── features/
│   │   └── tasks/
│   │       ├── api/
│   │       │   ├── useTasks.ts         # Existing
│   │       │   ├── mutations.ts        # Existing
│   │       │   └── useImportTasks.ts   # NEW: Import mutation
│   │       ├── components/
│   │       │   ├── KanbanBoard.tsx     # Existing
│   │       │   ├── KanbanColumn.tsx    # Existing
│   │       │   ├── KanbanCard.tsx      # Existing
│   │       │   ├── TaskModal.tsx       # Existing
│   │       │   └── ImportTasksModal.tsx # NEW: Import modal
│   │       ├── pages/
│   │       │   └── TasksPage.tsx       # Modify to add import button
│   │       └── types/
│   │           └── index.ts            # Add import types
│   └── shared/
│       └── components/                 # Reuse existing Modal, Select, Button
```

**Structure Decision**: Follows existing web application structure with frontend features pattern.

## Implementation Details

### Phase Constants

The phases for import will be:
```typescript
const IMPORT_PHASES = [
  { value: 'seu_blog_no_ar', label: 'Seu Blog no Ar' },
  { value: 'mineracao', label: 'Mineração' },
  { value: 'escala', label: 'Escala' },
] as const
```

### Database Requirements

**Option A (Recommended): Task Templates Table**
```sql
CREATE TABLE task_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  phase VARCHAR(50) NOT NULL CHECK (phase IN ('seu_blog_no_ar', 'mineracao', 'escala')),
  name VARCHAR(200) NOT NULL,
  description TEXT,
  sort_order INT DEFAULT 0,
  estimated_time INT, -- in minutes
  tags TEXT[],
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Seed data with predefined tasks for each phase
```

**Option B (Simpler): Hardcoded templates in backend**
Return task templates from a static JSON/TypeScript object in the backend service.

### API Contract

**POST /api/tasks/import**
```typescript
// Request
{
  project_id: number
  phase: 'seu_blog_no_ar' | 'mineracao' | 'escala'
}

// Response (Success)
{
  success: true
  count: number
  message: string
  tasks: Task[]
}

// Response (Error)
{
  success: false
  message: string
}
```

### UI Components

**ImportTasksModal Props:**
```typescript
interface ImportTasksModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess?: (count: number) => void
}
```

**Modal Layout:**
- Title: "Selecione o projeto e o estágio que deseja importar ↓"
- Close button (X) in top right
- Project dropdown (full width)
- Phase dropdown (full width)
- Primary button: "+ Importar Tarefas" (orange, full width, right-aligned)

### Styling

Follow existing design system:
- Modal background: white with shadow
- Title: dark text, medium weight
- Dropdowns: existing Select component styling
- Button: orange/primary color (var(--color-primary))
- Spacing: consistent with existing modals

## Dependencies

### Required Before Implementation

1. ✅ Projects feature (useProjects hook exists)
2. ✅ Tasks feature (Kanban board, CRUD operations)
3. ✅ Shared components (Modal, Select, Button)
4. ⚠️ Backend tasks module (may need to be created)
5. ⚠️ Task templates data (need to define tasks for each phase)

### Integration Points

- `useProjects()` - Fetch user's projects for dropdown
- `useCreateTask()` - Could be reused or use dedicated import mutation
- `queryKeys.tasks.all` - Invalidate after import

## Complexity Tracking

No constitution violations. This feature:
- Adds one new component (ImportTasksModal)
- Adds one new API hook (useImportTasks)
- Modifies one existing page (TasksPage - add button)
- Optionally adds backend endpoint (if not using direct Supabase insert)
