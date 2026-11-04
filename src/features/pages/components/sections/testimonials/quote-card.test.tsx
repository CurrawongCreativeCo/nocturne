import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it, vi } from 'vitest'

import type { SanityImageData } from '@/types/sanity'

import { QuoteCard } from './quote-card'

vi.mock('@/config/env', () => ({ projectId: 'p', dataset: 'd' }))
// next/image needs the Next.js runtime: a plain <img> keeps the URL, size hint and classes.
vi.mock('next-sanity/image', () => ({
  Image: (props: Record<string, string | number | undefined>) => {
    const { src, width, height, sizes, className } = props as Record<string, string>
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img src={src} width={width} height={height} sizes={sizes} className={className} alt="" />
    )
  },
}))

const AVATAR = {
  alt: 'Sam',
  asset: {
    _id: 'image-abc-1000x1000-jpg',
    metadata: { lqip: null, hasAlpha: false, dimensions: { width: 1000, height: 1000 } },
  },
} as unknown as SanityImageData

const ITEM = { _key: 'a', quote: 'Great work.', name: 'Sam', role: 'CEO', avatar: AVATAR }
const draw = (avatarDesign?: Parameters<typeof QuoteCard>[0]['avatarDesign'], item = ITEM) =>
  renderToStaticMarkup(<QuoteCard item={item as never} avatarDesign={avatarDesign} />)

describe('QuoteCard avatar', () => {
  it('draws the 48 px circle, with no ring, when nothing is set', () => {
    for (const html of [draw(undefined), draw({ size: null, ring: null, ringColour: null })]) {
      expect(html).toContain('data-profile-image="circle"')
      expect(html).toContain('size-12')
      expect(html).toContain('rounded-full')
      expect(html).toContain('sizes="48px"')
      expect(html).not.toContain('image-ring')
    }
  })

  it('follows the chosen size', () => {
    expect(draw({ size: 'small' } as never)).toContain('size-10')
    expect(draw({ size: 'large' } as never)).toContain('size-16')
  })

  it('draws a ring as one decorative layer that keyboard and screen-reader users never meet', () => {
    const html = draw({ ring: 'line' } as never)
    expect(html).toContain('data-profile-border="line"')
    expect(html).toContain('<span aria-hidden="true" class="image-ring"></span>')
    expect(html).not.toMatch(/tabindex|<a |<button/)
  })

  it('leaves no empty circle without a picture', () => {
    const html = draw({ ring: 'line' } as never, { ...ITEM, avatar: null as never })
    expect(html).not.toContain('data-profile-image')
    expect(html).toContain('Sam')
  })
})
