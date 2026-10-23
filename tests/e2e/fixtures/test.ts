import { test as base } from '@playwright/test'

import { FAKE_SANITY_PORT } from '../constants'

/**
 * Unmocked Sanity pictures get real PNG pixels from the fake Content Lake. A spec's page routes
 * take precedence, preserving its existing visual placeholders, transparent patterns and frames.
 */
export const test = base.extend<{ fixtureImages: void }>({
  fixtureImages: [
    async ({ context }, use) => {
      await context.route('https://cdn.sanity.io/images/**', async (route) => {
        const response = await context.request.get(
          `http://localhost:${FAKE_SANITY_PORT}/__fixture/picture.png`,
        )
        await route.fulfill({ response })
      })
      await use()
    },
    { auto: true },
  ],
})
