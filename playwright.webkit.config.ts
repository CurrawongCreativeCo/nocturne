import { defineConfig, devices } from '@playwright/test'

import base from './playwright.config'

/**
 * A targeted WebKit pass for section edges (task 151; Stage 3 section 12), run locally and never in CI:
 * `npx playwright test -c playwright.webkit.config.ts`. It is Playwright's WebKit build, not Safari on a Mac
 * or an iPhone, so it does not stand in for those checks. The same servers as the main config.
 */
export default defineConfig({
  ...base,
  projects: [
    {
      name: 'webkit',
      testMatch: [
        /section-edge-composed\.spec\.ts/,
        /section-edge-stability\.spec\.ts/,
        /section-edge-hairlines\.spec\.ts/,
        /section-edges\.spec\.ts/,
      ],
      use: { ...devices['Desktop Safari'] },
    },
  ],
})
