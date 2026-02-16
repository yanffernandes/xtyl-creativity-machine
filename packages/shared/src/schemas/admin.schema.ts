import { z } from 'zod';

// ============================================================================
// Request Schemas
// ============================================================================

export const UserManagementSchema = z.object({
  isBlocked: z.boolean().optional(),
  isSuperAdmin: z.boolean().optional(),
});

export const ModelConfigSchema = z.object({
  modelId: z.string(),
  enabled: z.boolean(),
  displayName: z.string().max(200).optional(),
  description: z.string().max(1000).optional(),
});

export const SystemConfigSchema = z.object({
  key: z.string().min(1).max(200),
  value: z.unknown(),
  category: z.string().min(1).max(100),
});

// ============================================================================
// Response Schemas
// ============================================================================

export const AuditLogResponseSchema = z.object({
  id: z.string().uuid(),
  action: z.string(),
  userId: z.string().uuid(),
  entityType: z.string().nullable().optional(),
  entityId: z.string().nullable().optional(),
  oldValue: z.record(z.unknown()).nullable().optional(),
  newValue: z.record(z.unknown()).nullable().optional(),
  ipAddress: z.string().nullable().optional(),
  details: z.record(z.unknown()).nullable().optional(),
  createdAt: z.string().datetime(),
});

export const AiUsageLogResponseSchema = z.object({
  id: z.string().uuid(),
  userId: z.string().uuid(),
  model: z.string(),
  provider: z.string(),
  requestType: z.string(),
  tokensInput: z.number().int(),
  tokensOutput: z.number().int(),
  totalTokens: z.number().int(),
  inputCost: z.number(),
  outputCost: z.number(),
  totalCost: z.number(),
  costCents: z.number().optional(),
  durationMs: z.number().int().nullable().optional(),
  createdAt: z.string().datetime(),
});

// ============================================================================
// Inferred Types
// ============================================================================

export type UserManagement = z.infer<typeof UserManagementSchema>;
export type ModelConfig = z.infer<typeof ModelConfigSchema>;
export type SystemConfig = z.infer<typeof SystemConfigSchema>;
export type AuditLogResponse = z.infer<typeof AuditLogResponseSchema>;
export type AiUsageLogResponse = z.infer<typeof AiUsageLogResponseSchema>;
