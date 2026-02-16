import { useState, useCallback, useEffect, useRef } from 'react';
import api from '@/lib/api';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';

export type ExecutionStatus =
  | 'idle'
  | 'running'
  | 'paused'
  | 'completed'
  | 'failed'
  | 'stopped';

interface ExecutionState {
  status: ExecutionStatus;
  currentNodeId: string | null;
  progress: number;
  logs: string[];
  outputs: Record<string, Record<string, unknown>>;
  error: string | null;
  executionId: string | null;
}

interface ProgressUpdate {
  type: 'progress' | 'node_complete' | 'error' | 'complete' | 'done';
  node_id?: string;
  message?: string;
  progress?: number;
  data?: Record<string, unknown>;
}

export function useWorkflowExecution(workflowId: string) {
  const [executionState, setExecutionState] = useState<ExecutionState>({
    status: 'idle',
    currentNodeId: null,
    progress: 0,
    logs: [],
    outputs: {},
    error: null,
    executionId: null,
  });
  const eventSourceRef = useRef<EventSource | null>(null);

  useEffect(() => {
    return () => {
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
        eventSourceRef.current = null;
      }
    };
  }, []);

  const connectSSE = useCallback(async (executionId: string) => {
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
    }

    const {
      data: { session },
    } = await supabase.auth.getSession();
    const token = session?.access_token;

    if (!token) {
      console.error('No auth token available for SSE connection');
      return;
    }

    const baseUrl = api.defaults.baseURL || 'http://localhost:3001';
    const eventSource = new EventSource(
      `${baseUrl}/api/workflows/executions/${executionId}/stream?token=${encodeURIComponent(token)}`,
    );

    eventSource.onmessage = (event) => {
      try {
        const update: ProgressUpdate = JSON.parse(event.data);

        setExecutionState((prev) => {
          const newLogs = update.message
            ? [...prev.logs, update.message]
            : prev.logs;

          switch (update.type) {
            case 'progress':
              return {
                ...prev,
                status: 'running',
                currentNodeId: update.node_id || prev.currentNodeId,
                progress: update.progress || prev.progress,
                logs: newLogs,
              };
            case 'node_complete':
              return {
                ...prev,
                status: 'running',
                currentNodeId: update.node_id || prev.currentNodeId,
                progress: update.progress || prev.progress,
                outputs: {
                  ...prev.outputs,
                  [update.node_id || 'unknown']:
                    (update.data?.outputs as Record<string, unknown>) || {},
                },
                logs: newLogs,
              };
            case 'complete':
              return {
                ...prev,
                status: 'completed',
                progress: 100,
                outputs:
                  (update.data?.outputs as Record<
                    string,
                    Record<string, unknown>
                  >) || prev.outputs,
                logs: newLogs,
              };
            case 'error':
              return {
                ...prev,
                status: 'failed',
                error: update.message || 'Unknown error',
                logs: newLogs,
              };
            case 'done':
              return prev;
            default:
              return prev;
          }
        });

        if (
          update.type === 'done' ||
          update.type === 'complete' ||
          update.type === 'error'
        ) {
          eventSource.close();
          eventSourceRef.current = null;
        }
      } catch (err) {
        console.error('Failed to parse SSE message:', err);
      }
    };

    eventSource.onerror = () => {
      console.error('SSE connection error');
      setExecutionState((prev) => ({
        ...prev,
        status: 'failed',
        error: 'Connection to execution stream lost',
        logs: [...prev.logs, 'Error: Lost connection to execution stream'],
      }));
      eventSource.close();
      eventSourceRef.current = null;
    };

    eventSourceRef.current = eventSource;
  }, []);

  const startExecution = useCallback(
    async (
      projectId: string,
      inputVariables: Record<string, unknown> = {},
    ) => {
      try {
        setExecutionState((prev) => ({
          ...prev,
          status: 'running',
          error: null,
          progress: 0,
          logs: ['Starting execution...'],
          outputs: {},
        }));

        const response = await api.post('/api/workflows/executions/', {
          template_id: workflowId,
          project_id: projectId,
          config_json: inputVariables,
        });

        const executionId = response.data.id;
        setExecutionState((prev) => ({ ...prev, executionId }));
        connectSSE(executionId);

        toast.success('Workflow execution started');
        return executionId;
      } catch (error: unknown) {
        const message =
          error instanceof Error
            ? error.message
            : 'Failed to start execution';
        console.error('Execution failed:', error);
        setExecutionState((prev) => ({
          ...prev,
          status: 'failed',
          error: message,
          logs: [...prev.logs, `Error: ${message}`],
        }));
        toast.error(message);
      }
    },
    [workflowId, connectSSE],
  );

  const pauseExecution = useCallback(async (executionId: string) => {
    try {
      await api.post(`/api/workflows/executions/${executionId}/pause`);
      setExecutionState((prev) => ({
        ...prev,
        status: 'paused',
        logs: [...prev.logs, 'Execution paused by user.'],
      }));
      toast.info('Execution paused');
    } catch {
      toast.error('Failed to pause execution');
    }
  }, []);

  const resumeExecution = useCallback(
    async (executionId: string) => {
      try {
        await api.post(`/api/workflows/executions/${executionId}/resume`);
        setExecutionState((prev) => ({
          ...prev,
          status: 'running',
          logs: [...prev.logs, 'Execution resumed.'],
        }));
        connectSSE(executionId);
        toast.info('Execution resumed');
      } catch {
        toast.error('Failed to resume execution');
      }
    },
    [connectSSE],
  );

  const stopExecution = useCallback(async (executionId: string) => {
    try {
      await api.post(`/api/workflows/executions/${executionId}/stop`);
      setExecutionState((prev) => ({
        ...prev,
        status: 'stopped',
        logs: [...prev.logs, 'Execution stopped by user.'],
      }));
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
        eventSourceRef.current = null;
      }
      toast.info('Execution stopped');
    } catch {
      toast.error('Failed to stop execution');
    }
  }, []);

  return {
    executionState,
    startExecution,
    pauseExecution,
    resumeExecution,
    stopExecution,
  };
}
