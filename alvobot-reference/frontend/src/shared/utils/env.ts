// Environment variables validation

interface EnvConfig {
  SUPABASE_URL: string
  SUPABASE_ANON_KEY: string
  API_URL: string
}

function getEnvVar(key: string): string {
  const value = import.meta.env[key]
  if (!value) {
    throw new Error(`Missing environment variable: ${key}`)
  }
  return value
}

export function getEnvConfig(): EnvConfig {
  return {
    SUPABASE_URL: getEnvVar('VITE_SUPABASE_URL'),
    SUPABASE_ANON_KEY: getEnvVar('VITE_SUPABASE_ANON_KEY'),
    API_URL: getEnvVar('VITE_API_URL'),
  }
}

export const env = {
  get supabaseUrl() {
    return import.meta.env.VITE_SUPABASE_URL || ''
  },
  get supabaseAnonKey() {
    return import.meta.env.VITE_SUPABASE_ANON_KEY || ''
  },
  get apiUrl() {
    return getEnvVar('VITE_API_URL')
  },
  get isDev() {
    return import.meta.env.DEV
  },
  get isProd() {
    return import.meta.env.PROD
  },
}
