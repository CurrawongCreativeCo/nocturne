import { describe, expect, it } from 'vitest'

import { buildLlmsTxt } from './llms-txt'
import {
  buildPrelaunchRobots,
  buildPrelaunchSitemap,
  publicIndexablePages,
  publicPageUrl,
  type IndexedPage,
} from './prelaunch-files'

const SITE = 'https://example.com.au'
const index: IndexedPage[] = [
  { slug: 'home', title: 'Home', _updatedAt: '2026-10-01T00:00:00Z', noIndex: false },
  { slug: 'about', title: 'About', _updatedAt: '2026-10-02T00:00:00Z', noIndex: false },
  {
    slug: 'links',
    title: 'Links',
    description: 'Where to find us.',
    _updatedAt: '2026-10-03T01:02:03Z',
    noIndex: false,
  },
  { slug: 'privacy', title: 'Privacy', noIndex: false },
  { slug: 'coming-soon', title: 'Coming soon', noIndex: true },
]

describe('publicIndexablePages', () => {
  it('keeps the visible, published, indexable pages, in the profile’s order', () => {
    expect(publicIndexablePages(index, ['links', 'privacy']).map(({ slug }) => slug)).toEqual([
      'links',
      'privacy',
    ])
    expect(publicIndexablePages(index, ['privacy', 'links']).map(({ slug }) => slug)).toEqual([
      'privacy',
      'links',
    ])
  })

  it('leaves out a slug that is not published, and a page marked noindex', () => {
    expect(publicIndexablePages(index, ['links', 'not-yet', 'coming-soon'])).toHaveLength(1)
  })

  it('never lists a page that is not visible', () => {
    const slugs = publicIndexablePages(index, ['links']).map(({ slug }) => slug)
    expect(slugs).not.toContain('about')
    expect(slugs).not.toContain('home')
  })
})

describe('buildPrelaunchSitemap', () => {
  it('lists the public pages at their real paths', () => {
    const xml = buildPrelaunchSitemap(publicIndexablePages(index, ['links', 'privacy']), SITE)
    expect(xml).toContain('<loc>https://example.com.au/links</loc>')
    expect(xml).toContain('<loc>https://example.com.au/privacy</loc>')
    expect(xml).not.toContain('<loc>https://example.com.au/</loc>')
    expect(xml).not.toContain('about')
    expect(xml).toContain('<lastmod>2026-10-03T01:02:03.000Z</lastmod>')
    expect(xml.startsWith('<?xml version="1.0" encoding="UTF-8"?>')).toBe(true)
  })

  it('leaves lastmod out when a page has no usable date', () => {
    const xml = buildPrelaunchSitemap(
      [{ slug: 'privacy' }, { slug: 'x', _updatedAt: 'nope' }],
      SITE,
    )
    expect(xml).not.toContain('lastmod')
  })

  it('is a valid, empty urlset when nothing is public (a noindex homepage)', () => {
    const xml = buildPrelaunchSitemap(publicIndexablePages(index, ['coming-soon']), SITE)
    expect(xml).toContain('<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">')
    expect(xml).toContain('</urlset>')
    expect(xml).not.toContain('<url>')
  })

  it('escapes the address', () => {
    expect(buildPrelaunchSitemap([{ slug: 'a' }], 'https://example.com/?a=1&b=2')).toContain(
      'https://example.com/a',
    )
    // Slugs are validated in Studio, but a document written through the API can hold anything.
    expect(buildPrelaunchSitemap([{ slug: "a&b'c" }], 'https://example.com')).toContain(
      '<loc>https://example.com/a&amp;b&apos;c</loc>',
    )
  })

  it('nests a path as written', () => {
    expect(publicPageUrl('legal/terms', SITE)).toBe('https://example.com.au/legal/terms')
  })
})

describe('buildPrelaunchRobots', () => {
  const options = { studioPath: '/studio', sitemapUrl: `${SITE}/sitemap.xml` }

  it('keeps today’s rules and points at /sitemap.xml', () => {
    expect(buildPrelaunchRobots({ ...options, blockedAiCrawlers: [] })).toBe(
      [
        'User-Agent: *',
        'Allow: /',
        'Disallow: /studio',
        'Disallow: /api/',
        '',
        `Sitemap: ${SITE}/sitemap.xml`,
        '',
      ].join('\n'),
    )
  })

  it('refuses the AI crawlers when Site settings turn them off', () => {
    const text = buildPrelaunchRobots({ ...options, blockedAiCrawlers: ['GPTBot', 'ClaudeBot'] })
    expect(text).toContain('User-Agent: GPTBot\nUser-Agent: ClaudeBot\nDisallow: /')
    expect(text.indexOf('User-Agent: *')).toBeLessThan(text.indexOf('GPTBot'))
  })
})

describe('the pre-launch llms.txt', () => {
  it('has the site name, description and only the public pages', () => {
    const pages = publicIndexablePages(index, ['links']).map(({ slug, title, description }) => ({
      title: title ?? slug,
      description,
      url: publicPageUrl(slug, SITE),
    }))
    const text = buildLlmsTxt({ title: 'Test Co', description: 'Ceramics.', pages })
    expect(text).toContain('# Test Co')
    expect(text).toContain('> Ceramics.')
    expect(text).toContain('- [Links](https://example.com.au/links): Where to find us.')
    expect(text).not.toContain('About')
    expect(text).not.toContain('## Blog')
  })
})
