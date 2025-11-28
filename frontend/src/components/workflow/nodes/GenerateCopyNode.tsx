"use client";

import { memo } from "react";
import { Handle, Position, NodeProps } from "reactflow";
import { FileText, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";
import { glassNodeClasses, handleDefaultClasses } from "@/lib/glass-utils";

interface GenerateCopyNodeData {
  label: string;
  model?: string;
  prompt?: string;
  temperature?: number;
}

function GenerateCopyNode({ data, selected }: NodeProps<GenerateCopyNodeData>) {
  return (
    <div
      className={cn(
        "w-[280px] transition-all duration-200",
        glassNodeClasses,
        selected && "ring-2 ring-primary ring-offset-2 shadow-[0_0_20px_rgba(91,141,239,0.3)]"
      )}
    >
      {/* Input Handle */}
      <Handle
        type="target"
        position={Position.Left}
        className={cn(handleDefaultClasses, "!bg-[#5B8DEF]")}
      />

      {/* Header */}
      <div className="flex items-center gap-2 p-3 border-b border-white/[0.08] bg-gradient-to-b from-white/[0.04] to-transparent rounded-t-xl">
        <div className="p-1.5 rounded-lg shrink-0 bg-white/[0.08] dark:bg-white/[0.04] text-[#5B8DEF]">
          <FileText className="w-4 h-4" />
        </div>
        <span className="font-medium text-sm text-foreground truncate">
          {data.label || "Generate Text"}
        </span>
      </div>

      {/* Content - Fixed max height with overflow */}
      <div className="p-3 space-y-2 max-h-[150px] overflow-y-auto">
        {/* Model */}
        {data.model && (
          <div className="flex items-center justify-between text-xs">
            <span className="text-muted-foreground font-medium">Model:</span>
            <span className="font-mono text-foreground bg-white/[0.08] px-2 py-0.5 rounded text-[10px] truncate max-w-[140px]">
              {data.model.split("/")[1] || data.model}
            </span>
          </div>
        )}

        {/* Temperature */}
        {data.temperature !== undefined && (
          <div className="flex items-center justify-between text-xs">
            <span className="text-muted-foreground font-medium">Temp:</span>
            <span className="font-mono text-foreground bg-white/[0.08] px-2 py-0.5 rounded">
              {data.temperature}
            </span>
          </div>
        )}

        {/* Prompt Preview */}
        {data.prompt && (
          <div className="pt-2 border-t border-white/[0.08]">
            <div className="text-xs text-muted-foreground font-medium mb-1">Prompt:</div>
            <div className="text-xs text-muted-foreground bg-white/[0.04] px-2 py-1.5 rounded line-clamp-3 font-mono">
              {data.prompt}
            </div>
          </div>
        )}

        {/* Footer indicator */}
        <div className="flex items-center gap-1.5 text-xs text-[#5B8DEF] pt-1">
          <Sparkles className="w-3 h-3" />
          <span className="font-medium">AI Generated</span>
        </div>
      </div>

      {/* Output Handle */}
      <Handle
        type="source"
        position={Position.Right}
        className={cn(handleDefaultClasses, "!bg-[#5B8DEF]")}
      />
    </div>
  );
}

export default memo(GenerateCopyNode);
