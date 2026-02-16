import { memo } from 'react';
import type { NodeProps } from 'reactflow';
import { Database } from 'lucide-react';
import BaseNode from './BaseNode';

function ContextRetrievalNode({ data, selected }: NodeProps) {
  return (
    <BaseNode
      label={data.label || 'Context Retrieval'}
      icon={Database}
      color="text-yellow-500"
      selected={selected}
    >
      <div className="space-y-1">
        <div className="text-xs font-medium text-gray-700 dark:text-gray-300">
          Max Results: {data.maxResults || 10}
        </div>
        {data.filters &&
          typeof data.filters === 'object' &&
          Object.keys(data.filters as Record<string, unknown>).length > 0 && (
            <div className="text-xs text-gray-500 dark:text-gray-400">
              Filters:{' '}
              {Object.keys(data.filters as Record<string, unknown>).length}{' '}
              active
            </div>
          )}
      </div>
    </BaseNode>
  );
}

export default memo(ContextRetrievalNode);
