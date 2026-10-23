import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it, vi } from 'vitest'

import { servedThumbnail } from '@/lib/sanity/link-thumbnail-framing'
import type { SanityImageData } from '@/types/sanity'

import { SanityImage } from './sanity-image'

vi.mock('@/config/env', () => ({ projectId: 'p', dataset: 'd' }))
vi.mock('next-sanity/image', () => ({
  Image: (props: Record<string, string | number | undefined>) => {
    const { src, width, height, sizes } = props as Record<string, string>
    // A stand-in for next/image, which needs the Next.js runtime.
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={src} width={width} height={height} sizes={sizes} alt="" />
  },
}))

const picture = (width: number, height: number, framing: object = {}) =>
  ({
    asset: {
      _id: `image-abc-${width}x${height}-jpg`,
      metadata: { lqip: null, hasAlpha: false, dimensions: { width, height } },
    },
    ...framing,
  }) as unknown as SanityImageData

const url = (html: string) => (/src="([^"]+)"/.exec(html)?.[1] ?? '').replaceAll('&amp;', '&')
const params = (html: string) => new URL(url(html)).searchParams
const draw = (image: SanityImageData, looks: Parameters<typeof servedThumbnail>[0]) => {
  const served = servedThumbnail(looks)
  return renderToStaticMarkup(
    <SanityImage
      image={image}
      alt=""
      width={served.width}
      height={served.height}
      placement={served}
      sizes={served.sizes}
    />,
  )
}

describe('SanityImage with a placement', () => {
  it('serves a square thumbnail as an explicit rect at 2x its drawn size, not the original', () => {
    const query = params(draw(picture(3000, 2000), { layout: 'stacked' }))
    // Today's framing: the middle 4:3 of the upload (3000 × 2000 → 2667 × 2000), then its middle square, to a pixel.
    expect(query.get('rect')).toBe('501,0,2000,2000')
    expect([query.get('w'), query.get('h'), query.get('fit'), query.get('auto')]).toEqual([
      '80',
      '80',
      'crop',
      'format',
    ])
  })

  it('cuts a portrait upload the way 600 × 450 and CSS did', () => {
    const query = params(draw(picture(1000, 1600), { layout: 'cards' }))
    // 1000 × 750 from the middle, then its middle square: 750 × 750.
    expect(query.get('rect')).toBe('125,425,750,750')
    expect([query.get('w'), query.get('h')]).toEqual(['128', '128'])
  })

  it('serves a hotspot-only picture cut to the shape around the hotspot (rule 2)', () => {
    const hotspot = { x: 0.2, y: 0.5, width: 0.2, height: 0.2 }
    const query = params(draw(picture(3000, 2000, { hotspot }), { layout: 'stacked' }))
    expect(query.get('rect')).toBe('0,0,2000,2000')
  })

  it('serves an adjusted picture from its crop and hotspot (rule 1)', () => {
    const crop = { left: 0.5, right: 0.1, top: 0.25, bottom: 0.25 }
    const hotspot = { x: 0.7, y: 0.5, width: 0.4, height: 0.5 }
    const query = params(draw(picture(3000, 2000, { crop, hotspot }), { layout: 'stacked' }))
    // The crop box is 1200 × 1000: a 1:1 cut of it, centred on the hotspot (x 2100) and kept inside the crop.
    expect(query.get('rect')).toBe('1600,500,1000,1000')
  })

  it('serves a featured Image-focused card as 16:9 and the others as 4:3', () => {
    const large = { layout: 'cards', thumbnailSize: 'large' }
    const featured = params(draw(picture(3000, 2000), { ...large, featured: true }))
    expect([featured.get('w'), featured.get('h')]).toEqual(['1440', '810'])
    // The middle 16:9 of the old 4:3 cut: what the CSS `aspect-video` tile showed.
    expect(featured.get('rect')).toBe('167,250,2667,1500')
    const other = params(draw(picture(3000, 2000), large))
    expect([other.get('w'), other.get('h')]).toEqual(['1440', '1080'])
    expect(other.get('rect')).toBe('167,0,2667,2000')
  })

  it('never asks for more than 2x the drawn size', () => {
    for (const looks of [
      { layout: 'stacked' },
      { layout: 'cards' },
      { layout: 'stacked', rowStyle: 'glass' },
    ]) {
      const served = servedThumbnail(looks)
      const drawn = Number(/(\d+)px$/.exec(served.sizes)?.[1])
      expect(served.width).toBeLessThanOrEqual(drawn * 2)
      expect(served.height).toBeLessThanOrEqual(drawn * 2)
    }
  })

  it('serves the old fit-crop request when there is no placement, as every other picture does', () => {
    const html = renderToStaticMarkup(
      <SanityImage image={picture(3000, 2000)} alt="" width={600} height={450} />,
    )
    expect(params(html).get('rect')).toBe('167,0,2667,2000')
  })
})
