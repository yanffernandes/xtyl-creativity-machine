import { memo } from 'react';
import type { NodeProps } from 'reactflow';
import { Type, FileText } from 'lucide-react';
import BaseNode from './BaseNode';

function TextGenerationNode({ data, selected }: NodeProps) {
  const willSaveDocument = data.save_as_document !== false;
  return (
    <BaseNode
      label={data.label || 'Text Generation'}
      icon={Type}
      color="text-purple-500"
      selected={selected}
    >
      <div className="space-y-1.5">
        <div className="text-xs font-medium text-gray-700 dark:text-gray-300">
          Model: {data.model || 'Default'}
        </div>
        <div className="text-xs text-gray-500 dark:text-gray-400 line-clamp-2">
          {data.prompt || 'No prompt configured'}
        </div>
        {willSaveDocument && (
          <div className="flex items-center gap-1.5 pt-1 border-t border-white/10">
            <FileText className="h-3 w-3 text-emerald-500" />
            <span className="text-[10px] font-medium text-emerald-500">
              Gera documento
            </span>
          </div>
        )}
      </div>
    </BaseNode>
  );
}

export default memo(TextGenerationNode);
