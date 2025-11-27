"use client";

import { memo } from "react";
import { NodeProps } from "reactflow";
import { Repeat } from "lucide-react";
import BaseNode from "./BaseNode";

function LoopNode({ data, selected }: NodeProps) {
  return (
    <BaseNode
      label={data.label || "Loop"}
      icon={Repeat}
      color="text-blue-500"
      selected={selected}
    >
      <div className="space-y-1">
        <div className="text-xs font-medium text-gray-700 dark:text-gray-300">
          Iterations: {data.iterations || "Dynamic"}
        </div>
        {data.condition && (
          <div className="text-xs text-gray-500 dark:text-gray-400 font-mono bg-gray-50 dark:bg-gray-800 p-1 rounded">
            Until: {data.condition}
          </div>
        )}
      </div>
      <div className="flex justify-between mt-2 text-[10px] text-gray-400 uppercase font-semibold">
        <span>Loop</span>
        <span>Done</span>
      </div>
    </BaseNode>
  );
}

export default memo(LoopNode);
