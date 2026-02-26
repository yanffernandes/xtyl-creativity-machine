/**
 * Variable Validation API Client
 *
 * Provides functions to validate variable references and workflow structure
 */

import api from '../api';
import type { WorkflowNode, WorkflowEdge } from '../workflow-schema';

export interface VariableInfo {
  node_id: string;
  field_name: string;
  valid: boolean;
  node_exists: boolean;
  field_supported: boolean;
}

export interface VariableValidationResponse {
  valid: boolean;
  variables: VariableInfo[];
  errors: string[];
  warnings: string[];
}

export interface WorkflowValidationResponse {
  valid: boolean;
  errors: string[];
  warnings: string[];
  execution_order: string[] | null;
}

/**
 * Validate variable references in text
 */
export async function validateVariables(
  text: string,
  availableNodes: WorkflowNode[]
): Promise<VariableValidationResponse> {
  const response = await api.post('/validation/variables', {
    text,
    available_nodes: availableNodes.map(node => ({
      id: node.id,
      type: node.type,
      data: node.data
    }))
  });

  return response.data;
}

/**
 * Validate complete workflow structure
 */
export async function validateWorkflow(
  nodes: WorkflowNode[],
  edges: WorkflowEdge[]
): Promise<WorkflowValidationResponse> {
  const response = await api.post('/validation/workflow', {
    nodes: nodes.map(node => ({
      id: node.id,
      type: node.type,
      position: node.position,
      data: node.data
    })),
    edges: edges.map(edge => ({
      id: edge.id,
      source: edge.source,
      target: edge.target,
      sourceHandle: edge.sourceHandle,
      targetHandle: edge.targetHandle
    }))
  });

  return response.data;
}

/**
 * Get output fields for a specific node type
 */
export async function getNodeOutputFields(nodeType: string): Promise<string[]> {
  const response = await api.get(`/validation/node-fields/${nodeType}`);
  return response.data;
}

/**
 * Calculate execution order for workflow
 */
export async function calculateExecutionOrder(
  nodes: WorkflowNode[],
  edges: WorkflowEdge[]
): Promise<string[]> {
  const response = await api.post('/validation/execution-order', {
    nodes: nodes.map(node => ({
      id: node.id,
      type: node.type,
      position: node.position,
      data: node.data
    })),
    edges: edges.map(edge => ({
      id: edge.id,
      source: edge.source,
      target: edge.target,
      sourceHandle: edge.sourceHandle,
      targetHandle: edge.targetHandle
    }))
  });

  return response.data;
}

/**
 * Real-time variable validation hook
 * Returns validation state that updates as text changes
 */
export function useVariableValidation(
  text: string,
  nodes: WorkflowNode[],
  debounceMs: number = 500
) {
  const [validation, setValidation] = React.useState<VariableValidationResponse | null>(null);
  const [isValidating, setIsValidating] = React.useState(false);

  React.useEffect(() => {
    const timer = setTimeout(async () => {
      if (!text.trim()) {
        setValidation(null);
        return;
      }

      setIsValidating(true);
      try {
        const result = await validateVariables(text, nodes);
        setValidation(result);
      } catch (error) {
        console.error('Variable validation failed:', error);
        setValidation(null);
      } finally {
        setIsValidating(false);
      }
    }, debounceMs);

    return () => clearTimeout(timer);
  }, [text, nodes, debounceMs]);

  return { validation, isValidating };
}

// Export for use in components
import React from 'react';
