"use client";

import { memo } from "react";
import { NodeProps } from "reactflow";
import { Cpu } from "lucide-react";
import BaseNode from "./BaseNode";

function ProcessingNode({ data, selected }: NodeProps) {
  return (
    <BaseNode
      label={data.label || "Processing"}
      icon={Cpu}
      color="text-cyan-500"
      selected={selected}
    >
      <div className="space-y-1">
        <div className="text-xs font-medium text-gray-700 dark:text-gray-300">
          Format: {data.outputFormat || "text"}
        </div>
        <div className="text-xs text-gray-500 dark:text-gray-400 line-clamp-2">
          {data.prompt || "No processing instructions"}
        </div>
      </div>
    </BaseNode>
  );
}

export default memo(ProcessingNode);
