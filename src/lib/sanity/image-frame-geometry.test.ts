import { describe, expect, it } from 'vitest'

import {
  FRAMING_RESOLVERS,
  PROFILE_DRAWN_PX,
  PROFILE_FRAME_INSET_PCT,
  isFramingKey,
} from './image-frame-geometry'
import {
  PROFILE_BORDERS,
  PROFILE_IMAGE_SHAPES,
  PROFILE_IMAGE_SIZES,
  resolveProfileImage,
} from './profile-image-options'

const { resolve, frameRef, designPath } = FRAMING_RESOLVERS.linkListProfile
const FRAME_URL = 'https://cdn.sanity.io/images/p/d/abc-100x100.png'

describe('the Link list profile resolver', () => {
  it('is a medium circle with no ring when nothing is set', () => {
    expect(resolve(undefined)).toEqual([
      { label: 'Profile picture', aspect: 1, corner: 'circle', insetPct: 0, drawnPx: 128 },
    ])
  })

  it('is a rounded square for Rounded square', () => {
    expect(resolve({ imageShape: 'rounded' })[0]).toMatchObject({ corner: 'card', aspect: 1 })
  })

  it('returns no shape for a logo, uncropped, whatever else is set', () => {
    expect(resolve({ imageShape: 'natural' })).toEqual([])
    expect(resolve({ imageShape: 'natural', border: 'line' })).toEqual([])
  })

  it('carries the ring', () => {
    const [shape] = resolve({ border: 'gradient', borderWidth: 'thick', borderGap: 'large' })
    expect(shape?.ring).toEqual({
      kind: 'ring',
      widthPx: 6,
      gapPx: 6,
      gradient: expect.any(String) as string,
    })
    expect(shape?.frameUrl).toBeUndefined()
  })

  it('insets the picture 14% inside an approved frame', () => {
    const [shape] = resolve({ border: 'frame', imageSize: 'large' }, FRAME_URL)
    expect(shape).toMatchObject({ frameUrl: FRAME_URL, insetPct: PROFILE_FRAME_INSET_PCT })
    expect(shape?.drawnPx).toBe(Math.round(PROFILE_DRAWN_PX.large * 0.72))
  })

  it('draws no frame, and no inset, while the frame has no artwork', () => {
    expect(resolve({ border: 'frame' })[0]).toMatchObject({ insetPct: 0 })
    expect(resolve({ border: 'frame' }, null)[0]?.frameUrl).toBeUndefined()
  })

  it.each(PROFILE_IMAGE_SHAPES)('describes every design for %s', (imageShape) => {
    for (const imageSize of PROFILE_IMAGE_SIZES) {
      for (const border of PROFILE_BORDERS) {
        const shapes = resolve({ imageShape, imageSize, border }, FRAME_URL)
        expect(shapes).toHaveLength(imageShape === 'natural' ? 0 : 1)
        for (const shape of shapes) {
          expect(shape.aspect).toBe(1)
          expect(shape.drawnPx).toBeGreaterThan(0)
          // The same decisions the page makes.
          const drawn = resolveProfileImage({ imageShape, imageSize, border, frameUrl: FRAME_URL })
          expect(Boolean(shape.ring)).toBe(drawn.border?.kind === 'ring')
          expect(Boolean(shape.frameUrl)).toBe(drawn.border?.kind === 'frame')
        }
      }
    }
  })

  it('finds the design next to the profile, and the frame to fetch', () => {
    expect(designPath).toEqual({ drop: 2, field: 'profileDesign' })
    expect(frameRef?.({ border: 'frame', frame: { _ref: 'frame-1' } })).toBe('frame-1')
    expect(frameRef?.({ border: 'line', frame: { _ref: 'frame-1' } })).toBeUndefined()
    expect(frameRef?.(undefined)).toBeUndefined()
  })
})

describe('isFramingKey', () => {
  it('accepts registry keys only', () => {
    expect(isFramingKey('linkListProfile')).toBe(true)
    expect(isFramingKey('toString')).toBe(false)
    expect(isFramingKey(undefined)).toBe(false)
  })
})
