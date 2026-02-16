/**
 * Workflow Schema Types
 *
 * TypeScript interfaces matching backend schemas and JSON Schema contracts.
 * Used for type-safe workflow creation and editing with ReactFlow.
 */

// ============================================================================
// NODE POSITION & BASE TYPES
// ============================================================================

export interface NodePosition {
  x: number;
  y: number;
}

// ============================================================================
// NODE DATA TYPES (per node type)
// ============================================================================

export interface StartNodeData {
  label: string;
  inputVariables?: Array<{
    name: string;
    type: string;
    required?: boolean;
    defaultValue?: string;
  }>;
}

export interface FinishNodeData {
  label: string;
  saveToProject?: boolean;
  documentTitle?: string;
  notifyUser?: boolean;
}

export interface TextGenerationNodeData {
  label: string;
  prompt: string;
  model: string;
  maxTokens?: number;
  temperature?: number;
  outputFormat?: 'text' | 'json' | 'markdown';
}

export interface ImageGenerationNodeData {
  label: string;
  prompt: string;
  model: string;
  size?: string;
  style?: string;
}

export interface ConditionalNodeData {
  label: string;
  condition: string;
}

export interface LoopNodeData {
  label: string;
  iterations?: number;
  condition?: string;
  maxIterations?: number;
}

export interface ContextRetrievalNodeData {
  label: string;
  filters?: {
    status?: string;
    asset_type?: string;
    tags?: string[];
    [key: string]: unknown;
  };
  maxResults?: number;
}

export interface ProcessingNodeData {
  label: string;
  prompt: string;
  model: string;
  outputFormat?: 'text' | 'json' | 'markdown';
}

export type NodeData =
  | StartNodeData
  | FinishNodeData
  | TextGenerationNodeData
  | ImageGenerationNodeData
  | ConditionalNodeData
  | LoopNodeData
  | ContextRetrievalNodeData
  | ProcessingNodeData;

// ============================================================================
// WORKFLOW NODE
// ============================================================================

export type NodeType =
  | 'start'
  | 'finish'
  | 'text_generation'
  | 'image_generation'
  | 'conditional'
  | 'loop'
  | 'context_retrieval'
  | 'processing';

export interface WorkflowNode {
  id: string;
  type: NodeType;
  position: NodePosition;
  data: Record<string, unknown>;
}

// ============================================================================
// WORKFLOW EDGE
// ============================================================================

export interface WorkflowEdge {
  id: string;
  source: string;
  target: string;
  sourceHandle?: string;
  targetHandle?: string;
  label?: string;
  type?: string;
}

// ============================================================================
// WORKFLOW TEMPLATE
// ============================================================================

export interface WorkflowTemplateBase {
  name: string;
  description?: string;
  category?: string;
}

export interface WorkflowTemplateCreate extends WorkflowTemplateBase {
  workspace_id: string;
  nodes: WorkflowNode[];
  edges: WorkflowEdge[];
  default_params?: Record<string, unknown>;
  is_system?: boolean;
  is_recommended?: boolean;
  version?: string;
}

export interface WorkflowTemplateUpdate {
  name?: string;
  description?: string;
  category?: string;
  nodes?: WorkflowNode[];
  edges?: WorkflowEdge[];
  default_params?: Record<string, unknown>;
  is_recommended?: boolean;
}

export interface WorkflowTemplateDetail extends WorkflowTemplateBase {
  id: string;
  workspace_id: string;
  nodes: WorkflowNode[];
  edges: WorkflowEdge[];
  default_params: Record<string, unknown>;
  is_system: boolean;
  is_recommended: boolean;
  usage_count: number;
  version: string;
  created_by?: string;
  created_at: string;
  updated_at?: string;
}

// ============================================================================
// WORKFLOW EXECUTION
// ============================================================================

export interface ExecutionStartRequest {
  workflow_id: string;
  project_id: string;
  input_variables?: Record<string, unknown>;
}

export interface NodeExecutionLog {
  node_id: string;
  node_name: string;
  node_type: string;
  status: 'pending' | 'running' | 'completed' | 'failed';
  outputs?: Record<string, unknown>;
  error_message?: string;
  execution_order: number;
  started_at?: string;
  completed_at?: string;
}

export type ExecutionStatus =
  | 'pending'
  | 'running'
  | 'paused'
  | 'completed'
  | 'failed'
  | 'cancelled';

export interface ExecutionStatusResponse {
  id: string;
  workflow_id: string;
  project_id: string;
  workspace_id: string;
  user_id: string;
  status: ExecutionStatus;
  progress_percent: number;
  current_node_id?: string;
  error_message?: string;
  total_cost?: number;
  total_tokens_used?: number;
  started_at?: string;
  completed_at?: string;
  created_at: string;
}

export interface ExecutionSummary {
  id: string;
  workflow_id: string;
  workflow_name: string;
  status: ExecutionStatus;
  progress_percent: number;
  total_cost?: number;
  created_at: string;
  completed_at?: string;
}

export interface ExecutionControlResponse {
  execution_id: string;
  status: ExecutionStatus;
  message: string;
}

// ============================================================================
// VALIDATION RESULT
// ============================================================================

export interface ValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

// ============================================================================
// HELPER TYPES FOR REACTFLOW INTEGRATION
// ============================================================================

export interface ReactFlowNode extends WorkflowNode {
  selected?: boolean;
  dragging?: boolean;
}

export interface ReactFlowEdge extends WorkflowEdge {
  selected?: boolean;
  animated?: boolean;
}

export interface WorkflowDefinition {
  nodes: ReactFlowNode[];
  edges: ReactFlowEdge[];
}
