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
    createElement('img', {
      src: props.src,
      className: props.className,
      style: props.style,
      alt: '',
    }),
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

/** Team at a layout, every member with a portrait, and whatever extra is stored. */
async function draw(layout: string, extra: Record<string, unknown> = {}) {
  const seed = await gallerySeed('team', layout)
  const raw = {
    ...seed,
    variant: layout,
    imageDesign: null,
    portraitDesign: null,
    pictureDepthDesign: null,
    ...extra,
  } as RawSection
  const html = await renderSections(await projectSections([raw]), { belowHeading: true })
  return { html, document: parseHtml(html) }
}

const FLOATING = { _type: 'object', shadow: 'floating', glow: 'soft' }
const CIRCLE = { _type: 'imageDesign', appearance: 'circle' }
const SQUARE = { _type: 'imageDesign', appearance: 'square' }
const FRAMED = { _type: 'imageDesign', appearance: 'framed', motion: 'subtle' }
const UNSET = [
  {},
  { shadow: null, glow: null },
  { shadow: 'flat' },
  { glow: 'off' },
  { shadow: 'flat', glow: 'off' },
  { shadow: 'gigantic', glow: 'blinding' },
]
const portraitSlot = (card: Element | undefined) => card?.firstElementChild ?? null
const cardsOf = (document: Document) => [...document.querySelectorAll('div.relative.rounded-card')]

describe.each(['grid', 'slider'])('Team %s: picture depth', (layout) => {
  it('is drawn exactly as before while nothing is chosen, whatever the portrait’s design', async () => {
    for (const imageDesign of [null, CIRCLE, SQUARE, FRAMED]) {
      const base = await draw(layout, { imageDesign })
      expect(base.html).not.toContain('depth-filter')
      for (const stored of UNSET) {
        const same = await draw(layout, { imageDesign, pictureDepthDesign: stored })
        expect(same.html, `${JSON.stringify(imageDesign)} ${JSON.stringify(stored)}`).toBe(
          base.html,
        )
      }
    }
  })

  it('insets a flush portrait by the room its depth needs, inside the slot it already has', async () => {
    const expected = {
      soft: { shadow: 'soft' },
      raised: { shadow: 'raised' },
      floating: { shadow: 'floating' },
      'a soft glow': { glow: 'soft' },
      'a strong glow': { glow: 'strong' },
      'floating and a strong glow': { shadow: 'floating', glow: 'strong' },
    }
    // Each level's measured room (depth-options.ts): the side, the top, and the rest of 2 x side below.
    const padding = {
      soft: '4px 8px 12px',
      raised: '6px 16px 26px',
      floating: '12px 28px 44px',
      'a soft glow': '12px 12px 12px',
      'a strong glow': '22px 22px 22px',
      'floating and a strong glow': '24px 34px 44px',
    }
    for (const [name, stored] of Object.entries(expected)) {
      const { document } = await draw(layout, { pictureDepthDesign: stored })
      const cards = cardsOf(document)
      expect(cards.length, name).toBeGreaterThan(0)
      for (const card of cards) {
        const slot = portraitSlot(card)
        // The slot is the card's width square, as the portrait was, with the room as padding.
        expect(slot?.className, name).toBe('aspect-square')
        expect(slot?.getAttribute('style'), name).toBe(
          `padding:${padding[name as keyof typeof padding]}`,
        )
      }
    }
  })

  it('puts the filter on the portrait itself and gives it the card’s corners', async () => {
    const { document } = await draw(layout, { pictureDepthDesign: FLOATING })
    const img = cardsOf(document)[0]?.querySelector('img')
    expect(img?.className).toContain('[filter:var(--depth-filter)]')
    expect(img?.className).toContain('rounded-card')
    expect(img?.className).toContain('aspect-square')
    expect(img?.getAttribute('style')).toContain('--depth-picture-floating')
  })

  it('keeps an explicit Square’s sharp corners, and a framed or moving portrait’s box', async () => {
    const square = await draw(layout, { imageDesign: SQUARE, pictureDepthDesign: FLOATING })
    const squareImg = cardsOf(square.document)[0]?.querySelector('img')
    expect(squareImg?.className).not.toContain('rounded-card')
    expect(portraitSlot(cardsOf(square.document)[0])?.className).toBe('aspect-square')

    const framed = await draw(layout, { imageDesign: FRAMED, pictureDepthDesign: FLOATING })
    const card = cardsOf(framed.document)[0]
    const box = card?.querySelector('[data-framed-image]')
    expect(box?.className).toContain('[filter:var(--depth-filter)]')
    // Already inset by its card (24px), it takes more at the sides only where its depth needs more (Floating
    // with a soft glow: 30px), and the bottom gives back the height the narrower picture loses.
    expect(portraitSlot(card)?.getAttribute('style')).toBe('padding:24px 30px 12px')
  })

  it('gives a portrait that is already inset (a circle, an arch) more at the sides only where it needs more', async () => {
    const cases = {
      // The margin it already has is enough: nothing about the slot changes, the filter goes on.
      raised: [{ shadow: 'raised' }, 'px-6 pt-6', null],
      'a strong glow': [{ glow: 'strong' }, 'px-6 pt-6', null],
      // More is needed: the sides grow to the table's room, the bottom gives back exactly the height it loses.
      floating: [{ shadow: 'floating' }, '', 'padding:24px 28px 8px'],
      'floating and a soft glow': [
        { shadow: 'floating', glow: 'soft' },
        '',
        'padding:24px 30px 12px',
      ],
      'floating and a strong glow': [
        { shadow: 'floating', glow: 'strong' },
        '',
        'padding:24px 34px 20px',
      ],
    } as const
    for (const [name, [stored, className, style]] of Object.entries(cases)) {
      const { document } = await draw(layout, { imageDesign: CIRCLE, pictureDepthDesign: stored })
      const slot = portraitSlot(cardsOf(document)[0])
      expect(slot?.className ?? '', name).toBe(className)
      expect(slot?.getAttribute('style'), name).toBe(style)
      expect(cardsOf(document)[0]?.querySelector('img')?.className, name).toContain(
        '[filter:var(--depth-filter)]',
      )
    }
  })

  it('keeps an arch’s height too: its 4:5 picture gives back 5/4 of the width it loses', async () => {
    const ARCH = { _type: 'imageDesign', appearance: 'arch' }
    const { document } = await draw(layout, {
      imageDesign: ARCH,
      pictureDepthDesign: { shadow: 'floating', glow: 'strong' },
    })
    expect(portraitSlot(cardsOf(document)[0])?.getAttribute('style')).toBe('padding:24px 34px 25px')
  })

  it('leaves a shaped portrait with no depth exactly where it was', async () => {
    const plain = await draw(layout, { imageDesign: CIRCLE })
    expect(portraitSlot(cardsOf(plain.document)[0])?.className).toBe('px-6 pt-6')
    expect(portraitSlot(cardsOf(plain.document)[0])?.getAttribute('style')).toBeNull()
    expect(plain.html).not.toContain('depth-filter')
  })

  it('does not touch the card’s own surface or depth, and the card’s depth does not reach the portrait', async () => {
    const card = await draw(layout, { cardDesign: { shadow: 'floating' } })
    expect(card.html).toContain('--depth-shadow')
    expect(card.html).not.toContain('depth-filter')
    const base = await draw(layout)
    const withDepth = await draw(layout, { pictureDepthDesign: FLOATING })
    const cardClasses = (document: Document) => cardsOf(document).map((el) => el.className)
    expect(cardClasses(withDepth.document)).toEqual(cardClasses(base.document))
    expect(cardsOf(withDepth.document)[0]?.getAttribute('style')).toBe(
      cardsOf(base.document)[0]?.getAttribute('style'),
    )
  })

  it('leaves the portrait’s accessibility semantics unchanged', async () => {
    const semantics = (document: Document) =>
      [...document.querySelectorAll('img')].map((el) =>
        [el.getAttribute('alt'), el.getAttribute('role'), el.getAttribute('aria-hidden')].join('|'),
      )
    const before = await draw(layout)
    const after = await draw(layout, { pictureDepthDesign: FLOATING })
    expect(semantics(after.document)).toEqual(semantics(before.document))
    expect(semantics(after.document).length).toBeGreaterThan(0)
  })
})

describe('Team list: picture depth', () => {
  it('is drawn exactly as before while nothing is chosen, for Portrait and for a legacy Image design', async () => {
    for (const extra of [
      {},
      { portraitDesign: { _type: 'avatarDesign', ring: 'line' } },
      { imageDesign: CIRCLE },
    ]) {
      const base = await draw('list', extra)
      for (const stored of UNSET) {
        const same = await draw('list', { ...extra, pictureDepthDesign: stored })
        expect(same.html, JSON.stringify(extra)).toBe(base.html)
      }
    }
  })

  it('puts the filter on the portrait’s outer element and insets nothing', async () => {
    const plain = await draw('list')
    const { document } = await draw('list', { pictureDepthDesign: FLOATING })
    const portraits = [...document.querySelectorAll('[data-profile-image]')]
    expect(portraits.length).toBeGreaterThan(0)
    for (const portrait of portraits) {
      expect(portrait.className).toContain('[filter:var(--depth-filter)]')
      expect(portrait.getAttribute('style')).toContain('--depth-picture-floating')
    }
    // Nothing else about the row changed: no padding style and no new wrapper.
    expect(document.querySelectorAll('[style*="padding"]')).toHaveLength(
      plain.document.querySelectorAll('[style*="padding"]').length,
    )
    expect(document.querySelectorAll('li').length).toBe(
      plain.document.querySelectorAll('li').length,
    )
  })

  it('also filters the portrait of a list that still has an Image design', async () => {
    const { document } = await draw('list', { imageDesign: CIRCLE, pictureDepthDesign: FLOATING })
    expect(document.querySelector('[data-profile-image]')).toBeNull()
    expect(document.querySelector('li img')?.className).toContain('[filter:var(--depth-filter)]')
  })
})
