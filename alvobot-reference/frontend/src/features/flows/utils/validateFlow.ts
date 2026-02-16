import { MESSENGER_LIMITS,
  type MessengerNodeData,
  type TextNodeData,
  type CardNodeData,
  type WaitNodeData,
  type TrafficNodeData,
  type CallFlowNodeData,
  type MessageButton } from '../types'
import type { Node } from '@xyflow/react'

export interface ValidationError {
  nodeId: string
  field: string
  message: string
}

export interface ValidationResult {
  isValid: boolean
  errors: ValidationError[]
}

/**
 * Validates a single button
 */
function validateButton(
  button: MessageButton,
  nodeId: string,
  buttonIndex: number
): ValidationError[] {
  const errors: ValidationError[] = []
  const buttonLabel = `Botao ${buttonIndex + 1}`

  // Button label is required
  if (!button.label || !button.label.trim()) {
    errors.push({
      nodeId,
      field: `buttons[${buttonIndex}].label`,
      message: `${buttonLabel}: Label e obrigatorio`,
    })
  } else if (button.label.length > MESSENGER_LIMITS.BUTTON_TITLE) {
    errors.push({
      nodeId,
      field: `buttons[${buttonIndex}].label`,
      message: `${buttonLabel}: Label deve ter no maximo ${MESSENGER_LIMITS.BUTTON_TITLE} caracteres`,
    })
  }

  // Validate based on action type
  if (button.action === 'open_website') {
    if (!button.url || !button.url.trim()) {
      errors.push({
        nodeId,
        field: `buttons[${buttonIndex}].url`,
        message: `${buttonLabel}: URL e obrigatoria para acao "Abrir Website"`,
      })
    } else {
      // Validate URL format
      try {
        new URL(button.url)
      } catch {
        errors.push({
          nodeId,
          field: `buttons[${buttonIndex}].url`,
          message: `${buttonLabel}: URL invalida`,
        })
      }
    }
  } else if (button.action === 'send_message') {
    if (!button.message || !button.message.trim()) {
      errors.push({
        nodeId,
        field: `buttons[${buttonIndex}].message`,
        message: `${buttonLabel}: Mensagem e obrigatoria para acao "Enviar Mensagem"`,
      })
    }
  }

  return errors
}

/**
 * Validates a text node
 */
function validateTextNode(node: Node, data: TextNodeData): ValidationError[] {
  const errors: ValidationError[] = []

  // Text is required
  if (!data.text || !data.text.trim()) {
    errors.push({
      nodeId: node.id,
      field: 'text',
      message: 'Texto da mensagem e obrigatorio',
    })
  } else {
    // Check character limit based on whether there are buttons
    const limit = data.buttons?.length > 0
      ? MESSENGER_LIMITS.BUTTON_TEMPLATE_TEXT
      : MESSENGER_LIMITS.TEXT_MESSAGE

    if (data.text.length > limit) {
      errors.push({
        nodeId: node.id,
        field: 'text',
        message: `Texto excede o limite de ${limit} caracteres`,
      })
    }
  }

  // Validate buttons
  if (data.buttons && data.buttons.length > 0) {
    if (data.buttons.length > MESSENGER_LIMITS.MAX_BUTTONS) {
      errors.push({
        nodeId: node.id,
        field: 'buttons',
        message: `Maximo de ${MESSENGER_LIMITS.MAX_BUTTONS} botoes permitidos`,
      })
    }

    data.buttons.forEach((button, index) => {
      errors.push(...validateButton(button, node.id, index))
    })
  }

  return errors
}

/**
 * Validates a card node
 */
function validateCardNode(node: Node, data: CardNodeData): ValidationError[] {
  const errors: ValidationError[] = []

  // Title is required
  if (!data.title || !data.title.trim()) {
    errors.push({
      nodeId: node.id,
      field: 'title',
      message: 'Titulo do card e obrigatorio',
    })
  } else if (data.title.length > MESSENGER_LIMITS.GENERIC_TEMPLATE_TITLE) {
    errors.push({
      nodeId: node.id,
      field: 'title',
      message: `Titulo excede o limite de ${MESSENGER_LIMITS.GENERIC_TEMPLATE_TITLE} caracteres`,
    })
  }

  // Subtitle character limit (optional field)
  if (data.subtitle && data.subtitle.length > MESSENGER_LIMITS.GENERIC_TEMPLATE_SUBTITLE) {
    errors.push({
      nodeId: node.id,
      field: 'subtitle',
      message: `Subtitulo excede o limite de ${MESSENGER_LIMITS.GENERIC_TEMPLATE_SUBTITLE} caracteres`,
    })
  }

  // Image URL validation (optional but must be valid if provided)
  if (data.imageUrl && data.imageUrl.trim()) {
    try {
      new URL(data.imageUrl)
    } catch {
      errors.push({
        nodeId: node.id,
        field: 'imageUrl',
        message: 'URL da imagem invalida',
      })
    }

    if (data.imageUrl.length > MESSENGER_LIMITS.GENERIC_TEMPLATE_IMAGE_URL) {
      errors.push({
        nodeId: node.id,
        field: 'imageUrl',
        message: `URL da imagem excede o limite de ${MESSENGER_LIMITS.GENERIC_TEMPLATE_IMAGE_URL} caracteres`,
      })
    }
  }

  // Card URL validation (optional but must be valid if provided)
  if (data.url && data.url.trim()) {
    try {
      new URL(data.url)
    } catch {
      errors.push({
        nodeId: node.id,
        field: 'url',
        message: 'URL do card invalida',
      })
    }
  }

  // Validate buttons
  if (data.buttons && data.buttons.length > 0) {
    if (data.buttons.length > MESSENGER_LIMITS.MAX_BUTTONS) {
      errors.push({
        nodeId: node.id,
        field: 'buttons',
        message: `Maximo de ${MESSENGER_LIMITS.MAX_BUTTONS} botoes permitidos`,
      })
    }

    data.buttons.forEach((button, index) => {
      errors.push(...validateButton(button, node.id, index))
    })
  }

  return errors
}

/**
 * Validates a wait node
 */
function validateWaitNode(node: Node, data: WaitNodeData): ValidationError[] {
  const errors: ValidationError[] = []

  if (!data.duration || data.duration < 1) {
    errors.push({
      nodeId: node.id,
      field: 'duration',
      message: 'Duracao deve ser no minimo 1',
    })
  }

  if (!data.timeUnit) {
    errors.push({
      nodeId: node.id,
      field: 'timeUnit',
      message: 'Unidade de tempo e obrigatoria',
    })
  }

  return errors
}

/**
 * Validates a traffic node
 */
function validateTrafficNode(node: Node, data: TrafficNodeData): ValidationError[] {
  const errors: ValidationError[] = []

  if (!data.branches || data.branches.length < 2) {
    errors.push({
      nodeId: node.id,
      field: 'branches',
      message: 'Divisor de trafego precisa de no minimo 2 ramos',
    })
    return errors
  }

  // Check total percentage
  const totalPercentage = data.branches.reduce((sum, branch) => sum + (branch.percentage || 0), 0)
  if (totalPercentage !== 100) {
    errors.push({
      nodeId: node.id,
      field: 'branches',
      message: `Porcentagens devem somar 100% (atual: ${totalPercentage}%)`,
    })
  }

  // Validate each branch
  data.branches.forEach((branch, index) => {
    if (!branch.label || !branch.label.trim()) {
      errors.push({
        nodeId: node.id,
        field: `branches[${index}].label`,
        message: `Ramo ${index + 1}: Label e obrigatorio`,
      })
    }

    if (branch.percentage < 0 || branch.percentage > 100) {
      errors.push({
        nodeId: node.id,
        field: `branches[${index}].percentage`,
        message: `Ramo ${index + 1}: Porcentagem deve estar entre 0 e 100`,
      })
    }
  })

  return errors
}

/**
 * Validates a call-flow node
 */
function validateCallFlowNode(node: Node, data: CallFlowNodeData): ValidationError[] {
  const errors: ValidationError[] = []

  if (!data.selectedFlowId) {
    errors.push({
      nodeId: node.id,
      field: 'selectedFlowId',
      message: 'Selecione um fluxo para chamar',
    })
  }

  return errors
}

/**
 * Validates a single node
 */
function validateNode(node: Node): ValidationError[] {
  const data = node.data as MessengerNodeData

  switch (data.type) {
    case 'start':
      return [] // Start node has no validation
    case 'text':
      return validateTextNode(node, data as TextNodeData)
    case 'card':
      return validateCardNode(node, data as CardNodeData)
    case 'wait':
      return validateWaitNode(node, data as WaitNodeData)
    case 'traffic':
      return validateTrafficNode(node, data as TrafficNodeData)
    case 'call-flow':
      return validateCallFlowNode(node, data as CallFlowNodeData)
    case 'comment':
      return [] // Comment nodes are visual-only, no validation needed
    default:
      return []
  }
}

/**
 * Validates an entire flow
 */
export function validateFlow(nodes: Node[]): ValidationResult {
  const errors: ValidationError[] = []

  // Validate each node
  nodes.forEach((node) => {
    errors.push(...validateNode(node))
  })

  return {
    isValid: errors.length === 0,
    errors,
  }
}

/**
 * Groups validation errors by node ID
 */
export function groupErrorsByNode(errors: ValidationError[]): Map<string, ValidationError[]> {
  const grouped = new Map<string, ValidationError[]>()

  errors.forEach((error) => {
    const existing = grouped.get(error.nodeId) || []
    existing.push(error)
    grouped.set(error.nodeId, existing)
  })

  return grouped
}

/**
 * Formats validation errors for display
 */
export function formatValidationErrors(errors: ValidationError[]): string {
  if (errors.length === 0) return ''

  const grouped = groupErrorsByNode(errors)
  const messages: string[] = []

  grouped.forEach((nodeErrors) => {
    nodeErrors.forEach((error) => {
      messages.push(`• ${error.message}`)
    })
  })

  return messages.join('\n')
}
