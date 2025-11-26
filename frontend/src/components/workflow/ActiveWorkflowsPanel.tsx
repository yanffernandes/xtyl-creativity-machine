"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  X,
  Loader2,
  CheckCircle2,
  XCircle,
  PauseCircle,
  PlayCircle,
  StopCircle,
  ExternalLink,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import api from "@/lib/api";
import { useRouter } from "next/navigation";

interface ActiveExecution {
  id: string;
  template_id: string;
  status: "pending" | "running" | "paused" | "completed" | "failed" | "stopped";
  progress_percent: number;
  current_node_id?: string;
  started_at: string;
  template?: {
    name: string;
    category: string;
  };
}

interface ActiveWorkflowsPanelProps {
  isOpen: boolean;
  onClose: () => void;
  workspaceId: string;
}

export default function ActiveWorkflowsPanel({
  isOpen,
  onClose,
  workspaceId,
}: ActiveWorkflowsPanelProps) {
  const router = useRouter();
  const [executions, setExecutions] = useState<ActiveExecution[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (isOpen) {
      fetchActiveExecutions();
      const interval = setInterval(fetchActiveExecutions, 3000); // Poll every 3 seconds
      return () => clearInterval(interval);
    }
  }, [isOpen, workspaceId]);

  const fetchActiveExecutions = async () => {
    try {
      const response = await api.get("/workflows/executions/", {
        params: {
          workspace_id: workspaceId,
          status: "running,paused,pending",
        },
      });
      setExecutions(response.data);
    } catch (error) {
      console.error("Error fetching active executions:", error);
    } finally {
      setLoading(false);
    }
  };

  const handlePause = async (executionId: string) => {
    try {
      await api.post(`/workflows/executions/${executionId}/pause`);
      await fetchActiveExecutions();
    } catch (error) {
      console.error("Error pausing execution:", error);
      alert("Failed to pause workflow");
    }
  };

  const handleResume = async (executionId: string) => {
    try {
      await api.post(`/workflows/executions/${executionId}/resume`);
      await fetchActiveExecutions();
    } catch (error) {
      console.error("Error resuming execution:", error);
      alert("Failed to resume workflow");
    }
  };

  const handleStop = async (executionId: string) => {
    if (!confirm("Are you sure you want to stop this workflow? This action cannot be undone.")) {
      return;
    }

    try {
      await api.post(`/workflows/executions/${executionId}/stop`);
      await fetchActiveExecutions();
    } catch (error) {
      console.error("Error stopping execution:", error);
      alert("Failed to stop workflow");
    }
  };

  const handleViewDetails = (executionId: string) => {
    router.push(`/workspace/${workspaceId}/workflows/executions/${executionId}`);
    onClose();
  };

  const getStatusIcon = (status: ActiveExecution["status"]) => {
    switch (status) {
      case "pending":
        return <Loader2 className="w-4 h-4 text-gray-500 animate-spin" />;
      case "running":
        return <Loader2 className="w-4 h-4 text-[#5B8DEF] animate-spin" />;
      case "paused":
        return <PauseCircle className="w-4 h-4 text-orange-500" />;
      case "completed":
        return <CheckCircle2 className="w-4 h-4 text-green-500" />;
      case "failed":
        return <XCircle className="w-4 h-4 text-red-500" />;
      case "stopped":
        return <StopCircle className="w-4 h-4 text-gray-500" />;
    }
  };

  const getStatusColor = (status: ActiveExecution["status"]) => {
    switch (status) {
      case "running":
        return "text-blue-600 bg-blue-100 dark:bg-blue-950";
      case "paused":
        return "text-orange-600 bg-orange-100 dark:bg-orange-950";
      case "pending":
        return "text-gray-600 bg-gray-100 dark:bg-gray-800";
      default:
        return "text-gray-600 bg-gray-100 dark:bg-gray-800";
    }
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex justify-end"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
      >
        <motion.div
          className="w-full max-w-md bg-white dark:bg-gray-900 h-full shadow-2xl overflow-hidden flex flex-col"
          initial={{ x: "100%" }}
          animate={{ x: 0 }}
          exit={{ x: "100%" }}
          transition={{ type: "spring", damping: 25, stiffness: 200 }}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-800 flex items-center justify-between bg-gradient-to-r from-[#5B8DEF]/10 to-[#4A7AD9]/10">
            <div>
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                Active Workflows
              </h2>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                {executions.length} workflow{executions.length !== 1 ? "s" : ""} running
              </p>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={onClose}
              className="rounded-full"
            >
              <X className="w-5 h-5" />
            </Button>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto p-6">
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="w-8 h-8 text-[#5B8DEF] animate-spin" />
              </div>
            ) : executions.length === 0 ? (
              <div className="text-center py-12">
                <div className="w-16 h-16 mx-auto rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center mb-4">
                  <CheckCircle2 className="w-8 h-8 text-gray-400" />
                </div>
                <p className="text-gray-600 dark:text-gray-400">
                  No active workflows
                </p>
                <p className="text-sm text-gray-500 dark:text-gray-500 mt-1">
                  Launch a workflow to see it here
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {executions.map((execution) => (
                  <Card
                    key={execution.id}
                    className="p-4 hover:shadow-lg transition-shadow cursor-pointer"
                    onClick={() => handleViewDetails(execution.id)}
                  >
                    <div className="flex items-start gap-3">
                      <div className="mt-1">{getStatusIcon(execution.status)}</div>

                      <div className="flex-1 min-w-0">
                        <h3 className="font-medium text-gray-900 dark:text-white truncate">
                          {execution.template?.name || "Unknown Template"}
                        </h3>

                        <div className="flex items-center gap-2 mt-1">
                          <span
                            className={`px-2 py-0.5 rounded-full text-xs font-medium ${getStatusColor(
                              execution.status
                            )}`}
                          >
                            {execution.status.toUpperCase()}
                          </span>
                          <span className="text-xs text-gray-500 dark:text-gray-500">
                            {execution.progress_percent}%
                          </span>
                        </div>

                        {/* Progress Bar */}
                        <div className="mt-3 h-2 bg-gray-200 dark:bg-gray-800 rounded-full overflow-hidden">
                          <motion.div
                            className="h-full bg-gradient-to-r from-[#5B8DEF] to-[#4A7AD9]"
                            initial={{ width: 0 }}
                            animate={{ width: `${execution.progress_percent}%` }}
                            transition={{ duration: 0.5 }}
                          />
                        </div>

                        {/* Controls */}
                        <div
                          className="mt-3 flex items-center gap-2"
                          onClick={(e) => e.stopPropagation()}
                        >
                          {execution.status === "running" && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handlePause(execution.id)}
                              className="gap-1"
                            >
                              <PauseCircle className="w-3 h-3" />
                              Pause
                            </Button>
                          )}

                          {execution.status === "paused" && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleResume(execution.id)}
                              className="gap-1"
                            >
                              <PlayCircle className="w-3 h-3" />
                              Resume
                            </Button>
                          )}

                          {(execution.status === "running" ||
                            execution.status === "paused") && (
                            <Button
                              size="sm"
                              variant="destructive"
                              onClick={() => handleStop(execution.id)}
                              className="gap-1"
                            >
                              <StopCircle className="w-3 h-3" />
                              Stop
                            </Button>
                          )}

                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleViewDetails(execution.id)}
                            className="gap-1 ml-auto"
                          >
                            <ExternalLink className="w-3 h-3" />
                            Details
                          </Button>
                        </div>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
