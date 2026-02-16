# Data Model: React Migration

**Date**: 2025-12-10
**Feature**: 003-react-migration

## Overview

This document maps the existing Supabase database entities to TypeScript interfaces for the React application. The database schema remains unchanged; these interfaces represent the frontend's view of the data.

## Core Entities

### User (from Supabase Auth)

```typescript
interface User {
  id: string                    // UUID
  email: string
  created_at: string            // ISO timestamp
  updated_at: string
  user_metadata: {
    full_name?: string
    avatar_url?: string
  }
}

interface Session {
  access_token: string
  refresh_token: string
  expires_at: number
  user: User
}
```

### Admin

```typescript
interface Admin {
  id: number
  user_id: string               // UUID, FK to auth.users
  role: string                  // FK to admin_roles.id
  notes?: string
  status: 'active' | 'inactive'
  created_at: string
  updated_at: string
  deleted_at?: string
}

interface AdminRole {
  id: string
  public_name: string
  permissions: Record<string, boolean>
  description: string
  status: 'active' | 'inactive'
  created_at: string
  updated_at: string
}
```

### Project

```typescript
interface Project {
  id: number
  user_id: string               // UUID, FK to auth.users
  name: string
  domain?: string
  login?: string
  pass?: string                 // Encrypted WordPress credentials
  status: boolean
  log?: Record<string, any>
  created_at: string
  updated_at?: string
  is_deleted: boolean
  default_language?: string
  token?: string
  wp_version?: string
  plugins?: Record<string, any>[]
  niche_selected?: string
  is_approved_on_adsense: boolean
  adsense_status?: string
  error?: string
}
```

### Article

```typescript
interface Article {
  id: number
  user_id?: string              // UUID
  project_id?: number           // FK to projects
  title?: string
  content?: string              // Rich text HTML
  credits_used?: number
  status?: 'draft' | 'published' | 'scheduled' | 'archived'
  excerpt?: string
  images?: ArticleImage[]
  slug?: string
  words?: number
  wpPost_id?: number
  wpFeaturedMedia_id?: number
  wpCategories_id?: number
  keyword_snapshot?: Record<string, any>
  keyword_used?: string
  date?: string                 // ISO timestamp
  created_at: string
  updated_at?: string
  input_tokens?: number
  output_tokens?: number
  model_used?: string
  is_approval_article: boolean
  imagePrompt?: string
  keyword_inclusion_exclusion?: {
    include?: string[]
    exclude?: string[]
  }
  language?: string
  url_added: boolean
  wpFeaturedMedia_url?: string
}

interface ArticleImage {
  url: string
  alt?: string
  caption?: string
}
```

### Task

```typescript
interface Task {
  id: string                    // UUID
  project_id?: number           // FK to projects
  task_template_id?: number     // FK to task_templates
  category_id?: number          // FK to tasks_categories
  name: string
  description?: string
  sort_order: number
  status: TaskStatus
  user_id?: string              // UUID
  started_at?: string
  completed_at?: string
  estimated_time?: number       // Minutes
  actual_time?: number          // Minutes
  completion_percentage: number // 0-100
  notes?: string
  created_at: string
  updated_at: string
  tags?: string[]
}

type TaskStatus = 'to_do' | 'in_progress' | 'done' | 'blocked'

interface TaskCategory {
  id: number
  name: string
  description?: string
  order: number
  is_active: boolean
  created_at: string
  updated_at?: string
}
```

### Keyword

```typescript
interface Keyword {
  id: number
  word: string
  search_volume?: number
  cpc_min?: number
  cpc_max?: number
  visibility: 'private' | 'public'
  created_at: string
  updated_at?: string
  competition?: 'low' | 'medium' | 'high'
  language?: string
  country?: string
}
```

### Connection

```typescript
interface Connection {
  id: string                    // UUID
  user_id?: string              // UUID
  connection_name?: string
  plataform_name?: string       // Note: typo in DB
  platform_user_id?: string
  access_token?: string
  refresh_token?: string
  token_expires_at?: string
  metadata?: Record<string, any>
  is_active: boolean
  last_used_at?: string
  created_at: string
  updated_at?: string
  deleted_at?: string
  meta_app_id?: string          // UUID
}
```

### Flow (Automation)

```typescript
interface Flow {
  id: string                    // UUID
  user_id: string               // UUID
  name: string
  description?: string
  nodes: FlowNode[]
  edges: FlowEdge[]
  status: 'draft' | 'active' | 'paused'
  trigger_type: 'manual' | 'scheduled' | 'webhook'
  trigger_config?: Record<string, any>
  created_at: string
  updated_at?: string
  last_run_at?: string
}

interface FlowNode {
  id: string
  type: string
  position: { x: number; y: number }
  data: Record<string, any>
}

interface FlowEdge {
  id: string
  source: string
  target: string
  sourceHandle?: string
  targetHandle?: string
}
```

### Run (Execution History)

```typescript
interface Run {
  id: string                    // UUID
  flow_id?: string              // UUID, FK to flows
  user_id: string               // UUID
  status: RunStatus
  started_at: string
  completed_at?: string
  duration_ms?: number
  input_data?: Record<string, any>
  output_data?: Record<string, any>
  error?: string
  logs?: RunLog[]
  created_at: string
}

type RunStatus = 'pending' | 'running' | 'completed' | 'failed' | 'cancelled'

interface RunLog {
  timestamp: string
  level: 'info' | 'warn' | 'error'
  message: string
  data?: Record<string, any>
}
```

## Entity Relationships

```
User (auth.users)
├── Admin (1:1, optional)
├── Project (1:many)
│   ├── Article (1:many)
│   └── Task (1:many)
├── Connection (1:many)
├── Flow (1:many)
│   └── Run (1:many)
├── Keyword (1:many via visibility)
└── Task (1:many, direct assignment)
```

## State Transitions

### Task Status

```
to_do → in_progress → done
  ↓         ↓
blocked ←───┘
```

### Article Status

```
draft → published
  ↓         ↓
scheduled → archived
```

### Run Status

```
pending → running → completed
            ↓          ↓
         failed ←── cancelled
```

## Validation Rules

### Project
- `name`: Required, 1-100 characters
- `domain`: Optional, valid URL format
- `status`: Boolean, default false

### Article
- `title`: Optional but recommended, max 200 characters
- `content`: HTML string, no size limit
- `status`: Enum, default 'draft'
- `completion_percentage`: 0-100

### Task
- `name`: Required, 1-200 characters
- `completion_percentage`: 0-100, constrained by DB
- `status`: Enum, default 'to_do'

### Keyword
- `word`: Required, unique
- `visibility`: 'private' | 'public', default 'private'
