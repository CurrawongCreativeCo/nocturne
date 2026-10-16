import { createElement, type ComponentProps, type ReactNode } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it, vi } from 'vitest'

import { FramedImage } from './framed-image'

// The picture and the lazy Parallax are tested on their own; here they are markers.
vi.mock('./sanity-image', () => ({
  SanityImage: ({ className, fill }: { className?: string; fill?: boolean }) =>
    createElement('img', {
      'data-fill': fill ? '' : undefined,
      className,
      alt: 'A team at work',
    }),
}))
vi.mock('@/components/motion/parallax-lazy', () => ({
  LazyParallax: ({
    speed,
    from,
    className,
    children,
  }: {
    speed: number
    from: string
    className: string
    children: ReactNode
  }) => createElement('div', { 'data-parallax': speed, 'data-from': from, className }, children),
}))

const IMAGE = { asset: { _id: 'image-abc-1200x900-jpg' } } as never
const CDN = 'https://cdn.sanity.io/files/abc/production/leaf-1.svg'

const render = (props: Partial<ComponentProps<typeof FramedImage>> = {}) =>
  renderToStaticMarkup(createElement(FramedImage, { image: IMAGE, sizes: '50vw', ...props }))

describe('FramedImage', () => {
  it('is exactly a plain picture with the site’s corners when nothing is designed', () => {
    const html = render()
    expect(html).toBe(render({ design: {} }))
    expect(html).toContain('rounded-card')
    expect(html).toContain('object-cover')
    expect(html).not.toContain('data-framed-image')
    expect(html).not.toContain('data-parallax')
    expect(html).not.toContain('<svg')
  })

  it('cuts a plain picture to its shape, and forces the ratio of a circle and an arch', () => {
    expect(render({ design: { appearance: 'circle' }, aspect: '4/3' })).toMatch(
      /aspect-square[^"]*rounded-full|rounded-full[^"]*aspect-square/,
    )
    expect(render({ design: { appearance: 'arch' } })).toContain('aspect-[4/5]')
    expect(render({ design: { appearance: 'rounded' } })).toContain('rounded-3xl')
    expect(render({ design: { appearance: 'square' } })).not.toContain('rounded')
  })

  it('keeps the shape of an older hero value until the design names one', () => {
    expect(render({ context: { fallbackShape: 'circle' } })).toContain('rounded-full')
    expect(
      render({ design: { appearance: 'arch' }, context: { fallbackShape: 'circle' } }),
    ).toContain('rounded-t-full')
  })

  it('moves only the picture: a still box and clip, the picture inside Parallax, scaled', () => {
    const html = render({ design: { motion: 'subtle' }, aspect: '4/3' })
    expect(html).toContain('data-framed-image="standard"')
    expect(html).toContain('data-parallax="0.15"')
    // The box and the clip are outside Parallax; the picture is inside it.
    const box = html.indexOf('data-framed-image=')
    const clip = html.indexOf('overflow-hidden')
    const parallax = html.indexOf('data-parallax')
    const picture = html.indexOf('<img')
    expect(box).toBeLessThan(clip)
    expect(clip).toBeLessThan(parallax)
    expect(parallax).toBeLessThan(picture)
    expect(html).toContain('data-fill')
    // Scaled by twice the travel from md up, a little less on a phone, and only where scripting is on.
    expect(html).toContain('--framed-scale-md:1.06')
    expect(html).toContain('--framed-scale:1.05')
    expect(html).toContain('[@media(scripting:enabled)]')
    expect(html).toContain('motion-safe:')
  })

  it('rests a first section’s picture at the top, and moves the other way for direction up', () => {
    expect(render({ design: { motion: 'subtle' }, context: { isFirst: true } })).toContain(
      'data-from="top"',
    )
    expect(render({ design: { motion: 'subtle', custom: true, direction: 'up' } })).toContain(
      'data-parallax="-0.15"',
    )
  })

  it('uses a section’s own parallax while the picture’s motion is None', () => {
    expect(render({ context: { sectionTravel: 0.06 } })).toContain('data-parallax="0.3"')
    expect(render({ design: { motion: 'subtle' }, context: { sectionTravel: 0.06 } })).toContain(
      'data-parallax="0.15"',
    )
  })

  it('draws a built-in frame over the picture, still, hidden from assistive technology', () => {
    const html = render({ design: { appearance: 'framed', frame: 'double-line' } })
    expect(html).toContain('data-image-frame="double-line"')
    expect(html).toMatch(/<svg[^>]*aria-hidden="true"/)
    expect(html).toContain('pointer-events-none')
    expect(html).toContain('preserveAspectRatio="none"')
    expect(html).toContain('vector-effect="non-scaling-stroke"')
    expect(html).toContain('stroke="currentColor"')
    expect(html).toContain('text-accent')
    // After the clipped picture, so it sits on top.
    expect(html.indexOf('<img')).toBeLessThan(html.indexOf('data-image-frame'))
    // No motion: nothing moves, and the picture is not scaled.
    expect(html).not.toContain('data-parallax')
    expect(html).not.toContain('framed-scale')
  })

  it('has a frame in every built-in style and a token colour', () => {
    for (const frame of [
      'thin-line',
      'double-line',
      'offset-border',
      'organic-brush',
      'corner-brackets',
    ]) {
      const html = render({
        design: { appearance: 'framed', frame, frameColour: 'highlight', frameInset: 6 },
      })
      expect(html).toContain(`data-image-frame="${frame}"`)
      expect(html).toContain('text-highlight')
    }
  })

  it('shows no frame unless the appearance is Framed or the frame is None', () => {
    expect(render({ design: { appearance: 'circle', frame: 'thin-line' } })).not.toContain(
      'data-image-frame',
    )
    expect(render({ design: { appearance: 'framed', frame: 'none' } })).not.toContain(
      'data-image-frame',
    )
  })

  it('uses a custom frame as a mask on a token-coloured div, never inline', () => {
    const html = render({
      design: { appearance: 'framed', frame: 'custom', customFrameUrl: CDN, frameColour: 'ink' },
    })
    expect(html).toContain('data-image-frame="custom"')
    expect(html).toContain(`mask-image:url(&quot;${CDN}&quot;)`)
    expect(html).toContain('bg-ink')
    expect(html).toContain('aria-hidden="true"')
    expect(html).not.toMatch(/<svg/)
  })

  it('draws a custom frame from nowhere else than the CDN', () => {
    const html = render({
      design: {
        appearance: 'framed',
        frame: 'custom',
        customFrameUrl: 'https://evil.example/frame.svg',
      },
    })
    expect(html).not.toContain('evil.example')
    expect(html).toContain('data-image-frame="thin-line"')
  })

  it('keeps a plain picture’s hover zoom inside its shape when asked to clip', () => {
    const html = render({ clip: true, imageClassName: 'group-hover:scale-105', aspect: '4/3' })
    expect(html).toContain('overflow-hidden')
    expect(html).toContain('rounded-card')
    expect(html).toContain('group-hover:scale-105')
  })
})
