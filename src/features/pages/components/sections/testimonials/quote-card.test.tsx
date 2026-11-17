import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it, vi } from 'vitest'

import { parseHtml } from '@/lib/design/capability-harness'
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

describe('QuoteCard depth', () => {
  const card = (cardDesign?: Record<string, unknown>) => {
    const html = renderToStaticMarkup(
      <QuoteCard item={ITEM as never} cardDesign={cardDesign as never} />,
    )
    const element = parseHtml(html).querySelector('figure')
    return {
      className: element?.className ?? '',
      depth: element?.getAttribute('style')?.match(/--depth-shadow:([^;]*)/)?.[1],
    }
  }

  it('keeps its original shadow while nothing is chosen, reading the site’s Card depth if one is set', () => {
    for (const design of [undefined, {}, { shadow: null, glow: null }]) {
      const { className, depth } = card(design)
      expect(className).toBe(
        'flex h-full w-full flex-col rounded-card bg-surface p-8 shadow-(--card-depth,var(--shadow-card)) ring-1 ring-line',
      )
      expect(depth).toBeUndefined()
    }
  })

  it('draws a chosen level in place of the shadow, replacing the site’s Card depth', () => {
    const { className, depth } = card({ shadow: 'floating' })
    expect(className).toContain('shadow-(--depth-shadow)')
    expect(className).not.toContain('--card-depth')
    expect(depth).toBe('var(--shadow-floating)')
  })

  it('keeps an explicit Soft Soft, through its own token', () => {
    expect(card({ shadow: 'soft' }).depth).toBe('var(--shadow-soft, var(--shadow-card))')
  })

  it('keeps the site’s or original shadow under a glow chosen alone', () => {
    expect(card({ glow: 'strong' }).depth).toMatch(
      /^var\(--card-depth, var\(--shadow-card\)\), var\(--depth-glow-strong\)/,
    )
  })

  it('draws no shadow on a transparent card', () => {
    expect(
      card({ background: { colour: 'transparent' }, shadow: 'raised' }).className,
    ).not.toContain('shadow-')
  })
})
