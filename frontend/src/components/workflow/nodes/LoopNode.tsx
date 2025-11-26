"use client";

import { memo } from "react";
import { Handle, Position, NodeProps } from "reactflow";
import { Repeat, Infinity } from "lucide-react";

interface LoopNodeData {
  label: string;
  iterations?: number;
  condition?: string;
  maxIterations?: number;
}

function LoopNode({ data, selected }: NodeProps<LoopNodeData>) {
  const isInfiniteLoop = !data.iterations && !data.condition;
  const loopType = data.iterations
    ? "Fixed"
    : data.condition
    ? "Conditional"
    : "Infinite";

  return (
    <div
      className={`
        min-w-[280px] max-w-[320px]
        bg-gradient-to-br from-orange-50 to-amber-50 dark:from-orange-950/50 dark:to-amber-950/50
        backdrop-blur-xl
        border-2 ${
          selected
            ? "border-orange-500 shadow-2xl shadow-orange-500/30"
            : "border-orange-200/50 dark:border-orange-800/50"
        }
        rounded-2xl
        transition-all duration-300
        hover:shadow-xl hover:scale-105
      `}
    >
      {/* Input Handle */}
      <Handle
        type="target"
        position={Position.Left}
        className="!w-3 !h-3 !bg-orange-600 !border-2 !border-white dark:!border-gray-900"
      />

      {/* Header */}
      <div className="px-4 py-3 border-b border-orange-200/50 dark:border-orange-800/50 flex items-center gap-3">
        <div className="p-2 rounded-lg bg-orange-500/20">
          <Repeat className="w-4 h-4 text-orange-600" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-xs font-semibold text-orange-600 uppercase tracking-wider mb-0.5">
            Loop
          </div>
          <div className="text-sm font-medium text-gray-900 dark:text-white truncate">
            {data.label}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="px-4 py-3 space-y-2">
        {/* Loop Type */}
        <div className="flex items-center justify-between text-xs">
          <span className="text-gray-600 dark:text-gray-400 font-medium">Type:</span>
          <span className="font-mono text-gray-900 dark:text-white bg-white/60 dark:bg-gray-800/60 px-2 py-0.5 rounded">
            {loopType}
          </span>
        </div>

        {/* Iterations */}
        {data.iterations && (
          <div className="flex items-center justify-between text-xs">
            <span className="text-gray-600 dark:text-gray-400 font-medium">Iterations:</span>
            <span className="font-mono text-gray-900 dark:text-white bg-white/60 dark:bg-gray-800/60 px-2 py-0.5 rounded">
              {data.iterations}x
            </span>
          </div>
        )}

        {/* Condition */}
        {data.condition && (
          <div className="mt-2 pt-2 border-t border-orange-200/50 dark:border-orange-800/50">
            <div className="text-xs text-gray-600 dark:text-gray-400 font-medium mb-1">
              Condition:
            </div>
            <div className="text-xs text-gray-700 dark:text-gray-300 bg-white/40 dark:bg-gray-800/40 px-2 py-1.5 rounded line-clamp-2 font-mono">
              {data.condition}
            </div>
          </div>
        )}

        {/* Max Iterations (Safety) */}
        {data.maxIterations && (
          <div className="flex items-center justify-between text-xs">
            <span className="text-gray-600 dark:text-gray-400 font-medium">Max:</span>
            <span className="font-mono text-gray-900 dark:text-white bg-white/60 dark:bg-gray-800/60 px-2 py-0.5 rounded">
              {data.maxIterations}x
            </span>
          </div>
        )}

        {/* Warning for infinite loops */}
        {isInfiniteLoop && (
          <div className="flex items-center gap-2 text-xs text-orange-700 dark:text-orange-300 bg-orange-100 dark:bg-orange-950 px-2 py-1.5 rounded">
            <Infinity className="w-3 h-3" />
            <span>Infinite loop - requires manual stop</span>
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="px-4 py-2 border-t border-orange-200/50 dark:border-orange-800/50">
        <div className="text-xs text-gray-500 dark:text-gray-500">
          Repeats downstream nodes
        </div>
      </div>

      {/* Output Handle */}
      <Handle
        type="source"
        position={Position.Right}
        className="!w-3 !h-3 !bg-orange-600 !border-2 !border-white dark:!border-gray-900"
      />
    </div>
  );
}

export default memo(LoopNode);
