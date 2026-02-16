# API Contracts: Bug Report System

**Feature**: 021-bug-report-system
**Date**: 2026-01-07

## Overview

This feature uses a hybrid approach:
- **Frontend → Supabase**: Direct CRUD operations via RLS
- **Frontend → Backend**: Only for ClickUp email integration

---

## Frontend (Supabase Direct)

### Bug Reports

#### List Bug Reports

```typescript
// Query
const { data, error } = await supabase
  .from('bug_reports')
  .select(`
    *,
    bug_report_attachments (
      id,
      attachment_type,
      storage_path,
      original_name,
      file_size,
      mime_type,
      is_primary_screenshot
    )
  `)
  .order('created_at', { ascending: false })
  .range(offset, offset + limit - 1);

// Filters (optional)
  .eq('status', 'open')
  .eq('severity', 'critical')
  .gte('created_at', startDate)
  .lte('created_at', endDate)
```

**Response Type:**
```typescript
interface BugReportWithAttachments {
  id: string;
  user_id: string;
  workspace_id: string;
  title: string;
  description: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  bug_type: 'visual' | 'functional' | 'performance' | 'other';
  status: 'open' | 'in_progress' | 'resolved' | 'closed';
  page_url: string;
  browser_info: BrowserInfo;
  console_errors: ConsoleError[];
  clickup_task_id: string | null;
  clickup_sent_at: string | null;
  created_at: string;
  updated_at: string;
  resolved_at: string | null;
  bug_report_attachments: BugReportAttachment[];
}
```

#### Get Single Bug Report

```typescript
const { data, error } = await supabase
  .from('bug_reports')
  .select(`
    *,
    bug_report_attachments (*)
  `)
  .eq('id', bugReportId)
  .single();
```

#### Create Bug Report

```typescript
interface CreateBugReportInput {
  title: string;           // max 200 chars
  description: string;     // min 10 chars
  severity: 'low' | 'medium' | 'high' | 'critical';
  bug_type: 'visual' | 'functional' | 'performance' | 'other';
  page_url: string;
  browser_info: BrowserInfo;
  console_errors: ConsoleError[];
}

// Insert
const { data, error } = await supabase
  .from('bug_reports')
  .insert({
    ...input,
    user_id: userId,
    workspace_id: workspaceId,
    status: 'open',
  })
  .select()
  .single();
```

#### Update Bug Report Status

```typescript
interface UpdateBugReportInput {
  status?: 'open' | 'in_progress' | 'resolved' | 'closed';
  resolved_at?: string | null;
}

const { data, error } = await supabase
  .from('bug_reports')
  .update({
    status: 'resolved',
    resolved_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  })
  .eq('id', bugReportId)
  .select()
  .single();
```

---

### Bug Report Attachments

#### Upload Attachment to Storage

```typescript
// 1. Upload file to Supabase Storage
const filePath = `${userId}/${formatDate(new Date())}/${attachmentType}-${uuid()}.${ext}`;

const { data: uploadData, error: uploadError } = await supabase.storage
  .from('bug-reports')
  .upload(filePath, file, {
    contentType: file.type,
    upsert: false,
  });

// 2. Create attachment record
const { data, error } = await supabase
  .from('bug_report_attachments')
  .insert({
    bug_report_id: bugReportId,
    attachment_type: type,  // 'screenshot' | 'video' | 'file'
    storage_path: filePath,
    original_name: file.name,
    file_size: file.size,
    mime_type: file.type,
    is_primary_screenshot: isPrimary,
  })
  .select()
  .single();
```

#### Get Attachment Public URL

```typescript
const { data } = supabase.storage
  .from('bug-reports')
  .getPublicUrl(storagePath);

// Returns: { publicUrl: string }
```

---

### Bug Report Settings

#### Get User Settings

```typescript
const { data, error } = await supabase
  .from('bug_report_settings')
  .select('*')
  .eq('user_id', userId)
  .single();

// Returns null if no settings exist yet
```

#### Upsert User Settings

```typescript
interface BugReportSettingsInput {
  clickup_email?: string | null;
  button_collapsed?: boolean;
}

const { data, error } = await supabase
  .from('bug_report_settings')
  .upsert({
    user_id: userId,
    ...input,
    updated_at: new Date().toISOString(),
  }, {
    onConflict: 'user_id',
  })
  .select()
  .single();
```

---

## Backend API (NestJS)

### Send to ClickUp

**Endpoint:** `POST /bug-report/send-clickup`

**Purpose:** Send bug report to ClickUp via email integration

**Headers:**
```
Authorization: Bearer <jwt_token>
Content-Type: application/json
```

**Request Body:**
```typescript
interface SendClickUpRequest {
  bugReportId: string;
  clickupEmail: string;  // list.xxx@tasks.clickup.com
}
```

**Response (Success - 200):**
```typescript
interface SendClickUpResponse {
  success: true;
  message: string;
  sentAt: string;  // ISO timestamp
}
```

**Response (Error - 400):**
```typescript
interface ErrorResponse {
  success: false;
  error: string;
  code: 'INVALID_EMAIL' | 'REPORT_NOT_FOUND' | 'ALREADY_SENT';
}
```

**Response (Error - 500):**
```typescript
interface ErrorResponse {
  success: false;
  error: string;
  code: 'EMAIL_FAILED';
}
```

**Backend Implementation Notes:**
1. Validate JWT token
2. Fetch bug report from database (with service_role)
3. Validate ClickUp email format (list.xxx@tasks.clickup.com)
4. Format email body with bug report details
5. Send email via Resend
6. Update bug_reports.clickup_sent_at
7. Return success/failure

---

## TanStack Query Hooks

### Queries

```typescript
// queryKeys.ts
export const queryKeys = {
  bugReports: {
    all: ['bug-reports'] as const,
    list: (filters?: BugReportFilters) => ['bug-reports', 'list', filters] as const,
    detail: (id: string) => ['bug-reports', 'detail', id] as const,
  },
  bugReportSettings: {
    current: ['bug-report-settings'] as const,
  },
};

// queries.ts
export function useBugReports(filters?: BugReportFilters) {
  return useQuery({
    queryKey: queryKeys.bugReports.list(filters),
    queryFn: () => fetchBugReports(filters),
  });
}

export function useBugReport(id: string) {
  return useQuery({
    queryKey: queryKeys.bugReports.detail(id),
    queryFn: () => fetchBugReport(id),
    enabled: !!id,
  });
}

export function useBugReportSettings() {
  return useQuery({
    queryKey: queryKeys.bugReportSettings.current,
    queryFn: fetchBugReportSettings,
  });
}
```

### Mutations

```typescript
// mutations.ts
export function useCreateBugReport() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: createBugReport,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.bugReports.all });
    },
  });
}

export function useUpdateBugReportStatus() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) =>
      updateBugReportStatus(id, status),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.bugReports.detail(id) });
      queryClient.invalidateQueries({ queryKey: queryKeys.bugReports.list() });
    },
  });
}

export function useUploadAttachment() {
  return useMutation({
    mutationFn: uploadAttachment,
  });
}

export function useSendToClickUp() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: sendToClickUp,
    onSuccess: (_, { bugReportId }) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.bugReports.detail(bugReportId) });
    },
  });
}

export function useUpdateBugReportSettings() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: updateBugReportSettings,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.bugReportSettings.current });
    },
  });
}
```

---

## Validation Rules

### Create Bug Report

| Field | Rules |
|-------|-------|
| title | Required, max 200 chars |
| description | Required, min 10 chars |
| severity | Required, enum: low/medium/high/critical |
| bug_type | Required, enum: visual/functional/performance/other |
| page_url | Required, valid URL |
| browser_info | Required, valid JSON object |
| console_errors | Optional, array of ConsoleError objects |

### Upload Attachment

| Field | Rules |
|-------|-------|
| file | Required, max 10MB |
| file.type | Must be in allowed list (png, jpg, gif, mp4, webm, pdf, txt, log) |
| bug_report_id | Required, must exist, must belong to user |
| attachment_type | Required, enum: screenshot/video/file |

### ClickUp Email

| Field | Rules |
|-------|-------|
| clickup_email | Optional, must match pattern: `list.{id}@tasks.clickup.com` |

---

## Error Codes

| Code | HTTP Status | Description |
|------|-------------|-------------|
| VALIDATION_ERROR | 400 | Input validation failed |
| NOT_FOUND | 404 | Bug report not found |
| UNAUTHORIZED | 401 | Not authenticated |
| FORBIDDEN | 403 | Not authorized to access resource |
| FILE_TOO_LARGE | 400 | File exceeds 10MB limit |
| INVALID_FILE_TYPE | 400 | File type not allowed |
| MAX_ATTACHMENTS | 400 | Exceeded 5 attachments limit |
| EMAIL_FAILED | 500 | Failed to send ClickUp email |
| STORAGE_ERROR | 500 | Failed to upload to storage |
