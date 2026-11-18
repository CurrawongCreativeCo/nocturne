import { createElement, type ComponentType } from 'react'
import { describe, expect, it, vi } from 'vitest'

import { parseHtml } from '@/lib/design/capability-harness'
import { FRAMING_RESOLVERS } from '@/lib/sanity/image-frame-geometry'

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
 * Focus mode on the covering backgrounds (task 177): the Hero's Full background and Image with panel, and the
 * Background image every section can have. A background covers its section, so only the hotspot applies, as the
 * picture's `object-position`, measured on the picture the CDN serves (cut to its crop). With no hotspot the picture is
 * centred as it always was, whatever crop is stored (the crop still trims it through the image URL).
 */

const HOTSPOT = { _type: 'sanity.imageHotspot', x: 0.3, y: 0.7, width: 0.3, height: 0.3 }
const CROP = { _type: 'sanity.imageCrop', top: 0, bottom: 0, left: 0.1, right: 0.1 }

async function picture(stored: Record<string, unknown> = {}) {
  return {
    _type: 'image',
    alt: 'A studio',
    asset: { _type: 'reference', _ref: await fixturePictureId() },
    ...stored,
  }
}

/** The first background picture in the section: its position, its URL and the markup around it. */
function read(html: string, selector: string) {
  const img = parseHtml(html).querySelector(selector)
  const position = /object-position:\s*([^;"]+)/.exec(img?.getAttribute('style') ?? '')?.[1] ?? ''
  return { html, position, src: new URL(img?.getAttribute('src') ?? 'http://x/') }
}

async function drawHero(layout: string, stored: Record<string, unknown>, extra = {}) {
  const seed = await gallerySeed('hero', layout)
  const raw = {
    ...seed,
    variant: layout,
    backgroundImage: await picture(stored),
    partMotion: null,
    ...extra,
  } as RawSection
  return read(
    await renderSections(await projectSections([raw]), { belowHeading: true }),
    'section img',
  )
}

describe.each(['overlay', 'full-bleed'])('Hero, %s: Focus mode', (layout) => {
  // Each way the picture can move still sits where the hotspot says: the position is on the <img> in every branch.
  const MOTIONS: [string, Record<string, unknown>][] = [
    ['still', {}],
    ['under the section’s Parallax', { style: { _type: 'sectionStyle', motion: 'parallax' } }],
    ['under the section’s Float', { style: { _type: 'sectionStyle', motion: 'float' } }],
    [
      'with an entrance on the picture',
      { partMotion: { _type: 'object', enabled: true, backgroundPreset: 'fade' } },
    ],
  ]

  it.each(MOTIONS)(
    'positions the picture by its hotspot on the cropped picture, %s',
    async (_name, extra) => {
      // No crop: the hotspot as a percentage of the whole picture. A crop of 10% off each side: a quarter in.
      expect((await drawHero(layout, { hotspot: HOTSPOT }, extra)).position).toBe('30% 70%')
      expect((await drawHero(layout, { crop: CROP, hotspot: HOTSPOT }, extra)).position).toBe(
        '25% 70%',
      )
    },
  )

  it.each(MOTIONS)(
    'is centred with no hotspot, whatever crop is stored, %s',
    async (_name, extra) => {
      expect((await drawHero(layout, {}, extra)).position).toBe('')
      const cropped = await drawHero(layout, { crop: CROP }, extra)
      expect(cropped.position).toBe('')
      // The crop still applies as it always has, through the URL the CDN is asked for.
      expect(cropped.src.searchParams.get('rect')).not.toBeNull()
    },
  )

  it('draws the motion it was given, so the cases above really cover each branch', async () => {
    const stored = { hotspot: HOTSPOT }
    const still = await drawHero(layout, stored)
    const parallax = await drawHero(layout, stored, MOTIONS[1]?.[1])
    const float = await drawHero(layout, stored, MOTIONS[2]?.[1])
    // Parallax wraps the picture in its scaling frame and Float in a larger drifting one; still has neither.
    expect(parallax.html).toContain('parallax-factor')
    expect(float.html).toContain('-inset-5')
    expect(still.html).not.toContain('parallax-factor')
    expect(still.html).not.toContain('-inset-5')
  })
})

/**
 * The Studio offers Focus on the Hero's picture exactly where the renderer draws it as a covering background
 * (FRAMING_RESOLVERS.heroImage, which a shared module may not draw from hero/index.tsx, so this keeps the two in step):
 * Split and Editorial draw themselves, and a layout never set, null, empty or unknown renders Full background.
 */
describe('Hero layout defaults: the editor and the renderer agree', () => {
  const DEFAULTS: [string, string | null | undefined][] = [
    ['never set', undefined],
    ['null', null],
    ['empty', ''],
    ['one this deployment does not know', 'not-a-layout'],
  ]

  it.each(DEFAULTS)(
    '%s renders Full background, positioned by the hotspot, and is offered Focus',
    async (_name, variant) => {
      const seed = await gallerySeed('hero', 'overlay')
      const raw = {
        ...seed,
        variant,
        backgroundImage: await picture({ crop: CROP, hotspot: HOTSPOT }),
        partMotion: null,
      } as RawSection
      const drawn = read(
        await renderSections(await projectSections([raw]), { belowHeading: true }),
        'section img',
      )
      expect(drawn.position).toBe('25% 70%')
      expect(FRAMING_RESOLVERS.heroImage.focus?.({ variant })?.label).toBe('Hero background')
    },
  )

  it('Split draws its picture as a shape, not a covering background, and is not offered Focus', async () => {
    const split = await drawHero('split', { crop: CROP, hotspot: HOTSPOT })
    expect(split.position).toBe('')
    expect(FRAMING_RESOLVERS.heroImage.focus?.({ variant: 'split' })).toBeUndefined()
    expect(FRAMING_RESOLVERS.heroImage.resolve({ variant: 'split' })).toHaveLength(1)
  })

  it('Editorial does not draw the background picture, and is offered neither', async () => {
    const seed = await gallerySeed('hero', 'editorial')
    const raw = {
      ...seed,
      variant: 'editorial',
      backgroundImage: await picture({ crop: CROP, hotspot: HOTSPOT }),
      secondaryImage: null,
    } as RawSection
    const html = await renderSections(await projectSections([raw]), { belowHeading: true })
    expect(parseHtml(html).querySelector('section img')).toBeNull()
    expect(FRAMING_RESOLVERS.heroImage.focus?.({ variant: 'editorial' })).toBeUndefined()
    expect(FRAMING_RESOLVERS.heroImage.resolve({ variant: 'editorial' })).toEqual([])
  })
})

describe('Background image on a section: Focus mode', () => {
  async function drawSection(style: Record<string, unknown>, stored: Record<string, unknown>) {
    const seed = await gallerySeed('richText', null)
    const raw = {
      ...seed,
      style: { _type: 'sectionStyle', image: await picture(stored), ...style },
    } as RawSection
    return read(
      await renderSections(await projectSections([raw]), { belowHeading: true }),
      '[data-section-image] img',
    )
  }

  it.each(['cover', 'screen'])(
    'Fill and Cover the screen (%s) are positioned by the hotspot',
    async (size) => {
      expect((await drawSection({ imageSize: size }, { hotspot: HOTSPOT })).position).toBe(
        '30% 70%',
      )
      expect(
        (await drawSection({ imageSize: size }, { crop: CROP, hotspot: HOTSPOT })).position,
      ).toBe('25% 70%')
    },
  )

  it('Fill is the default, so a picture with no size set is positioned by its hotspot too', async () => {
    expect((await drawSection({}, { hotspot: HOTSPOT })).position).toBe('30% 70%')
  })

  it('is centred with no hotspot, as before, and leaves the crop to the URL', async () => {
    expect((await drawSection({}, {})).position).toBe('')
    const cropped = await drawSection({}, { crop: CROP })
    expect(cropped.position).toBe('')
    expect(cropped.src.searchParams.get('rect')).not.toBeNull()
  })

  it('Show the whole picture is placed by Position, not by the hotspot', async () => {
    const placed = await drawSection(
      { imageSize: 'contain', imageVertical: 'top', imageHorizontal: 'left' },
      { hotspot: HOTSPOT },
    )
    expect(placed.position).toBe('0% 0%')
    // The saved hotspot is kept (nothing clears it) and applies again with Fill.
    expect((await drawSection({ imageSize: 'cover' }, { hotspot: HOTSPOT })).position).toBe(
      '30% 70%',
    )
  })
})
