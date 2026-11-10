import { createElement, type ComponentType } from 'react'
import { describe, expect, it, vi } from 'vitest'

import { parseHtml } from '@/lib/design/capability-harness'

import {
  fixturePictureId,
  gallerySeed,
  projectSections,
  renderSections,
  type RawSection,
} from '../../section-renderer.fixtures'

vi.mock('next-sanity/image', () => ({
  Image: (props: Record<string, unknown>) =>
    createElement('img', {
      src: props.src,
      className: props.className,
      style: props.style,
      alt: props.alt,
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

async function draw(extra: Record<string, unknown> = {}) {
  const seed = await gallerySeed('location', null)
  const raw = { ...seed, mapImage: null, pictureDepthDesign: null, ...extra } as RawSection
  const html = await renderSections(await projectSections([raw]), { belowHeading: true })
  return { html, document: parseHtml(html) }
}
const withPicture = async () => ({
  mapImage: {
    _type: 'image',
    alt: 'A map of the studio',
    asset: { _type: 'reference', _ref: await fixturePictureId() },
  },
})
const FLOATING = { _type: 'object', shadow: 'floating', glow: 'soft' }
const UNSET = [
  {},
  { shadow: null, glow: null },
  { shadow: 'flat' },
  { glow: 'off' },
  { shadow: 'flat', glow: 'off' },
  { shadow: 'gigantic', glow: 'blinding' },
]
const mapPicture = (document: Document) => document.querySelector('section img')

describe('Location: picture depth on the map picture', () => {
  it('is drawn exactly as before while nothing is chosen, however it is stored empty', async () => {
    const picture = await withPicture()
    const base = await draw(picture)
    expect(mapPicture(base.document)).not.toBeNull()
    expect(base.html).not.toContain('depth-filter')
    for (const stored of UNSET) {
      const same = await draw({ ...picture, pictureDepthDesign: stored })
      expect(same.html, JSON.stringify(stored)).toBe(base.html)
    }
  })

  it('puts the filter on the picture itself and keeps its ring, corners and size classes in order', async () => {
    const { document } = await draw({ ...(await withPicture()), pictureDepthDesign: FLOATING })
    const img = mapPicture(document)
    expect(img?.className).toBe(
      'h-auto w-full rounded-card object-cover ring-1 ring-line [filter:var(--depth-filter)]',
    )
    expect(img?.getAttribute('style')).toContain('--depth-picture-floating')
    // Nothing around it is filtered: not the section, not the column the picture sits in.
    for (let up = img?.parentElement; up && up !== document.body; up = up.parentElement) {
      expect(up.className, up.tagName).not.toContain('depth-filter')
    }
  })

  it('draws each level through the shared tokens, a glow alone, and a glow colour', async () => {
    const picture = await withPicture()
    const styleOf = async (stored: Record<string, unknown>) =>
      mapPicture((await draw({ ...picture, pictureDepthDesign: stored })).document)?.getAttribute(
        'style',
      )
    expect(await styleOf({ shadow: 'soft' })).toBe('--depth-filter:var(--depth-picture-soft)')
    expect(await styleOf({ shadow: 'raised' })).toBe('--depth-filter:var(--depth-picture-raised)')
    expect(await styleOf({ shadow: 'floating' })).toBe(
      '--depth-filter:var(--depth-picture-floating)',
    )
    expect(await styleOf({ glow: 'strong' })).toMatch(/^--depth-filter:drop-shadow\(0 0 14px/)
    expect(await styleOf({ shadow: 'floating', glow: 'strong' })).toContain(
      'var(--depth-picture-floating) drop-shadow(0 0 14px',
    )
    expect(await styleOf({ glow: 'soft', glowColour: { colour: 'highlight' } })).toContain(
      'var(--color-highlight',
    )
  })

  it('does nothing without a map image: the details stay on their cards, with no filter anywhere', async () => {
    const base = await draw()
    const stored = await draw({ pictureDepthDesign: FLOATING })
    expect(stored.html).toBe(base.html)
    expect(stored.html).not.toContain('depth-filter')
  })

  it('does nothing for a map image field with no picture in it', async () => {
    const empty = { mapImage: { _type: 'image', alt: 'No picture' } }
    const base = await draw(empty)
    const stored = await draw({ ...empty, pictureDepthDesign: FLOATING })
    expect(stored.html).toBe(base.html)
    expect(stored.html).not.toContain('depth-filter')
  })

  it('leaves the picture’s accessibility semantics unchanged', async () => {
    const picture = await withPicture()
    const semantics = (document: Document) =>
      [...document.querySelectorAll('section img')].map((el) =>
        [el.getAttribute('alt'), el.getAttribute('role'), el.getAttribute('aria-hidden')].join('|'),
      )
    const before = await draw(picture)
    const after = await draw({ ...picture, pictureDepthDesign: FLOATING })
    expect(semantics(after.document)).toEqual(semantics(before.document))
    expect(semantics(after.document).length).toBeGreaterThan(0)
  })

  it('does not change the details beside it or their cards', async () => {
    const picture = await withPicture()
    const outside = (html: string) => html.replace(/<img[^>]*>/g, '')
    const before = await draw(picture)
    const after = await draw({ ...picture, pictureDepthDesign: FLOATING })
    expect(outside(after.html)).toBe(outside(before.html))
  })
})
