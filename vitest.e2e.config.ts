/// <reference types="vitest" />
import { defineConfig } from 'vite'
import path from 'path'

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    setupFiles: ['./src/test/e2e/setup.ts'],
    include: [
      'src/test/e2e/**/*.{test,spec}.{js,mjs,cjs,ts,mts,cts}'
    ],
    testTimeout: 30000,
    hookTimeout: 30000,
    threads: false, // Puppeteer doesn't work well with threads
    maxConcurrency: 1 // Run E2E tests sequentially
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
})