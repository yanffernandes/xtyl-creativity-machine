"use client";

import { motion } from "framer-motion";
import { Loader2, CheckCircle2, XCircle, PauseCircle, StopCircle, Clock, Sparkles } from "lucide-react";
import { useEffect, useRef } from "react";

// Local interface for execution data (matches API response format)
interface WorkflowExecution {
  id: string;
  status: "idle" | "pending" | "running" | "paused" | "completed" | "failed" | "stopped";
  progress: number;
  current_node_id: string | null;
  outputs: Record<string, any>;
  config_json: Record<string, any>;
  logs: string[];
  total_cost?: number;
  error_message?: string;
  started_at?: string;
  completed_at?: string;
}

interface ExecutionProgressProps {
  execution: WorkflowExecution;
}

const getStatusIcon = (status: WorkflowExecution["status"]) => {
  switch (status) {
    case "idle":
    case "pending":
      return <Clock className="w-5 h-5 text-gray-500" />;
    case "running":
      return <Loader2 className="w-5 h-5 text-[#5B8DEF] animate-spin" />;
    case "paused":
      return <PauseCircle className="w-5 h-5 text-orange-500" />;
    case "completed":
      return <CheckCircle2 className="w-5 h-5 text-green-500" />;
    case "failed":
      return <XCircle className="w-5 h-5 text-red-500" />;
    case "stopped":
      return <StopCircle className="w-5 h-5 text-gray-500" />;
    default:
      return null;
  }
};

const getStatusColor = (status: WorkflowExecution["status"]) => {
  switch (status) {
    case "idle":
    case "pending":
      return "text-gray-600 bg-gray-100 dark:bg-gray-800";
    case "running":
      return "text-blue-600 bg-blue-100 dark:bg-blue-950";
    case "paused":
      return "text-orange-600 bg-orange-100 dark:bg-orange-950";
    case "completed":
      return "text-green-600 bg-green-100 dark:bg-green-950";
    case "failed":
      return "text-red-600 bg-red-100 dark:bg-red-950";
    case "stopped":
      return "text-gray-600 bg-gray-100 dark:bg-gray-800";
    default:
      return "text-gray-600 bg-gray-100 dark:bg-gray-800";
  }
};

const getProgressBarColor = (status: WorkflowExecution["status"]) => {
  switch (status) {
    case "running":
      return "from-[#5B8DEF] to-[#4A7AD9]";
    case "completed":
      return "from-green-500 to-green-600";
    case "failed":
      return "from-red-500 to-red-600";
    case "paused":
      return "from-orange-500 to-orange-600";
    case "idle":
    case "pending":
    case "stopped":
    default:
      return "from-gray-400 to-gray-500";
  }
};

export default function ExecutionProgress({ execution }: ExecutionProgressProps) {
  const progress = execution.progress || 0;
  const isActive = execution.status === "running" || execution.status === "pending";
  const hasShownConfetti = useRef(false);

  // Trigger confetti animation on completion
  useEffect(() => {
    if (execution.status === "completed" && !hasShownConfetti.current) {
      hasShownConfetti.current = true;
      // Simple confetti animation using CSS
      const confettiElement = document.getElementById(`confetti-${execution.id}`);
      if (confettiElement) {
        confettiElement.classList.add("animate-confetti");
      }
    }
  }, [execution.status, execution.id]);

  return (
    <div className="space-y-6 relative">
      {/* Confetti Animation */}
      {execution.status === "completed" && (
        <motion.div
          id={`confetti-${execution.id}`}
          className="absolute -top-10 left-1/2 transform -translate-x-1/2"
          initial={{ opacity: 0, scale: 0 }}
          animate={{ opacity: [0, 1, 0], scale: [0, 1.5, 0], y: [-20, 20, 40] }}
          transition={{ duration: 2, ease: "easeOut" }}
        >
          <Sparkles className="w-12 h-12 text-yellow-400" />
        </motion.div>
      )}

      {/* Status Badge */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          {getStatusIcon(execution.status)}
          <div>
            <div className="flex items-center gap-2">
              <span
                className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(
                  execution.status
                )}`}
              >
                {execution.status.toUpperCase()}
              </span>
            </div>
            {execution.current_node_id && isActive && (
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                Current: <span className="font-medium">{execution.current_node_id}</span>
              </p>
            )}
          </div>
        </div>

        {/* Cost */}
        {(execution.total_cost || 0) > 0 && (
          <div className="text-right">
            <p className="text-sm text-gray-600 dark:text-gray-400">Total Cost</p>
            <p className="text-lg font-semibold text-gray-900 dark:text-white">
              ${(execution.total_cost || 0).toFixed(4)}
            </p>
          </div>
        )}
      </div>

      {/* Progress Bar */}
      <div className="space-y-2">
        <div className="flex items-center justify-between text-sm">
          <span className="font-medium text-gray-700 dark:text-gray-300">
            Progress
          </span>
          <span className="font-semibold text-gray-900 dark:text-white">
            {progress}%
          </span>
        </div>

        <div className="relative h-3 bg-gray-200 dark:bg-gray-800 rounded-full overflow-hidden">
          <motion.div
            className={`absolute inset-y-0 left-0 bg-gradient-to-r ${getProgressBarColor(
              execution.status
            )} rounded-full`}
            initial={{ width: 0 }}
            animate={{ width: `${progress}%` }}
            transition={{ duration: 0.5, ease: "easeOut" }}
          />

          {/* Animated shimmer effect for running status */}
          {isActive && (
            <motion.div
              className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent"
              animate={{
                x: ["-100%", "200%"],
              }}
              transition={{
                duration: 1.5,
                repeat: Infinity,
                ease: "linear",
              }}
            />
          )}
        </div>
      </div>

      {/* Error Message */}
      {execution.error_message && execution.status === "failed" && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="p-4 rounded-lg bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900"
        >
          <p className="text-sm font-medium text-red-900 dark:text-red-200 mb-1">
            Error
          </p>
          <p className="text-sm text-red-700 dark:text-red-300">
            {execution.error_message}
          </p>
        </motion.div>
      )}

      {/* Timestamps */}
      <div className="grid grid-cols-2 gap-4 pt-4 border-t border-gray-200 dark:border-gray-800">
        <div>
          <p className="text-xs text-gray-500 dark:text-gray-500">Started</p>
          <p className="text-sm font-medium text-gray-900 dark:text-white mt-1">
            {execution.started_at
              ? new Date(execution.started_at).toLocaleString()
              : "Not started"}
          </p>
        </div>
        <div>
          <p className="text-xs text-gray-500 dark:text-gray-500">
            {execution.status === "completed" ? "Completed" : "Estimated"}
          </p>
          <p className="text-sm font-medium text-gray-900 dark:text-white mt-1">
            {execution.completed_at
              ? new Date(execution.completed_at).toLocaleString()
              : isActive
              ? "In progress..."
              : "N/A"}
          </p>
        </div>
      </div>
    </div>
  );
}
