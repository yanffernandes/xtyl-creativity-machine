import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  test: {
    // Enable global test APIs (describe, it, expect)
    globals: true,

    // Use jsdom for DOM testing
    environment: 'jsdom',

    // Setup files to run before tests
    setupFiles: ['./src/__tests__/setup.ts'],

    // Test file patterns
    include: ['**/*.test.{ts,tsx}'],
    exclude: ['node_modules', 'dist', '.next'],

    // Coverage configuration
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      reportsDirectory: './coverage',
      include: ['src/**/*.{ts,tsx}'],
      exclude: [
        'src/**/*.test.{ts,tsx}',
        'src/__tests__/**',
        'src/**/*.d.ts',
        'src/types/**',
      ],
      thresholds: {
        global: {
          branches: 80,
          functions: 80,
          lines: 80,
          statements: 80,
        },
      },
    },

    // Test timeout (10 seconds)
    testTimeout: 10000,

    // Hook timeout
    hookTimeout: 10000,

    // Retry failed tests once
    retry: 1,

    // Reporter
    reporters: ['default'],

    // Watch mode options
    watch: false,
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
});
