/**
 * Workflow API Client
 *
 * Client for workflow CRUD operations.
 * Handles communication with backend workflow endpoints.
 */

import {
  WorkflowTemplateCreate,
  WorkflowTemplateUpdate,
  WorkflowTemplateDetail,
  ValidationResult,
} from '../workflow-schema';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

/**
 * Create a new workflow template
 */
export async function createWorkflow(
  workflow: WorkflowTemplateCreate,
  token: string
): Promise<WorkflowTemplateDetail> {
  const response = await fetch(`${API_BASE_URL}/workflows`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    },
    body: JSON.stringify(workflow),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.detail || 'Failed to create workflow');
  }

  return response.json();
}

/**
 * Get a single workflow by ID
 */
export async function getWorkflow(
  workflowId: string,
  token: string
): Promise<WorkflowTemplateDetail> {
  const response = await fetch(`${API_BASE_URL}/workflows/${workflowId}`, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.detail || 'Failed to fetch workflow');
  }

  return response.json();
}

/**
 * List workflows with optional filters
 */
export async function listWorkflows(
  token: string,
  filters?: {
    workspace_id?: string;
    project_id?: string;
    category?: string;
    is_system?: boolean;
    is_recommended?: boolean;
  }
): Promise<WorkflowTemplateDetail[]> {
  const params = new URLSearchParams();

  if (filters) {
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        params.append(key, String(value));
      }
    });
  }

  const url = `${API_BASE_URL}/workflows?${params.toString()}`;

  const response = await fetch(url, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.detail || 'Failed to list workflows');
  }

  return response.json();
}

/**
 * Update an existing workflow
 */
export async function updateWorkflow(
  workflowId: string,
  updates: WorkflowTemplateUpdate,
  token: string
): Promise<WorkflowTemplateDetail> {
  const response = await fetch(`${API_BASE_URL}/workflows/${workflowId}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    },
    body: JSON.stringify(updates),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.detail || 'Failed to update workflow');
  }

  return response.json();
}

/**
 * Delete a workflow
 */
export async function deleteWorkflow(
  workflowId: string,
  token: string
): Promise<void> {
  const response = await fetch(`${API_BASE_URL}/workflows/${workflowId}`, {
    method: 'DELETE',
    headers: {
      'Authorization': `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.detail || 'Failed to delete workflow');
  }
}

/**
 * Duplicate an existing workflow
 */
export async function duplicateWorkflow(
  workflowId: string,
  token: string,
  newName?: string
): Promise<WorkflowTemplateDetail> {
  const response = await fetch(
    `${API_BASE_URL}/workflows/${workflowId}/duplicate`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify({ name: newName }),
    }
  );

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.detail || 'Failed to duplicate workflow');
  }

  return response.json();
}

/**
 * Validate workflow structure
 */
export async function validateWorkflow(
  workflow: { nodes: any[]; edges: any[] },
  token: string
): Promise<ValidationResult> {
  const response = await fetch(`${API_BASE_URL}/workflows/validate`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    },
    body: JSON.stringify(workflow),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.detail || 'Failed to validate workflow');
  }

  return response.json();
}
