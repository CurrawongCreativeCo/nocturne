import { expect } from '@playwright/test'

import { FAKE_SANITY_PORT } from './constants'
import { test } from './fixtures/test'

const LAKE = `http://localhost:${FAKE_SANITY_PORT}`

test.skip(({ isMobile }) => isMobile, 'Desktop only')

/**
 * The publish gate in the production build as sites ship it: off (README, "Publish gate"). The gate
 * itself, with the feature on, is tested against a fake Sanity API in src/app/publish-gate-route.test.ts,
 * because the feature flag is fixed at build time and Studio cannot sign in against the fake lake.
 */
test.describe('POST /api/publish with the publish gate off', () => {
  test('answers 404 as if the route did not exist, whoever asks, and writes nothing', async ({
    request,
  }) => {
    const mutationsBefore = (await (
      await request.get(`${LAKE}/__fixture/mutations`)
    ).json()) as unknown[]
    for (const headers of [
      {} as Record<string, string>,
      { Authorization: 'Bearer a-contributors-token' },
    ]) {
      const response = await request.post('/api/publish', {
        headers,
        data: { documentId: 'about' },
      })
      expect(response.status()).toBe(404)
      expect(response.headers()['cache-control']).toContain('no-store')
      expect(await response.text()).toBe('')
    }
    const mutationsAfter = (await (
      await request.get(`${LAKE}/__fixture/mutations`)
    ).json()) as unknown[]
    expect(mutationsAfter).toEqual(mutationsBefore)
  })

  test('is reported off by /api/site-info', async ({ request }) => {
    const body = (await (await request.get('/api/site-info')).json()) as {
      enabled: Record<string, boolean>
    }
    expect(body.enabled.publishGate).toBeFalsy()
  })
})
