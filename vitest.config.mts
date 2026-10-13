import { fileURLToPath } from 'node:url'

import { defineConfig } from 'vitest/config'

/** Unit tests for pure logic. Browser tests live in tests/e2e (Playwright). */
export default defineConfig({
  resolve: { alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) } },
  test: {
    include: ['src/**/*.test.ts', 'scripts/**/*.test.mjs', 'migrations/**/*.test.ts'],
    environment: 'node',
  },
})
