"use client";

import { memo } from "react";
import { Handle, Position, NodeProps } from "reactflow";
import { Flag, Save, Bell } from "lucide-react";

interface FinishNodeData {
  label: string;
  saveToProject?: boolean;
  documentTitle?: string;
  notifyUser?: boolean;
}

function FinishNode({ data, selected }: NodeProps<FinishNodeData>) {
  return (
    <div
      className={`
        min-w-[280px] max-w-[320px]
        bg-gradient-to-br from-purple-50 to-violet-50 dark:from-purple-950/50 dark:to-violet-950/50
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
        className="!w-3 !h-3 !bg-purple-600 !border-2 !border-white dark:!border-gray-900"
      />

      {/* Header */}
      <div className="px-4 py-3 border-b border-purple-200/50 dark:border-purple-800/50 flex items-center gap-3">
        <div className="p-2 rounded-lg bg-purple-500/20">
          <Flag className="w-4 h-4 text-purple-600" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-xs font-semibold text-purple-600 uppercase tracking-wider mb-0.5">
            Finish
          </div>
          <div className="text-sm font-medium text-gray-900 dark:text-white truncate">
            {data.label}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="px-4 py-3 space-y-2">
        {/* Save to Project */}
        {data.saveToProject && (
          <div className="flex items-center gap-2 text-xs bg-white/60 dark:bg-gray-800/60 px-2 py-1.5 rounded">
            <Save className="w-3 h-3 text-purple-600" />
            <span className="text-gray-900 dark:text-white">
              Save to project
              {data.documentTitle && `: "${data.documentTitle}"`}
            </span>
          </div>
        )}

        {/* Notify User */}
        {data.notifyUser && (
          <div className="flex items-center gap-2 text-xs bg-white/60 dark:bg-gray-800/60 px-2 py-1.5 rounded">
            <Bell className="w-3 h-3 text-purple-600" />
            <span className="text-gray-900 dark:text-white">Notify on completion</span>
          </div>
        )}

        {/* Default message if no options */}
        {!data.saveToProject && !data.notifyUser && (
          <div className="text-xs text-gray-600 dark:text-gray-400 italic">
            No post-processing actions configured
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="px-4 py-2 border-t border-purple-200/50 dark:border-purple-800/50">
        <div className="text-xs text-gray-500 dark:text-gray-500">
          Workflow endpoint
        </div>
      </div>
    </div>
  );
}

export default memo(FinishNode);
