/**
 * Drizzle ORM Schema — All 28 application tables
 *
 * Consolidated from specs/032-full-stack-migration/data-model.md
 *
 * PK conventions:
 *   - Early tables use varchar PK (uuid string generated in app code)
 *   - Newer tables use native uuid PK with defaultRandom()
 *
 * LangChain tables (langchain_pg_collection, langchain_pg_embedding) are
 * NOT included — they are managed externally.
 */

import {
  pgTable,
  uuid,
  varchar,
  text,
  boolean,
  timestamp,
  integer,
  numeric,
  jsonb,
  primaryKey,
  unique,
  check,
} from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';

// ─────────────────────────────────────────────
// 1. User & Access Domain
// ─────────────────────────────────────────────

/** 1.1 users */
export const users = pgTable('users', {
  id: uuid('id').primaryKey(), // synced from auth.users via trigger, no defaultRandom
  email: varchar('email').notNull().unique(),
  fullName: varchar('full_name'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }),

  // Admin Panel (Feature 015)
  isSuperAdmin: boolean('is_super_admin').default(false),
  isBlocked: boolean('is_blocked').default(false),
  blockedAt: timestamp('blocked_at', { withTimezone: true }),
  blockedBy: uuid('blocked_by'),
});

/** 1.2 workspaces */
export const workspaces = pgTable('workspaces', {
  id: varchar('id').primaryKey(), // uuid_generate_v4()::text
  name: varchar('name').notNull(),
  description: text('description'),
  defaultTextModel: varchar('default_text_model'),
  defaultVisionModel: varchar('default_vision_model'),
  attachmentAnalysisModel: varchar('attachment_analysis_model'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
});

/** 1.3 workspace_users (composite PK) */
export const workspaceUsers = pgTable(
  'workspace_users',
  {
    workspaceId: varchar('workspace_id')
      .notNull()
      .references(() => workspaces.id),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id),
    role: varchar('role').default('member'), // 'owner' | 'admin' | 'member'
  },
  (table) => ({
    pk: primaryKey({ columns: [table.workspaceId, table.userId] }),
  }),
);

/** 1.4 workspace_invites */
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

/** 1.5 user_preferences */
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

// ─────────────────────────────────────────────
// 2. Content Domain
// ─────────────────────────────────────────────

/** 2.1 projects */
export const projects = pgTable('projects', {
  id: varchar('id').primaryKey(),
  name: varchar('name').notNull(),
  description: text('description'),
  workspaceId: varchar('workspace_id').references(() => workspaces.id),
  settings: jsonb('settings').default({}),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  deletedAt: timestamp('deleted_at', { withTimezone: true }), // Soft delete
});

/** 2.2 folders */
export const folders = pgTable(
  'folders',
  {
    id: varchar('id').primaryKey(),
    name: varchar('name').notNull(),
    parentFolderId: varchar('parent_folder_id'),
    projectId: varchar('project_id')
      .notNull()
      .references(() => projects.id, { onDelete: 'cascade' }),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }),
    deletedAt: timestamp('deleted_at', { withTimezone: true }),
  },
  (table) => ({
    checkNotSelfParent: check(
      'check_not_self_parent',
      sql`${table.id} != ${table.parentFolderId}`,
    ),
  }),
);

/** 2.2b boards — Kanban boards inside a project (Migration 036) */
export const boards = pgTable('boards', {
  id: varchar('id').primaryKey(),
  projectId: varchar('project_id')
    .notNull()
    .references(() => projects.id, { onDelete: 'cascade' }),
  folderId: varchar('folder_id').references(() => folders.id, { onDelete: 'set null' }),
  name: varchar('name').notNull(),
  description: text('description'),
  position: integer('position').notNull().default(0),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }),
  deletedAt: timestamp('deleted_at', { withTimezone: true }),
});

/** 2.2c board_columns — Columns of a Kanban board */
export const boardColumns = pgTable('board_columns', {
  id: varchar('id').primaryKey(),
  boardId: varchar('board_id')
    .notNull()
    .references(() => boards.id, { onDelete: 'cascade' }),
  name: varchar('name').notNull(),
  color: varchar('color'),
  position: integer('position').notNull().default(0),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }),
});

/** 2.3 documents — largest table, extended by many features */
export const documents = pgTable(
  'documents',
  {
    id: varchar('id').primaryKey(),
    title: varchar('title'),
    content: text('content'),
    status: varchar('status').default('draft'), // 'draft' | 'text_ok' | 'art_ok' | 'done' | 'published'
    projectId: varchar('project_id').references(() => projects.id),
    folderId: varchar('folder_id').references(() => folders.id, { onDelete: 'set null' }),

    // Board (Kanban) — Migration 036
    boardId: varchar('board_id').references(() => boards.id, { onDelete: 'set null' }),
    boardColumnId: varchar('board_column_id').references(() => boardColumns.id, { onDelete: 'set null' }),
    boardPosition: integer('board_position'),

    // Media fields
    mediaType: varchar('media_type').default('text'), // 'text' | 'image' | 'pdf' | 'video'
    fileUrl: varchar('file_url'),
    thumbnailUrl: varchar('thumbnail_url'),
    generationMetadata: jsonb('generation_metadata'),

    // Visual asset fields (Feature 007/011)
    isReferenceAsset: boolean('is_reference_asset').default(false),
    assetType: varchar('asset_type'), // 'logo' | 'background' | 'person' | 'reference' | 'other'
    assetMetadata: jsonb('asset_metadata'),

    // Public sharing (Feature 006)
    isPublic: boolean('is_public').default(false),
    shareToken: varchar('share_token').unique(),
    shareExpiresAt: timestamp('share_expires_at', { withTimezone: true }),

    // Context file for RAG (Feature 007)
    isContext: boolean('is_context').default(false),

    // Smart Visual Assets (Feature 011)
    assetCategory: varchar('asset_category', { length: 20 }),
    assetTags: text('asset_tags').array(), // TEXT[]
    aiDescription: text('ai_description'),

    // Image Refinement (Feature 016)
    originalImageId: varchar('original_image_id'),
    refinementHistory: jsonb('refinement_history').default([]),

    // Agency Studio (Feature 028)
    campaignId: uuid('campaign_id'),
    tags: text('tags').array().default([]), // TEXT[]
    channel: varchar('channel', { length: 100 }),
    variationSetId: uuid('variation_set_id'),
    variationIndex: integer('variation_index'),
    variationModifier: text('variation_modifier'),
    versionHistory: jsonb('version_history').default([]),
    currentVersion: integer('current_version').default(1),

    // Timestamps
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }),
    deletedAt: timestamp('deleted_at', { withTimezone: true }),
  },
  (table) => ({
    chkAssetCategory: check(
      'chk_asset_category',
      sql`${table.assetCategory} IS NULL OR ${table.assetCategory} IN ('Logo', 'Pessoa', 'Background', 'Produto', 'Referencia', 'Outro')`,
    ),
  }),
);

/** 2.4 document_attachments */
export const documentAttachments = pgTable(
  'document_attachments',
  {
    id: varchar('id').primaryKey(),
    documentId: varchar('document_id')
      .notNull()
      .references(() => documents.id, { onDelete: 'cascade' }),
    imageId: varchar('image_id')
      .notNull()
      .references(() => documents.id, { onDelete: 'cascade' }),
    isPrimary: boolean('is_primary').default(false),
    attachmentOrder: integer('attachment_order').default(0),
    createdByWorkflowId: varchar('created_by_workflow_id'),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  },
  (table) => ({
    uniqueDocImage: unique().on(table.documentId, table.imageId),
  }),
);

/** 2.5 activity_log */
export const activityLog = pgTable('activity_log', {
  id: varchar('id').primaryKey(),
  entityType: varchar('entity_type').notNull(), // 'document' | 'folder'
  entityId: varchar('entity_id').notNull(),
  action: varchar('action').notNull(), // 'create' | 'update' | 'delete' | 'restore' | 'move'
  actorType: varchar('actor_type').notNull(), // 'human' | 'ai'
  userId: uuid('user_id').references(() => users.id),
  changes: jsonb('changes'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
});

// ─────────────────────────────────────────────
// 3. Chat Domain
// ─────────────────────────────────────────────

/** 3.1 chat_conversations */
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

// ─────────────────────────────────────────────
// 4. Workflow Domain
// ─────────────────────────────────────────────

/** 4.1 workflow_templates */
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
  deletedAt: timestamp('deleted_at', { withTimezone: true }), // Soft delete
});

/** 4.2 workflow_executions */
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
  deletedAt: timestamp('deleted_at', { withTimezone: true }), // Soft delete
});

/** 4.3 agent_jobs */
export const agentJobs = pgTable('agent_jobs', {
  id: varchar('id').primaryKey(),
  executionId: varchar('execution_id')
    .notNull()
    .references(() => workflowExecutions.id, { onDelete: 'cascade' }),
  nodeId: varchar('node_id').notNull(),
  jobType: varchar('job_type').notNull(), // 'generate_copy' | 'generate_image' | 'attach' | 'review'

  // Job state
  status: varchar('status').notNull().default('pending'),
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

/** 4.4 node_outputs */
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

// ─────────────────────────────────────────────
// 5. AI & Templates Domain
// ─────────────────────────────────────────────

/** 5.1 templates */
export const templates = pgTable('templates', {
  id: varchar('id').primaryKey(),
  workspaceId: varchar('workspace_id').references(() => workspaces.id),
  userId: uuid('user_id').references(() => users.id),

  // Template details
  name: varchar('name').notNull(),
  description: text('description'),
  category: varchar('category').notNull(),
  icon: varchar('icon'),

  // Prompt
  prompt: text('prompt').notNull(),

  // Variables (dynamic form)
  variables: jsonb('variables').default([]),

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

/** 5.2 ai_usage_log */
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


// ─────────────────────────────────────────────
// 6. Visual Assets Domain
// ─────────────────────────────────────────────

/** 6.1 assistant_visual_settings */
export const assistantVisualSettings = pgTable(
  'assistant_visual_settings',
  {
    id: varchar('id').primaryKey(),
    projectId: varchar('project_id')
      .notNull()
      .unique()
      .references(() => projects.id, { onDelete: 'cascade' }),
    isEnabled: boolean('is_enabled').notNull().default(false),
    mode: varchar('mode', { length: 10 }).notNull().default('manual'), // 'manual' | 'auto'
    assetsPerCategory: integer('assets_per_category').notNull().default(2),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }),
  },
  (table) => ({
    chkMode: check('chk_visual_mode', sql`${table.mode} IN ('manual', 'auto')`),
    chkAssetsPerCategory: check(
      'chk_assets_per_category',
      sql`${table.assetsPerCategory} BETWEEN 1 AND 5`,
    ),
  }),
);

/** 6.2 assistant_asset_selection */
export const assistantAssetSelection = pgTable(
  'assistant_asset_selection',
  {
    id: varchar('id').primaryKey(),
    settingsId: varchar('settings_id')
      .notNull()
      .references(() => assistantVisualSettings.id, { onDelete: 'cascade' }),
    assetId: varchar('asset_id')
      .notNull()
      .references(() => documents.id, { onDelete: 'cascade' }),
    isEnabled: boolean('is_enabled').notNull().default(true),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  },
  (table) => ({
    uniqueSettingsAsset: unique('uq_asset_selection').on(table.settingsId, table.assetId),
  }),
);

/** 6.3 asset_usage_history */
export const assetUsageHistory = pgTable('asset_usage_history', {
  id: varchar('id').primaryKey(),
  assetId: varchar('asset_id')
    .notNull()
    .references(() => documents.id, { onDelete: 'cascade' }),
  generationId: varchar('generation_id'),
  usedAt: timestamp('used_at', { withTimezone: true }).notNull().defaultNow(),
});

// ─────────────────────────────────────────────
// 7. Agency Studio Domain
// ─────────────────────────────────────────────

/** 7.1 copy_library_items */
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

/** 7.2 campaign_packages */
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

/** 7.3 image_masks */
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

// ─────────────────────────────────────────────
// 8. Admin & System Domain
// ─────────────────────────────────────────────

/** 8.1 system_config */
export const systemConfig = pgTable('system_config', {
  id: uuid('id').primaryKey().defaultRandom(),
  key: varchar('key', { length: 100 }).notNull().unique(),
  value: jsonb('value').notNull(),
  description: text('description'),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
  updatedBy: uuid('updated_by').references(() => users.id),
});

/** 8.2 admin_audit_log */
export const adminAuditLog = pgTable('admin_audit_log', {
  id: uuid('id').primaryKey().defaultRandom(),
  adminId: uuid('admin_id').notNull().references(() => users.id),
  action: varchar('action', { length: 100 }).notNull(),
  entityType: varchar('entity_type', { length: 50 }),
  entityId: varchar('entity_id', { length: 255 }),
  oldValue: jsonb('old_value'),
  newValue: jsonb('new_value'),
  metadata: jsonb('metadata'),
  ipAddress: varchar('ip_address', { length: 45 }),
  userAgent: text('user_agent'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
});

/** 8.3 creative_concepts */
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

/** 8.4 system_messages */
export const systemMessages = pgTable(
  'system_messages',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    type: varchar('type', { length: 50 }).notNull().default('info'),
    title: varchar('title', { length: 255 }).notNull(),
    content: text('content').notNull(),
    priority: integer('priority').notNull().default(0),
    startsAt: timestamp('starts_at', { withTimezone: true }),
    endsAt: timestamp('ends_at', { withTimezone: true }),
    dismissible: boolean('dismissible').notNull().default(true),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
  },
  (table) => ({
    validMessageType: check(
      'valid_message_type',
      sql`${table.type} IN ('maintenance', 'announcement', 'warning', 'info')`,
    ),
  }),
);
