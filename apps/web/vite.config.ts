import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { TanStackRouterVite } from '@tanstack/router-plugin/vite';
import { resolve } from 'node:path';

export default defineConfig({
  plugins: [
    TanStackRouterVite({
      routesDirectory: resolve(__dirname, './src/routes'),
      generatedRouteTree: resolve(__dirname, './src/routeTree.gen.ts'),
      quoteStyle: 'single',
    }),
    react(),
    tailwindcss(),
  ],
  resolve: {
    alias: {
      '@': resolve(__dirname, './src'),
    },
  },
  server: {
    port: 5173,
  },
});
