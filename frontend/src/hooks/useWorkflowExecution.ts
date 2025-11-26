"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import api from "@/lib/api";

export interface WorkflowExecution {
  id: string;
  template_id: string;
  project_id: string;
  workspace_id: string;
  user_id: string;
  status: "pending" | "running" | "paused" | "completed" | "failed" | "stopped";
  config_json: Record<string, any>;
  progress_percent: number;
  current_node_id: string | null;
  error_message: string | null;
  total_cost: number;
  started_at: string | null;
  completed_at: string | null;
  created_at: string;
}

interface UseWorkflowExecutionResult {
  execution: WorkflowExecution | null;
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

export function useWorkflowExecution(
  executionId: string,
  { polling = true, interval = 2000 }: { polling?: boolean; interval?: number } = {}
): UseWorkflowExecutionResult {
  const [execution, setExecution] = useState<WorkflowExecution | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchExecution = useCallback(async () => {
    try {
      const response = await api.get(`/workflows/executions/${executionId}`);
      setExecution(response.data);
      setError(null);
    } catch (err: any) {
      console.error("Error fetching execution:", err);
      setError(err.message || "Failed to fetch execution");
    } finally {
      setLoading(false);
    }
  }, [executionId]);

  useEffect(() => {
    fetchExecution();
  }, [fetchExecution]);

  useEffect(() => {
    if (!polling) return;

    // Stop polling if execution is in terminal state
    if (
      execution?.status === "completed" ||
      execution?.status === "failed" ||
      execution?.status === "stopped"
    ) {
      return;
    }

    const intervalId = setInterval(fetchExecution, interval);

    return () => clearInterval(intervalId);
  }, [polling, interval, fetchExecution, execution?.status]);

  return {
    execution,
    loading,
    error,
    refetch: fetchExecution,
  };
}

// ============================================================================
// SSE-based Execution Hook (for real-time progress streaming)
// ============================================================================

export interface ExecutionProgress {
  type: 'progress' | 'node_complete' | 'error' | 'complete' | 'done';
  node_id?: string;
  message: string;
  progress: number;
  data?: any;
}

export interface ExecutionState {
  id: string | null;
  status: 'idle' | 'launching' | 'running' | 'completed' | 'failed';
  progress: number;
  message: string;
  currentNodeId: string | null;
  outputs: Record<string, any>;
  error: string | null;
  logs: ExecutionProgress[];
}

export interface UseWorkflowExecutionStreamReturn {
  state: ExecutionState;
  launchExecution: (templateId: string, projectId: string, inputs?: any) => Promise<void>;
  cancelExecution: () => void;
  clearLogs: () => void;
}

/**
 * Hook for executing workflows with SSE progress streaming
 */
export function useWorkflowExecutionStream(): UseWorkflowExecutionStreamReturn {
  const [state, setState] = useState<ExecutionState>({
    id: null,
    status: 'idle',
    progress: 0,
    message: '',
    currentNodeId: null,
    outputs: {},
    error: null,
    logs: []
  });

  const eventSourceRef = useRef<EventSource | null>(null);

  // Clean up SSE connection on unmount
  useEffect(() => {
    return () => {
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
        eventSourceRef.current = null;
      }
    };
  }, []);

  const launchExecution = useCallback(async (
    templateId: string,
    projectId: string,
    inputs?: any
  ) => {
    try {
      setState(prev => ({
        ...prev,
        status: 'launching',
        message: 'Launching workflow...',
        progress: 0,
        error: null,
        logs: []
      }));

      // Create execution
      const response = await api.post('/workflows/executions', {
        template_id: templateId,
        project_id: projectId,
        inputs: inputs || {}
      });

      const executionId = response.data.id;

      setState(prev => ({
        ...prev,
        id: executionId,
        status: 'running',
        message: 'Connecting to execution stream...'
      }));

      // Connect to SSE stream
      const token = localStorage.getItem('token');
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
      const streamUrl = `${apiUrl}/workflows/executions/${executionId}/stream`;

      const eventSource = new EventSource(streamUrl);

      eventSourceRef.current = eventSource;

      eventSource.onmessage = (event) => {
        try {
          const progress: ExecutionProgress = JSON.parse(event.data);

          // Handle different event types
          if (progress.type === 'done') {
            eventSource.close();
            eventSourceRef.current = null;
            return;
          }

          if (progress.type === 'error') {
            setState(prev => ({
              ...prev,
              status: 'failed',
              error: progress.message,
              message: progress.message,
              logs: [...prev.logs, progress]
            }));
            eventSource.close();
            eventSourceRef.current = null;
            return;
          }

          if (progress.type === 'complete') {
            setState(prev => ({
              ...prev,
              status: 'completed',
              progress: 100,
              message: progress.message,
              outputs: progress.data?.outputs || prev.outputs,
              logs: [...prev.logs, progress]
            }));
            eventSource.close();
            eventSourceRef.current = null;
            return;
          }

          // Update state with progress
          setState(prev => ({
            ...prev,
            progress: progress.progress,
            message: progress.message,
            currentNodeId: progress.node_id || prev.currentNodeId,
            logs: [...prev.logs, progress]
          }));

          // Store node outputs
          if (progress.type === 'node_complete' && progress.data?.outputs) {
            setState(prev => ({
              ...prev,
              outputs: {
                ...prev.outputs,
                [progress.node_id!]: progress.data.outputs
              }
            }));
          }

        } catch (error) {
          console.error('Error parsing SSE message:', error);
        }
      };

      eventSource.onerror = (error) => {
        console.error('SSE connection error:', error);
        setState(prev => ({
          ...prev,
          status: 'failed',
          error: 'Connection to execution stream failed',
          message: 'Connection error'
        }));
        eventSource.close();
        eventSourceRef.current = null;
      };

    } catch (error: any) {
      console.error('Failed to launch workflow:', error);
      setState(prev => ({
        ...prev,
        status: 'failed',
        error: error.response?.data?.detail || error.message || 'Failed to launch workflow',
        message: 'Launch failed'
      }));
    }
  }, []);

  const cancelExecution = useCallback(() => {
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
      eventSourceRef.current = null;
    }

    setState(prev => ({
      ...prev,
      status: 'idle',
      message: 'Execution cancelled',
      progress: 0
    }));
  }, []);

  const clearLogs = useCallback(() => {
    setState(prev => ({
      ...prev,
      logs: []
    }));
  }, []);

  return {
    state,
    launchExecution,
    cancelExecution,
    clearLogs
  };
}
