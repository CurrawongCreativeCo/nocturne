import { defineConfig, devices } from '@playwright/test'

import { APP_ENV, APP_PORT, FAKE_SANITY_PORT, REJECTED_CONSENT } from './tests/e2e/constants'

const CI = Boolean(process.env.CI)

/**
 * End-to-end tests: a production build of the site, pointed at a fake Content Lake that serves
 * tests/e2e/fixtures/dataset.mjs. Runs offline; no Sanity project or token needed.
 * Webhook mode is on, so visitors open no live connection and the webhook route is testable.
 */
export default defineConfig({
  testDir: 'tests/e2e',
  fullyParallel: true,
  forbidOnly: CI,
  retries: CI ? 1 : 0,
  reporter: CI ? [['github'], ['html', { open: 'never' }]] : 'list',
  use: {
    baseURL: `http://localhost:${APP_PORT}`,
    trace: 'retain-on-failure',
    // Visitors who already rejected cookies, so the banner doesn't take focus in every test.
    // consent.spec.ts starts from a first visit instead.
    storageState: {
      cookies: [],
      origins: [
        {
          origin: `http://localhost:${APP_PORT}`,
          localStorage: [{ name: 'consent', value: REJECTED_CONSENT }],
        },
      ],
    },
  },
  projects: [
    { name: 'desktop', use: { ...devices['Desktop Chrome'] } },
    { name: 'mobile', use: { ...devices['Pixel 7'] } },
  ],
  webServer: [
    {
      command: 'node tests/e2e/fake-sanity.mjs',
      port: FAKE_SANITY_PORT,
      env: { FAKE_SANITY_PORT: String(FAKE_SANITY_PORT) },
      reuseExistingServer: !CI,
    },
    {
      command: `npx next build && npx next start -p ${APP_PORT}`,
      port: APP_PORT,
      timeout: 300_000,
      reuseExistingServer: !CI,
      env: APP_ENV,
    },
  ],
})
