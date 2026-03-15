/**
 * Drizzle ORM Relations — All relation declarations
 *
 * Consolidated from specs/032-full-stack-migration/data-model.md
 * Every relations() call maps foreign-key and reverse relationships
 * so that Drizzle's relational query API works correctly.
 */

import { relations } from 'drizzle-orm';

import {
  users,
  workspaces,
  workspaceUsers,
  workspaceInvites,
  userPreferences,
  projects,
  folders,
  documents,
  documentAttachments,
  activityLog,
  chatConversations,
  workflowTemplates,
  workflowExecutions,
  agentJobs,
  nodeOutputs,
  templates,
  aiUsageLog,
  assistantVisualSettings,
  assistantAssetSelection,
  assetUsageHistory,
  copyLibraryItems,
  campaignPackages,
  imageMasks,
  systemConfig,
  adminAuditLog,
} from './schema';

// ─────────────────────────────────────────────
// 1. User & Access Domain
// ─────────────────────────────────────────────

export const usersRelations = relations(users, ({ many, one }) => ({
  workspaces: many(workspaceUsers),
  blocker: one(users, {
    fields: [users.blockedBy],
    references: [users.id],
  }),
}));

export const workspacesRelations = relations(workspaces, ({ many }) => ({
  users: many(workspaceUsers),
  projects: many(projects),
}));

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

export const workspaceInvitesRelations = relations(workspaceInvites, ({ one }) => ({
  workspace: one(workspaces, {
    fields: [workspaceInvites.workspaceId],
    references: [workspaces.id],
  }),
  invitedBy: one(users, {
    fields: [workspaceInvites.invitedById],
    references: [users.id],
  }),
}));

export const userPreferencesRelations = relations(userPreferences, ({ one }) => ({
  user: one(users, {
    fields: [userPreferences.userId],
    references: [users.id],
  }),
}));

// ─────────────────────────────────────────────
// 2. Content Domain
// ─────────────────────────────────────────────

export const projectsRelations = relations(projects, ({ one, many }) => ({
  workspace: one(workspaces, {
    fields: [projects.workspaceId],
    references: [workspaces.id],
  }),
  documents: many(documents),
  folders: many(folders),
}));

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

export const activityLogRelations = relations(activityLog, ({ one }) => ({
  user: one(users, {
    fields: [activityLog.userId],
    references: [users.id],
  }),
}));

// ─────────────────────────────────────────────
// 3. Chat Domain
// ─────────────────────────────────────────────

export const chatConversationsRelations = relations(chatConversations, ({ one }) => ({
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
}));

// ─────────────────────────────────────────────
// 4. Workflow Domain
// ─────────────────────────────────────────────

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

export const agentJobsRelations = relations(agentJobs, ({ one }) => ({
  execution: one(workflowExecutions, {
    fields: [agentJobs.executionId],
    references: [workflowExecutions.id],
  }),
}));

export const nodeOutputsRelations = relations(nodeOutputs, ({ one }) => ({
  execution: one(workflowExecutions, {
    fields: [nodeOutputs.executionId],
    references: [workflowExecutions.id],
  }),
}));

// ─────────────────────────────────────────────
// 5. AI & Templates Domain
// ─────────────────────────────────────────────

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

// ─────────────────────────────────────────────
// 6. Visual Assets Domain
// ─────────────────────────────────────────────

export const assistantVisualSettingsRelations = relations(
  assistantVisualSettings,
  ({ one, many }) => ({
    project: one(projects, {
      fields: [assistantVisualSettings.projectId],
      references: [projects.id],
    }),
    selections: many(assistantAssetSelection),
  }),
);

export const assistantAssetSelectionRelations = relations(
  assistantAssetSelection,
  ({ one }) => ({
    settings: one(assistantVisualSettings, {
      fields: [assistantAssetSelection.settingsId],
      references: [assistantVisualSettings.id],
    }),
    asset: one(documents, {
      fields: [assistantAssetSelection.assetId],
      references: [documents.id],
    }),
  }),
);

export const assetUsageHistoryRelations = relations(assetUsageHistory, ({ one }) => ({
  asset: one(documents, {
    fields: [assetUsageHistory.assetId],
    references: [documents.id],
  }),
}));

// ─────────────────────────────────────────────
// 7. Agency Studio Domain
// ─────────────────────────────────────────────

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

export const campaignPackagesRelations = relations(campaignPackages, ({ one, many }) => ({
  project: one(projects, {
    fields: [campaignPackages.projectId],
    references: [projects.id],
  }),
  documents: many(documents),
}));

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

// ─────────────────────────────────────────────
// 8. Admin & System Domain
// ─────────────────────────────────────────────

export const systemConfigRelations = relations(systemConfig, ({ one }) => ({
  updater: one(users, {
    fields: [systemConfig.updatedBy],
    references: [users.id],
  }),
}));

export const adminAuditLogRelations = relations(adminAuditLog, ({ one }) => ({
  admin: one(users, {
    fields: [adminAuditLog.adminId],
    references: [users.id],
  }),
}));

// Note: creativeConcepts and systemMessages have no foreign keys / relations
