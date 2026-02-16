import { z } from 'zod';

// ============================================================================
// Nested Schemas
// ============================================================================

export const ProjectSettingsSchema = z.object({
  persona: z.string().max(2000).optional(),
  targetAudience: z.string().max(1000).optional(),
  brandVoice: z.string().max(500).optional(),
  references: z.array(z.string()).max(20).optional(),
  contentGoals: z.array(z.string()).max(10).optional(),
});

// ============================================================================
// Request Schemas
// ============================================================================

export const CreateProjectSchema = z.object({
  name: z.string().min(1).max(200),
  description: z.string().max(2000).optional(),
  workspaceId: z.string(),
});

export const UpdateProjectSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  description: z.string().max(2000).optional(),
  settings: ProjectSettingsSchema.optional(),
});

// ============================================================================
// Response Schemas
// ============================================================================

export const ProjectResponseSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string().nullable().optional(),
  workspaceId: z.string(),
  settings: ProjectSettingsSchema.nullable().optional(),
  createdAt: z.string().datetime(),
});

// ============================================================================
// Inferred Types
// ============================================================================

export type ProjectSettings = z.infer<typeof ProjectSettingsSchema>;
export type CreateProject = z.infer<typeof CreateProjectSchema>;
export type UpdateProject = z.infer<typeof UpdateProjectSchema>;
export type ProjectResponse = z.infer<typeof ProjectResponseSchema>;
