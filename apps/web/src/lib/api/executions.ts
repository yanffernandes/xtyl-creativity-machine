/**
 * Execution API Client
 *
 * Client for workflow execution operations.
 * Handles execution start, monitoring, and control (pause/resume/stop).
 */

import {
  ExecutionStartRequest,
  ExecutionStatusResponse,
  ExecutionSummary,
  ExecutionControlResponse,
  NodeExecutionLog,
} from '../workflow-schema';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

/**
 * Start workflow execution
 */
export async function executeWorkflow(
  request: ExecutionStartRequest,
  token: string
): Promise<ExecutionStatusResponse> {
  const response = await fetch(
    `${API_BASE_URL}/workflows/${request.workflow_id}/execute`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify({
        project_id: request.project_id,
        input_variables: request.input_variables || {},
      }),
    }
  );

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.detail || 'Failed to start workflow execution');
  }

  return response.json();
}

/**
 * Get execution status
 */
export async function getExecutionStatus(
  executionId: string,
  token: string
): Promise<ExecutionStatusResponse> {
  const response = await fetch(
    `${API_BASE_URL}/workflows/executions/${executionId}`,
    {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    }
  );

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.detail || 'Failed to fetch execution status');
  }

  return response.json();
}

/**
 * List executions with optional filters
 */
export async function listExecutions(
  token: string,
  filters?: {
    workflow_id?: string;
    project_id?: string;
    workspace_id?: string;
    status?: string;
    limit?: number;
  }
): Promise<ExecutionSummary[]> {
  const params = new URLSearchParams();

  if (filters) {
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        params.append(key, String(value));
      }
    });
  }

  const url = `${API_BASE_URL}/workflows/executions?${params.toString()}`;

  const response = await fetch(url, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.detail || 'Failed to list executions');
  }

  return response.json();
}

/**
 * Pause a running execution
 */
export async function pauseExecution(
  executionId: string,
  token: string
): Promise<ExecutionControlResponse> {
  const response = await fetch(
    `${API_BASE_URL}/workflows/executions/${executionId}/pause`,
    {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    }
  );

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.detail || 'Failed to pause execution');
  }

  return response.json();
}

/**
 * Resume a paused execution
 */
export async function resumeExecution(
  executionId: string,
  token: string
): Promise<ExecutionControlResponse> {
  const response = await fetch(
    `${API_BASE_URL}/workflows/executions/${executionId}/resume`,
    {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    }
  );

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.detail || 'Failed to resume execution');
  }

  return response.json();
}

/**
 * Stop a running execution
 */
export async function stopExecution(
  executionId: string,
  token: string
): Promise<ExecutionControlResponse> {
  const response = await fetch(
    `${API_BASE_URL}/workflows/executions/${executionId}/stop`,
    {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    }
  );

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.detail || 'Failed to stop execution');
  }

  return response.json();
}

/**
 * Retry a failed execution
 */
export async function retryExecution(
  executionId: string,
  token: string
): Promise<ExecutionStatusResponse> {
  const response = await fetch(
    `${API_BASE_URL}/workflows/executions/${executionId}/retry`,
    {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    }
  );

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.detail || 'Failed to retry execution');
  }

  return response.json();
}

/**
 * Get execution logs
 */
export async function getExecutionLogs(
  executionId: string,
  token: string
): Promise<NodeExecutionLog[]> {
  const response = await fetch(
    `${API_BASE_URL}/workflows/executions/${executionId}/logs`,
    {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    }
  );

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.detail || 'Failed to fetch execution logs');
  }

  return response.json();
}

/**
 * Stream execution progress using Server-Sent Events (SSE)
 *
 * @param executionId - The execution ID to monitor
 * @param token - Auth token
 * @param onProgress - Callback for progress updates
 * @param onComplete - Callback when execution completes
 * @param onError - Callback for errors
 * @returns Function to close the SSE connection
 */
export function streamExecutionProgress(
  executionId: string,
  token: string,
  onProgress: (status: ExecutionStatusResponse) => void,
  onComplete: (status: ExecutionStatusResponse) => void,
  onError: (error: Error) => void
): () => void {
  const url = `${API_BASE_URL}/workflows/executions/${executionId}/stream?token=${encodeURIComponent(
    token
  )}`;

  const eventSource = new EventSource(url);

  eventSource.onmessage = (event) => {
    try {
      const status: ExecutionStatusResponse = JSON.parse(event.data);

      // Call progress callback
      onProgress(status);

      // Check if execution completed
      if (
        status.status === 'completed' ||
        status.status === 'failed' ||
        status.status === 'cancelled'
      ) {
        onComplete(status);
        eventSource.close();
      }
    } catch (error) {
      onError(
        error instanceof Error ? error : new Error('Failed to parse SSE data')
      );
    }
  };

  eventSource.onerror = (event) => {
    onError(new Error('SSE connection error'));
    eventSource.close();
  };

  // Return cleanup function
  return () => {
    eventSource.close();
  };
}
