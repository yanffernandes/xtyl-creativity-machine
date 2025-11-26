"use client";

import React, { memo } from 'react';
import { Handle, Position, NodeProps } from 'reactflow';
import { FileText, Sparkles, Zap } from 'lucide-react';

interface TextGenerationData {
  label?: string;
  prompt?: string;
  model?: string;
  temperature?: number;
  maxTokens?: number;
  outputFormat?: 'text' | 'json' | 'markdown';
}

const TextGenerationNode = memo(({ data, selected }: NodeProps<TextGenerationData>) => {
  const {
    label = 'Generate Text',
    prompt = '',
    model = 'gpt-4-turbo',
    temperature = 0.7,
    maxTokens = 2000,
    outputFormat = 'text'
  } = data;

  // Extract model display name
  const getModelDisplayName = (modelId: string) => {
    const modelMap: Record<string, string> = {
      'gpt-4-turbo': 'GPT-4 Turbo',
      'gpt-4': 'GPT-4',
      'gpt-3.5-turbo': 'GPT-3.5 Turbo',
      'claude-3-opus': 'Claude 3 Opus',
      'claude-3-sonnet': 'Claude 3 Sonnet',
      'claude-3-haiku': 'Claude 3 Haiku'
    };
    return modelMap[modelId] || modelId;
  };

  // Get output format icon
  const getFormatIcon = () => {
    switch (outputFormat) {
      case 'json':
        return '{}';
      case 'markdown':
        return 'MD';
      default:
        return 'TXT';
    }
  };

  // Truncate prompt for preview
  const promptPreview = prompt.length > 60
    ? prompt.substring(0, 60) + '...'
    : prompt || 'No prompt configured';

  return (
    <div
      className={`
        relative px-4 py-3 rounded-lg
        bg-white/40 dark:bg-white/5 backdrop-blur-xl
        border-2 transition-all duration-200
        min-w-[280px] max-w-[320px]
        ${
          selected
            ? 'border-blue-500 shadow-lg shadow-blue-500/20'
            : 'border-white/20 dark:border-white/10 hover:border-blue-300 dark:hover:border-blue-700'
        }
      `}
    >
      {/* Input Handle */}
      <Handle
        type="target"
        position={Position.Left}
        className="w-3 h-3 !bg-blue-500 !border-2 !border-white dark:!border-gray-900"
      />

      {/* Header */}
      <div className="flex items-center gap-2 mb-3">
        <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-purple-500">
          <Sparkles className="w-4 h-4 text-white" />
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-sm text-gray-900 dark:text-white truncate">
            {label}
          </h3>
          <p className="text-xs text-gray-500 dark:text-gray-400">
            Text Generation
          </p>
        </div>
      </div>

      {/* Configuration Summary */}
      <div className="space-y-2">
        {/* Model Info */}
        <div className="flex items-center gap-2 text-xs">
          <Zap className="w-3 h-3 text-blue-500 flex-shrink-0" />
          <span className="font-medium text-gray-700 dark:text-gray-300">
            {getModelDisplayName(model)}
          </span>
          <span className="ml-auto text-gray-500 dark:text-gray-400">
            T: {temperature.toFixed(1)}
          </span>
        </div>

        {/* Prompt Preview */}
        <div className="p-2 rounded bg-gray-100/50 dark:bg-gray-800/50 border border-gray-200/50 dark:border-gray-700/50">
          <p className="text-xs text-gray-600 dark:text-gray-400 line-clamp-2 leading-relaxed">
            {promptPreview}
          </p>
        </div>

        {/* Settings Row */}
        <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400">
          <span className="flex items-center gap-1">
            <FileText className="w-3 h-3" />
            Max: {maxTokens.toLocaleString()}
          </span>
          <span className="px-1.5 py-0.5 rounded bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 font-mono font-medium">
            {getFormatIcon()}
          </span>
        </div>
      </div>

      {/* Output Handle */}
      <Handle
        type="source"
        position={Position.Right}
        className="w-3 h-3 !bg-blue-500 !border-2 !border-white dark:!border-gray-900"
      />

      {/* Selection Indicator */}
      {selected && (
        <div className="absolute -inset-0.5 bg-gradient-to-r from-blue-500 to-purple-500 rounded-lg opacity-20 -z-10 blur" />
      )}
    </div>
  );
});

TextGenerationNode.displayName = 'TextGenerationNode';

export default TextGenerationNode;
