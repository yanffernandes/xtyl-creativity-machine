"use client";

import { memo } from "react";
import { Handle, Position, NodeProps } from "reactflow";
import { Image, Sparkles } from "lucide-react";

interface GenerateImageNodeData {
  label: string;
  model?: string;
  prompt?: string;
  aspect_ratio?: string;
  quality?: string;
}

function GenerateImageNode({ data, selected }: NodeProps<GenerateImageNodeData>) {
  return (
    <div
      className={`
        min-w-[280px] max-w-[320px]
        bg-gradient-to-br from-purple-50 to-pink-50 dark:from-purple-950/50 dark:to-pink-950/50
        backdrop-blur-xl
        border-2 ${
          selected
            ? "border-purple-500 shadow-2xl shadow-purple-500/30"
            : "border-purple-200/50 dark:border-purple-800/50"
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
        className="!w-3 !h-3 !bg-purple-500 !border-2 !border-white dark:!border-gray-900"
      />

      {/* Header */}
      <div className="px-4 py-3 border-b border-purple-200/50 dark:border-purple-800/50 flex items-center gap-3">
        <div className="p-2 rounded-lg bg-purple-500/20">
          <Image className="w-4 h-4 text-purple-600 dark:text-purple-400" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-xs font-semibold text-purple-600 dark:text-purple-400 uppercase tracking-wider mb-0.5">
            Generate Image
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
            <span className="font-mono text-gray-900 dark:text-white bg-white/60 dark:bg-gray-800/60 px-2 py-0.5 rounded text-[10px]">
              {data.model.split("/")[1]?.substring(0, 20) || data.model}
            </span>
          </div>
        )}

        {/* Aspect Ratio */}
        {data.aspect_ratio && (
          <div className="flex items-center justify-between text-xs">
            <span className="text-gray-600 dark:text-gray-400 font-medium">Aspect Ratio:</span>
            <span className="font-mono text-gray-900 dark:text-white bg-white/60 dark:bg-gray-800/60 px-2 py-0.5 rounded">
              {data.aspect_ratio}
            </span>
          </div>
        )}

        {/* Quality */}
        {data.quality && (
          <div className="flex items-center justify-between text-xs">
            <span className="text-gray-600 dark:text-gray-400 font-medium">Quality:</span>
            <span className="font-mono text-gray-900 dark:text-white bg-white/60 dark:bg-gray-800/60 px-2 py-0.5 rounded">
              {data.quality}
            </span>
          </div>
        )}

        {/* Prompt Preview */}
        {data.prompt && (
          <div className="mt-2 pt-2 border-t border-purple-200/50 dark:border-purple-800/50">
            <div className="text-xs text-gray-600 dark:text-gray-400 font-medium mb-1">Prompt:</div>
            <div className="text-xs text-gray-700 dark:text-gray-300 bg-white/40 dark:bg-gray-800/40 px-2 py-1.5 rounded line-clamp-2 font-mono">
              {data.prompt}
            </div>
          </div>
        )}
      </div>

      {/* Footer with AI badge */}
      <div className="px-4 py-2 border-t border-purple-200/50 dark:border-purple-800/50 flex items-center justify-between">
        <div className="flex items-center gap-1.5 text-xs text-purple-600 dark:text-purple-400">
          <Sparkles className="w-3 h-3" />
          <span className="font-medium">AI Generated</span>
        </div>
        <div className="text-xs text-gray-500 dark:text-gray-500">
          {data.aspect_ratio || "1:1"}
        </div>
      </div>

      {/* Output Handle */}
      <Handle
        type="source"
        position={Position.Right}
        className="!w-3 !h-3 !bg-purple-500 !border-2 !border-white dark:!border-gray-900"
      />
    </div>
  );
}

export default memo(GenerateImageNode);
