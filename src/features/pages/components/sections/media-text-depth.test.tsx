import { createElement, type ComponentType } from 'react'
import { describe, expect, it, vi } from 'vitest'

import { parseHtml } from '@/lib/design/capability-harness'

import {
  fixturePictureId,
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

/** Image + text with a picture in its media slot, at a layout, with whatever extra is stored. */
async function draw(layout: string, extra: Record<string, unknown> = {}) {
  const seed = await gallerySeed('mediaText', layout)
  const picture = {
    _type: 'image',
    alt: 'A studio',
    asset: { _type: 'reference', _ref: await fixturePictureId() },
  }
  const raw = {
    ...seed,
    variant: layout,
    image: null,
    imageDesign: null,
    pictureDepthDesign: null,
    media: [{ _key: 'm', _type: 'slotImage', image: picture }],
    ...extra,
  } as RawSection
  const html = await renderSections(await projectSections([raw]), { belowHeading: true })
  return { html, document: parseHtml(html) }
}

const FRAMED = { _type: 'imageDesign', appearance: 'framed', motion: 'subtle' }
const FLOATING = { _type: 'object', shadow: 'floating', glow: 'soft' }

describe.each(['side', 'stacked'])('Image + text, %s: picture depth', (layout) => {
  it('is drawn exactly as before while nothing is chosen, however it is stored empty', async () => {
    for (const design of [null, FRAMED]) {
      const base = await draw(layout, { imageDesign: design })
      expect(base.html).not.toContain('depth-filter')
      for (const stored of [
        {},
        { shadow: null, glow: null },
        { shadow: 'flat' },
        { glow: 'off' },
        { shadow: 'flat', glow: 'off' },
        { shadow: 'gigantic', glow: 'blinding' },
      ]) {
        const same = await draw(layout, { imageDesign: design, pictureDepthDesign: stored })
        expect(same.html, JSON.stringify(stored)).toBe(base.html)
      }
    }
  })

  it('puts the filter on a plain picture’s <img>', async () => {
    const { document } = await draw(layout, { pictureDepthDesign: FLOATING })
    const img = document.querySelector('section img')
    expect(img?.className).toContain('[filter:var(--depth-filter)]')
    expect(img?.getAttribute('style')).toContain('--depth-filter:var(--depth-picture-floating)')
    expect(img?.getAttribute('style')).toContain('drop-shadow(0 0 9px')
  })

  it('puts it on the still outer box of a moving, framed picture, never on what moves', async () => {
    const { document } = await draw(layout, { imageDesign: FRAMED, pictureDepthDesign: FLOATING })
    const box = document.querySelector('[data-framed-image]')
    expect(box?.className).toContain('[filter:var(--depth-filter)]')
    expect(box?.getAttribute('style')).toContain('--depth-picture-floating')
    // The frame is inside the box, so the shadow follows it too.
    expect(box?.querySelector('[data-image-frame]')).not.toBeNull()
    for (const inner of box?.querySelectorAll('*') ?? []) {
      expect(inner.className, inner.tagName).not.toContain('depth-filter')
      expect(inner.getAttribute('style') ?? '', inner.tagName).not.toContain('--depth-filter')
    }
  })

  it('moves nothing else: the box keeps its ratio and place beside the filter', async () => {
    const plain = await draw(layout, { imageDesign: FRAMED })
    const depth = await draw(layout, { imageDesign: FRAMED, pictureDepthDesign: FLOATING })
    const classes = (document: Document) =>
      [...(document.querySelector('[data-framed-image]')?.classList ?? [])].filter(
        (name) => !name.includes('depth-filter'),
      )
    expect(classes(depth.document)).toEqual(classes(plain.document))
  })

  it('draws a glow alone, a shadow alone, and a glow colour', async () => {
    const filterOf = async (stored: Record<string, unknown>) =>
      (await draw(layout, { pictureDepthDesign: stored })).document
        .querySelector('section img')
        ?.getAttribute('style')
    expect(await filterOf({ glow: 'strong' })).toMatch(/^--depth-filter:drop-shadow\(0 0 14px/)
    expect(await filterOf({ shadow: 'raised' })).toBe('--depth-filter:var(--depth-picture-raised)')
    expect(
      await filterOf({ shadow: 'soft', glow: 'soft', glowColour: { colour: 'highlight' } }),
    ).toContain('var(--color-highlight')
  })

  it('is not affected by the site’s Card depth or the section’s own cards', async () => {
    const { html } = await draw(layout, { pictureDepthDesign: { shadow: 'soft' } })
    expect(html).not.toContain('card-depth')
  })
})

describe('Image + text, overlay: picture depth', () => {
  it('is not read: its picture is the background', async () => {
    const base = await draw('overlay')
    const stored = await draw('overlay', { pictureDepthDesign: FLOATING })
    expect(stored.html).toBe(base.html)
  })
})
