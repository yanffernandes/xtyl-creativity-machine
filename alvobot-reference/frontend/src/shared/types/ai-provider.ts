/**
 * Shared AI Provider Types
 * Used across OpenRouter and OpenAI integrations
 */

export type AIProvider = 'openai' | 'openrouter' | 'google'

export interface ProviderConfig {
  provider: AIProvider
  model: string
}

export interface OpenRouterModel {
  id: string // e.g., "openai/gpt-4o"
  name: string // e.g., "GPT-4o"
  description?: string
  context_length: number
  pricing: {
    prompt: string // USD per token
    completion: string
  }
  capabilities: {
    text_input: boolean
    image_input: boolean
    text_output: boolean
    image_output: boolean
  }
}

export interface DefaultImageModelConfig {
  provider: AIProvider
  model: string
}
