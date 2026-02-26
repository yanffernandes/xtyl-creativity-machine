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

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  // During SSG build, env vars may not be available - return a placeholder
  // that will be replaced at runtime
  if (!supabaseUrl || !supabaseAnonKey) {
    // Only warn in browser context, not during build
    if (typeof window !== 'undefined') {
      console.warn(
        'Supabase environment variables not set. CRUD operations will not work.',
        'Required: NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY'
      )
    }
    // Create with placeholder URL to avoid build errors
    // This client won't work but allows build to complete
    supabaseClient = createClient(
      'https://placeholder.supabase.co',
      'placeholder-key',
      {
        auth: {
          persistSession: false,
          autoRefreshToken: false,
        },
      }
    )
    return supabaseClient
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
