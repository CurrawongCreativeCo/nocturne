import { describe, expect, it } from 'vitest'

import { buildSnapshot, publicUrlOf } from './snapshot.mjs'
import { cleanPages, ORIGIN } from '../../src/lib/audit/fixtures.ts'

const html = (body, headers = {}) => ({
  url: `${ORIGIN}/about`,
  status: 200,
  contentType: 'text/html; charset=utf-8',
  headers,
  text: body,
})
const about = cleanPages().find((page) => page.path === '/about').html

describe('buildSnapshot', () => {
  it('reads a page with the launch-check readers', () => {
    const snapshot = buildSnapshot({
      requestedUrl: `${ORIGIN}/about`,
      chain: [{ url: `${ORIGIN}/about`, status: 200 }],
      final: html(about),
    })
    expect(snapshot).toMatchObject({
      url: `${ORIGIN}/about`,
      publicUrl: `${ORIGIN}/about`,
      status: 200,
      title: 'About us | Bondi Plumbing',
      canonical: `${ORIGIN}/about`,
      h1Count: 1,
      noindex: { meta: false, header: false },
      minimal: false,
      redirects: [],
    })
    expect(snapshot.jsonLd).toHaveLength(2)
    expect(snapshot.main.words).toBeGreaterThan(30)
    expect(snapshot.links).toEqual([
      '#main-content',
      '/',
      '/about',
      '/services/blocked-drains',
      '/contact',
      'tel:+61291234567',
      'mailto:hello@bondi-plumbing.example',
    ])
    expect(snapshot.visibleText).toContain('Bondi Plumbing')
  })

  it('keeps the redirect hops that led to the page', () => {
    const snapshot = buildSnapshot({
      requestedUrl: `${ORIGIN}/old`,
      chain: [
        { url: `${ORIGIN}/old`, status: 301, location: '/about' },
        { url: `${ORIGIN}/about`, status: 200 },
      ],
      final: html(about),
    })
    expect(snapshot.redirects).toEqual([{ url: `${ORIGIN}/old`, status: 301, location: '/about' }])
    expect(snapshot.requestedUrl).toBe(`${ORIGIN}/old`)
  })

  it('reads noindex from the meta tag and from the header', () => {
    const meta = buildSnapshot({
      requestedUrl: 'x',
      chain: [{ url: 'x', status: 200 }],
      final: html('<meta name="robots" content="noindex, follow"><main>hi</main>'),
    })
    expect(meta.noindex).toEqual({ meta: true, header: false })
    const header = buildSnapshot({
      requestedUrl: 'x',
      chain: [{ url: 'x', status: 200 }],
      final: html('<main>hi</main>', { 'x-robots-tag': 'none' }),
    })
    expect(header).toMatchObject({ noindex: { meta: false, header: true }, xRobotsTag: 'none' })
  })

  it('says a response that is not HTML is a problem, and reads nothing from it', () => {
    const snapshot = buildSnapshot({
      requestedUrl: 'x',
      chain: [{ url: 'x', status: 200 }],
      final: { ...html('{"a":1}'), contentType: 'application/json' },
    })
    expect(snapshot.error).toBe('The response is application/json, not HTML.')
    expect(snapshot.title).toBe('')
    expect(snapshot.visibleText).toBe('')
  })

  it('carries the network error and a failing status', () => {
    const failed = buildSnapshot({
      requestedUrl: 'x',
      chain: [{ url: 'x', status: 0 }],
      final: { url: 'x', status: 0, headers: {}, contentType: '', text: '', error: 'timeout' },
    })
    expect(failed).toMatchObject({ status: 0, error: 'timeout' })
    const missing = buildSnapshot({
      requestedUrl: 'x',
      chain: [{ url: 'x', status: 404 }],
      final: { ...html('<h1>Not found</h1>'), status: 404 },
    })
    expect(missing.title).toBe('')
  })

  it('puts the page on the production origin when asked', () => {
    expect(publicUrlOf('http://localhost:3100/about?x=1', 'https://example.com')).toBe(
      'https://example.com/about?x=1',
    )
    expect(publicUrlOf('http://localhost:3100/about')).toBe('http://localhost:3100/about')
    const snapshot = buildSnapshot({
      requestedUrl: 'x',
      chain: [{ url: 'x', status: 200 }],
      final: { ...html(about), url: 'http://localhost:3100/about' },
      publicOrigin: ORIGIN,
    })
    expect(snapshot.publicUrl).toBe(`${ORIGIN}/about`)
  })
})
