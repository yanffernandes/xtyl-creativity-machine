"use client";

import { memo } from "react";
import { NodeProps, Position } from "reactflow";
import { Square } from "lucide-react";
import BaseNode from "./BaseNode";

function FinishNode({ data, selected }: NodeProps) {
  return (
    <BaseNode
      label={data.label || "Finish"}
      icon={Square}
      color="text-red-500"
      selected={selected}
      showSourceHandle={false}
      targetPosition={Position.Left}
    >
      <div className="text-xs text-gray-500 dark:text-gray-400">
        Workflow exit point
      </div>
    </BaseNode>
  );
}

export default memo(FinishNode);
