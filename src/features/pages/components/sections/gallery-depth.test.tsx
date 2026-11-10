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

/** Gallery at a layout, with whatever extra is stored. The seed's own pictures are the tiles. */
async function draw(layout: string, extra: Record<string, unknown> = {}) {
  const seed = await gallerySeed('gallery', layout)
  const raw = {
    ...seed,
    variant: layout,
    imageDesign: null,
    pictureDepthDesign: null,
    ...extra,
  } as RawSection
  const html = await renderSections(await projectSections([raw]), { belowHeading: true })
  return { html, document: parseHtml(html) }
}

const FLOATING = { _type: 'object', shadow: 'floating', glow: 'soft' }
const CIRCLE = { _type: 'imageDesign', appearance: 'circle' }
const FRAMED = { _type: 'imageDesign', appearance: 'framed', motion: 'subtle' }
const UNSET = [
  {},
  { shadow: null, glow: null },
  { shadow: 'flat' },
  { glow: 'off' },
  { shadow: 'flat', glow: 'off' },
  { shadow: 'gigantic', glow: 'blinding' },
]
const tiles = (document: Document) => [...document.querySelectorAll('[data-framed-image]')]
const buttons = (document: Document) => [
  ...document.querySelectorAll('button[aria-haspopup="dialog"]'),
]

describe.each(['grid', 'slider'])('Gallery %s: picture depth', (layout) => {
  it('is drawn exactly as before while nothing is chosen, however it is stored empty', async () => {
    for (const imageDesign of [null, CIRCLE, FRAMED]) {
      const base = await draw(layout, { imageDesign })
      expect(tiles(base.document).length).toBeGreaterThan(0)
      expect(base.html).not.toContain('depth-filter')
      for (const stored of UNSET) {
        const same = await draw(layout, { imageDesign, pictureDepthDesign: stored })
        expect(same.html, `${JSON.stringify(imageDesign)} ${JSON.stringify(stored)}`).toBe(
          base.html,
        )
      }
    }
  })

  it('puts the filter on every tile’s still box, for each design of picture', async () => {
    for (const imageDesign of [null, CIRCLE, FRAMED]) {
      const { document } = await draw(layout, { imageDesign, pictureDepthDesign: FLOATING })
      const boxes = tiles(document)
      expect(boxes.length).toBeGreaterThan(0)
      for (const box of boxes) {
        expect(box.className).toContain('[filter:var(--depth-filter)]')
        expect(box.getAttribute('style')).toContain('--depth-picture-floating')
        // Nothing inside the box, where the picture and its hover zoom are, is filtered a second time.
        for (const inner of box.querySelectorAll('*')) {
          expect(inner.className).not.toContain('depth-filter')
        }
      }
    }
  })

  it('leaves the button, its name and the hover zoom exactly as they were', async () => {
    const before = await draw(layout)
    const after = await draw(layout, { pictureDepthDesign: FLOATING })
    const describeButton = (document: Document) =>
      buttons(document).map((button) => [
        button.className,
        button.getAttribute('aria-label'),
        button.getAttribute('aria-haspopup'),
        button.getAttribute('style'),
        button.querySelector('img')?.className,
        button.querySelector('img')?.getAttribute('alt'),
      ])
    expect(describeButton(after.document)).toEqual(describeButton(before.document))
    expect(describeButton(after.document).length).toBeGreaterThan(0)
    // The zoom is still on the picture, which the clip keeps inside its shape.
    expect(buttons(after.document)[0]?.querySelector('img')?.className).toContain(
      'group-hover:scale-105',
    )
  })

  it('draws a glow alone, a shadow alone, and each level through the shared tokens', async () => {
    const styleOf = async (stored: Record<string, unknown>) =>
      tiles((await draw(layout, { pictureDepthDesign: stored })).document)[0]?.getAttribute('style')
    expect(await styleOf({ shadow: 'soft' })).toBe('--depth-filter:var(--depth-picture-soft)')
    expect(await styleOf({ shadow: 'raised' })).toBe('--depth-filter:var(--depth-picture-raised)')
    expect(await styleOf({ shadow: 'floating' })).toBe(
      '--depth-filter:var(--depth-picture-floating)',
    )
    expect(await styleOf({ glow: 'strong' })).toMatch(/^--depth-filter:drop-shadow\(0 0 14px/)
    expect(await styleOf({ shadow: 'floating', glow: 'strong' })).toContain(
      'var(--depth-picture-floating) drop-shadow(0 0 14px',
    )
  })

  it('leaves the tiles’ accessibility semantics unchanged', async () => {
    const semantics = (document: Document) =>
      [...document.querySelectorAll('img, button')].map((el) =>
        [
          el.tagName,
          el.getAttribute('alt'),
          el.getAttribute('aria-label'),
          el.getAttribute('role'),
          el.getAttribute('aria-hidden'),
          el.getAttribute('tabindex'),
        ].join('|'),
      )
    const before = await draw(layout)
    const after = await draw(layout, { pictureDepthDesign: FLOATING })
    expect(semantics(after.document)).toEqual(semantics(before.document))
    expect(semantics(after.document).length).toBeGreaterThan(0)
  })
})

describe('Gallery slider: the room for the shadow', () => {
  const viewport = (document: Document) =>
    document.querySelector('[aria-roledescription="carousel"] > div')

  it('keeps the slider’s own 12px while nothing is chosen, byte for byte', async () => {
    const base = await draw('slider')
    expect(viewport(base.document)?.className).toContain('-m-3')
    expect(viewport(base.document)?.className).toContain('p-3')
    expect(viewport(base.document)?.className).not.toContain('-mb-6')
    for (const stored of UNSET) {
      const same = await draw('slider', { pictureDepthDesign: stored })
      expect(viewport(same.document)?.className, JSON.stringify(stored)).toBe(
        viewport(base.document)?.className,
      )
    }
  })

  it('asks for room around the slides only when a depth is chosen: 22px at the sides, 36px above, 72px below', async () => {
    const { document } = await draw('slider', { pictureDepthDesign: FLOATING })
    const element = viewport(document)
    const classes = element?.className ?? ''
    // The sized room replaces the slider's own 12px classes, and the no-JavaScript snap offset follows it.
    expect(classes).not.toContain('-m-3')
    expect(classes).not.toContain('p-3')
    expect(classes).not.toContain('scroll-px-3')
    const style = element?.getAttribute('style') ?? ''
    expect(style).toContain('margin:-36px -22px -72px')
    expect(style).toContain('padding:36px 22px 72px')
    expect(style).toContain('scroll-padding-inline:22px')
  })
})

describe('Gallery masonry: picture depth', () => {
  const tileButtons = (document: Document) => buttons(document)

  it('is drawn exactly as before while nothing is chosen, however it is stored empty', async () => {
    const base = await draw('masonry')
    expect(tileButtons(base.document).length).toBeGreaterThan(0)
    expect(base.html).not.toContain('depth-filter')
    for (const stored of UNSET) {
      const same = await draw('masonry', { pictureDepthDesign: stored })
      expect(same.html, JSON.stringify(stored)).toBe(base.html)
    }
  })

  it('puts the filter on each tile’s button, which is its outline, and nowhere inside it', async () => {
    const { document } = await draw('masonry', { pictureDepthDesign: FLOATING })
    const all = tileButtons(document)
    expect(all.length).toBeGreaterThan(0)
    for (const button of all) {
      expect(button.className).toContain('[filter:var(--depth-filter)]')
      expect(button.getAttribute('style')).toContain('--depth-picture-floating')
      for (const inner of button.querySelectorAll('*')) {
        expect(inner.className).not.toContain('depth-filter')
      }
    }
    // The button keeps the classes that clip and round the picture, in the order it had them.
    expect(all[0]?.className).toMatch(
      /^group block w-full overflow-hidden rounded-card bg-surface-alt \[filter:var\(--depth-filter\)\]$/,
    )
  })

  it('changes nothing about the button’s name, its role, the picture or the order', async () => {
    const before = await draw('masonry')
    const after = await draw('masonry', { pictureDepthDesign: FLOATING })
    const describeTiles = (document: Document) =>
      [...document.querySelectorAll('ul > li')].map((li) => {
        const button = li.querySelector('button')
        const img = li.querySelector('img')
        return [
          li.className,
          button?.getAttribute('aria-label'),
          button?.getAttribute('aria-haspopup'),
          button?.getAttribute('type'),
          img?.className,
          img?.getAttribute('alt'),
          img?.getAttribute('src'),
        ]
      })
    expect(describeTiles(after.document)).toEqual(describeTiles(before.document))
    expect(describeTiles(after.document).length).toBeGreaterThan(0)
  })

  it('draws each level through the shared tokens, a glow alone, and a glow colour', async () => {
    const styleOf = async (stored: Record<string, unknown>) =>
      tileButtons(
        (await draw('masonry', { pictureDepthDesign: stored })).document,
      )[0]?.getAttribute('style')
    expect(await styleOf({ shadow: 'soft' })).toBe('--depth-filter:var(--depth-picture-soft)')
    expect(await styleOf({ shadow: 'raised' })).toBe('--depth-filter:var(--depth-picture-raised)')
    expect(await styleOf({ shadow: 'floating' })).toBe(
      '--depth-filter:var(--depth-picture-floating)',
    )
    expect(await styleOf({ glow: 'strong' })).toMatch(/^--depth-filter:drop-shadow\(0 0 14px/)
    expect(
      await styleOf({ shadow: 'soft', glow: 'soft', glowColour: { colour: 'highlight' } }),
    ).toContain('var(--color-highlight')
  })

  it('ignores an Image design stored on it: Masonry keeps every picture’s own shape', async () => {
    const plain = await draw('masonry', { pictureDepthDesign: FLOATING })
    const designed = await draw('masonry', { imageDesign: CIRCLE, pictureDepthDesign: FLOATING })
    expect(designed.html).toBe(plain.html)
  })
})
