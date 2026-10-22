import { describe, expect, it } from 'vitest'

import { frameMaskUrl } from './frame-mask'

const PICTURE =
  'https://cdn.sanity.io/images/project/production/aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa-2400x1600.png'

describe('frameMaskUrl', () => {
  it('requests a WebP at twice the content width without enlarging a smaller upload', () => {
    const url = new URL(frameMaskUrl(PICTURE) ?? '')
    expect(url.origin).toBe('https://cdn.sanity.io')
    expect(Object.fromEntries(url.searchParams)).toEqual({ w: '2560', fit: 'max', fm: 'webp' })
    expect(new URL(frameMaskUrl(PICTURE, 384) ?? '').searchParams.get('w')).toBe('384')
  })

  it('keeps legacy SVG URLs unchanged and refuses external or malformed image URLs', () => {
    const svg = 'https://cdn.sanity.io/files/project/production/frame.svg'
    expect(frameMaskUrl(svg)).toBe(svg)
    expect(frameMaskUrl('https://example.com/frame.png')).toBeUndefined()
    expect(frameMaskUrl('https://cdn.sanity.io/images/invalid')).toBeUndefined()
    expect(frameMaskUrl(`${PICTURE}\")`)).toBeUndefined()
  })
})
