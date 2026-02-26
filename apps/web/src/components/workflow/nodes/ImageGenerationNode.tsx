"use client";

import { memo } from "react";
import { NodeProps } from "reactflow";
import { Image as ImageIcon, FileImage } from "lucide-react";
import BaseNode from "./BaseNode";

function ImageGenerationNode({ data, selected }: NodeProps) {
  return (
    <BaseNode
      label={data.label || "Image Generation"}
      icon={ImageIcon}
      color="text-pink-500"
      selected={selected}
    >
      <div className="space-y-1.5">
        <div className="text-xs font-medium text-gray-700 dark:text-gray-300">
          Size: {data.size || "1024x1024"}
        </div>
        <div className="text-xs text-gray-500 dark:text-gray-400 line-clamp-2">
          {data.prompt || "No prompt configured"}
        </div>
        {/* Image document generation indicator */}
        <div className="flex items-center gap-1.5 pt-1 border-t border-white/10">
          <FileImage className="h-3 w-3 text-pink-400" />
          <span className="text-[10px] font-medium text-pink-400">
            Gera imagem
          </span>
        </div>
      </div>
    </BaseNode>
  );
}

export default memo(ImageGenerationNode);
