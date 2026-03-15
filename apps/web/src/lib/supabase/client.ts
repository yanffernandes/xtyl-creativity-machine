/**
 * Supabase Client Singleton
 *
 * Provides a single instance of the Supabase client for use throughout the frontend.
 * Used for direct CRUD operations bypassing the Python backend for improved latency.
 *
 * Feature: 007-hybrid-supabase-architecture
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js'

// Singleton instance - lazily initialized
let supabaseClient: SupabaseClient | null = null

/**
 * Get the Supabase client singleton.
 * Creates a new client on first call, reuses existing instance on subsequent calls.
 * Returns null during SSG build when env vars are not available.
 */
export function getSupabaseClient(): SupabaseClient {
  if (supabaseClient) {
    return supabaseClient
  }

  // Priority: runtime injection (window.__ENV__) → build-time baking (import.meta.env)
  const runtimeEnv = (typeof window !== 'undefined' && (window as any).__ENV__) || {}
  const supabaseUrl = runtimeEnv.VITE_SUPABASE_URL || import.meta.env.VITE_SUPABASE_URL
  const supabaseAnonKey = runtimeEnv.VITE_SUPABASE_ANON_KEY || import.meta.env.VITE_SUPABASE_ANON_KEY

  // During SSG build, env vars may not be available - return a placeholder
  // that will be replaced at runtime
  if (!supabaseUrl || !supabaseAnonKey) {
    if (typeof window !== 'undefined') {
      console.warn('Supabase env vars not set (VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY). Auth will not work.')
    }
    // Do NOT cache the placeholder — allow retry on next call once env.js loads
    return createClient('https://placeholder.supabase.co', 'placeholder-key', {
      auth: { persistSession: false, autoRefreshToken: false },
    })
  }

  supabaseClient = createClient(
    supabaseUrl,
    supabaseAnonKey,
    {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
      },
    }
  )
  return supabaseClient
}

// Lazy getter - only initialize when actually accessed at runtime
// This prevents SSG build errors when env vars aren't available
export const supabase = new Proxy({} as SupabaseClient, {
  get(_target, prop) {
    return getSupabaseClient()[prop as keyof SupabaseClient]
  },
})

export default supabase
