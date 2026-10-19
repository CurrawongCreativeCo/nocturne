import { describe, expect, it } from 'vitest'

import { resolveProfileImage } from './profile-image-options'
import { socialPositionOf, socialStyleOf } from './social-style-options'
import { showsWordmark, wordmarkSizeOf } from './wordmark-options'

describe('profile picture', () => {
  it('is the original picture while nothing is chosen', () => {
    expect(resolveProfileImage(undefined)).toEqual({
      size: 'medium',
      shape: 'circle',
      border: null,
    })
  })

  it('draws a ring with a see-through gap, thin and small by default', () => {
    expect(resolveProfileImage({ border: 'line' }).border).toEqual({
      kind: 'ring',
      widthPx: 2,
      gapPx: 3,
      gradient: null,
    })
    expect(
      resolveProfileImage({ border: 'line', borderWidth: 'thick', borderGap: 'none' }).border,
    ).toMatchObject({ widthPx: 6, gapPx: 0 })
  })

  it('runs a gradient ring from Primary to Secondary unless a Brand colours gradient is chosen', () => {
    expect(resolveProfileImage({ border: 'gradient' }).border).toMatchObject({
      gradient: 'linear-gradient(135deg, var(--color-accent), var(--color-accent-2))',
    })
    const gradientOf = (slug: string) => {
      const { border } = resolveProfileImage({ border: 'gradient', borderGradient: slug })
      return border?.kind === 'ring' ? border.gradient : null
    }
    expect(gradientOf('sunrise')).toContain('var(--gradient-sunrise,')
    // A slug that could not come from the schema never reaches CSS.
    expect(gradientOf('x);color:red')).not.toContain('color:red')
  })

  it('draws a frame only from the Sanity CDN, and no border for a missing one', () => {
    const url = 'https://cdn.sanity.io/files/p/d/frame.svg'
    expect(resolveProfileImage({ border: 'frame', frameUrl: url }).border).toEqual({
      kind: 'frame',
      url,
    })
    expect(resolveProfileImage({ border: 'frame' }).border).toBeNull()
    expect(
      resolveProfileImage({ border: 'frame', frameUrl: 'https://evil.example/f.svg' }).border,
    ).toBeNull()
  })
})

describe('social icons and wordmarks', () => {
  it('start as plain icons above the links', () => {
    expect(socialStyleOf(undefined)).toBe('plain')
    expect(socialStyleOf('circle')).toBe('circle')
    expect(socialPositionOf(undefined)).toBe('above')
    expect(socialPositionOf('below')).toBe('below')
  })

  it('show a wordmark only with Image chosen and a picture uploaded', () => {
    const image = { asset: { _id: 'image-1' } }
    expect(showsWordmark('image', image)).toBe(true)
    expect(showsWordmark('image', null)).toBe(false)
    expect(showsWordmark('text', image)).toBe(false)
    expect(showsWordmark(undefined, image)).toBe(false)
    expect(wordmarkSizeOf('huge')).toBe('medium')
  })
})
