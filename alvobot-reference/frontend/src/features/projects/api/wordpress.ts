import { useMutation } from '@tanstack/react-query'
import { api } from '@/shared/utils/api'
import type { WordPressConnectionResult, PluginInstallationResult, InstallSinglePluginInput, SinglePluginInstallResult } from '../types'

/**
 * Test WordPress connection with credentials
 */
export function useTestWordPressConnection() {
  return useMutation({
    mutationFn: async (data: {
      domain: string
      login: string
      password: string
    }): Promise<WordPressConnectionResult> => {
      const response = await api.post<WordPressConnectionResult>(
        '/wordpress/test-connection',
        data
      )
      return response
    },
  })
}

/**
 * Install essential plugins after project creation
 */
export function useInstallEssentialPlugins() {
  return useMutation({
    mutationFn: async (data: {
      projectId: number
      token: string
    }): Promise<PluginInstallationResult> => {
      const response = await api.post<PluginInstallationResult>(
        '/wordpress/install-essential-plugins',
        data
      )
      return response
    },
  })
}

/**
 * Get WordPress site information for existing project
 */
export function useGetWordPressSiteInfo() {
  return useMutation({
    mutationFn: async (projectId: number): Promise<WordPressConnectionResult> => {
      const response = await api.get<WordPressConnectionResult>(
        `/wordpress/site-info/${projectId}`
      )
      return response
    },
  })
}

/**
 * Install a single plugin on a WordPress project
 * Used for real-time UI updates during plugin installation
 */
export function useInstallSinglePlugin() {
  return useMutation({
    mutationFn: async (data: InstallSinglePluginInput): Promise<SinglePluginInstallResult> => {
      const response = await api.post<SinglePluginInstallResult>(
        '/wordpress/install-plugin',
        data
      )
      return response
    },
  })
}

/**
 * Generate a temporary magic link for WordPress auto-login
 * Calls the alvobot-pro plugin endpoint directly on the WordPress site
 */
export interface MagicLinkResponse {
  success: boolean
  login_url?: string
  error?: string
}

export function useGenerateMagicLink() {
  return useMutation({
    mutationFn: async (data: {
      domain: string
      token: string
    }): Promise<MagicLinkResponse> => {
      const baseUrl = data.domain.replace(/\/$/, '')
      const endpoint = `${baseUrl}/wp-json/alvobot-pro/v1/temporary-login/generate`

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          token: data.token,
          expiration_hours: 24,
          description: 'Acesso via AlvoBot App',
        }),
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.message || 'Falha ao gerar link de acesso')
      }

      return response.json()
    },
  })
}
