// Re-export the singleton from the unified client
// This ensures only ONE Supabase client instance exists across the app
export { supabase, getSupabaseClient } from './supabase/client'
export { supabase as default } from './supabase/client'
