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

const draw = (portrait?: Parameters<typeof TeamRow>[0]['portrait']) =>
  renderToStaticMarkup(<TeamRow member={MEMBER} headingLevel="h2" portrait={portrait} />)

describe('TeamRow portrait', () => {
  it('keeps the Image design picture until a size or ring is chosen', () => {
    for (const html of [draw(undefined), draw({ size: null, ring: null, ringColour: null })]) {
      expect(html).toContain('data-framed-image')
      expect(html).not.toContain('data-profile-image')
    }
  })

  it('draws a Profile image at the chosen size and ring', () => {
    const html = draw({ size: 'large', ring: 'line', ringColour: null } as never)
    expect(html).toContain('data-profile-image="rounded"')
    expect(html).toContain('size-32 sm:size-40')
    expect(html).toContain('rounded-card')
    expect(html).not.toContain('data-framed-image')
  })

  it('keeps one link per member: the ring is decoration', () => {
    const html = draw({ size: 'small', ring: 'gradient', ringColour: null } as never)
    expect(html.match(/<a /g)).toHaveLength(1)
    expect(html).toContain('aria-hidden="true"')
  })
})
