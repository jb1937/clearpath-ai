import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./src/test-utils/setup.ts'],
    
    // Add timeouts to prevent hanging tests
    testTimeout: 15000,
    hookTimeout: 10000,
    teardownTimeout: 5000,
    
    // Improve test isolation and performance
    isolate: true,
    pool: 'threads',
    poolOptions: {
      threads: {
        singleThread: true,
        isolate: true
      }
    },
    
    // Limit concurrent tests to prevent resource contention
    maxConcurrency: 1,
    
    // Add retry for flaky tests
    retry: 1,
    
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: [
        'node_modules/',
        'src/test-utils/',
        '**/*.d.ts',
        '**/*.config.*',
        'dist/',
      ],
    },
  },
})
