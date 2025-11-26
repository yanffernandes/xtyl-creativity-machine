"use client";

import { useState, useEffect, useCallback } from "react";
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
