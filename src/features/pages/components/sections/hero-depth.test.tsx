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

/** A hero at a layout, with a picture, and whatever extra is stored. */
async function draw(layout: string, extra: Record<string, unknown> = {}) {
  const seed = await gallerySeed('hero', layout)
  const picture = {
    _type: 'image',
    alt: 'A studio',
    asset: { _type: 'reference', _ref: await fixturePictureId() },
  }
  const raw = {
    ...seed,
    variant: layout,
    backgroundImage: picture,
    secondaryImage: picture,
    imageDesign: null,
    pictureDepthDesign: null,
    partMotion: null,
    ...extra,
  } as RawSection
  const html = await renderSections(await projectSections([raw]), { belowHeading: true })
  return { html, document: parseHtml(html) }
}

const FRAMED = { _type: 'imageDesign', appearance: 'framed', motion: 'subtle' }
const FLOATING = { _type: 'object', shadow: 'floating', glow: 'soft' }
const RISE = { enabled: true, imagePreset: 'rise' }
const PARALLAX = { enabled: true, imagePreset: 'parallax' }
const UNSET = [
  {},
  { shadow: null, glow: null },
  { shadow: 'flat' },
  { glow: 'off' },
  { shadow: 'flat', glow: 'off' },
  { shadow: 'gigantic', glow: 'blinding' },
]
const SETUPS = {
  'a plain picture': {},
  'a moving, framed picture': { imageDesign: FRAMED },
  'an entrance': { partMotion: RISE },
  'an entrance and a moving picture': { partMotion: RISE, imageDesign: FRAMED },
  'the hero’s own parallax': { partMotion: PARALLAX },
}

describe('Hero split: picture depth', () => {
  it('is drawn exactly as before while nothing is chosen, in every picture setup', async () => {
    for (const [name, setup] of Object.entries(SETUPS)) {
      const base = await draw('split', setup)
      expect(base.html, name).not.toContain('depth-filter')
      for (const stored of UNSET) {
        const same = await draw('split', { ...setup, pictureDepthDesign: stored })
        expect(same.html, `${name} ${JSON.stringify(stored)}`).toBe(base.html)
      }
    }
  })

  it('puts the filter on a plain picture’s <img>', async () => {
    const { document } = await draw('split', { pictureDepthDesign: FLOATING })
    const img = document.querySelector('section img')
    expect(img?.className).toContain('[filter:var(--depth-filter)]')
    expect(img?.getAttribute('style')).toContain('--depth-picture-floating')
  })

  it('puts it on the still box of a moving, framed picture, never on what moves', async () => {
    const { document } = await draw('split', { imageDesign: FRAMED, pictureDepthDesign: FLOATING })
    const box = document.querySelector('[data-framed-image]')
    expect(box?.className).toContain('[filter:var(--depth-filter)]')
    expect(box?.querySelector('[data-image-frame]')).not.toBeNull()
    for (const inner of box?.querySelectorAll('*') ?? []) {
      expect(inner.getAttribute('style') ?? '', inner.tagName).not.toContain('--depth-filter')
    }
  })

  it('leaves the entrance wrapper alone: the filter is on the picture inside it', async () => {
    for (const imageDesign of [null, FRAMED]) {
      const plain = await draw('split', { partMotion: RISE, imageDesign })
      const { document } = await draw('split', {
        partMotion: RISE,
        imageDesign,
        pictureDepthDesign: FLOATING,
      })
      const wrapper = (doc: Document) => doc.querySelector('[data-reveal]:has(img)')
      // The entrance still wraps the picture, with the same classes and starting state as without depth.
      expect(wrapper(document), imageDesign ? 'framed' : 'plain').not.toBeNull()
      expect(wrapper(document)?.className).toBe(wrapper(plain.document)?.className)
      expect(wrapper(document)?.getAttribute('style')).toBe(
        wrapper(plain.document)?.getAttribute('style'),
      )
      expect(wrapper(document)?.getAttribute('style')).toContain('opacity:0')
      const filtered = wrapper(document)?.querySelector('[class*="depth-filter"]')
      expect(filtered?.matches(imageDesign ? '[data-framed-image]' : 'img')).toBe(true)
      expect(wrapper(document)?.className).not.toContain('depth-filter')
    }
  })

  it('keeps the hero’s own parallax moving the picture, with the filter on the box', async () => {
    const { document } = await draw('split', { partMotion: PARALLAX, pictureDepthDesign: FLOATING })
    const box = document.querySelector('[data-framed-image]')
    expect(box?.className).toContain('[filter:var(--depth-filter)]')
    const mover = box?.querySelector("[style*='--parallax-amount']")
    expect(mover).not.toBeNull()
    expect(mover?.getAttribute('style') ?? '').not.toContain('--depth-filter')
  })

  it('draws a glow alone, a shadow alone and a glow colour', async () => {
    const styleOf = async (stored: Record<string, unknown>) =>
      (await draw('split', { pictureDepthDesign: stored })).document
        .querySelector('section img')
        ?.getAttribute('style')
    expect(await styleOf({ glow: 'strong' })).toMatch(/^--depth-filter:drop-shadow\(0 0 14px/)
    expect(await styleOf({ shadow: 'raised' })).toBe('--depth-filter:var(--depth-picture-raised)')
    expect(
      await styleOf({ shadow: 'soft', glow: 'soft', glowColour: { colour: 'highlight' } }),
    ).toContain('var(--color-highlight')
  })
})

describe.each(['overlay', 'full-bleed', 'editorial'])('Hero %s: picture depth', (layout) => {
  it('is not read: its picture is a background or is not on the list', async () => {
    const base = await draw(layout)
    const stored = await draw(layout, { pictureDepthDesign: FLOATING })
    expect(stored.html).toBe(base.html)
    expect(stored.html).not.toContain('depth-filter')
  })
})
