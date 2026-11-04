import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it, vi } from 'vitest'

import type { SanityImageData } from '@/types/sanity'

import { TeamRow, type Member } from './team-card'

vi.mock('@/config/env', () => ({ projectId: 'p', dataset: 'd' }))
vi.mock('@/config/profile', () => ({ hasTeamProfiles: () => true }))
vi.mock('@/components/motion/hover-lift', () => ({
  HoverLift: ({ children, className }: { children: React.ReactNode; className: string }) => (
    <div className={className}>{children}</div>
  ),
}))
vi.mock('@/components/ui/framed-image', () => ({
  FramedImage: () => <div data-framed-image="" />,
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

const MEMBER = {
  _id: 'm1',
  name: 'Alex',
  slug: 'alex',
  role: 'Designer',
  portrait: {
    alt: 'Alex',
    asset: {
      _id: 'image-abc-1000x1000-jpg',
      metadata: { lqip: null, hasAlpha: false, dimensions: { width: 1000, height: 1000 } },
    },
  } as unknown as SanityImageData,
} as unknown as Member

const draw = (
  portrait?: Parameters<typeof TeamRow>[0]['portrait'],
  design?: Parameters<typeof TeamRow>[0]['design'],
  member: Member = MEMBER,
) =>
  renderToStaticMarkup(
    <TeamRow member={member} headingLevel="h2" portrait={portrait} design={design} />,
  )

const EMPTY = { size: null, ring: null, ringColour: null }
const LEGACY = { appearance: 'circle' } as never

describe('TeamRow portrait', () => {
  it('draws a new list with ProfileImage: Medium, rounded, no ring', () => {
    for (const html of [
      draw(undefined),
      draw(EMPTY),
      draw(undefined, { appearance: null } as never),
    ]) {
      expect(html).toContain('data-profile-image="rounded"')
      expect(html).toContain('size-24 sm:size-32')
      expect(html).toContain('rounded-card')
      expect(html).toContain('sizes="128px"')
      expect(html).not.toContain('image-ring')
      expect(html).not.toContain('data-framed-image')
    }
  })

  it('draws Small and Large from the layout’s own scale', () => {
    expect(draw({ ...EMPTY, size: 'small' } as never)).toContain('size-16 sm:size-24')
    expect(draw({ ...EMPTY, size: 'large' } as never)).toContain('size-32 sm:size-40')
  })

  it('draws a solid and a gradient ring as a hidden decorative layer', () => {
    const solid = draw({ ...EMPTY, ring: 'line' } as never)
    expect(solid).toContain('data-profile-border="line"')
    expect(solid).toContain('<span aria-hidden="true" class="image-ring"></span>')
    expect(draw({ ...EMPTY, ring: 'gradient' } as never)).toContain(
      'data-profile-border="gradient"',
    )
  })

  it('falls back to Medium with no ring for values it does not know', () => {
    const html = draw({ size: 'huge', ring: 'frame', ringColour: null } as never)
    expect(html).toContain('size-24 sm:size-32')
    expect(html).not.toContain('image-ring')
  })

  it('keeps a saved Image design, and ignores a Portrait stored beside it', () => {
    const html = draw({ ...EMPTY, size: 'large', ring: 'line' } as never, LEGACY)
    expect(html).toContain('data-framed-image')
    expect(html).not.toContain('data-profile-image')
    expect(html).not.toContain('image-ring')
  })

  it('treats an Image design of empty values as none', () => {
    expect(
      draw(undefined, { appearance: null, motion: null, customFrameUrl: null } as never),
    ).toContain('data-profile-image="rounded"')
  })

  it('draws with ProfileImage when the Image design is only custom: false, a cleared one', () => {
    const html = draw(
      { ...EMPTY, size: 'large' } as never,
      { custom: false, appearance: null } as never,
    )
    expect(html).toContain('data-profile-image="rounded"')
    expect(html).toContain('size-32 sm:size-40')
    expect(html).not.toContain('data-framed-image')
  })

  it('keeps a genuine Image design that sits beside custom: false', () => {
    const html = draw(undefined, { appearance: 'circle', custom: false } as never)
    expect(html).toContain('data-framed-image')
    expect(html).not.toContain('data-profile-image')
  })

  it('draws no empty placeholder without a portrait, and keeps the name and its link', () => {
    const html = draw({ ...EMPTY, ring: 'line' } as never, undefined, {
      ...MEMBER,
      portrait: null,
    } as never)
    expect(html).not.toContain('data-profile-image')
    expect(html).not.toContain('image-ring')
    expect(html).toContain('href="/team/alex"')
  })

  it('keeps one link per member, whose ring is decoration (structure only; the e2e spec presses Tab)', () => {
    const html = draw({ ...EMPTY, ring: 'gradient' } as never)
    expect(html.match(/<a /g)).toHaveLength(1)
  })
})
