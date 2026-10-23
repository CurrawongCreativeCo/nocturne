import { readFileSync } from 'node:fs'

import { expect } from '@playwright/test'

import { APP_ENV } from './constants'
import { test } from './fixtures/test'

test.skip(({ isMobile }) => isMobile, 'Desktop only')

interface SiteInfo {
  templateVersion: string
  tier: string
  enabled: Record<string, boolean>
  features: Record<string, boolean>
  launch: { status: string; homepage: string }
  commit: string | null
  builtAt: string
}

const stamp = JSON.parse(readFileSync('template-version.json', 'utf8')) as { version: string }

test.describe('/api/site-info', () => {
  test('reports the template version, the configured features, the commit and the build time', async ({
    request,
  }) => {
    const response = await request.get('/api/site-info')
    expect(response.status()).toBe(200)
    expect(response.headers()['content-type']).toContain('application/json')

    const body = (await response.json()) as SiteInfo
    expect(Object.keys(body).sort()).toEqual([
      'builtAt',
      'commit',
      'enabled',
      'features',
      'launch',
      'templateVersion',
      'tier',
    ])
    expect(body.templateVersion).toBe(stamp.version)
    // The site profile (site.profile.ts) ships with every feature on.
    expect(body.tier).toBe('custom')
    expect(Object.values(body.enabled).every(Boolean)).toBe(true)
    expect(Object.keys(body.enabled)).toContain('blog')
    // No launch block in the fixtures' profile: the site is live. Nothing else about it is reported.
    expect(body.launch).toEqual({ status: 'live', homepage: 'links' })
    // The test environment switches these on (constants.ts); Sentry has no DSN.
    expect(body.features).toEqual({
      forms: true,
      newsletter: true,
      pricing: true,
      members: true,
      analytics: true,
      sentry: false,
    })
    // Not on Vercel here, so there is no commit to report.
    expect(body.commit).toBeNull()
    expect(new Date(body.builtAt).toISOString()).toBe(body.builtAt)
    expect(Date.now() - new Date(body.builtAt).getTime()).toBeLessThan(24 * 60 * 60 * 1000)
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
