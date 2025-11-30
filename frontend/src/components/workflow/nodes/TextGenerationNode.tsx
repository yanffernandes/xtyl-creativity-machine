"use client";

import { memo } from "react";
import { NodeProps } from "reactflow";
import { Type } from "lucide-react";
import BaseNode from "./BaseNode";

function TextGenerationNode({ data, selected }: NodeProps) {
  return (
    <BaseNode
      label={data.label || "Text Generation"}
      icon={Type}
      color="text-purple-500"
      selected={selected}
    >
      <div className="space-y-1">
        <div className="text-xs font-medium text-gray-700 dark:text-gray-300">
          Model: {data.model || "Default"}
        </div>
        <div className="text-xs text-gray-500 dark:text-gray-400 line-clamp-2">
          {data.prompt || "No prompt configured"}
        </div>
      </div>
    </BaseNode>
  );
}

export default memo(TextGenerationNode);
