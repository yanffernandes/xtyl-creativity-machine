# Data Model: SQLAlchemy -> Drizzle ORM Mapping

**Feature**: 032-full-stack-migration | **Date**: 2026-02-07

## Overview

This document maps every SQLAlchemy model (and migration-only table) in the xtyl-creativity-machine codebase to its Drizzle ORM (TypeScript) equivalent for the full-stack migration from Python/FastAPI to a TypeScript-first backend.

### Mapping Strategy

1. **Introspection first** -- Run `drizzle-kit pull` against the live Supabase database to generate the base schema. This captures column types, defaults, and constraints accurately.
2. **Relations added manually** -- Drizzle does not introspect foreign key relations into its `relations()` helper; these must be declared by hand.
3. **Type conventions**:
   - `pgvector` columns use `vector('column_name', { dimensions: N })` from `drizzle-orm/pg-core` (via `pgvector` extension support).
   - JSONB columns use `jsonb('column_name')`.
   - UUID primary keys use `uuid('id').primaryKey().defaultRandom()`.
   - `TEXT[]` (PostgreSQL array) columns use the `text('col').array()` helper.
   - Timestamps with time zone use `timestamp('col', { withTimezone: true })`.
4. **Soft delete pattern** -- Tables with `deleted_at` columns follow a common soft delete pattern (see Appendix A).
5. **Mixed ID types** -- The database has a historical mix of `varchar` IDs (generated via `uuid_generate_v4()::text`) and native `uuid` IDs. The Drizzle schema preserves the actual database column types.

### Source-of-Truth Files

| Source | Path |
|--------|------|
| SQLAlchemy models | `backend/models.py` |
| Migrations | `supabase/migrations/001-035` |
| Schema dump | `supabase/schema.sql` |

---

## Entity Mapping by Domain

### 1. User & Access Domain

#### 1.1 `users`

**SQLAlchemy**: `User` model | **PK type**: `uuid`

```typescript
import { pgTable, uuid, varchar, boolean, timestamp } from 'drizzle-orm/pg-core';

export const users = pgTable('users', {
  id: uuid('id').primaryKey(), // Synced from auth.users via trigger, no defaultRandom
  email: varchar('email').notNull().unique(),
  fullName: varchar('full_name'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }),

  // Admin Panel (Feature 015)
  isSuperAdmin: boolean('is_super_admin').default(false),
  isBlocked: boolean('is_blocked').default(false),
  blockedAt: timestamp('blocked_at', { withTimezone: true }),
  blockedBy: uuid('blocked_by').references(() => users.id),
});
```

**Relations**:
```typescript
import { relations } from 'drizzle-orm';

export const usersRelations = relations(users, ({ many, one }) => ({
  workspaces: many(workspaceUsers),
  blocker: one(users, {
    fields: [users.blockedBy],
    references: [users.id],
  }),
}));
```

**Indexes** (from migrations 016):
- `idx_users_is_super_admin` on `is_super_admin`
- `idx_users_is_blocked` on `is_blocked`

---

#### 1.2 `workspaces`

**SQLAlchemy**: `Workspace` model | **PK type**: `varchar` (uuid string)

```typescript
export const workspaces = pgTable('workspaces', {
  id: varchar('id').primaryKey(), // uuid_generate_v4()::text
  name: varchar('name').notNull(),
  description: text('description'),
  defaultTextModel: varchar('default_text_model'),
  defaultVisionModel: varchar('default_vision_model'),
  attachmentAnalysisModel: varchar('attachment_analysis_model'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
});
```

**Relations**:
```typescript
export const workspacesRelations = relations(workspaces, ({ many }) => ({
  users: many(workspaceUsers),
  projects: many(projects),
}));
```

**Notes**: `available_models` column was removed in migration 021.

---

#### 1.3 `workspace_users`

**SQLAlchemy**: `WorkspaceUser` model | **PK**: composite (`workspace_id`, `user_id`)

```typescript
export const workspaceUsers = pgTable('workspace_users', {
  workspaceId: varchar('workspace_id')
    .notNull()
    .references(() => workspaces.id),
  userId: uuid('user_id')
    .notNull()
    .references(() => users.id),
  role: varchar('role').default('member'), // 'owner' | 'admin' | 'member'
}, (table) => ({
  pk: primaryKey({ columns: [table.workspaceId, table.userId] }),
}));
```

**Relations**:
```typescript
export const workspaceUsersRelations = relations(workspaceUsers, ({ one }) => ({
  workspace: one(workspaces, {
    fields: [workspaceUsers.workspaceId],
    references: [workspaces.id],
  }),
  user: one(users, {
    fields: [workspaceUsers.userId],
    references: [users.id],
  }),
}));
```

---

#### 1.4 `workspace_invites`

**SQLAlchemy**: `WorkspaceInvite` model | **PK type**: `varchar`

```typescript
export const workspaceInvites = pgTable('workspace_invites', {
  id: varchar('id').primaryKey(),
  workspaceId: varchar('workspace_id')
    .notNull()
    .references(() => workspaces.id),
  email: varchar('email').notNull(),
  role: varchar('role').notNull().default('member'),
  invitedById: uuid('invited_by_id')
    .notNull()
    .references(() => users.id),
  token: varchar('token').notNull().unique(),
  tempPassword: varchar('temp_password'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
  acceptedAt: timestamp('accepted_at', { withTimezone: true }),
  status: varchar('status').notNull().default('pending'), // 'pending' | 'accepted' | 'expired'
});
```

---

#### 1.5 `user_preferences`

**SQLAlchemy**: `UserPreferences` model | **PK type**: `varchar`

```typescript
export const userPreferences = pgTable('user_preferences', {
  id: varchar('id').primaryKey(), // gen_random_uuid()::text
  userId: uuid('user_id')
    .notNull()
    .unique()
    .references(() => users.id, { onDelete: 'cascade' }),
  autonomousMode: boolean('autonomous_mode').notNull().default(false),
  maxIterations: integer('max_iterations').notNull().default(25),
  defaultModel: varchar('default_model', { length: 100 }),
  useRagByDefault: boolean('use_rag_by_default').notNull().default(true),
  settings: jsonb('settings').notNull().default({}),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});
```

**Triggers**: `tr_user_preferences_updated_at` auto-updates `updated_at`.

---

### 2. Content Domain

#### 2.1 `projects`

**SQLAlchemy**: `Project` model | **PK type**: `varchar`

```typescript
export const projects = pgTable('projects', {
  id: varchar('id').primaryKey(),
  name: varchar('name').notNull(),
  description: text('description'),
  workspaceId: varchar('workspace_id').references(() => workspaces.id),
  settings: jsonb('settings').default({}),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  deletedAt: timestamp('deleted_at', { withTimezone: true }), // Soft delete (Feature 020)
});
```

**Relations**:
```typescript
export const projectsRelations = relations(projects, ({ one, many }) => ({
  workspace: one(workspaces, {
    fields: [projects.workspaceId],
    references: [workspaces.id],
  }),
  documents: many(documents),
  folders: many(folders),
}));
```

---

#### 2.2 `folders`

**SQLAlchemy**: `Folder` model | **PK type**: `varchar`

```typescript
export const folders = pgTable('folders', {
  id: varchar('id').primaryKey(),
  name: varchar('name').notNull(),
  parentFolderId: varchar('parent_folder_id').references(() => folders.id, { onDelete: 'cascade' }),
  projectId: varchar('project_id')
    .notNull()
    .references(() => projects.id, { onDelete: 'cascade' }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }),
  deletedAt: timestamp('deleted_at', { withTimezone: true }),
}, (table) => ({
  checkNotSelfParent: check('check_not_self_parent', sql`${table.id} != ${table.parentFolderId}`),
}));
```

**Relations**:
```typescript
export const foldersRelations = relations(folders, ({ one, many }) => ({
  project: one(projects, {
    fields: [folders.projectId],
    references: [projects.id],
  }),
  parent: one(folders, {
    fields: [folders.parentFolderId],
    references: [folders.id],
    relationName: 'parentChild',
  }),
  children: many(folders, { relationName: 'parentChild' }),
  documents: many(documents),
}));
```

---

#### 2.3 `documents`

**SQLAlchemy**: `Document` model | **PK type**: `varchar`

This is the largest table in the system, extended by many features.

```typescript
export const documents = pgTable('documents', {
  id: varchar('id').primaryKey(),
  title: varchar('title'),
  content: text('content'),
  status: varchar('status').default('draft'), // 'draft' | 'text_ok' | 'art_ok' | 'done' | 'published'
  projectId: varchar('project_id').references(() => projects.id),
  folderId: varchar('folder_id').references(() => folders.id, { onDelete: 'set null' }),

  // Media fields
  mediaType: varchar('media_type').default('text'), // 'text' | 'image' | 'pdf' | 'video'
  fileUrl: varchar('file_url'),
  thumbnailUrl: varchar('thumbnail_url'),
  generationMetadata: jsonb('generation_metadata'), // {model, prompt, params, provider, cost_cents, ...}

  // Visual asset fields (Feature 007/011)
  isReferenceAsset: boolean('is_reference_asset').default(false),
  assetType: varchar('asset_type'), // 'logo' | 'background' | 'person' | 'reference' | 'other'
  assetMetadata: jsonb('asset_metadata'), // {tags[], dimensions, file_size, format}

  // Public sharing (Feature 006)
  isPublic: boolean('is_public').default(false),
  shareToken: varchar('share_token').unique(),
  shareExpiresAt: timestamp('share_expires_at', { withTimezone: true }),

  // Context file for RAG (Feature 007)
  isContext: boolean('is_context').default(false),

  // Smart Visual Assets (Feature 011)
  assetCategory: varchar('asset_category', { length: 20 }),
  // Constraint: NULL | 'Logo' | 'Pessoa' | 'Background' | 'Produto' | 'Referencia' | 'Outro'
  assetTags: text('asset_tags').array(), // TEXT[]
  aiDescription: text('ai_description'),

  // Image Refinement (Feature 016)
  originalImageId: varchar('original_image_id').references(() => documents.id),
  refinementHistory: jsonb('refinement_history').default([]), // [{prompt, applied_at}]

  // Agency Studio (Feature 028)
  campaignId: uuid('campaign_id').references(() => campaignPackages.id, { onDelete: 'set null' }),
  tags: text('tags').array().default([]), // TEXT[]
  channel: varchar('channel', { length: 100 }),
  variationSetId: uuid('variation_set_id'),
  variationIndex: integer('variation_index'),
  variationModifier: text('variation_modifier'),
  versionHistory: jsonb('version_history').default([]), // [{content, updated_at}] max 10 FIFO
  currentVersion: integer('current_version').default(1),

  // Timestamps
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }),
  deletedAt: timestamp('deleted_at', { withTimezone: true }),
}, (table) => ({
  chkAssetCategory: check('chk_asset_category',
    sql`${table.assetCategory} IS NULL OR ${table.assetCategory} IN ('Logo', 'Pessoa', 'Background', 'Produto', 'Referencia', 'Outro')`
  ),
}));
```

**Relations**:
```typescript
export const documentsRelations = relations(documents, ({ one, many }) => ({
  project: one(projects, {
    fields: [documents.projectId],
    references: [projects.id],
  }),
  folder: one(folders, {
    fields: [documents.folderId],
    references: [folders.id],
  }),
  originalImage: one(documents, {
    fields: [documents.originalImageId],
    references: [documents.id],
    relationName: 'refinements',
  }),
  refinements: many(documents, { relationName: 'refinements' }),
  attachments: many(documentAttachments),
  campaign: one(campaignPackages, {
    fields: [documents.campaignId],
    references: [campaignPackages.id],
  }),
  masks: many(imageMasks),
}));
```

---

#### 2.4 `document_attachments`

**SQLAlchemy**: `DocumentAttachment` model | **PK type**: `varchar`

```typescript
export const documentAttachments = pgTable('document_attachments', {
  id: varchar('id').primaryKey(),
  documentId: varchar('document_id')
    .notNull()
    .references(() => documents.id, { onDelete: 'cascade' }),
  imageId: varchar('image_id')
    .notNull()
    .references(() => documents.id, { onDelete: 'cascade' }),
  isPrimary: boolean('is_primary').default(false),
  attachmentOrder: integer('attachment_order').default(0),
  createdByWorkflowId: varchar('created_by_workflow_id')
    .references(() => workflowExecutions.id, { onDelete: 'set null' }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
}, (table) => ({
  uniqueDocImage: unique().on(table.documentId, table.imageId),
}));
```

**Relations**:
```typescript
export const documentAttachmentsRelations = relations(documentAttachments, ({ one }) => ({
  document: one(documents, {
    fields: [documentAttachments.documentId],
    references: [documents.id],
    relationName: 'documentAttachments',
  }),
  image: one(documents, {
    fields: [documentAttachments.imageId],
    references: [documents.id],
    relationName: 'attachedImages',
  }),
}));
```

---

#### 2.5 `activity_log`

**SQLAlchemy**: `ActivityLog` model | **PK type**: `varchar`

```typescript
export const activityLog = pgTable('activity_log', {
  id: varchar('id').primaryKey(),
  entityType: varchar('entity_type').notNull(), // 'document' | 'folder'
  entityId: varchar('entity_id').notNull(),
  action: varchar('action').notNull(), // 'create' | 'update' | 'delete' | 'restore' | 'move'
  actorType: varchar('actor_type').notNull(), // 'human' | 'ai'
  userId: uuid('user_id').references(() => users.id),
  changes: jsonb('changes'), // {before: {...}, after: {...}}
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
});
```

**Relations**:
```typescript
export const activityLogRelations = relations(activityLog, ({ one }) => ({
  user: one(users, {
    fields: [activityLog.userId],
    references: [users.id],
  }),
}));
```

---

#### 2.6 `chat_conversations`

**SQLAlchemy**: `ChatConversation` model | **PK type**: `varchar`

```typescript
export const chatConversations = pgTable('chat_conversations', {
  id: varchar('id').primaryKey(),
  userId: uuid('user_id').notNull().references(() => users.id),
  projectId: varchar('project_id').references(() => projects.id),
  workspaceId: varchar('workspace_id')
    .notNull()
    .references(() => workspaces.id),

  // Conversation metadata
  title: varchar('title'),
  summary: text('summary'),
  messagesJson: jsonb('messages_json').notNull().default([]),

  // Context
  modelUsed: varchar('model_used', { length: 100 }),
  documentIdsContext: jsonb('document_ids_context').default([]),
  folderIdsContext: jsonb('folder_ids_context').default([]),

  // Created documents
  createdDocumentIds: jsonb('created_document_ids').default([]),

  // Status
  isArchived: boolean('is_archived').default(false),
  messageCount: integer('message_count').default(0),

  // Timestamps
  lastMessageAt: timestamp('last_message_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }),
});
```

**Relations**:
```typescript
export const chatConversationsRelations = relations(chatConversations, ({ one, many }) => ({
  user: one(users, {
    fields: [chatConversations.userId],
    references: [users.id],
  }),
  project: one(projects, {
    fields: [chatConversations.projectId],
    references: [projects.id],
  }),
  workspace: one(workspaces, {
    fields: [chatConversations.workspaceId],
    references: [workspaces.id],
  }),
  extractedMemories: many(userMemories),
}));
```

---

### 3. Workflow Domain

#### 3.1 `workflow_templates`

**SQLAlchemy**: `WorkflowTemplate` model | **PK type**: `varchar`

```typescript
export const workflowTemplates = pgTable('workflow_templates', {
  id: varchar('id').primaryKey(),
  workspaceId: varchar('workspace_id').references(() => workspaces.id, { onDelete: 'cascade' }),
  projectId: varchar('project_id').references(() => projects.id, { onDelete: 'cascade' }),
  name: varchar('name').notNull(),
  description: text('description'),
  category: varchar('category'), // 'social_media' | 'paid_ads' | 'blog' | 'email' | 'seo'

  // Workflow definition (ReactFlow format)
  nodesJson: jsonb('nodes_json').notNull().default([]),
  edgesJson: jsonb('edges_json').notNull().default([]),
  defaultParamsJson: jsonb('default_params_json').default({}),

  // Template metadata
  isSystem: boolean('is_system').default(false),
  isRecommended: boolean('is_recommended').default(false),
  usageCount: integer('usage_count').default(0),
  version: varchar('version').default('1.0'),
  createdBy: uuid('created_by').references(() => users.id, { onDelete: 'set null' }),

  // Timestamps
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }),
  deletedAt: timestamp('deleted_at', { withTimezone: true }), // Soft delete (Feature 020)
});
```

**Relations**:
```typescript
export const workflowTemplatesRelations = relations(workflowTemplates, ({ one, many }) => ({
  workspace: one(workspaces, {
    fields: [workflowTemplates.workspaceId],
    references: [workspaces.id],
  }),
  project: one(projects, {
    fields: [workflowTemplates.projectId],
    references: [projects.id],
  }),
  creator: one(users, {
    fields: [workflowTemplates.createdBy],
    references: [users.id],
  }),
  executions: many(workflowExecutions),
}));
```

---

#### 3.2 `workflow_executions`

**SQLAlchemy**: `WorkflowExecution` model | **PK type**: `varchar`

```typescript
export const workflowExecutions = pgTable('workflow_executions', {
  id: varchar('id').primaryKey(),
  templateId: varchar('template_id')
    .notNull()
    .references(() => workflowTemplates.id, { onDelete: 'cascade' }),
  projectId: varchar('project_id')
    .notNull()
    .references(() => projects.id, { onDelete: 'cascade' }),
  workspaceId: varchar('workspace_id')
    .notNull()
    .references(() => workspaces.id, { onDelete: 'cascade' }),
  userId: uuid('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),

  // Execution state
  status: varchar('status').notNull().default('pending'),
  // Values: 'pending' | 'running' | 'paused' | 'completed' | 'failed' | 'stopped'
  configJson: jsonb('config_json').default({}),
  executionContext: jsonb('execution_context').default({}),
  progressPercent: integer('progress_percent').default(0),
  currentNodeId: varchar('current_node_id'),
  celeryTaskId: varchar('celery_task_id'),

  // Results and errors
  errorMessage: text('error_message'),
  totalCost: numeric('total_cost', { precision: 10, scale: 6 }).default('0'),
  totalTokensUsed: integer('total_tokens_used').default(0),
  generatedDocumentIds: jsonb('generated_document_ids').default([]),

  // Timing
  startedAt: timestamp('started_at', { withTimezone: true }),
  completedAt: timestamp('completed_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  deletedAt: timestamp('deleted_at', { withTimezone: true }), // Soft delete (Feature 020)
});
```

**Relations**:
```typescript
export const workflowExecutionsRelations = relations(workflowExecutions, ({ one, many }) => ({
  template: one(workflowTemplates, {
    fields: [workflowExecutions.templateId],
    references: [workflowTemplates.id],
  }),
  project: one(projects, {
    fields: [workflowExecutions.projectId],
    references: [projects.id],
  }),
  workspace: one(workspaces, {
    fields: [workflowExecutions.workspaceId],
    references: [workspaces.id],
  }),
  user: one(users, {
    fields: [workflowExecutions.userId],
    references: [users.id],
  }),
  agentJobs: many(agentJobs),
  nodeOutputs: many(nodeOutputs),
}));
```

---

#### 3.3 `agent_jobs`

**SQLAlchemy**: `AgentJob` model | **PK type**: `varchar`

```typescript
export const agentJobs = pgTable('agent_jobs', {
  id: varchar('id').primaryKey(),
  executionId: varchar('execution_id')
    .notNull()
    .references(() => workflowExecutions.id, { onDelete: 'cascade' }),
  nodeId: varchar('node_id').notNull(),
  jobType: varchar('job_type').notNull(), // 'generate_copy' | 'generate_image' | 'attach' | 'review'

  // Job state
  status: varchar('status').notNull().default('pending'),
  // Values: 'pending' | 'running' | 'completed' | 'failed' | 'skipped'
  inputDataJson: jsonb('input_data_json'),
  outputDataJson: jsonb('output_data_json'),
  errorMessage: text('error_message'),

  // Usage tracking
  tokensUsed: integer('tokens_used').default(0),

  // Timing
  startedAt: timestamp('started_at', { withTimezone: true }),
  completedAt: timestamp('completed_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
});
```

**Relations**:
```typescript
export const agentJobsRelations = relations(agentJobs, ({ one }) => ({
  execution: one(workflowExecutions, {
    fields: [agentJobs.executionId],
    references: [workflowExecutions.id],
  }),
}));
```

---

#### 3.4 `node_outputs`

**SQLAlchemy**: `NodeOutput` model | **PK type**: `varchar`

```typescript
export const nodeOutputs = pgTable('node_outputs', {
  id: varchar('id').primaryKey(),
  executionId: varchar('execution_id')
    .notNull()
    .references(() => workflowExecutions.id, { onDelete: 'cascade' }),

  // Node identification
  nodeId: varchar('node_id').notNull(),
  nodeName: varchar('node_name').notNull(),
  nodeType: varchar('node_type').notNull(),

  // Output data
  outputs: jsonb('outputs').notNull(),

  // Metadata
  executionOrder: integer('execution_order').notNull(),
  iterationNumber: integer('iteration_number').default(0),

  // Timing
  startedAt: timestamp('started_at', { withTimezone: true }),
  completedAt: timestamp('completed_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
});
```

**Relations**:
```typescript
export const nodeOutputsRelations = relations(nodeOutputs, ({ one }) => ({
  execution: one(workflowExecutions, {
    fields: [nodeOutputs.executionId],
    references: [workflowExecutions.id],
  }),
}));
```

---

### 4. AI & Templates Domain

#### 4.1 `templates`

**SQLAlchemy**: `Template` model | **PK type**: `varchar`

```typescript
export const templates = pgTable('templates', {
  id: varchar('id').primaryKey(),
  workspaceId: varchar('workspace_id').references(() => workspaces.id),
  userId: uuid('user_id').references(() => users.id),

  // Template details
  name: varchar('name').notNull(),
  description: text('description'),
  category: varchar('category').notNull(),
  // Values: 'trafego_pago' | 'social_media' | 'email' | 'copy' | 'seo' | 'criativo'
  icon: varchar('icon'),

  // Prompt
  prompt: text('prompt').notNull(),

  // Variables (dynamic form)
  variables: jsonb('variables').default([]),
  // Each: {key, label, type, placeholder, required, options?, default?}

  // Optional initial message
  initialMessage: text('initial_message'),

  // Display metadata
  expertName: varchar('expert_name'),
  estimatedOutputs: varchar('estimated_outputs'),

  // Configuration
  isSystem: boolean('is_system').default(false),
  isActive: boolean('is_active').default(true),
  isFeatured: boolean('is_featured').default(false),
  tags: jsonb('tags'), // string[]

  // Usage stats
  usageCount: integer('usage_count').default(0),

  // Timestamps
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }),
});
```

**Relations**:
```typescript
export const templatesRelations = relations(templates, ({ one }) => ({
  workspace: one(workspaces, {
    fields: [templates.workspaceId],
    references: [workspaces.id],
  }),
  user: one(users, {
    fields: [templates.userId],
    references: [users.id],
  }),
}));
```

---

#### 4.2 `ai_usage_log`

**SQLAlchemy**: `AIUsageLog` model | **PK type**: `varchar`

> Note: This table has no dedicated migration file -- it was created in the initial database setup or via an earlier migration not in the numbered sequence.

```typescript
export const aiUsageLog = pgTable('ai_usage_log', {
  id: varchar('id').primaryKey(),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  workspaceId: varchar('workspace_id').references(() => workspaces.id, { onDelete: 'set null' }),
  projectId: varchar('project_id').references(() => projects.id, { onDelete: 'set null' }),

  // Request details
  model: varchar('model').notNull(),
  provider: varchar('provider').notNull(), // 'openrouter' | 'anthropic' | 'openai'
  requestType: varchar('request_type').notNull(), // 'chat' | 'vision' | 'tool_call'

  // Token usage
  inputTokens: integer('input_tokens').notNull().default(0),
  outputTokens: integer('output_tokens').notNull().default(0),
  totalTokens: integer('total_tokens').notNull().default(0),

  // Cost (USD)
  inputCost: numeric('input_cost', { precision: 10, scale: 6 }).notNull().default('0'),
  outputCost: numeric('output_cost', { precision: 10, scale: 6 }).notNull().default('0'),
  totalCost: numeric('total_cost', { precision: 10, scale: 6 }).notNull().default('0'),

  // Context
  promptPreview: text('prompt_preview'),
  responsePreview: text('response_preview'),
  toolCalls: jsonb('tool_calls'),

  // Metadata
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  durationMs: integer('duration_ms'),
});
```

**Relations**:
```typescript
export const aiUsageLogRelations = relations(aiUsageLog, ({ one }) => ({
  user: one(users, {
    fields: [aiUsageLog.userId],
    references: [users.id],
  }),
  workspace: one(workspaces, {
    fields: [aiUsageLog.workspaceId],
    references: [workspaces.id],
  }),
  project: one(projects, {
    fields: [aiUsageLog.projectId],
    references: [projects.id],
  }),
}));
```

---

#### 4.3 `user_memories`

**SQLAlchemy**: `UserMemory` model | **PK type**: `uuid` | **Has pgvector**

```typescript
import { vector } from 'drizzle-orm/pg-core'; // or custom pgvector extension

export const userMemories = pgTable('user_memories', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  projectId: varchar('project_id')
    .notNull()
    .references(() => projects.id, { onDelete: 'cascade' }),

  // Content
  content: text('content').notNull(),
  contentHash: varchar('content_hash', { length: 64 }).notNull(),

  // Vector embedding (1536 dimensions for text-embedding-3-small)
  embedding: vector('embedding', { dimensions: 1536 }),

  // Categorization
  category: varchar('category', { length: 50 }).default('other'),

  // Source tracking
  sourceConversationId: varchar('source_conversation_id')
    .references(() => chatConversations.id, { onDelete: 'set null' }),

  // Timestamps
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
}, (table) => ({
  uniqueHash: unique('unique_user_project_memory_hash')
    .on(table.userId, table.projectId, table.contentHash),
  validCategory: check('valid_category',
    sql`${table.category} IN ('personal', 'professional', 'preference', 'plan', 'health', 'other')`
  ),
}));
```

**Relations**:
```typescript
export const userMemoriesRelations = relations(userMemories, ({ one }) => ({
  user: one(users, {
    fields: [userMemories.userId],
    references: [users.id],
  }),
  project: one(projects, {
    fields: [userMemories.projectId],
    references: [projects.id],
  }),
  sourceConversation: one(chatConversations, {
    fields: [userMemories.sourceConversationId],
    references: [chatConversations.id],
  }),
}));
```

**Indexes** (from migration 024):
- `idx_user_memories_user_project` on `(user_id, project_id)`
- `idx_user_memories_category` on `category`
- `idx_user_memories_updated_at` on `updated_at DESC`
- `idx_user_memories_hash` on `content_hash`
- `idx_user_memories_embedding` IVFFlat vector index on `embedding` (cosine ops, lists=100)

**Triggers**: `trigger_update_user_memories_updated_at` auto-updates `updated_at`.

---

### 5. Visual Assets Domain

#### 5.1 `assistant_visual_settings`

**SQLAlchemy**: `AssistantVisualSettings` model | **PK type**: `varchar` (DB shows varchar, migration shows UUID)

```typescript
export const assistantVisualSettings = pgTable('assistant_visual_settings', {
  id: varchar('id').primaryKey(), // DB actual: varchar
  projectId: varchar('project_id')
    .notNull()
    .unique()
    .references(() => projects.id, { onDelete: 'cascade' }),
  isEnabled: boolean('is_enabled').notNull().default(false),
  mode: varchar('mode', { length: 10 }).notNull().default('manual'), // 'manual' | 'auto'
  assetsPerCategory: integer('assets_per_category').notNull().default(2),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }),
}, (table) => ({
  chkMode: check('chk_visual_mode', sql`${table.mode} IN ('manual', 'auto')`),
  chkAssetsPerCategory: check('chk_assets_per_category',
    sql`${table.assetsPerCategory} BETWEEN 1 AND 5`),
}));
```

**Relations**:
```typescript
export const assistantVisualSettingsRelations = relations(assistantVisualSettings, ({ one, many }) => ({
  project: one(projects, {
    fields: [assistantVisualSettings.projectId],
    references: [projects.id],
  }),
  selections: many(assistantAssetSelection),
}));
```

---

#### 5.2 `assistant_asset_selection`

**SQLAlchemy**: `AssistantAssetSelection` model | **PK type**: `varchar`

```typescript
export const assistantAssetSelection = pgTable('assistant_asset_selection', {
  id: varchar('id').primaryKey(),
  settingsId: varchar('settings_id')
    .notNull()
    .references(() => assistantVisualSettings.id, { onDelete: 'cascade' }),
  assetId: varchar('asset_id')
    .notNull()
    .references(() => documents.id, { onDelete: 'cascade' }),
  isEnabled: boolean('is_enabled').notNull().default(true),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
}, (table) => ({
  uniqueSettingsAsset: unique('uq_asset_selection').on(table.settingsId, table.assetId),
}));
```

**Relations**:
```typescript
export const assistantAssetSelectionRelations = relations(assistantAssetSelection, ({ one }) => ({
  settings: one(assistantVisualSettings, {
    fields: [assistantAssetSelection.settingsId],
    references: [assistantVisualSettings.id],
  }),
  asset: one(documents, {
    fields: [assistantAssetSelection.assetId],
    references: [documents.id],
  }),
}));
```

---

#### 5.3 `asset_usage_history`

**SQLAlchemy**: `AssetUsageHistory` model | **PK type**: `varchar`

```typescript
export const assetUsageHistory = pgTable('asset_usage_history', {
  id: varchar('id').primaryKey(),
  assetId: varchar('asset_id')
    .notNull()
    .references(() => documents.id, { onDelete: 'cascade' }),
  generationId: varchar('generation_id'),
  usedAt: timestamp('used_at', { withTimezone: true }).notNull().defaultNow(),
});
```

**Relations**:
```typescript
export const assetUsageHistoryRelations = relations(assetUsageHistory, ({ one }) => ({
  asset: one(documents, {
    fields: [assetUsageHistory.assetId],
    references: [documents.id],
  }),
}));
```

---

### 6. Agency Studio Domain

#### 6.1 `copy_library_items`

**SQLAlchemy**: `CopyLibraryItem` model | **PK type**: `uuid`

```typescript
export const copyLibraryItems = pgTable('copy_library_items', {
  id: uuid('id').primaryKey().defaultRandom(),
  workspaceId: varchar('workspace_id', { length: 255 })
    .notNull()
    .references(() => workspaces.id, { onDelete: 'cascade' }),
  title: varchar('title', { length: 255 }).notNull(),
  content: text('content').notNull(),
  tags: text('tags').array().default([]), // TEXT[]
  createdBy: uuid('created_by').references(() => users.id),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
});
```

**Relations**:
```typescript
export const copyLibraryItemsRelations = relations(copyLibraryItems, ({ one }) => ({
  workspace: one(workspaces, {
    fields: [copyLibraryItems.workspaceId],
    references: [workspaces.id],
  }),
  creator: one(users, {
    fields: [copyLibraryItems.createdBy],
    references: [users.id],
  }),
}));
```

---

#### 6.2 `campaign_packages`

**SQLAlchemy**: `CampaignPackage` model | **PK type**: `uuid`

```typescript
export const campaignPackages = pgTable('campaign_packages', {
  id: uuid('id').primaryKey().defaultRandom(),
  projectId: varchar('project_id', { length: 255 })
    .notNull()
    .references(() => projects.id, { onDelete: 'cascade' }),
  name: varchar('name', { length: 255 }).notNull(),
  channel: varchar('channel', { length: 100 }),
  campaignMetadata: jsonb('metadata').default({}), // Note: DB column is 'metadata'
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
});
```

**Relations**:
```typescript
export const campaignPackagesRelations = relations(campaignPackages, ({ one, many }) => ({
  project: one(projects, {
    fields: [campaignPackages.projectId],
    references: [projects.id],
  }),
  documents: many(documents),
}));
```

---

#### 6.3 `image_masks`

**SQLAlchemy**: `ImageMask` model | **PK type**: `uuid`

```typescript
export const imageMasks = pgTable('image_masks', {
  id: uuid('id').primaryKey().defaultRandom(),
  documentId: varchar('document_id', { length: 255 })
    .notNull()
    .references(() => documents.id, { onDelete: 'cascade' }),
  maskUrl: varchar('mask_url', { length: 512 }).notNull(),
  prompt: text('prompt'),
  resultDocumentId: varchar('result_document_id', { length: 255 })
    .references(() => documents.id, { onDelete: 'set null' }),
  createdBy: uuid('created_by').references(() => users.id),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
});
```

**Relations**:
```typescript
export const imageMasksRelations = relations(imageMasks, ({ one }) => ({
  sourceDocument: one(documents, {
    fields: [imageMasks.documentId],
    references: [documents.id],
    relationName: 'sourceMasks',
  }),
  resultDocument: one(documents, {
    fields: [imageMasks.resultDocumentId],
    references: [documents.id],
    relationName: 'maskResults',
  }),
  creator: one(users, {
    fields: [imageMasks.createdBy],
    references: [users.id],
  }),
}));
```

---

### 7. Admin Domain

#### 7.1 `system_config`

**SQLAlchemy**: `SystemConfig` model | **PK type**: `uuid`

```typescript
export const systemConfig = pgTable('system_config', {
  id: uuid('id').primaryKey().defaultRandom(),
  key: varchar('key', { length: 100 }).notNull().unique(),
  value: jsonb('value').notNull(),
  description: text('description'),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
  updatedBy: uuid('updated_by').references(() => users.id),
});
```

**Relations**:
```typescript
export const systemConfigRelations = relations(systemConfig, ({ one }) => ({
  updater: one(users, {
    fields: [systemConfig.updatedBy],
    references: [users.id],
  }),
}));
```

**Triggers**: `trigger_system_config_updated_at` auto-updates `updated_at`.

---

#### 7.2 `admin_audit_log`

**SQLAlchemy**: `AdminAuditLog` model | **PK type**: `uuid`

```typescript
export const adminAuditLog = pgTable('admin_audit_log', {
  id: uuid('id').primaryKey().defaultRandom(),
  adminId: uuid('admin_id').notNull().references(() => users.id),
  action: varchar('action', { length: 100 }).notNull(),
  entityType: varchar('entity_type', { length: 50 }),
  entityId: varchar('entity_id', { length: 255 }),
  oldValue: jsonb('old_value'),
  newValue: jsonb('new_value'),
  metadata: jsonb('metadata'), // Note: column name is 'metadata' in DB
  ipAddress: varchar('ip_address', { length: 45 }),
  userAgent: text('user_agent'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
});
```

**Relations**:
```typescript
export const adminAuditLogRelations = relations(adminAuditLog, ({ one }) => ({
  admin: one(users, {
    fields: [adminAuditLog.adminId],
    references: [users.id],
  }),
}));
```

---

#### 7.3 `creative_concepts`

**SQLAlchemy**: `CreativeConcept` model | **PK type**: `uuid`

> Note: This table was originally `style_presets` (migration 027), renamed to `creative_concepts` in migration 035.

```typescript
export const creativeConcepts = pgTable('creative_concepts', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: varchar('name', { length: 100 }).notNull(),
  namePt: varchar('name_pt', { length: 100 }).notNull(),
  slug: varchar('slug', { length: 50 }).notNull().unique(),
  description: text('description'),
  promptModifier: text('prompt_modifier').notNull(),
  thumbnailUrl: text('thumbnail_url'),
  promptTemplate: text('prompt_template'),
  promptTemplateJson: jsonb('prompt_template_json'),
  templateVariables: jsonb('template_variables'),
  icon: varchar('icon', { length: 10 }),
  category: varchar('category', { length: 50 }),
  niche: varchar('niche', { length: 50 }),
  worksForNiches: jsonb('works_for_niches'), // string[]
  exampleImages: jsonb('example_images'), // string[]
  sortOrder: integer('sort_order').default(0),
  isActive: boolean('is_active').default(true),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }),
});
```

---

#### 7.4 `system_messages`

**Migration-only** (033_system_messages.sql) -- no SQLAlchemy model exists yet.

```typescript
export const systemMessages = pgTable('system_messages', {
  id: uuid('id').primaryKey().defaultRandom(),
  type: varchar('type', { length: 50 }).notNull().default('info'),
  // Values: 'maintenance' | 'announcement' | 'warning' | 'info'
  title: varchar('title', { length: 255 }).notNull(),
  content: text('content').notNull(),
  priority: integer('priority').notNull().default(0),
  startsAt: timestamp('starts_at', { withTimezone: true }),
  endsAt: timestamp('ends_at', { withTimezone: true }),
  dismissible: boolean('dismissible').notNull().default(true),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
}, (table) => ({
  validMessageType: check('valid_message_type',
    sql`${table.type} IN ('maintenance', 'announcement', 'warning', 'info')`),
}));
```

---

### 8. LangChain / RAG Tables (External)

These tables are managed by LangChain and should NOT be defined in Drizzle application code. They are documented here for awareness.

#### 8.1 `langchain_pg_collection`

```
columns: name (varchar), cmetadata (jsonb), uuid (uuid PK, default uuid_generate_v4())
```

#### 8.2 `langchain_pg_embedding`

```
columns: collection_id (uuid FK), embedding (vector), document (text),
         cmetadata (jsonb), custom_id (varchar), uuid (uuid PK)
```

> **Recommendation**: If migrating to Drizzle, either keep these tables as-is and access them with raw SQL, or replace with a TypeScript-native RAG solution.

---

## Appendices

### A. Soft Delete Pattern

Tables with soft delete: `projects`, `documents`, `folders`, `workflow_templates`, `workflow_executions`.

```typescript
import { sql, type SQL } from 'drizzle-orm';
import { timestamp } from 'drizzle-orm/pg-core';

// Column definition used in each table
// deletedAt: timestamp('deleted_at', { withTimezone: true }),

// Drizzle helper for soft-delete filtering
export function isNotDeleted<T extends { deletedAt: ReturnType<typeof timestamp> }>(
  table: T
): SQL {
  return sql`${table.deletedAt} IS NULL`;
}

// Usage in queries:
// db.select().from(projects).where(isNotDeleted(projects))
// db.select().from(documents).where(and(eq(documents.projectId, id), isNotDeleted(documents)))

// Soft delete operation:
// db.update(projects).set({ deletedAt: new Date() }).where(eq(projects.id, id))
```

---

### B. ID Generation Strategy

The database uses two ID generation strategies depending on when the table was created:

| Strategy | Tables | Column Type | Default |
|----------|--------|-------------|---------|
| **UUID as text** (early tables) | `users`, `workspaces`, `workspace_users`, `workspace_invites`, `projects`, `folders`, `documents`, `activity_log`, `ai_usage_log`, `templates`, `workflow_templates`, `workflow_executions`, `agent_jobs`, `node_outputs`, `document_attachments`, `chat_conversations`, `user_preferences`, `assistant_visual_settings`, `assistant_asset_selection`, `asset_usage_history` | `varchar` | `uuid_generate_v4()::text` |
| **Native UUID** (newer tables) | `system_config`, `admin_audit_log`, `creative_concepts`, `user_memories`, `copy_library_items`, `campaign_packages`, `image_masks`, `system_messages` | `uuid` | `gen_random_uuid()` |

**Special case**: `users.id` is a native `uuid` that syncs from `auth.users.id` via a database trigger -- it is not auto-generated.

**Drizzle approach**: For varchar-ID tables, use `varchar('id').primaryKey()` and generate UUIDs in application code (`crypto.randomUUID()`). For uuid-ID tables, use `uuid('id').primaryKey().defaultRandom()`.

```typescript
// Helper for varchar-ID tables
import { randomUUID } from 'crypto';

export function generateId(): string {
  return randomUUID();
}
```

---

### C. JSONB Columns Summary

| Table | Column | Typical Structure |
|-------|--------|-------------------|
| `documents` | `generation_metadata` | `{model, prompt, params, provider, operation_type, cost_cents, processing_time_ms}` |
| `documents` | `asset_metadata` | `{tags[], dimensions, file_size, format, color_mode}` |
| `documents` | `refinement_history` | `[{prompt: string, applied_at: timestamp}]` |
| `documents` | `version_history` | `[{content, updated_at, ...}]` (max 10, FIFO) |
| `projects` | `settings` | `{client_name, description, target_audience, brand_voice, key_messages, competitors, custom_notes}` |
| `templates` | `variables` | `[{key, label, type, placeholder, required, options?, default?}]` |
| `templates` | `tags` | `string[]` |
| `chat_conversations` | `messages_json` | `[{role, content, toolExecutions?, taskList?}]` |
| `chat_conversations` | `document_ids_context` | `string[]` |
| `chat_conversations` | `folder_ids_context` | `string[]` |
| `chat_conversations` | `created_document_ids` | `string[]` |
| `workflow_templates` | `nodes_json` | `[{id, type, data, position}]` (ReactFlow format) |
| `workflow_templates` | `edges_json` | `[{id, source, target}]` (ReactFlow format) |
| `workflow_templates` | `default_params_json` | `{[nodeId]: {param: value}}` |
| `workflow_executions` | `config_json` | User-provided execution parameters |
| `workflow_executions` | `execution_context` | `{[nodeId]: {outputField: value}}` |
| `workflow_executions` | `generated_document_ids` | `string[]` |
| `agent_jobs` | `input_data_json` | Varies by job type |
| `agent_jobs` | `output_data_json` | Varies by job type |
| `node_outputs` | `outputs` | Structured output data with parsed fields |
| `ai_usage_log` | `tool_calls` | `[{name, args, result}]` |
| `system_config` | `value` | Varies by key (see seed data in migration 016) |
| `admin_audit_log` | `old_value` | Previous state snapshot |
| `admin_audit_log` | `new_value` | Updated state snapshot |
| `admin_audit_log` | `metadata` | Additional context data |
| `campaign_packages` | `metadata` | Campaign-specific metadata |
| `creative_concepts` | `prompt_template_json` | `{concept, composition, requirements, visual_description, typography?}` |
| `creative_concepts` | `template_variables` | Template variable definitions |
| `creative_concepts` | `works_for_niches` | `string[]` (e.g., `["generic","financial","health"]`) |
| `creative_concepts` | `example_images` | `string[]` (URLs) |
| `user_preferences` | `settings` | Extensible key-value settings |
| `user_memories` | (no JSONB) | N/A |

---

### D. Vector Columns

| Table | Column | Dimensions | Index Type | Distance Function |
|-------|--------|------------|------------|-------------------|
| `user_memories` | `embedding` | 1536 | IVFFlat (lists=100) | `vector_cosine_ops` |
| `langchain_pg_embedding` | `embedding` | variable | (managed by LangChain) | N/A |

**Drizzle pgvector setup**:

```typescript
// Option 1: Using drizzle-orm built-in vector support (if available)
import { vector } from 'drizzle-orm/pg-core';

// Option 2: Custom column type
import { customType } from 'drizzle-orm/pg-core';

const vector = customType<{ data: number[]; driverParam: string }>({
  dataType() {
    return 'vector(1536)';
  },
  toDriver(value: number[]): string {
    return `[${value.join(',')}]`;
  },
  fromDriver(value: string): number[] {
    return JSON.parse(value.replace('(', '[').replace(')', ']'));
  },
});
```

---

### E. Database Triggers & RLS

#### E.1 Triggers

| Trigger | Table | Function | Purpose |
|---------|-------|----------|---------|
| `tr_user_preferences_updated_at` | `user_preferences` | `update_user_preferences_updated_at()` | Auto-update `updated_at` on UPDATE |
| `trigger_system_config_updated_at` | `system_config` | `update_system_config_updated_at()` | Auto-update `updated_at` on UPDATE |
| `trigger_update_user_memories_updated_at` | `user_memories` | `update_user_memories_updated_at()` | Auto-update `updated_at` on UPDATE |

> **Migration note**: These triggers must be preserved in the Supabase database. They are database-level and do not need Drizzle equivalents, but the TypeScript code should be aware that `updated_at` is set automatically.

#### E.2 Row Level Security (RLS)

RLS is enabled on the following tables (migrations 016, 020, 024, 030, 031, 033):

| Table | RLS Enabled | Policy Summary |
|-------|-------------|----------------|
| `workspaces` | Yes | Members can SELECT; owners can UPDATE/DELETE; authenticated can INSERT |
| `workspace_users` | Yes | Members can SELECT; admins can INSERT/UPDATE/DELETE |
| `projects` | Yes | Workspace members can SELECT/UPDATE; authenticated can INSERT; admins can DELETE |
| `documents` | Yes | Workspace members or public shares can SELECT; members can INSERT/UPDATE/DELETE |
| `folders` | Yes | Workspace members (via project) for all operations |
| `templates` | Yes | System templates public; owner or workspace member for others |
| `user_preferences` | Yes | User owns their own record |
| `chat_conversations` | Yes | User owns their own records |
| `system_config` | Yes | Super admins only |
| `admin_audit_log` | Yes | Super admins can SELECT; service role can INSERT |
| `user_memories` | Yes | User owns their own; service role has full access |
| `document_attachments` | Yes | Inherits access via document's project |
| `assistant_visual_settings` | Yes | Workspace members via project |
| `assistant_asset_selection` | Yes | Workspace members via settings -> project |
| `asset_usage_history` | Yes | Workspace members via document's project |
| `creative_concepts` | Yes | Anyone can SELECT; super admins can write |
| `copy_library_items` | Yes | Workspace members |
| `campaign_packages` | Yes | Workspace members via project |
| `image_masks` | Yes | Workspace members via document -> project |
| `system_messages` | Yes | Anyone can SELECT; service role can manage |

#### E.3 Helper Functions (used by RLS policies)

```sql
-- Check workspace membership (VARCHAR and UUID overloads)
public.user_is_workspace_member(workspace_id_param)
public.user_is_workspace_admin(workspace_id_param)
public.user_has_document_access(document_project_id)
```

> **Migration note**: These functions and all RLS policies must be preserved. When migrating to TypeScript, the backend will use the Supabase service role key (bypasses RLS) while the frontend Supabase client will continue to be governed by RLS.

---

### F. Complete Table Inventory

Summary of all 24 public tables with their primary key types:

| # | Table | PK Type | SQLAlchemy Model | Migration |
|---|-------|---------|------------------|-----------|
| 1 | `users` | `uuid` | `User` | (initial + 016) |
| 2 | `workspaces` | `varchar` | `Workspace` | (initial + 001, 002, 021) |
| 3 | `workspace_users` | composite | `WorkspaceUser` | (initial) |
| 4 | `workspace_invites` | `varchar` | `WorkspaceInvite` | (initial) |
| 5 | `projects` | `varchar` | `Project` | (initial + 014, 023) |
| 6 | `folders` | `varchar` | `Folder` | 003, 004 |
| 7 | `documents` | `varchar` | `Document` | (initial + 004-007, 013, 015, 017, 025, 031) |
| 8 | `document_attachments` | `varchar` | `DocumentAttachment` | 008 |
| 9 | `activity_log` | `varchar` | `ActivityLog` | 005 |
| 10 | `chat_conversations` | `varchar` | `ChatConversation` | 012 |
| 11 | `templates` | `varchar` | `Template` | (initial + 022) |
| 12 | `workflow_templates` | `varchar` | `WorkflowTemplate` | 008, 009, 010, 023 |
| 13 | `workflow_executions` | `varchar` | `WorkflowExecution` | 008, 009, 023 |
| 14 | `agent_jobs` | `varchar` | `AgentJob` | 008 |
| 15 | `node_outputs` | `varchar` | `NodeOutput` | 009 |
| 16 | `user_preferences` | `varchar` | `UserPreferences` | 011, 024 |
| 17 | `ai_usage_log` | `varchar` | `AIUsageLog` | (initial) |
| 18 | `user_memories` | `uuid` | `UserMemory` | 024 |
| 19 | `assistant_visual_settings` | `varchar` | `AssistantVisualSettings` | 015 |
| 20 | `assistant_asset_selection` | `varchar` | `AssistantAssetSelection` | 015 |
| 21 | `asset_usage_history` | `varchar` | `AssetUsageHistory` | 015 |
| 22 | `system_config` | `uuid` | `SystemConfig` | 016 |
| 23 | `admin_audit_log` | `uuid` | `AdminAuditLog` | 016 |
| 24 | `creative_concepts` | `uuid` | `CreativeConcept` | 027, 028, 029, 035 |
| 25 | `copy_library_items` | `uuid` | `CopyLibraryItem` | 031 |
| 26 | `campaign_packages` | `uuid` | `CampaignPackage` | 031 |
| 27 | `image_masks` | `uuid` | `ImageMask` | 031 |
| 28 | `system_messages` | `uuid` | (none) | 033 |
| 29 | `langchain_pg_collection` | `uuid` | (external) | (LangChain managed) |
| 30 | `langchain_pg_embedding` | `uuid` | (external) | (LangChain managed) |

---

### G. Recommended Drizzle Project Structure

```
src/
  db/
    schema/
      users.ts              # users, workspaceUsers, workspaceInvites, userPreferences
      workspaces.ts         # workspaces
      projects.ts           # projects, folders
      documents.ts          # documents, documentAttachments, activityLog
      conversations.ts      # chatConversations
      workflows.ts          # workflowTemplates, workflowExecutions, agentJobs, nodeOutputs
      templates.ts          # templates
      ai.ts                 # aiUsageLog, userMemories
      visual-assets.ts      # assistantVisualSettings, assistantAssetSelection, assetUsageHistory
      agency.ts             # copyLibraryItems, campaignPackages, imageMasks
      admin.ts              # systemConfig, adminAuditLog, creativeConcepts, systemMessages
      relations.ts          # All relation definitions (or co-located in each file)
      index.ts              # Re-exports all tables and relations
    client.ts               # Drizzle client setup with Supabase connection
    migrate.ts              # Migration runner (if using drizzle-kit push)
```
