import type { Project } from '@/shared/types/entities'

export type { Project }

export interface ProjectFilters {
  search?: string
  status?: boolean
  isDeleted?: boolean
}

export interface CreateProjectInput {
  name: string
  domain?: string
  login?: string
  password?: string // Application Password for WordPress authentication
  pass?: string // Legacy field, kept for backward compatibility
  default_language?: string
  niche_selected?: string
}

export interface UpdateProjectInput extends Partial<CreateProjectInput> {
  status?: boolean
}

// WordPress plugin installation types (004-meus-blogs)
export interface PluginInstallStatus {
  slug: string
  name: string
  status: 'pending' | 'installing' | 'installed' | 'error' | 'already_installed'
  error?: string
}

export interface WordPressConnectionResult {
  success: boolean
  message: string
  wpVersion?: string
  plugins?: string[]
}

export interface PluginInstallationResult {
  totalPlugins: number
  installed: number
  failed: number
  results: PluginInstallStatus[]
}

// Single plugin installation input
export interface InstallSinglePluginInput {
  projectId: number
  pluginSlug: string
  token: string
}

// Single plugin installation result (matches backend PluginInstallResponse)
export interface SinglePluginInstallResult {
  slug: string
  name: string
  status: 'installed' | 'error' | 'already_installed'
  error?: string
}
