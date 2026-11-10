import { createElement, type ComponentType } from 'react'
import { describe, expect, it, vi } from 'vitest'

import { parseHtml } from '@/lib/design/capability-harness'

import {
  gallerySeed,
  projectSections,
  renderSections,
  type RawSection,
} from '../section-renderer.fixtures'

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

const LAYOUTS = ['overlay', 'split', 'editorial', 'full-bleed'] as const
const LINE = { _type: 'decorativeDivider', style: 'line' }

/** A hero at a layout with a plain title, an intro and the seed's buttons, and whatever else is stored. */
async function draw(
  layout: string,
  extra: Record<string, unknown> = {},
  options: { greeting?: boolean } = {},
) {
  const seed = await gallerySeed('hero', 'overlay')
  const raw = {
    ...seed,
    variant: layout,
    title: 'Welcome',
    heading: null,
    eyebrow: null,
    eyebrowLabels: null,
    backgroundImage: null,
    secondaryImage: null,
    supporting: null,
    partMotion: null,
    description: 'A short introduction.',
    ...extra,
  } as RawSection
  const greeting = options.greeting
    ? createElement('p', { 'data-greeting': '' }, 'Welcome back!')
    : undefined
  const html = await renderSections(await projectSections([raw]), {
    belowHeading: true,
    ...(greeting ? { greeting } : {}),
  })
  return { html, document: parseHtml(html) }
}

/** DOCUMENT_POSITION_FOLLOWING: there is no `Node` global in this environment. */
const FOLLOWING = 4
/** True when `a` comes before `b` in the document. */
const before = (a: Element | null, b: Element | null) =>
  Boolean(a && b && a.compareDocumentPosition(b) & FOLLOWING)

describe('Hero divider (task 151)', () => {
  it('draws exactly as before while nothing is chosen, in every layout', async () => {
    for (const layout of LAYOUTS) {
      const base = await draw(layout)
      expect(base.html, layout).not.toContain('data-decorative-divider')
      for (const divider of [null, {}, { _type: 'decorativeDivider' }, { style: 'none' }]) {
        const same = await draw(layout, { dividerDesign: divider })
        expect(same.html, `${layout} ${JSON.stringify(divider)}`).toBe(base.html)
      }
    }
  })

  it.each(LAYOUTS)('%s: sits between the title and the intro', async (layout) => {
    const { document } = await draw(layout, { dividerDesign: LINE })
    const dividers = document.querySelectorAll('[data-decorative-divider]')
    expect(dividers).toHaveLength(1)
    const rule = dividers[0] ?? null
    expect(before(document.querySelector('h2'), rule)).toBe(true)
    expect(before(rule, document.querySelector('section p'))).toBe(true)
  })

  it('is drawn with buttons and no intro, and not with neither', async () => {
    const buttons = await draw('overlay', { dividerDesign: LINE, description: null })
    expect(buttons.document.querySelectorAll('a').length).toBeGreaterThan(0)
    expect(buttons.document.querySelectorAll('[data-decorative-divider]')).toHaveLength(1)

    const bare = await draw('overlay', { dividerDesign: LINE, description: null, ctas: null })
    expect(bare.html).not.toContain('data-decorative-divider')
    const same = await draw('overlay', { description: null, ctas: null })
    expect(bare.html).toBe(same.html)
  })

  it('is not drawn with no title, however much follows', async () => {
    for (const layout of LAYOUTS) {
      for (const title of ['', '   ']) {
        const { html } = await draw(layout, { dividerDesign: LINE, title, heading: null })
        expect(html, `${layout} "${title}"`).not.toContain('data-decorative-divider')
      }
    }
  })

  it('goes before the greeting, which stays between it and the intro', async () => {
    const { document } = await draw(
      'overlay',
      { dividerDesign: LINE, showGreeting: true },
      { greeting: true },
    )
    const rule = document.querySelector('[data-decorative-divider]')
    const greeting = document.querySelector('[data-greeting]')
    expect(greeting).not.toBeNull()
    expect(before(document.querySelector('h2'), rule)).toBe(true)
    expect(before(rule, greeting)).toBe(true)
    expect(before(greeting, document.querySelector('section p:not([data-greeting])'))).toBe(true)
  })

  it('keeps every original margin while nothing is chosen', async () => {
    const { document } = await draw('overlay', { showGreeting: true }, { greeting: true })
    const intro = document.querySelector('section p:not([data-greeting])')
    expect(intro?.className).toContain('mt-6')
    expect(intro?.className).not.toContain('mt-0')
    expect(document.querySelector('[data-greeting]')?.parentElement?.className).not.toContain(
      '[&>*]:mt-0!',
    )
    expect(document.querySelector('a')?.closest('[class*="mt-10"]')).not.toBeNull()
  })

  it('gives the divider the space: what follows it drops its top margin', async () => {
    for (const layout of LAYOUTS) {
      const withIntro = await draw(layout, { dividerDesign: LINE })
      const intro = withIntro.document.querySelector('section p')
      expect(intro?.className, layout).toContain('mt-0')
      expect(intro?.className, layout).not.toContain('mt-6')
      // The buttons keep their gap below the intro.
      expect(
        withIntro.document.querySelector('a')?.closest('[class*="mt-10"]'),
        layout,
      ).not.toBeNull()

      // With no intro the buttons follow the divider, so they take none.
      const buttons = await draw(layout, { dividerDesign: LINE, description: null })
      expect(buttons.document.querySelector('a')?.closest('[class*="mt-10"]'), layout).toBeNull()
      expect(buttons.document.querySelector('a')?.closest('[class*="mt-0"]'), layout).not.toBeNull()
    }
  })

  it('draws the greeting with no top margin and 24px below it, and only under a divider', async () => {
    const { document } = await draw(
      'overlay',
      { dividerDesign: LINE, showGreeting: true },
      { greeting: true },
    )
    const wrapper = document.querySelector('[data-greeting]')?.parentElement
    expect(wrapper?.className).toContain('[&>*]:mt-0!')
    expect(wrapper?.className).toContain('[&>*]:mb-6!')
    // The intro below it has no top margin either, so the greeting's bottom margin is the only gap.
    expect(document.querySelector('section p:not([data-greeting])')?.className).toContain('mt-0')
  })

  it('is drawn whether or not the greeting is on', async () => {
    const off = await draw(
      'split',
      { dividerDesign: LINE, showGreeting: false },
      { greeting: true },
    )
    expect(off.html).not.toContain('data-greeting')
    expect(off.document.querySelectorAll('[data-decorative-divider]')).toHaveLength(1)
  })

  it('centres in Full background and starts in the layouts that start', async () => {
    const centred = await draw('overlay', { dividerDesign: LINE })
    expect(centred.document.querySelector('[data-decorative-divider]')?.className).toContain(
      'mx-auto',
    )
    for (const layout of ['split', 'editorial', 'full-bleed']) {
      const { document } = await draw(layout, { dividerDesign: LINE })
      expect(document.querySelector('[data-decorative-divider]')?.className, layout).not.toContain(
        'mx-auto',
      )
    }
  })

  it('in Image with panel sits inside the panel, so it takes the panel’s colours', async () => {
    const { document } = await draw('full-bleed', { dividerDesign: LINE })
    const rule = document.querySelector('[data-decorative-divider]')
    const panel = rule?.closest('.bg-surface')
    expect(panel).not.toBeNull()
    expect(panel?.contains(document.querySelector('h2'))).toBe(true)
    // The tone's tokens come from the section, and the divider's line is `text-line-strong`.
    expect(rule?.className).toContain('text-line-strong')
    expect(rule?.closest('[data-tone]')).not.toBeNull()
  })

  it('keeps a chosen line colour in every layout', async () => {
    for (const layout of LAYOUTS) {
      const { document } = await draw(layout, {
        dividerDesign: { ...LINE, lineColour: { colour: 'custom', hex: '#aa5500' } },
      })
      const rule = document.querySelector('[data-decorative-divider]')
      expect(rule?.getAttribute('style'), layout).toContain('color')
      expect(rule?.className, layout).not.toContain('text-line-strong')
    }
  })
})
