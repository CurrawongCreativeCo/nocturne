import { describe, expect, it } from 'vitest'

import { buildFeed, escapeXml, type FeedItem } from './feed'

const item = (overrides: Partial<FeedItem> = {}): FeedItem => ({
  title: 'Hello',
  url: 'https://example.com/blog/hello',
  description: 'A summary.',
  publishedAt: new Date('2026-10-01T09:30:00Z'),
  categories: [],
  ...overrides,
})

const feed = (items: FeedItem[]) =>
  buildFeed({
    title: 'Test Co',
    description: 'News from Test Co',
    language: 'en',
    siteUrl: 'https://example.com/',
    feedUrl: 'https://example.com/feed.xml',
    items,
  })

describe('escapeXml', () => {
  it('escapes the five reserved characters', () => {
    expect(escapeXml(`<a href="x">Tom & 'Jerry'</a>`)).toBe(
      '&lt;a href=&quot;x&quot;&gt;Tom &amp; &apos;Jerry&apos;&lt;/a&gt;',
    )
  })

  it('escapes the ampersand first, so entities are not doubled', () => {
    expect(escapeXml('&lt;')).toBe('&amp;lt;')
  })

  it('drops control characters XML cannot hold, but keeps tabs and newlines', () => {
    expect(escapeXml('a\u0000b\u000Bc\u001Fd\te\nf')).toBe('abcd\te\nf')
  })
})

describe('buildFeed', () => {
  it('is an RSS 2.0 document with the channel details', () => {
    const xml = feed([item()])
    expect(xml.startsWith('<?xml version="1.0" encoding="UTF-8"?>\n<rss version="2.0"')).toBe(true)
    expect(xml).toContain('<title>Test Co</title>')
    expect(xml).toContain('<link>https://example.com/</link>')
    expect(xml).toContain('<language>en</language>')
    expect(xml).toContain(
      '<atom:link href="https://example.com/feed.xml" rel="self" type="application/rss+xml"/>',
    )
  })

  it('writes each item with a permalink guid and an RFC 822 date', () => {
    const xml = feed([item({ author: 'Ann', categories: ['News', 'R&D'] })])
    expect(xml).toContain('<guid isPermaLink="true">https://example.com/blog/hello</guid>')
    expect(xml).toContain('<pubDate>Thu, 01 Oct 2026 09:30:00 GMT</pubDate>')
    expect(xml).toContain('<dc:creator>Ann</dc:creator>')
    expect(xml).toContain('<category>News</category>')
    expect(xml).toContain('<category>R&amp;D</category>')
  })

  it('escapes editor text', () => {
    const xml = feed([item({ title: 'Q&A <live>' })])
    expect(xml).toContain('<title>Q&amp;A &lt;live&gt;</title>')
    expect(xml).not.toContain('<live>')
  })

  it('dates the feed by its newest post, not the clock', () => {
    const xml = feed([
      item({ publishedAt: new Date('2026-01-01T00:00:00Z') }),
      item({ publishedAt: new Date('2026-06-01T00:00:00Z') }),
    ])
    expect(xml).toContain('<lastBuildDate>Mon, 01 Jun 2026 00:00:00 GMT</lastBuildDate>')
  })

  it('is still a valid channel with no posts', () => {
    const xml = feed([])
    expect(xml).not.toContain('<item>')
    expect(xml).not.toContain('lastBuildDate')
    expect(xml).toContain('</channel>')
  })
})
