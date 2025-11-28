"use client";

import { memo } from "react";
import { Handle, Position, NodeProps } from "reactflow";
import { User, PauseCircle, Clock } from "lucide-react";
import { cn } from "@/lib/utils";
import { glassNodeClasses, handleDefaultClasses } from "@/lib/glass-utils";

interface ReviewNodeData {
  label?: string;
  reviewInstructions?: string;
  autoApproveTimeout?: number;
}

function ReviewNode({ data, selected }: NodeProps<ReviewNodeData>) {
  return (
    <div
      className={cn(
        "w-[280px] transition-all duration-200",
        glassNodeClasses,
        selected && "ring-2 ring-orange-500 ring-offset-2 shadow-[0_0_20px_rgba(249,115,22,0.3)]"
      )}
    >
      {/* Input Handle */}
      <Handle
        type="target"
        position={Position.Left}
        className={cn(handleDefaultClasses, "!bg-orange-500")}
      />

      {/* Header */}
      <div className="flex items-center gap-2 p-3 border-b border-white/[0.08] bg-gradient-to-b from-white/[0.04] to-transparent rounded-t-xl">
        <div className="p-1.5 rounded-lg shrink-0 bg-white/[0.08] dark:bg-white/[0.04] text-orange-500">
          <User className="w-4 h-4" />
        </div>
        <span className="font-medium text-sm text-foreground truncate">
          {data.label || "Human Review"}
        </span>
        <PauseCircle className="w-4 h-4 text-orange-500 shrink-0 ml-auto" />
      </div>

      {/* Content - Fixed max height with overflow */}
      <div className="p-3 space-y-2 max-h-[150px] overflow-y-auto">
        {/* Pause Indicator */}
        <div className="flex items-center gap-2 p-2 rounded-lg bg-orange-500/10 border border-orange-500/20">
          <PauseCircle className="w-3 h-3 text-orange-500 shrink-0" />
          <span className="text-xs text-orange-600 dark:text-orange-400 font-medium">
            Pauses for approval
          </span>
        </div>

        {/* Review Instructions */}
        {data.reviewInstructions && (
          <div className="pt-2 border-t border-white/[0.08]">
            <div className="text-xs text-muted-foreground font-medium mb-1">Instructions:</div>
            <div className="text-xs text-muted-foreground bg-white/[0.04] px-2 py-1.5 rounded line-clamp-2">
              {data.reviewInstructions}
            </div>
          </div>
        )}

        {/* Auto-approve timeout */}
        {data.autoApproveTimeout && data.autoApproveTimeout > 0 && (
          <div className="flex items-center justify-between text-xs">
            <div className="flex items-center gap-1 text-muted-foreground">
              <Clock className="w-3 h-3" />
              <span>Auto-approve:</span>
            </div>
            <span className="font-medium text-foreground">
              {data.autoApproveTimeout}min
            </span>
          </div>
        )}

        {/* Action Buttons Preview */}
        <div className="flex gap-2 pt-2">
          <div className="flex-1 px-2 py-1 rounded bg-green-500/20 text-center">
            <span className="text-[10px] font-medium text-green-600 dark:text-green-400">
              Approve
            </span>
          </div>
          <div className="flex-1 px-2 py-1 rounded bg-red-500/20 text-center">
            <span className="text-[10px] font-medium text-red-600 dark:text-red-400">
              Reject
            </span>
          </div>
        </div>
      </div>

      {/* Output Handle */}
      <Handle
        type="source"
        position={Position.Right}
        className={cn(handleDefaultClasses, "!bg-orange-500")}
      />
    </div>
  );
}

export default memo(ReviewNode);
