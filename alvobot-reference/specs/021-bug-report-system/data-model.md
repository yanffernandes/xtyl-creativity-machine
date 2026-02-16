# Data Model: Bug Report System

**Feature**: 021-bug-report-system
**Date**: 2026-01-07

## Entity Relationship Diagram

```
┌─────────────────────┐       ┌──────────────────────────┐
│   auth.users        │       │     workspaces           │
│   (existing)        │       │     (existing)           │
└─────────┬───────────┘       └────────────┬─────────────┘
          │                                │
          │ user_id                        │ workspace_id
          │                                │
          ▼                                ▼
┌─────────────────────────────────────────────────────────┐
│                     bug_reports                          │
├─────────────────────────────────────────────────────────┤
│ id: UUID (PK)                                           │
│ user_id: UUID (FK → auth.users) NOT NULL                │
│ workspace_id: UUID (FK → workspaces) NOT NULL           │
│ title: VARCHAR(200) NOT NULL                            │
│ description: TEXT NOT NULL                              │
│ severity: VARCHAR(20) NOT NULL                          │
│ bug_type: VARCHAR(20) NOT NULL                          │
│ status: VARCHAR(20) NOT NULL DEFAULT 'open'             │
│ page_url: TEXT NOT NULL                                 │
│ browser_info: JSONB NOT NULL                            │
│ console_errors: JSONB DEFAULT '[]'                      │
│ clickup_task_id: VARCHAR(100)                           │
│ clickup_sent_at: TIMESTAMPTZ                            │
│ created_at: TIMESTAMPTZ DEFAULT NOW()                   │
│ updated_at: TIMESTAMPTZ DEFAULT NOW()                   │
│ resolved_at: TIMESTAMPTZ                                │
└─────────────────────┬───────────────────────────────────┘
                      │
                      │ bug_report_id (1:N)
                      ▼
┌─────────────────────────────────────────────────────────┐
│                bug_report_attachments                    │
├─────────────────────────────────────────────────────────┤
│ id: UUID (PK)                                           │
│ bug_report_id: UUID (FK → bug_reports) NOT NULL         │
│ attachment_type: VARCHAR(20) NOT NULL                   │
│ storage_path: TEXT NOT NULL                             │
│ original_name: VARCHAR(255) NOT NULL                    │
│ file_size: INTEGER NOT NULL                             │
│ mime_type: VARCHAR(100) NOT NULL                        │
│ is_primary_screenshot: BOOLEAN DEFAULT false            │
│ created_at: TIMESTAMPTZ DEFAULT NOW()                   │
└─────────────────────────────────────────────────────────┘


┌─────────────────────────────────────────────────────────┐
│                 bug_report_settings                      │
├─────────────────────────────────────────────────────────┤
│ id: UUID (PK)                                           │
│ user_id: UUID (FK → auth.users) UNIQUE NOT NULL         │
│ clickup_email: VARCHAR(255)                             │
│ button_collapsed: BOOLEAN DEFAULT false                 │
│ created_at: TIMESTAMPTZ DEFAULT NOW()                   │
│ updated_at: TIMESTAMPTZ DEFAULT NOW()                   │
└─────────────────────────────────────────────────────────┘
```

## Entities Detail

### bug_reports

Main entity for storing bug reports.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | UUID | PK, DEFAULT gen_random_uuid() | Unique identifier |
| user_id | UUID | FK, NOT NULL | User who reported |
| workspace_id | UUID | FK, NOT NULL | Workspace context |
| title | VARCHAR(200) | NOT NULL | Short title/summary |
| description | TEXT | NOT NULL, MIN 10 chars | Detailed description |
| severity | VARCHAR(20) | NOT NULL, CHECK | 'low', 'medium', 'high', 'critical' |
| bug_type | VARCHAR(20) | NOT NULL, CHECK | 'visual', 'functional', 'performance', 'other' |
| status | VARCHAR(20) | NOT NULL, DEFAULT 'open' | 'open', 'in_progress', 'resolved', 'closed' |
| page_url | TEXT | NOT NULL | URL where bug was reported |
| browser_info | JSONB | NOT NULL | Browser/OS info |
| console_errors | JSONB | DEFAULT '[]' | Captured console errors |
| clickup_task_id | VARCHAR(100) | NULLABLE | ClickUp task reference if sent |
| clickup_sent_at | TIMESTAMPTZ | NULLABLE | When sent to ClickUp |
| created_at | TIMESTAMPTZ | DEFAULT NOW() | Creation timestamp |
| updated_at | TIMESTAMPTZ | DEFAULT NOW() | Last update timestamp |
| resolved_at | TIMESTAMPTZ | NULLABLE | When marked resolved |

**Indexes:**
- `idx_bug_reports_user_id` ON (user_id)
- `idx_bug_reports_workspace_id` ON (workspace_id)
- `idx_bug_reports_status` ON (status)
- `idx_bug_reports_created_at` ON (created_at DESC)

### bug_report_attachments

Files attached to bug reports (screenshots, videos, other files).

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | UUID | PK, DEFAULT gen_random_uuid() | Unique identifier |
| bug_report_id | UUID | FK, NOT NULL, ON DELETE CASCADE | Parent bug report |
| attachment_type | VARCHAR(20) | NOT NULL, CHECK | 'screenshot', 'video', 'file' |
| storage_path | TEXT | NOT NULL | Path in Supabase Storage |
| original_name | VARCHAR(255) | NOT NULL | Original filename |
| file_size | INTEGER | NOT NULL | Size in bytes |
| mime_type | VARCHAR(100) | NOT NULL | MIME type (image/png, video/webm, etc) |
| is_primary_screenshot | BOOLEAN | DEFAULT false | Auto-captured screenshot flag |
| created_at | TIMESTAMPTZ | DEFAULT NOW() | Upload timestamp |

**Indexes:**
- `idx_bug_report_attachments_report_id` ON (bug_report_id)

### bug_report_settings

User-specific settings for bug reporting.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | UUID | PK, DEFAULT gen_random_uuid() | Unique identifier |
| user_id | UUID | FK, UNIQUE, NOT NULL | One settings row per user |
| clickup_email | VARCHAR(255) | NULLABLE | ClickUp List email address |
| button_collapsed | BOOLEAN | DEFAULT false | Bug button visibility state |
| created_at | TIMESTAMPTZ | DEFAULT NOW() | Creation timestamp |
| updated_at | TIMESTAMPTZ | DEFAULT NOW() | Last update timestamp |

**Indexes:**
- `idx_bug_report_settings_user_id` ON (user_id) UNIQUE

## JSONB Schemas

### browser_info

```typescript
interface BrowserInfo {
  userAgent: string;
  language: string;
  platform: string;
  screenWidth: number;
  screenHeight: number;
  viewportWidth: number;
  viewportHeight: number;
  devicePixelRatio: number;
  online: boolean;
  cookiesEnabled: boolean;
}
```

### console_errors

```typescript
interface ConsoleError {
  type: 'error' | 'warn';
  message: string;
  stack?: string;
  timestamp: number;
  url?: string;
}

// Array of ConsoleError, max 50 items
type ConsoleErrors = ConsoleError[];
```

## Enums

### Severity
- `low` - Baixa prioridade, problema menor
- `medium` - Média prioridade, funcionalidade afetada mas com workaround
- `high` - Alta prioridade, funcionalidade crítica afetada
- `critical` - Crítica, sistema inutilizável

### Bug Type
- `visual` - Problema de UI/UX
- `functional` - Funcionalidade não funciona como esperado
- `performance` - Problema de performance/lentidão
- `other` - Outros tipos de problema

### Status
- `open` - Recém reportado
- `in_progress` - Sendo investigado
- `resolved` - Corrigido
- `closed` - Fechado (duplicado, não reproduzível, etc)

### Attachment Type
- `screenshot` - Imagem capturada automaticamente ou manualmente
- `video` - Gravação de tela
- `file` - Outros arquivos (logs, PDFs, etc)

## Supabase Storage

### Bucket: bug-reports

**Structure:**
```
bug-reports/
├── {user_id}/
│   └── {yyyy-mm-dd}/
│       ├── screenshot-{uuid}.png
│       ├── video-{uuid}.webm
│       └── file-{uuid}.{ext}
```

**Policies:**
- Users can upload to their own folder
- Users can read their own files
- Admins can read all files in workspace

## Row Level Security (RLS)

### bug_reports

```sql
-- Users can view their own reports
CREATE POLICY "Users view own reports"
ON bug_reports FOR SELECT
USING (auth.uid() = user_id);

-- Users can create reports
CREATE POLICY "Users create reports"
ON bug_reports FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Users can update their own reports (status only via specific policy)
CREATE POLICY "Users update own reports"
ON bug_reports FOR UPDATE
USING (auth.uid() = user_id);

-- Admins can view all workspace reports
CREATE POLICY "Admins view workspace reports"
ON bug_reports FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM workspace_members wm
    WHERE wm.workspace_id = bug_reports.workspace_id
    AND wm.user_id = auth.uid()
    AND wm.role = 'owner'
    AND wm.status = 'active'
  )
);

-- Admins can update workspace reports
CREATE POLICY "Admins update workspace reports"
ON bug_reports FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM workspace_members wm
    WHERE wm.workspace_id = bug_reports.workspace_id
    AND wm.user_id = auth.uid()
    AND wm.role = 'owner'
    AND wm.status = 'active'
  )
);
```

### bug_report_attachments

```sql
-- Users can view attachments of their reports
CREATE POLICY "Users view own attachments"
ON bug_report_attachments FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM bug_reports br
    WHERE br.id = bug_report_attachments.bug_report_id
    AND br.user_id = auth.uid()
  )
);

-- Users can add attachments to their reports
CREATE POLICY "Users add attachments"
ON bug_report_attachments FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM bug_reports br
    WHERE br.id = bug_report_attachments.bug_report_id
    AND br.user_id = auth.uid()
  )
);
```

### bug_report_settings

```sql
-- Users can view their own settings
CREATE POLICY "Users view own settings"
ON bug_report_settings FOR SELECT
USING (auth.uid() = user_id);

-- Users can create their settings
CREATE POLICY "Users create settings"
ON bug_report_settings FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Users can update their settings
CREATE POLICY "Users update settings"
ON bug_report_settings FOR UPDATE
USING (auth.uid() = user_id);
```

## Migration SQL

See `database/migrations/003_bug_reports.sql` for complete migration script.
