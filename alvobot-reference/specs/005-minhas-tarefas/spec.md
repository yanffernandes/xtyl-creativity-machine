# Feature Spec: Minhas Tarefas

**Version:** 1.0
**Date:** 2025-12-11
**Status**: ✅ Implementado
**Author:** AI Assistant

---

## 1. Overview

### 1.1 Purpose
Provide users with a centralized task management interface where they can view, create, import, and manage tasks associated with their content creation projects.

### 1.2 Goals
- Enable users to track all their tasks in one place
- Support both manual task creation and external data import
- Provide flexible filtering and status management
- Integrate tasks with existing projects
- Maintain security through RLS policies

### 1.3 Non-Goals
- Advanced project management features (Gantt charts, dependencies)
- Team collaboration features (task assignment, comments)
- Time tracking functionality
- Task templates or recurring tasks

---

## 2. User Stories

### 2.1 Core User Stories

**US-01: View My Tasks**
> As a user, I want to see all my tasks in a list view so that I can track my work.

**Acceptance Criteria:**
- Display tasks in a table/list format
- Show task name, status, project, due date, and created date
- Support pagination (20 tasks per page)
- Default sort by created date (newest first)

---

**US-02: Filter Tasks**
> As a user, I want to filter tasks by status, project, and date range so that I can focus on relevant work.

**Acceptance Criteria:**
- Filter by status: all, pendente, em_andamento, concluida
- Filter by project (dropdown with user's projects)
- Filter by date range (created date or due date)
- Multiple filters work together (AND logic)
- Clear all filters button

---

**US-03: Create Manual Task**
> As a user, I want to create tasks manually so that I can track ad-hoc work items.

**Acceptance Criteria:**
- Modal/form with fields: title (required), description, project (optional), due_date (optional)
- Validation: title min 3 chars, max 200 chars
- New tasks default to "pendente" status
- Success notification after creation
- Task appears immediately in the list

---

**US-04: Import Tasks from External Source**
> As a user, I want to import tasks from an external system (based on project and phase) so that I don't have to manually enter them.

**Acceptance Criteria:**
- "Importar Tarefas" button visible in the header (orange/primary color)
- Click opens modal with title: "Selecione o projeto e o estágio que deseja importar"
- Modal contains:
  - Project dropdown: "Projeto" label with "Selecione um projeto" placeholder, lists all user's projects
  - Phase dropdown: "Escolha a fase" label with "Selecione uma fase" placeholder, options:
    - "Seu Blog no Ar" (initial setup phase)
    - "Mineração" (keyword mining phase)
    - "Escala" (scaling phase)
  - "+ Importar Tarefas" primary button (disabled until both selections made)
- Import runs via backend API call with project_id and phase as parameters
- Show loading state during import
- Display success message with count of imported tasks
- Show error message if import fails
- Imported tasks refresh the Kanban board automatically
- Modal closes on successful import

---

**US-05: Update Task Status**
> As a user, I want to update task status so that I can track progress.

**Acceptance Criteria:**
- Status can be changed via dropdown or inline buttons
- Three states: pendente, em_andamento, concluida
- Status updates immediately in the UI (optimistic update)
- Show subtle success indicator
- Rollback on error with error message

---

**US-06: Delete Task**
> As a user, I want to delete tasks I no longer need.

**Acceptance Criteria:**
- Delete icon/button for each task
- Confirmation modal: "Tem certeza que deseja excluir esta tarefa?"
- Soft delete or hard delete (TBD based on requirements)
- Task removed from list immediately
- Success notification

---

### 2.2 Edge Cases

**US-07: Handle Empty State**
> As a new user, I want to see helpful guidance when I have no tasks.

**Acceptance Criteria:**
- Show empty state illustration/icon
- Message: "Você ainda não tem tarefas"
- CTA button: "Criar Primeira Tarefa"
- Import button also visible

---

**US-08: Handle Import Errors**
> As a user, I want clear feedback when task import fails.

**Acceptance Criteria:**
- Show specific error messages (network error, validation error, etc.)
- Allow retry action
- Don't lose existing tasks on failed import

---

## 3. Technical Design

### 3.1 Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                         Frontend                             │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  TasksPage                                            │  │
│  │  ├── TaskFilters (status, project, date)            │  │
│  │  ├── TaskList (table/cards)                         │  │
│  │  ├── CreateTaskModal                                 │  │
│  │  └── ImportTasksModal                                │  │
│  └──────────────────────────────────────────────────────┘  │
│                          ↓                                   │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  TanStack Query Hooks                                 │  │
│  │  ├── useTasks() → Supabase (SELECT)                 │  │
│  │  ├── useCreateTask() → Supabase (INSERT)            │  │
│  │  ├── useUpdateTask() → Supabase (UPDATE)            │  │
│  │  ├── useDeleteTask() → Supabase (DELETE)            │  │
│  │  └── useImportTasks() → Backend API                 │  │
│  └──────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────────┐
│                      Supabase                                │
│  ├── tasks table (RLS enabled)                             │
│  └── projects table (for filter dropdown)                  │
└─────────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────────┐
│                  Backend (NestJS)                            │
│  POST /api/tasks/import                                     │
│  ├── Authenticate user (JWT)                                │
│  ├── Call external API to fetch tasks                       │
│  ├── Transform data to internal format                      │
│  ├── Bulk insert via service_role                           │
│  └── Return count of imported tasks                         │
└─────────────────────────────────────────────────────────────┘
```

---

### 3.2 Database Schema

#### 3.2.1 Tasks Table

```sql
CREATE TABLE tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  project_id UUID REFERENCES projects(id) ON DELETE SET NULL,

  title VARCHAR(200) NOT NULL,
  description TEXT,
  status VARCHAR(20) NOT NULL DEFAULT 'pendente' CHECK (status IN ('pendente', 'em_andamento', 'concluida')),

  due_date TIMESTAMP WITH TIME ZONE,
  completed_at TIMESTAMP WITH TIME ZONE,

  -- Import tracking
  external_id VARCHAR(255), -- ID from external system
  imported_from VARCHAR(50), -- Source system identifier

  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_tasks_user_id ON tasks(user_id);
CREATE INDEX idx_tasks_project_id ON tasks(project_id);
CREATE INDEX idx_tasks_status ON tasks(status);
CREATE INDEX idx_tasks_due_date ON tasks(due_date);
CREATE INDEX idx_tasks_external_id ON tasks(external_id) WHERE external_id IS NOT NULL;

-- Unique constraint for external tasks
CREATE UNIQUE INDEX idx_tasks_unique_external ON tasks(user_id, external_id, imported_from)
WHERE external_id IS NOT NULL AND imported_from IS NOT NULL;
```

#### 3.2.2 Row Level Security Policies

```sql
-- Enable RLS
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;

-- Users can view their own tasks
CREATE POLICY "Users can view own tasks"
  ON tasks FOR SELECT
  USING (auth.uid() = user_id);

-- Users can insert their own tasks
CREATE POLICY "Users can create own tasks"
  ON tasks FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Users can update their own tasks
CREATE POLICY "Users can update own tasks"
  ON tasks FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Users can delete their own tasks
CREATE POLICY "Users can delete own tasks"
  ON tasks FOR DELETE
  USING (auth.uid() = user_id);
```

#### 3.2.3 Triggers

```sql
-- Auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_tasks_updated_at
  BEFORE UPDATE ON tasks
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Auto-set completed_at when status changes to 'concluida'
CREATE OR REPLACE FUNCTION set_completed_at()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'concluida' AND OLD.status != 'concluida' THEN
    NEW.completed_at = NOW();
  ELSIF NEW.status != 'concluida' THEN
    NEW.completed_at = NULL;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_task_completed_at
  BEFORE UPDATE ON tasks
  FOR EACH ROW
  EXECUTE FUNCTION set_completed_at();
```

---

### 3.3 Frontend Implementation

#### 3.3.1 File Structure

```
frontend/src/features/tasks/
├── api/
│   ├── useTasks.ts           # Query hook for fetching tasks
│   ├── useCreateTask.ts      # Mutation for creating tasks
│   ├── useUpdateTask.ts      # Mutation for updating tasks
│   ├── useDeleteTask.ts      # Mutation for deleting tasks
│   └── useImportTasks.ts     # Mutation for importing (calls backend)
├── components/
│   ├── TaskFilters.tsx       # Filter controls
│   ├── TaskList.tsx          # Main list/table component
│   ├── TaskListItem.tsx      # Individual task row/card
│   ├── CreateTaskModal.tsx   # Modal for creating tasks
│   ├── ImportTasksModal.tsx  # Modal for import confirmation
│   ├── TaskStatusBadge.tsx   # Status indicator component
│   └── EmptyTasksState.tsx   # Empty state component
├── pages/
│   └── TasksPage.tsx         # Main page component
├── types/
│   └── task.types.ts         # TypeScript interfaces
└── utils/
    └── taskFilters.ts        # Filter logic utilities
```

#### 3.3.2 TypeScript Types

```typescript
// frontend/src/features/tasks/types/task.types.ts

export type TaskStatus = 'pendente' | 'em_andamento' | 'concluida';

export interface Task {
  id: string;
  user_id: string;
  project_id: string | null;
  title: string;
  description: string | null;
  status: TaskStatus;
  due_date: string | null;
  completed_at: string | null;
  external_id: string | null;
  imported_from: string | null;
  created_at: string;
  updated_at: string;

  // Relations (populated via Supabase joins)
  project?: {
    id: string;
    name: string;
  };
}

export interface CreateTaskInput {
  title: string;
  description?: string;
  project_id?: string;
  due_date?: string;
}

export interface UpdateTaskInput {
  id: string;
  title?: string;
  description?: string;
  status?: TaskStatus;
  project_id?: string;
  due_date?: string;
}

export interface TaskFilters {
  status?: TaskStatus | 'all';
  project_id?: string;
  date_from?: string;
  date_to?: string;
  search?: string;
}

export interface ImportTasksResponse {
  success: boolean;
  count: number;
  message: string;
}
```

#### 3.3.3 API Hooks

```typescript
// frontend/src/features/tasks/api/useTasks.ts

import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/shared/utils/supabase';
import type { Task, TaskFilters } from '../types/task.types';

export function useTasks(filters?: TaskFilters) {
  return useQuery({
    queryKey: ['tasks', filters],
    queryFn: async () => {
      let query = supabase
        .from('tasks')
        .select(`
          *,
          project:projects(id, name)
        `)
        .order('created_at', { ascending: false });

      // Apply filters
      if (filters?.status && filters.status !== 'all') {
        query = query.eq('status', filters.status);
      }

      if (filters?.project_id) {
        query = query.eq('project_id', filters.project_id);
      }

      if (filters?.date_from) {
        query = query.gte('created_at', filters.date_from);
      }

      if (filters?.date_to) {
        query = query.lte('created_at', filters.date_to);
      }

      if (filters?.search) {
        query = query.ilike('title', `%${filters.search}%`);
      }

      const { data, error } = await query;

      if (error) throw error;
      return data as Task[];
    },
  });
}
```

```typescript
// frontend/src/features/tasks/api/useCreateTask.ts

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/shared/utils/supabase';
import type { CreateTaskInput, Task } from '../types/task.types';

export function useCreateTask() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: CreateTaskInput) => {
      const { data, error } = await supabase
        .from('tasks')
        .insert({
          ...input,
          status: 'pendente',
        })
        .select(`
          *,
          project:projects(id, name)
        `)
        .single();

      if (error) throw error;
      return data as Task;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
    },
  });
}
```

```typescript
// frontend/src/features/tasks/api/useUpdateTask.ts

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/shared/utils/supabase';
import type { UpdateTaskInput, Task } from '../types/task.types';

export function useUpdateTask() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...input }: UpdateTaskInput) => {
      const { data, error } = await supabase
        .from('tasks')
        .update(input)
        .eq('id', id)
        .select(`
          *,
          project:projects(id, name)
        `)
        .single();

      if (error) throw error;
      return data as Task;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
    },
  });
}
```

```typescript
// frontend/src/features/tasks/api/useDeleteTask.ts

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/shared/utils/supabase';

export function useDeleteTask() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('tasks')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
    },
  });
}
```

```typescript
// frontend/src/features/tasks/api/useImportTasks.ts

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/shared/utils/api';
import type { ImportTasksResponse } from '../types/task.types';

export function useImportTasks() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      const { data } = await api.post<ImportTasksResponse>('/tasks/import');
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
    },
  });
}
```

#### 3.3.4 Main Page Component

```typescript
// frontend/src/features/tasks/pages/TasksPage.tsx

import { useState } from 'react';
import { TaskFilters } from '../components/TaskFilters';
import { TaskList } from '../components/TaskList';
import { CreateTaskModal } from '../components/CreateTaskModal';
import { ImportTasksModal } from '../components/ImportTasksModal';
import { EmptyTasksState } from '../components/EmptyTasksState';
import { useTasks } from '../api/useTasks';
import type { TaskFilters as TaskFiltersType } from '../types/task.types';

export function TasksPage() {
  const [filters, setFilters] = useState<TaskFiltersType>({});
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);

  const { data: tasks, isLoading } = useTasks(filters);

  const showEmptyState = !isLoading && tasks?.length === 0 && Object.keys(filters).length === 0;

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Minhas Tarefas</h1>
        <div className="flex gap-3">
          <button
            onClick={() => setIsImportModalOpen(true)}
            className="btn btn-secondary"
          >
            Importar Tarefas
          </button>
          <button
            onClick={() => setIsCreateModalOpen(true)}
            className="btn btn-primary"
          >
            + Nova Tarefa
          </button>
        </div>
      </div>

      {/* Empty State */}
      {showEmptyState && (
        <EmptyTasksState
          onCreateTask={() => setIsCreateModalOpen(true)}
          onImportTasks={() => setIsImportModalOpen(true)}
        />
      )}

      {/* Filters and List */}
      {!showEmptyState && (
        <>
          <TaskFilters filters={filters} onChange={setFilters} />
          <TaskList tasks={tasks} isLoading={isLoading} />
        </>
      )}

      {/* Modals */}
      <CreateTaskModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
      />
      <ImportTasksModal
        isOpen={isImportModalOpen}
        onClose={() => setIsImportModalOpen(false)}
      />
    </div>
  );
}
```

---

### 3.4 Backend Implementation

#### 3.4.1 File Structure

```
backend/src/modules/tasks/
├── dto/
│   └── import-tasks.dto.ts
├── tasks.controller.ts
├── tasks.service.ts
└── tasks.module.ts
```

#### 3.4.2 Import Tasks Endpoint

```typescript
// backend/src/modules/tasks/tasks.controller.ts

import { Controller, Post, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '@/common/guards/jwt-auth.guard';
import { CurrentUser } from '@/common/decorators/current-user.decorator';
import { TasksService } from './tasks.service';

@Controller('tasks')
@UseGuards(JwtAuthGuard)
export class TasksController {
  constructor(private readonly tasksService: TasksService) {}

  @Post('import')
  async importTasks(@CurrentUser() user: { id: string }) {
    return this.tasksService.importTasksFromExternal(user.id);
  }
}
```

```typescript
// backend/src/modules/tasks/tasks.service.ts

import { Injectable, HttpException, HttpStatus } from '@nestjs/common';
import { createClient } from '@supabase/supabase-js';
import { ConfigService } from '@nestjs/config';

interface ExternalTask {
  id: string;
  title: string;
  description?: string;
  status?: string;
  dueDate?: string;
}

@Injectable()
export class TasksService {
  private supabase;

  constructor(private configService: ConfigService) {
    this.supabase = createClient(
      this.configService.get('SUPABASE_URL'),
      this.configService.get('SUPABASE_SERVICE_KEY'),
    );
  }

  async importTasksFromExternal(userId: string) {
    try {
      // 1. Fetch tasks from external API
      const externalTasks = await this.fetchExternalTasks(userId);

      if (!externalTasks || externalTasks.length === 0) {
        return {
          success: true,
          count: 0,
          message: 'Nenhuma tarefa nova para importar',
        };
      }

      // 2. Transform to internal format
      const tasksToInsert = externalTasks.map((task) => ({
        user_id: userId,
        title: task.title,
        description: task.description || null,
        status: this.mapExternalStatus(task.status),
        due_date: task.dueDate || null,
        external_id: task.id,
        imported_from: 'external_system', // Replace with actual source
      }));

      // 3. Bulk insert with upsert logic (using external_id as key)
      const { data, error } = await this.supabase
        .from('tasks')
        .upsert(tasksToInsert, {
          onConflict: 'user_id,external_id,imported_from',
          ignoreDuplicates: false, // Update existing tasks
        })
        .select();

      if (error) {
        throw new HttpException(
          `Erro ao importar tarefas: ${error.message}`,
          HttpStatus.INTERNAL_SERVER_ERROR,
        );
      }

      return {
        success: true,
        count: data?.length || 0,
        message: `${data?.length || 0} tarefa(s) importada(s) com sucesso`,
      };
    } catch (error) {
      throw new HttpException(
        error.message || 'Erro ao importar tarefas',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  private async fetchExternalTasks(userId: string): Promise<ExternalTask[]> {
    // TODO: Replace with actual external API call
    // Example: fetch from WordPress, Trello, Asana, etc.

    // Mock implementation:
    // const response = await axios.get(`https://external-api.com/tasks`, {
    //   headers: { Authorization: `Bearer ${token}` },
    //   params: { userId },
    // });
    // return response.data;

    // For now, return empty array
    return [];
  }

  private mapExternalStatus(status?: string): 'pendente' | 'em_andamento' | 'concluida' {
    // Map external status values to internal ones
    const statusMap: Record<string, 'pendente' | 'em_andamento' | 'concluida'> = {
      todo: 'pendente',
      pending: 'pendente',
      'in-progress': 'em_andamento',
      'in_progress': 'em_andamento',
      doing: 'em_andamento',
      done: 'concluida',
      completed: 'concluida',
      finished: 'concluida',
    };

    return statusMap[status?.toLowerCase() || ''] || 'pendente';
  }
}
```

---

## 4. UI/UX Design

### 4.1 Layout

**Desktop:**
```
┌─────────────────────────────────────────────────────────────┐
│ Header                                    [Importar] [+ Nova]│
├─────────────────────────────────────────────────────────────┤
│ Filters: [Status ▼] [Projeto ▼] [Data] [Busca] [Limpar]   │
├─────────────────────────────────────────────────────────────┤
│ ┌─────────────────────────────────────────────────────────┐ │
│ │ Task 1  │ Pendente  │ Projeto X │ 15/12  │ [Edit] [Del]│ │
│ ├─────────────────────────────────────────────────────────┤ │
│ │ Task 2  │ Andamento │ Projeto Y │ 20/12  │ [Edit] [Del]│ │
│ └─────────────────────────────────────────────────────────┘ │
│ [← Prev]  Página 1 de 5  [Next →]                           │
└─────────────────────────────────────────────────────────────┘
```

**Mobile:**
```
┌─────────────────┐
│ Minhas Tarefas  │
│ [+] [Import]    │
├─────────────────┤
│ [Filters ▼]     │
├─────────────────┤
│ ┌─────────────┐ │
│ │ Task 1      │ │
│ │ Pendente    │ │
│ │ Projeto X   │ │
│ │ 15/12       │ │
│ └─────────────┘ │
│ ┌─────────────┐ │
│ │ Task 2      │ │
│ └─────────────┘ │
└─────────────────┘
```

### 4.2 Status Colors

- **Pendente:** Gray (#6B7280)
- **Em Andamento:** Blue (#3B82F6)
- **Concluída:** Green (#10B981)

### 4.3 Empty State

```
┌─────────────────────────────────────┐
│          [Icon: Clipboard]          │
│                                     │
│    Você ainda não tem tarefas       │
│                                     │
│  Comece criando uma tarefa ou       │
│  importe de um sistema externo      │
│                                     │
│  [+ Criar Primeira Tarefa]          │
│  [Importar Tarefas]                 │
└─────────────────────────────────────┘
```

---

## 5. API Specification

### 5.1 Backend Endpoints

#### POST /api/tasks/import

Import tasks from external system.

**Authentication:** Required (JWT)

**Request:**
```http
POST /api/tasks/import
Authorization: Bearer {jwt_token}
```

**Response (Success):**
```json
{
  "success": true,
  "count": 15,
  "message": "15 tarefa(s) importada(s) com sucesso"
}
```

**Response (Error):**
```json
{
  "success": false,
  "count": 0,
  "message": "Erro ao conectar com sistema externo"
}
```

**Status Codes:**
- 200: Success
- 401: Unauthorized
- 500: Internal Server Error

---

### 5.2 Supabase Queries

All CRUD operations go directly through Supabase client. Examples:

#### Fetch Tasks
```typescript
supabase
  .from('tasks')
  .select('*, project:projects(id, name)')
  .eq('status', 'pendente')
  .order('created_at', { ascending: false });
```

#### Create Task
```typescript
supabase
  .from('tasks')
  .insert({
    title: 'Nova tarefa',
    description: 'Descrição',
    project_id: 'uuid',
    status: 'pendente',
  })
  .select()
  .single();
```

#### Update Task Status
```typescript
supabase
  .from('tasks')
  .update({ status: 'concluida' })
  .eq('id', 'task-uuid')
  .select()
  .single();
```

#### Delete Task
```typescript
supabase
  .from('tasks')
  .delete()
  .eq('id', 'task-uuid');
```

---

## 6. Testing Strategy

### 6.1 Unit Tests

**Frontend:**
- Task filter logic
- Date formatting utilities
- Status mapping functions

**Backend:**
- External API data transformation
- Status mapping
- Error handling

### 6.2 Integration Tests

**Frontend:**
- TanStack Query hooks with mocked Supabase
- Form validation in CreateTaskModal
- Filter combinations

**Backend:**
- Import endpoint with mocked external API
- Supabase bulk insert

### 6.3 E2E Tests

- Create a task manually
- Import tasks (with mocked backend)
- Update task status
- Delete a task
- Apply filters and see results
- Empty state displays correctly

---

## 7. Security Considerations

### 7.1 Row Level Security (RLS)

- All RLS policies enforce `user_id = auth.uid()`
- Users can only CRUD their own tasks
- Backend uses `service_role` only for bulk import (validated by JWT)

### 7.2 Input Validation

**Frontend:**
- Title: 3-200 characters, required
- Description: max 2000 characters, optional
- Due date: valid date format, optional
- Project ID: must be valid UUID and belong to user

**Backend:**
- Validate JWT token
- Sanitize external API data before insert
- Prevent SQL injection via parameterized queries

### 7.3 Rate Limiting

- Import endpoint: max 1 request per minute per user
- CRUD operations: standard API rate limits (60 req/min)

---

## 8. Performance Considerations

### 8.1 Database

- Indexes on `user_id`, `status`, `project_id`, `due_date`
- Pagination (20 tasks per page)
- Limit SELECT to necessary columns

### 8.2 Frontend

- TanStack Query caching (5 min stale time)
- Optimistic updates for status changes
- Debounced search input (300ms)
- Virtualized list if >100 tasks

### 8.3 Backend

- Bulk insert for imports (batch size: 500)
- Cache external API responses (1 min TTL)
- Async processing for large imports

---

## 9. Accessibility

- Keyboard navigation for all actions
- ARIA labels on all interactive elements
- Screen reader announcements for status changes
- Focus trap in modals
- High contrast mode support
- Minimum touch target size: 44x44px

---

## 10. Internationalization

All user-facing text in Portuguese (pt-BR):

| Key | Text |
|-----|------|
| tasks.title | Minhas Tarefas |
| tasks.create | Nova Tarefa |
| tasks.import | Importar Tarefas |
| tasks.status.pendente | Pendente |
| tasks.status.em_andamento | Em Andamento |
| tasks.status.concluida | Concluída |
| tasks.empty.title | Você ainda não tem tarefas |
| tasks.empty.description | Comece criando uma tarefa ou importe de um sistema externo |
| tasks.delete.confirm | Tem certeza que deseja excluir esta tarefa? |

---

## 11. Migration Plan

### 11.1 Database Migration

```sql
-- File: migrations/005_create_tasks_table.sql

-- Create tasks table
CREATE TABLE tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  project_id UUID REFERENCES projects(id) ON DELETE SET NULL,

  title VARCHAR(200) NOT NULL,
  description TEXT,
  status VARCHAR(20) NOT NULL DEFAULT 'pendente' CHECK (status IN ('pendente', 'em_andamento', 'concluida')),

  due_date TIMESTAMP WITH TIME ZONE,
  completed_at TIMESTAMP WITH TIME ZONE,

  external_id VARCHAR(255),
  imported_from VARCHAR(50),

  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_tasks_user_id ON tasks(user_id);
CREATE INDEX idx_tasks_project_id ON tasks(project_id);
CREATE INDEX idx_tasks_status ON tasks(status);
CREATE INDEX idx_tasks_due_date ON tasks(due_date);
CREATE INDEX idx_tasks_external_id ON tasks(external_id) WHERE external_id IS NOT NULL;

-- Unique constraint
CREATE UNIQUE INDEX idx_tasks_unique_external ON tasks(user_id, external_id, imported_from)
WHERE external_id IS NOT NULL AND imported_from IS NOT NULL;

-- RLS Policies
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own tasks"
  ON tasks FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create own tasks"
  ON tasks FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own tasks"
  ON tasks FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own tasks"
  ON tasks FOR DELETE
  USING (auth.uid() = user_id);

-- Triggers
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_tasks_updated_at
  BEFORE UPDATE ON tasks
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE OR REPLACE FUNCTION set_completed_at()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'concluida' AND OLD.status != 'concluida' THEN
    NEW.completed_at = NOW();
  ELSIF NEW.status != 'concluida' THEN
    NEW.completed_at = NULL;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_task_completed_at
  BEFORE UPDATE ON tasks
  FOR EACH ROW
  EXECUTE FUNCTION set_completed_at();
```

### 11.2 Rollback Plan

```sql
-- Rollback migration
DROP TRIGGER IF EXISTS set_task_completed_at ON tasks;
DROP TRIGGER IF EXISTS update_tasks_updated_at ON tasks;
DROP FUNCTION IF EXISTS set_completed_at();
DROP FUNCTION IF EXISTS update_updated_at_column();
DROP TABLE IF EXISTS tasks CASCADE;
```

---

## 12. Monitoring & Analytics

### 12.1 Metrics to Track

- Number of tasks created per user
- Task completion rate (concluída / total)
- Import success rate
- Average tasks per project
- Filter usage frequency

### 12.2 Error Tracking

- Supabase query errors
- Import API failures
- Frontend React errors (Error Boundary)

### 12.3 Performance Metrics

- Page load time
- Time to first task displayed
- Import operation duration

---

## 13. Future Enhancements

### 13.1 Phase 2 (Not in MVP)

- Task assignment to team members
- Subtasks / checklists
- Task attachments (files)
- Comments on tasks
- Task templates
- Recurring tasks
- Bulk actions (multi-select, bulk delete, bulk status update)

### 13.2 Phase 3

- Gantt chart view
- Calendar view
- Task dependencies
- Time tracking per task
- Task priority levels
- Custom task fields

---

## 14. Dependencies

### 14.1 External Libraries

**Frontend:**
- `@tanstack/react-query` - Already installed
- `@supabase/supabase-js` - Already installed
- `react-hook-form` - Already installed
- `zod` - Already installed
- `date-fns` - For date formatting (install if not present)

**Backend:**
- `@nestjs/common` - Already installed
- `@nestjs/passport` - Already installed
- `@supabase/supabase-js` - Already installed

### 14.2 Internal Dependencies

- Requires `projects` table (from previous features)
- Requires `auth.users` (Supabase Auth)
- Requires JWT auth guard in backend

---

## 15. Acceptance Criteria Summary

### Must Have (MVP)

- [ ] View list of tasks with pagination
- [ ] Filter by status, project, date range
- [ ] Create task manually via modal
- [ ] Update task status (3 states)
- [ ] Delete task with confirmation
- [ ] Import tasks from external system via backend
- [ ] Show empty state when no tasks
- [ ] All operations secured with RLS
- [ ] Responsive design (desktop + mobile)

### Should Have

- [ ] Search tasks by title
- [ ] Sort tasks by different fields
- [ ] Show task count badges per status
- [ ] Success/error toast notifications

### Could Have

- [ ] Export tasks to CSV
- [ ] Bulk status update
- [ ] Task duplication
- [ ] Quick filters (Today, This Week, Overdue)

### Won't Have (This Version)

- Task assignment
- Comments
- Attachments
- Time tracking
- Gantt/Calendar views

---

## 16. Timeline Estimate

| Phase | Task | Duration |
|-------|------|----------|
| 1 | Database migration & RLS setup | 2h |
| 2 | Backend import endpoint | 3h |
| 3 | Frontend API hooks | 2h |
| 4 | Task list components | 4h |
| 5 | Filter components | 3h |
| 6 | Create/Edit modals | 3h |
| 7 | Import modal & integration | 2h |
| 8 | Empty state & error handling | 2h |
| 9 | Styling & responsiveness | 3h |
| 10 | Testing (unit + integration) | 4h |
| 11 | E2E tests | 2h |
| **Total** | | **30h** (~4 working days) |

---

## 17. Open Questions

1. **External System Details:** Which external system will we import tasks from? (WordPress, Trello, custom API?)
   - **Decision needed:** Define API endpoint and authentication method

2. **Soft Delete vs Hard Delete:** Should deleted tasks be soft-deleted (archived) or permanently removed?
   - **Recommendation:** Soft delete with `deleted_at` timestamp for data recovery

3. **Task Ownership:** Can tasks be shared between users or always private?
   - **Current assumption:** Tasks are private (per user)

4. **Import Frequency:** Should imports be manual only or support automatic sync?
   - **Current assumption:** Manual only (button click)

5. **Project Association:** Is project_id required or optional for tasks?
   - **Current assumption:** Optional (tasks can exist without projects)

---

## 18. Success Metrics

### Launch Criteria

- 0 critical bugs
- All RLS policies tested and verified
- <2s page load time
- >95% import success rate

### Post-Launch Metrics (30 days)

- 80% of users create at least 1 task
- 50% of users use import feature
- Task completion rate >40%
- <5% error rate on all operations

---

## 19. Risk Assessment

| Risk | Probability | Impact | Mitigation |
|------|-------------|--------|------------|
| External API unavailable | Medium | High | Implement retry logic, cache, show clear error |
| Import duplicates tasks | Medium | Medium | Use unique constraint on external_id |
| Performance with 1000+ tasks | Low | Medium | Implement pagination, indexes, virtualization |
| User confusion on filters | Medium | Low | Add tooltips, clear filter button, default view |
| RLS policy errors | Low | High | Thorough testing, separate test environment |

---

## 20. Glossary

| Term | Definition |
|------|------------|
| **Task** | A work item with title, description, status, and optional due date |
| **Status** | Current state of a task: pendente, em_andamento, concluida |
| **Import** | Fetch tasks from external system and save to database |
| **RLS** | Row Level Security - Supabase feature for data access control |
| **Soft Delete** | Mark as deleted without removing from database |
| **Optimistic Update** | Update UI immediately before server confirmation |

---

**END OF SPECIFICATION**
