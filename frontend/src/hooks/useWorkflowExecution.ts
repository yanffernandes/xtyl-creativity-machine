import { useState, useCallback, useEffect, useRef } from 'react';
import api from '@/lib/api';
import { useToast } from '@/components/ui/use-toast';

export type ExecutionStatus = 'idle' | 'running' | 'paused' | 'completed' | 'failed' | 'stopped';

interface ExecutionState {
  status: ExecutionStatus;
  currentNodeId: string | null;
  progress: number;
  logs: string[];
  outputs: Record<string, any>;
  error: string | null;
  executionId: string | null;
}

interface ProgressUpdate {
  type: 'progress' | 'node_complete' | 'error' | 'complete' | 'done';
  node_id?: string;
  message?: string;
  progress?: number;
  data?: any;
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
  const { toast } = useToast();
  const eventSourceRef = useRef<EventSource | null>(null);

  // Cleanup SSE connection on unmount
  useEffect(() => {
    return () => {
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
        eventSourceRef.current = null;
      }
    };
  }, []);

  const connectSSE = useCallback((executionId: string) => {
    // Close existing connection if any
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
    }

    // Create new EventSource connection
    const eventSource = new EventSource(
      `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'}/workflows/executions/${executionId}/stream`
    );

    eventSource.onmessage = (event) => {
      try {
        const update: ProgressUpdate = JSON.parse(event.data);

        setExecutionState(prev => {
          const newLogs = update.message ? [...prev.logs, update.message] : prev.logs;

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
                  [update.node_id || 'unknown']: update.data?.outputs || {}
                },
                logs: newLogs,
              };

            case 'complete':
              return {
                ...prev,
                status: 'completed',
                progress: 100,
                outputs: update.data?.outputs || prev.outputs,
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
              // Stream ended
              return prev;

            default:
              return prev;
          }
        });

        // Close connection when done
        if (update.type === 'done' || update.type === 'complete' || update.type === 'error') {
          eventSource.close();
          eventSourceRef.current = null;
        }
      } catch (error) {
        console.error('Failed to parse SSE message:', error);
      }
    };

    eventSource.onerror = (error) => {
      console.error('SSE connection error:', error);
      setExecutionState(prev => ({
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

  const startExecution = useCallback(async (projectId: string, inputVariables: Record<string, any> = {}) => {
    try {
      setExecutionState(prev => ({
        ...prev,
        status: 'running',
        error: null,
        progress: 0,
        logs: ['Starting execution...'],
        outputs: {},
      }));

      const response = await api.post('/workflows/executions/', {
        template_id: workflowId,
        project_id: projectId,
        config_json: inputVariables
      });

      const executionId = response.data.id;

      setExecutionState(prev => ({ ...prev, executionId }));

      // Connect to SSE stream for real-time updates
      connectSSE(executionId);

      toast({
        title: "Execution Started",
        description: "Workflow is running. Watch the progress below.",
      });

      return executionId;

    } catch (error: any) {
      console.error('Execution failed:', error);
      setExecutionState(prev => ({
        ...prev,
        status: 'failed',
        error: error.message || 'Failed to start execution',
        logs: [...prev.logs, `Error: ${error.message}`]
      }));

      toast({
        title: "Execution Failed",
        description: error.message || "Could not start workflow execution.",
        variant: "destructive",
      });
    }
  }, [workflowId, toast, connectSSE]);

  const pauseExecution = useCallback(async (executionId: string) => {
    try {
      await api.post(`/workflows/executions/${executionId}/pause`);
      setExecutionState(prev => ({
        ...prev,
        status: 'paused',
        logs: [...prev.logs, 'Execution paused by user.']
      }));
      toast({
        title: "Execution Paused",
        description: "Workflow execution has been paused.",
      });
    } catch (error) {
      console.error('Failed to pause execution:', error);
      toast({
        title: "Pause Failed",
        description: "Could not pause workflow execution.",
        variant: "destructive",
      });
    }
  }, [toast]);

  const resumeExecution = useCallback(async (executionId: string) => {
    try {
      await api.post(`/workflows/executions/${executionId}/resume`);
      setExecutionState(prev => ({
        ...prev,
        status: 'running',
        logs: [...prev.logs, 'Execution resumed.']
      }));

      // Reconnect to SSE stream
      connectSSE(executionId);

      toast({
        title: "Execution Resumed",
        description: "Workflow execution has been resumed.",
      });
    } catch (error) {
      console.error('Failed to resume execution:', error);
      toast({
        title: "Resume Failed",
        description: "Could not resume workflow execution.",
        variant: "destructive",
      });
    }
  }, [toast, connectSSE]);

  const stopExecution = useCallback(async (executionId: string) => {
    try {
      await api.post(`/workflows/executions/${executionId}/stop`);
      setExecutionState(prev => ({
        ...prev,
        status: 'stopped',
        logs: [...prev.logs, 'Execution stopped by user.']
      }));

      // Close SSE connection
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
        eventSourceRef.current = null;
      }

      toast({
        title: "Execution Stopped",
        description: "Workflow execution has been cancelled.",
      });
    } catch (error) {
      console.error('Failed to stop execution:', error);
      toast({
        title: "Stop Failed",
        description: "Could not stop workflow execution.",
        variant: "destructive",
      });
    }
  }, [toast]);

  return {
    executionState,
    startExecution,
    pauseExecution,
    resumeExecution,
    stopExecution
  };
}

