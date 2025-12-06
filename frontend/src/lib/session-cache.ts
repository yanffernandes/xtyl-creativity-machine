/**
 * Session Cache Module
 *
 * Caches Supabase session to eliminate the 50-100ms overhead of calling
 * getSession() on every API request.
 *
 * Feature: 023-performance-optimization
 * User Story: US2 - Session Cache
 */

import { Session } from '@supabase/supabase-js'
import { supabase } from './supabase/client'

// T013: Session cache TTL - 30 seconds
const SESSION_CACHE_TTL = 30 * 1000

// Module-level cache
let cachedSession: { session: Session | null; timestamp: number } | null = null

/**
 * T014: Get cached session or fetch new one if cache is stale
 * Reduces getSession() calls from every request to once per 30 seconds
 */
export async function getCachedSession(): Promise<Session | null> {
  const now = Date.now()

  // Return cache if valid and not expired
  if (cachedSession && (now - cachedSession.timestamp) < SESSION_CACHE_TTL) {
    return cachedSession.session
  }

  // Fetch new session
  const { data: { session } } = await supabase.auth.getSession()
  cachedSession = { session, timestamp: now }

  return session
}

/**
 * T015: Invalidate session cache
 * Called on auth events (logout, token refresh) to ensure fresh data
 */
export function invalidateSessionCache(): void {
  cachedSession = null
}

/**
 * T016: Auth state change listener to invalidate cache on relevant events
 * - SIGNED_OUT: User logged out, must clear cached session
 * - TOKEN_REFRESHED: New token available, must update cache
 * - SIGNED_IN: New login, cache will be updated on next getCachedSession call
 */
let authListenerInitialized = false

export function initializeAuthListener(): void {
  if (authListenerInitialized) return
  authListenerInitialized = true

  supabase.auth.onAuthStateChange((event, session) => {
    if (event === 'SIGNED_OUT') {
      invalidateSessionCache()
    } else if (event === 'TOKEN_REFRESHED') {
      // Update cache with new token immediately
      cachedSession = { session, timestamp: Date.now() }
    } else if (event === 'SIGNED_IN') {
      // Update cache with new session
      cachedSession = { session, timestamp: Date.now() }
    }
  })
}

// Auto-initialize listener when module is imported (browser only)
if (typeof window !== 'undefined') {
  initializeAuthListener()
}
