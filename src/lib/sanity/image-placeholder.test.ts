import { describe, expect, it } from 'vitest'

import { blurPlaceholder, isOpaque } from './image-placeholder'

const LQIP = 'data:image/jpeg;base64,AAAA'
const PNG = 'image-0123456789abcdef0123456789abcdef01234567-1200x630-png'
const JPG = 'image-0123456789abcdef0123456789abcdef01234567-1200x630-jpg'

describe('blurPlaceholder', () => {
  it('blurs an opaque picture while it loads', () => {
    expect(blurPlaceholder(PNG, { lqip: LQIP, hasAlpha: false })).toBe(LQIP)
    expect(blurPlaceholder(JPG, { lqip: LQIP, hasAlpha: false })).toBe(LQIP)
  })

  it('never blurs a transparent one, whatever its format', () => {
    expect(blurPlaceholder(PNG, { lqip: LQIP, hasAlpha: true })).toBeUndefined()
    expect(blurPlaceholder(JPG, { lqip: LQIP, hasAlpha: true })).toBeUndefined()
  })

  it('judges by format when Sanity has not recorded transparency', () => {
    expect(blurPlaceholder(JPG, { lqip: LQIP })).toBe(LQIP)
    expect(blurPlaceholder(JPG.replace('-jpg', '-JPEG'), { lqip: LQIP, hasAlpha: null })).toBe(LQIP)
    for (const format of ['png', 'webp', 'gif', 'svg']) {
      expect(blurPlaceholder(PNG.replace('-png', `-${format}`), { lqip: LQIP })).toBeUndefined()
    }
    expect(isOpaque(undefined, undefined)).toBe(false)
  })

  it('has nothing to show without a preview', () => {
    expect(blurPlaceholder(JPG, { hasAlpha: false })).toBeUndefined()
    expect(blurPlaceholder(JPG, null)).toBeUndefined()
  })
})
