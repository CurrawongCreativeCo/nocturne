import { createElement, type ComponentProps, type CSSProperties, type ReactNode } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it, vi } from 'vitest'

import { resolvePictureDepth } from '@/lib/sanity/depth-options'
import { FRAMING_RESOLVERS } from '@/lib/sanity/image-frame-geometry'

import { FramedImage } from './framed-image'

// The picture and the lazy Parallax are tested on their own; here they are markers.
vi.mock('./sanity-image', () => ({
  SanityImage: ({
    className,
    fill,
    style,
    placement,
  }: {
    className?: string
    fill?: boolean
    style?: CSSProperties
    placement?: { aspect: number }
  }) =>
    createElement('img', {
      'data-fill': fill ? '' : undefined,
      'data-placement': placement ? String(placement.aspect) : undefined,
      className,
      style,
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
    expect(html).toContain('--framed-scale-md:1.07')
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

  describe('picture depth', () => {
    const depth = resolvePictureDepth({ shadow: 'floating', glow: 'soft' })
    const ANIMATED = { appearance: 'framed', motion: 'subtle' } as const
    // Every way FramedImage draws a picture: plain, clipped, moving, framed.
    const BRANCHES = {
      plain: {},
      clip: { clip: true },
      moving: { design: { motion: 'subtle' } },
      framed: { design: { appearance: 'framed' } },
      'framed and moving': { design: ANIMATED },
      'section parallax': { context: { sectionTravel: 0.1 } },
    } as const

    it('is no different from before while unset, in every branch', () => {
      for (const [name, props] of Object.entries(BRANCHES)) {
        const before = render(props)
        expect(render({ ...props, depth: undefined }), name).toBe(before)
        expect(before, name).not.toContain('depth-filter')
      }
    })

    it('puts the filter on a plain picture’s <img>, which has no box of its own', () => {
      const html = render({ depth })
      expect(html).toMatch(/<img[^>]*class="[^"]*\[filter:var\(--depth-filter\)\]/)
      expect(html).toContain('--depth-filter:')
      expect(html).not.toContain('data-framed-image')
    })

    it('puts it on the still outer box, never on the picture, when there is one', () => {
      for (const [name, props] of Object.entries(BRANCHES)) {
        if (name === 'plain') continue
        const html = render({ ...props, depth })
        const box = /<div[^>]*data-framed-image[^>]*>/.exec(html)?.[0] ?? ''
        expect(box, name).toContain('[filter:var(--depth-filter)]')
        expect(box, name).toContain('--depth-filter:')
        // Nothing inside the box, where Parallax and the scale act, carries the filter.
        expect(html.slice(html.indexOf(box) + box.length), name).not.toContain('depth-filter')
      }
    })

    it('keeps the box’s ratio, place and shape classes unchanged beside the filter', () => {
      const without = render({ design: { appearance: 'circle' }, clip: true })
      const withDepth = render({ design: { appearance: 'circle' }, clip: true, depth })
      expect(withDepth.replace(' [filter:var(--depth-filter)]', '')).toContain(
        /class="([^"]+)"/.exec(without)?.[1] ?? 'missing',
      )
      expect(withDepth).toContain('aspect-square')
      expect(withDepth).toContain('rounded-full')
    })

    it('includes the decorative frame in the shadow by drawing it inside the filtered box', () => {
      const html = render({ design: { appearance: 'framed' }, depth })
      const box = html.indexOf('data-framed-image')
      expect(html.indexOf('data-image-frame')).toBeGreaterThan(box)
    })
  })
})

describe('FramedImage and Adjust picture agree (task 177)', () => {
  const PHOTO = {
    asset: {
      _id: 'image-abc-1200x630-jpg',
      metadata: { dimensions: { width: 1200, height: 630 } },
    },
    crop: { top: 0.1, bottom: 0.1, left: 0.05, right: 0.39 },
    hotspot: { x: 0.33, y: 0.5, width: 0.56, height: 0.8 },
  }
  const ASPECT_CLASS: Record<string, string> = {
    [String(4 / 3)]: 'aspect-[4/3]',
    '1': 'aspect-square',
    [String(4 / 5)]: 'aspect-[4/5]',
    [String(3 / 4)]: 'aspect-[3/4]',
    [String(2 / 3)]: 'aspect-[2/3]',
  }
  const CORNER_CLASS: Record<string, string> = {
    card: 'rounded-card',
    rounded: 'rounded-3xl',
    circle: 'rounded-full',
    arch: 'rounded-t-full',
  }
  const designs = [
    {},
    { appearance: 'rounded' },
    { appearance: 'circle', frameStyle: 'double-line' },
    { appearance: 'arch' },
    { appearance: 'arch', archRatio: '3/4', frameStyle: 'offset-border' },
    { appearance: 'arch', archRatio: '2/3' },
    { appearance: 'framed', frame: 'offset-border' },
    { appearance: 'rounded', frameStyle: 'corner-brackets', frameInset: 0 },
  ]

  for (const design of designs) {
    it(`draws the shape the editor shows: ${JSON.stringify(design)}`, () => {
      const [shape] = FRAMING_RESOLVERS.galleryTile.resolve({
        variant: 'grid',
        imageDesign: design,
      })
      const html = renderToStaticMarkup(
        createElement(FramedImage, {
          image: PHOTO as never,
          design,
          sizes: '100vw',
          clip: true,
          framing: true,
          aspect: '4/3',
        }),
      )
      if (!shape) throw new Error('No tile shape')
      expect(html).toContain(ASPECT_CLASS[String(shape.aspect)])
      expect(html).toContain(`isolate overflow-hidden bg-surface-alt ${CORNER_CLASS[shape.corner]}`)
      // Served as the editor's area at the same ratio.
      expect(html).toContain(`data-placement="${shape.aspect}"`)
    })
  }

  it('keeps today’s URL and position for a photo with no crop or hotspot', () => {
    const html = renderToStaticMarkup(
      createElement(FramedImage, {
        image: { asset: PHOTO.asset },
        sizes: '100vw',
        clip: true,
        framing: true,
        aspect: '4/3',
      }),
    )
    expect(html).not.toContain('data-placement')
  })

  it('serves nothing new without `framing`, whatever is stored', () => {
    const html = renderToStaticMarkup(
      createElement(FramedImage, {
        image: PHOTO as never,
        sizes: '100vw',
        clip: true,
        aspect: '4/3',
      }),
    )
    expect(html).not.toContain('data-placement')
  })

  it('reserves an offset border’s reach in a flow-root wrapper, and not when overlap is allowed', () => {
    const render = (design: Record<string, unknown>) =>
      renderToStaticMarkup(
        createElement(FramedImage, {
          image: PHOTO as never,
          design,
          sizes: '100vw',
          clip: true,
          aspect: '4/3',
        }),
      )
    const reserved = render({ frameStyle: 'offset-border' })
    expect(reserved).toContain('data-frame-room=""')
    expect(reserved).toContain('width:calc((100% - 1px) / 1.05)')
    expect(render({ frameStyle: 'offset-border', frameOverlap: true })).not.toContain(
      'data-frame-room',
    )
    expect(render({ frameStyle: 'thin-line' })).not.toContain('data-frame-room')
  })
})
