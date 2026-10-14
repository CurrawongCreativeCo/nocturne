import { describe, expect, it } from 'vitest'

import { fittedWidth, resolveBrandImage } from './brand-image'

describe('resolveBrandImage', () => {
  const assets = {
    'a.svg': '/src/assets/a.svg',
    'b.webp': { src: '/_next/static/media/b.hash.webp', width: 400, height: 100 },
  }

  it('accepts a URL string (Sanity Vite build)', () => {
    expect(resolveBrandImage(assets, 'a.svg')).toEqual({ src: '/src/assets/a.svg' })
  })

  it('accepts an object with a size (Next.js)', () => {
    expect(resolveBrandImage(assets, 'b.webp')).toEqual(assets['b.webp'])
  })

  it('is undefined for a path that is not in the map', () => {
    expect(resolveBrandImage(assets, 'missing.png')).toBeUndefined()
  })
})

describe('fittedWidth', () => {
  it('scales to the height', () => {
    expect(fittedWidth({ src: 'x', width: 200, height: 100 }, 24, 160)).toBe(48)
  })

  it('caps at the maximum width', () => {
    expect(fittedWidth({ src: 'x', width: 1000, height: 100 }, 24, 160)).toBe(160)
  })

  it('is undefined when the size is unknown', () => {
    expect(fittedWidth({ src: 'x' }, 24, 160)).toBeUndefined()
  })
})
