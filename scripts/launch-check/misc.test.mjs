import { describe, expect, it, vi } from 'vitest'

import { normaliseSiteUrl, parseArgs } from './args.mjs'
import { onOrigin, sitemapLocations } from './discover.mjs'
import { followRedirects, request } from './net.mjs'
import { mapLimit } from './pool.mjs'
import { evaluatePsi, psiEndpoint } from './psi.mjs'
import { fail, formatSummary, formatTable, listSome, pass, summarise, warn } from './result.mjs'
import { dateFolder, pageStem, screenshotName, SCREEN_WIDTHS } from './screens.mjs'

describe('args', () => {
  it('normalises a site URL to its origin', () => {
    expect(normaliseSiteUrl('https://example.com/')).toBe('https://example.com')
    expect(normaliseSiteUrl('example.com/about?x=1')).toBe('https://example.com')
    expect(normaliseSiteUrl('http://localhost:3000')).toBe('http://localhost:3000')
    expect(() => normaliseSiteUrl('')).toThrow('Pass the site URL')
    expect(() => normaliseSiteUrl('ftp://example.com')).toThrow("isn't a web address")
  })
  it('parses flags and rejects unknown ones', () => {
    expect(parseArgs(['https://x.com', '--json'])).toMatchObject({
      url: 'https://x.com',
      json: true,
    })
    expect(parseArgs(['--max-urls=5', 'x.com']).maxUrls).toBe(5)
    expect(parseArgs(['--help']).help).toBe(true)
    expect(() => parseArgs(['--nope'])).toThrow('Unknown option')
    expect(() => parseArgs(['a.com', 'b.com'])).toThrow('extra argument')
    expect(() => parseArgs(['--max-urls=0'])).toThrow('whole number')
  })
})

describe('result formatting', () => {
  const results = [
    pass('HTTP', 'a', 'Home page returns 200'),
    warn('SEO', 'b', 'Descriptions are unique', 'Missing on /about.', 'Add one in Studio.'),
    fail('Sanity', 'c', 'Dataset is private', 'It is public.', 'Make it private.'),
  ]
  it('summarises and only fails on failures', () => {
    expect(summarise(results)).toEqual({ pass: 1, warn: 1, fail: 1, ok: false })
    expect(summarise(results.slice(0, 2)).ok).toBe(true)
    expect(formatSummary(summarise(results))).toBe(
      'Not ready to go live: 1 passed, 1 to review, 1 failed.',
    )
  })
  it('prints a table with the fix under each non-pass line', () => {
    const table = formatTable(results)
    expect(table).toContain('✓ PASS  HTTP    Home page returns 200')
    expect(table).toContain('! WARN  SEO     Descriptions are unique')
    expect(table).toContain('Fix: Add one in Studio.')
    expect(table).toContain('Fix: Make it private.')
    expect(table).not.toContain('\u001b[')
    expect(formatTable(results, { colour: true })).toContain('\u001b[31m')
  })
  it('lists a few items and counts the rest', () => {
    expect(listSome(['a', 'b'], 3)).toBe('a, b')
    expect(listSome(['a', 'b', 'c', 'd'], 2)).toBe('a, b and 2 more')
  })
})

describe('psi', () => {
  const scores = (performance, accessibility = 1, seo = 1) => ({
    lighthouseResult: {
      categories: {
        performance: { score: performance },
        accessibility: { score: accessibility },
        'best-practices': { score: 1 },
        seo: { score: seo },
      },
    },
  })
  it('passes scores at or above 0.9 and fails below', () => {
    expect(evaluatePsi({ strategy: 'mobile', status: 200, body: scores(0.9) })[0].status).toBe(
      'pass',
    )
    const [low] = evaluatePsi({ strategy: 'mobile', status: 200, body: scores(0.72, 1, 0.8) })
    expect(low.status).toBe('fail')
    expect(low.detail).toContain('Performance 72')
    expect(low.detail).toContain('performance, seo')
  })
  it('warns when PSI gives no scores, without echoing the key', () => {
    const [result] = evaluatePsi({
      strategy: 'desktop',
      status: 400,
      body: { error: { message: 'API key not valid.' } },
    })
    expect(result.status).toBe('warn')
    expect(result.detail).toContain('API key not valid.')
  })
  it('builds the endpoint with all four categories', () => {
    const url = new URL(psiEndpoint('https://example.com/', 'mobile', 'K'))
    expect(url.searchParams.getAll('category')).toHaveLength(4)
    expect(url.searchParams.get('strategy')).toBe('mobile')
  })
})

describe('screens', () => {
  it('names files from the path and width', () => {
    expect(pageStem('https://example.com/')).toBe('home')
    expect(pageStem('https://example.com/blog/My-Post/')).toBe('blog-my-post')
    expect(pageStem('https://example.com/search?q=a b')).toBe('search-q-a-b')
    expect(screenshotName('https://example.com/about', 375)).toBe('about-375.png')
    expect(SCREEN_WIDTHS).toEqual([375, 768, 1280, 1920])
  })
  it('uses the local date for the folder', () => {
    expect(dateFolder(new Date(2026, 9, 4))).toBe('2026-10-04')
  })
})

describe('discover', () => {
  it('uses robots.txt sitemaps, else /sitemap.xml', () => {
    expect(
      sitemapLocations(
        'Sitemap: https://x.com/s/0.xml\nSitemap: https://x.com/s/1.xml',
        'https://x.com',
      ),
    ).toEqual(['https://x.com/s/0.xml', 'https://x.com/s/1.xml'])
    expect(sitemapLocations('', 'https://x.com')).toEqual(['https://x.com/sitemap.xml'])
  })
  it('moves a URL onto the site origin', () => {
    expect(onOrigin('http://localhost:3000/a/b?c=1', 'https://x.com')).toBe('https://x.com/a/b?c=1')
  })
})

describe('mapLimit', () => {
  it('keeps order and never exceeds the limit', async () => {
    let active = 0
    let peak = 0
    const out = await mapLimit([1, 2, 3, 4, 5, 6], 2, async (n) => {
      active += 1
      peak = Math.max(peak, active)
      await new Promise((resolve) => setTimeout(resolve, 5))
      active -= 1
      return n * 2
    })
    expect(out).toEqual([2, 4, 6, 8, 10, 12])
    expect(peak).toBe(2)
    expect(await mapLimit([], 3, () => 1)).toEqual([])
  })
})

describe('net (with fetch replaced)', () => {
  const reply = (status, headers = {}, text = '') => ({
    status,
    url: '',
    headers: new Headers(headers),
    text: () => Promise.resolve(text),
    body: { cancel: vi.fn() },
  })
  it('reads text bodies and lower-cases header names', async () => {
    const fetchImpl = vi
      .fn()
      .mockResolvedValue(reply(200, { 'Content-Type': 'text/html' }, '<h1>x</h1>'))
    const response = await request('https://x.com/', { fetchImpl })
    expect(response).toMatchObject({ status: 200, contentType: 'text/html', text: '<h1>x</h1>' })
    expect(fetchImpl.mock.calls[0][1].redirect).toBe('manual')
  })
  it('discards image bodies and reports network errors without throwing', async () => {
    const image = reply(200, { 'content-type': 'image/png' })
    const result = await request('https://x.com/a.png', {
      fetchImpl: vi.fn().mockResolvedValue(image),
    })
    expect(result.text).toBe('')
    expect(image.body.cancel).toHaveBeenCalled()
    const broken = await request('https://x.com/', {
      fetchImpl: vi
        .fn()
        .mockRejectedValue(new TypeError('fetch failed', { cause: new Error('ENOTFOUND x.com') })),
    })
    expect(broken).toMatchObject({ status: 0, error: 'ENOTFOUND x.com' })
  })
  it('follows redirects hop by hop and records the chain', async () => {
    const fetchImpl = vi
      .fn()
      .mockResolvedValueOnce(reply(301, { location: 'https://www.x.com/' }))
      .mockResolvedValueOnce(reply(308, { location: '/home' }))
      .mockResolvedValueOnce(reply(200, { 'content-type': 'text/html' }, 'ok'))
    const { chain, final } = await followRedirects('http://x.com/', { fetchImpl })
    expect(chain.map((hop) => hop.url)).toEqual([
      'http://x.com/',
      'https://www.x.com/',
      'https://www.x.com/home',
    ])
    expect(final).toMatchObject({ status: 200, url: 'https://www.x.com/home', text: 'ok' })
  })
  it('stops after the maximum number of hops', async () => {
    const fetchImpl = vi
      .fn()
      .mockImplementation(() => Promise.resolve(reply(302, { location: '/again' })))
    const { chain } = await followRedirects('https://x.com/', { fetchImpl, max: 3 })
    expect(chain).toHaveLength(4)
  })
})
