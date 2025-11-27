"use client";

import { memo } from "react";
import { NodeProps } from "reactflow";
import { Image as ImageIcon } from "lucide-react";
import BaseNode from "./BaseNode";

function ImageGenerationNode({ data, selected }: NodeProps) {
  return (
    <BaseNode
      label={data.label || "Image Generation"}
      icon={ImageIcon}
      color="text-pink-500"
      selected={selected}
    >
      <div className="space-y-1">
        <div className="text-xs font-medium text-gray-700 dark:text-gray-300">
          Size: {data.size || "1024x1024"}
        </div>
        <div className="text-xs text-gray-500 dark:text-gray-400 line-clamp-2">
          {data.prompt || "No prompt configured"}
        </div>
      </div>
    </BaseNode>
  );
}

export default memo(ImageGenerationNode);
