import type { Node, Edge } from '@xyflow/react'

export interface Flow {
  id: string
  name: string
  description?: string
  nodes: Node[]
  edges: Edge[]
  project_id?: number
  user_id?: string
  is_active: boolean
  utm_enabled: boolean
  created_at: string
  updated_at: string
}

export interface FlowFilters {
  search?: string
  projectId?: number
  status?: 'active' | 'inactive' | 'all'
}

export interface CreateFlowInput {
  name: string
  description?: string
  nodes?: Node[]
  edges?: Edge[]
  project_id?: number
  utm_enabled?: boolean
}

export interface UpdateFlowInput extends Partial<CreateFlowInput> {
  id: string
  is_active?: boolean
  utm_enabled?: boolean
}

// Node types for Messenger Flow Builder (matching VueFlow implementation)
export type MessengerNodeType =
  | 'start'
  | 'text'
  | 'card'
  | 'wait'
  | 'traffic'
  | 'call-flow'
  | 'comment'
  | 'error'

// Legacy node types for backwards compatibility
export type FlowNodeType =
  | 'trigger'
  | 'action'
  | 'condition'
  | 'delay'
  | 'output'

// Button types for messages
export type ButtonAction = 'send_message' | 'open_website'

export interface MessageButton {
  id: string
  label: string
  action: ButtonAction
  message?: string
  url?: string
}

// Message type for Facebook Messenger API
export type MessageType = 'ACCOUNT_UPDATE' | 'POST_PURCHASE_UPDATE' | 'CONFIRMED_EVENT_UPDATE'

// Time unit for wait nodes
export type TimeUnit = 'seconds' | 'minutes' | 'hours' | 'days'

// Traffic branch for traffic splitter nodes
export interface TrafficBranch {
  id: string
  label: string
  percentage: number
}

// Image aspect ratio options
export type ImageAspectRatio = 'square' | 'horizontal'

// Base interface with index signature for ReactFlow compatibility
type BaseNodeData = Record<string, unknown>;

// Node data interfaces
export interface StartNodeData extends BaseNodeData {
  type: 'start'
}

export interface TextNodeData extends BaseNodeData {
  type: 'text'
  text: string
  messageType: MessageType
  buttons: MessageButton[]
}

export interface CardNodeData extends BaseNodeData {
  type: 'card'
  title: string
  subtitle?: string
  imageUrl?: string
  imageAspectRatio: ImageAspectRatio
  url?: string
  messageType: MessageType
  buttons: MessageButton[]
}

export interface WaitNodeData extends BaseNodeData {
  type: 'wait'
  duration: number
  timeUnit: TimeUnit
}

export interface TrafficNodeData extends BaseNodeData {
  type: 'traffic'
  branches: TrafficBranch[]
}

export interface CallFlowNodeData extends BaseNodeData {
  type: 'call-flow'
  selectedFlowId: string | null
}

export interface CommentNodeData extends BaseNodeData {
  type: 'comment'
  text: string
}

export interface ErrorNodeData extends BaseNodeData {
  type: 'error'
  originalType: string
}

export type MessengerNodeData =
  | StartNodeData
  | TextNodeData
  | CardNodeData
  | WaitNodeData
  | TrafficNodeData
  | CallFlowNodeData
  | CommentNodeData
  | ErrorNodeData

export interface FlowNodeData {
  label: string
  type: FlowNodeType | MessengerNodeType
  config?: Record<string, unknown>
}

// Facebook Messenger API Character Limits
export const MESSENGER_LIMITS = {
  TEXT_MESSAGE: 2000,
  BUTTON_TEMPLATE_TEXT: 640,
  GENERIC_TEMPLATE_TITLE: 80,
  GENERIC_TEMPLATE_SUBTITLE: 80,
  GENERIC_TEMPLATE_IMAGE_URL: 2048,
  BUTTON_TITLE: 20,
  BUTTON_URL: 2083,
  BUTTON_PAYLOAD: 1000,
  MAX_BUTTONS: 3,
} as const

// Available node types for the dock
// Using sober design system colors
export const AVAILABLE_NODE_TYPES = [
  {
    type: 'start' as MessengerNodeType,
    title: 'Início',
    description: 'Ponto de partida do fluxo',
    icon: 'Rocket',
    color: '#fbbf24', // Primary brand yellow
  },
  {
    type: 'text' as MessengerNodeType,
    title: 'Mensagem de Texto',
    description: 'Envia uma mensagem de texto',
    icon: 'MessageSquare',
    color: '#52525B', // Zinc 600
  },
  {
    type: 'card' as MessengerNodeType,
    title: 'Mensagem com Imagem',
    description: 'Envia um card com imagem',
    icon: 'Image',
    color: '#71717A', // Zinc 500
  },
  {
    type: 'wait' as MessengerNodeType,
    title: 'Aguardar',
    description: 'Aguarda um período de tempo',
    icon: 'Clock',
    color: '#3B82F6', // Blue 600
  },
  {
    type: 'traffic' as MessengerNodeType,
    title: 'Divisor de Tráfego',
    description: 'Divide o tráfego entre diferentes caminhos',
    icon: 'GitBranch',
    color: '#3F3F46', // Zinc 700
  },
  {
    type: 'call-flow' as MessengerNodeType,
    title: 'Chamar Fluxo',
    description: 'Executa outro fluxo',
    icon: 'Workflow',
    color: '#52525B', // Zinc 600
  },
  {
    type: 'comment' as MessengerNodeType,
    title: 'Comentário',
    description: 'Adiciona uma nota ao fluxo',
    icon: 'StickyNote',
    color: '#71717A', // Zinc 500
  },
] as const

// Branch colors for traffic splitter - sober palette
export const BRANCH_COLORS = [
  '#52525B', // Zinc 600
  '#71717A', // Zinc 500
  '#3B82F6', // Blue 600
  '#fbbf24', // Primary yellow
  '#A1A1AA', // Zinc 400
  '#3F3F46', // Zinc 700
  '#6B7280', // Gray 500
  '#9CA3AF', // Gray 400
] as const
