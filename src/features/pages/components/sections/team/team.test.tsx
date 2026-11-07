import { createElement, type ComponentType } from 'react'
import { describe, expect, it, vi } from 'vitest'

import { parseHtml } from '@/lib/design/capability-harness'

import {
  gallerySeed,
  projectSections,
  renderSections,
  type RawSection,
} from '../../section-renderer.fixtures'

vi.hoisted(() => {
  vi.useFakeTimers({ toFake: ['Date'] })
  vi.setSystemTime(new Date('2026-11-06T09:00:00+11:00'))
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

const LAYOUTS = ['grid', 'slider', 'list'] as const

async function draw(layout: (typeof LAYOUTS)[number], extra: Record<string, unknown> = {}) {
  const seed = await gallerySeed('team', layout)
  const raw = { ...seed, ...extra } as RawSection
  return parseHtml(await renderSections(await projectSections([raw]), { belowHeading: true }))
}

const cards = (document: Document) => [...document.querySelectorAll('div.relative.rounded-card')]

describe.each(LAYOUTS)('Team on the %s layout', (layout) => {
  it('draws every member as a card or row with the surface it always had', async () => {
    const found = cards(await draw(layout))
    expect(found.length).toBeGreaterThan(1)
    for (const card of found) {
      expect(card.className).toContain(
        'relative rounded-card bg-surface shadow-card ring-1 ring-line',
      )
    }
  })

  it('applies one Cards box to every card, in each role', async () => {
    const document = await draw(layout, {
      cardDesign: {
        border: 'thick',
        title: { size: 'large' },
        meta: { weight: 'semibold' },
        body: { size: 'small' },
      },
    })
    for (const card of cards(document)) {
      expect(card.className).toContain('ring-3')
      expect(card.querySelector('[data-text-role="title"]')?.className).toContain('text-h3')
      expect(card.querySelector('[data-text-role="meta"]')?.className).toContain('font-semibold')
      expect(card.querySelector('[data-text-role="body"]')?.className).toContain('text-small')
    }
  })

  it('draws a card mark inside each card, behind its text', async () => {
    const document = await draw(layout, { cardDesign: { mark: { kind: 'icon', icon: 'heart' } } })
    for (const card of cards(document)) {
      expect(card.className).toContain('isolate')
      expect(card.firstElementChild?.getAttribute('data-decorative-mark')).toBe('card')
    }
  })

  it('draws the header’s eyebrow, title and intro in their own roles inside a div', async () => {
    const document = await draw(layout, { eyebrow: 'Our people', text: 'An intro.' })
    const header = document.querySelector('section > div > div')
    expect(header?.tagName).toBe('DIV')
    expect(header?.className).toContain('mb-12 max-w-measure-narrow')
    expect(
      ['eyebrow', 'heading', 'intro'].map(
        (role) => header?.querySelector(`[data-text-role="${role}"]`)?.textContent,
      ),
    ).toEqual(['Our people', header?.querySelector('h2')?.textContent, 'An intro.'])
  })
})

describe('Team’s header', () => {
  it('spaces the intro under a title and draws it as lead text (the old class had no space)', async () => {
    const document = await draw('grid', { title: 'Meet the team', text: 'An intro.' })
    const classes = document.querySelector('[data-text-role="intro"]')?.className.split(' ')
    expect(classes).toContain('mt-4')
    expect(classes).toContain('text-lead')
    expect(classes).not.toContain('mt-4text-lead')
  })

  it('draws an intro with no title as the lead text it is', async () => {
    const document = await draw('grid', { title: null, heading: null, text: 'An intro.' })
    expect(document.querySelector('[data-text-role="intro"]')?.className).toBe(
      'text-lead text-pretty text-ink-muted',
    )
  })

  it('draws nothing for a header with no title, intro or eyebrow', async () => {
    const document = await draw('grid', { title: null, heading: null, text: null })
    expect(document.querySelector('[data-text-role]')?.getAttribute('data-text-role')).not.toBe(
      'eyebrow',
    )
    expect(document.querySelector('h2')?.getAttribute('data-text-role')).not.toBe('heading')
  })
})
