import { fileURLToPath } from 'node:url'

import { defineConfig } from 'vitest/config'

/** Unit tests for pure logic. Browser tests live in tests/e2e (Playwright). */
export default defineConfig({
  resolve: { alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) } },
  test: {
    include: ['src/**/*.test.{ts,tsx}', 'scripts/**/*.test.mjs', 'migrations/**/*.test.ts'],
    environment: 'node',
    // The generator CI jobs add a section that has no snapshots yet (the output-parity and capability
    // availability ones). In CI a missing snapshot fails; `VITEST_NEW_SNAPSHOTS=1` writes new ones and
    // still fails any that changed. Never set on a normal run.
    ...(process.env.VITEST_NEW_SNAPSHOTS ? { update: 'new' as const } : {}),
  },
})
