"use client";

import { memo } from "react";
import { Handle, Position, NodeProps } from "reactflow";
import { Database, Filter } from "lucide-react";

interface ContextRetrievalNodeData {
  label: string;
  filters?: {
    status?: string;
    asset_type?: string;
    tags?: string[];
    [key: string]: any;
  };
  maxResults?: number;
}

function ContextRetrievalNode({
  data,
  selected,
}: NodeProps<ContextRetrievalNodeData>) {
  const filterCount = data.filters
    ? Object.keys(data.filters).filter(
        (key) => data.filters![key] !== undefined && data.filters![key] !== null
      ).length
    : 0;

  return (
    <div
      className={`
        min-w-[280px] max-w-[320px]
        bg-gradient-to-br from-cyan-50 to-teal-50 dark:from-cyan-950/50 dark:to-teal-950/50
        backdrop-blur-xl
        border-2 ${
          selected
            ? "border-cyan-500 shadow-2xl shadow-cyan-500/30"
            : "border-cyan-200/50 dark:border-cyan-800/50"
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
        className="!w-3 !h-3 !bg-cyan-600 !border-2 !border-white dark:!border-gray-900"
      />

      {/* Header */}
      <div className="px-4 py-3 border-b border-cyan-200/50 dark:border-cyan-800/50 flex items-center gap-3">
        <div className="p-2 rounded-lg bg-cyan-500/20">
          <Database className="w-4 h-4 text-cyan-600" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-xs font-semibold text-cyan-600 uppercase tracking-wider mb-0.5">
            Context Retrieval
          </div>
          <div className="text-sm font-medium text-gray-900 dark:text-white truncate">
            {data.label}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="px-4 py-3 space-y-2">
        {/* Max Results */}
        {data.maxResults && (
          <div className="flex items-center justify-between text-xs">
            <span className="text-gray-600 dark:text-gray-400 font-medium">Max Results:</span>
            <span className="font-mono text-gray-900 dark:text-white bg-white/60 dark:bg-gray-800/60 px-2 py-0.5 rounded">
              {data.maxResults}
            </span>
          </div>
        )}

        {/* Filter Count */}
        {filterCount > 0 && (
          <div className="flex items-center gap-2 text-xs bg-white/60 dark:bg-gray-800/60 px-2 py-1.5 rounded">
            <Filter className="w-3 h-3 text-cyan-600" />
            <span className="text-gray-900 dark:text-white">
              {filterCount} filter{filterCount !== 1 ? "s" : ""} applied
            </span>
          </div>
        )}

        {/* Filters Detail */}
        {data.filters && Object.keys(data.filters).length > 0 && (
          <div className="mt-2 pt-2 border-t border-cyan-200/50 dark:border-cyan-800/50">
            <div className="text-xs text-gray-600 dark:text-gray-400 font-medium mb-1">
              Filters:
            </div>
            <div className="space-y-1">
              {Object.entries(data.filters).map(([key, value]) => {
                if (value === undefined || value === null) return null;
                return (
                  <div
                    key={key}
                    className="flex items-center justify-between text-xs bg-white/40 dark:bg-gray-800/40 px-2 py-1 rounded"
                  >
                    <span className="font-mono text-gray-600 dark:text-gray-400">
                      {key}:
                    </span>
                    <span className="font-mono text-gray-900 dark:text-white truncate max-w-[150px]">
                      {Array.isArray(value) ? value.join(", ") : String(value)}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* No filters message */}
        {filterCount === 0 && (
          <div className="text-xs text-gray-600 dark:text-gray-400 italic">
            No filters applied - retrieves all documents
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="px-4 py-2 border-t border-cyan-200/50 dark:border-cyan-800/50">
        <div className="text-xs text-gray-500 dark:text-gray-500">
          Fetches project documents
        </div>
      </div>

      {/* Output Handle */}
      <Handle
        type="source"
        position={Position.Right}
        className="!w-3 !h-3 !bg-cyan-600 !border-2 !border-white dark:!border-gray-900"
      />
    </div>
  );
}

export default memo(ContextRetrievalNode);
