import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import { resolve } from 'node:path'

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, resolve(__dirname, '../../'), '')

  return {
    envDir: '../../',
    plugins: [react()],
    resolve: {
      alias: {
        '@': resolve(__dirname, './src'),
        'next/navigation': resolve(__dirname, './src/vite/shims/next-navigation.ts'),
        'next/link': resolve(__dirname, './src/vite/shims/next-link.tsx'),
        'next/image': resolve(__dirname, './src/vite/shims/next-image.tsx'),
        'next/dynamic': resolve(__dirname, './src/vite/shims/next-dynamic.tsx'),
        'next-intl': resolve(__dirname, './src/vite/shims/next-intl.tsx'),
      },
    },
    define: {
      'process.env.NODE_ENV': JSON.stringify(mode),
      'process.env.NEXT_PUBLIC_API_URL': JSON.stringify(env.NEXT_PUBLIC_API_URL || env.VITE_API_URL || 'http://localhost:8000'),
      'process.env.NEXT_PUBLIC_SUPABASE_URL': JSON.stringify(env.NEXT_PUBLIC_SUPABASE_URL || env.VITE_SUPABASE_URL || ''),
      'process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY': JSON.stringify(env.NEXT_PUBLIC_SUPABASE_ANON_KEY || env.VITE_SUPABASE_ANON_KEY || ''),
    },
    server: {
      port: 3000,
    },
  }
})
