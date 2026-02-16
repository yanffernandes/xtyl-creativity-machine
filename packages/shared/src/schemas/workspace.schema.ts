import { z } from 'zod';
import { UserResponseSchema } from './user.schema';

// ============================================================================
// Request Schemas
// ============================================================================

export const CreateWorkspaceSchema = z.object({
  name: z.string().min(1).max(200),
  description: z.string().max(2000).optional(),
});

export const UpdateWorkspaceSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  description: z.string().max(2000).optional(),
  defaultTextModel: z.string().optional(),
  defaultVisionModel: z.string().optional(),
});

export const InviteToWorkspaceSchema = z.object({
  email: z.string().email(),
  role: z.enum(['admin', 'member']).default('member'),
});

// ============================================================================
// Response Schemas
// ============================================================================

export const WorkspaceResponseSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string().nullable().optional(),
  defaultTextModel: z.string().nullable().optional(),
  defaultVisionModel: z.string().nullable().optional(),
  createdAt: z.string().datetime(),
});

export const WorkspaceUserResponseSchema = z.object({
  userId: z.string().uuid(),
  role: z.string(),
  user: UserResponseSchema,
});

// ============================================================================
// Inferred Types
// ============================================================================

export type CreateWorkspace = z.infer<typeof CreateWorkspaceSchema>;
export type UpdateWorkspace = z.infer<typeof UpdateWorkspaceSchema>;
export type InviteToWorkspace = z.infer<typeof InviteToWorkspaceSchema>;
export type WorkspaceResponse = z.infer<typeof WorkspaceResponseSchema>;
export type WorkspaceUserResponse = z.infer<typeof WorkspaceUserResponseSchema>;
