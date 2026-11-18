import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it, vi } from 'vitest'

import { FRAMING_RESOLVERS } from '@/lib/sanity/image-frame-geometry'
import { visibleArea } from '@/lib/sanity/image-framing'
import type { SanityImageData } from '@/types/sanity'

import { TeamCard, type Member } from './team-card'

/**
 * "Adjust picture" on a team portrait (task 177) against what a Team card serves. The portrait is one field on the
 * member, drawn in every Team section whatever its Image design, so the editor previews each shape a card can take
 * (FRAMING_RESOLVERS.teamPortrait). For each design, the card is rendered with a real adjusted portrait and the URL it
 * asks the CDN for must be the area the editor shows for that shape: the same rect, cut at the shape's own ratio.
 */

vi.mock('@/config/env', () => ({ projectId: 'p', dataset: 'd' }))
vi.mock('@/config/profile', () => ({ hasTeamProfiles: () => true }))
vi.mock('@/components/motion/hover-lift', () => ({
  HoverLift: ({ children, className }: { children: React.ReactNode; className: string }) => (
    <div className={className}>{children}</div>
  ),
}))
vi.mock('@/components/motion/parallax-lazy', () => ({
  LazyParallax: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}))
vi.mock('next/link', () => ({
  default: ({ children, href, className }: Record<string, string>) => (
    <a href={href} className={className}>
      {children}
    </a>
  ),
}))
vi.mock('next-sanity/image', () => ({
  Image: (props: Record<string, string | number | undefined>) => {
    const { src, width, height, sizes, className } = props as Record<string, string>
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img src={src} width={width} height={height} sizes={sizes} className={className} alt="" />
    )
  },
}))

const DIMENSIONS = { width: 1200, height: 630 }
// What Adjust picture stores for the square card when zoomed in on the left (as tests/e2e/fixtures ADJUSTED_TILE).
const CROP = { _type: 'sanity.imageCrop', top: 0.1, bottom: 0.1, left: 0.05, right: 0.39 }
const HOTSPOT = { _type: 'sanity.imageHotspot', x: 0.33, y: 0.5, width: 0.56, height: 0.8 }

const portrait = (framing: object = {}, size = DIMENSIONS) =>
  ({
    alt: 'Alex',
    asset: {
      _id: `image-abc-${size.width}x${size.height}-jpg`,
      metadata: { lqip: null, hasAlpha: false, dimensions: size },
    },
    ...framing,
  }) as unknown as SanityImageData

const member = (framing: object = {}, size = DIMENSIONS) =>
  ({
    _id: 'm1',
    name: 'Alex',
    slug: 'alex',
    role: 'Designer',
    portrait: portrait(framing, size),
  }) as unknown as Member

const draw = (
  design: object | undefined,
  framing: object = { crop: CROP, hotspot: HOTSPOT },
  size = DIMENSIONS,
) => {
  const html = renderToStaticMarkup(
    <TeamCard member={member(framing, size)} headingLevel="h2" design={design as never} />,
  )
  const img = /<img[^>]*src="([^"]+)"[^>]*>/.exec(html)
  const url = new URL((img?.[1] ?? '').replaceAll('&amp;', '&'))
  return { html, query: url.searchParams }
}

/** The editor's preview for a labelled shape: the area it shows, as the CDN is asked for it. */
const preview = (label: string, framing: object = { crop: CROP, hotspot: HOTSPOT }) => {
  const shape = FRAMING_RESOLVERS.teamPortrait
    .resolve(undefined)
    .find((each) => each.label === label)
  if (!shape) throw new Error(`The editor has no preview called "${label}"`)
  const area = visibleArea({ aspect: shape.aspect }, { asset: DIMENSIONS, ...framing })
  if (!area) throw new Error(`No area is served for "${label}"`)
  return { shape, area }
}
const rectOf = (area: { left: number; top: number; width: number; height: number }) =>
  `${area.left},${area.top},${area.width},${area.height}`

describe('a Team card serves the area the editor shows for its shape', () => {
  it('Standard, nothing chosen: the square at the top of the card', () => {
    const { query } = draw(undefined)
    const { area } = preview('Team grid and slider card')
    expect(query.get('rect')).toBe(rectOf(area))
    expect([query.get('w'), query.get('h')]).toEqual(['600', '600'])
  })

  it.each([
    ['Rounded', { appearance: 'rounded' }, 'Team card in a Rounded section'],
    ['Circle', { appearance: 'circle' }, 'Team card in a Circle section'],
  ])('%s: a square, in its own outline', (_name, design, label) => {
    const { query } = draw(design)
    const { area, shape } = preview(label)
    expect(shape.aspect).toBe(1)
    expect(query.get('rect')).toBe(rectOf(area))
    expect([query.get('w'), query.get('h')]).toEqual(['600', '600'])
  })

  it.each([
    ['Arch, nothing chosen (4:5)', { appearance: 'arch' }, '4:5', ['600', '750']],
    ['Arch 4:5', { appearance: 'arch', archRatio: '4/5' }, '4:5', ['600', '750']],
    ['Arch 3:4', { appearance: 'arch', archRatio: '3/4' }, '3:4', ['600', '800']],
    ['Arch 2:3', { appearance: 'arch', archRatio: '2/3' }, '2:3', ['600', '900']],
  ])(
    '%s: the narrower cut of the same crop, at the arch’s own ratio',
    (_name, design, title, size) => {
      const { query, html } = draw(design)
      const { area, shape } = preview(`Team card in an Arch section, ${title}`)
      // The arch is taller than the square, so the editor and the CDN both trim it from the sides of the crop.
      expect(query.get('rect')).toBe(rectOf(area))
      expect([query.get('w'), query.get('h')]).toEqual(size)
      expect(Number(query.get('w')) / Number(query.get('h'))).toBeCloseTo(shape.aspect, 2)
      // It is not the square's area: the arch really does show less of the width.
      const square = rectOf(preview('Team grid and slider card').area)
      expect(query.get('rect')).not.toBe(square)
      // The box the card draws it in has that ratio too.
      expect(html).toMatch(new RegExp(`aspect-\\[${title.replace(':', '/')}\\]`))
    },
  )

  it('a portrait with nothing stored keeps today’s URL, and its box shows the editor’s default area', () => {
    const { query } = draw({ appearance: 'arch', archRatio: '2/3' }, {})
    // Nothing stored: the card asks for the square cut it always did and its 2:3 box centres that (object-fit), so what
    // shows is the middle 2:3 of the upload, which is where the editor starts and what Reset returns to.
    expect([query.get('w'), query.get('h')]).toEqual(['600', '600'])
    const [left = 0, top = 0, width = 0, height = 0] = (query.get('rect') ?? '')
      .split(',')
      .map(Number)
    const shownWidth = Math.round(height * (2 / 3))
    const shown = {
      left: left + Math.round((width - shownWidth) / 2),
      top,
      width: shownWidth,
      height,
    }
    expect(rectOf(shown)).toBe(rectOf(preview('Team card in an Arch section, 2:3', {}).area))
  })
})

describe('the editor’s outlines for a Team card are what the card serves (a 640 x 800 portrait)', () => {
  const size = { width: 640, height: 800 }
  const ARCHES = [
    ['4/5', 'Team card in an Arch section, 4:5'],
    ['3/4', 'Team card in an Arch section, 3:4'],
    ['2/3', 'Team card in an Arch section, 2:3'],
  ] as const
  const shapes = FRAMING_RESOLVERS.teamPortrait.resolve(undefined)
  const shapeOf = (label: string) => {
    const shape = shapes.find((each) => each.label === label)
    if (!shape) throw new Error(`No preview called "${label}"`)
    return shape
  }
  const [main] = shapes
  if (!main) throw new Error('No main preview')

  /**
   * The area the editor's outline for a shape shows (the Studio feature, which this one may not import, draws it
   * from this same `visibleArea`; its own test pins the pixels listed below), for the framing it would store.
   */
  const outlineArea = (label: string, pending: { crop?: object; hotspot?: object } | undefined) =>
    visibleArea(shapeOf(label), { asset: size, ...(pending as object) })

  // The URL builder leaves `rect` out when the area is the whole picture.
  const rectOfQuery = (query: URLSearchParams) =>
    (query.get('rect') ?? `0,0,${size.width},${size.height}`).split(',').map(Number)
  const asRect = (
    area: { left: number; top: number; width: number; height: number } | null | undefined,
  ) => (area ? [area.left, area.top, area.width, area.height] : undefined)

  it.each(ARCHES)(
    'a centred hotspot and no crop, Arch %s: the whole picture, not the square',
    (ratio, label) => {
      const framing = {
        hotspot: { _type: 'sanity.imageHotspot', x: 0.5, y: 0.5, width: 0.5, height: 0.5 },
      }
      const { query } = draw({ appearance: 'arch', archRatio: ratio }, framing, size)
      // The card serves it, and the editor's outline is that same area.
      expect(rectOfQuery(query)).toEqual(asRect(outlineArea(label, framing)))
      // At the width it asks for and the height of the area it is served, so the CDN cuts nothing more.
      const [, , width = 0, height = 0] = rectOfQuery(query)
      expect([query.get('w'), query.get('h')]).toEqual([
        '600',
        String(Math.round((600 * height) / width)),
      ])
      // At 4:5 that is the picture's whole 640 x 800: taller than the 640 x 640 square the main preview shows.
      if (ratio === '4/5') expect(rectOfQuery(query)).toEqual([0, 0, 640, 800])
    },
  )

  it.each(ARCHES)(
    'a tall saved crop, Arch %s: cut from the crop, as the outline shows',
    (ratio, label) => {
      const framing = {
        crop: { _type: 'sanity.imageCrop', left: 0.1, right: 0.1, top: 0, bottom: 0 },
      }
      const { query } = draw({ appearance: 'arch', archRatio: ratio }, framing, size)
      expect(rectOfQuery(query)).toEqual(asRect(outlineArea(label, framing)))
      // The pixels the editor's outline test pins for the same crop.
      if (ratio === '4/5') expect(rectOfQuery(query)).toEqual([64, 80, 512, 640])
      if (ratio === '2/3') expect(rectOfQuery(query)).toEqual([64, 16, 512, 768])
      // Never wider than the crop (512), and taller than the 512 x 512 square cut of it.
      const [left = 0, , width = 0, height = 0] = rectOfQuery(query)
      expect(left).toBeGreaterThanOrEqual(64)
      expect(width).toBe(512)
      expect(height).toBeGreaterThan(512)
    },
  )

  it('nothing stored: the square the card always asked for, centred in the arch', () => {
    const { query } = draw({ appearance: 'arch', archRatio: '4/5' }, {}, size)
    expect([query.get('w'), query.get('h')]).toEqual(['600', '600'])
    const [left = 0, top = 0, width = 0, height = 0] = rectOfQuery(query)
    // The served square is 640 x 640 from the centre; the 4:5 box shows its middle 512 x 640.
    const shown = { left: left + Math.round((width - 512) / 2), top, width: 512, height }
    expect(asRect(shown)).toEqual(
      asRect(outlineArea('Team card in an Arch section, 4:5', undefined)),
    )
  })
})
