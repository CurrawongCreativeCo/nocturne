import { describe, expect, it } from 'vitest'

import { FRAMING_RESOLVERS } from './image-frame-geometry'
import {
  boxAt,
  fromImage,
  servedRect,
  toCrop,
  visibleArea,
  type AssetSize,
  type Rect,
} from './image-framing'
import {
  THUMBNAIL_DEFAULT_ASPECT,
  servedThumbnail,
  thumbnailKey,
  thumbnailShapes,
  thumbnailSpot,
  type ThumbnailKey,
  type ThumbnailLooks,
} from './link-thumbnail-framing'

function must<T>(value: T | null | undefined): T {
  if (value === null || value === undefined) throw new Error('Expected a value')
  return value
}

const LOOKS: Record<ThumbnailKey, ThumbnailLooks> = {
  minimal: { layout: 'stacked' },
  glass: { layout: 'stacked', rowStyle: 'glass' },
  cards: { layout: 'cards' },
  image: { layout: 'cards', thumbnailSize: 'large' },
  featured: { layout: 'cards', thumbnailSize: 'large', featured: true },
}
const KEYS = Object.keys(LOOKS) as ThumbnailKey[]

const UPLOADS: Record<string, AssetSize> = {
  landscape: { width: 3000, height: 2000 },
  'near-square': { width: 1000, height: 1100 },
  portrait: { width: 1000, height: 1600 },
}

describe('the layout map', () => {
  it.each(KEYS)('names %s', (key) => {
    expect(thumbnailKey(LOOKS[key])).toBe(key)
  })

  it('draws no thumbnail in Editorial or Compact', () => {
    expect(thumbnailSpot({ layout: 'editorial' })).toBeNull()
    expect(thumbnailSpot({ layout: 'compact', thumbnailSize: 'large' })).toBeNull()
    expect(thumbnailShapes({ layout: 'compact' })).toEqual([])
  })

  it('is Minimal when nothing is set, and the featured flag only matters for large cards', () => {
    expect(thumbnailKey({})).toBe('minimal')
    expect(thumbnailKey({ layout: 'stacked', featured: true })).toBe('minimal')
    expect(thumbnailKey({ layout: 'cards', featured: true })).toBe('cards')
    expect(thumbnailKey({ layout: 'stacked', rowStyle: 'solid', thumbnailSize: 'large' })).toBe(
      'minimal',
    )
  })

  it.each(KEYS)('asks the CDN for the ratio it draws, at a whole-pixel size, for %s', (key) => {
    const { served } = must(thumbnailSpot(LOOKS[key]))
    expect(Number.isInteger(served.width)).toBe(true)
    expect(Number.isInteger(served.height)).toBe(true)
    // The request has the placement's own ratio (exact to a pixel), so the CDN adds no second cut.
    expect(Math.abs(served.width / served.height - served.aspect)).toBeLessThan(0.01)
    expect(served.defaultAspect).toBe(THUMBNAIL_DEFAULT_ASPECT)
  })

  it('serves each tile at 2x its largest drawn width, never the old 600 × 450', () => {
    expect(servedThumbnail(LOOKS.minimal)).toMatchObject({ width: 80, height: 80 }) // 40 px
    expect(servedThumbnail(LOOKS.cards)).toMatchObject({ width: 128, height: 128 }) // 64 px
    expect(servedThumbnail(LOOKS.glass)).toMatchObject({ width: 256, height: 192 }) // 128 px
    expect(servedThumbnail(LOOKS.image)).toMatchObject({ width: 1440, height: 1080 })
    expect(servedThumbnail(LOOKS.featured)).toMatchObject({ width: 1440, height: 810 })
  })

  it('describes the editor shapes: the drawn one first, the others as outlines', () => {
    expect(thumbnailShapes(LOOKS.minimal).map((s) => s.aspect)).toEqual([1])
    expect(thumbnailShapes(LOOKS.cards).map((s) => s.aspect)).toEqual([1])
    expect(thumbnailShapes(LOOKS.image).map((s) => s.label)).toEqual([
      'Card picture',
      'Featured link',
    ])
    expect(thumbnailShapes(LOOKS.featured).map((s) => s.aspect)).toEqual([16 / 9, 4 / 3])
    const glass = thumbnailShapes(LOOKS.glass)
    expect(glass.map((s) => s.label)).toEqual(['Shortest row', 'Tallest row'])
    expect(must(glass[0]).aspect).toBeCloseTo(128 / 56)
    expect(must(glass[1]).aspect).toBe(1)
    expect(must(thumbnailShapes({ ...LOOKS.glass, featured: true })[0]).aspect).toBeCloseTo(
      128 / 80,
    )
  })

  it('carries the old default ratio on every shape, so an untouched picture opens on what it shows', () => {
    for (const key of KEYS) {
      for (const shape of thumbnailShapes(LOOKS[key])) {
        expect(shape.defaultAspect).toBe(4 / 3)
      }
    }
  })
})

/** What a thumbnail showed before: the CDN's 600 × 450 centred cut, then CSS `object-cover` centred, in real numbers. */
function todaysArea(asset: AssetSize, aspect: number): Rect {
  const served = servedRect({ asset, aspect: 4 / 3 })
  const visible =
    served.width / served.height > aspect
      ? { width: served.height * aspect, height: served.height }
      : { width: served.width, height: served.width / aspect }
  return {
    left: served.left + (served.width - visible.width) / 2,
    top: served.top + (served.height - visible.height) / 2,
    width: visible.width,
    height: visible.height,
  }
}

const near = (actual: Rect, expected: Rect, tolerance = 1.5) => {
  for (const edge of ['left', 'top', 'width', 'height'] as const) {
    expect(Math.abs(actual[edge] - expected[edge])).toBeLessThanOrEqual(tolerance)
  }
}

describe('the visible area', () => {
  describe.each(Object.entries(UPLOADS))('for a %s upload', (_name, asset) => {
    describe.each(KEYS)('in %s', (key) => {
      const { served } = must(thumbnailSpot(LOOKS[key]))
      const shapes = thumbnailShapes(LOOKS[key])

      it('rule 3: with no framing, shows exactly what the 600 × 450 request and CSS showed', () => {
        for (const shape of shapes) {
          near(must(visibleArea(shape, { asset })), todaysArea(asset, shape.aspect))
        }
        // The main shape served as an explicit rect is also today's.
        near(must(visibleArea(served, { asset })), todaysArea(asset, served.aspect))
      })

      it('rule 2: with only a hotspot, cuts the drawn shape around it', () => {
        const hotspot = { x: 0.2, y: 0.3, width: 0.1, height: 0.1 }
        const area = must(visibleArea(served, { asset, hotspot }))
        const centre = {
          x: (area.left + area.width / 2) / asset.width,
          y: (area.top + area.height / 2) / asset.height,
        }
        // Centred on the hotspot along the axis that has room, and inside the upload.
        if (area.width < asset.width) expect(centre.x).toBeLessThanOrEqual(0.5)
        if (area.height < asset.height) expect(centre.y).toBeLessThanOrEqual(0.5)
        expect(area.left).toBeGreaterThanOrEqual(0)
        expect(area.top).toBeGreaterThanOrEqual(0)
        expect(area.left + area.width).toBeLessThanOrEqual(asset.width)
        expect(area.top + area.height).toBeLessThanOrEqual(asset.height)
        expect(Math.abs(area.width / area.height - served.aspect)).toBeLessThan(0.01)
      })

      it('rule 1: an adjustment decides the area, over any hotspot set before', () => {
        const shape = must(shapes[0])
        // The dialog writes a new crop and hotspot over the field's old ones, so only it is stored.
        const stored = toCrop({
          asset,
          aspect: shape.aspect,
          zoom: 1.6,
          centre: { x: 0.6, y: 0.55 },
        })
        const box = boxAt(asset, shape.aspect, 1.6)
        near(must(visibleArea(shape, { asset, ...stored })), {
          left: (0.6 - box.width / 2) * asset.width,
          top: (0.55 - box.height / 2) * asset.height,
          width: box.width * asset.width,
          height: box.height * asset.height,
        })
      })
    })
  })
})

describe('the editor opens on the area the renderer serves', () => {
  describe.each(Object.entries(UPLOADS))('for a %s upload', (_name, asset) => {
    describe.each(KEYS)('in %s', (key) => {
      // A framed picture is served at the shape the editor's main shape draws (Glass rows: the shortest row).
      const { served } = must(thumbnailSpot({ ...LOOKS[key], framed: true }))
      const [main] = thumbnailShapes(LOOKS[key])
      const opens = (framed: { crop?: object; hotspot?: object }) => {
        const state = fromImage({
          asset,
          aspect: must(main).aspect,
          defaultAspect: 4 / 3,
          ...framed,
        })
        const box = boxAt(asset, must(main).aspect, state.zoom)
        return {
          left: (state.centre.x - box.width / 2) * asset.width,
          top: (state.centre.y - box.height / 2) * asset.height,
          width: box.width * asset.width,
          height: box.height * asset.height,
        }
      }

      it('with nothing stored: what the 600 × 450 request and CSS showed', () => {
        near(opens({}), todaysArea(asset, must(main).aspect), 2)
      })

      it('with only a hotspot', () => {
        const hotspot = { x: 0.7, y: 0.35, width: 0.2, height: 0.2 }
        near(opens({ hotspot }), must(visibleArea(served, { asset, hotspot })), 2)
      })

      it('with an adjustment', () => {
        const stored = toCrop({
          asset,
          aspect: must(main).aspect,
          zoom: 2,
          centre: { x: 0.4, y: 0.6 },
        })
        near(opens(stored), must(visibleArea(served, { asset, ...stored })), 2)
      })
    })
  })
})

describe('Glass rows', () => {
  it('serve the old 4:3 cut when nothing is framed, so no row moves', () => {
    const { served } = must(thumbnailSpot(LOOKS.glass))
    expect(served).toMatchObject({ aspect: 4 / 3, width: 256, height: 192 })
  })

  it('serve a framed picture at the shortest row, the widest the strip gets', () => {
    expect(servedThumbnail({ ...LOOKS.glass, framed: true })).toMatchObject({
      width: 256,
      height: 112,
    })
    expect(servedThumbnail({ ...LOOKS.glass, framed: true, featured: true })).toMatchObject({
      width: 256,
      height: 160,
    })
    for (const featured of [false, true]) {
      const looks = { ...LOOKS.glass, framed: true, featured }
      const { served } = must(thumbnailSpot(looks))
      expect(served.aspect).toBeCloseTo(must(thumbnailShapes(looks)[0]).aspect)
      expect(Math.abs(served.width / served.height - served.aspect)).toBeLessThan(0.01)
    }
  })

  it('ignore the framed flag in every other layout', () => {
    for (const key of KEYS.filter((k) => k !== 'glass')) {
      expect(thumbnailSpot({ ...LOOKS[key], framed: true })).toEqual(thumbnailSpot(LOOKS[key]))
    }
  })
})

describe('the Link list thumbnail resolver', () => {
  const { resolve, designPath } = FRAMING_RESOLVERS.linkListThumbnail
  const path = (key: string) => ['sections', { _key: 's' }, 'links', { _key: key }, 'thumbnail']
  const section = (extra: object) => ({
    variant: 'cards',
    links: [{ _key: 'a' }, { _key: 'b', featured: true }],
    ...extra,
  })

  it('reads the section: three segments up the field path, no field', () => {
    expect(designPath).toEqual({ drop: 3 })
  })

  it('finds the link by its key for the featured flag', () => {
    const large = section({ thumbnailSize: 'large' })
    expect(resolve(large, null, path('a')).map((s) => s.aspect)).toEqual([4 / 3, 16 / 9])
    expect(resolve(large, null, path('b')).map((s) => s.aspect)).toEqual([16 / 9, 4 / 3])
  })

  it('treats only the first ticked, shown link as featured, as the page does', () => {
    const large = {
      variant: 'cards',
      thumbnailSize: 'large',
      links: [
        { _key: 'hidden', featured: true, visibility: 'hide' },
        { _key: 'first', featured: true },
        { _key: 'second', featured: true },
      ],
    }
    const aspects = (key: string) => resolve(large, null, path(key)).map((s) => s.aspect)
    expect(aspects('first')).toEqual([16 / 9, 4 / 3])
    expect(aspects('second')).toEqual([4 / 3, 16 / 9])
    expect(aspects('hidden')).toEqual([4 / 3, 16 / 9])
  })

  it('is a Minimal square when the layout is unset', () => {
    expect(resolve({ links: [] }, null, path('a'))).toEqual(thumbnailShapes({}))
    expect(resolve(undefined, null, path('a'))).toEqual(thumbnailShapes({}))
  })

  it('is the Glass rows strip for Minimal with the glass row style', () => {
    const shapes = resolve({ variant: 'stacked', rowStyle: 'glass' }, null, path('a'))
    expect(shapes.map((s) => s.label)).toEqual(['Shortest row', 'Tallest row'])
  })

  it('has no shape where the layout shows no thumbnail', () => {
    expect(resolve({ variant: 'editorial' }, null, path('a'))).toEqual([])
  })
})
