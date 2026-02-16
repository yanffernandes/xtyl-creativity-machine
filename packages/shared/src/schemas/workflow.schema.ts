import { z } from 'zod';

// ============================================================================
// Enums
// ============================================================================

export const WorkflowNodeTypeEnum = z.enum([
  'start',
  'finish',
  'text_generation',
  'image_generation',
  'processing',
  'context_retrieval',
  'conditional',
  'loop',
]);

export const ExecutionStatusEnum = z.enum([
  'pending',
  'running',
  'paused',
  'completed',
  'failed',
  'stopped',
]);

// ============================================================================
// Nested Schemas
// ============================================================================

export const WorkflowNodePositionSchema = z.object({
  x: z.number(),
  y: z.number(),
});

export const WorkflowNodeSchema = z.object({
  id: z.string(),
  type: WorkflowNodeTypeEnum,
  data: z.object({
    label: z.string(),
    model: z.string().optional(),
    prompt: z.string().optional(),
    maxTokens: z.number().int().optional(),
    temperature: z.number().min(0).max(2).optional(),
    outputFormat: z.string().optional(),
    condition: z.string().optional(),
    iterations: z.number().int().optional(),
    maxIterations: z.number().int().optional(),
    maxResults: z.number().int().optional(),
    filters: z.record(z.unknown()).optional(),
    inputVariables: z.array(z.record(z.unknown())).optional(),
    saveToProject: z.boolean().optional(),
    documentTitle: z.string().optional(),
    notifyUser: z.boolean().optional(),
    size: z.string().optional(),
    style: z.string().optional(),
  }).passthrough(),
  position: WorkflowNodePositionSchema,
});

export const WorkflowEdgeSchema = z.object({
  id: z.string(),
  source: z.string(),
  target: z.string(),
  sourceHandle: z.string().nullable().optional(),
  targetHandle: z.string().nullable().optional(),
  label: z.string().optional(),
  type: z.string().default('smoothstep').optional(),
});

// ============================================================================
// Request Schemas
// ============================================================================

export const CreateWorkflowTemplateSchema = z.object({
  name: z.string().min(1).max(200),
  description: z.string().max(2000).optional(),
  projectId: z.string(),
  nodesJson: z.array(WorkflowNodeSchema),
  edgesJson: z.array(WorkflowEdgeSchema),
  category: z.string().optional(),
  defaultParamsJson: z.record(z.unknown()).optional(),
});

export const UpdateWorkflowTemplateSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  description: z.string().max(2000).optional(),
  nodesJson: z.array(WorkflowNodeSchema).optional(),
  edgesJson: z.array(WorkflowEdgeSchema).optional(),
  category: z.string().optional(),
  defaultParamsJson: z.record(z.unknown()).optional(),
});

export const CreateExecutionSchema = z.object({
  configJson: z.record(z.unknown()).optional(),
  inputVariables: z.record(z.unknown()).optional(),
});

// ============================================================================
// Response Schemas
// ============================================================================

export const WorkflowTemplateResponseSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string().nullable().optional(),
  projectId: z.string().nullable().optional(),
  workspaceId: z.string().nullable().optional(),
  category: z.string().nullable().optional(),
  nodesJson: z.array(WorkflowNodeSchema),
  edgesJson: z.array(WorkflowEdgeSchema),
  defaultParamsJson: z.record(z.unknown()).nullable().optional(),
  isSystem: z.boolean().default(false),
  usageCount: z.number().int().default(0),
  createdBy: z.string().nullable().optional(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime().nullable().optional(),
});

export const WorkflowExecutionResponseSchema = z.object({
  id: z.string(),
  templateId: z.string(),
  projectId: z.string(),
  workspaceId: z.string(),
  userId: z.string(),
  status: ExecutionStatusEnum,
  progressPercent: z.number().int().min(0).max(100).default(0),
  currentNodeId: z.string().nullable().optional(),
  errorMessage: z.string().nullable().optional(),
  executionContext: z.record(z.unknown()).nullable().optional(),
  configJson: z.record(z.unknown()).nullable().optional(),
  totalCost: z.number().default(0),
  startedAt: z.string().datetime().nullable().optional(),
  completedAt: z.string().datetime().nullable().optional(),
  createdAt: z.string().datetime(),
});

// ============================================================================
// Inferred Types
// ============================================================================

export type WorkflowNode = z.infer<typeof WorkflowNodeSchema>;
export type WorkflowEdge = z.infer<typeof WorkflowEdgeSchema>;
export type WorkflowNodePosition = z.infer<typeof WorkflowNodePositionSchema>;
export type CreateWorkflowTemplate = z.infer<typeof CreateWorkflowTemplateSchema>;
export type UpdateWorkflowTemplate = z.infer<typeof UpdateWorkflowTemplateSchema>;
export type CreateExecution = z.infer<typeof CreateExecutionSchema>;
export type WorkflowTemplateResponse = z.infer<typeof WorkflowTemplateResponseSchema>;
export type WorkflowExecutionResponse = z.infer<typeof WorkflowExecutionResponseSchema>;
