"use client";

import { memo } from "react";
import { NodeProps, Position } from "reactflow";
import { Play } from "lucide-react";
import BaseNode from "./BaseNode";

function StartNode({ data, selected }: NodeProps) {
  return (
    <BaseNode
      label={data.label || "Start"}
      icon={Play}
      color="text-green-500"
      selected={selected}
      showTargetHandle={false}
      sourcePosition={Position.Right}
    >
      <div className="text-xs text-gray-500 dark:text-gray-400">
        Workflow entry point
      </div>
    </BaseNode>
  );
}

export default memo(StartNode);
