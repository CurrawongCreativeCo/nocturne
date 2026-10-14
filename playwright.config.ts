import { defineConfig, devices } from '@playwright/test'

import { APP_ENV, APP_PORT, FAKE_SANITY_PORT, REJECTED_CONSENT } from './tests/e2e/constants'

const CI = Boolean(process.env.CI)
const EXPERIMENTS_SPEC = /experiments\.spec\.ts/

/**
 * End-to-end tests: a production build of the site, pointed at a fake Content Lake that serves
 * tests/e2e/fixtures/dataset.mjs. Runs offline; no Sanity project or token needed.
 * Webhook mode is on, so visitors open no live connection and the webhook route is testable.
 */
export default defineConfig({
  testDir: 'tests/e2e',
  fullyParallel: true,
  forbidOnly: CI,
  expect: {
    // Visual regression (visual.spec.ts): frozen animations, hidden caret, CSS-pixel images so
    // mobile baselines aren't 2.6x larger than they need to be.
    toHaveScreenshot: { animations: 'disabled', caret: 'hide', scale: 'css' },
  },
  retries: CI ? 1 : 0,
  reporter: CI ? [['github'], ['html', { open: 'never' }]] : 'list',
  use: {
    baseURL: `http://localhost:${APP_PORT}`,
    trace: 'retain-on-failure',
    // Reveal animations (src/components/motion) render in their final state, so axe and the
    // screenshots never catch an element mid-fade. motion.spec.ts turns animation back on.
    reducedMotion: 'reduce',
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
    { name: 'desktop', testIgnore: EXPERIMENTS_SPEC, use: { ...devices['Desktop Chrome'] } },
    { name: 'mobile', testIgnore: EXPERIMENTS_SPEC, use: { ...devices['Pixel 7'] } },
    {
      // Starts and stops a site-wide A/B test, which makes the proxy rewrite every page request (a
      // form POST included). It runs alone, after everything else, so no other test sees it running.
      name: 'experiments',
      testMatch: EXPERIMENTS_SPEC,
      dependencies: ['desktop', 'mobile'],
      use: { ...devices['Desktop Chrome'] },
    },
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
      // E2E_GALLERY switches on /section-gallery, which visual.spec.ts screenshots.
      env: { ...APP_ENV, E2E_GALLERY: '1' },
    },
  ],
})
