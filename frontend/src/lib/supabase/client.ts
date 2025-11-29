/**
 * Supabase Client Singleton
 *
 * Provides a single instance of the Supabase client for use throughout the frontend.
 * Used for direct CRUD operations bypassing the Python backend for improved latency.
 *
 * Feature: 007-hybrid-supabase-architecture
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn(
    'Supabase environment variables not set. CRUD operations will not work.',
    'Required: NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY'
  )
}

// Singleton instance
let supabaseClient: SupabaseClient | null = null

/**
 * Get the Supabase client singleton.
 * Creates a new client on first call, reuses existing instance on subsequent calls.
 */
export function getSupabaseClient(): SupabaseClient {
  if (!supabaseClient) {
    supabaseClient = createClient(
      supabaseUrl || '',
      supabaseAnonKey || '',
      {
        auth: {
          persistSession: true,
          autoRefreshToken: true,
          detectSessionInUrl: true,
        },
      }
    )
  }
  return supabaseClient
}

// Export the singleton for direct imports
export const supabase = getSupabaseClient()

export default supabase
