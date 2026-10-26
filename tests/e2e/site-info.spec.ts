import { expect } from '@playwright/test'

import { APP_ENV } from './constants'
import { test } from './fixtures/test'

test.skip(({ isMobile }) => isMobile, 'Desktop only')

interface SiteInfo {
  schema: number
  launch: { status: string; homepage: string }
}

test.describe('/api/site-info', () => {
  test('reports the launch state and nothing else', async ({ request }) => {
    const response = await request.get('/api/site-info')
    expect(response.status()).toBe(200)
    expect(response.headers()['content-type']).toContain('application/json')

    // No release, tier, integration or commit: those say what is missing and which bugs apply.
    // The agency reads them from getSetupStatus() and `npm run config:check`.
    const body = (await response.json()) as SiteInfo
    expect(Object.keys(body).sort()).toEqual(['launch', 'schema'])
    expect(body.schema).toBe(2)
    // No launch block in the fixtures' profile: the site is live.
    expect(body).toEqual({ schema: 2, launch: { status: 'live', homepage: 'links' } })
  })

  test('is prerendered, so it is the same on every request', async ({ request }) => {
    const first = await request.get('/api/site-info')
    const second = await request.get('/api/site-info')
    expect(first.headers()['cache-control']).toContain('s-maxage=')
    expect(await second.text()).toBe(await first.text())
  })

  test('exposes no secret or env value', async ({ request }) => {
    const text = await (await request.get('/api/site-info')).text()
    const secrets = Object.entries(APP_ENV).filter(
      ([name, value]) => value.length >= 8 && !name.startsWith('NEXT_PUBLIC_'),
    )
    expect(secrets.length).toBeGreaterThan(5)
    for (const [name, value] of secrets) {
      expect(text, `${name} must not appear in the response`).not.toContain(value)
    }
  })
})
