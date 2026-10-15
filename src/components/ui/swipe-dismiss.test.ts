import { describe, expect, it } from 'vitest'

import { DISMISS_VELOCITY, shouldDismiss } from './swipe-dismiss'

describe('shouldDismiss', () => {
  it('dismisses a drag past a quarter of the panel', () => {
    expect(shouldDismiss({ offset: 250, velocity: 0, size: 1000 })).toBe(true)
  })

  it('springs back from a short, slow drag', () => {
    expect(shouldDismiss({ offset: 100, velocity: 100, size: 1000 })).toBe(false)
  })

  it('dismisses a quick flick however short', () => {
    expect(shouldDismiss({ offset: 20, velocity: DISMISS_VELOCITY, size: 1000 })).toBe(true)
  })

  it('never dismisses a drag the wrong way, however fast', () => {
    expect(shouldDismiss({ offset: -400, velocity: 2000, size: 1000 })).toBe(false)
    expect(shouldDismiss({ offset: 0, velocity: 2000, size: 1000 })).toBe(false)
  })

  it('ignores a panel with no size', () => {
    expect(shouldDismiss({ offset: 50, velocity: 900, size: 0 })).toBe(false)
  })
})
