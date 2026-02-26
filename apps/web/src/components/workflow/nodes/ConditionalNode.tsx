"use client";

import { memo } from "react";
import { NodeProps } from "reactflow";
import { GitBranch } from "lucide-react";
import BaseNode from "./BaseNode";

function ConditionalNode({ data, selected }: NodeProps) {
  return (
    <BaseNode
      label={data.label || "Condition"}
      icon={GitBranch}
      color="text-orange-500"
      selected={selected}
    >
      <div className="text-xs text-gray-500 dark:text-gray-400 line-clamp-2 font-mono bg-gray-50 dark:bg-gray-800 p-1 rounded">
        {data.condition || "if condition..."}
      </div>
      <div className="flex justify-between mt-2 text-[10px] text-gray-400 uppercase font-semibold">
        <span>True</span>
        <span>False</span>
      </div>
    </BaseNode>
  );
}

export default memo(ConditionalNode);
