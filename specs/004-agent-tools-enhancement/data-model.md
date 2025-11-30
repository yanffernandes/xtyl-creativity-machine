# Data Model: Melhoria do Sistema de Ferramentas do Assistente IA

**Feature**: 004-agent-tools-enhancement
**Date**: 2025-11-26

## Entities

### UserPreferences (NEW)

Armazena preferências do assistente IA por usuário.

| Field | Type | Constraints | Description |
|-------|------|-------------|-------------|
| id | UUID | PK, default uuid4 | Identificador único |
| user_id | UUID | FK → users.id, UNIQUE | Usuário dono das preferências |
| autonomous_mode | BOOLEAN | default false | Modo autônomo ativado |
| max_iterations | INTEGER | default 15, min 1, max 50 | Limite de iterações por conversa |
| default_model | VARCHAR(100) | nullable | Modelo LLM preferido |
| use_rag_by_default | BOOLEAN | default true | RAG habilitado por padrão |
| settings | JSONB | default {} | Configurações extensíveis |
| created_at | TIMESTAMP | default now() | Data de criação |
| updated_at | TIMESTAMP | default now(), on update | Última atualização |

**Relationships**:
- 1:1 com User (user_id unique)

**Indexes**:
- user_id (unique) - busca rápida por usuário

---

### TaskExecution (TRANSIENT - não persistido)

Representa uma tarefa planejada pelo assistente durante execução. Existe apenas em memória durante a sessão de chat.

| Field | Type | Description |
|-------|------|-------------|
| id | string | Identificador único da tarefa (uuid ou sequencial) |
| description | string | Descrição legível da tarefa |
| tool_name | string | nullable | Nome da ferramenta associada |
| status | enum | 'pending' \| 'in_progress' \| 'completed' \| 'failed' \| 'skipped' |
| error | string | nullable | Mensagem de erro se failed |
| started_at | timestamp | nullable | Início da execução |
| completed_at | timestamp | nullable | Fim da execução |
| result | object | nullable | Resultado da ferramenta |

---

## Tool Definitions (Additions)

### rename_document

```json
{
  "type": "function",
  "function": {
    "name": "rename_document",
    "description": "Rename an existing document by changing its title",
    "parameters": {
      "type": "object",
      "properties": {
        "document_id": {
          "type": "string",
          "description": "The ID of the document to rename"
        },
        "new_title": {
          "type": "string",
          "description": "The new title for the document"
        }
      },
      "required": ["document_id", "new_title"]
    }
  }
}
```

### rename_folder

```json
{
  "type": "function",
  "function": {
    "name": "rename_folder",
    "description": "Rename an existing folder",
    "parameters": {
      "type": "object",
      "properties": {
        "folder_id": {
          "type": "string",
          "description": "The ID of the folder to rename"
        },
        "new_name": {
          "type": "string",
          "description": "The new name for the folder"
        }
      },
      "required": ["folder_id", "new_name"]
    }
  }
}
```

### get_folder_contents

```json
{
  "type": "function",
  "function": {
    "name": "get_folder_contents",
    "description": "List all documents and subfolders inside a specific folder",
    "parameters": {
      "type": "object",
      "properties": {
        "folder_id": {
          "type": "string",
          "description": "The ID of the folder to list contents from"
        },
        "include_subfolders": {
          "type": "boolean",
          "description": "Whether to include subfolder listings (default: true)"
        }
      },
      "required": ["folder_id"]
    }
  }
}
```

---

## SSE Event Types (Additions)

### task_list

Enviado no início da execução quando múltiplas ações são planejadas.

```typescript
interface TaskListEvent {
  type: 'task_list';
  tasks: Array<{
    id: string;
    description: string;
    tool_name?: string;
    status: 'pending';
  }>;
}
```

### task_update

Enviado quando o status de uma tarefa muda.

```typescript
interface TaskUpdateEvent {
  type: 'task_update';
  task_id: string;
  status: 'in_progress' | 'completed' | 'failed' | 'skipped';
  error?: string;
  duration_ms?: number;
}
```

### tool_retry

Enviado quando uma ferramenta falha e será retentada.

```typescript
interface ToolRetryEvent {
  type: 'tool_retry';
  tool_name: string;
  attempt: number;
  max_attempts: number;
  reason: string;
}
```

### tool_timeout

Enviado quando uma ferramenta atinge o timeout.

```typescript
interface ToolTimeoutEvent {
  type: 'tool_timeout';
  tool_name: string;
  timeout_seconds: number;
}
```

---

## State Transitions

### Task Status Flow

```
pending → in_progress → completed
                     ↘ failed
                     ↘ skipped (se usuário cancelar lista)
```

### Tool Execution Flow (Autonomous Mode)

```
tool_start → executing → tool_complete
                      ↘ tool_retry (1x) → tool_complete
                                       ↘ tool_failed → ask_user_continue
```

### Tool Execution Flow (Manual Mode)

```
tool_approval_request → tool_approved → tool_start → tool_complete
                     ↘ tool_rejected → skip
```

---

## Validation Rules

### UserPreferences

- `max_iterations`: 1 ≤ value ≤ 50
- `default_model`: deve ser modelo válido se especificado
- `settings`: objeto JSON válido

### rename_document

- `document_id`: deve existir e pertencer ao projeto do usuário
- `new_title`: 1-255 caracteres, não pode ser vazio

### rename_folder

- `folder_id`: deve existir e pertencer ao projeto do usuário
- `new_name`: 1-100 caracteres, não pode ser vazio

### get_folder_contents

- `folder_id`: deve existir e pertencer ao projeto do usuário

---

## Migration SQL

```sql
-- Migration 011: Add user_preferences table
CREATE TABLE IF NOT EXISTS user_preferences (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    autonomous_mode BOOLEAN NOT NULL DEFAULT false,
    max_iterations INTEGER NOT NULL DEFAULT 15 CHECK (max_iterations >= 1 AND max_iterations <= 50),
    default_model VARCHAR(100),
    use_rag_by_default BOOLEAN NOT NULL DEFAULT true,
    settings JSONB NOT NULL DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_user_preferences_user_id UNIQUE (user_id)
);

-- Index for fast lookup
CREATE INDEX IF NOT EXISTS idx_user_preferences_user_id ON user_preferences(user_id);

-- Trigger for updated_at
CREATE OR REPLACE FUNCTION update_user_preferences_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER tr_user_preferences_updated_at
    BEFORE UPDATE ON user_preferences
    FOR EACH ROW
    EXECUTE FUNCTION update_user_preferences_updated_at();
```
