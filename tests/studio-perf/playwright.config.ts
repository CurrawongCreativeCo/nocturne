import { existsSync } from 'node:fs'

import { defineConfig, devices } from '@playwright/test'

import { assertTarget, AUTH_FILE, ORIGIN } from './safety'

assertTarget()
if (!existsSync(AUTH_FILE))
  throw new Error('Save the throwaway Studio sign-in first; see README → Studio performance check.')

export default defineConfig({
  testDir: '.',
  testMatch: ['studio-perf.spec.ts', 'preview.spec.ts'],
  workers: 1,
  retries: 0,
  timeout: 600_000,
  expect: { timeout: 60_000 },
  reporter: 'list',
  outputDir: 'test-results/studio-perf',
  projects: [
    {
      name: 'studio-perf',
      use: {
        ...devices['Desktop Chrome'],
        locale: 'en-AU',
        timezoneId: 'Australia/Brisbane',
        baseURL: ORIGIN,
        storageState: AUTH_FILE,
        trace: 'off',
      },
    },
  ],
  webServer: {
    command: 'node --experimental-strip-types tests/studio-perf/server.ts --serve',
    // Playwright starts the server in the config file's folder by default; the paths assume the repo root.
    cwd: process.cwd(),
    url: `${ORIGIN}/studio`,
    reuseExistingServer: false,
    timeout: 60_000,
  },
})
