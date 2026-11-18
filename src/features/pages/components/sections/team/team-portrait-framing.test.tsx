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

const portrait = (framing: object = {}) =>
  ({
    alt: 'Alex',
    asset: {
      _id: 'image-abc-1200x630-jpg',
      metadata: { lqip: null, hasAlpha: false, dimensions: DIMENSIONS },
    },
    ...framing,
  }) as unknown as SanityImageData

const member = (framing: object = {}) =>
  ({
    _id: 'm1',
    name: 'Alex',
    slug: 'alex',
    role: 'Designer',
    portrait: portrait(framing),
  }) as unknown as Member

const draw = (design: object | undefined, framing: object = { crop: CROP, hotspot: HOTSPOT }) => {
  const html = renderToStaticMarkup(
    <TeamCard member={member(framing)} headingLevel="h2" design={design as never} />,
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
