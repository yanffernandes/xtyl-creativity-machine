"use client";

import { memo } from "react";
import { Handle, Position, NodeProps } from "reactflow";
import { Play } from "lucide-react";

interface StartNodeData {
  label: string;
  inputVariables?: Array<{
    name: string;
    type: string;
    required?: boolean;
    defaultValue?: string;
  }>;
}

function StartNode({ data, selected }: NodeProps<StartNodeData>) {
  return (
    <div
      className={`
        min-w-[280px] max-w-[320px]
        bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-950/50 dark:to-emerald-950/50
        backdrop-blur-xl
        border-2 ${
          selected
            ? "border-green-500 shadow-2xl shadow-green-500/30"
            : "border-green-200/50 dark:border-green-800/50"
        }
        rounded-2xl
        transition-all duration-300
        hover:shadow-xl hover:scale-105
      `}
    >
      {/* Header */}
      <div className="px-4 py-3 border-b border-green-200/50 dark:border-green-800/50 flex items-center gap-3">
        <div className="p-2 rounded-lg bg-green-500/20">
          <Play className="w-4 h-4 text-green-600" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-xs font-semibold text-green-600 uppercase tracking-wider mb-0.5">
            Start
          </div>
          <div className="text-sm font-medium text-gray-900 dark:text-white truncate">
            {data.label}
          </div>
        </div>
      </div>

      {/* Content - Input Variables */}
      {data.inputVariables && data.inputVariables.length > 0 && (
        <div className="px-4 py-3 space-y-2">
          <div className="text-xs text-gray-600 dark:text-gray-400 font-medium mb-2">
            Input Variables:
          </div>
          {data.inputVariables.map((variable, index) => (
            <div
              key={index}
              className="flex items-center justify-between text-xs bg-white/60 dark:bg-gray-800/60 px-2 py-1.5 rounded"
            >
              <span className="font-mono text-gray-900 dark:text-white">
                {variable.name}
              </span>
              <div className="flex items-center gap-2">
                <span className="text-gray-600 dark:text-gray-400">{variable.type}</span>
                {variable.required && (
                  <span className="text-xs text-red-600 dark:text-red-400">*</span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Footer */}
      <div className="px-4 py-2 border-t border-green-200/50 dark:border-green-800/50">
        <div className="text-xs text-gray-500 dark:text-gray-500">
          {data.inputVariables?.length || 0} input variable(s)
        </div>
      </div>

      {/* Output Handle */}
      <Handle
        type="source"
        position={Position.Right}
        className="!w-3 !h-3 !bg-green-600 !border-2 !border-white dark:!border-gray-900"
      />
    </div>
  );
}

export default memo(StartNode);
