/**
 * Workflow Type Configurations
 *
 * Centralized type definitions for workflow nodes including
 * input/output type validation for connection compatibility.
 */

import {
  Play,
  Square,
  Type,
  Image as ImageIcon,
  GitBranch,
  Repeat,
  Database,
  Cpu,
  Paperclip,
  LucideIcon,
} from "lucide-react";

// ============================================================================
// HANDLE DATA TYPES
// ============================================================================

export type HandleDataType = 'text' | 'image' | 'json' | 'any';

// ============================================================================
// NODE TYPE CONFIGURATION
// ============================================================================

export interface NodeTypeConfig {
  type: string;
  label: string;
  icon: LucideIcon;
  color: string;
  inputTypes: HandleDataType[];
  outputType: HandleDataType;
  description?: string;
}

// ============================================================================
// NODE TYPE CONFIGS
// ============================================================================

export const NODE_TYPE_CONFIGS: Record<string, NodeTypeConfig> = {
  start: {
    type: 'start',
    label: 'Start',
    icon: Play,
    color: 'text-green-500',
    inputTypes: [],
    outputType: 'any',
    description: 'Entry point of the workflow',
  },
  finish: {
    type: 'finish',
    label: 'Finish',
    icon: Square,
    color: 'text-red-500',
    inputTypes: ['text', 'json', 'image', 'any'],
    outputType: 'any',
    description: 'Exit point of the workflow',
  },
  text_generation: {
    type: 'text_generation',
    label: 'Text Generation',
    icon: Type,
    color: 'text-purple-500',
    inputTypes: ['text', 'json', 'any'],
    outputType: 'text',
    description: 'Generate text using AI models',
  },
  image_generation: {
    type: 'image_generation',
    label: 'Image Generation',
    icon: ImageIcon,
    color: 'text-pink-500',
    inputTypes: ['text'],
    outputType: 'image',
    description: 'Generate images using AI models',
  },
  conditional: {
    type: 'conditional',
    label: 'Conditional',
    icon: GitBranch,
    color: 'text-orange-500',
    inputTypes: ['text', 'json', 'any'],
    outputType: 'any',
    description: 'Branch based on conditions',
  },
  loop: {
    type: 'loop',
    label: 'Loop',
    icon: Repeat,
    color: 'text-blue-500',
    inputTypes: ['json', 'any'],
    outputType: 'any',
    description: 'Iterate over items',
  },
  context_retrieval: {
    type: 'context_retrieval',
    label: 'Context Retrieval',
    icon: Database,
    color: 'text-yellow-500',
    inputTypes: ['text', 'any'],
    outputType: 'json',
    description: 'Retrieve documents from project context',
  },
  processing: {
    type: 'processing',
    label: 'Processing',
    icon: Cpu,
    color: 'text-cyan-500',
    inputTypes: ['text', 'json', 'image', 'any'],
    outputType: 'any',
    description: 'Process and transform data',
  },
  attach_creative: {
    type: 'attach_creative',
    label: 'Attach Creative',
    icon: Paperclip,
    color: 'text-indigo-500',
    inputTypes: ['image', 'text', 'json'],
    outputType: 'json',
    description: 'Attach assets to documents',
  },
};

// ============================================================================
// CONNECTION VALIDATION
// ============================================================================

/**
 * Check if a connection between two node types is valid based on their
 * input/output type compatibility.
 */
export function isConnectionValid(
  sourceNodeType: string,
  targetNodeType: string
): boolean {
  const sourceConfig = NODE_TYPE_CONFIGS[sourceNodeType];
  const targetConfig = NODE_TYPE_CONFIGS[targetNodeType];

  if (!sourceConfig || !targetConfig) {
    return false;
  }

  const outputType = sourceConfig.outputType;
  const inputTypes = targetConfig.inputTypes;

  // 'any' type accepts or produces any type
  if (outputType === 'any' || inputTypes.includes('any')) {
    return true;
  }

  return inputTypes.includes(outputType);
}

/**
 * Get a human-readable error message for an invalid connection.
 */
export function getConnectionError(
  sourceNodeType: string,
  targetNodeType: string
): string | null {
  if (isConnectionValid(sourceNodeType, targetNodeType)) {
    return null;
  }

  const sourceConfig = NODE_TYPE_CONFIGS[sourceNodeType];
  const targetConfig = NODE_TYPE_CONFIGS[targetNodeType];

  if (!sourceConfig || !targetConfig) {
    return 'Unknown node type';
  }

  return `Cannot connect: ${sourceConfig.label} outputs ${sourceConfig.outputType}, but ${targetConfig.label} accepts ${targetConfig.inputTypes.join(', ')}`;
}

// ============================================================================
// NODE CATEGORIES FOR PALETTE
// ============================================================================

export const NODE_CATEGORIES = [
  {
    category: "Control Flow",
    items: ['start', 'finish', 'conditional', 'loop'],
  },
  {
    category: "AI Generation",
    items: ['text_generation', 'image_generation'],
  },
  {
    category: "Data & Processing",
    items: ['context_retrieval', 'processing', 'attach_creative'],
  },
];
