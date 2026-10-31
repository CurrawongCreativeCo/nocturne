import { NextRequest } from 'next/server'
import { afterEach, describe, expect, it, vi } from 'vitest'

import type * as Profile from '@/config/profile'

import { config, proxy } from './proxy'

// proxy.ts reaches a server-only module (the preview pass), which throws outside a server bundle.
vi.mock('server-only', () => ({}))

// These tests are about a live site, so they say so instead of inheriting the real profile's launch
// status (a client site is pre-launch until it launches).
vi.mock('@/config/profile', async (importOriginal) => {
  const original = await importOriginal<typeof Profile>()
  return {
    ...original,
    siteProfile: {
      ...original.siteProfile,
      launch: { status: 'live', homepage: 'links', publicPages: [], unknownPaths: 'not-found' },
    },
  }
})

const TOKEN = 'a-long-enough-token-1234'

const request = (path: string, cookie?: string) =>
  new NextRequest(`https://preview.example.com${path}`, {
    headers: cookie ? { cookie } : {},
  })

function preview() {
  vi.stubEnv('NODE_ENV', 'production')
  vi.stubEnv('VERCEL_ENV', 'preview')
  vi.stubEnv('STYLEGUIDE_PREVIEW_TOKEN', TOKEN)
  vi.stubEnv('E2E_GALLERY', '')
}

afterEach(() => {
  vi.unstubAllEnvs()
})

describe('proxy: the style guide on a preview deployment', () => {
  it('answers a missing page when there is no token', async () => {
    preview()
    const response = await proxy(request('/section-gallery'))
    expect(response.headers.get('x-middleware-rewrite')).toBe(
      'https://preview.example.com/section-gallery/not-found',
    )
    expect(response.headers.get('x-robots-tag')).toContain('noindex')
    expect(response.headers.get('cache-control')).toContain('no-store')
  })

  it('answers a missing page for a wrong or partial token, on the tokens page too', async () => {
    preview()
    for (const path of [
      '/section-gallery?preview=nope',
      `/section-gallery?preview=${TOKEN.slice(0, -1)}`,
      '/section-gallery/tokens',
    ]) {
      const response = await proxy(request(path))
      expect(response.headers.get('x-middleware-rewrite'), path).toContain('/not-found')
    }
  })

  it('lets the token through and remembers it in a cookie for the links', async () => {
    preview()
    const response = await proxy(request(`/section-gallery?preview=${TOKEN}`))
    expect(response.headers.get('x-middleware-rewrite')).toBeNull()
    expect(response.headers.get('x-robots-tag')).toContain('noindex')
    const cookie = response.headers.get('set-cookie') ?? ''
    expect(cookie).toContain(`styleguide-preview=${TOKEN}`)
    expect(cookie).toContain('HttpOnly')
    expect(cookie).toContain('Path=/section-gallery')
  })

  it('accepts the cookie on later requests', async () => {
    preview()
    const response = await proxy(request('/section-gallery/tokens', `styleguide-preview=${TOKEN}`))
    expect(response.headers.get('x-middleware-rewrite')).toBeNull()
    expect(response.headers.get('set-cookie')).toBeNull()
  })

  it('does not touch other pages', async () => {
    preview()
    const response = await proxy(request('/section-gallery-x'))
    expect(response.headers.get('x-robots-tag')).toBeNull()
  })

  it('marks the style guide noindex wherever it is open', async () => {
    vi.stubEnv('NODE_ENV', 'development')
    const response = await proxy(request('/section-gallery/tokens'))
    expect(response.headers.get('x-robots-tag')).toBe('noindex, nofollow')
    expect(response.headers.get('cache-control')).toBeNull()
  })

  it('leaves production to the page, which answers 404', async () => {
    preview()
    vi.stubEnv('VERCEL_ENV', 'production')
    const response = await proxy(request(`/section-gallery?preview=${TOKEN}`))
    expect(response.headers.get('set-cookie')).toBeNull()
    expect(response.headers.get('x-middleware-rewrite')).toBeNull()
    expect(response.headers.get('cache-control')).toBeNull()
  })
})

describe('the proxy matcher', () => {
  // Next.js needs literals in `config.matcher`. A path is covered when an entry names it exactly or
  // is a `/prefix/:path*` entry for it.
  const covers = (path: string) =>
    config.matcher.some((entry) =>
      entry.endsWith('/:path*')
        ? path === entry.slice(0, -'/:path*'.length) ||
          path.startsWith(`${entry.slice(0, -'/:path*'.length)}/`)
        : entry === path,
    )

  it.each([
    '/sitemap.xml',
    '/sitemap/0.xml',
    '/sitemap/1.xml',
    '/robots.txt',
    '/llms.txt',
    '/feed.xml',
    '/api/search',
    '/api/og/links',
    '/api/og',
    '/api/events/feed',
    '/api/events/open-day/ics',
  ])('covers %s, so the pre-launch gate sees it', (path) => {
    expect(covers(path)).toBe(true)
  })

  it('still skips Studio, the other API routes and Next.js internals for pages', () => {
    const pattern = new RegExp(`^${config.matcher[0] ?? ''}$`)
    for (const path of ['/studio', '/api/revalidate', '/_next/static/x.js', '/logo.png']) {
      expect(pattern.test(path), path).toBe(false)
    }
    expect(pattern.test('/about')).toBe(true)
  })
})

describe('machine-readable files on a live site', () => {
  it('go straight through: no A/B rewrite, no redirect', async () => {
    for (const path of ['/sitemap.xml', '/robots.txt', '/llms.txt', '/feed.xml', '/api/search']) {
      const response = await proxy(request(path))
      expect(response.headers.get('x-middleware-rewrite'), path).toBeNull()
      expect(response.headers.get('location'), path).toBeNull()
      expect(response.headers.get('x-middleware-next'), path).toBe('1')
    }
  })
})
