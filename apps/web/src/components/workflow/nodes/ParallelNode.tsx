"use client";

import { memo } from "react";
import { Handle, Position, NodeProps } from "reactflow";
import { Workflow, Zap } from "lucide-react";
import { cn } from "@/lib/utils";
import { glassNodeClasses, handleDefaultClasses } from "@/lib/glass-utils";

interface ParallelNodeData {
  label?: string;
  branches?: number;
  description?: string;
}

function ParallelNode({ data, selected }: NodeProps<ParallelNodeData>) {
  const branches = data.branches || 3;

  return (
    <div
      className={cn(
        "w-[280px] transition-all duration-200",
        glassNodeClasses,
        selected && "ring-2 ring-indigo-500 ring-offset-2 shadow-[0_0_20px_rgba(99,102,241,0.3)]"
      )}
    >
      {/* Input Handle */}
      <Handle
        type="target"
        position={Position.Left}
        className={cn(handleDefaultClasses, "!bg-indigo-500")}
      />

      {/* Header */}
      <div className="flex items-center gap-2 p-3 border-b border-white/[0.08] bg-gradient-to-b from-white/[0.04] to-transparent rounded-t-xl">
        <div className="p-1.5 rounded-lg shrink-0 bg-white/[0.08] dark:bg-white/[0.04] text-indigo-500">
          <Workflow className="w-4 h-4" />
        </div>
        <span className="font-medium text-sm text-foreground truncate">
          {data.label || "Parallel Execution"}
        </span>
        <Zap className="w-4 h-4 text-yellow-500 shrink-0 ml-auto" />
      </div>

      {/* Content - Fixed max height with overflow */}
      <div className="p-3 space-y-2 max-h-[150px] overflow-y-auto">
        {/* Branch Count */}
        <div className="text-xs text-muted-foreground">
          Run <span className="font-medium text-foreground">{branches}</span> branches simultaneously
        </div>

        {/* Visual representation of parallel lanes */}
        <div className="flex items-center gap-1">
          {Array.from({ length: Math.min(branches, 4) }).map((_, i) => (
            <div
              key={i}
              className="flex-1 h-8 rounded bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center"
            >
              <div className="text-[10px] font-mono text-indigo-500">
                #{i + 1}
              </div>
            </div>
          ))}
          {branches > 4 && (
            <div className="text-xs text-muted-foreground px-1">
              +{branches - 4}
            </div>
          )}
        </div>

        {data.description && (
          <div className="text-xs text-muted-foreground line-clamp-2">
            {data.description}
          </div>
        )}

        <div className="flex items-center gap-2 text-xs text-indigo-500 pt-1">
          <div className="w-2 h-2 rounded-full bg-indigo-500 animate-pulse"></div>
          <span>Concurrent execution</span>
        </div>
      </div>

      {/* Output Handle */}
      <Handle
        type="source"
        position={Position.Right}
        className={cn(handleDefaultClasses, "!bg-indigo-500")}
      />
    </div>
  );
}

export default memo(ParallelNode);
