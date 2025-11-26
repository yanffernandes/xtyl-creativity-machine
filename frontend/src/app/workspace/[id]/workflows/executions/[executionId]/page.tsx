"use client";

import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, Play, Pause, Square, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useWorkflowExecution } from "@/hooks/useWorkflowExecution";
import ExecutionProgress from "@/components/workflow/ExecutionProgress";

export default function ExecutionDetailPage() {
  const params = useParams();
  const router = useRouter();
  const workspaceId = params.id as string;
  const executionId = params.executionId as string;

  const { execution, loading, error } = useWorkflowExecution(executionId, {
    polling: true,
    interval: 2000,
  });

  const handlePause = async () => {
    try {
      await fetch(`http://localhost:8000/workflows/executions/${executionId}/pause`, {
        method: "POST",
        credentials: "include",
      });
    } catch (err) {
      console.error("Error pausing execution:", err);
    }
  };

  const handleResume = async () => {
    try {
      await fetch(`http://localhost:8000/workflows/executions/${executionId}/resume`, {
        method: "POST",
        credentials: "include",
      });
    } catch (err) {
      console.error("Error resuming execution:", err);
    }
  };

  const handleStop = async () => {
    if (!confirm("Are you sure you want to stop this workflow? This action cannot be undone.")) {
      return;
    }

    try {
      await fetch(`http://localhost:8000/workflows/executions/${executionId}/stop`, {
        method: "POST",
        credentials: "include",
      });
    } catch (err) {
      console.error("Error stopping execution:", err);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 dark:from-[#0A0E14] dark:to-[#0A0E14] p-8 flex items-center justify-center">
        <div className="text-center">
          <RefreshCw className="w-8 h-8 text-[#5B8DEF] animate-spin mx-auto mb-4" />
          <p className="text-gray-600 dark:text-gray-400">Loading execution...</p>
        </div>
      </div>
    );
  }

  if (error || !execution) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 dark:from-[#0A0E14] dark:to-[#0A0E14] p-8 flex items-center justify-center">
        <Card className="p-12 text-center bg-white/80 dark:bg-gray-900/80 backdrop-blur-xl">
          <p className="text-red-600 dark:text-red-400 font-medium mb-4">
            {error || "Execution not found"}
          </p>
          <Button
            onClick={() => router.push(`/workspace/${workspaceId}/workflows`)}
            variant="outline"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Workflows
          </Button>
        </Card>
      </div>
    );
  }

  const canPause = execution.status === "running";
  const canResume = execution.status === "paused";
  const canStop = execution.status === "running" || execution.status === "paused";

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 dark:from-[#0A0E14] dark:to-[#0A0E14] p-8">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <Button
            onClick={() => router.push(`/workspace/${workspaceId}/workflows`)}
            variant="ghost"
            className="gap-2"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Workflows
          </Button>

          {/* Control Buttons */}
          <div className="flex items-center gap-2">
            {canPause && (
              <Button
                onClick={handlePause}
                variant="outline"
                size="sm"
                className="gap-2"
              >
                <Pause className="w-4 h-4" />
                Pause
              </Button>
            )}

            {canResume && (
              <Button
                onClick={handleResume}
                size="sm"
                className="gap-2 bg-gradient-to-r from-[#5B8DEF] to-[#4A7AD9] text-white"
              >
                <Play className="w-4 h-4" />
                Resume
              </Button>
            )}

            {canStop && (
              <Button
                onClick={handleStop}
                variant="outline"
                size="sm"
                className="gap-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-950"
              >
                <Square className="w-4 h-4" />
                Stop
              </Button>
            )}
          </div>
        </div>

        {/* Execution Info */}
        <Card className="p-6 bg-white/80 dark:bg-gray-900/80 backdrop-blur-xl border-gray-200 dark:border-gray-800">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
            Workflow Execution
          </h1>
          <p className="text-gray-600 dark:text-gray-400 text-sm font-mono">
            ID: {execution.id}
          </p>
        </Card>

        {/* Progress Card */}
        <Card className="p-6 bg-white/80 dark:bg-gray-900/80 backdrop-blur-xl border-gray-200 dark:border-gray-800">
          <ExecutionProgress execution={execution} />
        </Card>

        {/* Configuration */}
        {Object.keys(execution.config_json || {}).length > 0 && (
          <Card className="p-6 bg-white/80 dark:bg-gray-900/80 backdrop-blur-xl border-gray-200 dark:border-gray-800">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              Configuration
            </h2>
            <div className="space-y-3">
              {Object.entries(execution.config_json).map(([key, value]) => (
                <div
                  key={key}
                  className="flex justify-between py-2 border-b border-gray-200 dark:border-gray-800 last:border-0"
                >
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-300 capitalize">
                    {key.replace(/_/g, " ")}
                  </span>
                  <span className="text-sm text-gray-600 dark:text-gray-400">
                    {typeof value === "string" ? value : JSON.stringify(value)}
                  </span>
                </div>
              ))}
            </div>
          </Card>
        )}

        {/* Success Message */}
        {execution.status === "completed" && (
          <Card className="p-6 bg-green-50 dark:bg-green-950/30 border-green-200 dark:border-green-900 backdrop-blur-xl">
            <div className="text-center">
              <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-green-500 mb-4">
                <svg
                  className="w-6 h-6 text-white"
                  fill="none"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path d="M5 13l4 4L19 7"></path>
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-green-900 dark:text-green-200 mb-2">
                Workflow Completed Successfully!
              </h3>
              <p className="text-sm text-green-700 dark:text-green-300">
                All tasks have been completed. Check your project for the generated content.
              </p>
            </div>
          </Card>
        )}
      </div>
    </div>
  );
}
