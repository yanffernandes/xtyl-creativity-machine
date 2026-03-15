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
    },
    server: {
      port: 5173,
      proxy: {
        '/api': {
          target: env.API_PROXY_TARGET || 'http://localhost:3000',
          changeOrigin: true,
          configure: (proxy) => {
            proxy.on('error', (err: any) => {
              if (err.code === 'ECONNREFUSED') return // suppress "API offline" noise
            })
          },
        },
      },
    },
  }
})
