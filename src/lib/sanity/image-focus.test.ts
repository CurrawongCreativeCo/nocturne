import { describe, expect, it } from 'vitest'

import { hotspotObjectPosition } from './image-focus'

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
