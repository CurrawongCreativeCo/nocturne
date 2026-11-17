/** Hand-made snapshots and contexts for the rule tests: a clean page, changed one field at a time. */
import type { AuditContext, PageContent, PageSnapshot } from './types'

export const NOW = '2026-11-01T01:00:00.000Z'
export const ORIGIN = 'https://example.com.au'
export const URL = `${ORIGIN}/about`

/** `publicUrl` follows `url` unless a test sets it, as it does when the site is audited on its own domain. */
export function snapshot(overrides: Partial<PageSnapshot> = {}): PageSnapshot {
  const url = overrides.url ?? URL
  return {
    url,
    publicUrl: url,
    requestedUrl: url,
    status: 200,
    redirects: [],
    title: 'About us | Example',
    description: 'Who we are.',
    canonical: url,
    robotsMeta: '',
    xRobotsTag: '',
    noindex: { meta: false, header: false },
    headings: [
      { level: 1, text: 'About us' },
      { level: 2, text: 'Our team' },
    ],
    h1Count: 1,
    images: [{ src: '/team.jpg', alt: 'The team', decorative: false }],
    links: ['/', '/contact'],
    jsonLd: [],
    visibleText: 'About us Our team We have been here for years.',
    main: { found: true, words: 80, nosnippetWords: 0 },
    minimal: false,
    ...overrides,
  }
}

export function context(overrides: Partial<AuditContext> = {}): AuditContext {
  return {
    now: NOW,
    origin: ORIGIN,
    peers: [],
    robots: { groups: [{ agents: ['*'], allow: ['/'], disallow: ['/studio', '/api/'] }] },
    links: {},
    content: null,
    site: null,
    ...overrides,
  }
}

export const pageContent = (overrides: Partial<PageContent> = {}): PageContent => ({
  documentId: 'page-about',
  type: 'page',
  slug: 'about',
  seo: {},
  ...overrides,
})
