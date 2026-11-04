import { describe, expect, it } from 'vitest'

import { resolveAvatar } from './profile-image-options'

describe('resolveAvatar', () => {
  it('defaults to Medium with no ring, in the layout’s own shape', () => {
    expect(resolveAvatar(undefined, 'circle')).toEqual({
      size: 'medium',
      shape: 'circle',
      border: null,
    })
    expect(resolveAvatar({ size: null, ring: null }, 'rounded')).toEqual({
      size: 'medium',
      shape: 'rounded',
      border: null,
    })
  })

  it('takes a size and a ring', () => {
    const solid = resolveAvatar({ size: 'large', ring: 'line' }, 'circle')
    expect(solid.size).toBe('large')
    expect(solid.border).toEqual({ kind: 'ring', widthPx: 2, gapPx: 3, gradient: null })
    const gradient = resolveAvatar({ ring: 'gradient' }, 'circle')
    expect(gradient.border?.kind).toBe('ring')
    expect(gradient.border?.kind === 'ring' && gradient.border.gradient).toContain('gradient')
  })

  it('ignores values it does not know, rather than drawing something odd', () => {
    expect(resolveAvatar({ size: 'huge', ring: 'frame' }, 'circle')).toEqual({
      size: 'medium',
      shape: 'circle',
      border: null,
    })
  })
})
