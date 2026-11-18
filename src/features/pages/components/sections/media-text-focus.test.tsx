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

/**
 * Focus mode on Image + text's Text over media (task 177): the picture covers the section as its background, so only
 * its hotspot applies, as the background's `object-position`, measured on the picture the CDN serves (cut to the
 * crop). Side and Stacked draw the same stored values as a fixed shape, served as the editor's area; switching layout
 * changes how they are used and never what is stored.
 */

const HOTSPOT = { _type: 'sanity.imageHotspot', x: 0.3, y: 0.5, width: 0.3, height: 0.3 }
const CROP = { _type: 'sanity.imageCrop', top: 0, bottom: 0, left: 0.1, right: 0.1 }

/** Image + text at a layout, its media-slot picture carrying whatever is stored on it. */
async function draw(layout: string, stored: Record<string, unknown> = {}, legacy = false) {
  const seed = await gallerySeed('mediaText', layout)
  const picture = {
    _type: 'image',
    alt: 'A studio',
    asset: { _type: 'reference', _ref: await fixturePictureId() },
    ...stored,
  }
  const raw = {
    ...seed,
    variant: layout,
    imageDesign: null,
    pictureDepthDesign: null,
    ...(legacy
      ? { media: null, image: picture }
      : { image: null, media: [{ _key: 'm', _type: 'slotImage', image: picture }] }),
  } as RawSection
  const html = await renderSections(await projectSections([raw]), { belowHeading: true })
  const img = parseHtml(html).querySelector('section img')
  // The harness's elements are plain markup: the position is read from the style attribute.
  const position = /object-position:\s*([^;"]+)/.exec(img?.getAttribute('style') ?? '')?.[1] ?? ''
  return { html, position, src: new URL(img?.getAttribute('src') ?? 'http://x/') }
}

describe('Image + text, Text over media: Focus mode', () => {
  it.each([
    ['the media slot', false],
    ['the older picture field', true],
  ])(
    'positions %s by the hotspot, measured on the picture the CDN serves',
    async (_name, legacy) => {
      // No crop: the hotspot as a percentage of the whole picture.
      expect((await draw('overlay', { hotspot: HOTSPOT }, legacy)).position).toBe('30% 50%')
      // A crop of 10% off each side: the served picture is 80% wide, so the hotspot (x .3) sits a quarter in.
      expect((await draw('overlay', { crop: CROP, hotspot: HOTSPOT }, legacy)).position).toBe(
        '25% 50%',
      )
    },
  )

  it('is centred with no hotspot, whatever crop is stored: Focus is the hotspot only', async () => {
    expect((await draw('overlay')).position).toBe('')
    const cropped = await draw('overlay', { crop: CROP })
    expect(cropped.position).toBe('')
    // The crop still applies as it always has: the CDN serves the picture cut to it.
    expect(cropped.src.searchParams.get('rect')).not.toBeNull()
  })

  it('draws the covering background, not a fixed shape', async () => {
    const { html } = await draw('overlay', { crop: CROP, hotspot: HOTSPOT })
    expect(html).not.toContain('data-framed-image')
    expect(html).toContain('object-cover')
  })

  it('serves the same stored values as a fixed shape in Side and Stacked, so a layout switch changes only their use', async () => {
    const stored = { crop: CROP, hotspot: HOTSPOT }
    const overlay = await draw('overlay', stored)
    for (const layout of ['side', 'stacked']) {
      const shaped = await draw(layout, stored)
      // A fixed shape: the CDN is asked for the editor's area, so there is nothing for CSS to position.
      expect(shaped.src.searchParams.get('rect')).not.toBeNull()
      expect(shaped.position).toBe('')
    }
    // Back to Text over media: the same values give the same background position.
    expect((await draw('overlay', stored)).position).toBe(overlay.position)
    expect(overlay.position).toBe('25% 50%')
  })
})
