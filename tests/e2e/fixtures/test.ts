import { test as base } from '@playwright/test'

import { FAKE_SANITY_PORT } from '../constants'

/**
 * Unmocked Sanity pictures get real PNG pixels from the fake Content Lake. A spec's page routes
 * take precedence, preserving its existing visual placeholders, transparent patterns and frames.
 * Overriding context keeps request-only tests free of browser setup.
 */
export const test = base.extend({
  context: async ({ context }, runContext) => {
    const response = await context.request.get(
      `http://localhost:${FAKE_SANITY_PORT}/__fixture/picture.png`,
    )
    const picture = await response.body()
    await response.dispose()
    await context.route('https://cdn.sanity.io/images/**', (route) =>
      route.fulfill({ contentType: 'image/png', body: picture }),
    )
    try {
      await runContext(context)
    } finally {
      await context.unrouteAll({ behavior: 'wait' })
    }
  },
})
