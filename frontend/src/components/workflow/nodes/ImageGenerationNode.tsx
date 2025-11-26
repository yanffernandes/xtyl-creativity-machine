"use client";

import React, { memo } from 'react';
import { Handle, Position, NodeProps } from 'reactflow';
import { Image, Sparkles, Wand2 } from 'lucide-react';

interface ImageGenerationData {
  label?: string;
  prompt?: string;
  model?: string;
  size?: string;
  style?: 'vivid' | 'natural';
  quality?: 'standard' | 'hd';
}

const ImageGenerationNode = memo(({ data, selected }: NodeProps<ImageGenerationData>) => {
  const {
    label = 'Generate Image',
    prompt = '',
    model = 'dall-e-3',
    size = '1024x1024',
    style = 'vivid',
    quality = 'standard'
  } = data;

  // Extract model display name
  const getModelDisplayName = (modelId: string) => {
    const modelMap: Record<string, string> = {
      'dall-e-3': 'DALL-E 3',
      'dall-e-2': 'DALL-E 2',
      'stable-diffusion-xl': 'Stable Diffusion XL'
    };
    return modelMap[modelId] || modelId;
  };

  // Get style icon/label
  const getStyleLabel = () => {
    return style === 'vivid' ? 'Vivid' : 'Natural';
  };

  // Get quality badge color
  const getQualityColor = () => {
    return quality === 'hd'
      ? 'bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300'
      : 'bg-gray-100 dark:bg-gray-800/50 text-gray-600 dark:text-gray-400';
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
            ? 'border-purple-500 shadow-lg shadow-purple-500/20'
            : 'border-white/20 dark:border-white/10 hover:border-purple-300 dark:hover:border-purple-700'
        }
      `}
    >
      {/* Input Handle */}
      <Handle
        type="target"
        position={Position.Left}
        className="w-3 h-3 !bg-purple-500 !border-2 !border-white dark:!border-gray-900"
      />

      {/* Header */}
      <div className="flex items-center gap-2 mb-3">
        <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-gradient-to-br from-purple-500 to-pink-500">
          <Image className="w-4 h-4 text-white" />
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-sm text-gray-900 dark:text-white truncate">
            {label}
          </h3>
          <p className="text-xs text-gray-500 dark:text-gray-400">
            Image Generation
          </p>
        </div>
      </div>

      {/* Configuration Summary */}
      <div className="space-y-2">
        {/* Model Info */}
        <div className="flex items-center gap-2 text-xs">
          <Wand2 className="w-3 h-3 text-purple-500 flex-shrink-0" />
          <span className="font-medium text-gray-700 dark:text-gray-300">
            {getModelDisplayName(model)}
          </span>
          <span className="ml-auto text-gray-500 dark:text-gray-400">
            {size}
          </span>
        </div>

        {/* Prompt Preview */}
        <div className="p-2 rounded bg-gray-100/50 dark:bg-gray-800/50 border border-gray-200/50 dark:border-gray-700/50">
          <p className="text-xs text-gray-600 dark:text-gray-400 line-clamp-2 leading-relaxed">
            {promptPreview}
          </p>
        </div>

        {/* Settings Row */}
        <div className="flex items-center justify-between text-xs">
          <div className="flex items-center gap-1.5">
            <Sparkles className="w-3 h-3 text-purple-500" />
            <span className="text-gray-600 dark:text-gray-400">
              {getStyleLabel()}
            </span>
          </div>
          <span className={`px-1.5 py-0.5 rounded font-medium ${getQualityColor()}`}>
            {quality === 'hd' ? 'HD' : 'Standard'}
          </span>
        </div>
      </div>

      {/* Output Handle */}
      <Handle
        type="source"
        position={Position.Right}
        className="w-3 h-3 !bg-purple-500 !border-2 !border-white dark:!border-gray-900"
      />

      {/* Selection Indicator */}
      {selected && (
        <div className="absolute -inset-0.5 bg-gradient-to-r from-purple-500 to-pink-500 rounded-lg opacity-20 -z-10 blur" />
      )}
    </div>
  );
});

ImageGenerationNode.displayName = 'ImageGenerationNode';

export default ImageGenerationNode;
