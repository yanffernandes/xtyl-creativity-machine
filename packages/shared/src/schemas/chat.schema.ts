import { z } from 'zod';

// ============================================================================
// Enums
// ============================================================================

export const ChatRoleEnum = z.enum(['user', 'assistant', 'system']);
export const ChatStreamEventTypeEnum = z.enum(['content', 'error', 'done']);

// ============================================================================
// Core Schemas
// ============================================================================

export const ChatMessageSchema = z.object({
  role: ChatRoleEnum,
  content: z.string(),
  toolExecutions: z.array(z.record(z.unknown())).optional(),
  taskList: z.array(z.record(z.unknown())).optional(),
});

// ============================================================================
// Request Schemas
// ============================================================================

export const ChatCompletionRequestSchema = z.object({
  messages: z.array(ChatMessageSchema).min(1),
  model: z.string().optional(),
  stream: z.boolean().default(false).optional(),
  temperature: z.number().min(0).max(2).default(0.7).optional(),
  maxTokens: z.number().int().min(1).max(128000).optional(),
  projectId: z.string().optional(),
  conversationId: z.string().optional(),
  toolsEnabled: z.boolean().default(true).optional(),
  attachments: z.array(z.record(z.unknown())).optional(),
});

// ============================================================================
// Event Schemas
// ============================================================================

export const ChatStreamEventSchema = z.object({
  type: ChatStreamEventTypeEnum,
  data: z.unknown().optional(),
});

// ============================================================================
// Response Schemas
// ============================================================================

export const ChatConversationResponseSchema = z.object({
  id: z.string(),
  title: z.string().nullable().optional(),
  projectId: z.string().nullable().optional(),
  workspaceId: z.string(),
  messages: z.array(ChatMessageSchema),
  modelUsed: z.string().nullable().optional(),
  messageCount: z.number().int().default(0),
  isArchived: z.boolean().default(false),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime().nullable().optional(),
});

// ============================================================================
// Inferred Types
// ============================================================================

export type ChatMessage = z.infer<typeof ChatMessageSchema>;
export type ChatCompletionRequest = z.infer<typeof ChatCompletionRequestSchema>;
export type ChatStreamEvent = z.infer<typeof ChatStreamEventSchema>;
export type ChatConversationResponse = z.infer<typeof ChatConversationResponseSchema>;
