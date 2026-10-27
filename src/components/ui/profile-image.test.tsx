import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it, vi } from 'vitest'

import { PROFILE_FRAME_INSET_PCT } from '@/lib/sanity/image-frame-geometry'
import {
  PROFILE_BORDERS,
  PROFILE_IMAGE_SHAPES,
  PROFILE_IMAGE_SIZES,
  resolveProfileImage,
} from '@/lib/sanity/profile-image-options'
import type { SanityImageData } from '@/types/sanity'

import { ProfileImage, type ProfileImageScale } from './profile-image'

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

const SCALE: ProfileImageScale = {
  box: { small: 'size-16', medium: 'size-24', large: 'size-32 sm:size-36' },
  height: { small: 'h-16', medium: 'h-24', large: 'h-32 sm:h-36' },
}
const FRAME_URL = 'https://cdn.sanity.io/files/p/d/frame.svg'
const IMAGE = {
  alt: 'Portrait',
  asset: {
    _id: 'image-abc-1000x1500-jpg',
    metadata: { lqip: null, hasAlpha: false, dimensions: { width: 1000, height: 1500 } },
  },
} as unknown as SanityImageData

const draw = (input: Parameters<typeof resolveProfileImage>[0]) =>
  renderToStaticMarkup(
    <ProfileImage image={IMAGE} design={resolveProfileImage(input)} scale={SCALE} />,
  )

describe('ProfileImage', () => {
  it('draws nothing without an asset', () => {
    expect(
      renderToStaticMarkup(
        <ProfileImage image={null} design={resolveProfileImage(undefined)} scale={SCALE} />,
      ),
    ).toBe('')
  })

  // The classes and requested sizes for every design, held steady across the move onto the shared
  // geometry (lib/sanity/image-frame-geometry.ts): any change to this snapshot is a visible change.
  it.each(PROFILE_IMAGE_SHAPES)('draws every design as it always did for %s', (imageShape) => {
    const html: Record<string, string> = {}
    for (const imageSize of PROFILE_IMAGE_SIZES) {
      for (const border of PROFILE_BORDERS) {
        html[`${imageSize} ${border}`] = draw({
          imageShape,
          imageSize,
          border,
          borderWidth: 'medium',
          borderGap: 'large',
          frameUrl: FRAME_URL,
        })
      }
    }
    expect(html).toMatchSnapshot()
  })

  const withFraming = {
    ...IMAGE,
    crop: { top: 0.1, bottom: 0.3, left: 0, right: 0 },
    hotspot: { x: 0.5, y: 0.4, width: 1, height: 0.6 },
  } as unknown as SanityImageData
  const src = (html: string) => /src="([^"]+)"/.exec(html)?.[1] ?? ''

  it('serves the stored crop in a circle and a rounded square', () => {
    for (const imageShape of ['circle', 'rounded']) {
      const html = renderToStaticMarkup(
        <ProfileImage
          image={withFraming}
          design={resolveProfileImage({ imageShape })}
          scale={SCALE}
        />,
      )
      expect(src(html)).toContain('rect=50,150,900,900')
      expect(src(html)).toContain('w=256&amp;h=256&amp;fit=crop')
    }
  })

  it('shows Logo, uncropped whole, with no rect, whatever is stored (rule 4)', () => {
    const html = renderToStaticMarkup(
      <ProfileImage
        image={withFraming}
        design={resolveProfileImage({ imageShape: 'natural' })}
        scale={SCALE}
      />,
    )
    expect(src(html)).not.toContain('rect=')
    expect(src(html)).not.toContain('fit=crop')
    expect(src(html)).toContain('h=256')
    expect(html).toContain('object-contain')
    expect(draw({ imageShape: 'natural' })).toBe(
      renderToStaticMarkup(
        <ProfileImage
          image={withFraming}
          design={resolveProfileImage({ imageShape: 'natural' })}
          scale={SCALE}
        />,
      ),
    )
  })

  it("insets a framed picture by the geometry's 14%", () => {
    expect(PROFILE_FRAME_INSET_PCT).toBe(14)
    expect(draw({ border: 'frame', frameUrl: FRAME_URL })).toContain('inset-[14%]')
  })
})

describe('ProfileImage at avatar sizes', () => {
  const AVATAR: ProfileImageScale = {
    ...SCALE,
    pixels: { small: 40, medium: 48, large: 64 },
  }
  const avatar = (input: Parameters<typeof resolveProfileImage>[0]) =>
    renderToStaticMarkup(
      <ProfileImage image={IMAGE} design={resolveProfileImage(input)} scale={AVATAR} />,
    )

  it('asks the image CDN for twice the drawn width, not the Link list’s widths', () => {
    expect(avatar({ imageSize: 'small' })).toContain('sizes="40px"')
    expect(avatar(undefined)).toContain('sizes="48px"')
    expect(avatar({ imageSize: 'large' })).toContain('sizes="64px"')
    expect(avatar(undefined)).toContain('width="96"')
  })

  it('draws a solid ring around a circle, and no ring by default', () => {
    expect(avatar(undefined)).not.toContain('image-ring')
    expect(avatar({ border: 'line' })).toContain('image-ring')
  })
})
