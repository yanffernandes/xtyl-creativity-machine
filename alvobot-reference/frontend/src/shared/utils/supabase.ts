import { createClient } from '@supabase/supabase-js'
import { env } from './env'

if (!env.supabaseUrl || !env.supabaseAnonKey) {
  console.warn('Supabase environment variables not set. Authentication will not work.')
}

export const supabase = createClient(env.supabaseUrl || 'http://placeholder', env.supabaseAnonKey || 'placeholder', {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true,
  },
})

export type { User, Session } from '@supabase/supabase-js'

// Helper to get current user ID
// Uses getSession() which reads from local storage (no HTTP request)
// Falls back to getUser() only if session is not available
export async function getCurrentUserId(): Promise<string | null> {
  // First try to get from session (cached, no HTTP request)
  const {
    data: { session },
  } = await supabase.auth.getSession()
  if (session?.user?.id) {
    return session.user.id
  }

  // Fallback to getUser() which makes an HTTP request
  const {
    data: { user },
  } = await supabase.auth.getUser()
  return user?.id || null
}
