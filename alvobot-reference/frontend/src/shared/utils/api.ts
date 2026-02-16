import { env } from './env'
import { supabase } from './supabase'

/**
 * Lazy reference to workspace store to avoid circular dependencies.
 * Set by the store module itself during initialization.
 */
let _getWorkspaceId: (() => string | undefined) | null = null

/**
 * Register the workspace ID getter. Called by workspaceStore on initialization.
 */
export function registerWorkspaceIdGetter(getter: () => string | undefined): void {
  _getWorkspaceId = getter
}

/**
 * Get current workspace ID from Zustand store (outside React components).
 */
function getWorkspaceId(): string | undefined {
  return _getWorkspaceId?.()
}

// Default timeout for API requests (prevents indefinite hanging)
const DEFAULT_TIMEOUT_MS = 60_000 // 60 seconds

interface ApiRequestOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH'
  body?: unknown
  headers?: Record<string, string>
  /** AbortSignal for request cancellation */
  signal?: AbortSignal
  /** Custom timeout in ms (default: 60s) */
  timeoutMs?: number
}

interface ApiError {
  message: string
  statusCode: number
}

class ApiClient {
  private baseUrl: string
  private isRefreshing = false
  private refreshPromise: Promise<void> | null = null

  constructor() {
    this.baseUrl = env.apiUrl
  }

  private async checkAndRefreshToken(): Promise<string | null> {
    const { data: { session } } = await supabase.auth.getSession()

    if (!session?.access_token) return null

    // Check if token expires in less than 5 minutes
    const expiresAt = session.expires_at ? session.expires_at * 1000 : 0
    const fiveMinutes = 5 * 60 * 1000
    const needsRefresh = expiresAt - Date.now() < fiveMinutes

    if (needsRefresh && !this.isRefreshing) {
      this.isRefreshing = true
      this.refreshPromise = this.performRefresh()
      await this.refreshPromise
      this.isRefreshing = false
      this.refreshPromise = null

      // Get new token after refresh
      const { data: { session: newSession } } = await supabase.auth.getSession()
      return newSession?.access_token || null
    }

    if (this.isRefreshing && this.refreshPromise) {
      await this.refreshPromise
      const { data: { session: newSession } } = await supabase.auth.getSession()
      return newSession?.access_token || null
    }

    return session.access_token
  }

  private async performRefresh(): Promise<void> {
    const { error } = await supabase.auth.refreshSession()
    if (error) {
      console.error('Token refresh failed:', error)
      throw error
    }
  }

  async request<T>(endpoint: string, options: ApiRequestOptions = {}): Promise<T> {
    const { method = 'GET', body, headers = {}, signal, timeoutMs = DEFAULT_TIMEOUT_MS } = options

    const token = await this.checkAndRefreshToken()

    const requestHeaders: Record<string, string> = {
      'Content-Type': 'application/json',
      ...headers,
    }

    if (token) {
      requestHeaders['Authorization'] = `Bearer ${token}`
    }

    // Automatically inject workspace ID header for all backend requests
    if (!requestHeaders['x-workspace-id']) {
      const workspaceId = getWorkspaceId()
      if (workspaceId) {
        requestHeaders['x-workspace-id'] = workspaceId
      }
    }

    // Combine user-provided abort signal with timeout signal
    const timeoutController = new AbortController()
    const timeoutId = setTimeout(() => timeoutController.abort(), timeoutMs)

    // If a user signal is provided, abort our controller when it fires
    if (signal) {
      signal.addEventListener('abort', () => timeoutController.abort(), { once: true })
    }

    let response: Response
    try {
      response = await fetch(`${this.baseUrl}${endpoint}`, {
        method,
        headers: requestHeaders,
        body: body ? JSON.stringify(body) : undefined,
        signal: timeoutController.signal,
      })
    } catch (err) {
      clearTimeout(timeoutId)
      // Distinguish timeout from user cancellation
      if (err instanceof DOMException && err.name === 'AbortError') {
        if (signal?.aborted) throw err // User cancelled - re-throw as-is
        throw new Error(`Request to ${endpoint} timed out after ${timeoutMs / 1000}s`)
      }
      throw err
    } finally {
      clearTimeout(timeoutId)
    }

    // Handle 401 with retry after refresh
    if (response.status === 401) {
      // Attempt refresh and retry once
      try {
        await this.performRefresh()
        const newToken = await this.checkAndRefreshToken()

        if (newToken) {
          requestHeaders['Authorization'] = `Bearer ${newToken}`

          // Retry request
          const retryResponse = await fetch(`${this.baseUrl}${endpoint}`, {
            method,
            headers: requestHeaders,
            body: body ? JSON.stringify(body) : undefined,
          })

          if (retryResponse.ok) {
            return this.parseResponse<T>(retryResponse)
          }

          // If retry also fails, throw the retry error
          throw await this.createError(retryResponse)
        }
      } catch (refreshError) {
        console.error('Token refresh on 401 failed:', refreshError)
        // Fall through to throw original 401 error
      }
    }

    if (!response.ok) {
      throw await this.createError(response)
    }

    return this.parseResponse<T>(response)
  }

  private async createError(response: Response): Promise<ApiError> {
    let errorMessage = 'An error occurred'
    try {
      const errorData = await response.json()
      errorMessage = errorData.message || errorMessage
    } catch {
      errorMessage = response.statusText
    }

    return {
      message: errorMessage,
      statusCode: response.status,
    }
  }

  private async parseResponse<T>(response: Response): Promise<T> {
    // Handle 204 No Content
    if (response.status === 204) {
      return undefined as T
    }
    return response.json()
  }

  async get<T>(
    endpoint: string,
    options?: { headers?: Record<string, string>; signal?: AbortSignal }
  ): Promise<T> {
    return this.request<T>(endpoint, { method: 'GET', ...options })
  }

  async post<T>(
    endpoint: string,
    body: unknown,
    options?: { headers?: Record<string, string>; signal?: AbortSignal }
  ): Promise<T> {
    return this.request<T>(endpoint, { method: 'POST', body, ...options })
  }

  async put<T>(
    endpoint: string,
    body: unknown,
    options?: { headers?: Record<string, string>; signal?: AbortSignal }
  ): Promise<T> {
    return this.request<T>(endpoint, { method: 'PUT', body, ...options })
  }

  async patch<T>(
    endpoint: string,
    body: unknown,
    options?: { headers?: Record<string, string>; signal?: AbortSignal }
  ): Promise<T> {
    return this.request<T>(endpoint, { method: 'PATCH', body, ...options })
  }

  async delete<T>(
    endpoint: string,
    options?: { headers?: Record<string, string>; signal?: AbortSignal }
  ): Promise<T> {
    return this.request<T>(endpoint, { method: 'DELETE', ...options })
  }
}

export const api = new ApiClient()
