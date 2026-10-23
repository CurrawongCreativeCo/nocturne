import { createImageUrlBuilder } from '@sanity/image-url'
import { describe, expect, it } from 'vitest'

import {
  assetSizeFromId,
  boxAt,
  coverBox,
  defaultArea,
  framingContext,
  fromImage,
  isFramed,
  isSoft,
  maxZoom,
  pan,
  servedRect,
  setZoom,
  stepPan,
  stepPicture,
  stepZoom,
  toCrop,
  visibleArea,
  zoomAt,
  type AssetSize,
  type FramingState,
  type Rect,
} from './image-framing'

const LANDSCAPE: AssetSize = { width: 4000, height: 3000 }
const PORTRAIT: AssetSize = { width: 3000, height: 4500 }
/** Whole-pixel sizes of each ratio, as the site asks the CDN (an inexact height would skew the ratio by a pixel). */
const SIZES: [number, number][] = [
  [600, 600],
  [1200, 900],
  [1600, 900],
  [900, 1200],
  [600, 1200],
]
const RATIOS = SIZES.map(([w, h]) => w / h)
const idOf = ({ width, height }: AssetSize) => `image-abc123def456-${width}x${height}-jpg`

const builder = createImageUrlBuilder({ projectId: 'proj', dataset: 'production' })

/** The rect the real URL asks the CDN for, as the library builds it (the whole upload when there is none). */
function urlRect(
  asset: AssetSize,
  aspect: number,
  stored?: { crop?: object; hotspot?: object },
): Rect {
  const [width = 1, height = 1] = SIZES[RATIOS.indexOf(aspect)] ?? []
  const url = builder
    .image({ asset: { _ref: idOf(asset) }, ...stored })
    .width(width)
    .height(height)
    .fit('crop')
    .url()
  const found = /[?&]rect=(\d+),(\d+),(\d+),(\d+)/.exec(url)
  if (!found) return { left: 0, top: 0, width: asset.width, height: asset.height }
  const [left = 0, top = 0, w = 0, h = 0] = found.slice(1).map(Number)
  return { left, top, width: w, height: h }
}

/** Rounding may move an edge by a pixel or two, never more. */
function expectRectClose(actual: Rect, expected: Rect, pixels = 2) {
  for (const key of ['left', 'top', 'width', 'height'] as const) {
    expect(Math.abs(actual[key] - expected[key])).toBeLessThanOrEqual(pixels)
  }
}

const state = (zoom: number, x = 0.5, y = 0.5): FramingState => ({ zoom, centre: { x, y } })

describe('assetSizeFromId', () => {
  it('reads the size from the asset id', () => {
    expect(assetSizeFromId('image-abc123-4000x3000-jpg')).toEqual(LANDSCAPE)
    expect(assetSizeFromId('image-abc123-12x34-png')).toEqual({ width: 12, height: 34 })
  })
  it('is undefined for anything else', () => {
    expect(assetSizeFromId(undefined)).toBeUndefined()
    expect(assetSizeFromId('file-abc-pdf')).toBeUndefined()
  })
})

describe('cover (zoom 1)', () => {
  it.each([LANDSCAPE, PORTRAIT])('is the largest box of each ratio inside %o', (asset) => {
    for (const aspect of RATIOS) {
      const box = coverBox(asset, aspect)
      expect(Math.max(box.width, box.height)).toBeCloseTo(1, 9)
      expect(Math.min(box.width, box.height)).toBeLessThanOrEqual(1)
      expect((box.width * asset.width) / (box.height * asset.height)).toBeCloseTo(aspect, 9)
    }
  })

  it('halves the box at 200%', () => {
    const cover = coverBox(LANDSCAPE, 1)
    expect(boxAt(LANDSCAPE, 1, 2).width).toBeCloseTo(cover.width / 2, 9)
  })
})

describe('toCrop', () => {
  it('stores the visible box as the crop and its centre and size as the hotspot', () => {
    const { crop, hotspot } = toCrop({
      asset: LANDSCAPE,
      aspect: 1,
      zoom: 2,
      centre: { x: 0.5, y: 0.5 },
    })
    expect(crop).toMatchObject({ _type: 'sanity.imageCrop', top: 0.25, bottom: 0.25 })
    expect(crop.left).toBeCloseTo(0.3125, 5)
    expect(hotspot).toMatchObject({ _type: 'sanity.imageHotspot', x: 0.5, y: 0.5, height: 0.5 })
    expect(hotspot.width).toBeCloseTo(0.375, 5)
  })

  it.each([LANDSCAPE, PORTRAIT])('never leaves the picture, at every edge of %o', (asset) => {
    for (const aspect of RATIOS) {
      for (const zoom of [1, 1.5, 4]) {
        for (const x of [-1, 0, 0.5, 1, 2]) {
          for (const y of [-1, 0, 0.5, 1, 2]) {
            const { crop, hotspot } = toCrop({ asset, aspect, zoom, centre: { x, y } })
            for (const edge of [crop.left, crop.right, crop.top, crop.bottom]) {
              expect(edge).toBeGreaterThanOrEqual(0)
              expect(edge).toBeLessThanOrEqual(1)
            }
            expect(1 - crop.left - crop.right).toBeCloseTo(hotspot.width, 5)
            expect(1 - crop.top - crop.bottom).toBeCloseTo(hotspot.height, 5)
          }
        }
      }
    }
  })

  it('has nothing to move on the axis the cover box already fills', () => {
    const { crop } = toCrop({
      asset: LANDSCAPE,
      aspect: 4 / 3,
      zoom: 1,
      centre: { x: 0.2, y: 0.9 },
    })
    expect(crop.top).toBe(0)
    expect(crop.bottom).toBe(0)
  })
})

describe('parity with @sanity/image-url', () => {
  it.each([LANDSCAPE, PORTRAIT])(
    'serves exactly the crop box when the ratios match (%o)',
    (asset) => {
      for (const aspect of RATIOS) {
        for (const [zoom, x, y] of [
          [1, 0.5, 0.5],
          [1.5, 0.3, 0.6],
          [2.5, 0.9, 0.1],
          [4, 0.05, 0.95],
        ] as const) {
          const stored = toCrop({ asset, aspect, zoom, centre: { x, y } })
          const served = urlRect(asset, aspect, stored)
          const left = Math.round(stored.crop.left * asset.width)
          const top = Math.round(stored.crop.top * asset.height)
          expectRectClose(served, {
            left,
            top,
            width: Math.round(asset.width - stored.crop.right * asset.width - left),
            height: Math.round(asset.height - stored.crop.bottom * asset.height - top),
          })
        }
      }
    },
  )

  it.each([LANDSCAPE, PORTRAIT])(
    'servedRect matches the library for any crop and hotspot (%o)',
    (asset) => {
      const cases = [
        {},
        { hotspot: { x: 0.2, y: 0.8, width: 0.2, height: 0.2 } },
        { crop: { left: 0.1, right: 0.2, top: 0.05, bottom: 0.3 } },
        {
          crop: { left: 0.1, right: 0.2, top: 0.05, bottom: 0.3 },
          hotspot: { x: 0.7, y: 0.3, width: 0.1, height: 0.1 },
        },
      ]
      for (const aspect of RATIOS) {
        for (const stored of cases) {
          const withTypes = {
            ...(stored.crop && { crop: { _type: 'sanity.imageCrop', ...stored.crop } }),
            ...(stored.hotspot && { hotspot: { _type: 'sanity.imageHotspot', ...stored.hotspot } }),
          }
          expect(servedRect({ asset, aspect, ...stored })).toEqual(
            urlRect(asset, aspect, withTypes),
          )
        }
      }
    },
  )
})

describe('fromImage', () => {
  it('round-trips an adjustment', () => {
    for (const asset of [LANDSCAPE, PORTRAIT]) {
      for (const aspect of RATIOS) {
        const before = state(2.2, 0.4, 0.55)
        const stored = toCrop({ asset, aspect, ...before })
        const after = fromImage({ asset, aspect, ...stored })
        const expected = toCrop({ asset, aspect, ...before })
        const again = toCrop({ asset, aspect, ...after })
        // The site reads whole pixels, so a round trip is exact to about a pixel.
        for (const key of ['left', 'right'] as const) {
          expect(Math.abs(again.crop[key] - expected.crop[key])).toBeLessThan(2 / asset.width)
        }
        for (const key of ['top', 'bottom'] as const) {
          expect(Math.abs(again.crop[key] - expected.crop[key])).toBeLessThan(2 / asset.height)
        }
      }
    }
  })

  it('opens on the centred cover for a picture framed nowhere', () => {
    const opened = fromImage({ asset: LANDSCAPE, aspect: 1 })
    expect(opened.zoom).toBeCloseTo(1, 3)
    expect(opened.centre.x).toBeCloseTo(0.5, 3)
    expect(opened.centre.y).toBeCloseTo(0.5, 3)
  })

  it("opens where the site shows a picture framed with Sanity's own tool", () => {
    const asset = LANDSCAPE
    const aspect = 1
    const crop = { _type: 'sanity.imageCrop', left: 0.1, right: 0.4, top: 0.1, bottom: 0.3 }
    const hotspot = { _type: 'sanity.imageHotspot', x: 0.3, y: 0.4, width: 0.2, height: 0.2 }
    const opened = fromImage({ asset, aspect, crop, hotspot })
    const box = boxAt(asset, aspect, opened.zoom)
    const shown = urlRect(asset, aspect, { crop, hotspot })
    expectRectClose(
      {
        left: Math.round((opened.centre.x - box.width / 2) * asset.width),
        top: Math.round((opened.centre.y - box.height / 2) * asset.height),
        width: Math.round(box.width * asset.width),
        height: Math.round(box.height * asset.height),
      },
      shown,
    )
  })

  it('opens on the existing default, not the centre, when the placement has one', () => {
    const area = defaultArea({ aspect: 1, defaultAspect: 4 / 3 }, PORTRAIT)
    const opened = fromImage({ asset: PORTRAIT, aspect: 1, defaultAspect: 4 / 3 })
    expect(opened.centre.x * PORTRAIT.width).toBeCloseTo(area.left + area.width / 2, -1)
    expect(opened.centre.y * PORTRAIT.height).toBeCloseTo(area.top + area.height / 2, -1)
  })
})

describe('zoom and pan', () => {
  const context = framingContext(LANDSCAPE, 1)

  it('clamps the zoom between 1 and the maximum', () => {
    expect(setZoom(state(2), context, 0.2).zoom).toBe(1)
    expect(setZoom(state(2), context, 99).zoom).toBe(context.maxZoom)
  })

  it('keeps the point under the pointer still while zooming', () => {
    const point = { x: 0.8, y: 0.3 }
    const from = state(1.5, 0.5, 0.5)
    const to = zoomAt(from, context, 1.6, point)
    const before = boxAt(LANDSCAPE, 1, from.zoom)
    const after = boxAt(LANDSCAPE, 1, to.zoom)
    const underBefore = from.centre.x + (point.x - 0.5) * before.width
    const underAfter = to.centre.x + (point.x - 0.5) * after.width
    expect(underAfter).toBeCloseTo(underBefore, 9)
    const rowBefore = from.centre.y + (point.y - 0.5) * before.height
    const rowAfter = to.centre.y + (point.y - 0.5) * after.height
    expect(rowAfter).toBeCloseTo(rowBefore, 9)
  })

  it('pans by a share of the visible box and stops at the edge', () => {
    const box = boxAt(LANDSCAPE, 1, 2)
    const moved = pan(state(2), context, 0.5, 0)
    expect(moved.centre.x).toBeCloseTo(0.5 + box.width / 2, 9)
    expect(pan(state(2), context, 100, -100).centre).toEqual({
      x: 1 - box.width / 2,
      y: box.height / 2,
    })
  })

  it('moves 1% of the box per arrow press and 10% with Shift', () => {
    const box = boxAt(LANDSCAPE, 1, 2)
    expect(stepPan(state(2), context, 'right').centre.x).toBeCloseTo(0.5 + 0.01 * box.width, 9)
    expect(stepPan(state(2), context, 'up', true).centre.y).toBeCloseTo(0.5 - 0.1 * box.height, 9)
  })

  it('moves the picture the way the arrow points, so the box goes the other way', () => {
    const box = boxAt(LANDSCAPE, 1, 2)
    expect(stepPicture(state(2), context, 'left').centre.x).toBeCloseTo(0.5 + 0.01 * box.width, 9)
    expect(stepPicture(state(2), context, 'down', true).centre.y).toBeCloseTo(
      0.5 - 0.1 * box.height,
      9,
    )
  })

  it('zooms 5 points per key press', () => {
    expect(stepZoom(state(1.5), context, 1).zoom).toBeCloseTo(1.55, 9)
    expect(stepZoom(state(1.5), context, -1).zoom).toBeCloseTo(1.45, 9)
    expect(stepZoom(state(1), context, -1).zoom).toBe(1)
  })
})

describe('maximum zoom and softness', () => {
  it('stops where the box falls to the largest drawn width, capped at 400%', () => {
    // A 3000 px cover box drawn at 128 px could zoom 23x: the cap wins.
    expect(maxZoom(LANDSCAPE, 1, 128)).toBe(4)
    // A 600 px cover box drawn at 300 px: twice.
    expect(maxZoom({ width: 800, height: 600 }, 1, 300)).toBe(2)
  })

  it('never goes below 1, even for a small picture', () => {
    expect(maxZoom({ width: 100, height: 100 }, 1, 400)).toBe(1)
  })

  it('flags below two source pixels per drawn pixel', () => {
    const asset = { width: 1000, height: 1000 }
    expect(isSoft(asset, 1, 1, 200)).toBe(false)
    expect(isSoft(asset, 1, 2.6, 200)).toBe(true)
    expect(isSoft(asset, 1, 4)).toBe(false)
  })
})

describe('defaultArea and visibleArea', () => {
  it('is the centred cover with no crop or hotspot', () => {
    expect(defaultArea({ aspect: 1 }, LANDSCAPE)).toEqual({
      left: 500,
      top: 0,
      width: 3000,
      height: 3000,
    })
  })

  it("is today's two-step cut when the site asks the CDN for another ratio first", () => {
    const area = defaultArea({ aspect: 1, defaultAspect: 4 / 3 }, PORTRAIT)
    // Portrait 3000x4500 -> 4:3 is 3000x2250 centred, then a square of 2250 inside it.
    expect(area).toEqual({ left: 375, top: 1125 + 0, width: 2250, height: 2250 })
  })

  it('is the adjustment, else the hotspot, else the default; null for an uncropped shape', () => {
    const placement = { aspect: 1 }
    const asset = LANDSCAPE
    expect(visibleArea(null, { asset })).toBeNull()
    expect(visibleArea(placement, { asset })).toEqual(defaultArea(placement, asset))
    const hotspot = { x: 0.1, y: 0.5, width: 0.1, height: 0.1 }
    expect(visibleArea(placement, { asset, hotspot })?.left).toBe(0)
    const stored = toCrop({ asset, aspect: 1, zoom: 2, centre: { x: 0.7, y: 0.5 } })
    expect(visibleArea(placement, { asset, ...stored })).toEqual(
      servedRect({ asset, aspect: 1, ...stored }),
    )
  })
})

describe('isFramed', () => {
  it('is true when either value is stored', () => {
    expect(isFramed(undefined)).toBe(false)
    expect(isFramed({})).toBe(false)
    expect(isFramed({ crop: { left: 0 } })).toBe(true)
    expect(isFramed({ hotspot: { x: 0.5 } })).toBe(true)
  })
})
