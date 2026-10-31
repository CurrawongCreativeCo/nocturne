import { defineConfig, devices } from '@playwright/test'

import {
  APP_ENV,
  APP_PORT,
  APP_PORT_ENQUIRIES_OFF,
  APP_PORT_PRELAUNCH,
  PRELAUNCH_PREVIEW_TOKEN,
  PREVIEW_ACCESS_SECRET,
  FAKE_SANITY_PORT,
  REJECTED_CONSENT,
} from './tests/e2e/constants'

const CI = Boolean(process.env.CI)
// node_modules/.cache is ignored by git, ESLint and Prettier.
const OFF_DIST_DIR = 'node_modules/.cache/e2e-enquiries-off'
const PRELAUNCH_DIST_DIR = 'node_modules/.cache/e2e-prelaunch'
const EXPERIMENTS_SPEC = /experiments\.spec\.ts/
// Switch the colours the whole fake site is served in, so each runs alone (see the projects below).
const DESIGN_SPEC = /design-settings\.spec\.ts/
const DESIGN_VISUAL_SPEC = /design-settings-visual\.spec\.ts/
// Panels under each palette, switching the colours the same way.
const PANEL_PALETTE_SPEC = /section-panel-rendering\.spec\.ts/
const ISOLATED_SPECS = [EXPERIMENTS_SPEC, DESIGN_SPEC, DESIGN_VISUAL_SPEC, PANEL_PALETTE_SPEC]

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
  // CI also writes the JSON report that scripts/e2e-timings.mjs summarises; each job names its own file.
  reporter: CI
    ? [
        ['github'],
        ['html', { open: 'never' }],
        ['json', { outputFile: process.env.E2E_TIMINGS_FILE ?? 'e2e-timings/results.json' }],
      ]
    : 'list',
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
    { name: 'desktop', testIgnore: ISOLATED_SPECS, use: { ...devices['Desktop Chrome'] } },
    { name: 'mobile', testIgnore: ISOLATED_SPECS, use: { ...devices['Pixel 7'] } },
    {
      // Starts and stops a site-wide A/B test, which makes the proxy rewrite every page request (a
      // form POST included). It runs alone, after everything else, so no other test sees it running.
      name: 'experiments',
      testMatch: EXPERIMENTS_SPEC,
      dependencies: ['desktop', 'mobile'],
      use: { ...devices['Desktop Chrome'] },
    },
    {
      // Serves the Studio's brand colours (a sample palette, light and dark) to the whole site, which
      // would change every other test's colours. It runs alone, after the A/B tests, then restores them.
      name: 'design',
      testMatch: DESIGN_SPEC,
      dependencies: ['experiments'],
      use: { ...devices['Desktop Chrome'] },
    },
    {
      // The same palettes as screenshots; after `design` so the two never switch colours at once.
      name: 'design-visual',
      testMatch: DESIGN_VISUAL_SPEC,
      dependencies: ['design'],
      use: { ...devices['Desktop Chrome'] },
    },
    {
      // Panels as the browser draws them under each palette; after `design-visual` so two specs never
      // switch the site's colours at once.
      name: 'panel-palettes',
      testMatch: PANEL_PALETTE_SPEC,
      dependencies: ['design-visual'],
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
      command: `node scripts/e2e-clear-data-cache.mjs && npx next build && npx next start -p ${APP_PORT}`,
      port: APP_PORT,
      timeout: 300_000,
      reuseExistingServer: !CI,
      // E2E_GALLERY switches on /section-gallery, which visual.spec.ts screenshots.
      env: { ...APP_ENV, E2E_GALLERY: '1' },
    },
    {
      // The same build with enquiry storage off, to show a send then writes nothing. Playwright starts
      // the servers in order, so the build above has finished by now. It runs from its own copy: two
      // servers sharing one .next directory broke each other's pages.
      command: `node scripts/e2e-copy-build.mjs enquiries-off && npx next start -p ${APP_PORT_ENQUIRIES_OFF}`,
      port: APP_PORT_ENQUIRIES_OFF,
      timeout: 120_000,
      reuseExistingServer: !CI,
      env: {
        ...APP_ENV,
        E2E_GALLERY: '1',
        ENQUIRIES_STORE: '0',
        NEXT_DIST_DIR: OFF_DIST_DIR,
      },
    },
    {
      // The same build, started pre-launch by the hide-only override, to test the gate (README,
      // "Pre-launch and launch"). Its own copy of the build, for the reason above.
      command: `node scripts/e2e-copy-build.mjs prelaunch && npx next start -p ${APP_PORT_PRELAUNCH}`,
      port: APP_PORT_PRELAUNCH,
      timeout: 120_000,
      reuseExistingServer: !CI,
      env: {
        ...APP_ENV,
        E2E_GALLERY: '1',
        SITE_LAUNCH_OVERRIDE: 'prelaunch',
        PREVIEW_ACCESS_SECRET,
        PRELAUNCH_PREVIEW_TOKEN,
        NEXT_DIST_DIR: PRELAUNCH_DIST_DIR,
      },
    },
  ],
})
