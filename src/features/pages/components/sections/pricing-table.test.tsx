import { createElement, type ComponentType } from 'react'
import { describe, expect, it, vi } from 'vitest'

import { parseHtml } from '@/lib/design/capability-harness'

import {
  gallerySeed,
  projectSections,
  renderSections,
  type RawSection,
} from '../section-renderer.fixtures'

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

const plan = (key: string, extra: Record<string, unknown> = {}) => ({
  _key: key,
  _type: 'plan',
  price: { _type: 'reference', _ref: 'stripePrice-price_Starter1' },
  features: ['One project'],
  ...extra,
})

async function draw(plans: unknown[], extra: Record<string, unknown> = {}) {
  const seed = await gallerySeed('pricingTable', null)
  const raw = { ...seed, plans, ...extra } as RawSection
  return parseHtml(await renderSections(await projectSections([raw]), { belowHeading: true }))
}

const cards = (document: Document) => [...document.querySelectorAll('ul.grid > li')]
const roleOf = (card: Element | undefined, role: string) =>
  card?.querySelector(`[data-text-role="${role}"]`)

describe('Pricing: what an unset plan draws', () => {
  it('draws no description, detail line or badge text of its own', async () => {
    const [card] = cards(await draw([plan('a')]))
    expect(roleOf(card, 'description')).toBeNull()
    expect(card?.querySelectorAll('[data-text-role="label"]')).toHaveLength(1)
    expect(card?.querySelector('[data-decorative-mark]')).toBeNull()
  })

  it('keeps the card’s own classes, the highlighted plan’s ring included', async () => {
    const [plain, highlighted] = cards(await draw([plan('a'), plan('b', { highlighted: true })]))
    expect(plain?.className).toBe(
      'flex flex-col rounded-card bg-surface p-8 shadow-(--card-depth,0_0_#0000) ring-1 ring-line ring-inset',
    )
    expect(highlighted?.className).toBe(
      'flex flex-col rounded-card bg-surface p-8 shadow-(--card-depth,0_0_#0000) ring-2 ring-ink ring-inset',
    )
    expect(roleOf(plain, 'price')?.className).toBe('text-4xl font-semibold tracking-tight')
  })

  it('labels the section by its heading, with the header drawn as before', async () => {
    const document = await draw([plan('a')], { title: 'Choose your plan', intro: 'An intro.' })
    const heading = document.querySelector('h2')
    expect(document.querySelector('section')?.getAttribute('aria-labelledby')).toBe(heading?.id)
    expect(document.querySelector('header')?.className).toContain('mb-16 max-w-measure-narrow')
    expect(heading?.className).toBe('text-h2 font-semibold text-balance')
  })
})

describe('Pricing: optional plan content', () => {
  it('draws a description, a detail line and a custom badge, each in its own role', async () => {
    const [card] = cards(
      await draw([
        plan('a', {
          highlighted: true,
          description: 'For small teams.',
          meta: '90 minutes',
          badgeText: 'Best value',
        }),
      ]),
    )
    expect(roleOf(card, 'description')?.textContent).toBe('For small teams.')
    expect(
      [...(card?.querySelectorAll('[data-text-role="label"]') ?? [])].map((el) => el.textContent),
    ).toEqual(['per month', '90 minutes'])
    expect(card?.textContent).toContain('Best value')
    expect(card?.textContent).not.toContain('Most popular')
  })

  it('says “Most popular” on a highlighted plan with no badge text', async () => {
    const [card] = cards(await draw([plan('a', { highlighted: true })]))
    expect(card?.textContent).toContain('Most popular')
  })
})

describe('Pricing: the card design and a plan’s own', () => {
  it('applies the section’s Cards box to every plan', async () => {
    const found = cards(
      await draw([plan('a'), plan('b')], { cardDesign: { price: { size: 'large' } } }),
    )
    for (const card of found) expect(roleOf(card, 'price')?.className).toContain('text-h1')
  })

  it('steps the off-scale price from the nearest scale step, keeping Medium as it was', async () => {
    const [small] = cards(await draw([plan('a')], { cardDesign: { price: { size: 'small' } } }))
    const [medium] = cards(await draw([plan('a')], { cardDesign: { price: { size: 'medium' } } }))
    expect(roleOf(small, 'price')?.className).toContain('text-h3')
    expect(roleOf(medium, 'price')?.className).toBe('text-4xl font-semibold tracking-tight')
  })

  it('applies a plan’s own choices only while it is customised, one property at a time', async () => {
    const own = { border: 'thick', title: { size: 'small' } }
    const section = { cardDesign: { title: { weight: 'medium' }, border: 'none' } }
    const [off] = cards(await draw([plan('a', { design: own })], section))
    expect(roleOf(off, 'title')?.className).toBe('text-lead font-medium')
    expect(off?.className).toContain('ring-0')

    const [on] = cards(
      await draw([plan('a', { design: { appearance: 'custom', ...own } })], section),
    )
    // The plan’s size and border, over the section’s weight.
    expect(roleOf(on, 'title')?.className).toContain('text-body')
    expect(roleOf(on, 'title')?.className).toContain('font-medium')
    expect(on?.className).toContain('ring-3')
  })

  it('customising one plan leaves the other plans drawn as they were', async () => {
    const own = {
      appearance: 'custom',
      border: 'thick',
      title: { size: 'small' },
      mark: { kind: 'icon', icon: 'heart' },
    }
    const plans = (design: Record<number, unknown>) =>
      ['a', 'b', 'c'].map((key, index) =>
        plan(key, index in design ? { design: design[index] } : {}),
      )
    const html = async (design: Record<number, unknown>) =>
      cards(await draw(plans(design))).map((card) => card.outerHTML)
    const [plain, first, last] = await Promise.all([html({}), html({ 0: own }), html({ 2: own })])
    expect(first[0]).not.toBe(plain[0])
    expect(first.slice(1)).toEqual(plain.slice(1))
    expect(last[2]).not.toBe(plain[2])
    expect(last.slice(0, 2)).toEqual(plain.slice(0, 2))
  })

  it('keeps the highlighted plan’s width when only its border colour changes, and its colour when only the width does', async () => {
    const highlighted = (design: Record<string, unknown>) =>
      draw([plan('a', { highlighted: true })], { cardDesign: design }).then(
        (document) => cards(document)[0],
      )
    const colourOnly = await highlighted({ borderColour: { colour: 'accent' } })
    expect(colourOnly?.className).toContain('ring-2 ring-inset ring-(--surface-border)')
    const widthOnly = await highlighted({ border: 'thin' })
    expect(widthOnly?.className).toContain('ring-1 ring-inset')
    expect(widthOnly?.getAttribute('style')).toContain('--surface-border:var(--color-ink)')
  })

  it('draws a customised plan’s own mark instead of the card mark, and None removes it', async () => {
    const section = { cardDesign: { mark: { kind: 'icon', icon: 'heart' } } }
    const marks = async (design?: Record<string, unknown>) =>
      cards(await draw([plan('a', { design }), plan('b')], section)).map(
        (card) =>
          card.querySelector('[data-decorative-mark]')?.getAttribute('data-mark-kind') ?? null,
      )
    expect(await marks()).toEqual(['icon', 'icon'])
    const own = { appearance: 'custom', mark: { kind: 'text', text: 'Best' } }
    expect(await marks(own)).toEqual(['text', 'icon'])
    expect(await marks({ ...own, mark: { kind: 'none' } })).toEqual([null, 'icon'])
    // Kept but not applied until it is customised.
    expect(await marks({ mark: own.mark })).toEqual(['icon', 'icon'])
  })

  it('tags an item mark as the item’s and a card mark as the card’s', async () => {
    const document = await draw(
      [
        plan('a', { design: { appearance: 'custom', mark: { kind: 'text', text: 'Best' } } }),
        plan('b'),
      ],
      { cardDesign: { mark: { kind: 'icon', icon: 'heart' } } },
    )
    expect(
      [...document.querySelectorAll('[data-decorative-mark]')].map((el) =>
        el.getAttribute('data-decorative-mark'),
      ),
    ).toEqual(['item', 'card'])
  })
})

describe('Pricing: depth and glow', () => {
  const depthOf = (card: Element | undefined) =>
    card?.getAttribute('style')?.match(/--depth-shadow:([^;]*)/)?.[1]

  it('draws no shadow of its own, and reads the site’s Card depth only if one is chosen', async () => {
    for (const card of cards(await draw([plan('a'), plan('b', { highlighted: true })]))) {
      expect(card.className).toContain('shadow-(--card-depth,0_0_#0000)')
      expect(card.className).not.toContain('shadow-card')
      expect(card.className).not.toContain('shadow-(--depth-shadow)')
      expect(depthOf(card)).toBeUndefined()
    }
  })

  it('applies the section’s Cards box to every plan, in place of the site’s depth', async () => {
    const section = { cardDesign: { shadow: 'raised' } }
    for (const card of cards(await draw([plan('a'), plan('b')], section))) {
      expect(card.className).toContain('shadow-(--depth-shadow)')
      expect(card.className).not.toContain('--card-depth')
      expect(depthOf(card)).toBe('var(--shadow-raised)')
    }
  })

  it('lets one customised plan be Flat while the others keep the section’s depth', async () => {
    const section = { cardDesign: { shadow: 'raised' } }
    const [flat, other, last] = cards(
      await draw(
        [
          plan('a', { design: { appearance: 'custom', shadow: 'flat' } }),
          plan('b'),
          plan('c', { design: { shadow: 'flat' } }),
        ],
        section,
      ),
    )
    expect(depthOf(flat)).toBe('0 0 #0000')
    expect(depthOf(other)).toBe('var(--shadow-raised)')
    // Saved but not customised: the page ignores it.
    expect(depthOf(last)).toBe('var(--shadow-raised)')
  })

  it('keeps a section’s explicit Soft through its own token', async () => {
    const [card] = cards(await draw([plan('a')], { cardDesign: { shadow: 'soft' } }))
    expect(depthOf(card)).toBe('var(--shadow-soft, var(--shadow-card))')
  })

  it('adds a glow to the (site or no) shadow when only a glow is chosen', async () => {
    const [card] = cards(await draw([plan('a')], { cardDesign: { glow: 'soft' } }))
    expect(depthOf(card)).toMatch(/^var\(--card-depth, 0 0 #0000\), var\(--depth-glow-soft\)/)
  })

  it('draws no shadow on a transparent plan, as it draws none of its other chrome', async () => {
    const [card] = cards(
      await draw([plan('a')], {
        cardDesign: { background: { colour: 'transparent' }, shadow: 'floating' },
      }),
    )
    expect(card?.className).not.toContain('shadow-')
    expect(depthOf(card)).toBeUndefined()
  })
})
