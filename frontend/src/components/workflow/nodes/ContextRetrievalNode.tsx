"use client";

import { memo } from "react";
import { NodeProps } from "reactflow";
import { Database } from "lucide-react";
import BaseNode from "./BaseNode";

function ContextRetrievalNode({ data, selected }: NodeProps) {
  return (
    <BaseNode
      label={data.label || "Context Retrieval"}
      icon={Database}
      color="text-yellow-500"
      selected={selected}
    >
      <div className="space-y-1">
        <div className="text-xs font-medium text-gray-700 dark:text-gray-300">
          Max Results: {data.maxResults || 10}
        </div>
        {data.filters && Object.keys(data.filters).length > 0 && (
          <div className="text-xs text-gray-500 dark:text-gray-400">
            Filters: {Object.keys(data.filters).length} active
          </div>
        )}
      </div>
    </BaseNode>
  );
}

export default memo(ContextRetrievalNode);
