/**
 * Utility functions for determining API connection status.
 *
 * This module provides a consistent way to determine connection status
 * across the entire application, avoiding inconsistencies between
 * different views (list, modal, etc.).
 */

export type ConnectionStatusType = 'connected' | 'disconnected' | 'expired' | 'needs_reconnect'

export interface ConnectionStatusInfo {
  status: ConnectionStatusType
  label: string
  color: string
  /** CSS class suffix for styling (e.g., 'success', 'danger', 'warning') */
  variant: 'success' | 'danger' | 'warning'
  /** Optional error message for needs_reconnect status */
  errorMessage?: string
}

export interface ConnectionForStatus {
  is_active: boolean
  needs_reconnect?: boolean
  token_expires_at?: string | null
  last_refresh_error?: string | null
}

/**
 * Determines the status of a connection based on its properties.
 *
 * Priority order:
 * 1. needs_reconnect = true → "Reconexão necessária" (user must reconnect)
 * 2. is_active = false → "Desconectado" (connection disabled)
 * 3. token_expires_at < now → "Expirado" (token has expired)
 * 4. default → "Conectado" (healthy connection)
 *
 * @param connection - The connection object to check
 * @returns ConnectionStatusInfo with status details
 */
export function getConnectionStatus(connection: ConnectionForStatus): ConnectionStatusInfo {
  // Priority 1: Needs reconnect (permanent token refresh failure)
  if (connection.needs_reconnect) {
    return {
      status: 'needs_reconnect',
      label: 'Reconexão necessária',
      color: '#EF4444',
      variant: 'danger',
      errorMessage: connection.last_refresh_error || 'Token precisa ser renovado',
    }
  }

  // Priority 2: Inactive connection
  if (!connection.is_active) {
    return {
      status: 'disconnected',
      label: 'Desconectado',
      color: '#F59E0B',
      variant: 'warning',
    }
  }

  // Priority 3: Token expired
  if (connection.token_expires_at) {
    const expiresAt = new Date(connection.token_expires_at)
    if (expiresAt < new Date()) {
      return {
        status: 'expired',
        label: 'Expirado',
        color: '#EF4444',
        variant: 'danger',
      }
    }
  }

  // Default: Connected and healthy
  return {
    status: 'connected',
    label: 'Conectado',
    color: '#10B981',
    variant: 'success',
  }
}

/**
 * Checks if a connection requires attention (reconnect or expired).
 *
 * @param connection - The connection object to check
 * @returns true if the connection needs attention
 */
export function connectionNeedsAttention(connection: ConnectionForStatus): boolean {
  const status = getConnectionStatus(connection)
  return status.status === 'needs_reconnect' || status.status === 'expired'
}

/**
 * Checks if a connection is healthy (connected and not expired).
 *
 * @param connection - The connection object to check
 * @returns true if the connection is healthy
 */
export function isConnectionHealthy(connection: ConnectionForStatus): boolean {
  return getConnectionStatus(connection).status === 'connected'
}
