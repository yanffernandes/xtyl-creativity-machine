"use client";

import { Handle, Position, NodeProps } from "reactflow";
import { User, PauseCircle, Clock } from "lucide-react";

interface ReviewNodeData {
  label?: string;
  reviewInstructions?: string;
  autoApproveTimeout?: number;
}

export default function ReviewNode({ data, selected }: NodeProps<ReviewNodeData>) {
  return (
    <div className="min-w-[280px] max-w-[320px]">
      {/* Input Handle */}
      <Handle
        type="target"
        position={Position.Top}
        className="w-3 h-3 !bg-orange-500 border-2 border-white"
      />

      <div
        className={`bg-gradient-to-br from-orange-50 to-yellow-50 dark:from-orange-950/50 dark:to-yellow-950/50 backdrop-blur-xl border-2 ${
          selected
            ? "border-orange-500 shadow-2xl shadow-orange-500/30"
            : "border-orange-200/50 dark:border-orange-800/50"
        } rounded-2xl transition-all duration-300 hover:shadow-xl hover:scale-105`}
      >
        {/* Header */}
        <div className="px-4 py-3 border-b border-orange-200/50 dark:border-orange-800/50 flex items-center gap-3">
          <div className="p-2 rounded-lg bg-gradient-to-br from-orange-500 to-yellow-500">
            <User className="w-4 h-4 text-white" />
          </div>
          <div className="flex-1">
            <h3 className="text-sm font-semibold text-gray-900 dark:text-white">
              {data.label || "Human Review"}
            </h3>
            <p className="text-xs text-gray-600 dark:text-gray-400">
              Workflow pauses for approval
            </p>
          </div>
          <PauseCircle className="w-4 h-4 text-orange-500" />
        </div>

        {/* Content */}
        <div className="px-4 py-3 space-y-3">
          {data.reviewInstructions && (
            <div>
              <p className="text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                Review Instructions:
              </p>
              <p className="text-xs text-gray-600 dark:text-gray-400 bg-white/50 dark:bg-gray-900/30 p-2 rounded-lg border border-orange-200/50 dark:border-orange-800/50">
                {data.reviewInstructions}
              </p>
            </div>
          )}

          {/* Pause Indicator */}
          <div className="flex items-center gap-2 p-2 rounded-lg bg-orange-100/50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800">
            <PauseCircle className="w-4 h-4 text-orange-600 dark:text-orange-400" />
            <span className="text-xs text-orange-700 dark:text-orange-300 font-medium">
              Workflow will pause here
            </span>
          </div>

          {/* Auto-approve timeout */}
          {data.autoApproveTimeout && data.autoApproveTimeout > 0 && (
            <div className="flex items-center justify-between text-xs">
              <div className="flex items-center gap-1 text-gray-600 dark:text-gray-400">
                <Clock className="w-3 h-3" />
                <span>Auto-approve after:</span>
              </div>
              <span className="font-medium text-gray-900 dark:text-white">
                {data.autoApproveTimeout}min
              </span>
            </div>
          )}

          {/* Action Buttons Preview */}
          <div className="flex gap-2 pt-2 border-t border-orange-200/50 dark:border-orange-800/50">
            <div className="flex-1 px-3 py-1.5 rounded-lg bg-green-500/20 border border-green-300 dark:border-green-700 text-center">
              <span className="text-xs font-medium text-green-700 dark:text-green-300">
                Approve
              </span>
            </div>
            <div className="flex-1 px-3 py-1.5 rounded-lg bg-red-500/20 border border-red-300 dark:border-red-700 text-center">
              <span className="text-xs font-medium text-red-700 dark:text-red-300">
                Reject
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Output Handle */}
      <Handle
        type="source"
        position={Position.Bottom}
        className="w-3 h-3 !bg-orange-500 border-2 border-white"
      />
    </div>
  );
}
