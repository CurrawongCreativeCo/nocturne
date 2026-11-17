import { readFileSync } from 'node:fs'
import { resolve as resolvePath } from 'node:path'

import { describe, expect, it } from 'vitest'

import {
  FRAMING_RESOLVERS,
  PROFILE_DRAWN_PX,
  PROFILE_FRAME_INSET_PCT,
  CORNER_PX,
  appearanceCorner,
  isFramingKey,
  wholeNoteFor,
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

describe('galleryTile (task 177)', () => {
  const { designPath, resolve } = FRAMING_RESOLVERS.galleryTile
  const shapeOf = (variant: string, imageDesign?: Record<string, unknown>) =>
    resolve({ variant, imageDesign })

  it('finds the section two segments up: images[_key]', () => {
    expect(designPath).toEqual({ drop: 2 })
  })

  it('cuts Grid and Slider tiles 4:3 with the card corner when nothing is chosen', () => {
    for (const variant of ['grid', 'slider']) {
      expect(shapeOf(variant)).toEqual([
        { label: 'Gallery tile', aspect: 4 / 3, corner: 'card', insetPct: 0, drawnPx: 640 },
      ])
    }
  })

  it('takes the shape the tile draws: Circle 1:1, Arch 4:5 or its ratio, Rounded corners', () => {
    expect(shapeOf('grid', { appearance: 'circle' })[0]).toMatchObject({
      aspect: 1,
      corner: 'circle',
    })
    expect(shapeOf('grid', { appearance: 'arch' })[0]).toMatchObject({
      aspect: 4 / 5,
      corner: 'arch',
    })
    expect(shapeOf('grid', { appearance: 'arch', archRatio: '2/3' })[0]).toMatchObject({
      aspect: 2 / 3,
      corner: 'arch',
    })
    expect(shapeOf('grid', { appearance: 'rounded' })[0]).toMatchObject({ corner: 'rounded' })
    // A saved Framed section keeps Standard's card corner; a frame never changes the shape.
    expect(shapeOf('grid', { appearance: 'framed', frame: 'offset-border' })[0]).toMatchObject({
      aspect: 4 / 3,
      corner: 'card',
    })
    expect(shapeOf('grid', { appearance: 'circle', frameStyle: 'offset-border' })[0]).toEqual(
      shapeOf('grid', { appearance: 'circle' })[0],
    )
  })

  it('offers nothing on Masonry, which keeps each photo’s own shape', () => {
    expect(shapeOf('masonry', { appearance: 'circle' })).toEqual([])
  })
})

describe('eventImage (task 177)', () => {
  it('previews both masks the site draws: the Featured card’s top corners, and all four elsewhere', () => {
    const { designPath, resolve } = FRAMING_RESOLVERS.eventImage
    expect(designPath).toEqual({ drop: 1 })
    expect(resolve(undefined)).toEqual([
      { label: 'Featured card', aspect: 16 / 9, corner: 'cardTop', insetPct: 0, drawnPx: 768 },
      {
        label: 'Event page, and a Featured picture with depth',
        aspect: 16 / 9,
        corner: 'card',
        insetPct: 0,
        drawnPx: 768,
      },
    ])
  })

  it('uses the card corner the site draws: --radius-card, 1rem (16px)', () => {
    const tokens = readFileSync(
      resolvePath(process.cwd(), 'src/styles/tokens.generated.css'),
      'utf8',
    )
    expect(tokens).toContain('--radius-card: 1rem;')
    expect(CORNER_PX.card).toBe(16)
  })
})

describe('appearanceCorner', () => {
  it('is the one corner map for the clip, the outline and the editor', () => {
    expect(appearanceCorner('standard')).toBe('card')
    expect(appearanceCorner('framed')).toBe('card')
    expect(appearanceCorner('square')).toBe('none')
    expect(appearanceCorner('rounded')).toBe('rounded')
    expect(appearanceCorner('circle')).toBe('circle')
    expect(appearanceCorner('arch')).toBe('arch')
  })
})

describe('heroImage (task 177)', () => {
  const { designPath, resolve } = FRAMING_RESOLVERS.heroImage
  it('finds the section one segment up, and has a shape only in Split', () => {
    expect(designPath).toEqual({ drop: 1 })
    expect(resolve({ variant: 'split' })[0]).toMatchObject({ aspect: 4 / 3, corner: 'card' })
    for (const variant of ['overlay', 'full-bleed', 'editorial', undefined]) {
      expect(resolve({ variant })).toEqual([])
    }
    expect(wholeNoteFor(FRAMING_RESOLVERS.heroImage, { variant: 'overlay' })?.saved).toMatch(
      /covers the section/,
    )
  })

  it('takes the older Image shape, and the Image design over it', () => {
    expect(resolve({ variant: 'split', imageShape: 'circle' })[0]).toMatchObject({
      aspect: 1,
      corner: 'circle',
    })
    expect(
      resolve({ variant: 'split', imageShape: 'circle', imageDesign: { appearance: 'arch' } })[0],
    ).toMatchObject({ aspect: 4 / 5, corner: 'arch' })
  })
})

describe('Image + text pictures (task 177)', () => {
  it('reads the section three segments up from the slot block, one up from the older field', () => {
    expect(FRAMING_RESOLVERS.mediaTextImage.designPath).toEqual({ drop: 3 })
    expect(FRAMING_RESOLVERS.mediaTextLegacyImage.designPath).toEqual({ drop: 1 })
  })

  it('is 4:3 side by side, 16:9 stacked, and has no fixed shape as the background', () => {
    const { resolve } = FRAMING_RESOLVERS.mediaTextImage
    expect(resolve({ variant: 'side' })[0]).toMatchObject({ aspect: 4 / 3 })
    expect(resolve({})[0]).toMatchObject({ aspect: 4 / 3 })
    expect(resolve({ variant: 'stacked' })[0]).toMatchObject({ aspect: 16 / 9 })
    expect(resolve({ variant: 'overlay' })).toEqual([])
    expect(resolve({ variant: 'side', imageDesign: { appearance: 'circle' } })[0]).toMatchObject({
      aspect: 1,
      corner: 'circle',
    })
  })
})

describe('videoPoster (task 177, QA-052)', () => {
  const { designPath, resolve } = FRAMING_RESOLVERS.videoPoster
  it('is the frame’s Shape before play for YouTube and Vimeo, 16:9 when unset', () => {
    expect(designPath).toEqual({ drop: 1 })
    expect(resolve({ variant: 'embed' })[0]).toMatchObject({ aspect: 16 / 9, corner: 'card' })
    expect(resolve({ variant: 'embed', source: 'vimeo', aspectRatio: '4:3' })[0]).toMatchObject({
      aspect: 4 / 3,
    })
    expect(resolve({ aspectRatio: '1:1' })[0]?.aspect).toBe(1)
    expect(resolve({ aspectRatio: '21:9' })[0]?.aspect).toBe(21 / 9)
  })

  it('has no fixed shape for an uploaded video or Ambient, and says why', () => {
    expect(resolve({ variant: 'embed', source: 'upload' })).toEqual([])
    expect(resolve({ variant: 'ambient' })).toEqual([])
    expect(wholeNoteFor(FRAMING_RESOLVERS.videoPoster, { source: 'upload' })?.unsaved).toMatch(
      /player shows its poster whole/,
    )
    expect(wholeNoteFor(FRAMING_RESOLVERS.videoPoster, { variant: 'ambient' })?.unsaved).toMatch(
      /covers the section/,
    )
  })
})
