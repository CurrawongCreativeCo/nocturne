import { describe, expect, it } from 'vitest'

import { CUSTOM_FRAME_PICTURE_MAX_BYTES } from '@/lib/sanity/image-design-options'

import { checkFramePicture, framePictureWarning } from './frame-picture'

describe('frame pictures', () => {
  it('accepts PNG and WebP in either orientation at the size boundaries', () => {
    for (const mimeType of ['image/png', 'image/webp']) {
      for (const dimensions of [
        { width: 1600, height: 900 },
        { width: 900, height: 1600 },
      ]) {
        expect(
          checkFramePicture({
            mimeType,
            size: CUSTOM_FRAME_PICTURE_MAX_BYTES,
            ...dimensions,
          }),
        ).toBe(true)
      }
    }
  })

  it('rejects other formats, oversized uploads and insufficient resolution', () => {
    expect(checkFramePicture({ mimeType: 'image/jpeg' })).toMatch(/PNG or WebP/)
    expect(checkFramePicture({ size: CUSTOM_FRAME_PICTURE_MAX_BYTES + 1 })).toMatch(/5 MB/)
    expect(checkFramePicture({ width: 1599, height: 900 })).toMatch(/1600 px/)
  })

  it('warns only for known opaque artwork, allowing metadata still being processed', () => {
    expect(framePictureWarning({ hasAlpha: false })).toMatch(/hide the photo/)
    expect(framePictureWarning({ hasAlpha: true })).toBe(true)
    expect(framePictureWarning(null)).toBe(true)
    expect(checkFramePicture(null)).toBe(true)
  })
})
