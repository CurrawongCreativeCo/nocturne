import { NextRequest } from 'next/server'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { proxy } from './proxy'

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
