"use client";

import { Handle, Position, NodeProps } from "reactflow";
import { Workflow, Zap } from "lucide-react";

interface ParallelNodeData {
  label?: string;
  branches?: number;
  description?: string;
}

export default function ParallelNode({ data, selected }: NodeProps<ParallelNodeData>) {
  const branches = data.branches || 3;

  return (
    <div className="min-w-[280px] max-w-[320px]">
      {/* Input Handle */}
      <Handle
        type="target"
        position={Position.Top}
        className="w-3 h-3 !bg-[#5B8DEF] border-2 border-white"
      />

      <div
        className={`bg-gradient-to-br from-indigo-50 to-purple-50 dark:from-indigo-950/50 dark:to-purple-950/50 backdrop-blur-xl border-2 ${
          selected
            ? "border-[#5B8DEF] shadow-2xl shadow-[#5B8DEF]/30"
            : "border-indigo-200/50 dark:border-indigo-800/50"
        } rounded-2xl transition-all duration-300 hover:shadow-xl hover:scale-105`}
      >
        {/* Header */}
        <div className="px-4 py-3 border-b border-indigo-200/50 dark:border-indigo-800/50 flex items-center gap-3">
          <div className="p-2 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-500">
            <Workflow className="w-4 h-4 text-white" />
          </div>
          <div className="flex-1">
            <h3 className="text-sm font-semibold text-gray-900 dark:text-white">
              {data.label || "Parallel Execution"}
            </h3>
            <p className="text-xs text-gray-600 dark:text-gray-400">
              Run {branches} branches simultaneously
            </p>
          </div>
          <Zap className="w-4 h-4 text-yellow-500" />
        </div>

        {/* Content - Visual representation of parallel lanes */}
        <div className="px-4 py-3">
          <div className="flex items-center gap-2 mb-3">
            {Array.from({ length: Math.min(branches, 4) }).map((_, i) => (
              <div
                key={i}
                className="flex-1 h-12 rounded-lg bg-gradient-to-b from-indigo-100 to-purple-100 dark:from-indigo-900/30 dark:to-purple-900/30 border border-indigo-200 dark:border-indigo-800 flex items-center justify-center"
              >
                <div className="text-xs font-mono text-indigo-600 dark:text-indigo-400">
                  #{i + 1}
                </div>
              </div>
            ))}
            {branches > 4 && (
              <div className="text-xs text-gray-500 dark:text-gray-500">
                +{branches - 4}
              </div>
            )}
          </div>

          {data.description && (
            <p className="text-xs text-gray-600 dark:text-gray-400 mt-2">
              {data.description}
            </p>
          )}

          <div className="mt-3 flex items-center gap-2 text-xs text-indigo-600 dark:text-indigo-400">
            <div className="w-2 h-2 rounded-full bg-indigo-500 animate-pulse"></div>
            <span>All branches execute concurrently</span>
          </div>
        </div>
      </div>

      {/* Output Handle */}
      <Handle
        type="source"
        position={Position.Bottom}
        className="w-3 h-3 !bg-[#5B8DEF] border-2 border-white"
      />
    </div>
  );
}
