import { describe, expect, it } from 'vitest'

import { resolveOverlayGradient } from '@/lib/sanity/overlay-gradient'

import { overlayGradientContrastProblem } from './overlay-gradient-contrast'

describe('overlayGradientContrastProblem', () => {
  it('warns about the light top of a soft gradient, rather than averaging it away', () => {
    const problem = overlayGradientContrastProblem({
      tone: 'surface',
      gradient: resolveOverlayGradient(undefined, 'light'),
    })
    expect(problem?.message).toContain('at the top')
  })

  it('passes once every stop is strong enough over any photo', () => {
    const solid = { colour: 'background', opacity: 90 }
    expect(
      overlayGradientContrastProblem({
        tone: 'surface',
        gradient: resolveOverlayGradient(
          { overlayGradientTop: solid, overlayGradientMiddle: solid, overlayGradientBottom: solid },
          'medium',
        ),
      }),
    ).toBeNull()
  })
})
