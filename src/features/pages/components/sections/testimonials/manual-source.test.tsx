import { createElement, type ComponentType } from 'react'
import { describe, expect, it, vi } from 'vitest'

import { parseHtml } from '@/lib/design/capability-harness'

import type * as QuoteCardModule from './quote-card'
import {
  gallerySeed,
  projectSections,
  renderSections,
  type RawSection,
} from '../../section-renderer.fixtures'

/**
 * The content source `testimonials.manual` (task 275; src/lib/design/capability-evidence.ts): quotes
 * written in Studio, stored on the section and drawn by QuoteCard. These are the source's own tests: they
 * check what it draws from what is stored, what it draws nothing without, that no source label, rating or
 * review markup is invented for it (Google reviews are a separate source, task 277), and that cutting
 * QuoteCard removes what it draws. They run through SectionRenderer with the gallery fixtures.
 */

vi.hoisted(() => {
  vi.useFakeTimers({ toFake: ['Date'] })
  vi.setSystemTime(new Date('2026-11-06T09:00:00+11:00'))
})

// QuoteCard can be cut off, to show what the source draws comes through it and nothing else.
const quoteCard = vi.hoisted(() => ({ disconnected: false }))
vi.mock('./quote-card', async (load) => {
  const actual = await load<typeof QuoteCardModule>()
  return {
    ...actual,
    QuoteCard: (props: Parameters<typeof actual.QuoteCard>[0]) =>
      quoteCard.disconnected ? null : createElement(actual.QuoteCard, props),
  }
})

vi.mock('next-sanity/image', () => ({
  Image: (props: Record<string, unknown>) =>
    createElement('img', { src: props.src, className: props.className, alt: '' }),
}))
vi.mock('next/dynamic', async () => {
  const { lazy } = await import('react')
  return {
    default: (load: () => Promise<unknown>) =>
      lazy(async () => {
        const loaded = (await load()) as { default?: ComponentType } | undefined
        return { default: (loaded?.default ?? loaded) as ComponentType }
      }),
  }
})
vi.mock('next/server', () => ({ connection: () => Promise.resolve() }))
vi.mock('server-only', () => ({}))
vi.mock('@/config/env', () => ({
  projectId: 'e2etest1',
  dataset: 'production',
  apiVersion: '2026-10-01',
  siteLanguage: 'en',
  studioUrl: '/studio',
}))
vi.mock('@/lib/sanity/site-design', () => ({
  getSiteDesign: () => Promise.resolve({ colours: undefined, gradients: [] }),
}))

const LAYOUTS = ['grid', 'slider'] as const

const item = (key: string, quote: string, name: string, role?: string) => ({
  _key: key,
  _type: 'testimonial',
  quote,
  name,
  ...(role ? { role } : {}),
})

async function draw(layout: (typeof LAYOUTS)[number], items: unknown[]) {
  const seed = await gallerySeed('testimonials', layout)
  const section: RawSection = { ...seed, title: 'Kind words', items }
  return renderSections(await projectSections([section]), { belowHeading: true })
}

const cards = (html: string) => [...parseHtml(html).querySelectorAll('figure')]

describe('testimonials.manual: quotes written in Studio', () => {
  describe.each(LAYOUTS)('on the %s layout', (layout) => {
    const stored = [
      item('q1', 'Quote one.', 'Alex Example', 'Owner, Example Co'),
      item('q2', 'Quote two.', 'Sam Sample'),
    ]

    it('draws each stored quote, name and role in its own card', async () => {
      const found = cards(await draw(layout, stored))
      expect(found).toHaveLength(2)
      expect(found[0]?.querySelector('blockquote')?.textContent).toBe('“Quote one.”')
      expect(found[0]?.querySelector('figcaption')?.textContent).toContain('Alex Example')
      expect(found[0]?.querySelector('figcaption')?.textContent).toContain('Owner, Example Co')
      expect(found[1]?.querySelector('blockquote')?.textContent).toBe('“Quote two.”')
      expect(found[1]?.querySelector('figcaption')?.textContent).toContain('Sam Sample')
      // No role stored, none drawn.
      expect(found[1]?.querySelector('figcaption')?.textContent).not.toContain('Owner')
    })

    it('draws only what was stored: changing one quote changes only that card', async () => {
      const before = cards(await draw(layout, stored)).map((card) => card.outerHTML)
      const after = cards(
        await draw(layout, [
          item('q1', 'A different quote.', 'Alex Example', 'Owner, Example Co'),
          stored[1],
        ]),
      ).map((card) => card.outerHTML)
      expect(after[1]).toBe(before[1])
      expect(after[0]).not.toBe(before[0])
      expect(after[0]).toContain('A different quote.')
      expect(after[0]).not.toContain('Quote one.')
    })

    it('draws no source label, rating or review markup', async () => {
      const html = await draw(layout, stored)
      const lower = html.toLowerCase()
      // Google reviews are their own source (task 277); a written quote is never labelled as one.
      expect(lower).not.toContain('google')
      for (const invented of ['aggregaterating', 'ratingvalue', 'reviewrating', 'itemtype']) {
        expect(lower).not.toContain(invented)
      }
      expect(parseHtml(html).querySelectorAll('script[type="application/ld+json"]')).toHaveLength(0)
    })

    it('draws no cards without items', async () => {
      expect(cards(await draw(layout, []))).toHaveLength(0)
    })

    it('draws nothing of its own once the quote card is disconnected', async () => {
      quoteCard.disconnected = true
      try {
        const html = await draw(layout, stored)
        expect(cards(html)).toHaveLength(0)
        expect(html).not.toContain('Quote one.')
        expect(html).not.toContain('Alex Example')
      } finally {
        quoteCard.disconnected = false
      }
      // And the same stored items draw again once it is connected.
      expect(cards(await draw(layout, stored))).toHaveLength(2)
    })
  })
})
