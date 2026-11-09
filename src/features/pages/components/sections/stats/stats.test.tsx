import { createElement, type ComponentType } from 'react'
import { describe, expect, it, vi } from 'vitest'

import { parseHtml } from '@/lib/design/capability-harness'

import { stats } from '../../../schemas/sections/stats'
import {
  gallerySeed,
  projectSections,
  renderSections,
  type RawSection,
} from '../../section-renderer.fixtures'

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

async function draw(layout: 'inline' | 'cards', extra: Record<string, unknown> = {}) {
  const seed = await gallerySeed('stats', layout)
  const raw = { ...seed, ...extra } as RawSection
  return parseHtml(await renderSections(await projectSections([raw]), { belowHeading: true }))
}

const DESIGN = {
  border: 'thick',
  number: { size: 'small' },
  label: { weight: 'semibold' },
  mark: { kind: 'icon', icon: 'heart' },
}

describe('Stats: the Cards layout', () => {
  it('keeps its card, accent rule and type with nothing set', async () => {
    const card = (await draw('cards')).querySelector('ul.grid > li')
    expect(card?.className).toContain(
      'rounded-card border-t-4 border-accent bg-surface-alt p-8 shadow-(--card-depth,0_0_#0000) ring-1 ring-line',
    )
    expect(card?.querySelector('[data-text-role="number"]')?.className).toContain(
      'text-h1 font-semibold',
    )
    expect(card?.querySelector('[data-text-role="label"]')?.className).toBe(
      'mt-2 text-lead text-ink-muted',
    )
  })

  it('takes the fill, border, each role and a mark, keeping the accent rule', async () => {
    const card = (await draw('cards', { cardDesign: DESIGN })).querySelector('ul.grid > li')
    expect(card?.className).toContain('ring-3')
    expect(card?.className).toContain('border-t-4 border-accent')
    expect(card?.querySelector('[data-text-role="number"]')?.className).toContain('text-h2')
    expect(card?.querySelector('[data-text-role="label"]')?.className).toContain('font-semibold')
    expect(card?.firstElementChild?.getAttribute('data-decorative-mark')).toBe('card')
  })

  it('keeps a chosen colour on the figure while it counts up, and the width that stops layout shift', async () => {
    const document = await draw('cards', {
      cardDesign: { number: { colour: { colour: 'accent' } } },
    })
    const figure = document.querySelector('[data-text-role="number"]')
    expect(figure?.getAttribute('style')).toContain('color:')
    expect(figure?.getAttribute('style')).toContain('min-width:')
  })
})

describe('Stats: the Inline layout, which draws no card', () => {
  it('ignores a stored Cards box', async () => {
    const plain = await draw('inline')
    const stored = await draw('inline', { cardDesign: DESIGN })
    expect(stored.body.innerHTML).toBe(plain.body.innerHTML)
    expect(stored.querySelector('[data-text-role="number"]')).toBeNull()
  })

  it('still draws the section header in its own roles', async () => {
    const document = await draw('inline', { eyebrow: 'In numbers', intro: 'An intro.' })
    for (const role of ['eyebrow', 'heading', 'intro']) {
      expect(document.querySelector(`header [data-text-role="${role}"]`)).not.toBeNull()
    }
  })
})

describe('Stats’ Studio controls', () => {
  const box = (stats.fields as unknown as { name: string; hidden?: unknown }[]).find(
    ({ name }) => name === 'cardDesign',
  )
  const hiddenOn = (variant: string | undefined) =>
    (box?.hidden as (context: unknown) => boolean)({
      parent: { _type: 'stats', variant },
      currentUser: { roles: [{ name: 'administrator' }] },
    })

  it('offers the Cards box only on Cards, and Inline when unset', () => {
    expect(hiddenOn(undefined)).toBe(true)
    expect(hiddenOn('inline')).toBe(true)
    expect(hiddenOn('cards')).toBe(false)
  })
})

describe('Stats: depth and glow on the Cards layout', () => {
  const depthOf = (card: Element | null | undefined) =>
    card?.getAttribute('style')?.match(/--depth-shadow:([^;]*)/)?.[1]

  it('draws no shadow of its own, reading the site’s Card depth only when one is chosen', async () => {
    const card = (await draw('cards')).querySelector('ul.grid > li')
    expect(card?.className).toContain('shadow-(--card-depth,0_0_#0000)')
    expect(depthOf(card)).toBeUndefined()
  })

  it('draws a chosen level and glow on every card', async () => {
    const cards = [
      ...(
        await draw('cards', { cardDesign: { shadow: 'floating', glow: 'soft' } })
      ).querySelectorAll('ul.grid > li'),
    ]
    expect(cards.length).toBeGreaterThan(0)
    for (const card of cards) {
      expect(card.className).toContain('shadow-(--depth-shadow)')
      expect(depthOf(card)).toMatch(/^var\(--shadow-floating\), var\(--depth-glow-soft\)/)
    }
  })

  it('draws no card, so no depth, on the inline layout', async () => {
    const document = await draw('inline', { cardDesign: { shadow: 'floating' } })
    expect(document.body.innerHTML).not.toContain('--depth-shadow')
  })
})
