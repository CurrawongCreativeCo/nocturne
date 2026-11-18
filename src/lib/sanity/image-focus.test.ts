import { describe, expect, it } from 'vitest'

import {
  hotspotObjectPosition,
  coverPosition,
  focusOf,
  hotspotFromFocus,
  stepFocus,
  FOCUS_FRAMES,
} from './image-focus'

const spot = (x: number, y: number) => ({
  _type: 'sanity.imageHotspot' as const,
  x,
  y,
  width: 0.2,
  height: 0.2,
})
const cropOf = (crop: { top: number; bottom: number; left: number; right: number }) => ({
  _type: 'sanity.imageCrop' as const,
  ...crop,
})

describe('hotspotObjectPosition', () => {
  it('is undefined without a hotspot, so the picture stays centred', () => {
    expect(hotspotObjectPosition(undefined)).toBeUndefined()
    expect(hotspotObjectPosition({})).toBeUndefined()
    expect(hotspotObjectPosition({ hotspot: null })).toBeUndefined()
  })

  it('turns the hotspot centre into percentages', () => {
    expect(hotspotObjectPosition({ hotspot: spot(0.25, 0.8) })).toBe('25% 80%')
    expect(hotspotObjectPosition({ hotspot: spot(0.5, 0.5) })).toBe('50% 50%')
  })

  it('measures the hotspot against what is left after the crop', () => {
    const crop = cropOf({ top: 0, bottom: 0, left: 0.2, right: 0.2 })
    // x 0.5 is the middle of the whole picture, so still the middle of the cropped one.
    expect(hotspotObjectPosition({ crop, hotspot: spot(0.5, 0.4) })).toBe('50% 40%')
    // x 0.3 is a sixth of the way into the 0.2 to 0.8 strip that is left.
    expect(hotspotObjectPosition({ crop, hotspot: spot(0.3, 0.4) })).toBe('16.7% 40%')
  })

  it('stays within the picture when the hotspot lies in the cropped-off part', () => {
    const crop = cropOf({ top: 0.5, bottom: 0, left: 0, right: 0 })
    expect(hotspotObjectPosition({ crop, hotspot: spot(0.5, 0.1) })).toBe('50% 0%')
  })

  it('ignores a crop that leaves nothing', () => {
    const crop = cropOf({ top: 0, bottom: 0, left: 0.6, right: 0.4 })
    expect(hotspotObjectPosition({ crop, hotspot: spot(0.5, 0.5) })).toBeUndefined()
  })
})

describe('hotspotObjectPosition within a served area', () => {
  const asset = { width: 3000, height: 2000 }

  it('measures the hotspot against the part of the upload that was served', () => {
    // The served 1000 × 750 area starts at (500, 250): a hotspot at (1000, 625) is a half of the way in.
    const area = { left: 500, top: 250, width: 1000, height: 750 }
    expect(hotspotObjectPosition({ hotspot: spot(1 / 3, 0.3125) }, { asset, area })).toBe('50% 50%')
    expect(hotspotObjectPosition({ hotspot: spot(0.25, 0.25) }, { asset, area })).toBe('25% 33.3%')
  })

  it('is the centre of the area for an adjusted picture, whose hotspot is the area’s centre', () => {
    const area = { left: 1000, top: 500, width: 1200, height: 900 }
    const centre = spot(
      (area.left + area.width / 2) / asset.width,
      (area.top + area.height / 2) / asset.height,
    )
    expect(hotspotObjectPosition({ hotspot: centre }, { asset, area })).toBe('50% 50%')
  })

  it('stays undefined without a hotspot, so the picture is centred', () => {
    const area = { left: 0, top: 0, width: 100, height: 100 }
    expect(hotspotObjectPosition({}, { asset, area })).toBeUndefined()
  })
})

describe('Focus mode (task 177)', () => {
  const crop = {
    _type: 'sanity.imageCrop' as const,
    left: 0.1,
    right: 0.1,
    top: 0.2,
    bottom: 0,
  }
  const hotspot = {
    _type: 'sanity.imageHotspot' as const,
    x: 0.3,
    y: 0.6,
    width: 0.3,
    height: 0.3,
  }

  it('is the hotspot as a point on the picture the CDN serves, cut to its crop', () => {
    expect(focusOf({ hotspot })).toEqual({ x: 0.3, y: 0.6 })
    // 10% off each side: x .3 is a quarter in; 20% off the top: y .6 is half way down what is left.
    expect(focusOf({ crop, hotspot })?.x).toBeCloseTo(0.25, 6)
    expect(focusOf({ crop, hotspot })?.y).toBeCloseTo(0.5, 6)
    expect(focusOf({ crop })).toBeUndefined()
    expect(focusOf(null)).toBeUndefined()
  })

  it('writes the hotspot the focus came from: the maths are inverse, and the size is kept', () => {
    const stored = { crop, hotspot }
    expect(hotspotFromFocus(stored, { x: 0.25, y: 0.5 })).toEqual({
      x: 0.3,
      y: 0.6,
      width: 0.3,
      height: 0.3,
    })
    // No hotspot yet: a default size, as the position is all a background reads.
    expect(hotspotFromFocus({ crop }, { x: 0.5, y: 0.5 })).toEqual({
      x: 0.5,
      y: 0.6,
      width: 0.3,
      height: 0.3,
    })
    // Anywhere on the picture, and the page reads it back as the same percentage.
    for (const point of [
      { x: 0, y: 0 },
      { x: 1, y: 1 },
      { x: 0.333, y: 0.777 },
    ]) {
      const written = hotspotFromFocus({ crop }, point)
      const back = focusOf({ crop, hotspot: { _type: 'sanity.imageHotspot', ...written } })
      expect(back?.x).toBeCloseTo(point.x, 3)
      expect(back?.y).toBeCloseTo(point.y, 3)
    }
    expect(hotspotFromFocus({}, { x: 3, y: -2 })).toMatchObject({ x: 1, y: 0 })
  })

  it('gives a covering background the hotspot’s position, and centres it with none', () => {
    expect(coverPosition({ crop, hotspot })).toBe('25% 50%')
    expect(coverPosition({ crop })).toBeUndefined()
    expect(coverPosition(undefined)).toBeUndefined()
    // It is the same answer hotspotObjectPosition gives for what it uses.
    expect(coverPosition({ hotspot })).toBe(hotspotObjectPosition({ hotspot }))
  })

  it('decides by the placement: an area in a shape, a focus on a background, only a hotspot counts there', async () => {
    const { framingMode } = await import('./image-framing')
    expect(framingMode({ crop }, 'shape')).toBe('area')
    expect(framingMode({ hotspot }, 'shape')).toBe('area')
    expect(framingMode({}, 'shape')).toBe('none')
    expect(framingMode({ hotspot }, 'cover')).toBe('focus')
    expect(framingMode({ crop }, 'cover')).toBe('none')
    expect(framingMode(null, 'cover')).toBe('none')
  })

  it('steps a little, a lot with Shift, and stays on the picture', () => {
    expect(stepFocus({ x: 0.5, y: 0.5 }, 'right')).toEqual({ x: 0.52, y: 0.5 })
    expect(stepFocus({ x: 0.5, y: 0.5 }, 'up', true)).toEqual({ x: 0.5, y: 0.4 })
    expect(stepFocus({ x: 0.99, y: 0.01 }, 'right', true)).toEqual({ x: 1, y: 0.01 })
    expect(stepFocus({ x: 0.01, y: 0.01 }, 'up')).toEqual({ x: 0.01, y: 0 })
  })

  it('previews a phone, a tablet and a desktop, narrowest first', () => {
    expect(FOCUS_FRAMES.map((frame) => frame.label)).toEqual(['Phone', 'Tablet', 'Desktop'])
    const aspects = FOCUS_FRAMES.map((frame) => frame.aspect)
    expect(aspects).toEqual([...aspects].sort((a, b) => a - b))
  })
})
