"use client";

import { memo } from "react";
import { Handle, Position, NodeProps } from "reactflow";
import { Cpu, Sparkles } from "lucide-react";

interface ProcessingNodeData {
  label: string;
  prompt: string;
  model: string;
  outputFormat?: "text" | "json" | "markdown";
}

function ProcessingNode({ data, selected }: NodeProps<ProcessingNodeData>) {
  const getOutputFormatColor = (format?: string) => {
    switch (format) {
      case "json":
        return "bg-blue-500/10 text-blue-600";
      case "markdown":
        return "bg-purple-500/10 text-purple-600";
      default:
        return "bg-gray-500/10 text-gray-600";
    }
  };

  return (
    <div
      className={`
        min-w-[280px] max-w-[320px]
        bg-gradient-to-br from-indigo-50 to-blue-50 dark:from-indigo-950/50 dark:to-blue-950/50
        backdrop-blur-xl
        border-2 ${
          selected
            ? "border-[#5B8DEF] shadow-2xl shadow-[#5B8DEF]/30"
            : "border-indigo-200/50 dark:border-indigo-800/50"
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
        className="!w-3 !h-3 !bg-[#5B8DEF] !border-2 !border-white dark:!border-gray-900"
      />

      {/* Header */}
      <div className="px-4 py-3 border-b border-indigo-200/50 dark:border-indigo-800/50 flex items-center gap-3">
        <div className="p-2 rounded-lg bg-[#5B8DEF]/20">
          <Cpu className="w-4 h-4 text-[#5B8DEF]" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-xs font-semibold text-[#5B8DEF] uppercase tracking-wider mb-0.5">
            Processing
          </div>
          <div className="text-sm font-medium text-gray-900 dark:text-white truncate">
            {data.label}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="px-4 py-3 space-y-2">
        {/* Model */}
        {data.model && (
          <div className="flex items-center justify-between text-xs">
            <span className="text-gray-600 dark:text-gray-400 font-medium">Model:</span>
            <span className="font-mono text-gray-900 dark:text-white bg-white/60 dark:bg-gray-800/60 px-2 py-0.5 rounded">
              {data.model.split("/")[1] || data.model}
            </span>
          </div>
        )}

        {/* Output Format */}
        {data.outputFormat && (
          <div className="flex items-center justify-between text-xs">
            <span className="text-gray-600 dark:text-gray-400 font-medium">Format:</span>
            <span
              className={`font-mono px-2 py-0.5 rounded ${getOutputFormatColor(
                data.outputFormat
              )}`}
            >
              {data.outputFormat.toUpperCase()}
            </span>
          </div>
        )}

        {/* Prompt Preview */}
        {data.prompt && (
          <div className="mt-2 pt-2 border-t border-indigo-200/50 dark:border-indigo-800/50">
            <div className="text-xs text-gray-600 dark:text-gray-400 font-medium mb-1">
              Processing Prompt:
            </div>
            <div className="text-xs text-gray-700 dark:text-gray-300 bg-white/40 dark:bg-gray-800/40 px-2 py-1.5 rounded line-clamp-2 font-mono">
              {data.prompt}
            </div>
          </div>
        )}
      </div>

      {/* Footer with AI badge */}
      <div className="px-4 py-2 border-t border-indigo-200/50 dark:border-indigo-800/50 flex items-center justify-between">
        <div className="flex items-center gap-1.5 text-xs text-[#5B8DEF]">
          <Sparkles className="w-3 h-3" />
          <span className="font-medium">AI Processing</span>
        </div>
        <div className="text-xs text-gray-500 dark:text-gray-500">
          {data.prompt ? `${data.prompt.length} chars` : "No prompt"}
        </div>
      </div>

      {/* Output Handle */}
      <Handle
        type="source"
        position={Position.Right}
        className="!w-3 !h-3 !bg-[#5B8DEF] !border-2 !border-white dark:!border-gray-900"
      />
    </div>
  );
}

export default memo(ProcessingNode);
